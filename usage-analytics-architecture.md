# Real-Time Usage Analytics Architecture

## Executive Summary
A distributed usage tracking system designed for near real-time visibility (5-15 second latency) with eventual consistency for billing accuracy. Built to handle 100K+ API calls per second while maintaining sub-second query performance for customer dashboards.

## Business Requirements
- **Dashboard Latency**: Usage visible within 15 seconds (P95)
- **Accuracy**: 99.99% billing accuracy (eventual consistency acceptable)
- **Scale**: Support 10K+ customers with 5-50 API keys each
- **Query Performance**: <500ms for usage aggregation queries
- **Data Retention**: 13 months rolling window for compliance

## Architecture Overview

### Data Flow Pipeline
```
API Gateway → Kinesis Data Firehose → S3 (Raw Logs)
     ↓              ↓
  Lambda         Kinesis Analytics → ElastiCache Redis
     ↓              ↓
  DynamoDB      TimeStream → QuickSight Dashboard
```

## Component Details

### 1. API Gateway Integration
```yaml
Request Flow:
  1. API Call arrives with API key header
  2. Custom authorizer validates key
  3. Request context enriched with:
     - customerId
     - apiKeyId
     - productTier
     - timestamp
  4. Access logs streamed to Kinesis Firehose
  5. Response includes X-RateLimit headers
```

### 2. Real-Time Stream Processing

#### Kinesis Data Firehose Configuration
```yaml
Stream: api-usage-firehose
Buffer:
  Size: 1MB
  Interval: 60 seconds (whichever comes first)
Transformation:
  Lambda: EnrichUsageData
Destination:
  Primary: S3 (s3://usage-data/raw/)
  Secondary: Kinesis Analytics
Format: JSON Lines
Compression: GZIP
Error Handling: Separate error bucket
```

#### Kinesis Analytics SQL
```sql
CREATE STREAM enriched_usage AS
SELECT 
    customerId,
    apiKeyId,
    COUNT(*) as request_count,
    SUM(CASE WHEN statusCode >= 400 THEN 1 ELSE 0 END) as error_count,
    AVG(latency) as avg_latency,
    ROWTIME as window_time
FROM SOURCE_SQL_STREAM_001
GROUP BY 
    customerId,
    apiKeyId,
    ROWTIME RANGE INTERVAL '10' SECOND;
```

### 3. Storage Layers

#### Hot Storage (Redis Cluster)
```yaml
Purpose: Last 24 hours of usage data
Structure:
  # Current hour buckets
  usage:{customerId}:{date}:{hour} → Hash
    {apiKeyId}: {count}
  
  # Rolling 5-minute windows
  usage:realtime:{customerId}:{timestamp} → Sorted Set
    Score: timestamp
    Member: {apiKeyId}:{count}
    
TTL: 25 hours
Cluster: 3 shards, 2 replicas each
```

#### Warm Storage (DynamoDB)
```yaml
Table: UsageMetrics
PK: CUSTOMER#{customerId}
SK: DATE#{date}#HOUR#{hour}#KEY#{apiKeyId}

Attributes:
  - requests: Number
  - errors: Number
  - dataTransferred: Number
  - avgLatency: Number
  - peakTps: Number
  
GSI1: BY_KEY
  PK: KEY#{apiKeyId}
  SK: DATE#{date}#HOUR#{hour}

TTL: 90 days
Stream: Enabled → Lambda aggregator
```

#### Cold Storage (TimeStream)
```yaml
Database: api_usage_metrics
Table: hourly_aggregates
Dimensions:
  - customerId
  - apiKeyId
  - endpoint
  - statusCode
Measures:
  - request_count
  - response_time_p50
  - response_time_p95
  - response_time_p99
  - data_transferred_bytes
Retention:
  Memory: 1 day
  Magnetic: 13 months
```

### 4. Aggregation Pipeline

