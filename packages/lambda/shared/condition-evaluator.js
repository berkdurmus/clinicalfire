// Condition evaluator for healthcare workflows
// Ported from packages/core/src/engine/condition.evaluator.ts

class ConditionEvaluator {
  constructor() {
    this.operators = {
      eq: this.evaluateEquals.bind(this),
      ne: this.evaluateNotEquals.bind(this),
      gt: this.evaluateGreaterThan.bind(this),
      gte: this.evaluateGreaterThanOrEqual.bind(this),
      lt: this.evaluateLessThan.bind(this),
      lte: this.evaluateLessThanOrEqual.bind(this),
      in: this.evaluateIn.bind(this),
      nin: this.evaluateNotIn.bind(this),
      contains: this.evaluateContains.bind(this),
      startswith: this.evaluateStartsWith.bind(this),
      endswith: this.evaluateEndsWith.bind(this),
      regex: this.evaluateRegex.bind(this),
      between: this.evaluateBetween.bind(this),
      exists: this.evaluateExists.bind(this),
      type: this.evaluateType.bind(this),
      length: this.evaluateLength.bind(this),
      age: this.evaluateAge.bind(this),
      timerange: this.evaluateTimeRange.bind(this),
      critical_value: this.evaluateCriticalValue.bind(this),
    };
  }

  /**
   * Evaluates a set of conditions with logical operators
   */
  async evaluateConditions(conditions, data, logicalOperator = 'AND') {
    if (!conditions || conditions.length === 0) {
      return true;
    }

    const results = [];

    for (const condition of conditions) {
      try {
        // Handle nested condition groups
        if (condition.conditions) {
          const nestedResult = await this.evaluateConditions(
            condition.conditions,
            data,
            condition.operator || 'AND'
          );
          results.push(nestedResult);
        } else {
          // Evaluate single condition
          const result = await this.evaluateCondition(condition, data);
          results.push(result);
        }
      } catch (error) {
        console.error('Condition evaluation error:', error);
        results.push(false);
      }
    }

    // Apply logical operator
    return this.applyLogicalOperator(results, logicalOperator);
  }

  /**
   * Evaluates a single condition
   */
  async evaluateCondition(condition, data) {
    const { field, operator, value, metadata = {} } = condition;

    if (!field || !operator) {
      throw new Error('Condition must have field and operator');
    }

    // Get field value from data using dot notation
    const fieldValue = this.getFieldValue(data, field);

    // Get operator function
    const operatorFunc = this.operators[operator];
    if (!operatorFunc) {
      throw new Error(`Unknown operator: ${operator}`);
    }

    // Evaluate condition
    const result = await operatorFunc(fieldValue, value, metadata);

    console.log(`Condition evaluation:`, {
      field,
      operator,
      fieldValue,
      expectedValue: value,
      result,
      metadata,
    });

    return result;
  }

  /**
   * Gets field value using dot notation (e.g., "patient.vitals.temperature")
   */
  getFieldValue(data, fieldPath) {
    if (!fieldPath) return undefined;

    const keys = fieldPath.split('.');
    let value = data;

    for (const key of keys) {
      if (value === null || value === undefined) {
        return undefined;
      }

      // Handle array indices
      if (key.includes('[') && key.includes(']')) {
        const [arrayKey, indexStr] = key.split('[');
        const index = parseInt(indexStr.replace(']', ''));
        value = value[arrayKey];
        if (Array.isArray(value) && index >= 0 && index < value.length) {
          value = value[index];
        } else {
          return undefined;
        }
      } else {
        value = value[key];
      }
    }

    return value;
  }

  /**
   * Applies logical operator to array of boolean results
   */
  applyLogicalOperator(results, operator) {
    switch (operator.toUpperCase()) {
      case 'AND':
        return results.every((result) => result === true);
      case 'OR':
        return results.some((result) => result === true);
      case 'NOT':
        return results.every((result) => result === false);
      case 'XOR':
        return results.filter((result) => result === true).length === 1;
      default:
        return results.every((result) => result === true);
    }
  }

  // Operator implementations
  evaluateEquals(fieldValue, expectedValue) {
    if (typeof fieldValue === 'number' && typeof expectedValue === 'number') {
      return Math.abs(fieldValue - expectedValue) < 0.00001; // Handle floating point
    }
    return fieldValue === expectedValue;
  }

  evaluateNotEquals(fieldValue, expectedValue) {
    return !this.evaluateEquals(fieldValue, expectedValue);
  }

