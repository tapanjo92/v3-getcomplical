import { APIGatewayProxyHandler } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand } from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({ region: 'ap-south-1' });
const ddb = DynamoDBDocumentClient.from(client);

const TABLE_NAME = process.env.DEADLINES_TABLE!;

export const handler: APIGatewayProxyHandler = async (event) => {
  const startTime = Date.now();
  console.log('Search deadlines event:', JSON.stringify(event, null, 2));

  const query = event.queryStringParameters?.q?.toLowerCase();
  const from = event.queryStringParameters?.from;
  const to = event.queryStringParameters?.to;

  if (!query) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        error: {
          code: 'MISSING_PARAMETER',
          message: 'Query parameter "q" is required',
        },
      }),
    };
  }

  try {
    // Scan the table (in production, use ElasticSearch for better performance)
    const result = await ddb.send(new ScanCommand({
      TableName: TABLE_NAME,
      FilterExpression: 'begins_with(SK, :prefix)',
      ExpressionAttributeValues: {
        ':prefix': 'DEADLINE#',
      },
    }));

    let deadlines = result.Items || [];

    // Search in name, description, and type
    deadlines = deadlines.filter(item => {
      const data = item.data || {};
      const searchFields = [
        data.name?.toLowerCase(),
        data.description?.toLowerCase(),
        data.type?.toLowerCase(),
        data.authority?.toLowerCase(),
        item.SK.toLowerCase(),
      ].filter(Boolean).join(' ');
      
      return searchFields.includes(query);
    });

    // Filter by date range if provided
    if (from || to) {
      deadlines = deadlines.filter(item => {
        const dueDate = item.data?.dueDate || item.data?.dates?.dueDate;
        if (!dueDate) return false;
        
        if (from && dueDate < from) return false;
        if (to && dueDate > to) return false;
        
        return true;
      });
    }

    // Sort by relevance (simple scoring based on matches)
    deadlines.sort((a, b) => {
      const scoreA = (a.data?.name?.toLowerCase().includes(query) ? 2 : 0) +
                     (a.data?.type?.toLowerCase().includes(query) ? 1 : 0);
      const scoreB = (b.data?.name?.toLowerCase().includes(query) ? 2 : 0) +
                     (b.data?.type?.toLowerCase().includes(query) ? 1 : 0);
      return scoreB - scoreA;
    });

    // Format response
    const formattedDeadlines = deadlines.map(item => ({
      id: item.data?.id || `${item.PK}-${item.SK}`.toLowerCase().replace(/[#]/g, '-'),
      ...item.data,
      relevanceScore: (item.data?.name?.toLowerCase().includes(query) ? 2 : 0) +
                      (item.data?.type?.toLowerCase().includes(query) ? 1 : 0),
    }));

    const responseTime = Date.now() - startTime;

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'X-Response-Time': `${responseTime}ms`,
      },
      body: JSON.stringify({
        meta: {
          code: 200,
          executionTimeMs: responseTime,
          count: formattedDeadlines.length,
        },
        response: {
          deadlines: formattedDeadlines,
          query: {
            q: query,
            from,
            to,
          },
        },
      }),
    };

  } catch (error) {
    console.error('Error searching deadlines:', error);
    const responseTime = Date.now() - startTime;

    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'X-Response-Time': `${responseTime}ms`,
      },
      body: JSON.stringify({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to search deadlines',
          requestId: event.requestContext.requestId,
        },
      }),
    };
  }
};