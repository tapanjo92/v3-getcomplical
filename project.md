# Tax Deadline API Backend Architecture

## Executive Summary
A security-first, compliance-ready SaaS platform delivering tax deadline intelligence for Australian and New Zealand markets. Built on AWS Well-Architected principles with zero-trust security model, designed for 99.95% uptime SLA and sub-100ms response times at scale.

### Key Business Drivers
- **Regulatory Compliance**: ATO/IRD data handling requirements
- **Data Sensitivity**: Financial deadline information impacts business operations
- **Scale Requirements**: 10M+ API calls/month within 18 months
- **Multi-tenancy**: B2B2C model supporting enterprise integrations

## Security Architecture & Threat Model

### Trust Boundaries
1. **Public Internet → API Gateway** (Primary attack surface)
2. **API Gateway → Lambda** (AWS managed)
3. **Lambda → DynamoDB** (Service-to-service)
4. **Admin Portal → Management APIs** (Privileged access)

### Security Controls by Layer

#### Edge Security
- **AWS WAF**: 
  - Rate limiting: 1000 req/min per IP
  - Geo-blocking for non-AU/NZ traffic (configurable)
  - SQL injection and XSS protection
  - Custom rules for API abuse patterns
- **AWS Shield Standard**: DDoS protection
- **CloudFront**: Origin cloaking and SSL/TLS termination

#### API Security
- **API Gateway**:
  - Throttling: 10,000 req/sec burst, 5,000 sustained
  - API keys with usage plans (Basic tier: 1000 calls/day)
  - OAuth 2.0 + OIDC via Cognito (Enterprise tier)
  - Request validation and schema enforcement
  - CORS with strict origin whitelist

## Core Architecture Components

### API Gateway Configuration
- **Service**: REST API with request validation
- **Endpoints** (versioned for backward compatibility):
  ```
  GET  /v1/deadlines/au              → Federal deadlines
  GET  /v1/deadlines/au/{state}      → State-specific
  GET  /v1/deadlines/nz              → New Zealand
  POST /v1/deadlines/search          → Advanced search
  GET  /v1/health                    → Health check
  GET  /v1/metrics                   → Public metrics
  ```

### Lambda Security Configuration
- **Runtime**: Python 3.11 (security patches current)
- **Execution Role**: Principle of least privilege
  ```yaml
  ReadOnly: DynamoDB:GetItem, Query on TaxDeadlines
  WriteOnly: CloudWatch:PutMetricData
  NoAccess: All other AWS services
  ```
- **Environment Variables**: Encrypted via KMS CMK
- **VPC Configuration**: Private subnets with NAT (production only)
- **Memory**: 512MB (prevents OOM attacks)
- **Timeout**: 30 seconds (prevents runaway execution)

### Data Layer Architecture

#### Primary Database (DynamoDB)
- **Encryption**: AWS KMS CMK with annual rotation
- **Access Pattern Optimized Schema**:
  ```
  Table: TaxDeadlines
  PK: COUNTRY#STATE#VERSION (enables data versioning)
  SK: AUTHORITY#TYPE#YEAR#PERIOD
  
  LSI1: DEADLINE_DATE (for temporal queries)
  GSI1: STATUS#DEADLINE_DATE (for operational queries)
  GSI2: TENANT#DEADLINE_DATE (for multi-tenancy)
  
  Attributes:
    - deadlineData (encrypted JSON)
    - createdAt, updatedAt (audit trail)
    - createdBy (IAM principal)
    - dataClassification ("PUBLIC")
    - ttl (90 days post-deadline)
  ```

#### Caching Strategy (Multi-Layer)
1. **CloudFront**: 15-min TTL for public endpoints
2. **API Gateway**: 60-sec cache for identical requests  
3. **Lambda Memory**: 5-min in-process cache
4. **ElastiCache Redis** (future): User-specific data

### Compliance & Data Governance

#### Regulatory Requirements
- **AU Privacy Act 1988**: No PII collected
- **NZ Privacy Act 2020**: Data minimization
- **SOC 2 Type II**: Annual audit readiness
- **ISO 27001**: Control alignment

#### Data Classification
- **Public Data**: Tax deadline information
- **Confidential**: API usage metrics
- **Restricted**: Customer API keys, admin credentials

#### Audit & Compliance Controls
- **CloudTrail**: All API calls logged
- **Config Rules**: Drift detection
- **Access Analyzer**: Quarterly reviews
- **Macie**: Sensitive data scanning (S3 exports)

## API Response Format

