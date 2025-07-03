import { APIGatewayTokenAuthorizerHandler, APIGatewayAuthorizerResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand } from '@aws-sdk/lib-dynamodb';
import * as crypto from 'crypto';

const client = new DynamoDBClient({ region: 'ap-south-1' });
const ddb = DynamoDBDocumentClient.from(client);

const TABLE_NAME = process.env.API_KEYS_TABLE!;

export const handler: APIGatewayTokenAuthorizerHandler = async (event: any) => {
  console.log('Authorizer event:', JSON.stringify(event, null, 2));
  
  // For REQUEST authorizer, the API key comes from headers
  const apiKey = event.headers?.['x-api-key'] || event.headers?.['X-API-Key'] || event.authorizationToken;
  
  if (!apiKey || !apiKey.startsWith('td_')) {
    throw new Error('Unauthorized');
  }

  try {
    // Hash the API key for lookup
    const keyHash = crypto.createHash('sha256').update(apiKey).digest('hex');
    
    // Query DynamoDB for the API key
    const result = await ddb.send(new QueryCommand({
      TableName: TABLE_NAME,
      IndexName: 'KeyLookupIndex',
      KeyConditionExpression: 'apiKeyHash = :hash',
      ExpressionAttributeValues: {
        ':hash': keyHash,
      },
      Limit: 1,
    }));

    if (!result.Items || result.Items.length === 0) {
      throw new Error('Unauthorized');
    }

    const keyData = result.Items[0];

    // Check if key is active
    if (keyData.status !== 'active') {
      throw new Error('Unauthorized');
    }

    // Check expiration
    if (keyData.expiresAt && new Date(keyData.expiresAt) < new Date()) {
      throw new Error('Unauthorized');
    }

    // Generate IAM policy
    const policy: APIGatewayAuthorizerResult = {
      principalId: keyData.customerId,
      policyDocument: {
        Version: '2012-10-17',
        Statement: [
          {
            Action: 'execute-api:Invoke',
            Effect: 'Allow',
            Resource: event.methodArn.replace(/\/[^\/]+\/[^\/]+$/, '/*/*'), // Allow all methods and paths
          },
        ],
      },
      context: {
        customerId: keyData.customerId,
        tier: keyData.tier,
        monthlyLimit: String(keyData.monthlyLimit || -1),
        apiKeyId: keyData.SK.split('#')[1], // Extract key ID from sort key
      },
    };

    console.log('Authorization successful for customer:', keyData.customerId);
    return policy;

  } catch (error) {
    console.error('Authorization failed:', error);
    throw new Error('Unauthorized');
  }
};