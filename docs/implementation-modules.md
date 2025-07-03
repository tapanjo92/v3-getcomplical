# Implementation Modules: Step-by-Step Building Guide

## Executive Summary
Breaking down the tax deadline API platform into independent, buildable modules. Each module can be developed, tested, and deployed separately, allowing for rapid iteration and reduced complexity.

## Module Architecture Overview

```yaml
Core Modules (Build First):
  1. Data Module - Store and manage deadline data
  2. API Module - Serve deadline information
  3. Auth Module - API key management
  4. Usage Module - Track API usage

Feature Modules (Build Next):
  5. Dashboard Module - Customer portal
  6. Webhook Module - Event notifications
  7. Search Module - Advanced queries
  8. Billing Module - Payment processing

Advanced Modules (Build Later):
  9. Analytics Module - Business intelligence
  10. Compliance Module - Risk scoring
  11. Integration Module - Third-party connectors
  12. ML Module - Predictions and insights
```

## Module 1: Data Module (Week 1)

### Purpose
Store and manage tax deadline data with versioning and audit trails.

### Implementation Guide

#### Step 1: DynamoDB Schema
```python
# infrastructure/dynamodb.py
import boto3
from datetime import datetime

class DeadlineDataStore:
    def __init__(self):
        self.dynamodb = boto3.resource('dynamodb')
        self.table_name = 'TaxDeadlines'
    
    def create_table(self):
        """Create DynamoDB table for deadlines"""
        table = self.dynamodb.create_table(
            TableName=self.table_name,
            KeySchema=[
                {'AttributeName': 'PK', 'KeyType': 'HASH'},
                {'AttributeName': 'SK', 'KeyType': 'RANGE'}
            ],
            AttributeDefinitions=[
                {'AttributeName': 'PK', 'AttributeType': 'S'},
                {'AttributeName': 'SK', 'AttributeType': 'S'},
                {'AttributeName': 'GSI1PK', 'AttributeType': 'S'},
                {'AttributeName': 'GSI1SK', 'AttributeType': 'S'}
            ],
            GlobalSecondaryIndexes=[{
                'IndexName': 'GSI1',
                'KeySchema': [
                    {'AttributeName': 'GSI1PK', 'KeyType': 'HASH'},
                    {'AttributeName': 'GSI1SK', 'KeyType': 'RANGE'}
                ],
                'Projection': {'ProjectionType': 'ALL'}
            }],
            BillingMode='PAY_PER_REQUEST'
        )
        return table

    def insert_deadline(self, deadline_data):
        """Insert a deadline with versioning"""
        table = self.dynamodb.Table(self.table_name)
        
        # Example: AU#FEDERAL for country/state
        pk = f"{deadline_data['country']}#{deadline_data['state']}"
        # Example: DEADLINE#BAS#2024Q1
        sk = f"DEADLINE#{deadline_data['type']}#{deadline_data['period']}"
        
        item = {
            'PK': pk,
            'SK': sk,
            'GSI1PK': f"DATE#{deadline_data['due_date']}",
            'GSI1SK': pk,
            'data': deadline_data,
            'version': 1,
            'created_at': datetime.utcnow().isoformat(),
            'updated_at': datetime.utcnow().isoformat()
        }
        
        table.put_item(Item=item)
        return item
```

#### Step 2: Data Loading Script
```python
# scripts/load_initial_data.py
import json
from data_store import DeadlineDataStore

# Initial deadline data
INITIAL_DEADLINES = [
    {
        "id": "au-ato-bas-2024-q1",
        "country": "AU",
        "state": "FEDERAL",
        "type": "BAS",
        "period": "2024Q1",
        "name": "Business Activity Statement Q1 2024",
        "due_date": "2024-04-28",
        "authority": "ATO",
        "description": "Quarterly BAS for GST registered businesses",
        "penalties": {
            "late_fee": 110,
            "interest_rate": 9.51
        }
    },
    # Add more deadlines...
]

def load_deadlines():
    store = DeadlineDataStore()
    store.create_table()
    
    for deadline in INITIAL_DEADLINES:
        store.insert_deadline(deadline)
        print(f"Loaded: {deadline['name']}")

if __name__ == "__main__":
    load_deadlines()
```