#### Near Real-Time Aggregator (Lambda)
```python
import json
import redis
import boto3
from datetime import datetime, timedelta

redis_client = redis.Redis(host='cluster.endpoint', decode_responses=True)
dynamodb = boto3.resource('dynamodb')

def process_usage_record(record):
    """Process incoming usage record from Kinesis"""
    data = json.loads(record['data'])
    
    # Extract metadata
    customer_id = data['customerId']
    api_key_id = data['apiKeyId']
    timestamp = datetime.fromisoformat(data['timestamp'])
    
    # Update Redis for real-time view
    hour_key = f"usage:{customer_id}:{timestamp.strftime('%Y%m%d')}:{timestamp.hour}"
    redis_client.hincrby(hour_key, api_key_id, 1)
    redis_client.expire(hour_key, 90000)  # 25 hours
    
    # Update rolling window
    window_key = f"usage:realtime:{customer_id}:{timestamp.timestamp()}"
    redis_client.zadd(window_key, {f"{api_key_id}:1": timestamp.timestamp()})
    redis_client.expire(window_key, 900)  # 15 minutes
    
    # Batch write to DynamoDB every 100 requests
    if random.random() < 0.01:  # 1% sampling for immediate write
        write_to_dynamodb(customer_id, api_key_id, timestamp)
```

#### Batch Aggregator (Step Functions)
```yaml
StateMachine: UsageAggregationPipeline
Schedule: Every 5 minutes
States:
  1. ReadFromRedis:
      - Scan all customer keys
      - Aggregate by hour
  2. WriteToTimeStream:
      - Batch insert aggregated metrics
      - Include percentiles
  3. UpdateDynamoDB:
      - Write hourly summaries
      - Update daily rollups
  4. ClearProcessedData:
      - Remove processed Redis keys
      - Send SNS on failure
```

### 5. Query Architecture

#### Dashboard API (Lambda + API Gateway)
```python
def get_usage_summary(customer_id, date_range):
    """Get usage summary with <500ms response time"""
    
    # Check cache first
    cache_key = f"summary:{customer_id}:{date_range}"
    cached = redis_client.get(cache_key)
    if cached:
        return json.loads(cached)
    
    # For last 24 hours, use Redis
    if date_range == 'today':
        return get_realtime_usage(customer_id)
    
    # For historical, query TimeStream
    if date_range in ['week', 'month']:
        return query_timestream(customer_id, date_range)
    
    # For billing period, use DynamoDB
    return query_dynamodb_aggregates(customer_id, date_range)

def get_realtime_usage(customer_id):
    """Get near real-time usage from Redis"""
    pattern = f"usage:{customer_id}:*"
    total = 0
    by_key = {}
    
    for key in redis_client.scan_iter(match=pattern):
        data = redis_client.hgetall(key)
        for api_key, count in data.items():
            by_key[api_key] = by_key.get(api_key, 0) + int(count)
            total += int(count)
    
    return {
        'total': total,
        'byKey': by_key,
        'lastUpdated': datetime.now().isoformat(),
        'latency': 'realtime'
    }
```

### 6. Dashboard Implementation

#### Frontend Architecture
```javascript
// React component with WebSocket for real-time updates
const UsageDashboard = () => {
  const [usage, setUsage] = useState({});
  const [lastUpdate, setLastUpdate] = useState(null);
  
  useEffect(() => {
    // Initial load
    fetchUsage();
    
    // WebSocket for real-time updates
    const ws = new WebSocket('wss://api.example.com/usage-stream');
    ws.onmessage = (event) => {
      const update = JSON.parse(event.data);
      if (update.customerId === currentCustomer) {
        setUsage(prev => ({
          ...prev,
          total: prev.total + update.increment,
          byKey: {
            ...prev.byKey,
            [update.apiKeyId]: (prev.byKey[update.apiKeyId] || 0) + update.increment
          }
        }));
        setLastUpdate(new Date());
      }
    };
    
    // Polling fallback every 15 seconds
    const interval = setInterval(fetchUsage, 15000);
    
    return () => {
      ws.close();
      clearInterval(interval);
    };
  }, []);
};
```

## Latency Breakdown

### Best Case (5 seconds)
1. API Call → Kinesis: 50ms
2. Kinesis → Lambda: 200ms
3. Lambda → Redis: 10ms
4. Redis → Dashboard API: 10ms
5. Dashboard Polling: 5000ms
**Total: ~5.3 seconds**

