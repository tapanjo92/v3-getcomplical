import { APIGatewayProxyHandler } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import * as crypto from 'crypto';

const client = new DynamoDBClient({ region: 'ap-south-1' });
const ddb = DynamoDBDocumentClient.from(client);

const TABLE_NAME = process.env.API_KEYS_TABLE!;

const TIER_LIMITS = {
  free: 1000,
  starter: 10000,
  professional: 100000,
  business: 1000000,
  enterprise: -1, // Unlimited
};

export const handler: APIGatewayProxyHandler = async (event) => {
  console.log('Key generator event:', JSON.stringify(event, null, 2));

  // Parse request body
  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch (error) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Invalid request body' }),
    };
  }

  const { customerId, customerEmail, tier = 'free', description } = body;

  if (!customerId || !customerEmail) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'customerId and customerEmail are required' }),
    };
  }

  try {
    // Generate API key
    const apiKey = `td_${crypto.randomBytes(32).toString('base64url')}`;
    const keyHash = crypto.createHash('sha256').update(apiKey).digest('hex');
    const keyId = crypto.randomBytes(8).toString('hex');
    const now = new Date().toISOString();
    const expiresAt = new Date();
    expiresAt.setFullYear(expiresAt.getFullYear() + 1); // 1 year expiration

    // Store in DynamoDB
    const item = {
      PK: `CUSTOMER#${customerId}`,
      SK: `APIKEY#${keyId}`,
      apiKeyHash: keyHash,
      customerId,
      customerEmail,
      tier,
      description,
      monthlyLimit: TIER_LIMITS[tier as keyof typeof TIER_LIMITS] || TIER_LIMITS.free,
      status: 'active',
      createdAt: now,
      expiresAt: expiresAt.toISOString(),
      lastUsed: null,
      totalRequests: 0,
    };

    await ddb.send(new PutCommand({
      TableName: TABLE_NAME,
      Item: item,
    }));

    // Return the API key (only time it's shown in plain text)
    return {
      statusCode: 201,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        apiKey,
        keyId,
        customerId,
        tier,
        monthlyLimit: item.monthlyLimit,
        expiresAt: item.expiresAt,
        message: 'Store this API key securely. It will not be shown again.',
      }),
    };

  } catch (error) {
    console.error('Error generating API key:', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Failed to generate API key' }),
    };
  }
};