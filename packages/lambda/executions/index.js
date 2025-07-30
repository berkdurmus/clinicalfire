const AWS = require('aws-sdk');
const { v4: uuidv4 } = require('uuid');
const { ActionHandlers } = require('./action-handlers');
const { ConditionEvaluator } = require('./shared/condition-evaluator');
const { AuditLogger } = require('./shared/audit-logger');

// Initialize AWS services
const dynamoDB = new AWS.DynamoDB.DocumentClient();
const sqs = new AWS.SQS();
const actionHandlers = new ActionHandlers();
const conditionEvaluator = new ConditionEvaluator();
const auditLogger = new AuditLogger();

// Environment variables
const WORKFLOWS_TABLE = process.env.WORKFLOWS_TABLE;
const EXECUTIONS_TABLE = process.env.EXECUTIONS_TABLE;
const WORKFLOW_QUEUE_URL = process.env.WORKFLOW_QUEUE_URL;
const CRITICAL_ALERTS_QUEUE = process.env.CRITICAL_ALERTS_QUEUE;

// Helper function to create API Gateway response
const createResponse = (statusCode, body, headers = {}) => ({
  statusCode,
  headers: {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
    ...headers,
  },
  body: JSON.stringify(body),
});

// Helper function to get user info from Cognito JWT
const getUserFromToken = (event) => {
  try {
    const claims = event.requestContext.authorizer.claims;
    return {
      id: claims.sub,
      email: claims.email,
      role: claims['custom:role'] || 'USER',
      department: claims['custom:department'] || 'GENERAL',
    };
  } catch (error) {
    throw new Error('Invalid token');
  }
};

// DynamoDB operations for executions
const putExecution = async (execution) => {
  const params = {
    TableName: EXECUTIONS_TABLE,
    Item: {
      PK: `EXECUTION#${execution.id}`,
      SK: 'METADATA',
      GSI1PK: `WORKFLOW#${execution.workflowId}`,
      GSI1SK: `EXECUTION#${execution.startTime}`,
      ...execution,
    },
  };

  await dynamoDB.put(params).promise();
};

const getExecution = async (id) => {
  const params = {
    TableName: EXECUTIONS_TABLE,
    Key: {
      PK: `EXECUTION#${id}`,
      SK: 'METADATA',
    },
  };

  const result = await dynamoDB.get(params).promise();
  return result.Item;
};

const listExecutions = async (workflowId = null, limit = 20) => {
  let params;

  if (workflowId) {
    // Query executions for specific workflow
    params = {
      TableName: EXECUTIONS_TABLE,
      IndexName: 'GSI1',
      KeyConditionExpression: 'GSI1PK = :pk',
      ExpressionAttributeValues: {
        ':pk': `WORKFLOW#${workflowId}`,
      },
      Limit: limit,
      ScanIndexForward: false, // Most recent first
    };

    const result = await dynamoDB.query(params).promise();
    return result.Items;
  } else {
    // Scan all executions (for admin users)
    params = {
      TableName: EXECUTIONS_TABLE,
      FilterExpression: 'SK = :sk',
      ExpressionAttributeValues: {
        ':sk': 'METADATA',
      },
      Limit: limit,
    };

    const result = await dynamoDB.scan(params).promise();
    return result.Items;
  }
};

const getWorkflow = async (id) => {
  const params = {
    TableName: WORKFLOWS_TABLE,
    Key: {
      PK: `WORKFLOW#${id}`,
      SK: 'METADATA',
    },
  };

  const result = await dynamoDB.get(params).promise();
  return result.Item;
};

// Simplified Rules Engine for Lambda
const executeWorkflow = async (workflow, executionContext) => {
  const startTime = Date.now();

  try {
    // Check if workflow is enabled
    if (!workflow.enabled) {
      return {
        success: false,
        actionResults: [],
        duration: Date.now() - startTime,
        error: 'Workflow is disabled',
      };
    }

    // Evaluate triggers with full condition support
    const triggerMatched = await evaluateTriggers(workflow, executionContext);
    if (!triggerMatched) {
      return {
        success: true,
        actionResults: [],
        duration: Date.now() - startTime,
        message: 'No triggers matched',
      };
    }

    // Execute actions (simplified simulation)
    const actionResults = await executeActions(workflow, executionContext);

    const duration = Date.now() - startTime;
    const success = actionResults.every((result) => result.success);

    return {
      success,
      actionResults,
      duration,
    };
  } catch (error) {
    return {
      success: false,
      actionResults: [],
      duration: Date.now() - startTime,
      error: error.message,
    };
  }
};

