export interface DeadlineData {
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

export const AUSTRALIAN_TAX_DEADLINES_2024: DeadlineData[] = [
  // ==================== FEDERAL DEADLINES ====================
  
  // Business Activity Statement (BAS) - Quarterly
  {
    id: 'au-ato-bas-2024-q1',
    country: 'AU',
    state: 'FEDERAL',
    type: 'BAS',
    period: '2024Q1',
    name: 'Business Activity Statement Q1 2024',
    description: 'Quarterly BAS for GST registered businesses',
    authority: {
      name: 'Australian Taxation Office',
      code: 'ATO',
      website: 'https://ato.gov.au',
    },
    dates: {
      dueDate: '2024-04-28',
      periodStart: '2024-01-01',
      periodEnd: '2024-03-31',
    },
    frequency: 'quarterly',
    penalties: {
      lateFee: 110,
      interestRate: 9.51,
    },
  },
  {
    id: 'au-ato-bas-2024-q2',
    country: 'AU',
    state: 'FEDERAL',
    type: 'BAS',
    period: '2024Q2',
    name: 'Business Activity Statement Q2 2024',
    description: 'Quarterly BAS for GST registered businesses',
    authority: {
      name: 'Australian Taxation Office',
      code: 'ATO',
      website: 'https://ato.gov.au',
    },
    dates: {
      dueDate: '2024-07-28',
      periodStart: '2024-04-01',
      periodEnd: '2024-06-30',
    },
    frequency: 'quarterly',
    penalties: {
      lateFee: 110,
      interestRate: 9.51,
    },
  },
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
    id: 'au-ato-bas-2024-q4',
    country: 'AU',
    state: 'FEDERAL',
    type: 'BAS',
    period: '2024Q4',
    name: 'Business Activity Statement Q4 2024',
    description: 'Quarterly BAS for GST registered businesses',
    authority: {
      name: 'Australian Taxation Office',
      code: 'ATO',
      website: 'https://ato.gov.au',
    },
    dates: {
      dueDate: '2025-02-28',
      periodStart: '2024-10-01',
      periodEnd: '2024-12-31',
    },
    frequency: 'quarterly',
    penalties: {
      lateFee: 110,
      interestRate: 9.51,
    },
  },

