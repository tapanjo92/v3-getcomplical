#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { DataStack } from '../lib/stacks/data-stack';
import { ApiConsolidatedStack } from '../lib/stacks/api-consolidated-stack';
import { UsageStack } from '../lib/stacks/usage-stack';
import { MonitoringStack } from '../lib/stacks/monitoring-stack';

/**
 * Tax Deadline API - Production-ready architecture
 * 
 * Design principles:
 * 1. Security-first: All data encrypted, least privilege IAM
 * 2. High cohesion: Related resources in same stack
 * 3. Loose coupling: Stacks communicate through outputs/imports
 * 4. Observable: Comprehensive monitoring and alerting
 * 5. Cost-optimized: ARM64 Lambdas, on-demand DynamoDB
 */
const app = new cdk.App();

const env = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: 'ap-south-1' // Mumbai region for lowest latency
};

const stage = app.node.tryGetContext('stage') || 'dev';

// Stack 1: Data Layer - DynamoDB tables
const dataStack = new DataStack(app, `TaxDeadlineDataStack-${stage}`, {
  env,
  stage,
  description: 'Tax Deadline API - Data Layer (DynamoDB)',
});

// Stack 2: Monitoring - CloudWatch, SNS
const monitoringStack = new MonitoringStack(app, `TaxDeadlineMonitoringStack-${stage}`, {
  env,
  stage,
  description: 'Tax Deadline API - Monitoring & Alerting',
});

// Stack 3: Usage Tracking - Kinesis, Redis, DynamoDB
const usageStack = new UsageStack(app, `TaxDeadlineUsageStack-${stage}`, {
  env,
  stage,
  apiStack: null as any, // Will be set after API stack creation
  description: 'Tax Deadline API - Usage Analytics',
});

// Stack 4: API Layer - Consolidated API Gateway, Lambda, Authorizer
const apiStack = new ApiConsolidatedStack(app, `TaxDeadlineApiStack-${stage}`, {
  env,
  stage,
  deadlinesTable: dataStack.deadlinesTable,
  apiKeysTable: dataStack.apiKeysTable,
  usageTable: usageStack.usageTable,
  usageStream: usageStack.usageStream,
  redisEndpoint: usageStack.redisCluster.attrRedisEndpointAddress,
  redisPort: usageStack.redisCluster.attrRedisEndpointPort,
  description: 'Tax Deadline API - REST API Layer',
});

// Add stack dependencies
apiStack.addDependency(dataStack);
apiStack.addDependency(usageStack);

// Tag all stacks for cost allocation and compliance
const tags = {
  'Project': 'TaxDeadlineAPI',
  'Stage': stage,
  'ManagedBy': 'CDK',
  'SecurityLevel': 'High',
  'DataClassification': 'Public',
  'CostCenter': 'Platform',
  'Owner': 'platform-team@company.com',
};

[dataStack, monitoringStack, usageStack, apiStack].forEach(stack => {
  Object.entries(tags).forEach(([key, value]) => {
    cdk.Tags.of(stack).add(key, value);
  });
});

// Add environment-specific tags
if (stage === 'prod') {
  [dataStack, apiStack].forEach(stack => {
    cdk.Tags.of(stack).add('BackupRequired', 'true');
    cdk.Tags.of(stack).add('AlertingRequired', 'true');
  });
}

// Stack outputs for documentation
new cdk.CfnOutput(app, 'DeploymentGuide', {
  value: `
  Deployment completed for stage: ${stage}
  
  Next steps:
  1. Generate API key: aws lambda invoke --function-name tax-deadline-key-generator-${stage} --payload '{"body": "{\\"customerId\\": \\"test\\", \\"customerEmail\\": \\"test@example.com\\"}"}' response.json
  2. Test health check: curl https://[API-URL]/v1/health
  3. Set up monitoring alerts in CloudWatch
  4. Configure WAF rules for production
  `,
  description: 'Post-deployment instructions',
});