### Testing
```python
# tests/test_data_module.py
import pytest
from data_store import DeadlineDataStore

def test_deadline_insertion():
    store = DeadlineDataStore()
    deadline = {
        "country": "AU",
        "state": "NSW",
        "type": "PAYROLL_TAX",
        "period": "2024M01",
        "due_date": "2024-02-07"
    }
    
    result = store.insert_deadline(deadline)
    assert result['PK'] == 'AU#NSW'
    assert result['SK'] == 'DEADLINE#PAYROLL_TAX#2024M01'
```

## Module 2: API Module (Week 2)

### Purpose
RESTful API to serve deadline data with caching and error handling.

### Implementation Guide

#### Step 1: Lambda Handler
```python
# api/handlers/deadlines.py
import json
import boto3
from datetime import datetime
from typing import Dict, Any

dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table('TaxDeadlines')

def get_deadlines_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """Main API handler for deadline queries"""
    
    try:
        # Extract query parameters
        params = event.get('queryStringParameters', {})
        country = params.get('country', 'AU').upper()
        state = params.get('state', 'FEDERAL').upper()
        year = params.get('year', str(datetime.now().year))
        
        # Query DynamoDB
        response = table.query(
            KeyConditionExpression='PK = :pk AND begins_with(SK, :sk)',
            ExpressionAttributeValues={
                ':pk': f'{country}#{state}',
                ':sk': 'DEADLINE#'
            }
        )
        
        # Format response
        deadlines = []
        for item in response['Items']:
            deadline_data = item['data']
            # Filter by year if needed
            if deadline_data['due_date'].startswith(year):
                deadlines.append(deadline_data)
        
        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({
                'meta': {
                    'code': 200,
                    'execution_time_ms': 23
                },
                'response': {
                    'deadlines': deadlines,
                    'count': len(deadlines)
                }
            })
        }
        
    except Exception as e:
        return {
            'statusCode': 500,
            'body': json.dumps({
                'error': {
                    'message': str(e),
                    'code': 'INTERNAL_ERROR'
                }
            })
        }
```

#### Step 2: API Gateway Configuration
```yaml
# infrastructure/api_gateway.yaml
AWSTemplateFormatVersion: '2010-09-09'
Transform: AWS::Serverless-2016-10-31

Resources:
  TaxDeadlineAPI:
    Type: AWS::Serverless::Api
    Properties:
      StageName: v1
      Cors:
        AllowMethods: "'GET,POST,OPTIONS'"
        AllowHeaders: "'Content-Type,X-API-Key'"
        AllowOrigin: "'*'"
      
  GetDeadlinesFunction:
    Type: AWS::Serverless::Function
    Properties:
      CodeUri: api/handlers/
      Handler: deadlines.get_deadlines_handler
      Runtime: python3.11
      Events:
        GetDeadlines:
          Type: Api
          Properties:
            RestApiId: !Ref TaxDeadlineAPI
            Path: /deadlines
            Method: GET
```

### Testing
```bash
# Local testing with SAM
sam local start-api

# Test the endpoint
curl "http://localhost:3000/v1/deadlines?country=AU&state=NSW"
```

## Module 3: Auth Module (Week 3)

### Purpose
API key generation, validation, and customer management.

### Implementation Guide

