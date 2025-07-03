# Tax Deadline API - AWS CDK Implementation

A production-ready tax deadline API built with AWS CDK, deployed to Mumbai region (ap-south-1).

## Architecture

- **API Gateway** - RESTful API with custom authorizer
- **Lambda Functions** - Node.js 18 on ARM64 architecture
- **DynamoDB** - NoSQL database for deadline and API key storage
- **ElastiCache Redis** - Real-time usage tracking
- **Kinesis Data Streams** - Usage event streaming
- **CloudWatch** - Monitoring and alerting

## Prerequisites

- AWS CLI configured with credentials
- Node.js 18+ installed
- AWS CDK CLI installed (`npm install -g aws-cdk`)

## Quick Start

1. **Install dependencies**
```bash
npm install
```

2. **Bootstrap CDK (first time only)**
```bash
npx cdk bootstrap aws://ACCOUNT-ID/ap-south-1
```

3. **Deploy all stacks**
```bash
npm run deploy
```

Or deploy individual modules:
```bash
npm run deploy:data    # DynamoDB tables
npm run deploy:auth    # Authentication layer
npm run deploy:api     # API Gateway + Lambda
npm run deploy:usage   # Usage tracking with Redis
```

4. **Seed sample data**
```bash
export DEADLINES_TABLE=TaxDeadlines-dev
npx ts-node scripts/seed-data.ts
```

5. **Generate an API key**
```bash
aws lambda invoke \
  --function-name tax-deadline-key-generator-dev \
  --payload '{"body": "{\"customerId\": \"test-customer\", \"customerEmail\": \"test@example.com\", \"tier\": \"free\"}"}' \
  response.json

cat response.json | jq -r '.body' | jq '.'
```

## API Endpoints

### Base URL
After deployment, find your API URL in the CloudFormation outputs or run:
```bash
aws cloudformation describe-stacks \
  --stack-name TaxDeadlineApiStack-dev \
  --query 'Stacks[0].Outputs[?OutputKey==`ApiUrl`].OutputValue' \
  --output text
```

### Endpoints

#### Get Deadlines
```bash
curl -X GET "https://YOUR-API-ID.execute-api.ap-south-1.amazonaws.com/dev/v1/deadlines?country=AU&state=NSW" \
  -H "X-API-Key: YOUR_API_KEY"
```

#### Search Deadlines
```bash
curl -X GET "https://YOUR-API-ID.execute-api.ap-south-1.amazonaws.com/dev/v1/deadlines/search?q=payroll" \
  -H "X-API-Key: YOUR_API_KEY"
```

#### Calculate Applicable Deadlines
```bash
curl -X POST "https://YOUR-API-ID.execute-api.ap-south-1.amazonaws.com/dev/v1/deadlines/calculate" \
  -H "X-API-Key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "entity": {
      "type": "company",
      "state": "NSW",
      "turnover": 2000000,
      "gstRegistered": true,
      "employees": 10
    }
  }'
```

#### Get Usage Data
```bash
curl -X GET "https://YOUR-API-ID.execute-api.ap-south-1.amazonaws.com/dev/v1/usage?period=today" \
  -H "X-API-Key: YOUR_API_KEY"
```

## Development

### Project Structure
```
tax-deadline-api/
├── bin/                    # CDK app entry point
├── lib/
│   ├── stacks/            # CDK stack definitions
│   │   ├── data-stack.ts  # DynamoDB tables
│   │   ├── auth-stack.ts  # Authentication
│   │   ├── api-stack.ts   # API Gateway + Lambda
│   │   └── usage-stack.ts # Usage tracking
│   └── lambda/            # Lambda function code
│       ├── api/           # API endpoints
│       ├── auth/          # Authorization
│       └── usage/         # Usage tracking
├── scripts/               # Utility scripts
└── tests/                 # Test files
```

### Environment Variables

The CDK uses context variables for configuration:
- `stage` - Deployment stage (dev/prod)
- `region` - AWS region (default: ap-south-1)

### Testing

```bash
# Run unit tests
npm test

# Test Lambda functions locally
sam local start-api

# Check CDK synthesis
npm run synth
```

## Monitoring

### CloudWatch Dashboards
After deployment, access CloudWatch dashboards for:
- API request metrics
- Lambda performance
- DynamoDB throttles
- Redis cache hit rates

### Alarms
Pre-configured alarms for:
- API error rate > 1%
- API latency P99 > 1 second
- Lambda errors
- DynamoDB throttles

## Cost Optimization

Estimated monthly costs (10M requests):
- API Gateway: $35
- Lambda: $50
- DynamoDB: $25 (on-demand)
- Redis: $15 (t3.micro)
- Kinesis: $50
- **Total: ~$175/month**

## Security

- API keys hashed with SHA-256
- DynamoDB encryption at rest
- VPC isolation for Redis
- IAM roles with least privilege
- API Gateway request validation

## Cleanup

To remove all resources:
```bash
npm run destroy
```

Or remove individual stacks:
```bash
npx cdk destroy TaxDeadlineUsageStack-dev
npx cdk destroy TaxDeadlineApiStack-dev
npx cdk destroy TaxDeadlineAuthStack-dev
npx cdk destroy TaxDeadlineDataStack-dev
```

## Troubleshooting

### Common Issues

1. **CDK Bootstrap Error**
   ```bash
   npx cdk bootstrap aws://ACCOUNT-ID/ap-south-1
   ```

2. **Lambda Timeout**
   - Check VPC configuration
   - Verify Redis endpoint connectivity

3. **API Gateway 401 Unauthorized**
   - Verify API key is active
   - Check authorizer logs in CloudWatch

### Debug Commands

```bash
# View Lambda logs
aws logs tail /aws/lambda/tax-deadline-get-dev --follow

# Check DynamoDB items
aws dynamodb scan --table-name TaxDeadlines-dev

# Test Redis connection
aws elasticache describe-cache-clusters --show-cache-node-info
```

## Next Steps

1. Set up CI/CD pipeline
2. Add comprehensive tests
3. Configure custom domain
4. Enable AWS WAF
5. Set up backup strategies
6. Implement rate limiting per API key

## Support

For issues or questions:
- Check CloudWatch logs
- Review error messages in API responses
- Open an issue in the repository