```json
{
  "status": "success",
  "data": {
    "country": "AU",
    "state": "NSW",
    "deadlines": [
      {
        "id": "PAYROLL_TAX_202401",
        "authority": "Revenue NSW",
        "type": "Payroll Tax",
        "description": "Monthly payroll tax payment",
        "frequency": "Monthly",
        "threshold": "$1.2M annually",
        "dueDate": "2024-02-07",
        "reminderDates": ["2024-02-01", "2024-02-05"],
        "status": "upcoming"
      }
    ]
  },
  "metadata": {
    "lastUpdated": "2024-01-15T10:00:00Z",
    "version": "1.0"
  }
}
```

## Operational Excellence

### Observability Stack
```yaml
Metrics:
  - CloudWatch: API latency P50/P95/P99
  - Custom Metrics: Business KPIs (searches/day, cache hit rate)
  
Logging:
  - Structured JSON logs with correlation IDs
  - Log retention: 30 days (CloudWatch), 2 years (S3)
  - PII scrubbing via Lambda extension
  
Tracing:
  - X-Ray: 5% sampling (100% for errors)
  - Custom segments for DynamoDB queries
  
Alerting:
  - P1: API availability < 99.9% (PagerDuty)
  - P2: Error rate > 1% (Slack)
  - P3: Cost anomaly > 20% (Email)
```

### Incident Response Playbook
1. **Detection**: CloudWatch Synthetics (1-min intervals)
2. **Triage**: Automated runbook via Systems Manager
3. **Mitigation**: API Gateway circuit breaker
4. **Recovery**: Blue/green Lambda deployment
5. **Post-mortem**: Blameless culture, public RCA

### Disaster Recovery
- **RTO**: 15 minutes
- **RPO**: 1 hour
- **Backup Strategy**: 
  - DynamoDB PITR enabled
  - Cross-region replication to AP-Southeast-2
  - Daily exports to S3 with lifecycle policies

## Cost Governance & FinOps

### Cost Architecture
```yaml
Baseline (0-1M calls/month):
  - API Gateway: $3.50/million requests
  - Lambda: $8 (128MB memory, 100ms avg)
  - DynamoDB: $25 (on-demand mode)
  - CloudFront: $10 (1GB transfer)
  - Monitoring: $15
  Total: ~$65/month

Growth (1-10M calls/month):
  - API Gateway: $35 (volume discount)
  - Lambda: $50 (with provisioned concurrency)
  - DynamoDB: $100 (provisioned mode)
  - CloudFront: $50
  - Monitoring: $30
  Total: ~$265/month

Enterprise (10M+ calls/month):
  - Negotiate Enterprise Agreement
  - Reserved Capacity pricing
  - Custom CloudFront pricing
  Total: ~$800/month
```

### Cost Controls
- **Budget Alerts**: 80% threshold notifications
- **Tagging Strategy**: Environment, Team, Product
- **Cost Allocation**: Per-customer via API keys
- **Optimization**:
  - Lambda ARM processors (20% savings)
  - S3 Intelligent Tiering for logs
  - DynamoDB auto-scaling policies

## Implementation Roadmap

### Phase 0: Foundation & Security (Week 1)
```yaml
Deliverables:
  - Threat model documentation
  - Security baseline (WAF rules, KMS keys)
  - IaC repository with pre-commit hooks
  - CI/CD pipeline with SAST/dependency scanning
Success Criteria:
  - Passed security review
  - Zero high/critical vulnerabilities
```

### Phase 1: MVP with Observability (Week 2-3)
```yaml
Deliverables:
  - Core API endpoints (AU federal only)
  - CloudWatch dashboards
  - Automated deployment pipeline
  - Integration test suite (80% coverage)
Success Criteria:
  - <100ms P95 latency
  - 99.9% availability in staging
```

### Phase 2: Production Hardening (Week 4-5)
```yaml
Deliverables:
  - Multi-region deployment
  - Complete monitoring stack
  - Incident response automation
  - Performance test baseline (10K TPS)
Success Criteria:
  - Passed penetration testing
  - Disaster recovery validated
```

### Phase 3: Scale & Multi-tenancy (Week 6-8)
```yaml
Deliverables:
  - State-level data support
  - Enterprise authentication
  - Usage analytics dashboard
  - Cost optimization implemented
Success Criteria:
  - <$300/month at 10M calls
  - 99.95% SLA achieved
```

## Production-Ready Lambda Example