#### Step 1: API Key Generation
```python
# auth/api_key_manager.py
import secrets
import hashlib
import boto3
from datetime import datetime, timedelta

class APIKeyManager:
    def __init__(self):
        self.dynamodb = boto3.resource('dynamodb')
        self.table = self.dynamodb.Table('APIKeys')
    
    def generate_api_key(self, customer_id: str, tier: str = 'free') -> dict:
        """Generate new API key for customer"""
        # Generate secure random key
        raw_key = f"td_{secrets.token_urlsafe(32)}"
        key_hash = hashlib.sha256(raw_key.encode()).hexdigest()
        
        # Store in DynamoDB
        item = {
            'PK': f'CUSTOMER#{customer_id}',
            'SK': f'KEY#{key_hash}',
            'api_key_hash': key_hash,
            'tier': tier,
            'created_at': datetime.utcnow().isoformat(),
            'expires_at': (datetime.utcnow() + timedelta(days=365)).isoformat(),
            'status': 'active',
            'monthly_limit': self._get_tier_limit(tier),
            'customer_id': customer_id
        }
        
        self.table.put_item(Item=item)
        
        return {
            'api_key': raw_key,  # Only returned once
            'key_id': key_hash[:8],  # For identification
            'tier': tier,
            'monthly_limit': item['monthly_limit']
        }
    
    def validate_api_key(self, api_key: str) -> dict:
        """Validate API key and return customer info"""
        key_hash = hashlib.sha256(api_key.encode()).hexdigest()
        
        response = self.table.get_item(
            Key={
                'PK': f'KEY#{key_hash}',
                'SK': 'METADATA'
            }
        )
        
        if 'Item' not in response:
            return {'valid': False}
        
        item = response['Item']
        if item['status'] != 'active':
            return {'valid': False, 'reason': 'inactive'}
        
        if datetime.fromisoformat(item['expires_at']) < datetime.utcnow():
            return {'valid': False, 'reason': 'expired'}
        
        return {
            'valid': True,
            'customer_id': item['customer_id'],
            'tier': item['tier'],
            'monthly_limit': item['monthly_limit']
        }
    
    def _get_tier_limit(self, tier: str) -> int:
        limits = {
            'free': 1000,
            'starter': 10000,
            'professional': 100000,
            'business': 1000000,
            'enterprise': -1  # Unlimited
        }
        return limits.get(tier, 1000)
```

#### Step 2: API Gateway Authorizer
```python
# auth/authorizer.py
import os
from api_key_manager import APIKeyManager

def lambda_authorizer(event, context):
    """Custom authorizer for API Gateway"""
    
    # Extract API key from header
    api_key = event['headers'].get('X-API-Key')
    
    if not api_key:
        raise Exception('Unauthorized')
    
    # Validate key
    manager = APIKeyManager()
    validation = manager.validate_api_key(api_key)
    
    if not validation['valid']:
        raise Exception('Unauthorized')
    
    # Return policy
    return {
        'principalId': validation['customer_id'],
        'policyDocument': {
            'Version': '2012-10-17',
            'Statement': [{
                'Action': 'execute-api:Invoke',
                'Effect': 'Allow',
                'Resource': event['methodArn']
            }]
        },
        'context': {
            'customerId': validation['customer_id'],
            'tier': validation['tier'],
            'monthlyLimit': str(validation['monthly_limit'])
        }
    }
```

## Module 4: Usage Module (Week 4)

### Purpose
Track API usage in real-time with accurate billing data.

### Implementation Guide

