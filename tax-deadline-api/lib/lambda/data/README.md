# Australian Tax Deadlines - Comprehensive Data

This directory contains the comprehensive Australian tax deadline data for the Tax Deadline API.

## Data Coverage

### Federal Deadlines
- **Business Activity Statement (BAS)** - Quarterly deadlines for GST registered businesses
- **Income Tax Returns** - Annual deadlines for individuals and companies
- **Superannuation Guarantee** - Quarterly employer contribution deadlines
- **PAYG Withholding** - Monthly deadlines for large employers
- **Fringe Benefits Tax (FBT)** - Annual FBT return deadlines

### State/Territory Deadlines

All states and territories (NSW, VIC, QLD, SA, WA, TAS, NT, ACT) include:

1. **Payroll Tax** - Monthly deadlines with state-specific thresholds
2. **Land Tax** - Annual property tax deadlines (varies by state)
3. **Stamp Duty** - Property transfer stamp duty (transaction-based)
4. **Vehicle Registration** - Annual vehicle registration renewal deadlines

## Data Structure

Each deadline entry contains:

```typescript
{
  id: string;              // Unique identifier
  country: string;         // Country code (AU)
  state: string;           // State/Territory code or FEDERAL
  type: string;            // Tax type (BAS, PAYROLL_TAX, etc.)
  period: string;          // Period identifier (2024Q3, 2024M10, etc.)
  name: string;            // Human-readable name
  description: string;     // Detailed description
  authority: {             // Responsible authority details
    name: string;
    code: string;
    website: string;
  };
  dates: {                 // Important dates
    dueDate: string;       // Payment/submission due date (YYYY-MM-DD)
    periodStart: string;   // Period start date
    periodEnd: string;     // Period end date
  };
  frequency: string;       // annual, quarterly, monthly, transaction-based
  penalties?: {            // Late payment penalties
    lateFee: number;       // Fixed late fee in AUD
    interestRate: number;  // Annual interest rate percentage
  };
  threshold?: {            // Applicability thresholds
    minTurnover?: number;  // Minimum turnover/wages
    maxTurnover?: number;  // Maximum turnover/wages
    description: string;   // Threshold description
  };
}
```

## State-Specific Details

### Payroll Tax Thresholds (Annual Wages)
- **NSW**: $1.2M
- **VIC**: $700K
- **QLD**: $1.3M
- **SA**: $1.5M
- **WA**: $1M
- **TAS**: $2M
- **NT**: $2M
- **ACT**: $2M

### Land Tax Thresholds (Land Value)
- **NSW**: $1,075,000
- **VIC**: $300,000
- **QLD**: $600,000
- **SA**: $668,000
- **WA**: $300,000
- **TAS**: $50,000
- **NT**: No land tax
- **ACT**: General rates apply to all properties

### Stamp Duty Payment Periods
- **NSW**: 3 months from contract exchange
- **VIC**: 30 days from settlement
- **QLD**: 30 days from assessment
- **SA**: 2 months from settlement
- **WA**: 2 months from assessment
- **TAS**: 3 months from contract
- **NT**: 60 days from execution
- **ACT**: 90 days from exchange

## Usage

### Import the Data
```typescript
import { ALL_AUSTRALIAN_TAX_DEADLINES } from './au-tax-deadlines-comprehensive';
```

### Generate Future Years
```typescript
import { generateDeadlinesForYear } from './au-tax-deadlines-comprehensive';

const deadlines2026 = generateDeadlinesForYear(2026);
```

### Seed to DynamoDB
```bash
npx ts-node scripts/seed-comprehensive-data.ts
```

### Validate Data
```bash
npx ts-node scripts/validate-data.ts
```

## Data Maintenance

When updating the data:

1. Update the base data in `au-tax-deadlines-comprehensive.ts`
2. Run validation: `npx ts-node scripts/validate-data.ts`
3. Test the data generation for future years
4. Re-seed the database: `npx ts-node scripts/seed-comprehensive-data.ts`

## Notes

- All dates are in YYYY-MM-DD format
- All monetary values are in AUD
- Interest rates are annual percentages
- Vehicle registration and stamp duty deadlines use placeholder dates as they are transaction-based
- The data includes both 2024 and 2025 deadlines by default