  evaluateGreaterThan(fieldValue, expectedValue) {
    return this.toNumber(fieldValue) > this.toNumber(expectedValue);
  }

  evaluateGreaterThanOrEqual(fieldValue, expectedValue) {
    return this.toNumber(fieldValue) >= this.toNumber(expectedValue);
  }

  evaluateLessThan(fieldValue, expectedValue) {
    return this.toNumber(fieldValue) < this.toNumber(expectedValue);
  }

  evaluateLessThanOrEqual(fieldValue, expectedValue) {
    return this.toNumber(fieldValue) <= this.toNumber(expectedValue);
  }

  evaluateIn(fieldValue, expectedValue) {
    if (!Array.isArray(expectedValue)) {
      throw new Error('IN operator requires array value');
    }
    return expectedValue.includes(fieldValue);
  }

  evaluateNotIn(fieldValue, expectedValue) {
    return !this.evaluateIn(fieldValue, expectedValue);
  }

  evaluateContains(fieldValue, expectedValue) {
    if (typeof fieldValue === 'string') {
      return fieldValue.toLowerCase().includes(expectedValue.toLowerCase());
    }
    if (Array.isArray(fieldValue)) {
      return fieldValue.includes(expectedValue);
    }
    return false;
  }

  evaluateStartsWith(fieldValue, expectedValue) {
    if (typeof fieldValue !== 'string') return false;
    return fieldValue.toLowerCase().startsWith(expectedValue.toLowerCase());
  }

  evaluateEndsWith(fieldValue, expectedValue) {
    if (typeof fieldValue !== 'string') return false;
    return fieldValue.toLowerCase().endsWith(expectedValue.toLowerCase());
  }

  evaluateRegex(fieldValue, expectedValue, metadata = {}) {
    if (typeof fieldValue !== 'string') return false;
    const flags = metadata.flags || 'i';
    const regex = new RegExp(expectedValue, flags);
    return regex.test(fieldValue);
  }

  evaluateBetween(fieldValue, expectedValue) {
    if (!Array.isArray(expectedValue) || expectedValue.length !== 2) {
      throw new Error(
        'BETWEEN operator requires array with 2 values [min, max]'
      );
    }
    const numValue = this.toNumber(fieldValue);
    const [min, max] = expectedValue.map((v) => this.toNumber(v));
    return numValue >= min && numValue <= max;
  }

  evaluateExists(fieldValue) {
    return fieldValue !== undefined && fieldValue !== null;
  }

  evaluateType(fieldValue, expectedValue) {
    const actualType = Array.isArray(fieldValue) ? 'array' : typeof fieldValue;
    return actualType === expectedValue;
  }

  evaluateLength(fieldValue, expectedValue, metadata = {}) {
    let length;
    if (typeof fieldValue === 'string' || Array.isArray(fieldValue)) {
      length = fieldValue.length;
    } else if (typeof fieldValue === 'object' && fieldValue !== null) {
      length = Object.keys(fieldValue).length;
    } else {
      return false;
    }

    const operator = metadata.operator || 'eq';
    return this.operators[operator](length, expectedValue);
  }

  evaluateAge(fieldValue, expectedValue, metadata = {}) {
    const birthDate = new Date(fieldValue);
    if (isNaN(birthDate)) return false;

    const now = new Date();
    const ageMs = now - birthDate;
    const ageYears = ageMs / (1000 * 60 * 60 * 24 * 365.25);

    const operator = metadata.operator || 'eq';
    const unit = metadata.unit || 'years';

    let normalizedAge = ageYears;
    switch (unit) {
      case 'months':
        normalizedAge = ageYears * 12;
        break;
      case 'days':
        normalizedAge = ageMs / (1000 * 60 * 60 * 24);
        break;
      case 'hours':
        normalizedAge = ageMs / (1000 * 60 * 60);
        break;
    }

    return this.operators[operator](normalizedAge, expectedValue);
  }

  evaluateTimeRange(fieldValue, expectedValue, metadata = {}) {
    const timestamp = new Date(fieldValue);
    if (isNaN(timestamp)) return false;

    const now = new Date();
    const diffMs = Math.abs(now - timestamp);

    const unit = metadata.unit || 'hours';
    let diffInUnit;

    switch (unit) {
      case 'minutes':
        diffInUnit = diffMs / (1000 * 60);
        break;
      case 'hours':
        diffInUnit = diffMs / (1000 * 60 * 60);
        break;
      case 'days':
        diffInUnit = diffMs / (1000 * 60 * 60 * 24);
        break;
      default:
        diffInUnit = diffMs / (1000 * 60 * 60); // Default to hours
    }

    const operator = metadata.operator || 'lte';
    return this.operators[operator](diffInUnit, expectedValue);
  }

