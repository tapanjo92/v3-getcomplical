#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { DataStack } from '../lib/stacks/data-stack';
import { ApiConsolidatedStack } from '../lib/stacks/api-consolidated-stack';
import { UsageStackV2 } from '../lib/stacks/usage-stack-v2';
import { MonitoringStack } from '../lib/stacks/monitoring-stack';

/**
 * Tax Deadline API - Simplified Architecture
 * 
 * As a principal architect with 30 years experience, I've learned:
 * - Start simple, evolve to complex
 * - Avoid circular dependencies at all costs
 * - Each stack should have a single responsibility
 * - Monitor everything, alert on what matters
 */
const app = new cdk.App();

const env = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: 'ap-south-1'
};

const stage = app.node.tryGetContext('stage') || 'dev';

// Stack 1: Data Layer
const dataStack = new DataStack(app, `TaxDeadlineDataStack-${stage}`, {
  env,
  stage,
  description: 'Tax Deadline API - Data Layer',
});

// Stack 2: Monitoring (independent)
const monitoringStack = new MonitoringStack(app, `TaxDeadlineMonitoringStack-${stage}`, {
  env,
  stage,
  description: 'Tax Deadline API - Monitoring',
});

// Stack 3: Usage Tracking (simplified for dev)
const usageStack = new UsageStackV2(app, `TaxDeadlineUsageStack-${stage}`, {
  env,
  stage,
  description: 'Tax Deadline API - Usage Tracking',
});

// Stack 4: API (consolidated to avoid circular deps)
const apiStack = new ApiConsolidatedStack(app, `TaxDeadlineApiStack-${stage}`, {
  env,
  stage,
  deadlinesTable: dataStack.deadlinesTable,
  apiKeysTable: dataStack.apiKeysTable,
  usageTable: usageStack.usageTable,
  usageStream: usageStack.usageStream,
  redisEndpoint: usageStack.redisEndpoint,
  redisPort: usageStack.redisPort,
  description: 'Tax Deadline API - REST API',
});

// Explicit dependencies
apiStack.addDependency(dataStack);
apiStack.addDependency(usageStack);

// Apply tags
const tags = {
  'Project': 'TaxDeadlineAPI',
  'Stage': stage,
  'ManagedBy': 'CDK',
  'Region': 'ap-south-1',
};

[dataStack, monitoringStack, usageStack, apiStack].forEach(stack => {
  Object.entries(tags).forEach(([key, value]) => {
    cdk.Tags.of(stack).add(key, value);
  });
});