import { v4 as uuidv4 } from 'uuid';
import {
  Workflow,
  ExecutionContext,
  ExecutionResult,
  Condition,
  ConditionOperator,
} from '@clinical-fire/shared';
import { ConditionEvaluator } from './condition.evaluator';
import { ActionExecutor } from './action.executor';
import { Logger } from '../utils/logger';

export interface RulesEngineConfig {
  maxExecutionTime?: number; // milliseconds
  enableLogging?: boolean;
  logLevel?: 'debug' | 'info' | 'warn' | 'error';
}

export class RulesEngine {
  private conditionEvaluator: ConditionEvaluator;
  private actionExecutor: ActionExecutor;
  private logger: Logger;
  private config: Required<RulesEngineConfig>;

  constructor(config: RulesEngineConfig = {}) {
    this.config = {
      maxExecutionTime: config.maxExecutionTime ?? 30000, // 30 seconds default
      enableLogging: config.enableLogging ?? true,
      logLevel: config.logLevel ?? 'info',
    };

    this.logger = new Logger(this.config.logLevel, this.config.enableLogging);
    this.conditionEvaluator = new ConditionEvaluator(this.logger);
    this.actionExecutor = new ActionExecutor(this.logger);
  }

  /**
   * Executes a workflow with the given context
   */
  async executeWorkflow(
    workflow: Workflow,
    context: Omit<ExecutionContext, 'workflowId' | 'executionId'>
  ): Promise<ExecutionResult> {
    const executionId = uuidv4();
    const startTime = Date.now();

    const fullContext: ExecutionContext = {
      ...context,
      workflowId: workflow.name,
      executionId,
    };

    this.logger.info(`Starting workflow execution: ${workflow.name}`, {
      executionId,
      workflowId: workflow.name,
    });

    try {
      // Check if workflow is enabled
      if (!workflow.enabled) {
        this.logger.warn(`Workflow ${workflow.name} is disabled`, { executionId });
        return {
          success: false,
          actionResults: [],
          duration: Date.now() - startTime,
          error: 'Workflow is disabled',
        };
      }

      // Evaluate triggers
      const triggerMatched = await this.evaluateTriggers(workflow, fullContext);
      if (!triggerMatched) {
        this.logger.info(`No triggers matched for workflow ${workflow.name}`, {
          executionId,
        });
        return {
          success: true,
          actionResults: [],
          duration: Date.now() - startTime,
        };
      }

      // Execute actions
      const actionResults = await this.executeActions(workflow, fullContext);

      const duration = Date.now() - startTime;
      const success = actionResults.every((result: any) => result.success);

      this.logger.info(`Workflow execution completed: ${workflow.name}`, {
        executionId,
        success,
        duration,
        actionCount: actionResults.length,
      });

      return {
        success,
        actionResults,
        duration,
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      this.logger.error(`Workflow execution failed: ${workflow.name}`, {
        executionId,
        error: errorMessage,
        duration,
      });

      return {
        success: false,
        actionResults: [],
        duration,
        error: errorMessage,
      };
    }
  }

  /**
   * Evaluates all triggers for a workflow
   */
  private async evaluateTriggers(
    workflow: Workflow,
    context: ExecutionContext
  ): Promise<boolean> {
    for (const trigger of workflow.triggers) {
      // Check if trigger type matches the context
      const triggerTypeMatches = this.checkTriggerType(trigger.type, context);
      if (!triggerTypeMatches) {
        continue;
      }

      // Evaluate trigger conditions
      if (trigger.conditions && trigger.conditions.length > 0) {
        const conditionsMatch = await this.conditionEvaluator.evaluateConditions(
          trigger.conditions,
          context.data
        );
        if (conditionsMatch) {
          this.logger.debug(`Trigger matched: ${trigger.type}`, {
            executionId: context.executionId,
            triggerType: trigger.type,
          });
          return true;
        }
      } else {
        // No conditions means trigger always matches if type matches
        this.logger.debug(`Trigger matched (no conditions): ${trigger.type}`, {
          executionId: context.executionId,
          triggerType: trigger.type,
        });
        return true;
      }
    }

    return false;
  }

  /**
   * Checks if a trigger type matches the execution context
   */
  private checkTriggerType(triggerType: string, context: ExecutionContext): boolean {
    // This would be enhanced based on the actual trigger system
    // For now, we'll check if the trigger type is mentioned in the context data
    return context.triggeredBy === triggerType || context.data.triggerType === triggerType;
  }

  /**
   * Executes all actions for a workflow
   */
  private async executeActions(
    workflow: Workflow,
    context: ExecutionContext
  ): Promise<ExecutionResult['actionResults']> {
    const actionResults: ExecutionResult['actionResults'] = [];

    for (const action of workflow.actions) {
      const actionStartTime = Date.now();

      try {
        // Check action conditions if they exist
        if (action.conditions && action.conditions.length > 0) {
          const conditionsMatch = await this.conditionEvaluator.evaluateConditions(
            action.conditions,
            context.data
          );
          if (!conditionsMatch) {
            this.logger.debug(`Action skipped due to conditions: ${action.type}`, {
              executionId: context.executionId,
              actionType: action.type,
            });
            continue;
          }
        }

        // Apply delay if specified
        if (action.delay && action.delay > 0) {
          this.logger.debug(`Delaying action execution: ${action.delay}ms`, {
            executionId: context.executionId,
            actionType: action.type,
          });
          await this.delay(action.delay);
        }

        // Execute action
        const result = await this.actionExecutor.executeAction(action, context);
        const duration = Date.now() - actionStartTime;

        actionResults.push({
          actionType: action.type,
          success: true,
          result,
          duration,
        });

        this.logger.info(`Action executed successfully: ${action.type}`, {
          executionId: context.executionId,
          actionType: action.type,
          duration,
        });
      } catch (error) {
        const duration = Date.now() - actionStartTime;
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';

        actionResults.push({
          actionType: action.type,
          success: false,
          error: errorMessage,
          duration,
        });

        this.logger.error(`Action execution failed: ${action.type}`, {
          executionId: context.executionId,
          actionType: action.type,
          error: errorMessage,
          duration,
        });
      }
    }

    return actionResults;
  }

  /**
   * Utility method to add delay
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Validates a workflow definition
   */
  validateWorkflow(workflow: Workflow): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Basic validation
    if (!workflow.name || workflow.name.trim() === '') {
      errors.push('Workflow name is required');
    }

    if (!workflow.version || workflow.version.trim() === '') {
      errors.push('Workflow version is required');
    }

    if (!workflow.triggers || workflow.triggers.length === 0) {
      errors.push('At least one trigger is required');
    }

    if (!workflow.actions || workflow.actions.length === 0) {
      errors.push('At least one action is required');
    }

    // Validate triggers
    workflow.triggers?.forEach((trigger: any, index: number) => {
      if (!trigger.type) {
        errors.push(`Trigger ${index + 1}: type is required`);
      }
    });

    // Validate actions
    workflow.actions?.forEach((action: any, index: number) => {
      if (!action.type) {
        errors.push(`Action ${index + 1}: type is required`);
      }
      if (!action.params) {
        errors.push(`Action ${index + 1}: params is required`);
      }
    });

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Gets engine statistics
   */
  getStats(): {
    version: string;
    uptime: number;
    config: RulesEngineConfig;
  } {
    return {
      version: '1.0.0',
      uptime: process.uptime(),
      config: this.config,
    };
  }
} 