const evaluateTriggers = async (workflow, context) => {
  // Enhanced trigger evaluation with condition support
  for (const trigger of workflow.triggers || []) {
    // Check if trigger type matches the context
    const triggerTypeMatches = checkTriggerType(trigger.type, context);
    if (!triggerTypeMatches) {
      continue;
    }

    // Evaluate trigger conditions if they exist
    if (trigger.conditions && trigger.conditions.length > 0) {
      try {
        const conditionsMatch = await conditionEvaluator.evaluateConditions(
          trigger.conditions,
          context.data
        );
        if (conditionsMatch) {
          console.log(`Trigger matched: ${trigger.type}`, {
            executionId: context.executionId,
            triggerType: trigger.type,
            conditionsCount: trigger.conditions.length,
          });
          return true;
        }
      } catch (error) {
        console.error(
          `Condition evaluation failed for trigger ${trigger.type}:`,
          error
        );
        // Continue to next trigger if condition evaluation fails
        continue;
      }
    } else {
      // No conditions means trigger always matches if type matches
      console.log(`Trigger matched (no conditions): ${trigger.type}`, {
        executionId: context.executionId,
        triggerType: trigger.type,
      });
      return true;
    }
  }

  return false;
};

// Helper function to check trigger type matching
const checkTriggerType = (triggerType, context) => {
  // Enhanced trigger type matching
  return (
    context.triggerType === triggerType ||
    context.data.triggerType === triggerType ||
    triggerType === 'manual' ||
    (triggerType === 'scheduled' && context.triggerType === 'scheduled') ||
    (triggerType === 'webhook' && context.triggerType === 'webhook') ||
    (triggerType === 'lab_result' && context.data.type === 'lab_result') ||
    (triggerType === 'vital_signs' && context.data.type === 'vital_signs') ||
    (triggerType === 'medication' && context.data.type === 'medication') ||
    (triggerType === 'alert' && context.data.type === 'alert')
  );
};

const executeActions = async (workflow, context) => {
  const actionResults = [];

  for (const action of workflow.actions || []) {
    const actionStartTime = Date.now();

    try {
      // Check action conditions if they exist
      if (action.conditions && action.conditions.length > 0) {
        const conditionsMatch = await conditionEvaluator.evaluateConditions(
          action.conditions,
          context.data
        );
        if (!conditionsMatch) {
          console.log(`Action skipped due to conditions: ${action.type}`, {
            executionId: context.executionId,
            actionType: action.type,
            conditionsCount: action.conditions.length,
          });
          continue;
        }
      }

      // Apply delay if specified
      if (action.delay && action.delay > 0) {
        console.log(`Delaying action execution: ${action.delay}ms`, {
          executionId: context.executionId,
          actionType: action.type,
        });
        await delay(action.delay);
      }

      // Execute action using real handlers
      const result = await actionHandlers.executeAction(action, context);

      actionResults.push({
        actionType: action.type,
        success: result.success,
        result: result.result,
        duration: result.duration,
        ...(result.error && { error: result.error }),
      });

      // Send critical alerts to FIFO queue for additional processing
      if (
        action.type === 'send_alert' &&
        action.params?.priority === 'critical'
      ) {
        await sendCriticalAlert(action, context);
      }
    } catch (error) {
      actionResults.push({
        actionType: action.type,
        success: false,
        error: error.message,
        duration: Date.now() - actionStartTime,
      });
    }
  }

  return actionResults;
};

// Utility function to add delay
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Note: simulateAction function removed - now using real ActionHandlers

const sendCriticalAlert = async (action, context) => {
  if (!CRITICAL_ALERTS_QUEUE) return;

  const alertMessage = {
    alertType: action.params?.alertType || 'CRITICAL_LAB_VALUE',
    patientId: context.patientId,
    message: action.params?.message || 'Critical alert triggered',
    priority: 'CRITICAL',
    timestamp: new Date().toISOString(),
    workflowId: context.workflowId,
    executionId: context.executionId,
  };

  const params = {
    QueueUrl: CRITICAL_ALERTS_QUEUE,
    MessageBody: JSON.stringify(alertMessage),
    MessageGroupId: `patient-${context.patientId}`,
    MessageDeduplicationId: `${context.executionId}-${Date.now()}`,
  };

  await sqs.sendMessage(params).promise();
};

