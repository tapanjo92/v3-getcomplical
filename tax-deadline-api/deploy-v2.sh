#!/bin/bash

# Tax Deadline API - Simplified Deployment Script
# Deploys the API with proper stack dependencies

set -e

echo "🚀 Deploying Tax Deadline API to ap-south-1 (Mumbai)"

# Check AWS credentials
echo "✅ Checking AWS credentials..."
aws sts get-caller-identity

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Bootstrap CDK if needed
echo "🏗️  Bootstrapping CDK..."
npx cdk bootstrap aws://$(aws sts get-caller-identity --query Account --output text)/ap-south-1 || true

# Deploy stacks in order
echo "📊 Deploying Data Stack..."
npx cdk deploy TaxDeadlineDataStack-dev --require-approval never

echo "📈 Deploying Monitoring Stack..."
npx cdk deploy TaxDeadlineMonitoringStack-dev --require-approval never

echo "📊 Deploying Usage Stack (simplified for dev)..."
npx cdk deploy TaxDeadlineUsageStack-dev --require-approval never

echo "🔐 Deploying API Stack (consolidated)..."
npx cdk deploy TaxDeadlineApiStack-dev --require-approval never

echo "✅ Deployment complete!"

# Get API URL
API_URL=$(aws cloudformation describe-stacks \
  --stack-name TaxDeadlineApiStack-dev \
  --query 'Stacks[0].Outputs[?OutputKey==`ApiUrl`].OutputValue' \
  --output text)

echo ""
echo "🎉 Tax Deadline API deployed successfully!"
echo "📍 API URL: $API_URL"
echo ""
echo "Next steps:"
echo "1. Generate an API key:"
echo "   aws lambda invoke --function-name tax-deadline-key-generator-dev --payload '{\"body\": \"{\\\"customerId\\\": \\\"test\\\", \\\"customerEmail\\\": \\\"test@example.com\\\"}\"}' response.json"
echo ""
echo "2. Test the health endpoint:"
echo "   curl ${API_URL}v1/health"
echo ""
echo "3. Seed sample data:"
echo "   export DEADLINES_TABLE=TaxDeadlines-dev"
echo "   npx ts-node scripts/seed-data.ts"