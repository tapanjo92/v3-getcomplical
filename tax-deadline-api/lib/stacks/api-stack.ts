import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { Construct } from 'constructs';
import { DataStack } from './data-stack';
import { AuthStack } from './auth-stack';

export interface ApiStackProps extends cdk.StackProps {
  stage: string;
  dataStack: DataStack;
  authStack: AuthStack;
}

export class ApiStack extends cdk.Stack {
  public readonly api: apigateway.RestApi;
  public readonly apiUrl: string;

  constructor(scope: Construct, id: string, props: ApiStackProps) {
    super(scope, id, props);

    // Create the REST API
    this.api = new apigateway.RestApi(this, 'TaxDeadlineApi', {
      restApiName: `tax-deadline-api-${props.stage}`,
      description: 'Tax Deadline API for Australian and New Zealand tax compliance',
      deployOptions: {
        stageName: props.stage,
        tracingEnabled: true,
        dataTraceEnabled: true,
        loggingLevel: apigateway.MethodLoggingLevel.INFO,
        accessLogDestination: new apigateway.LogGroupLogDestination(
          new logs.LogGroup(this, 'ApiAccessLogs', {
            retention: logs.RetentionDays.ONE_MONTH,
          })
        ),
        accessLogFormat: apigateway.AccessLogFormat.jsonWithStandardFields({
          caller: true,
          httpMethod: true,
          ip: true,
          protocol: true,
          requestTime: true,
          resourcePath: true,
          responseLength: true,
          status: true,
          user: true,
        }),
      },
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: ['Content-Type', 'X-API-Key', 'Authorization'],
      },
    });

    // Lambda function for getting deadlines
    const getDeadlinesFunction = new NodejsFunction(this, 'GetDeadlinesFunction', {
      functionName: `tax-deadline-get-${props.stage}`,
      entry: 'lib/lambda/api/get-deadlines.ts',
      handler: 'handler',
      runtime: lambda.Runtime.NODEJS_18_X,
      architecture: lambda.Architecture.ARM_64,
      timeout: cdk.Duration.seconds(10),
      memorySize: 512,
      environment: {
        DEADLINES_TABLE: props.dataStack.deadlinesTable.tableName,
        STAGE: props.stage,
      },
      bundling: {
        minify: true,
        sourceMap: false,
        target: 'node18',
      },
    });

    // Lambda function for searching deadlines
    const searchDeadlinesFunction = new NodejsFunction(this, 'SearchDeadlinesFunction', {
      functionName: `tax-deadline-search-${props.stage}`,
      entry: 'lib/lambda/api/search-deadlines.ts',
      handler: 'handler',
      runtime: lambda.Runtime.NODEJS_18_X,
      architecture: lambda.Architecture.ARM_64,
      timeout: cdk.Duration.seconds(10),
      memorySize: 512,
      environment: {
        DEADLINES_TABLE: props.dataStack.deadlinesTable.tableName,
        STAGE: props.stage,
      },
      bundling: {
        minify: true,
        sourceMap: false,
        target: 'node18',
      },
    });

    // Lambda function for calculating applicable deadlines
    const calculateDeadlinesFunction = new NodejsFunction(this, 'CalculateDeadlinesFunction', {
      functionName: `tax-deadline-calculate-${props.stage}`,
      entry: 'lib/lambda/api/calculate-deadlines.ts',
      handler: 'handler',
      runtime: lambda.Runtime.NODEJS_18_X,
      architecture: lambda.Architecture.ARM_64,
      timeout: cdk.Duration.seconds(15),
      memorySize: 512,
      environment: {
        DEADLINES_TABLE: props.dataStack.deadlinesTable.tableName,
        STAGE: props.stage,
      },
      bundling: {
        minify: true,
        sourceMap: false,
        target: 'node18',
      },
    });

    // Grant DynamoDB permissions
    props.dataStack.deadlinesTable.grantReadData(getDeadlinesFunction);
    props.dataStack.deadlinesTable.grantReadData(searchDeadlinesFunction);
    props.dataStack.deadlinesTable.grantReadData(calculateDeadlinesFunction);

    // API structure
    const v1 = this.api.root.addResource('v1');
    const deadlines = v1.addResource('deadlines');
    const search = deadlines.addResource('search');
    const calculate = deadlines.addResource('calculate');

    // GET /v1/deadlines
    deadlines.addMethod('GET', new apigateway.LambdaIntegration(getDeadlinesFunction), {
      authorizer: props.authStack.authorizer,
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
    search.addMethod('GET', new apigateway.LambdaIntegration(searchDeadlinesFunction), {
      authorizer: props.authStack.authorizer,
      authorizationType: apigateway.AuthorizationType.CUSTOM,
      requestParameters: {
        'method.request.querystring.q': true,
        'method.request.querystring.from': false,
        'method.request.querystring.to': false,
      },
    });

    // POST /v1/deadlines/calculate
    calculate.addMethod('POST', new apigateway.LambdaIntegration(calculateDeadlinesFunction), {
      authorizer: props.authStack.authorizer,
      authorizationType: apigateway.AuthorizationType.CUSTOM,
      requestModels: {
        'application/json': new apigateway.Model(this, 'CalculateRequestModel', {
          restApi: this.api,
          contentType: 'application/json',
          schema: {
            type: apigateway.JsonSchemaType.OBJECT,
            properties: {
              entity: {
                type: apigateway.JsonSchemaType.OBJECT,
                properties: {
                  type: { type: apigateway.JsonSchemaType.STRING },
                  turnover: { type: apigateway.JsonSchemaType.NUMBER },
                  gstRegistered: { type: apigateway.JsonSchemaType.BOOLEAN },
                  state: { type: apigateway.JsonSchemaType.STRING },
                },
                required: ['type', 'state'],
              },
            },
            required: ['entity'],
          },
        }),
      },
    });

    // Health check endpoint (no auth required)
    const health = v1.addResource('health');
    health.addMethod('GET', new apigateway.MockIntegration({
      integrationResponses: [{
        statusCode: '200',
        responseTemplates: {
          'application/json': JSON.stringify({
            status: 'healthy',
            region: 'ap-south-1',
            stage: props.stage,
            timestamp: new Date().toISOString(),
          }),
        },
      }],
      requestTemplates: {
        'application/json': '{"statusCode": 200}',
      },
    }), {
      methodResponses: [{ statusCode: '200' }],
    });

    // Create CloudWatch alarms
    new cloudwatch.Alarm(this, 'ApiErrorAlarm', {
      metric: this.api.metricClientError(),
      threshold: 10,
      evaluationPeriods: 2,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
      alarmDescription: 'API client errors exceed threshold',
    });

    new cloudwatch.Alarm(this, 'ApiLatencyAlarm', {
      metric: this.api.metricLatency().with({
        statistic: 'p99',
      }),
      threshold: 1000, // 1 second
      evaluationPeriods: 2,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
      alarmDescription: 'API latency P99 exceeds 1 second',
    });

    // Outputs
    this.apiUrl = this.api.url;
    new cdk.CfnOutput(this, 'ApiUrl', {
      value: this.apiUrl,
      description: 'Tax Deadline API URL',
      exportName: `${props.stage}-TaxDeadlineApiUrl`,
    });

    new cdk.CfnOutput(this, 'ApiId', {
      value: this.api.restApiId,
      description: 'Tax Deadline API ID',
      exportName: `${props.stage}-TaxDeadlineApiId`,
    });
  }
}