// Main Lambda handler
exports.handler = async (event) => {
  console.log('Execution Lambda Event:', JSON.stringify(event, null, 2));

  try {
    const { httpMethod, pathParameters, body, queryStringParameters } = event;
    const user = getUserFromToken(event);

    // Handle CORS preflight
    if (httpMethod === 'OPTIONS') {
      return createResponse(200, { message: 'CORS preflight' });
    }

    // Route based on HTTP method and path
    switch (httpMethod) {
      case 'GET':
        return await handleGetExecutions(
          pathParameters,
          queryStringParameters,
          user
        );

      case 'POST':
        return await handleTriggerExecution(body, user);

      default:
        return createResponse(405, { error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Lambda error:', error);

    if (error.message === 'Invalid token') {
      return createResponse(401, { error: 'Unauthorized' });
    }

    if (error.message.includes('not found')) {
      return createResponse(404, { error: error.message });
    }

    return createResponse(500, {
      error: 'Internal server error',
      message: error.message,
    });
  }
};

// Handler functions
const handleGetExecutions = async (
  pathParameters,
  queryStringParameters,
  user
) => {
  // If ID is provided, get single execution
  if (pathParameters && pathParameters.id) {
    const execution = await getExecution(pathParameters.id);

    if (!execution) {
      throw new Error('Execution not found');
    }

    return createResponse(200, {
      success: true,
      data: execution,
    });
  }

  // List executions with optional workflow filter
  const workflowId = queryStringParameters?.workflowId;
  const limit = parseInt(queryStringParameters?.limit) || 20;

  const executions = await listExecutions(workflowId, limit);

  return createResponse(200, {
    success: true,
    data: executions,
    count: executions.length,
  });
};

const handleTriggerExecution = async (body, user) => {
  const requestData = JSON.parse(body);
  const {
    workflowId,
    patientId,
    triggerType = 'manual',
    data = {},
  } = requestData;

  if (!workflowId) {
    throw new Error('Workflow ID is required');
  }

  // Get workflow
  const workflow = await getWorkflow(workflowId);
  if (!workflow) {
    throw new Error('Workflow not found');
  }

  // Check if workflow is enabled
  if (!workflow.enabled) {
    throw new Error('Workflow is disabled');
  }

  // Create execution context
  const executionId = uuidv4();
  const executionContext = {
    workflowId,
    executionId,
    patientId,
    triggerType,
    triggeredBy: user.id,
    data,
  };

  // Execute workflow
  const result = await executeWorkflow(workflow, executionContext);

  // Create execution record
  const execution = {
    id: executionId,
    workflowId,
    workflowName: workflow.name,
    status: result.success ? 'COMPLETED' : 'FAILED',
    triggeredBy: user.id,
    startTime: new Date().toISOString(),
    endTime: new Date().toISOString(),
    duration: result.duration,
    patientId,
    triggerType,
    actionResults: result.actionResults,
    error: result.error,
    metadata: {
      triggerData: data,
      userRole: user.role,
      userDepartment: user.department,
    },
  };

  // Save execution to DynamoDB
  await putExecution(execution);

  // Create comprehensive audit trail
  await auditLogger.createWorkflowAuditTrail({
    workflowId,
    executionId,
    userId: user.id,
    patientId,
    triggerType,
    actionResults: result.actionResults,
    status: execution.status,
    duration: result.duration,
    startTime: execution.startTime,
    endTime: execution.endTime,
  });

  // Send event to workflow queue
  if (WORKFLOW_QUEUE_URL) {
    const sqsParams = {
      QueueUrl: WORKFLOW_QUEUE_URL,
      MessageBody: JSON.stringify({
        action: 'WORKFLOW_EXECUTED',
        executionId,
        workflowId,
        userId: user.id,
        status: execution.status,
        timestamp: new Date().toISOString(),
      }),
    };

    await sqs.sendMessage(sqsParams).promise();
  }

  return createResponse(201, {
    success: true,
    message: 'Workflow executed successfully',
    data: {
      executionId,
      status: execution.status,
      duration: execution.duration,
      actionResults: result.actionResults,
      ...(result.error && { error: result.error }),
    },
  });
};
