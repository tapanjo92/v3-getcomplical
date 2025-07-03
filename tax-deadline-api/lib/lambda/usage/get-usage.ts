import { APIGatewayProxyHandler } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand } from '@aws-sdk/lib-dynamodb';
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

export const handler: APIGatewayProxyHandler = async (event) => {
  console.log('Get usage event:', JSON.stringify(event, null, 2));
  
  // Get customer info from authorizer
  const customerId = event.requestContext.authorizer?.customerId || 'unknown';
  const monthlyLimit = parseInt(event.requestContext.authorizer?.monthlyLimit || '-1');
  
  const period = event.queryStringParameters?.period || 'today';
  const detailed = event.queryStringParameters?.detailed === 'true';
  
  try {
    const redisClient = getRedisClient();
    const now = new Date();
    const currentMonth = now.toISOString().slice(0, 7);
    const today = now.toISOString().slice(0, 10);
    
    let usageData: any = {
      customerId,
      period,
      timestamp: now.toISOString(),
    };
    
    switch (period) {
      case 'today':
        usageData = await getTodayUsage(redisClient, customerId, today);
        break;
        
      case 'month':
        usageData = await getMonthUsage(redisClient, ddb, customerId, currentMonth);
        break;
        
      case 'hour':
        usageData = await getHourlyUsage(redisClient, customerId);
        break;
        
      default:
        return {
          statusCode: 400,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            error: {
              code: 'INVALID_PERIOD',
              message: 'Period must be one of: today, month, hour',
            },
          }),
        };
    }
    
    // Add limit information
    usageData.limits = {
      monthly: monthlyLimit,
      used: usageData.monthTotal || 0,
      remaining: monthlyLimit > 0 ? Math.max(0, monthlyLimit - (usageData.monthTotal || 0)) : -1,
      percentUsed: monthlyLimit > 0 ? Math.round(((usageData.monthTotal || 0) / monthlyLimit) * 100) : 0,
    };
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'private, max-age=60',
      },
      body: JSON.stringify({
        meta: {
          code: 200,
        },
        response: usageData,
      }),
    };
    
  } catch (error) {
    console.error('Error getting usage:', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to retrieve usage data',
        },
      }),
    };
  }
};

async function getTodayUsage(redis: Redis, customerId: string, today: string): Promise<any> {
  const pattern = `usage:${customerId}:${today}:*`;
  const keys = await redis.keys(pattern);
  
  let totalRequests = 0;
  const hourlyData: any[] = [];
  const apiKeyUsage: Record<string, number> = {};
  
  for (const key of keys) {
    const hour = key.split(':').pop()!;
    const data = await redis.hgetall(key);
    
    let hourTotal = 0;
    for (const [apiKey, count] of Object.entries(data)) {
      const requests = parseInt(count);
      hourTotal += requests;
      apiKeyUsage[apiKey] = (apiKeyUsage[apiKey] || 0) + requests;
    }
    
    totalRequests += hourTotal;
    hourlyData.push({
      hour: parseInt(hour),
      requests: hourTotal,
    });
  }
  
  // Get current month total
  const currentMonth = today.slice(0, 7);
  const monthTotal = await redis.hget(`usage:monthly:${customerId}:${currentMonth}`, 'total');
  
  // Get latency data for today
  const latencies: number[] = [];
  const latencyKeys = await redis.keys(`latency:${customerId}:${today}:*`);
  for (const key of latencyKeys) {
    const values = await redis.lrange(key, 0, -1);
    latencies.push(...values.map(v => parseInt(v)));
  }
  
  const avgLatency = latencies.length > 0 
    ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length)
    : 0;
  
  return {
    customerId,
    period: 'today',
    date: today,
    totalRequests,
    monthTotal: parseInt(monthTotal || '0'),
    avgLatency,
    hourlyData: hourlyData.sort((a, b) => a.hour - b.hour),
    apiKeyBreakdown: Object.entries(apiKeyUsage).map(([key, count]) => ({
      apiKeyId: key,
      requests: count,
    })),
  };
}

async function getMonthUsage(
  redis: Redis,
  ddb: DynamoDBDocumentClient,
  customerId: string,
  month: string
): Promise<any> {
  // Get from Redis first (current month)
  const monthTotal = await redis.hget(`usage:monthly:${customerId}:${month}`, 'total');
  
  // Get daily breakdown from DynamoDB
  const result = await ddb.send(new QueryCommand({
    TableName: TABLE_NAME,
    KeyConditionExpression: 'PK = :pk AND begins_with(SK, :prefix)',
    ExpressionAttributeValues: {
      ':pk': `USAGE#${customerId}`,
      ':prefix': `HOUR#${month}`,
    },
  }));
  
  const dailyUsage: Record<string, number> = {};
  const endpointUsage: Record<string, number> = {};
  let totalErrors = 0;
  let totalRequests = 0;
  
  for (const item of result.Items || []) {
    const date = item.dateHour.split(':')[0];
    dailyUsage[date] = (dailyUsage[date] || 0) + item.requests;
    totalRequests += item.requests;
    totalErrors += item.errors || 0;
    
    // Aggregate endpoint usage
    for (const endpoint of item.topEndpoints || []) {
      endpointUsage[endpoint.endpoint] = (endpointUsage[endpoint.endpoint] || 0) + endpoint.count;
    }
  }
  
  const errorRate = totalRequests > 0 ? ((totalErrors / totalRequests) * 100).toFixed(2) : '0';
  
  return {
    customerId,
    period: 'month',
    month,
    monthTotal: parseInt(monthTotal || '0'),
    totalRequests,
    totalErrors,
    errorRate: parseFloat(errorRate),
    dailyBreakdown: Object.entries(dailyUsage).map(([date, requests]) => ({
      date,
      requests,
    })).sort((a, b) => a.date.localeCompare(b.date)),
    topEndpoints: Object.entries(endpointUsage)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([endpoint, count]) => ({ endpoint, count })),
  };
}

async function getHourlyUsage(redis: Redis, customerId: string): Promise<any> {
  const now = new Date();
  const currentHour = `${now.toISOString().slice(0, 10)}:${now.getUTCHours().toString().padStart(2, '0')}`;
  
  const data = await redis.hgetall(`usage:${customerId}:${currentHour}`);
  let total = 0;
  const apiKeys: any[] = [];
  
  for (const [apiKey, count] of Object.entries(data)) {
    const requests = parseInt(count);
    total += requests;
    apiKeys.push({ apiKeyId: apiKey, requests });
  }
  
  // Get latency for current hour
  const latencies = await redis.lrange(`latency:${customerId}:${currentHour}`, 0, -1);
  const avgLatency = latencies.length > 0
    ? Math.round(latencies.map(l => parseInt(l)).reduce((a, b) => a + b, 0) / latencies.length)
    : 0;
  
  return {
    customerId,
    period: 'hour',
    hour: currentHour,
    requests: total,
    avgLatency,
    apiKeys,
    lastUpdated: now.toISOString(),
  };
}