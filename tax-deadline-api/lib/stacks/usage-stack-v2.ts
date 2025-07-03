import * as cdk from 'aws-cdk-lib';
import * as kinesis from 'aws-cdk-lib/aws-kinesis';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as elasticache from 'aws-cdk-lib/aws-elasticache';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import { KinesisEventSource } from 'aws-cdk-lib/aws-lambda-event-sources';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { Construct } from 'constructs';

export interface UsageStackV2Props extends cdk.StackProps {
  stage: string;
}

/**
 * Usage tracking infrastructure
 * Designed to be independent and not create circular dependencies
 */
export class UsageStackV2 extends cdk.Stack {
  public readonly usageStream: kinesis.Stream;
  public readonly usageTable: dynamodb.Table;
  public readonly redisEndpoint: string;
  public readonly redisPort: string;

  constructor(scope: Construct, id: string, props: UsageStackV2Props) {
    super(scope, id, props);

    // Create Kinesis stream for usage events
    this.usageStream = new kinesis.Stream(this, 'UsageStream', {
      streamName: `tax-deadline-usage-${props.stage}`,
      shardCount: 1,
      retentionPeriod: cdk.Duration.days(7),
      encryption: kinesis.StreamEncryption.MANAGED,
    });

    // Create DynamoDB table for aggregated usage
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

    // For dev environment, skip Redis to reduce costs
    if (props.stage === 'dev') {
      this.redisEndpoint = 'localhost';
      this.redisPort = '6379';
      
      // Just process to DynamoDB for dev
      const usageProcessor = new NodejsFunction(this, 'UsageProcessor', {
        functionName: `tax-deadline-usage-processor-${props.stage}`,
        entry: 'lib/lambda/usage/processor-simple.ts',
        handler: 'handler',
        runtime: lambda.Runtime.NODEJS_18_X,
        architecture: lambda.Architecture.ARM_64,
        timeout: cdk.Duration.minutes(5),
        memorySize: 1024,
        environment: {
          USAGE_TABLE: this.usageTable.tableName,
          STAGE: props.stage,
        },
        bundling: {
          minify: true,
          sourceMap: false,
          target: 'node18',
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
    } else {
      // For production, use Redis for real-time tracking
      // Create VPC for Redis
      const vpc = new ec2.Vpc(this, 'UsageVpc', {
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
        subnetIds: vpc.privateSubnets.map(subnet => subnet.subnetId),
        cacheSubnetGroupName: `tax-deadline-redis-${props.stage}`,
      });

      // Security group for Redis
      const redisSecurityGroup = new ec2.SecurityGroup(this, 'RedisSecurityGroup', {
        vpc,
        description: 'Security group for Redis cluster',
        allowAllOutbound: true,
      });

      redisSecurityGroup.addIngressRule(
        ec2.Peer.ipv4(vpc.vpcCidrBlock),
        ec2.Port.tcp(6379),
        'Allow Redis access from VPC'
      );

      // Create Redis cluster
      const redisCluster = new elasticache.CfnCacheCluster(this, 'RedisCluster', {
        cacheNodeType: 'cache.t3.micro',
        engine: 'redis',
        numCacheNodes: 1,
        clusterName: `tax-deadline-${props.stage}`,
        cacheSubnetGroupName: redisSubnetGroup.ref,
        vpcSecurityGroupIds: [redisSecurityGroup.securityGroupId],
        preferredMaintenanceWindow: 'sun:05:00-sun:06:00',
        snapshotRetentionLimit: props.stage === 'prod' ? 7 : 1,
      });

      this.redisEndpoint = redisCluster.attrRedisEndpointAddress;
      this.redisPort = redisCluster.attrRedisEndpointPort;

      // Production usage processor with Redis
      const usageProcessor = new NodejsFunction(this, 'UsageProcessor', {
        functionName: `tax-deadline-usage-processor-${props.stage}`,
        entry: 'lib/lambda/usage/processor.ts',
        handler: 'handler',
        runtime: lambda.Runtime.NODEJS_18_X,
        architecture: lambda.Architecture.ARM_64,
        timeout: cdk.Duration.minutes(5),
        memorySize: 1024,
        vpc: vpc,
        vpcSubnets: {
          subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
        },
        environment: {
          USAGE_TABLE: this.usageTable.tableName,
          REDIS_ENDPOINT: this.redisEndpoint,
          REDIS_PORT: this.redisPort,
          STAGE: props.stage,
        },
        bundling: {
          minify: true,
          sourceMap: false,
          target: 'node18',
          nodeModules: ['ioredis'],
        },
      });

      usageProcessor.addEventSource(new KinesisEventSource(this.usageStream, {
        startingPosition: lambda.StartingPosition.LATEST,
        batchSize: 100,
        maxBatchingWindow: cdk.Duration.seconds(5),
      }));

      this.usageTable.grantWriteData(usageProcessor);
      this.usageStream.grantRead(usageProcessor);
    }

    // Outputs
    new cdk.CfnOutput(this, 'UsageStreamName', {
      value: this.usageStream.streamName,
      exportName: `${props.stage}-UsageStreamName`,
    });

    new cdk.CfnOutput(this, 'UsageTableName', {
      value: this.usageTable.tableName,
      exportName: `${props.stage}-UsageTableName`,
    });
  }
}