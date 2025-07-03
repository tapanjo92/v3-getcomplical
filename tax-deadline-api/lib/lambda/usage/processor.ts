import { KinesisStreamHandler, KinesisStreamRecord } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, BatchWriteCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import Redis from 'ioredis';

const client = new DynamoDBClient({ region: 'ap-south-1' });
const ddb = DynamoDBDocumentClient.from(client);

const TABLE_NAME = process.env.USAGE_TABLE!;
const REDIS_ENDPOINT = process.env.REDIS_ENDPOINT!;
const REDIS_PORT = parseInt(process.env.REDIS_PORT || '6379');

let redis: Redis | null = null;

function getRedisClient(): Redis {
  if (!redis) {
    redis = new Redis({
      host: REDIS_ENDPOINT,
      port: REDIS_PORT,
      retryStrategy: (times) => Math.min(times * 50, 2000),
    });
  }
  return redis;
}

export const handler: KinesisStreamHandler = async (event) => {
  console.log(`Processing ${event.Records.length} usage records`);
  
  const redisClient = getRedisClient();
  const hourlyAggregates: Map<string, any> = new Map();
  
  try {
    // Process each Kinesis record
    for (const record of event.Records) {
      try {
        const data = JSON.parse(
          Buffer.from(record.kinesis.data, 'base64').toString('utf-8')
        );
        
        await processUsageRecord(data, redisClient, hourlyAggregates);
      } catch (error) {
        console.error('Error processing record:', error, record);
      }
    }
    
    // Write aggregates to DynamoDB
    if (hourlyAggregates.size > 0) {
      await writeAggregatesToDynamoDB(hourlyAggregates);
    }
    
  } catch (error) {
    console.error('Error in usage processor:', error);
    throw error;
  }
};

async function processUsageRecord(
  data: any,
  redisClient: Redis,
  hourlyAggregates: Map<string, any>
): Promise<void> {
  const { customerId, apiKeyId, endpoint, method, statusCode, responseTime, timestamp } = data;
  
  const date = new Date(timestamp);
  const dateHour = `${date.toISOString().slice(0, 10)}:${date.getUTCHours().toString().padStart(2, '0')}`;
  const month = date.toISOString().slice(0, 7);
  
  // Update Redis counters (real-time view)
  const pipeline = redisClient.pipeline();
  
  // Hourly counter
  pipeline.hincrby(`usage:${customerId}:${dateHour}`, apiKeyId, 1);
  pipeline.expire(`usage:${customerId}:${dateHour}`, 86400); // 24 hours
  
  // Daily counter
  pipeline.hincrby(`usage:daily:${customerId}:${date.toISOString().slice(0, 10)}`, 'total', 1);
  pipeline.expire(`usage:daily:${customerId}:${date.toISOString().slice(0, 10)}`, 172800); // 48 hours
  
  // Monthly counter (for rate limiting)
  pipeline.hincrby(`usage:monthly:${customerId}:${month}`, 'total', 1);
  pipeline.expire(`usage:monthly:${customerId}:${month}`, 2592000); // 30 days
  
  // Response time tracking
  pipeline.lpush(`latency:${customerId}:${dateHour}`, responseTime);
  pipeline.ltrim(`latency:${customerId}:${dateHour}`, 0, 999); // Keep last 1000
  pipeline.expire(`latency:${customerId}:${dateHour}`, 86400);
  
  // Error tracking
  if (statusCode >= 400) {
    pipeline.hincrby(`errors:${customerId}:${dateHour}`, endpoint, 1);
    pipeline.expire(`errors:${customerId}:${dateHour}`, 86400);
  }
  
  await pipeline.exec();
  
  // Aggregate for DynamoDB batch write
  const aggregateKey = `${customerId}#${dateHour}`;
  if (!hourlyAggregates.has(aggregateKey)) {
    hourlyAggregates.set(aggregateKey, {
      customerId,
      dateHour,
      requests: 0,
      errors: 0,
      totalResponseTime: 0,
      endpoints: new Map(),
      apiKeys: new Set(),
    });
  }
  
  const aggregate = hourlyAggregates.get(aggregateKey)!;
  aggregate.requests++;
  if (statusCode >= 400) aggregate.errors++;
  aggregate.totalResponseTime += responseTime;
  aggregate.apiKeys.add(apiKeyId);
  
  const endpointKey = `${method} ${endpoint}`;
  aggregate.endpoints.set(
    endpointKey,
    (aggregate.endpoints.get(endpointKey) || 0) + 1
  );
}

async function writeAggregatesToDynamoDB(
  hourlyAggregates: Map<string, any>
): Promise<void> {
  const items: any[] = [];
  
  for (const [key, aggregate] of hourlyAggregates) {
    const ttl = Math.floor(Date.now() / 1000) + (90 * 24 * 60 * 60); // 90 days
    
    const item = {
      PK: `USAGE#${aggregate.customerId}`,
      SK: `HOUR#${aggregate.dateHour}`,
      customerId: aggregate.customerId,
      dateHour: aggregate.dateHour,
      requests: aggregate.requests,
      errors: aggregate.errors,
      avgResponseTime: Math.round(aggregate.totalResponseTime / aggregate.requests),
      uniqueApiKeys: aggregate.apiKeys.size,
      topEndpoints: Array.from(aggregate.endpoints.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([endpoint, count]) => ({ endpoint, count })),
      ttl,
    };
    
    items.push({
      PutRequest: { Item: item }
    });
  }
  
  // Batch write to DynamoDB (max 25 items per batch)
  const chunks = [];
  for (let i = 0; i < items.length; i += 25) {
    chunks.push(items.slice(i, i + 25));
  }
  
  for (const chunk of chunks) {
    await ddb.send(new BatchWriteCommand({
      RequestItems: {
        [TABLE_NAME]: chunk
      }
    }));
  }
  
  console.log(`Wrote ${items.length} usage aggregates to DynamoDB`);
}