#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { DataStack } from '../lib/stacks/data-stack';
import { ApiStack } from '../lib/stacks/api-stack';
import { AuthStack } from '../lib/stacks/auth-stack';
import { UsageStack } from '../lib/stacks/usage-stack';

const app = new cdk.App();

const env = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: 'ap-south-1' // Mumbai region
};

const stage = app.node.tryGetContext('stage') || 'dev';

// Deploy stacks in order with dependencies
const dataStack = new DataStack(app, `TaxDeadlineDataStack-${stage}`, {
  env,
  stage,
  description: 'Tax Deadline API - Data Layer (DynamoDB tables)'
});

const authStack = new AuthStack(app, `TaxDeadlineAuthStack-${stage}`, {
  env,
  stage,
  dataStack,
  description: 'Tax Deadline API - Authentication & Authorization'
});

const apiStack = new ApiStack(app, `TaxDeadlineApiStack-${stage}`, {
  env,
  stage,
  dataStack,
  authStack,
  description: 'Tax Deadline API - REST API Layer'
});

const usageStack = new UsageStack(app, `TaxDeadlineUsageStack-${stage}`, {
  env,
  stage,
  apiStack,
  description: 'Tax Deadline API - Usage Tracking & Analytics'
});

// Add tags to all stacks
[dataStack, authStack, apiStack, usageStack].forEach(stack => {
  cdk.Tags.of(stack).add('Project', 'TaxDeadlineAPI');
  cdk.Tags.of(stack).add('Stage', stage);
  cdk.Tags.of(stack).add('ManagedBy', 'CDK');
});