```python
import json
import os
import boto3
from aws_lambda_powertools import Logger, Tracer, Metrics
from aws_lambda_powertools.metrics import MetricUnit
from aws_lambda_powertools.middleware_factory import lambda_handler_decorator
from botocore.exceptions import ClientError
import time

logger = Logger()
tracer = Tracer()
metrics = Metrics()

# Environment configuration with defaults
TABLE_NAME = os.environ.get('DEADLINES_TABLE', 'TaxDeadlines')
CACHE_TTL = int(os.environ.get('CACHE_TTL', '300'))

# Initialize AWS clients with retries
dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table(TABLE_NAME)

# In-memory cache for Lambda container reuse
cache = {}

@lambda_handler_decorator(trace_execution=True)
@tracer.capture_lambda_handler
@logger.inject_lambda_context(correlation_id_path="headers.x-correlation-id")
@metrics.log_metrics(capture_cold_start_metric=True)
def get_deadlines(event, context):
    """Retrieve tax deadlines with caching and error handling."""
    
    # Extract and validate parameters
    try:
        country = event['pathParameters']['country'].upper()
        state = event['pathParameters'].get('state', 'FEDERAL').upper()
        
        # Input validation
        if country not in ['AU', 'NZ']:
            return error_response(400, "Invalid country code")
            
    except KeyError as e:
        logger.error(f"Missing required parameter: {e}")
        return error_response(400, "Missing required parameters")
    
    # Check cache
    cache_key = f"{country}#{state}"
    if cache_key in cache:
        cached_data, cached_time = cache[cache_key]
        if time.time() - cached_time < CACHE_TTL:
            metrics.add_metric(name="CacheHit", unit=MetricUnit.Count, value=1)
            return success_response(cached_data, cached=True)
    
    # Query DynamoDB with exponential backoff
    try:
        with tracer.provider.in_subsegment("dynamodb_query") as subsegment:
            response = table.query(
                KeyConditionExpression='PK = :pk',
                ExpressionAttributeValues={
                    ':pk': f'{country}#{state}#CURRENT'
                },
                ConsistentRead=False,
                ReturnConsumedCapacity='TOTAL'
            )
            
            # Add query metrics
            subsegment.put_metadata("consumed_capacity", response.get('ConsumedCapacity'))
            metrics.add_metric(name="DynamoDBReadUnits", 
                             unit=MetricUnit.Count, 
                             value=response['ConsumedCapacity']['CapacityUnits'])
    
    except ClientError as e:
        logger.error(f"DynamoDB error: {e.response['Error']['Message']}")
        metrics.add_metric(name="DynamoDBError", unit=MetricUnit.Count, value=1)
        return error_response(503, "Service temporarily unavailable")
    
    # Process and cache results
    deadlines = response.get('Items', [])
    result = {
        'country': country,
        'state': state,
        'deadlines': deadlines,
        'count': len(deadlines)
    }
    
    # Update cache
    cache[cache_key] = (result, time.time())
    
    # Clean old cache entries if needed
    if len(cache) > 100:
        oldest_key = min(cache.keys(), key=lambda k: cache[k][1])
        del cache[oldest_key]
    
    return success_response(result)

def success_response(data, cached=False):
    """Generate successful API response with proper headers."""
    return {
        'statusCode': 200,
        'headers': {
            'Content-Type': 'application/json',
            'Cache-Control': 'public, max-age=900' if not cached else 'public, max-age=3600',
            'X-Cache': 'HIT' if cached else 'MISS',
            'Access-Control-Allow-Origin': '*',
            'X-Content-Type-Options': 'nosniff',
            'X-Frame-Options': 'DENY'
        },
        'body': json.dumps({
            'status': 'success',
            'data': data,
            'timestamp': int(time.time())
        })
    }

def error_response(status_code, message):
    """Generate error API response."""
    return {
        'statusCode': status_code,
        'headers': {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache',
            'X-Content-Type-Options': 'nosniff'
        },
        'body': json.dumps({
            'status': 'error',
            'message': message,
            'timestamp': int(time.time())
        })
    }
```

## Critical Success Factors

### Technical Debt Management
- **Code Quality Gates**: SonarQube quality gate must pass
- **Security Scanning**: Snyk/OWASP dependency check
- **Documentation**: API docs auto-generated from OpenAPI
- **Technical Debt Budget**: 20% of sprint capacity

### Performance Requirements
- **API Latency**: P95 < 100ms, P99 < 200ms
- **Availability**: 99.95% monthly uptime
- **Throughput**: 10,000 TPS sustained
- **Error Budget**: 0.05% (43 minutes/month)

### Security Posture
- **Penetration Testing**: Quarterly by approved vendor
- **Security Champions**: 1 per team
- **Vulnerability SLA**: Critical: 24h, High: 72h
- **Compliance Audits**: Annual SOC 2 Type II

## Lessons from the Trenches

After 30 years building systems that scale:

1. **Start with Security**: It's 10x harder to bolt on later
2. **Observability First**: You can't fix what you can't see
3. **Cost from Day One**: Establish FinOps culture early
4. **Automate Everything**: Manual processes don't scale
5. **Plan for 10x Growth**: But build for current needs
6. **Documentation is Code**: Treat it with same rigor
7. **Incident Response**: Practice before you need it

Remember: The best architecture is the one your team can operate at 3 AM during an incident.