#### Step 1: Usage Tracking
```python
# usage/tracker.py
import redis
import boto3
import json
from datetime import datetime
from decimal import Decimal

class UsageTracker:
    def __init__(self):
        self.redis_client = redis.Redis(
            host=os.environ['REDIS_HOST'],
            decode_responses=True
        )
        self.kinesis = boto3.client('kinesis')
        self.stream_name = 'api-usage-stream'
    
    def track_request(self, customer_id: str, api_key_id: str, 
                     endpoint: str, response_time_ms: int):
        """Track API request in real-time"""
        
        timestamp = datetime.utcnow()
        date_hour = timestamp.strftime('%Y%m%d:%H')
        
        # Increment Redis counters (real-time)
        pipe = self.redis_client.pipeline()
        
        # Hourly counter
        pipe.hincrby(f'usage:{customer_id}:{date_hour}', api_key_id, 1)
        pipe.expire(f'usage:{customer_id}:{date_hour}', 86400)  # 24h
        
        # Daily counter
        pipe.hincrby(f'usage:daily:{customer_id}:{timestamp.date()}', 'total', 1)
        
        # Monthly counter (for limits)
        pipe.hincrby(f'usage:monthly:{customer_id}:{timestamp.strftime("%Y%m")}', 'total', 1)
        
        pipe.execute()
        
        # Send to Kinesis for durable storage
        record = {
            'customer_id': customer_id,
            'api_key_id': api_key_id,
            'endpoint': endpoint,
            'timestamp': timestamp.isoformat(),
            'response_time_ms': response_time_ms
        }
        
        self.kinesis.put_record(
            StreamName=self.stream_name,
            Data=json.dumps(record),
            PartitionKey=customer_id
        )
    
    def get_current_usage(self, customer_id: str) -> dict:
        """Get current month usage"""
        current_month = datetime.utcnow().strftime('%Y%m')
        usage = self.redis_client.hget(
            f'usage:monthly:{customer_id}:{current_month}', 
            'total'
        )
        return {
            'month': current_month,
            'usage': int(usage or 0)
        }
```

#### Step 2: Usage API Endpoint
```python
# api/handlers/usage.py
def get_usage_handler(event, context):
    """Get customer usage data"""
    
    # Get customer ID from authorizer
    customer_id = event['requestContext']['authorizer']['customerId']
    
    tracker = UsageTracker()
    current = tracker.get_current_usage(customer_id)
    
    # Get detailed breakdown
    redis_client = redis.Redis(host=os.environ['REDIS_HOST'])
    pattern = f'usage:{customer_id}:*'
    
    hourly_data = []
    for key in redis_client.scan_iter(match=pattern):
        data = redis_client.hgetall(key)
        hour = key.split(':')[-1]
        hourly_data.append({
            'hour': hour,
            'requests': sum(int(v) for v in data.values())
        })
    
    return {
        'statusCode': 200,
        'body': json.dumps({
            'current_month': current,
            'hourly_breakdown': sorted(hourly_data, key=lambda x: x['hour']),
            'last_updated': datetime.utcnow().isoformat()
        })
    }
```

## Module 5: Dashboard Module (Week 5-6)

### Purpose
Customer portal for API key management and usage visualization.

### Implementation Guide

#### Step 1: React Dashboard Setup
```bash
# Create React app
npx create-react-app tax-deadline-dashboard --template typescript
cd tax-deadline-dashboard

# Install dependencies
npm install axios recharts react-query tailwindcss
```

#### Step 2: Dashboard Components
```typescript
// src/components/Dashboard.tsx
import React from 'react';
import { useQuery } from 'react-query';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { getUsageData } from '../api/client';

export const Dashboard: React.FC = () => {
  const { data: usage, isLoading } = useQuery(
    'usage', 
    getUsageData,
    { refetchInterval: 30000 } // Refresh every 30 seconds
  );

  if (isLoading) return <div>Loading...</div>;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">API Usage Dashboard</h1>
      
      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <SummaryCard
          title="Current Month"
          value={usage.current_month.usage}
          limit={usage.current_month.limit}
        />
        <SummaryCard
          title="Today"
          value={usage.today}
        />
        <SummaryCard
          title="Success Rate"
          value={`${usage.success_rate}%`}
        />
        <SummaryCard
          title="Avg Response"
          value={`${usage.avg_response_ms}ms`}
        />
      </div>

      {/* Usage Chart */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-lg font-semibold mb-4">Hourly Usage</h2>
        <LineChart width={800} height={300} data={usage.hourly_data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="hour" />
          <YAxis />
          <Tooltip />
          <Line type="monotone" dataKey="requests" stroke="#3B82F6" />
        </LineChart>
      </div>

      {/* API Keys */}
      <ApiKeyManager />
    </div>
  );
};
```

## Module Building Order & Timeline

