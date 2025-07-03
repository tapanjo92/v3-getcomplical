import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({ region: 'ap-south-1' });
const ddb = DynamoDBDocumentClient.from(client);

const TABLE_NAME = process.env.DEADLINES_TABLE || 'TaxDeadlines-dev';

interface DeadlineData {
  id: string;
  country: string;
  state: string;
  type: string;
  period: string;
  name: string;
  description: string;
  authority: {
    name: string;
    code: string;
    website: string;
  };
  dates: {
    dueDate: string;
    periodStart: string;
    periodEnd: string;
  };
  frequency: string;
  penalties?: {
    lateFee: number;
    interestRate: number;
  };
  threshold?: {
    minTurnover?: number;
    maxTurnover?: number;
    description: string;
  };
}

const SAMPLE_DEADLINES: DeadlineData[] = [
  // Federal deadlines
  {
    id: 'au-ato-bas-2024-q3',
    country: 'AU',
    state: 'FEDERAL',
    type: 'BAS',
    period: '2024Q3',
    name: 'Business Activity Statement Q3 2024',
    description: 'Quarterly BAS for GST registered businesses',
    authority: {
      name: 'Australian Taxation Office',
      code: 'ATO',
      website: 'https://ato.gov.au',
    },
    dates: {
      dueDate: '2024-10-28',
      periodStart: '2024-07-01',
      periodEnd: '2024-09-30',
    },
    frequency: 'quarterly',
    penalties: {
      lateFee: 110,
      interestRate: 9.51,
    },
  },
  {
    id: 'au-ato-income-tax-2024',
    country: 'AU',
    state: 'FEDERAL',
    type: 'INCOME_TAX',
    period: '2024',
    name: 'Individual Income Tax Return 2024',
    description: 'Annual income tax return for individuals',
    authority: {
      name: 'Australian Taxation Office',
      code: 'ATO',
      website: 'https://ato.gov.au',
    },
    dates: {
      dueDate: '2024-10-31',
      periodStart: '2023-07-01',
      periodEnd: '2024-06-30',
    },
    frequency: 'annual',
    penalties: {
      lateFee: 330,
      interestRate: 9.51,
    },
  },
  {
    id: 'au-ato-super-2024-q3',
    country: 'AU',
    state: 'FEDERAL',
    type: 'SUPER',
    period: '2024Q3',
    name: 'Superannuation Guarantee Q3 2024',
    description: 'Quarterly superannuation payments for employees',
    authority: {
      name: 'Australian Taxation Office',
      code: 'ATO',
      website: 'https://ato.gov.au',
    },
    dates: {
      dueDate: '2024-10-28',
      periodStart: '2024-07-01',
      periodEnd: '2024-09-30',
    },
    frequency: 'quarterly',
    penalties: {
      lateFee: 200,
      interestRate: 10.0,
    },
  },
  
  // NSW State deadlines
  {
    id: 'au-nsw-payroll-tax-2024-09',
    country: 'AU',
    state: 'NSW',
    type: 'PAYROLL_TAX',
    period: '2024M09',
    name: 'NSW Payroll Tax September 2024',
    description: 'Monthly payroll tax for businesses over threshold',
    authority: {
      name: 'Revenue NSW',
      code: 'REVENUENSW',
      website: 'https://www.revenue.nsw.gov.au',
    },
    dates: {
      dueDate: '2024-10-07',
      periodStart: '2024-09-01',
      periodEnd: '2024-09-30',
    },
    frequency: 'monthly',
    threshold: {
      minTurnover: 1200000,
      description: 'Annual wages over $1.2M',
    },
    penalties: {
      lateFee: 150,
      interestRate: 8.91,
    },
  },
  
  // VIC State deadlines
  {
    id: 'au-vic-payroll-tax-2024-09',
    country: 'AU',
    state: 'VIC',
    type: 'PAYROLL_TAX',
    period: '2024M09',
    name: 'VIC Payroll Tax September 2024',
    description: 'Monthly payroll tax for businesses over threshold',
    authority: {
      name: 'State Revenue Office Victoria',
      code: 'SRO',
      website: 'https://www.sro.vic.gov.au',
    },
    dates: {
      dueDate: '2024-10-07',
      periodStart: '2024-09-01',
      periodEnd: '2024-09-30',
    },
    frequency: 'monthly',
    threshold: {
      minTurnover: 700000,
      description: 'Annual wages over $700K',
    },
    penalties: {
      lateFee: 130,
      interestRate: 8.91,
    },
  },
  
  // QLD State deadlines
  {
    id: 'au-qld-payroll-tax-2024-09',
    country: 'AU',
    state: 'QLD',
    type: 'PAYROLL_TAX',
    period: '2024M09',
    name: 'QLD Payroll Tax September 2024',
    description: 'Monthly payroll tax for businesses over threshold',
    authority: {
      name: 'Queensland Revenue Office',
      code: 'QRO',
      website: 'https://qro.qld.gov.au',
    },
    dates: {
      dueDate: '2024-10-07',
      periodStart: '2024-09-01',
      periodEnd: '2024-09-30',
    },
    frequency: 'monthly',
    threshold: {
      minTurnover: 1300000,
      description: 'Annual wages over $1.3M',
    },
    penalties: {
      lateFee: 135,
      interestRate: 8.91,
    },
  },
];

async function seedData() {
  console.log('Seeding tax deadline data...');
  
  for (const deadline of SAMPLE_DEADLINES) {
    const item = {
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
    
    try {
      await ddb.send(new PutCommand({
        TableName: TABLE_NAME,
        Item: item,
      }));
      console.log(`✅ Seeded: ${deadline.name}`);
    } catch (error) {
      console.error(`❌ Failed to seed ${deadline.name}:`, error);
    }
  }
  
  console.log('✅ Data seeding completed!');
}

// Run the seeding
seedData().catch(console.error);