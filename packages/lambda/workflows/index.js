const AWS = require('aws-sdk');
const { v4: uuidv4 } = require('uuid');

// Initialize AWS services
const dynamoDB = new AWS.DynamoDB.DocumentClient();
const sqs = new AWS.SQS();

// Environment variables
const WORKFLOWS_TABLE = process.env.WORKFLOWS_TABLE;
const EXECUTIONS_TABLE = process.env.EXECUTIONS_TABLE;
const WORKFLOW_QUEUE_URL = process.env.WORKFLOW_QUEUE_URL;

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

// Workflow validation using schema
const validateWorkflow = (workflow) => {
  const errors = [];

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

  return { valid: errors.length === 0, errors };
};

// DynamoDB operations
const putWorkflow = async (workflow) => {
  const params = {
    TableName: WORKFLOWS_TABLE,
    Item: {
      PK: `WORKFLOW#${workflow.id}`,
      SK: 'METADATA',
      GSI1PK: `USER#${workflow.createdBy}`,
      GSI1SK: `WORKFLOW#${workflow.createdAt}`,
      ...workflow,
      updatedAt: new Date().toISOString(),
    },
  };

  await dynamoDB.put(params).promise();
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

const listWorkflows = async (userId, limit = 20) => {
  const params = {
    TableName: WORKFLOWS_TABLE,
    IndexName: 'GSI1',
    KeyConditionExpression: 'GSI1PK = :pk',
    ExpressionAttributeValues: {
      ':pk': `USER#${userId}`,
    },
    Limit: limit,
    ScanIndexForward: false, // Most recent first
  };

  const result = await dynamoDB.query(params).promise();
  return result.Items;
};

const deleteWorkflow = async (id) => {
  const params = {
    TableName: WORKFLOWS_TABLE,
    Key: {
      PK: `WORKFLOW#${id}`,
      SK: 'METADATA',
    },
  };

  await dynamoDB.delete(params).promise();
};

// Main Lambda handler
exports.handler = async (event) => {
  console.log('Workflow Lambda Event:', JSON.stringify(event, null, 2));

  try {
    const { httpMethod, pathParameters, body } = event;
    const user = getUserFromToken(event);

    // Handle CORS preflight
    if (httpMethod === 'OPTIONS') {
      return createResponse(200, { message: 'CORS preflight' });
    }

    // Route based on HTTP method and path
    switch (httpMethod) {
      case 'GET':
        return await handleGetWorkflows(pathParameters, user);

      case 'POST':
        return await handleCreateWorkflow(body, user);

      case 'PUT':
        return await handleUpdateWorkflow(pathParameters, body, user);

      case 'DELETE':
        return await handleDeleteWorkflow(pathParameters, user);

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

    if (error.message.includes('validation')) {
      return createResponse(400, { error: error.message });
    }

    return createResponse(500, {
      error: 'Internal server error',
      message: error.message,
    });
  }
};

// Handler functions
const handleGetWorkflows = async (pathParameters, user) => {
  // If ID is provided, get single workflow
  if (pathParameters && pathParameters.id) {
    const workflow = await getWorkflow(pathParameters.id);

    if (!workflow) {
      throw new Error('Workflow not found');
    }

    // Check if user has access to this workflow
    if (workflow.createdBy !== user.id && user.role !== 'ADMIN') {
      throw new Error('Access denied');
    }

    return createResponse(200, {
      success: true,
      data: workflow,
    });
  }

  // List workflows for user
  const workflows = await listWorkflows(user.id);

  return createResponse(200, {
    success: true,
    data: workflows,
    count: workflows.length,
  });
};

const handleCreateWorkflow = async (body, user) => {
  const workflowData = JSON.parse(body);

  // Validate workflow
  const validation = validateWorkflow(workflowData);
  if (!validation.valid) {
    throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
  }

  // Create workflow object
  const workflow = {
    id: uuidv4(),
    ...workflowData,
    enabled: workflowData.enabled !== undefined ? workflowData.enabled : true,
    createdBy: user.id,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  // Save to DynamoDB
  await putWorkflow(workflow);

  // Send event to SQS for processing
  if (WORKFLOW_QUEUE_URL) {
    const sqsParams = {
      QueueUrl: WORKFLOW_QUEUE_URL,
      MessageBody: JSON.stringify({
        action: 'WORKFLOW_CREATED',
        workflowId: workflow.id,
        userId: user.id,
        timestamp: new Date().toISOString(),
      }),
    };

    await sqs.sendMessage(sqsParams).promise();
  }

  return createResponse(201, {
    success: true,
    message: 'Workflow created successfully',
    data: workflow,
  });
};

const handleUpdateWorkflow = async (pathParameters, body, user) => {
  if (!pathParameters || !pathParameters.id) {
    throw new Error('Workflow ID is required');
  }

  const workflowId = pathParameters.id;
  const updates = JSON.parse(body);

  // Get existing workflow
  const existingWorkflow = await getWorkflow(workflowId);
  if (!existingWorkflow) {
    throw new Error('Workflow not found');
  }

  // Check access
  if (existingWorkflow.createdBy !== user.id && user.role !== 'ADMIN') {
    throw new Error('Access denied');
  }

  // Validate updates
  const updatedWorkflow = { ...existingWorkflow, ...updates };
  const validation = validateWorkflow(updatedWorkflow);
  if (!validation.valid) {
    throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
  }

  // Update workflow
  updatedWorkflow.updatedAt = new Date().toISOString();
  await putWorkflow(updatedWorkflow);

  // Send update event
  if (WORKFLOW_QUEUE_URL) {
    const sqsParams = {
      QueueUrl: WORKFLOW_QUEUE_URL,
      MessageBody: JSON.stringify({
        action: 'WORKFLOW_UPDATED',
        workflowId: workflowId,
        userId: user.id,
        timestamp: new Date().toISOString(),
      }),
    };

    await sqs.sendMessage(sqsParams).promise();
  }

  return createResponse(200, {
    success: true,
    message: 'Workflow updated successfully',
    data: updatedWorkflow,
  });
};

const handleDeleteWorkflow = async (pathParameters, user) => {
  if (!pathParameters || !pathParameters.id) {
    throw new Error('Workflow ID is required');
  }

  const workflowId = pathParameters.id;

  // Get workflow to check access
  const workflow = await getWorkflow(workflowId);
  if (!workflow) {
    throw new Error('Workflow not found');
  }

  // Check access
  if (workflow.createdBy !== user.id && user.role !== 'ADMIN') {
    throw new Error('Access denied');
  }

  // Delete workflow
  await deleteWorkflow(workflowId);

  // Send delete event
  if (WORKFLOW_QUEUE_URL) {
    const sqsParams = {
      QueueUrl: WORKFLOW_QUEUE_URL,
      MessageBody: JSON.stringify({
        action: 'WORKFLOW_DELETED',
        workflowId: workflowId,
        userId: user.id,
        timestamp: new Date().toISOString(),
      }),
    };

    await sqs.sendMessage(sqsParams).promise();
  }

  return createResponse(200, {
    success: true,
    message: 'Workflow deleted successfully',
  });
};
