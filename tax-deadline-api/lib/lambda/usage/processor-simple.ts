import { KinesisStreamHandler } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, BatchWriteCommand } from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({ region: 'ap-south-1' });
const ddb = DynamoDBDocumentClient.from(client);

const TABLE_NAME = process.env.USAGE_TABLE!;

/**
 * Simplified usage processor for development environment
 * Writes directly to DynamoDB without Redis
 */
export const handler: KinesisStreamHandler = async (event) => {
  console.log(`Processing ${event.Records.length} usage records`);
  
  const hourlyAggregates: Map<string, any> = new Map();
  
  try {
    // Process each Kinesis record
    for (const record of event.Records) {
      try {
        const data = JSON.parse(
          Buffer.from(record.kinesis.data, 'base64').toString('utf-8')
        );
        
        processUsageRecord(data, hourlyAggregates);
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

function processUsageRecord(
  data: any,
  hourlyAggregates: Map<string, any>
): void {
  const { customerId, apiKeyId, endpoint, method, statusCode, responseTime, timestamp } = data;
  
  const date = new Date(timestamp);
  const dateHour = `${date.toISOString().slice(0, 10)}:${date.getUTCHours().toString().padStart(2, '0')}`;
  
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