import * as yaml from 'js-yaml';
import { Workflow, WorkflowSchema } from '@clinical-fire/shared';
import { Logger } from '../utils/logger';

export class DSLParser {
  constructor(private logger: Logger) {}

  /**
   * Parses a workflow definition from YAML string
   */
  parseYaml(yamlContent: string): Workflow {
    try {
      const parsed = yaml.load(yamlContent);
      return this.validateAndTransform(parsed);
    } catch (error) {
      this.logger.error(`Failed to parse YAML: ${error}`);
      throw new Error(`Invalid YAML format: ${error}`);
    }
  }

  /**
   * Parses a workflow definition from JSON string
   */
  parseJson(jsonContent: string): Workflow {
    try {
      const parsed = JSON.parse(jsonContent);
      return this.validateAndTransform(parsed);
    } catch (error) {
      this.logger.error(`Failed to parse JSON: ${error}`);
      throw new Error(`Invalid JSON format: ${error}`);
    }
  }

  /**
   * Parses a workflow definition from an object
   */
  parseObject(obj: unknown): Workflow {
    return this.validateAndTransform(obj);
  }

  /**
   * Converts a workflow back to YAML
   */
  toYaml(workflow: Workflow): string {
    try {
      return yaml.dump(workflow, {
        indent: 2,
        lineWidth: 120,
        noRefs: true,
      });
    } catch (error) {
      this.logger.error(`Failed to convert to YAML: ${error}`);
      throw new Error(`Failed to serialize workflow to YAML: ${error}`);
    }
  }

  /**
   * Converts a workflow back to JSON
   */
  toJson(workflow: Workflow, pretty: boolean = true): string {
    try {
      return JSON.stringify(workflow, null, pretty ? 2 : 0);
    } catch (error) {
      this.logger.error(`Failed to convert to JSON: ${error}`);
      throw new Error(`Failed to serialize workflow to JSON: ${error}`);
    }
  }

  /**
   * Validates and transforms the parsed object into a proper Workflow
   */
  private validateAndTransform(obj: unknown): Workflow {
    try {
      // Use Zod schema for validation
      const workflow = WorkflowSchema.parse(obj);
      
      // Add default values and transformations
      return {
        ...workflow,
        enabled: workflow.enabled ?? true,
        createdAt: workflow.createdAt ?? new Date(),
        updatedAt: workflow.updatedAt ?? new Date(),
      };
    } catch (error) {
      this.logger.error(`Workflow validation failed: ${error}`);
      throw new Error(`Invalid workflow definition: ${error}`);
    }
  }

  /**
   * Validates a workflow definition without creating a full Workflow object
   */
  validate(content: string, format: 'yaml' | 'json'): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    try {
      let parsed: unknown;
      
      if (format === 'yaml') {
        parsed = yaml.load(content);
      } else {
        parsed = JSON.parse(content);
      }

      WorkflowSchema.parse(parsed);
      return { valid: true, errors: [] };
    } catch (error) {
      if (error instanceof Error) {
        errors.push(error.message);
      } else {
        errors.push('Unknown validation error');
      }
      return { valid: false, errors };
    }
  }

  /**
   * Creates a workflow template
   */
  createTemplate(name: string, description?: string): string {
    const template = {
      name,
      version: '1.0.0',
      description: description || 'Generated workflow template',
      enabled: true,
      triggers: [
        {
          type: 'lab_result_received',
          conditions: [
            {
              field: 'test_type',
              operator: 'equals',
              value: 'example_test'
            }
          ]
        }
      ],
      actions: [
        {
          type: 'log_event',
          params: {
            category: 'workflow_execution',
            message: 'Template workflow executed'
          }
        }
      ]
    };

    return this.toYaml(template as Workflow);
  }

  /**
   * Extracts workflow metadata
   */
  extractMetadata(workflow: Workflow): {
    name: string;
    version: string;
    triggerCount: number;
    actionCount: number;
    complexity: 'simple' | 'medium' | 'complex';
    estimatedExecutionTime: number; // milliseconds
  } {
    const triggerCount = workflow.triggers.length;
    const actionCount = workflow.actions.length;
    
    // Simple complexity calculation
    let complexity: 'simple' | 'medium' | 'complex' = 'simple';
    if (triggerCount > 2 || actionCount > 3) {
      complexity = 'medium';
    }
    if (triggerCount > 5 || actionCount > 8) {
      complexity = 'complex';
    }

    // Estimated execution time based on action types
    const actionExecutionTimes: Record<string, number> = {
      log_event: 50,
      notify_doctor: 200,
      notify_nurse: 150,
      notify_patient: 100,
      send_email: 800,
      send_sms: 300,
      webhook: 500,
      api_call: 400,
      create_care_plan: 500,
      schedule_appointment: 300,
      create_task: 200,
      update_record: 400,
    };

    const estimatedExecutionTime = workflow.actions.reduce((total, action) => {
      return total + (actionExecutionTimes[action.type] || 250);
    }, 100); // Base overhead

    return {
      name: workflow.name,
      version: workflow.version,
      triggerCount,
      actionCount,
      complexity,
      estimatedExecutionTime,
    };
  }
} 