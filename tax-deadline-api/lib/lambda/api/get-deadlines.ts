import { APIGatewayProxyHandler } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { KinesisClient, PutRecordCommand } from '@aws-sdk/client-kinesis';

const client = new DynamoDBClient({ region: 'ap-south-1' });
const ddb = DynamoDBDocumentClient.from(client);
const kinesis = new KinesisClient({ region: 'ap-south-1' });

const TABLE_NAME = process.env.DEADLINES_TABLE!;
const USAGE_STREAM = process.env.USAGE_STREAM || 'tax-deadline-usage-dev';

export const handler: APIGatewayProxyHandler = async (event) => {
  const startTime = Date.now();
  console.log('Get deadlines event:', JSON.stringify(event, null, 2));

  // Extract query parameters
  const country = event.queryStringParameters?.country?.toUpperCase() || 'AU';
  const state = event.queryStringParameters?.state?.toUpperCase() || 'FEDERAL';
  const year = event.queryStringParameters?.year || new Date().getFullYear().toString();
  const type = event.queryStringParameters?.type?.toUpperCase();
  const upcoming = event.queryStringParameters?.upcoming;

  // Get customer info from authorizer context
  const customerId = event.requestContext.authorizer?.customerId || 'unknown';
  const apiKeyId = event.requestContext.authorizer?.apiKeyId || 'unknown';

  try {
    // Build query
    const pk = `${country}#${state}`;
    const queryParams: any = {
      TableName: TABLE_NAME,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :prefix)',
      ExpressionAttributeValues: {
        ':pk': pk,
        ':prefix': 'DEADLINE#',
      },
    };

    // Query DynamoDB
    const result = await ddb.send(new QueryCommand(queryParams));
    
    // Filter results
    let deadlines = result.Items || [];
    
    // Filter by year
    deadlines = deadlines.filter(item => {
      const dueDate = item.data?.dueDate || item.data?.dates?.dueDate;
      return dueDate && dueDate.startsWith(year);
    });

    // Filter by type if specified
    if (type) {
      deadlines = deadlines.filter(item => 
        item.data?.type === type || item.SK.includes(type)
      );
    }

    // Filter by upcoming days if specified
    if (upcoming) {
      const days = parseInt(upcoming);
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + days);
      
      deadlines = deadlines.filter(item => {
        const dueDate = new Date(item.data?.dueDate || item.data?.dates?.dueDate);
        return dueDate >= new Date() && dueDate <= futureDate;
      });
    }

    // Sort by due date
    deadlines.sort((a, b) => {
      const dateA = new Date(a.data?.dueDate || a.data?.dates?.dueDate).getTime();
      const dateB = new Date(b.data?.dueDate || b.data?.dates?.dueDate).getTime();
      return dateA - dateB;
    });

    // Format response
    const formattedDeadlines = deadlines.map(item => ({
      id: item.data?.id || `${item.PK}-${item.SK}`.toLowerCase().replace(/[#]/g, '-'),
      ...item.data,
    }));

    const responseTime = Date.now() - startTime;

    // Track usage asynchronously
    const usageRecord = {
      customerId,
      apiKeyId,
      endpoint: '/v1/deadlines',
      method: 'GET',
      statusCode: 200,
      responseTime,
      timestamp: new Date().toISOString(),
      parameters: { country, state, year, type, upcoming },
    };

    try {
      await kinesis.send(new PutRecordCommand({
        StreamName: USAGE_STREAM,
        Data: Buffer.from(JSON.stringify(usageRecord)),
        PartitionKey: customerId,
      }));
    } catch (error) {
      console.error('Failed to track usage:', error);
      // Don't fail the request if usage tracking fails
    }

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=300', // 5 minute cache
        'X-Response-Time': `${responseTime}ms`,
      },
      body: JSON.stringify({
        meta: {
          code: 200,
          executionTimeMs: responseTime,
          cacheStatus: 'MISS',
          count: formattedDeadlines.length,
        },
        response: {
          deadlines: formattedDeadlines,
          query: {
            country,
            state,
            year,
            type,
            upcoming,
          },
        },
      }),
    };

  } catch (error) {
    console.error('Error getting deadlines:', error);
    
    const responseTime = Date.now() - startTime;
    
    // Track error
    try {
      await kinesis.send(new PutRecordCommand({
        StreamName: USAGE_STREAM,
        Data: Buffer.from(JSON.stringify({
          customerId,
          apiKeyId,
          endpoint: '/v1/deadlines',
          method: 'GET',
          statusCode: 500,
          responseTime,
          timestamp: new Date().toISOString(),
          error: error instanceof Error ? error.message : 'Unknown error',
        })),
        PartitionKey: customerId,
      }));
    } catch (trackError) {
      console.error('Failed to track error:', trackError);
    }

    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'X-Response-Time': `${responseTime}ms`,
      },
      body: JSON.stringify({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to retrieve deadlines',
          requestId: event.requestContext.requestId,
        },
      }),
    };
  }
};