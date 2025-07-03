import { ALL_AUSTRALIAN_TAX_DEADLINES } from '../lib/lambda/data/au-tax-deadlines-comprehensive';

function validateData() {
  console.log('🔍 Validating Australian Tax Deadline Data...\n');
  
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Check for duplicate IDs
  const idSet = new Set<string>();
  const duplicateIds: string[] = [];
  
  ALL_AUSTRALIAN_TAX_DEADLINES.forEach(deadline => {
    if (idSet.has(deadline.id)) {
      duplicateIds.push(deadline.id);
    }
    idSet.add(deadline.id);
  });
  
  if (duplicateIds.length > 0) {
    errors.push(`Found ${duplicateIds.length} duplicate IDs: ${duplicateIds.join(', ')}`);
  }
  
  // Validate each deadline
  ALL_AUSTRALIAN_TAX_DEADLINES.forEach((deadline, index) => {
    // Check required fields
    if (!deadline.id) errors.push(`Deadline at index ${index} missing ID`);
    if (!deadline.country) errors.push(`Deadline ${deadline.id} missing country`);
    if (!deadline.state) errors.push(`Deadline ${deadline.id} missing state`);
    if (!deadline.type) errors.push(`Deadline ${deadline.id} missing type`);
    if (!deadline.period) errors.push(`Deadline ${deadline.id} missing period`);
    if (!deadline.name) errors.push(`Deadline ${deadline.id} missing name`);
    if (!deadline.description) errors.push(`Deadline ${deadline.id} missing description`);
    
    // Check authority
    if (!deadline.authority) {
      errors.push(`Deadline ${deadline.id} missing authority`);
    } else {
      if (!deadline.authority.name) errors.push(`Deadline ${deadline.id} missing authority.name`);
      if (!deadline.authority.code) errors.push(`Deadline ${deadline.id} missing authority.code`);
      if (!deadline.authority.website) errors.push(`Deadline ${deadline.id} missing authority.website`);
    }
    
    // Check dates
    if (!deadline.dates) {
      errors.push(`Deadline ${deadline.id} missing dates`);
    } else {
      if (!deadline.dates.dueDate) errors.push(`Deadline ${deadline.id} missing dates.dueDate`);
      if (!deadline.dates.periodStart) errors.push(`Deadline ${deadline.id} missing dates.periodStart`);
      if (!deadline.dates.periodEnd) errors.push(`Deadline ${deadline.id} missing dates.periodEnd`);
      
      // Validate date formats
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (deadline.dates.dueDate && !dateRegex.test(deadline.dates.dueDate)) {
        errors.push(`Deadline ${deadline.id} has invalid dueDate format: ${deadline.dates.dueDate}`);
      }
      if (deadline.dates.periodStart && !dateRegex.test(deadline.dates.periodStart)) {
        errors.push(`Deadline ${deadline.id} has invalid periodStart format: ${deadline.dates.periodStart}`);
      }
      if (deadline.dates.periodEnd && !dateRegex.test(deadline.dates.periodEnd)) {
        errors.push(`Deadline ${deadline.id} has invalid periodEnd format: ${deadline.dates.periodEnd}`);
      }
      
      // Check date logic
      if (deadline.dates.periodStart && deadline.dates.periodEnd) {
        const start = new Date(deadline.dates.periodStart);
        const end = new Date(deadline.dates.periodEnd);
        if (start > end) {
          warnings.push(`Deadline ${deadline.id} has periodStart after periodEnd`);
        }
      }
    }
    
    // Check frequency
    if (!deadline.frequency) {
      errors.push(`Deadline ${deadline.id} missing frequency`);
    } else {
      const validFrequencies = ['annual', 'quarterly', 'monthly', 'transaction-based'];
      if (!validFrequencies.includes(deadline.frequency)) {
        warnings.push(`Deadline ${deadline.id} has unusual frequency: ${deadline.frequency}`);
      }
    }
    
    // Check penalties (optional but should have correct structure if present)
    if (deadline.penalties) {
      if (typeof deadline.penalties.lateFee !== 'number') {
        warnings.push(`Deadline ${deadline.id} has non-numeric lateFee`);
      }
      if (typeof deadline.penalties.interestRate !== 'number') {
        warnings.push(`Deadline ${deadline.id} has non-numeric interestRate`);
      }
    }
    
    // Check threshold (optional but should have correct structure if present)
    if (deadline.threshold) {
      if (!deadline.threshold.description) {
        warnings.push(`Deadline ${deadline.id} has threshold without description`);
      }
    }
  });
  
  // Print summary
  console.log('📊 Data Summary:');
  console.log(`   Total deadlines: ${ALL_AUSTRALIAN_TAX_DEADLINES.length}`);
  console.log(`   Unique IDs: ${idSet.size}`);
  console.log('');
  
  // Group by type
  const typeGroups: Record<string, number> = {};
  ALL_AUSTRALIAN_TAX_DEADLINES.forEach(d => {
    typeGroups[d.type] = (typeGroups[d.type] || 0) + 1;
  });
  
  console.log('📈 Deadline Types:');
  Object.entries(typeGroups).sort((a, b) => b[1] - a[1]).forEach(([type, count]) => {
    console.log(`   ${type}: ${count}`);
  });
  console.log('');
  
  // Group by state
  const stateGroups: Record<string, number> = {};
  ALL_AUSTRALIAN_TAX_DEADLINES.forEach(d => {
    stateGroups[d.state] = (stateGroups[d.state] || 0) + 1;
  });
  
  console.log('📍 States/Territories:');
  Object.entries(stateGroups).sort((a, b) => a[0].localeCompare(b[0])).forEach(([state, count]) => {
    console.log(`   ${state}: ${count}`);
  });
  console.log('');
  
  // Group by year
  const yearGroups: Record<string, number> = {};
  ALL_AUSTRALIAN_TAX_DEADLINES.forEach(d => {
    const year = d.dates.dueDate.substring(0, 4);
    yearGroups[year] = (yearGroups[year] || 0) + 1;
  });
  
  console.log('📅 Years:');
  Object.entries(yearGroups).sort((a, b) => a[0].localeCompare(b[0])).forEach(([year, count]) => {
    console.log(`   ${year}: ${count}`);
  });
  console.log('');
  
  // Print validation results
  if (errors.length === 0 && warnings.length === 0) {
    console.log('✅ All validations passed!');
  } else {
    if (errors.length > 0) {
      console.log(`❌ Found ${errors.length} errors:`);
      errors.slice(0, 10).forEach(error => console.log(`   - ${error}`));
      if (errors.length > 10) {
        console.log(`   ... and ${errors.length - 10} more errors`);
      }
      console.log('');
    }
    
    if (warnings.length > 0) {
      console.log(`⚠️  Found ${warnings.length} warnings:`);
      warnings.slice(0, 10).forEach(warning => console.log(`   - ${warning}`));
      if (warnings.length > 10) {
        console.log(`   ... and ${warnings.length - 10} more warnings`);
      }
    }
  }
  
  return errors.length === 0;
}

// Run validation
const isValid = validateData();
process.exit(isValid ? 0 : 1);