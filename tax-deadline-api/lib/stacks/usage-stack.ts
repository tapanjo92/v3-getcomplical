import * as cdk from 'aws-cdk-lib';
import * as kinesis from 'aws-cdk-lib/aws-kinesis';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as elasticache from 'aws-cdk-lib/aws-elasticache';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import { KinesisEventSource } from 'aws-cdk-lib/aws-lambda-event-sources';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { Construct } from 'constructs';
import { ApiStack } from './api-stack';
import { AuthStack } from './auth-stack';

export interface UsageStackProps extends cdk.StackProps {
  stage: string;
  apiStack: ApiStack;
}

export class UsageStack extends cdk.Stack {
  public readonly usageStream: kinesis.Stream;
  public readonly usageTable: dynamodb.Table;
  public readonly vpc: ec2.Vpc;
  public readonly redisCluster: elasticache.CfnCacheCluster;
  public readonly getUsageFunction: NodejsFunction;

  constructor(scope: Construct, id: string, props: UsageStackProps) {
    super(scope, id, props);

    // Create VPC for Redis
    this.vpc = new ec2.Vpc(this, 'UsageVpc', {
      vpcName: `tax-deadline-usage-vpc-${props.stage}`,
      maxAzs: 2,
      natGateways: 1,
      subnetConfiguration: [
        {
          cidrMask: 24,
          name: 'public',
          subnetType: ec2.SubnetType.PUBLIC,
        },
        {
          cidrMask: 24,
          name: 'private',
          subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
        },
      ],
    });

    // Create Redis subnet group
    const redisSubnetGroup = new elasticache.CfnSubnetGroup(this, 'RedisSubnetGroup', {
      description: 'Subnet group for Redis cluster',
      subnetIds: this.vpc.privateSubnets.map(subnet => subnet.subnetId),
      cacheSubnetGroupName: `tax-deadline-redis-${props.stage}`,
    });

    // Create security group for Redis
    const redisSecurityGroup = new ec2.SecurityGroup(this, 'RedisSecurityGroup', {
      vpc: this.vpc,
      description: 'Security group for Redis cluster',
      allowAllOutbound: true,
    });

    // Allow Redis port from Lambda functions
    redisSecurityGroup.addIngressRule(
      ec2.Peer.ipv4(this.vpc.vpcCidrBlock),
      ec2.Port.tcp(6379),
      'Allow Redis access from VPC'
    );

    // Create Redis cluster
    this.redisCluster = new elasticache.CfnCacheCluster(this, 'RedisCluster', {
      cacheNodeType: 'cache.t3.micro',
      engine: 'redis',
      numCacheNodes: 1,
      clusterName: `tax-deadline-${props.stage}`,
      cacheSubnetGroupName: redisSubnetGroup.ref,
      vpcSecurityGroupIds: [redisSecurityGroup.securityGroupId],
      preferredMaintenanceWindow: 'sun:05:00-sun:06:00',
      snapshotRetentionLimit: props.stage === 'prod' ? 7 : 1,
    });

    // Create Kinesis stream for usage tracking
    this.usageStream = new kinesis.Stream(this, 'UsageStream', {
      streamName: `tax-deadline-usage-${props.stage}`,
      shardCount: 1,
      retentionPeriod: cdk.Duration.days(7),
      encryption: kinesis.StreamEncryption.MANAGED,
    });

    // Create DynamoDB table for aggregated usage data
    this.usageTable = new dynamodb.Table(this, 'UsageTable', {
      tableName: `TaxDeadlineUsage-${props.stage}`,
      partitionKey: {
        name: 'PK',
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: 'SK',
        type: dynamodb.AttributeType.STRING,
      },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      timeToLiveAttribute: 'ttl',
      pointInTimeRecovery: true,
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
      removalPolicy: props.stage === 'prod' 
        ? cdk.RemovalPolicy.RETAIN 
        : cdk.RemovalPolicy.DESTROY,
    });

    // Lambda function to process usage stream
    const usageProcessor = new NodejsFunction(this, 'UsageProcessor', {
      functionName: `tax-deadline-usage-processor-${props.stage}`,
      entry: 'lib/lambda/usage/processor.ts',
      handler: 'handler',
      runtime: lambda.Runtime.NODEJS_18_X,
      architecture: lambda.Architecture.ARM_64,
      timeout: cdk.Duration.minutes(5),
      memorySize: 1024,
      vpc: this.vpc,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
      },
      environment: {
        USAGE_TABLE: this.usageTable.tableName,
        REDIS_ENDPOINT: this.redisCluster.attrRedisEndpointAddress,
        REDIS_PORT: this.redisCluster.attrRedisEndpointPort,
        STAGE: props.stage,
      },
      bundling: {
        minify: true,
        sourceMap: false,
        target: 'node18',
        nodeModules: ['ioredis'],
      },
    });

    // Add Kinesis event source
    usageProcessor.addEventSource(new KinesisEventSource(this.usageStream, {
      startingPosition: lambda.StartingPosition.LATEST,
      batchSize: 100,
      maxBatchingWindow: cdk.Duration.seconds(5),
    }));

    // Grant permissions
    this.usageTable.grantWriteData(usageProcessor);
    this.usageStream.grantRead(usageProcessor);

    // Lambda function to query usage data
    this.getUsageFunction = new NodejsFunction(this, 'GetUsageFunction', {
      functionName: `tax-deadline-get-usage-${props.stage}`,
      entry: 'lib/lambda/usage/get-usage.ts',
      handler: 'handler',
      runtime: lambda.Runtime.NODEJS_18_X,
      architecture: lambda.Architecture.ARM_64,
      timeout: cdk.Duration.seconds(10),
      memorySize: 512,
      vpc: this.vpc,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
      },
      environment: {
        USAGE_TABLE: this.usageTable.tableName,
        REDIS_ENDPOINT: this.redisCluster.attrRedisEndpointAddress,
        REDIS_PORT: this.redisCluster.attrRedisEndpointPort,
        STAGE: props.stage,
      },
      bundling: {
        minify: true,
        sourceMap: false,
        target: 'node18',
        nodeModules: ['ioredis'],
      },
    });

    // Grant permissions
    this.usageTable.grantReadData(this.getUsageFunction);

    // Note: The usage endpoint will be added in the API stack to avoid circular dependencies

    // Create API Gateway log role if it doesn't exist
    const logRole = new iam.Role(this, 'ApiGatewayCloudWatchRole', {
      assumedBy: new iam.ServicePrincipal('apigateway.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AmazonAPIGatewayPushToCloudWatchLogs'),
      ],
    });

    // Configure API Gateway to send access logs to Kinesis
    new cdk.CfnResource(this, 'ApiGatewayAccount', {
      type: 'AWS::ApiGateway::Account',
      properties: {
        CloudWatchRoleArn: logRole.roleArn,
      },
    });

    // Outputs
    new cdk.CfnOutput(this, 'UsageStreamName', {
      value: this.usageStream.streamName,
      description: 'Kinesis stream for usage tracking',
      exportName: `${props.stage}-UsageStreamName`,
    });

    new cdk.CfnOutput(this, 'RedisEndpoint', {
      value: `${this.redisCluster.attrRedisEndpointAddress}:${this.redisCluster.attrRedisEndpointPort}`,
      description: 'Redis cluster endpoint',
      exportName: `${props.stage}-RedisEndpoint`,
    });
  }
}