### Phase 1: Core (Weeks 1-4)
```yaml
Week 1: Data Module
  - DynamoDB setup
  - Data loading scripts
  - Basic CRUD operations

Week 2: API Module  
  - Lambda functions
  - API Gateway setup
  - Basic endpoints

Week 3: Auth Module
  - API key generation
  - Validation logic
  - Rate limiting

Week 4: Usage Module
  - Redis tracking
  - Kinesis streaming
  - Usage endpoints
```

### Phase 2: Customer Experience (Weeks 5-8)
```yaml
Week 5-6: Dashboard Module
  - React frontend
  - Usage visualization
  - API key management

Week 7: Webhook Module
  - Event system
  - Webhook delivery
  - Retry logic

Week 8: Search Module
  - Advanced queries
  - Full-text search
  - Filtering
```

### Phase 3: Monetization (Weeks 9-12)
```yaml
Week 9-10: Billing Module
  - Stripe integration
  - Subscription management
  - Invoice generation

Week 11: Analytics Module
  - Business metrics
  - Customer insights
  - Revenue tracking

Week 12: Integration Module
  - Xero connector
  - MYOB integration
  - Zapier app
```

## Development Best Practices

### 1. Module Independence
```yaml
Each Module Should:
  - Have its own repository/folder
  - Deploy independently
  - Have its own tests
  - Define clear interfaces
  - Handle failures gracefully
```

### 2. Testing Strategy
```yaml
Unit Tests: Each module 80%+ coverage
Integration Tests: Module interactions
E2E Tests: Critical user journeys
Load Tests: 10x expected traffic
Security Tests: OWASP top 10
```

### 3. Documentation
```yaml
Per Module:
  - README with setup instructions
  - API documentation
  - Architecture decisions
  - Deployment guide
  - Troubleshooting guide
```

## Module Communication

### Event-Driven Architecture
```python
# Common event bus
class EventBus:
    def __init__(self):
        self.sns = boto3.client('sns')
        self.topic_arn = os.environ['EVENT_TOPIC_ARN']
    
    def publish(self, event_type: str, data: dict):
        self.sns.publish(
            TopicArn=self.topic_arn,
            Message=json.dumps({
                'event_type': event_type,
                'data': data,
                'timestamp': datetime.utcnow().isoformat()
            })
        )

# Usage in modules
event_bus = EventBus()
event_bus.publish('api_key.created', {
    'customer_id': customer_id,
    'key_id': key_id
})
```

## Deployment Strategy

### Infrastructure as Code
```yaml
# Each module has its own CloudFormation/CDK
modules/
  data/
    infrastructure/
      template.yaml
    src/
    tests/
  api/
    infrastructure/
      template.yaml
    src/
    tests/
  auth/
    infrastructure/
      template.yaml
    src/
    tests/
```

### CI/CD Pipeline
```yaml
# .github/workflows/deploy.yml
name: Deploy Module
on:
  push:
    branches: [main]
    paths:
      - 'modules/${{ matrix.module }}/**'

jobs:
  deploy:
    strategy:
      matrix:
        module: [data, api, auth, usage]
    steps:
      - uses: actions/checkout@v2
      - name: Deploy ${{ matrix.module }}
        run: |
          cd modules/${{ matrix.module }}
          npm test
          sam deploy
```

## Success Metrics Per Module

### Data Module
- Write latency < 10ms
- 99.99% availability
- Zero data loss

### API Module  
- Response time < 50ms
- 99.95% uptime
- <0.01% error rate

### Auth Module
- Key validation < 5ms
- Zero false rejections
- Secure key storage

### Usage Module
- Real-time accuracy 99.9%
- <5 second delay
- Zero lost events

## Conclusion

By breaking the platform into independent modules, you can:
1. **Ship faster** - Deploy modules as they're ready
2. **Reduce risk** - Isolate failures
3. **Scale teams** - Different developers per module
4. **Iterate quickly** - Change modules independently

Start with the Data and API modules to get something working quickly, then add Auth and Usage for a complete MVP. Each module should take 1-2 developers about a week to build and test.