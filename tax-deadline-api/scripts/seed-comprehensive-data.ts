import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, BatchWriteCommand } from '@aws-sdk/lib-dynamodb';
import { ALL_AUSTRALIAN_TAX_DEADLINES, DeadlineData } from '../lib/lambda/data/au-tax-deadlines-comprehensive';

const client = new DynamoDBClient({ region: 'ap-south-1' });
const ddb = DynamoDBDocumentClient.from(client);

const TABLE_NAME = process.env.DEADLINES_TABLE || 'TaxDeadlines-dev';

// Function to convert deadline data to DynamoDB item format
function createDynamoDBItem(deadline: DeadlineData) {
  return {
    PK: `${deadline.country}#${deadline.state}`,
    SK: `DEADLINE#${deadline.type}#${deadline.period}`,
    GSI1PK: `DATE#${deadline.dates.dueDate}`,
    GSI1SK: `${deadline.country}#${deadline.state}`,
    GSI2PK: `TYPE#${deadline.type}`,
    GSI2SK: `DATE#${deadline.dates.dueDate}`,
    data: deadline,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    version: 1,
  };
}

// Function to batch write items to DynamoDB
async function batchWriteItems(items: any[]) {
  const batches = [];
  
  // Split items into batches of 25 (DynamoDB limit)
  for (let i = 0; i < items.length; i += 25) {
    batches.push(items.slice(i, i + 25));
  }
  
  console.log(`Processing ${batches.length} batches (${items.length} total items)...`);
  
  for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
    const batch = batches[batchIndex];
    const putRequests = batch.map(item => ({ PutRequest: { Item: item } }));
    
    try {
      await ddb.send(new BatchWriteCommand({
        RequestItems: {
          [TABLE_NAME]: putRequests,
        },
      }));
      console.log(`✅ Batch ${batchIndex + 1}/${batches.length} completed (${batch.length} items)`);
    } catch (error) {
      console.error(`❌ Batch ${batchIndex + 1} failed:`, error);
      
      // Fallback to individual puts
      console.log('Attempting individual puts for failed batch...');
      for (const item of batch) {
        try {
          await ddb.send(new PutCommand({
            TableName: TABLE_NAME,
            Item: item,
          }));
          console.log(`✅ Individual put succeeded: ${item.data.name}`);
        } catch (putError) {
          console.error(`❌ Individual put failed for ${item.data.name}:`, putError);
        }
      }
    }
    
    // Add a small delay between batches to avoid throttling
    if (batchIndex < batches.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
}

async function seedComprehensiveData() {
  console.log('🚀 Starting comprehensive Australian tax deadline data seeding...');
  console.log(`📊 Total deadlines to seed: ${ALL_AUSTRALIAN_TAX_DEADLINES.length}`);
  console.log(`📋 Table: ${TABLE_NAME}`);
  console.log('');
  
  // Convert all deadlines to DynamoDB items
  const items = ALL_AUSTRALIAN_TAX_DEADLINES.map(createDynamoDBItem);
  
  // Group by type for summary
  const typeCount: Record<string, number> = {};
  ALL_AUSTRALIAN_TAX_DEADLINES.forEach(deadline => {
    typeCount[deadline.type] = (typeCount[deadline.type] || 0) + 1;
  });
  
  console.log('📈 Deadline type breakdown:');
  Object.entries(typeCount).forEach(([type, count]) => {
    console.log(`   - ${type}: ${count} deadlines`);
  });
  console.log('');
  
  // Group by state for summary
  const stateCount: Record<string, number> = {};
  ALL_AUSTRALIAN_TAX_DEADLINES.forEach(deadline => {
    stateCount[deadline.state] = (stateCount[deadline.state] || 0) + 1;
  });
  
  console.log('📍 State/Territory breakdown:');
  Object.entries(stateCount).forEach(([state, count]) => {
    console.log(`   - ${state}: ${count} deadlines`);
  });
  console.log('');
  
  // Seed the data
  const startTime = Date.now();
  await batchWriteItems(items);
  const endTime = Date.now();
  
  console.log('');
  console.log(`✅ Data seeding completed in ${(endTime - startTime) / 1000} seconds!`);
  console.log(`📊 Total items seeded: ${items.length}`);
  
  // Provide sample queries
  console.log('');
  console.log('🔍 Sample queries to test the data:');
  console.log('');
  console.log('1. Get all NSW deadlines:');
  console.log(`   aws dynamodb query --table-name ${TABLE_NAME} --key-condition-expression "PK = :pk AND begins_with(SK, :sk)" --expression-attribute-values '{":pk":{"S":"AU#NSW"},":sk":{"S":"DEADLINE#"}}'`);
  console.log('');
  console.log('2. Get all BAS deadlines:');
  console.log(`   aws dynamodb query --table-name ${TABLE_NAME} --index-name GSI2 --key-condition-expression "GSI2PK = :pk" --expression-attribute-values '{":pk":{"S":"TYPE#BAS"}}'`);
  console.log('');
  console.log('3. Get deadlines for a specific date:');
  console.log(`   aws dynamodb query --table-name ${TABLE_NAME} --index-name GSI1 --key-condition-expression "GSI1PK = :pk" --expression-attribute-values '{":pk":{"S":"DATE#2024-10-28"}}'`);
}

// Run the seeding with error handling
seedComprehensiveData().catch(error => {
  console.error('❌ Fatal error during seeding:', error);
  process.exit(1);
});