import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as kinesis from 'aws-cdk-lib/aws-kinesis';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as iam from 'aws-cdk-lib/aws-iam';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { Construct } from 'constructs';
import * as crypto from 'crypto';

export interface ApiConsolidatedStackProps extends cdk.StackProps {
  stage: string;
  deadlinesTable: dynamodb.Table;
  apiKeysTable: dynamodb.Table;
  usageTable: dynamodb.Table;
  usageStream: kinesis.Stream;
  redisEndpoint: string;
  redisPort: string;
}

/**
 * Consolidated API Stack following the principle of high cohesion.
 * All API-related resources are managed in one place to avoid circular dependencies.
 */
export class ApiConsolidatedStack extends cdk.Stack {
  public readonly api: apigateway.RestApi;
  public readonly authorizer: apigateway.RequestAuthorizer;

  constructor(scope: Construct, id: string, props: ApiConsolidatedStackProps) {
    super(scope, id, props);

    // Create authorizer Lambda first
    const authorizerFunction = new NodejsFunction(this, 'AuthorizerFunction', {
      functionName: `tax-deadline-authorizer-${props.stage}`,
      entry: 'lib/lambda/auth/authorizer.ts',
      handler: 'handler',
      runtime: lambda.Runtime.NODEJS_18_X,
      architecture: lambda.Architecture.ARM_64,
      timeout: cdk.Duration.seconds(5),
      memorySize: 256,
      environment: {
        API_KEYS_TABLE: props.apiKeysTable.tableName,
        STAGE: props.stage,
      },
      bundling: {
        minify: true,
        sourceMap: false,
        target: 'node18',
      },
    });

    props.apiKeysTable.grantReadData(authorizerFunction);

    // Create API Gateway authorizer
    this.authorizer = new apigateway.RequestAuthorizer(this, 'ApiAuthorizer', {
      authorizerName: `TaxDeadlineAuthorizer-${props.stage}`,
      handler: authorizerFunction,
      identitySources: [apigateway.IdentitySource.header('X-API-Key')],
      resultsCacheTtl: cdk.Duration.minutes(5),
    });

    // Create REST API
    this.api = new apigateway.RestApi(this, 'TaxDeadlineApi', {
      restApiName: `tax-deadline-api-${props.stage}`,
      description: 'Tax Deadline API - Security-first architecture',
      deployOptions: {
        stageName: props.stage,
        tracingEnabled: true,
        dataTraceEnabled: false, // Security: Don't log request/response bodies
        loggingLevel: apigateway.MethodLoggingLevel.ERROR,
        throttlingBurstLimit: 5000,
        throttlingRateLimit: 2500,
        accessLogDestination: new apigateway.LogGroupLogDestination(
          new logs.LogGroup(this, 'ApiAccessLogs', {
            retention: logs.RetentionDays.ONE_MONTH,
            encryptionKey: undefined, // Use default AWS managed key
          })
        ),
        accessLogFormat: apigateway.AccessLogFormat.jsonWithStandardFields({
          caller: false, // Security: Don't log caller info
          httpMethod: true,
          ip: true,
          protocol: true,
          requestTime: true,
          resourcePath: true,
          responseLength: true,
          status: true,
          user: false, // Security: Don't log user info
        }),
      },
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: ['Content-Type', 'X-API-Key'],
        maxAge: cdk.Duration.hours(24),
      },
    });

    // API structure
    const v1 = this.api.root.addResource('v1');

    // Health check (no auth)
    this.addHealthCheck(v1);

    // Deadlines endpoints
    this.addDeadlineEndpoints(v1, props);

    // Usage endpoint
    this.addUsageEndpoint(v1, props);

    // Admin endpoints
    this.addAdminEndpoints(v1, props);