  evaluateCriticalValue(fieldValue, expectedValue, metadata = {}) {
    // Healthcare-specific critical value evaluation
    const { valueType = 'numeric', ranges = {} } = metadata;

    switch (valueType) {
      case 'blood_pressure':
        return this.evaluateBloodPressure(fieldValue, expectedValue, ranges);
      case 'heart_rate':
        return this.evaluateHeartRate(fieldValue, expectedValue, ranges);
      case 'temperature':
        return this.evaluateTemperature(fieldValue, expectedValue, ranges);
      case 'lab_value':
        return this.evaluateLabValue(fieldValue, expectedValue, ranges);
      default:
        return this.evaluateGreaterThan(fieldValue, expectedValue);
    }
  }

  // Healthcare-specific evaluations
  evaluateBloodPressure(value, threshold, ranges = {}) {
    // Parse blood pressure (e.g., "120/80")
    if (typeof value === 'string') {
      const [systolic, diastolic] = value.split('/').map((v) => parseInt(v));
      const criticalSystolic = ranges.criticalSystolic || 180;
      const criticalDiastolic = ranges.criticalDiastolic || 110;

      return systolic >= criticalSystolic || diastolic >= criticalDiastolic;
    }
    return false;
  }

  evaluateHeartRate(value, threshold, ranges = {}) {
    const numValue = this.toNumber(value);
    const criticalLow = ranges.criticalLow || 50;
    const criticalHigh = ranges.criticalHigh || 120;

    return numValue <= criticalLow || numValue >= criticalHigh;
  }

  evaluateTemperature(value, threshold, ranges = {}) {
    const numValue = this.toNumber(value);
    const unit = ranges.unit || 'fahrenheit';

    let criticalHigh, criticalLow;
    if (unit === 'celsius') {
      criticalHigh = ranges.criticalHigh || 39.4; // 103°F
      criticalLow = ranges.criticalLow || 35.0; // 95°F
    } else {
      criticalHigh = ranges.criticalHigh || 103.0;
      criticalLow = ranges.criticalLow || 95.0;
    }

    return numValue >= criticalHigh || numValue <= criticalLow;
  }

  evaluateLabValue(value, threshold, ranges = {}) {
    const numValue = this.toNumber(value);
    const { testType, normalRange = {} } = ranges;

    // Define normal ranges for common lab tests
    const labRanges = {
      glucose: { min: 70, max: 100, criticalHigh: 400, criticalLow: 40 },
      creatinine: { min: 0.7, max: 1.3, criticalHigh: 4.0, criticalLow: 0.3 },
      hemoglobin: {
        min: 12.0,
        max: 16.0,
        criticalHigh: 20.0,
        criticalLow: 7.0,
      },
      potassium: { min: 3.5, max: 5.1, criticalHigh: 6.5, criticalLow: 2.5 },
    };

    const range = labRanges[testType] || normalRange;
    if (!range) return false;

    return numValue >= range.criticalHigh || numValue <= range.criticalLow;
  }

  // Utility methods
  toNumber(value) {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      const parsed = parseFloat(value);
      if (isNaN(parsed)) {
        throw new Error(`Cannot convert "${value}" to number`);
      }
      return parsed;
    }
    throw new Error(`Cannot convert ${typeof value} to number`);
  }

  /**
   * Validates condition structure
   */
  validateCondition(condition) {
    const errors = [];

    if (!condition.field) {
      errors.push('Field is required');
    }

    if (!condition.operator) {
      errors.push('Operator is required');
    }

    if (!this.operators[condition.operator]) {
      errors.push(`Unknown operator: ${condition.operator}`);
    }

    // Validate operator-specific requirements
    if (condition.operator === 'in' || condition.operator === 'nin') {
      if (!Array.isArray(condition.value)) {
        errors.push(`${condition.operator} operator requires array value`);
      }
    }

    if (condition.operator === 'between') {
      if (!Array.isArray(condition.value) || condition.value.length !== 2) {
        errors.push('between operator requires array with exactly 2 values');
      }
    }

    return { valid: errors.length === 0, errors };
  }
}

module.exports = { ConditionEvaluator };
