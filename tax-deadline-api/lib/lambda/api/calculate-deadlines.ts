import { APIGatewayProxyHandler } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand, BatchGetCommand } from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({ region: 'ap-south-1' });
const ddb = DynamoDBDocumentClient.from(client);

const TABLE_NAME = process.env.DEADLINES_TABLE!;

interface EntityDetails {
  type: 'individual' | 'soleTrader' | 'partnership' | 'company' | 'trust';
  turnover?: number;
  gstRegistered?: boolean;
  employees?: number;
  state: string;
  industry?: string;
}

export const handler: APIGatewayProxyHandler = async (event) => {
  const startTime = Date.now();
  console.log('Calculate deadlines event:', JSON.stringify(event, null, 2));

  // Parse request body
  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch (error) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        error: {
          code: 'INVALID_REQUEST',
          message: 'Invalid JSON in request body',
        },
      }),
    };
  }

  const entity: EntityDetails = body.entity;

  if (!entity || !entity.type || !entity.state) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        error: {
          code: 'MISSING_PARAMETERS',
          message: 'entity.type and entity.state are required',
        },
      }),
    };
  }

  try {
    const applicableDeadlines: any[] = [];
    const year = new Date().getFullYear().toString();

    // 1. Get federal deadlines that apply to all
    const federalResult = await ddb.send(new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :prefix)',
      ExpressionAttributeValues: {
        ':pk': 'AU#FEDERAL',
        ':prefix': 'DEADLINE#',
      },
    }));

    const federalDeadlines = federalResult.Items || [];

    // 2. Get state-specific deadlines
    const stateResult = await ddb.send(new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :prefix)',
      ExpressionAttributeValues: {
        ':pk': `AU#${entity.state}`,
        ':prefix': 'DEADLINE#',
      },
    }));

    const stateDeadlines = stateResult.Items || [];

    // 3. Apply business rules to determine applicable deadlines
    const allDeadlines = [...federalDeadlines, ...stateDeadlines];

    for (const deadline of allDeadlines) {
      const data = deadline.data || {};
      let applicable = false;
      let reason = '';

      // BAS - applies to GST registered entities
      if (data.type === 'BAS' && entity.gstRegistered) {
        applicable = true;
        reason = 'GST registered entity';
      }

      // PAYG Withholding - applies if you have employees
      if (data.type === 'PAYG' && entity.employees && entity.employees > 0) {
        applicable = true;
        reason = 'Has employees';
      }

      // Super Guarantee - applies if you have employees
      if (data.type === 'SUPER' && entity.employees && entity.employees > 0) {
        applicable = true;
        reason = 'Has employees';
      }

      // Payroll Tax - applies based on turnover threshold
      if (data.type === 'PAYROLL_TAX') {
        const threshold = getPayrollTaxThreshold(entity.state);
        if (entity.turnover && entity.turnover >= threshold) {
          applicable = true;
          reason = `Turnover exceeds ${threshold.toLocaleString()} threshold`;
        }
      }

      // Income Tax - applies to all entities
      if (data.type === 'INCOME_TAX') {
        applicable = true;
        reason = 'Applies to all entities';
      }

      // Company Tax - applies to companies only
      if (data.type === 'COMPANY_TAX' && entity.type === 'company') {
        applicable = true;
        reason = 'Company entity';
      }

      if (applicable) {
        applicableDeadlines.push({
          id: data.id || `${deadline.PK}-${deadline.SK}`.toLowerCase().replace(/[#]/g, '-'),
          ...data,
          applicableReason: reason,
          priority: calculatePriority(data),
        });
      }
    }

    // Sort by due date
    applicableDeadlines.sort((a, b) => {
      const dateA = new Date(a.dueDate || a.dates?.dueDate).getTime();
      const dateB = new Date(b.dueDate || b.dates?.dueDate).getTime();
      return dateA - dateB;
    });

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
          count: applicableDeadlines.length,
        },
        response: {
          entity,
          deadlines: applicableDeadlines,
          summary: {
            total: applicableDeadlines.length,
            highPriority: applicableDeadlines.filter(d => d.priority === 'high').length,
            upcoming30Days: applicableDeadlines.filter(d => {
              const dueDate = new Date(d.dueDate || d.dates?.dueDate);
              const daysUntil = (dueDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
              return daysUntil >= 0 && daysUntil <= 30;
            }).length,
          },
        },
      }),
    };

  } catch (error) {
    console.error('Error calculating deadlines:', error);
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
          message: 'Failed to calculate deadlines',
          requestId: event.requestContext.requestId,
        },
      }),
    };
  }
};

function getPayrollTaxThreshold(state: string): number {
  const thresholds: Record<string, number> = {
    NSW: 1200000,
    VIC: 700000,
    QLD: 1300000,
    SA: 1500000,
    WA: 1000000,
    TAS: 1250000,
    NT: 1500000,
    ACT: 2000000,
  };
  return thresholds[state] || 1200000;
}

function calculatePriority(deadline: any): 'high' | 'medium' | 'low' {
  // High priority if penalties are severe or deadline is critical
  if (deadline.penalties && deadline.penalties.lateFee > 500) return 'high';
  if (deadline.type === 'BAS' || deadline.type === 'PAYG') return 'high';
  if (deadline.type === 'SUPER') return 'high';
  
  // Medium priority for regular tax obligations
  if (deadline.type === 'INCOME_TAX' || deadline.type === 'COMPANY_TAX') return 'medium';
  
  // Low priority for informational deadlines
  return 'low';
}