    // Outputs
    new cdk.CfnOutput(this, 'ApiUrl', {
      value: this.api.url,
      description: 'Tax Deadline API URL',
      exportName: `${props.stage}-ApiUrl`,
    });
  }

  private addHealthCheck(v1: apigateway.Resource): void {
    const health = v1.addResource('health');
    health.addMethod('GET', new apigateway.MockIntegration({
      integrationResponses: [{
        statusCode: '200',
        responseTemplates: {
          'application/json': JSON.stringify({
            status: 'healthy',
            region: this.region,
            stage: this.node.tryGetContext('stage'),
            timestamp: '$context.requestTime',
            version: '1.0.0',
          }),
        },
      }],
      requestTemplates: {
        'application/json': '{"statusCode": 200}',
      },
    }), {
      methodResponses: [{ statusCode: '200' }],
    });
  }

  private addDeadlineEndpoints(v1: apigateway.Resource, props: ApiConsolidatedStackProps): void {
    const deadlines = v1.addResource('deadlines');

    // GET /v1/deadlines
    const getDeadlinesFunction = new NodejsFunction(this, 'GetDeadlinesFunction', {
      functionName: `tax-deadline-get-${props.stage}`,
      entry: 'lib/lambda/api/get-deadlines.ts',
      handler: 'handler',
      runtime: lambda.Runtime.NODEJS_18_X,
      architecture: lambda.Architecture.ARM_64,
      timeout: cdk.Duration.seconds(10),
      memorySize: 512,
      environment: {
        DEADLINES_TABLE: props.deadlinesTable.tableName,
        USAGE_STREAM: props.usageStream.streamName,
        STAGE: props.stage,
      },
      bundling: {
        minify: true,
        sourceMap: false,
        target: 'node18',
      },
    });

    props.deadlinesTable.grantReadData(getDeadlinesFunction);
    props.usageStream.grantWrite(getDeadlinesFunction);

    deadlines.addMethod('GET', new apigateway.LambdaIntegration(getDeadlinesFunction), {
      authorizer: this.authorizer,
      authorizationType: apigateway.AuthorizationType.CUSTOM,
      requestParameters: {
        'method.request.querystring.country': false,
        'method.request.querystring.state': false,
        'method.request.querystring.year': false,
        'method.request.querystring.type': false,
        'method.request.querystring.upcoming': false,
      },
    });

    // GET /v1/deadlines/search
    const search = deadlines.addResource('search');
    const searchDeadlinesFunction = new NodejsFunction(this, 'SearchDeadlinesFunction', {
      functionName: `tax-deadline-search-${props.stage}`,
      entry: 'lib/lambda/api/search-deadlines.ts',
      handler: 'handler',
      runtime: lambda.Runtime.NODEJS_18_X,
      architecture: lambda.Architecture.ARM_64,
      timeout: cdk.Duration.seconds(10),
      memorySize: 512,
      environment: {
        DEADLINES_TABLE: props.deadlinesTable.tableName,
        STAGE: props.stage,
      },
      bundling: {
        minify: true,
        sourceMap: false,
        target: 'node18',
      },
    });

    props.deadlinesTable.grantReadData(searchDeadlinesFunction);

    search.addMethod('GET', new apigateway.LambdaIntegration(searchDeadlinesFunction), {
      authorizer: this.authorizer,
      authorizationType: apigateway.AuthorizationType.CUSTOM,
      requestParameters: {
        'method.request.querystring.q': true,
        'method.request.querystring.from': false,
        'method.request.querystring.to': false,
      },
    });

    // POST /v1/deadlines/calculate
    const calculate = deadlines.addResource('calculate');
    const calculateDeadlinesFunction = new NodejsFunction(this, 'CalculateDeadlinesFunction', {
      functionName: `tax-deadline-calculate-${props.stage}`,
      entry: 'lib/lambda/api/calculate-deadlines.ts',
      handler: 'handler',
      runtime: lambda.Runtime.NODEJS_18_X,
      architecture: lambda.Architecture.ARM_64,
      timeout: cdk.Duration.seconds(15),
      memorySize: 512,
      environment: {
        DEADLINES_TABLE: props.deadlinesTable.tableName,
        STAGE: props.stage,
      },
      bundling: {
        minify: true,
        sourceMap: false,
        target: 'node18',
      },
    });

    props.deadlinesTable.grantReadData(calculateDeadlinesFunction);

    calculate.addMethod('POST', new apigateway.LambdaIntegration(calculateDeadlinesFunction), {
      authorizer: this.authorizer,
      authorizationType: apigateway.AuthorizationType.CUSTOM,
    });
  }

  private addUsageEndpoint(v1: apigateway.Resource, props: ApiConsolidatedStackProps): void {
    const usage = v1.addResource('usage');

    const getUsageFunction = new NodejsFunction(this, 'GetUsageFunction', {
      functionName: `tax-deadline-get-usage-${props.stage}`,
      entry: 'lib/lambda/usage/get-usage.ts',
      handler: 'handler',
      runtime: lambda.Runtime.NODEJS_18_X,
      architecture: lambda.Architecture.ARM_64,
      timeout: cdk.Duration.seconds(10),
      memorySize: 512,
      environment: {
        USAGE_TABLE: props.usageTable.tableName,
        REDIS_ENDPOINT: props.redisEndpoint,
        REDIS_PORT: props.redisPort,
        STAGE: props.stage,
      },
      bundling: {
        minify: true,
        sourceMap: false,
        target: 'node18',
        nodeModules: ['ioredis'],
      },
    });

    props.usageTable.grantReadData(getUsageFunction);

    usage.addMethod('GET', new apigateway.LambdaIntegration(getUsageFunction), {
      authorizer: this.authorizer,
      authorizationType: apigateway.AuthorizationType.CUSTOM,
      requestParameters: {
        'method.request.querystring.period': false,
        'method.request.querystring.detailed': false,
      },
    });
  }

  private addAdminEndpoints(v1: apigateway.Resource, props: ApiConsolidatedStackProps): void {
    const admin = v1.addResource('admin');
    const keys = admin.addResource('keys');

    // POST /v1/admin/keys - Generate API key
    const keyGeneratorFunction = new NodejsFunction(this, 'KeyGeneratorFunction', {
      functionName: `tax-deadline-key-generator-${props.stage}`,
      entry: 'lib/lambda/auth/key-generator.ts',
      handler: 'handler',
      runtime: lambda.Runtime.NODEJS_18_X,
      architecture: lambda.Architecture.ARM_64,
      timeout: cdk.Duration.seconds(10),
      memorySize: 256,
      environment: {
        API_KEYS_TABLE: props.apiKeysTable.tableName,
        STAGE: props.stage,
      },
      bundling: {
        minify: true,
        sourceMap: false,
        target: 'node18',
      },
    });

    props.apiKeysTable.grantWriteData(keyGeneratorFunction);

    // Admin endpoints require different auth (implement later)
    keys.addMethod('POST', new apigateway.LambdaIntegration(keyGeneratorFunction));
  }
}