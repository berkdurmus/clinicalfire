import { JSONPath } from 'jsonpath-plus';
import { Condition, ConditionOperator } from '@clinical-fire/shared';
import { Logger } from '../utils/logger';

export class ConditionEvaluator {
  constructor(private logger: Logger) {}

  /**
   * Evaluates a list of conditions against data (AND logic)
   */
  async evaluateConditions(conditions: Condition[], data: Record<string, any>): Promise<boolean> {
    for (const condition of conditions) {
      const result = await this.evaluateCondition(condition, data);
      if (!result) {
        this.logger.debug(`Condition failed: ${JSON.stringify(condition)}`);
        return false;
      }
    }
    return true;
  }

  /**
   * Evaluates a single condition against data
   */
  async evaluateCondition(condition: Condition, data: Record<string, any>): Promise<boolean> {
    try {
      const fieldValue = this.extractFieldValue(condition.field, data);
      return this.compareValues(fieldValue, condition.operator, condition.value);
    } catch (error) {
      this.logger.error(`Error evaluating condition: ${error}`);
      return false;
    }
  }

  /**
   * Extracts field value from data using JSONPath or simple dot notation
   */
  private extractFieldValue(field: string, data: Record<string, any>): any {
    // If field starts with $, treat as JSONPath
    if (field.startsWith('$')) {
      try {
        const result = JSONPath({ path: field, json: data });
        return result.length > 0 ? result[0] : undefined;
      } catch (error) {
        this.logger.warn(`JSONPath evaluation failed for ${field}: ${error}`);
        return undefined;
      }
    }

    // Simple dot notation
    return this.getNestedValue(data, field);
  }

  /**
   * Gets nested value using dot notation
   */
  private getNestedValue(obj: Record<string, any>, path: string): any {
    return path.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : undefined;
    }, obj);
  }

  /**
   * Compares values based on operator
   */
  private compareValues(fieldValue: any, operator: ConditionOperator, expectedValue: any): boolean {
    switch (operator) {
      case 'equals':
        return fieldValue === expectedValue;

      case 'not_equals':
        return fieldValue !== expectedValue;

      case 'greater_than':
        return this.isNumeric(fieldValue) && this.isNumeric(expectedValue) && 
               Number(fieldValue) > Number(expectedValue);

      case 'less_than':
        return this.isNumeric(fieldValue) && this.isNumeric(expectedValue) && 
               Number(fieldValue) < Number(expectedValue);

      case 'greater_than_or_equal':
        return this.isNumeric(fieldValue) && this.isNumeric(expectedValue) && 
               Number(fieldValue) >= Number(expectedValue);

      case 'less_than_or_equal':
        return this.isNumeric(fieldValue) && this.isNumeric(expectedValue) && 
               Number(fieldValue) <= Number(expectedValue);

      case 'contains':
        return this.isString(fieldValue) && this.isString(expectedValue) && 
               fieldValue.toLowerCase().includes(expectedValue.toLowerCase());

      case 'not_contains':
        return this.isString(fieldValue) && this.isString(expectedValue) && 
               !fieldValue.toLowerCase().includes(expectedValue.toLowerCase());

      case 'starts_with':
        return this.isString(fieldValue) && this.isString(expectedValue) && 
               fieldValue.toLowerCase().startsWith(expectedValue.toLowerCase());

      case 'ends_with':
        return this.isString(fieldValue) && this.isString(expectedValue) && 
               fieldValue.toLowerCase().endsWith(expectedValue.toLowerCase());

      case 'in':
        return Array.isArray(expectedValue) && expectedValue.includes(fieldValue);

      case 'not_in':
        return Array.isArray(expectedValue) && !expectedValue.includes(fieldValue);

      case 'regex':
        if (!this.isString(fieldValue) || !this.isString(expectedValue)) {
          return false;
        }
        try {
          const regex = new RegExp(expectedValue, 'i');
          return regex.test(fieldValue);
        } catch (error) {
          this.logger.warn(`Invalid regex pattern: ${expectedValue}`);
          return false;
        }

      case 'exists':
        return fieldValue !== undefined && fieldValue !== null;

      case 'not_exists':
        return fieldValue === undefined || fieldValue === null;

      default:
        this.logger.warn(`Unknown operator: ${operator}`);
        return false;
    }
  }

  /**
   * Type guards
   */
  private isString(value: any): value is string {
    return typeof value === 'string';
  }

  private isNumeric(value: any): boolean {
    return !isNaN(Number(value)) && isFinite(Number(value));
  }
} 