  // Income Tax Returns
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
    id: 'au-ato-company-tax-2024',
    country: 'AU',
    state: 'FEDERAL',
    type: 'COMPANY_TAX',
    period: '2024',
    name: 'Company Tax Return 2024',
    description: 'Annual company income tax return',
    authority: {
      name: 'Australian Taxation Office',
      code: 'ATO',
      website: 'https://ato.gov.au',
    },
    dates: {
      dueDate: '2025-02-28',
      periodStart: '2023-07-01',
      periodEnd: '2024-06-30',
    },
    frequency: 'annual',
    penalties: {
      lateFee: 900,
      interestRate: 9.51,
    },
  },

  // Superannuation
  {
    id: 'au-ato-super-2024-q1',
    country: 'AU',
    state: 'FEDERAL',
    type: 'SUPER',
    period: '2024Q1',
    name: 'Superannuation Guarantee Q1 2024',
    description: 'Quarterly superannuation payments for employees',
    authority: {
      name: 'Australian Taxation Office',
      code: 'ATO',
      website: 'https://ato.gov.au',
    },
    dates: {
      dueDate: '2024-04-28',
      periodStart: '2024-01-01',
      periodEnd: '2024-03-31',
    },
    frequency: 'quarterly',
    penalties: {
      lateFee: 200,
      interestRate: 10.0,
    },
  },
  {
    id: 'au-ato-super-2024-q2',
    country: 'AU',
    state: 'FEDERAL',
    type: 'SUPER',
    period: '2024Q2',
    name: 'Superannuation Guarantee Q2 2024',
    description: 'Quarterly superannuation payments for employees',
    authority: {
      name: 'Australian Taxation Office',
      code: 'ATO',
      website: 'https://ato.gov.au',
    },
    dates: {
      dueDate: '2024-07-28',
      periodStart: '2024-04-01',
      periodEnd: '2024-06-30',
    },
    frequency: 'quarterly',
    penalties: {
      lateFee: 200,
      interestRate: 10.0,
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
  {
    id: 'au-ato-super-2024-q4',
    country: 'AU',
    state: 'FEDERAL',
    type: 'SUPER',
    period: '2024Q4',
    name: 'Superannuation Guarantee Q4 2024',
    description: 'Quarterly superannuation payments for employees',
    authority: {
      name: 'Australian Taxation Office',
      code: 'ATO',
      website: 'https://ato.gov.au',
    },
    dates: {
      dueDate: '2025-01-28',
      periodStart: '2024-10-01',
      periodEnd: '2024-12-31',
    },
    frequency: 'quarterly',
    penalties: {
      lateFee: 200,
      interestRate: 10.0,
    },
  },

  // PAYG Withholding - Monthly
  {
    id: 'au-ato-payg-withholding-2024-10',
    country: 'AU',
    state: 'FEDERAL',
    type: 'PAYG_WITHHOLDING',
    period: '2024M10',
    name: 'PAYG Withholding October 2024',
    description: 'Monthly PAYG withholding for large employers',
    authority: {
      name: 'Australian Taxation Office',
      code: 'ATO',
      website: 'https://ato.gov.au',
    },
    dates: {
      dueDate: '2024-11-21',
      periodStart: '2024-10-01',
      periodEnd: '2024-10-31',
    },
    frequency: 'monthly',
    threshold: {
      minTurnover: 20000000,
      description: 'Businesses with annual PAYG withholding over $1M',
    },
    penalties: {
      lateFee: 110,
      interestRate: 9.51,
    },
  },
  {
    id: 'au-ato-payg-withholding-2024-11',
    country: 'AU',
    state: 'FEDERAL',
    type: 'PAYG_WITHHOLDING',
    period: '2024M11',
    name: 'PAYG Withholding November 2024',
    description: 'Monthly PAYG withholding for large employers',
    authority: {
      name: 'Australian Taxation Office',
      code: 'ATO',
      website: 'https://ato.gov.au',
    },
    dates: {
      dueDate: '2024-12-21',
      periodStart: '2024-11-01',
      periodEnd: '2024-11-30',
    },
    frequency: 'monthly',
    threshold: {
      minTurnover: 20000000,
      description: 'Businesses with annual PAYG withholding over $1M',
    },
    penalties: {
      lateFee: 110,
      interestRate: 9.51,
    },
  },

  // Fringe Benefits Tax
  {
    id: 'au-ato-fbt-2024',
    country: 'AU',
    state: 'FEDERAL',
    type: 'FBT',
    period: '2024',
    name: 'Fringe Benefits Tax Return 2024',
    description: 'Annual FBT return for employers',
    authority: {
      name: 'Australian Taxation Office',
      code: 'ATO',
      website: 'https://ato.gov.au',
    },
    dates: {
      dueDate: '2024-05-21',
      periodStart: '2023-04-01',
      periodEnd: '2024-03-31',
    },
    frequency: 'annual',
    penalties: {
      lateFee: 222,
      interestRate: 9.51,
    },
  },

  // ==================== NSW STATE DEADLINES ====================
  
  // Payroll Tax
  {
    id: 'au-nsw-payroll-tax-2024-10',
    country: 'AU',
    state: 'NSW',
    type: 'PAYROLL_TAX',
    period: '2024M10',
    name: 'NSW Payroll Tax October 2024',
    description: 'Monthly payroll tax for businesses over threshold',
    authority: {
      name: 'Revenue NSW',
      code: 'REVENUENSW',
      website: 'https://www.revenue.nsw.gov.au',
    },
    dates: {
      dueDate: '2024-11-07',
      periodStart: '2024-10-01',
      periodEnd: '2024-10-31',
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
  {
    id: 'au-nsw-payroll-tax-2024-11',
    country: 'AU',
    state: 'NSW',
    type: 'PAYROLL_TAX',
    period: '2024M11',
    name: 'NSW Payroll Tax November 2024',
    description: 'Monthly payroll tax for businesses over threshold',
    authority: {
      name: 'Revenue NSW',
      code: 'REVENUENSW',
      website: 'https://www.revenue.nsw.gov.au',
    },
    dates: {
      dueDate: '2024-12-07',
      periodStart: '2024-11-01',
      periodEnd: '2024-11-30',
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

  // Land Tax
  {
    id: 'au-nsw-land-tax-2024',
    country: 'AU',
    state: 'NSW',
    type: 'LAND_TAX',
    period: '2024',
    name: 'NSW Land Tax 2024',
    description: 'Annual land tax for property owners',
    authority: {
      name: 'Revenue NSW',
      code: 'REVENUENSW',
      website: 'https://www.revenue.nsw.gov.au',
    },
    dates: {
      dueDate: '2024-12-31',
      periodStart: '2024-01-01',
      periodEnd: '2024-12-31',
    },
    frequency: 'annual',
    threshold: {
      minTurnover: 1075000,
      description: 'Land value over $1,075,000',
    },
    penalties: {
      lateFee: 100,
      interestRate: 8.91,
    },
  },

  // Stamp Duty
  {
    id: 'au-nsw-stamp-duty-property',
    country: 'AU',
    state: 'NSW',
    type: 'STAMP_DUTY',
    period: 'ONGOING',
    name: 'NSW Property Transfer Stamp Duty',
    description: 'Stamp duty on property transfers - due 3 months from contract exchange',
    authority: {
      name: 'Revenue NSW',
      code: 'REVENUENSW',
      website: 'https://www.revenue.nsw.gov.au',
    },
    dates: {
      dueDate: '2024-12-31',
      periodStart: '2024-01-01',
      periodEnd: '2024-12-31',
    },
    frequency: 'transaction-based',
    penalties: {
      lateFee: 100,
      interestRate: 8.91,
    },
  },

  // Vehicle Registration
  {
    id: 'au-nsw-vehicle-rego-standard',
    country: 'AU',
    state: 'NSW',
    type: 'VEHICLE_REGISTRATION',
    period: 'ONGOING',
    name: 'NSW Vehicle Registration Renewal',
    description: 'Annual vehicle registration renewal - due on registration expiry date',
    authority: {
      name: 'Transport for NSW',
      code: 'TFNSW',
      website: 'https://www.service.nsw.gov.au',
    },
    dates: {
      dueDate: '2024-12-31',
      periodStart: '2024-01-01',
      periodEnd: '2024-12-31',
    },
    frequency: 'annual',
    penalties: {
      lateFee: 200,
      interestRate: 0,
    },
  },

  // ==================== VIC STATE DEADLINES ====================
  
  // Payroll Tax
  {
    id: 'au-vic-payroll-tax-2024-10',
    country: 'AU',
    state: 'VIC',
    type: 'PAYROLL_TAX',
    period: '2024M10',
    name: 'VIC Payroll Tax October 2024',
    description: 'Monthly payroll tax for businesses over threshold',
    authority: {
      name: 'State Revenue Office Victoria',
      code: 'SRO',
      website: 'https://www.sro.vic.gov.au',
    },
    dates: {
      dueDate: '2024-11-07',
      periodStart: '2024-10-01',
      periodEnd: '2024-10-31',
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
  {
    id: 'au-vic-payroll-tax-2024-11',
    country: 'AU',
    state: 'VIC',
    type: 'PAYROLL_TAX',
    period: '2024M11',
    name: 'VIC Payroll Tax November 2024',
    description: 'Monthly payroll tax for businesses over threshold',
    authority: {
      name: 'State Revenue Office Victoria',
      code: 'SRO',
      website: 'https://www.sro.vic.gov.au',
    },
    dates: {
      dueDate: '2024-12-07',
      periodStart: '2024-11-01',
      periodEnd: '2024-11-30',
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

  // Land Tax
  {
    id: 'au-vic-land-tax-2024',
    country: 'AU',
    state: 'VIC',
    type: 'LAND_TAX',
    period: '2024',
    name: 'VIC Land Tax 2024',
    description: 'Annual land tax for property owners',
    authority: {
      name: 'State Revenue Office Victoria',
      code: 'SRO',
      website: 'https://www.sro.vic.gov.au',
    },
    dates: {
      dueDate: '2024-12-31',
      periodStart: '2024-01-01',
      periodEnd: '2024-12-31',
    },
    frequency: 'annual',
    threshold: {
      minTurnover: 300000,
      description: 'Land value over $300,000',
    },
    penalties: {
      lateFee: 90,
      interestRate: 8.91,
    },
  },

  // Stamp Duty
  {
    id: 'au-vic-stamp-duty-property',
    country: 'AU',
    state: 'VIC',
    type: 'STAMP_DUTY',
    period: 'ONGOING',
    name: 'VIC Property Transfer Stamp Duty',
    description: 'Stamp duty on property transfers - due 30 days from settlement',
    authority: {
      name: 'State Revenue Office Victoria',
      code: 'SRO',
      website: 'https://www.sro.vic.gov.au',
    },
    dates: {
      dueDate: '2024-12-31',
      periodStart: '2024-01-01',
      periodEnd: '2024-12-31',
    },
    frequency: 'transaction-based',
    penalties: {
      lateFee: 100,
      interestRate: 8.91,
    },
  },

  // Vehicle Registration
  {
    id: 'au-vic-vehicle-rego-standard',
    country: 'AU',
    state: 'VIC',
    type: 'VEHICLE_REGISTRATION',
    period: 'ONGOING',
    name: 'VIC Vehicle Registration Renewal',
    description: 'Annual vehicle registration renewal - due on registration expiry date',
    authority: {
      name: 'VicRoads',
      code: 'VICROADS',
      website: 'https://www.vicroads.vic.gov.au',
    },
    dates: {
      dueDate: '2024-12-31',
      periodStart: '2024-01-01',
      periodEnd: '2024-12-31',
    },
    frequency: 'annual',
    penalties: {
      lateFee: 177,
      interestRate: 0,
    },
  },

  // ==================== QLD STATE DEADLINES ====================
  
  // Payroll Tax
  {
    id: 'au-qld-payroll-tax-2024-10',
    country: 'AU',
    state: 'QLD',
    type: 'PAYROLL_TAX',
    period: '2024M10',
    name: 'QLD Payroll Tax October 2024',
    description: 'Monthly payroll tax for businesses over threshold',
    authority: {
      name: 'Queensland Revenue Office',
      code: 'QRO',
      website: 'https://qro.qld.gov.au',
    },
    dates: {
      dueDate: '2024-11-07',
      periodStart: '2024-10-01',
      periodEnd: '2024-10-31',
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
  {
    id: 'au-qld-payroll-tax-2024-11',
    country: 'AU',
    state: 'QLD',
    type: 'PAYROLL_TAX',
    period: '2024M11',
    name: 'QLD Payroll Tax November 2024',
    description: 'Monthly payroll tax for businesses over threshold',
    authority: {
      name: 'Queensland Revenue Office',
      code: 'QRO',
      website: 'https://qro.qld.gov.au',
    },
    dates: {
      dueDate: '2024-12-07',
      periodStart: '2024-11-01',
      periodEnd: '2024-11-30',
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

  // Land Tax
  {
    id: 'au-qld-land-tax-2024',
    country: 'AU',
    state: 'QLD',
    type: 'LAND_TAX',
    period: '2024',
    name: 'QLD Land Tax 2024',
    description: 'Annual land tax for property owners',
    authority: {
      name: 'Queensland Revenue Office',
      code: 'QRO',
      website: 'https://qro.qld.gov.au',
    },
    dates: {
      dueDate: '2024-10-31',
      periodStart: '2024-07-01',
      periodEnd: '2025-06-30',
    },
    frequency: 'annual',
    threshold: {
      minTurnover: 600000,
      description: 'Land value over $600,000',
    },
    penalties: {
      lateFee: 75,
      interestRate: 8.91,
    },
  },

  // Stamp Duty
  {
    id: 'au-qld-stamp-duty-property',
    country: 'AU',
    state: 'QLD',
    type: 'STAMP_DUTY',
    period: 'ONGOING',
    name: 'QLD Property Transfer Stamp Duty',
    description: 'Stamp duty on property transfers - due 30 days from assessment',
    authority: {
      name: 'Queensland Revenue Office',
      code: 'QRO',
      website: 'https://qro.qld.gov.au',
    },
    dates: {
      dueDate: '2024-12-31',
      periodStart: '2024-01-01',
      periodEnd: '2024-12-31',
    },
    frequency: 'transaction-based',
    penalties: {
      lateFee: 100,
      interestRate: 8.91,
    },
  },

  // Vehicle Registration
  {
    id: 'au-qld-vehicle-rego-standard',
    country: 'AU',
    state: 'QLD',
    type: 'VEHICLE_REGISTRATION',
    period: 'ONGOING',
    name: 'QLD Vehicle Registration Renewal',
    description: 'Annual vehicle registration renewal - due on registration expiry date',
    authority: {
      name: 'Department of Transport and Main Roads',
      code: 'TMR',
      website: 'https://www.qld.gov.au/transport',
    },
    dates: {
      dueDate: '2024-12-31',
      periodStart: '2024-01-01',
      periodEnd: '2024-12-31',
    },
    frequency: 'annual',
    penalties: {
      lateFee: 150,
      interestRate: 0,
    },
  },

  // ==================== SA STATE DEADLINES ====================
  
  // Payroll Tax
  {
    id: 'au-sa-payroll-tax-2024-10',
    country: 'AU',
    state: 'SA',
    type: 'PAYROLL_TAX',
    period: '2024M10',
    name: 'SA Payroll Tax October 2024',
    description: 'Monthly payroll tax for businesses over threshold',
    authority: {
      name: 'RevenueSA',
      code: 'REVENUESA',
      website: 'https://www.revenuesa.sa.gov.au',
    },
    dates: {
      dueDate: '2024-11-07',
      periodStart: '2024-10-01',
      periodEnd: '2024-10-31',
    },
    frequency: 'monthly',
    threshold: {
      minTurnover: 1500000,
      description: 'Annual wages over $1.5M',
    },
    penalties: {
      lateFee: 120,
      interestRate: 8.91,
    },
  },
  {
    id: 'au-sa-payroll-tax-2024-11',
    country: 'AU',
    state: 'SA',
    type: 'PAYROLL_TAX',
    period: '2024M11',
    name: 'SA Payroll Tax November 2024',
    description: 'Monthly payroll tax for businesses over threshold',
    authority: {
      name: 'RevenueSA',
      code: 'REVENUESA',
      website: 'https://www.revenuesa.sa.gov.au',
    },
    dates: {
      dueDate: '2024-12-07',
      periodStart: '2024-11-01',
      periodEnd: '2024-11-30',
    },
    frequency: 'monthly',
    threshold: {
      minTurnover: 1500000,
      description: 'Annual wages over $1.5M',
    },
    penalties: {
      lateFee: 120,
      interestRate: 8.91,
    },
  },

  // Land Tax
  {
    id: 'au-sa-land-tax-2024',
    country: 'AU',
    state: 'SA',
    type: 'LAND_TAX',
    period: '2024',
    name: 'SA Land Tax 2024',
    description: 'Annual land tax for property owners',
    authority: {
      name: 'RevenueSA',
      code: 'REVENUESA',
      website: 'https://www.revenuesa.sa.gov.au',
    },
    dates: {
      dueDate: '2024-12-15',
      periodStart: '2024-07-01',
      periodEnd: '2025-06-30',
    },
    frequency: 'annual',
    threshold: {
      minTurnover: 668000,
      description: 'Land value over $668,000',
    },
    penalties: {
      lateFee: 80,
      interestRate: 8.91,
    },
  },

  // Stamp Duty
  {
    id: 'au-sa-stamp-duty-property',
    country: 'AU',
    state: 'SA',
    type: 'STAMP_DUTY',
    period: 'ONGOING',
    name: 'SA Property Transfer Stamp Duty',
    description: 'Stamp duty on property transfers - due 2 months from settlement',
    authority: {
      name: 'RevenueSA',
      code: 'REVENUESA',
      website: 'https://www.revenuesa.sa.gov.au',
    },
    dates: {
      dueDate: '2024-12-31',
      periodStart: '2024-01-01',
      periodEnd: '2024-12-31',
    },
    frequency: 'transaction-based',
    penalties: {
      lateFee: 100,
      interestRate: 8.91,
    },
  },

  // Vehicle Registration
  {
    id: 'au-sa-vehicle-rego-standard',
    country: 'AU',
    state: 'SA',
    type: 'VEHICLE_REGISTRATION',
    period: 'ONGOING',
    name: 'SA Vehicle Registration Renewal',
    description: 'Annual vehicle registration renewal - due on registration expiry date',
    authority: {
      name: 'Department for Infrastructure and Transport',
      code: 'DIT',
      website: 'https://www.sa.gov.au',
    },
    dates: {
      dueDate: '2024-12-31',
      periodStart: '2024-01-01',
      periodEnd: '2024-12-31',
    },
    frequency: 'annual',
    penalties: {
      lateFee: 160,
      interestRate: 0,
    },
  },

  // ==================== WA STATE DEADLINES ====================
  
  // Payroll Tax
  {
    id: 'au-wa-payroll-tax-2024-10',
    country: 'AU',
    state: 'WA',
    type: 'PAYROLL_TAX',
    period: '2024M10',
    name: 'WA Payroll Tax October 2024',
    description: 'Monthly payroll tax for businesses over threshold',
    authority: {
      name: 'RevenueWA',
      code: 'REVENUEWA',
      website: 'https://www.wa.gov.au/organisation/department-of-finance/revenuewa',
    },
    dates: {
      dueDate: '2024-11-07',
      periodStart: '2024-10-01',
      periodEnd: '2024-10-31',
    },
    frequency: 'monthly',
    threshold: {
      minTurnover: 1000000,
      description: 'Annual wages over $1M',
    },
    penalties: {
      lateFee: 125,
      interestRate: 8.91,
    },
  },
  {
    id: 'au-wa-payroll-tax-2024-11',
    country: 'AU',
    state: 'WA',
    type: 'PAYROLL_TAX',
    period: '2024M11',
    name: 'WA Payroll Tax November 2024',
    description: 'Monthly payroll tax for businesses over threshold',
    authority: {
      name: 'RevenueWA',
      code: 'REVENUEWA',
      website: 'https://www.wa.gov.au/organisation/department-of-finance/revenuewa',
    },
    dates: {
      dueDate: '2024-12-07',
      periodStart: '2024-11-01',
      periodEnd: '2024-11-30',
    },
    frequency: 'monthly',
    threshold: {
      minTurnover: 1000000,
      description: 'Annual wages over $1M',
    },
    penalties: {
      lateFee: 125,
      interestRate: 8.91,
    },
  },

  // Land Tax
  {
    id: 'au-wa-land-tax-2024',
    country: 'AU',
    state: 'WA',
    type: 'LAND_TAX',
    period: '2024',
    name: 'WA Land Tax 2024',
    description: 'Annual land tax for property owners',
    authority: {
      name: 'RevenueWA',
      code: 'REVENUEWA',
      website: 'https://www.wa.gov.au/organisation/department-of-finance/revenuewa',
    },
    dates: {
      dueDate: '2024-12-31',
      periodStart: '2024-07-01',
      periodEnd: '2025-06-30',
    },
    frequency: 'annual',
    threshold: {
      minTurnover: 300000,
      description: 'Land value over $300,000',
    },
    penalties: {
      lateFee: 70,
      interestRate: 8.91,
    },
  },

  // Stamp Duty
  {
    id: 'au-wa-stamp-duty-property',
    country: 'AU',
    state: 'WA',
    type: 'STAMP_DUTY',
    period: 'ONGOING',
    name: 'WA Property Transfer Stamp Duty',
    description: 'Stamp duty on property transfers - due 2 months from assessment',
    authority: {
      name: 'RevenueWA',
      code: 'REVENUEWA',
      website: 'https://www.wa.gov.au/organisation/department-of-finance/revenuewa',
    },
    dates: {
      dueDate: '2024-12-31',
      periodStart: '2024-01-01',
      periodEnd: '2024-12-31',
    },
    frequency: 'transaction-based',
    penalties: {
      lateFee: 100,
      interestRate: 8.91,
    },
  },

  // Vehicle Registration
  {
    id: 'au-wa-vehicle-rego-standard',
    country: 'AU',
    state: 'WA',
    type: 'VEHICLE_REGISTRATION',
    period: 'ONGOING',
    name: 'WA Vehicle Registration Renewal',
    description: 'Annual vehicle registration renewal - due on registration expiry date',
    authority: {
      name: 'Department of Transport',
      code: 'DOT',
      website: 'https://www.transport.wa.gov.au',
    },
    dates: {
      dueDate: '2024-12-31',
      periodStart: '2024-01-01',
      periodEnd: '2024-12-31',
    },
    frequency: 'annual',
    penalties: {
      lateFee: 100,
      interestRate: 0,
    },
  },

  // ==================== TAS STATE DEADLINES ====================
  
  // Payroll Tax
  {
    id: 'au-tas-payroll-tax-2024-10',
    country: 'AU',
    state: 'TAS',
    type: 'PAYROLL_TAX',
    period: '2024M10',
    name: 'TAS Payroll Tax October 2024',
    description: 'Monthly payroll tax for businesses over threshold',
    authority: {
      name: 'State Revenue Office Tasmania',
      code: 'SRO-TAS',
      website: 'https://www.sro.tas.gov.au',
    },
    dates: {
      dueDate: '2024-11-21',
      periodStart: '2024-10-01',
      periodEnd: '2024-10-31',
    },
    frequency: 'monthly',
    threshold: {
      minTurnover: 2000000,
      description: 'Annual wages over $2M',
    },
    penalties: {
      lateFee: 100,
      interestRate: 8.91,
    },
  },
  {
    id: 'au-tas-payroll-tax-2024-11',
    country: 'AU',
    state: 'TAS',
    type: 'PAYROLL_TAX',
    period: '2024M11',
    name: 'TAS Payroll Tax November 2024',
    description: 'Monthly payroll tax for businesses over threshold',
    authority: {
      name: 'State Revenue Office Tasmania',
      code: 'SRO-TAS',
      website: 'https://www.sro.tas.gov.au',
    },
    dates: {
      dueDate: '2024-12-21',
      periodStart: '2024-11-01',
      periodEnd: '2024-11-30',
    },
    frequency: 'monthly',
    threshold: {
      minTurnover: 2000000,
      description: 'Annual wages over $2M',
    },
    penalties: {
      lateFee: 100,
      interestRate: 8.91,
    },
  },

  // Land Tax
  {
    id: 'au-tas-land-tax-2024',
    country: 'AU',
    state: 'TAS',
    type: 'LAND_TAX',
    period: '2024',
    name: 'TAS Land Tax 2024',
    description: 'Annual land tax for property owners',
    authority: {
      name: 'State Revenue Office Tasmania',
      code: 'SRO-TAS',
      website: 'https://www.sro.tas.gov.au',
    },
    dates: {
      dueDate: '2024-10-31',
      periodStart: '2024-07-01',
      periodEnd: '2025-06-30',
    },
    frequency: 'annual',
    threshold: {
      minTurnover: 50000,
      description: 'Land value over $50,000',
    },
    penalties: {
      lateFee: 50,
      interestRate: 8.91,
    },
  },

  // Stamp Duty
  {
    id: 'au-tas-stamp-duty-property',
    country: 'AU',
    state: 'TAS',
    type: 'STAMP_DUTY',
    period: 'ONGOING',
    name: 'TAS Property Transfer Stamp Duty',
    description: 'Stamp duty on property transfers - due 3 months from contract',
    authority: {
      name: 'State Revenue Office Tasmania',
      code: 'SRO-TAS',
      website: 'https://www.sro.tas.gov.au',
    },
    dates: {
      dueDate: '2024-12-31',
      periodStart: '2024-01-01',
      periodEnd: '2024-12-31',
    },
    frequency: 'transaction-based',
    penalties: {
      lateFee: 100,
      interestRate: 8.91,
    },
  },

  // Vehicle Registration
  {
    id: 'au-tas-vehicle-rego-standard',
    country: 'AU',
    state: 'TAS',
    type: 'VEHICLE_REGISTRATION',
    period: 'ONGOING',
    name: 'TAS Vehicle Registration Renewal',
    description: 'Annual vehicle registration renewal - due on registration expiry date',
    authority: {
      name: 'Transport Tasmania',
      code: 'TRANSPORT-TAS',
      website: 'https://www.transport.tas.gov.au',
    },
    dates: {
      dueDate: '2024-12-31',
      periodStart: '2024-01-01',
      periodEnd: '2024-12-31',
    },
    frequency: 'annual',
    penalties: {
      lateFee: 140,
      interestRate: 0,
    },
  },

  // ==================== NT TERRITORY DEADLINES ====================
  
  // Payroll Tax
  {
    id: 'au-nt-payroll-tax-2024-10',
    country: 'AU',
    state: 'NT',
    type: 'PAYROLL_TAX',
    period: '2024M10',
    name: 'NT Payroll Tax October 2024',
    description: 'Monthly payroll tax for businesses over threshold',
    authority: {
      name: 'Territory Revenue Office',
      code: 'TRO',
      website: 'https://nt.gov.au/tax-royalties',
    },
    dates: {
      dueDate: '2024-11-07',
      periodStart: '2024-10-01',
      periodEnd: '2024-10-31',
    },
    frequency: 'monthly',
    threshold: {
      minTurnover: 2000000,
      description: 'Annual wages over $2M',
    },
    penalties: {
      lateFee: 90,
      interestRate: 8.91,
    },
  },
  {
    id: 'au-nt-payroll-tax-2024-11',
    country: 'AU',
    state: 'NT',
    type: 'PAYROLL_TAX',
    period: '2024M11',
    name: 'NT Payroll Tax November 2024',
    description: 'Monthly payroll tax for businesses over threshold',
    authority: {
      name: 'Territory Revenue Office',
      code: 'TRO',
      website: 'https://nt.gov.au/tax-royalties',
    },
    dates: {
      dueDate: '2024-12-07',
      periodStart: '2024-11-01',
      periodEnd: '2024-11-30',
    },
    frequency: 'monthly',
    threshold: {
      minTurnover: 2000000,
      description: 'Annual wages over $2M',
    },
    penalties: {
      lateFee: 90,
      interestRate: 8.91,
    },
  },

  // Stamp Duty
  {
    id: 'au-nt-stamp-duty-property',
    country: 'AU',
    state: 'NT',
    type: 'STAMP_DUTY',
    period: 'ONGOING',
    name: 'NT Property Transfer Stamp Duty',
    description: 'Stamp duty on property transfers - due 60 days from execution',
    authority: {
      name: 'Territory Revenue Office',
      code: 'TRO',
      website: 'https://nt.gov.au/tax-royalties',
    },
    dates: {
      dueDate: '2024-12-31',
      periodStart: '2024-01-01',
      periodEnd: '2024-12-31',
    },
    frequency: 'transaction-based',
    penalties: {
      lateFee: 100,
      interestRate: 8.91,
    },
  },

  // Vehicle Registration
  {
    id: 'au-nt-vehicle-rego-standard',
    country: 'AU',
    state: 'NT',
    type: 'VEHICLE_REGISTRATION',
    period: 'ONGOING',
    name: 'NT Vehicle Registration Renewal',
    description: 'Annual vehicle registration renewal - due on registration expiry date',
    authority: {
      name: 'Motor Vehicle Registry',
      code: 'MVR',
      website: 'https://nt.gov.au/driving',
    },
    dates: {
      dueDate: '2024-12-31',
      periodStart: '2024-01-01',
      periodEnd: '2024-12-31',
    },
    frequency: 'annual',
    penalties: {
      lateFee: 100,
      interestRate: 0,
    },
  },

  // ==================== ACT TERRITORY DEADLINES ====================
  
  // Payroll Tax
  {
    id: 'au-act-payroll-tax-2024-10',
    country: 'AU',
    state: 'ACT',
    type: 'PAYROLL_TAX',
    period: '2024M10',
    name: 'ACT Payroll Tax October 2024',
    description: 'Monthly payroll tax for businesses over threshold',
    authority: {
      name: 'ACT Revenue Office',
      code: 'ACTRO',
      website: 'https://www.revenue.act.gov.au',
    },
    dates: {
      dueDate: '2024-11-07',
      periodStart: '2024-10-01',
      periodEnd: '2024-10-31',
    },
    frequency: 'monthly',
    threshold: {
      minTurnover: 2000000,
      description: 'Annual wages over $2M',
    },
    penalties: {
      lateFee: 110,
      interestRate: 8.91,
    },
  },
  {
    id: 'au-act-payroll-tax-2024-11',
    country: 'AU',
    state: 'ACT',
    type: 'PAYROLL_TAX',
    period: '2024M11',
    name: 'ACT Payroll Tax November 2024',
    description: 'Monthly payroll tax for businesses over threshold',
    authority: {
      name: 'ACT Revenue Office',
      code: 'ACTRO',
      website: 'https://www.revenue.act.gov.au',
    },
    dates: {
      dueDate: '2024-12-07',
      periodStart: '2024-11-01',
      periodEnd: '2024-11-30',
    },
    frequency: 'monthly',
    threshold: {
      minTurnover: 2000000,
      description: 'Annual wages over $2M',
    },
    penalties: {
      lateFee: 110,
      interestRate: 8.91,
    },
  },

  // Land Tax (Rates)
  {
    id: 'au-act-land-rates-2024',
    country: 'AU',
    state: 'ACT',
    type: 'LAND_TAX',
    period: '2024',
    name: 'ACT General Rates 2024',
    description: 'Annual general rates for property owners',
    authority: {
      name: 'ACT Revenue Office',
      code: 'ACTRO',
      website: 'https://www.revenue.act.gov.au',
    },
    dates: {
      dueDate: '2024-09-30',
      periodStart: '2024-07-01',
      periodEnd: '2025-06-30',
    },
    frequency: 'annual',
    penalties: {
      lateFee: 50,
      interestRate: 8.91,
    },
  },

  // Stamp Duty
  {
    id: 'au-act-stamp-duty-property',
    country: 'AU',
    state: 'ACT',
    type: 'STAMP_DUTY',
    period: 'ONGOING',
    name: 'ACT Property Transfer Stamp Duty',
    description: 'Stamp duty on property transfers - due 90 days from exchange',
    authority: {
      name: 'ACT Revenue Office',
      code: 'ACTRO',
      website: 'https://www.revenue.act.gov.au',
    },
    dates: {
      dueDate: '2024-12-31',
      periodStart: '2024-01-01',
      periodEnd: '2024-12-31',
    },
    frequency: 'transaction-based',
    penalties: {
      lateFee: 100,
      interestRate: 8.91,
    },
  },

  // Vehicle Registration
  {
    id: 'au-act-vehicle-rego-standard',
    country: 'AU',
    state: 'ACT',
    type: 'VEHICLE_REGISTRATION',
    period: 'ONGOING',
    name: 'ACT Vehicle Registration Renewal',
    description: 'Annual vehicle registration renewal - due on registration expiry date',
    authority: {
      name: 'Access Canberra',
      code: 'ACCESS-CBR',
      website: 'https://www.accesscanberra.act.gov.au',
    },
    dates: {
      dueDate: '2024-12-31',
      periodStart: '2024-01-01',
      periodEnd: '2024-12-31',
    },
    frequency: 'annual',
    penalties: {
      lateFee: 120,
      interestRate: 0,
    },
  },
];

// Helper function to generate 2025 deadlines
export function generateDeadlinesForYear(year: number): DeadlineData[] {
  return AUSTRALIAN_TAX_DEADLINES_2024
    .filter(deadline => {
      // Skip ongoing/transaction-based items for future years
      return deadline.period !== 'ONGOING';
    })
    .map(deadline => {
      const newDeadline = { ...deadline };
      
      // Update IDs and periods
      newDeadline.id = newDeadline.id.replace('2024', year.toString());
      newDeadline.period = newDeadline.period.replace('2024', year.toString());
      newDeadline.name = newDeadline.name.replace('2024', year.toString());
      
      // Update dates
      if (deadline.dates.dueDate.includes('2024')) {
        newDeadline.dates = {
          dueDate: deadline.dates.dueDate.replace('2024', year.toString()),
          periodStart: deadline.dates.periodStart.replace('2024', year.toString()).replace('2023', (year - 1).toString()),
          periodEnd: deadline.dates.periodEnd.replace('2024', year.toString()).replace('2025', (year + 1).toString()),
        };
      } else if (deadline.dates.dueDate.includes('2025')) {
        newDeadline.dates = {
          dueDate: deadline.dates.dueDate.replace('2025', (year + 1).toString()),
          periodStart: deadline.dates.periodStart.replace('2024', year.toString()),
          periodEnd: deadline.dates.periodEnd.replace('2024', year.toString()),
        };
      }
      
      return newDeadline;
    });
}

// Export combined data for 2024 and 2025
export const ALL_AUSTRALIAN_TAX_DEADLINES = [
  ...AUSTRALIAN_TAX_DEADLINES_2024,
  ...generateDeadlinesForYear(2025),
];