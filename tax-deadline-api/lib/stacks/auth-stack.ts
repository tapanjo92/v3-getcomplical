import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { Construct } from 'constructs';
import { DataStack } from './data-stack';

export interface AuthStackProps extends cdk.StackProps {
  stage: string;
  dataStack: DataStack;
}

export class AuthStack extends cdk.Stack {
  public readonly authorizer: apigateway.RequestAuthorizer;
  public readonly apiKeyGenerator: NodejsFunction;

  constructor(scope: Construct, id: string, props: AuthStackProps) {
    super(scope, id, props);

    // Lambda for API key validation (Authorizer)
    const authorizerFunction = new NodejsFunction(this, 'AuthorizerFunction', {
      functionName: `tax-deadline-authorizer-${props.stage}`,
      entry: 'lib/lambda/auth/authorizer.ts',
      handler: 'handler',
      runtime: lambda.Runtime.NODEJS_18_X,
      architecture: lambda.Architecture.ARM_64,
      timeout: cdk.Duration.seconds(5),
      memorySize: 256,
      environment: {
        API_KEYS_TABLE: props.dataStack.apiKeysTable.tableName,
        STAGE: props.stage,
      },
      bundling: {
        minify: true,
        sourceMap: false,
        target: 'node18',
      },
    });

    // Grant read permissions to the API keys table
    props.dataStack.apiKeysTable.grantReadData(authorizerFunction);

    // Create the API Gateway authorizer
    this.authorizer = new apigateway.RequestAuthorizer(this, 'ApiAuthorizer', {
      authorizerName: `TaxDeadlineAuthorizer-${props.stage}`,
      handler: authorizerFunction,
      identitySources: [apigateway.IdentitySource.header('X-API-Key')],
      resultsCacheTtl: cdk.Duration.minutes(5),
    });

    // Lambda for API key generation (Admin function)
    this.apiKeyGenerator = new NodejsFunction(this, 'ApiKeyGenerator', {
      functionName: `tax-deadline-key-generator-${props.stage}`,
      entry: 'lib/lambda/auth/key-generator.ts',
      handler: 'handler',
      runtime: lambda.Runtime.NODEJS_18_X,
      architecture: lambda.Architecture.ARM_64,
      timeout: cdk.Duration.seconds(10),
      memorySize: 256,
      environment: {
        API_KEYS_TABLE: props.dataStack.apiKeysTable.tableName,
        STAGE: props.stage,
      },
      bundling: {
        minify: true,
        sourceMap: false,
        target: 'node18',
      },
    });

    // Grant write permissions to the API keys table
    props.dataStack.apiKeysTable.grantWriteData(this.apiKeyGenerator);

    // Output the authorizer ARN for other stacks
    new cdk.CfnOutput(this, 'AuthorizerArn', {
      value: this.authorizer.authorizerArn,
      exportName: `${props.stage}-AuthorizerArn`,
    });
  }
}