### Typical Case (10 seconds)
1. API Call → Kinesis: 100ms
2. Kinesis Buffer: 3000ms
3. Lambda Processing: 500ms
4. Redis Write: 20ms
5. Dashboard Polling: 7500ms
**Total: ~11 seconds**

### Worst Case (15 seconds)
1. API Call → Kinesis: 200ms
2. Kinesis Buffer: 5000ms
3. Lambda Retry: 2000ms
4. Redis Cluster Failover: 3000ms
5. Dashboard Retry: 5000ms
**Total: ~15 seconds**

## Cost Optimization

### Estimated Monthly Costs (10M API calls)
```yaml
Kinesis Firehose: $50
  - 10M records × $0.029/million
  - S3 storage: 1TB × $23
  
Kinesis Analytics: $110
  - 1 KPU running continuously
  
Redis Cluster: $200
  - 3 × cache.t3.small nodes
  
DynamoDB: $75
  - On-demand: 10M writes, 5M reads
  
TimeStream: $150
  - 10M writes × $0.50/million
  - 100GB storage × $0.03/GB
  - 1M queries × $0.01/10K
  
Lambda: $50
  - 10M invocations
  - 256MB memory, 200ms avg
  
Total: ~$635/month
```

### Cost Reduction Strategies
1. **Sampling**: Only process 10% of requests in real-time
2. **Compression**: Use protobuf instead of JSON
3. **Reserved Capacity**: 40% savings on Redis
4. **S3 Lifecycle**: Move to Glacier after 30 days

## Implementation Phases

### Phase 1: Basic Tracking (Week 1)
- API Gateway logging to S3
- Daily batch aggregation
- Simple dashboard with 24-hour delay

### Phase 2: Near Real-Time (Week 2-3)
- Kinesis Firehose integration
- Redis hot storage
- 5-minute delayed dashboard

### Phase 3: True Real-Time (Week 4-5)
- Kinesis Analytics
- WebSocket updates
- Sub-15 second visibility

### Phase 4: Advanced Analytics (Week 6+)
- TimeStream integration
- ML-based anomaly detection
- Predictive usage alerts

## Monitoring & Alerts

### Key Metrics
```yaml
Business Metrics:
  - Usage visibility latency (P50, P95, P99)
  - Data accuracy (reconciliation rate)
  - Dashboard query time
  
Technical Metrics:
  - Kinesis iterator age
  - Lambda error rate
  - Redis memory usage
  - DynamoDB throttles
  
Alerts:
  - Latency > 20 seconds: Page on-call
  - Accuracy < 99.9%: Email team
  - Redis memory > 80%: Auto-scale
```

## Security Considerations

### Data Protection
- Kinesis streams encrypted with KMS
- Redis TLS in transit, encryption at rest
- S3 bucket policies restrict access
- API keys hashed before storage

### Access Control
- IAM roles with least privilege
- Cognito authentication for dashboard
- API Gateway resource policies
- VPC endpoints for AWS services

## Edge Cases & Solutions

### Burst Traffic
- Kinesis auto-scaling enabled
- Lambda reserved concurrency: 1000
- Redis cluster can burst to 5x capacity

### Customer with 1000+ Keys
- Pagination in dashboard API
- Aggregation at ingest time
- Separate Redis namespace

### Retroactive Corrections
- S3 raw logs are source of truth
- Monthly reconciliation job
- Adjustment entries in TimeStream

## Future Enhancements

1. **GraphQL Subscriptions**: Real-time updates without polling
2. **Edge Analytics**: CloudFront usage tracking
3. **Cost Attribution**: Per-endpoint cost breakdown
4. **Usage Predictions**: ML model for capacity planning
5. **Webhooks**: Notify when limits approached

## Conclusion

This architecture provides a pragmatic balance between real-time visibility and cost efficiency. The 15-second target is achievable for 95% of requests, with graceful degradation under load. The multi-tier storage approach ensures both performance and long-term data retention for compliance.