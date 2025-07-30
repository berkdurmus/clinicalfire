const AWS = require('aws-sdk');

// Initialize AWS services
const ses = new AWS.SES();
const sns = new AWS.SNS();
const lambda = new AWS.Lambda();
const stepfunctions = new AWS.StepFunctions();

// Action handlers for different workflow actions
class ActionHandlers {
  constructor() {
    this.handlers = {
      send_email: this.handleSendEmail.bind(this),
      send_alert: this.handleSendAlert.bind(this),
      send_sms: this.handleSendSMS.bind(this),
      update_patient_record: this.handleUpdatePatientRecord.bind(this),
      schedule_task: this.handleScheduleTask.bind(this),
      trigger_workflow: this.handleTriggerWorkflow.bind(this),
      log_event: this.handleLogEvent.bind(this),
      send_webhook: this.handleSendWebhook.bind(this),
      create_care_plan: this.handleCreateCarePlan.bind(this),
      notify_team: this.handleNotifyTeam.bind(this),
    };
  }

  async executeAction(action, context) {
    const handler = this.handlers[action.type];
    if (!handler) {
      throw new Error(`Unknown action type: ${action.type}`);
    }

    const startTime = Date.now();
    try {
      const result = await handler(action, context);
      return {
        success: true,
        result,
        duration: Date.now() - startTime,
        actionType: action.type,
      };
    } catch (error) {
      console.error(`Action ${action.type} failed:`, error);
      return {
        success: false,
        error: error.message,
        duration: Date.now() - startTime,
        actionType: action.type,
      };
    }
  }

  // Email action using AWS SES
  async handleSendEmail(action, context) {
    const {
      to,
      subject,
      body,
      template,
      priority = 'normal',
      cc,
      bcc,
    } = action.params;

    if (!to || !subject) {
      throw new Error('Email action requires "to" and "subject" parameters');
    }

    // Build email parameters
    const emailParams = {
      Source: process.env.SES_FROM_EMAIL || 'noreply@clinical-fire.com',
      Destination: {
        ToAddresses: Array.isArray(to) ? to : [to],
      },
      Message: {
        Subject: {
          Data: this.replaceTemplateVariables(subject, context),
          Charset: 'UTF-8',
        },
        Body: {},
      },
      Tags: [
        { Name: 'WorkflowId', Value: context.workflowId },
        { Name: 'ExecutionId', Value: context.executionId },
        { Name: 'Priority', Value: priority },
        { Name: 'Department', Value: context.userDepartment || 'GENERAL' },
      ],
    };

    // Add CC and BCC if provided
    if (cc && cc.length > 0) {
      emailParams.Destination.CcAddresses = Array.isArray(cc) ? cc : [cc];
    }
    if (bcc && bcc.length > 0) {
      emailParams.Destination.BccAddresses = Array.isArray(bcc) ? bcc : [bcc];
    }

    // Handle body content
    if (template) {
      // Load template from S3 or use predefined templates
      const templateContent = await this.loadEmailTemplate(template, context);
      emailParams.Message.Body.Html = {
        Data: templateContent,
        Charset: 'UTF-8',
      };
    } else if (body) {
      const processedBody = this.replaceTemplateVariables(body, context);
      if (body.includes('<html>') || body.includes('<div>')) {
        emailParams.Message.Body.Html = {
          Data: processedBody,
          Charset: 'UTF-8',
        };
      } else {
        emailParams.Message.Body.Text = {
          Data: processedBody,
          Charset: 'UTF-8',
        };
      }
    }

    const result = await ses.sendEmail(emailParams).promise();

    return {
      messageId: result.MessageId,
      recipients: emailParams.Destination.ToAddresses,
      subject: emailParams.Message.Subject.Data,
      priority,
      timestamp: new Date().toISOString(),
    };
  }

  // Alert action using AWS SNS
  async handleSendAlert(action, context) {
    const {
      message,
      priority = 'normal',
      recipients = [],
      alertType = 'GENERAL',
      phoneNumbers = [],
      emailAddresses = [],
    } = action.params;

    if (!message) {
      throw new Error('Alert action requires "message" parameter');
    }

    const results = [];
    const processedMessage = this.replaceTemplateVariables(message, context);

    // Determine SNS topic based on priority and alert type
    const topicArn = this.getAlertTopicArn(priority, alertType);

    // Create alert message with metadata
    const alertPayload = {
      message: processedMessage,
      priority,
      alertType,
      workflowId: context.workflowId,
      executionId: context.executionId,
      patientId: context.patientId,
      triggeredBy: context.triggeredBy,
      timestamp: new Date().toISOString(),
      metadata: {
        userRole: context.userRole,
        department: context.userDepartment,
      },
    };

    // Send to SNS topic
    if (topicArn) {
      const snsParams = {
        TopicArn: topicArn,
        Message: JSON.stringify(alertPayload),
        Subject: `Clinical Alert - ${alertType} - ${priority.toUpperCase()}`,
        MessageAttributes: {
          priority: {
            DataType: 'String',
            StringValue: priority,
          },
          alertType: {
            DataType: 'String',
            StringValue: alertType,
          },
          workflowId: {
            DataType: 'String',
            StringValue: context.workflowId,
          },
        },
      };

      const snsResult = await sns.publish(snsParams).promise();
      results.push({
        type: 'sns_topic',
        messageId: snsResult.MessageId,
        topicArn,
      });
    }

    // Send direct SMS if phone numbers provided
    for (const phoneNumber of phoneNumbers) {
      try {
        const smsResult = await sns
          .publish({
            PhoneNumber: phoneNumber,
            Message: `CLINICAL ALERT: ${processedMessage}`,
            MessageAttributes: {
              'AWS.SNS.SMS.SenderID': {
                DataType: 'String',
                StringValue: 'ClinicalFire',
              },
              'AWS.SNS.SMS.SMSType': {
                DataType: 'String',
                StringValue:
                  priority === 'critical' ? 'Transactional' : 'Promotional',
              },
            },
          })
          .promise();

        results.push({
          type: 'sms',
          phoneNumber,
          messageId: smsResult.MessageId,
        });
      } catch (error) {
        console.error(`Failed to send SMS to ${phoneNumber}:`, error);
        results.push({
          type: 'sms',
          phoneNumber,
          error: error.message,
        });
      }
    }

    return {
      alertType,
      priority,
      message: processedMessage,
      results,
      timestamp: new Date().toISOString(),
    };
  }

  // SMS action using AWS SNS
  async handleSendSMS(action, context) {
    const { phoneNumber, message, senderId = 'ClinicalFire' } = action.params;

    if (!phoneNumber || !message) {
      throw new Error(
        'SMS action requires "phoneNumber" and "message" parameters'
      );
    }

    const processedMessage = this.replaceTemplateVariables(message, context);

    const smsParams = {
      PhoneNumber: phoneNumber,
      Message: processedMessage,
      MessageAttributes: {
        'AWS.SNS.SMS.SenderID': {
          DataType: 'String',
          StringValue: senderId,
        },
        'AWS.SNS.SMS.SMSType': {
          DataType: 'String',
          StringValue: 'Transactional',
        },
      },
    };

    const result = await sns.publish(smsParams).promise();

    return {
      phoneNumber,
      message: processedMessage,
      messageId: result.MessageId,
      timestamp: new Date().toISOString(),
    };
  }

  // Patient record update (placeholder for FHIR integration)
  async handleUpdatePatientRecord(action, context) {
    const { patientId, updates, recordType = 'general' } = action.params;

    if (!patientId) {
      throw new Error('Patient record update requires "patientId" parameter');
    }

    // In production, this would integrate with FHIR server or EMR system
    // For now, we'll log the update and store in DynamoDB

    const updateRecord = {
      patientId,
      recordType,
      updates,
      workflowId: context.workflowId,
      executionId: context.executionId,
      updatedBy: context.triggeredBy,
      timestamp: new Date().toISOString(),
      metadata: {
        userRole: context.userRole,
        department: context.userDepartment,
      },
    };

    // Store update record for audit trail
    const dynamoDB = new AWS.DynamoDB.DocumentClient();
    await dynamoDB
      .put({
        TableName:
          process.env.PATIENT_UPDATES_TABLE || process.env.EXECUTIONS_TABLE,
        Item: {
          PK: `PATIENT#${patientId}`,
          SK: `UPDATE#${context.executionId}#${Date.now()}`,
          ...updateRecord,
        },
      })
      .promise();

    // TODO: Integrate with actual EMR/FHIR system
    console.log('Patient record update logged:', updateRecord);

    return {
      patientId,
      recordType,
      updatesApplied: Object.keys(updates),
      timestamp: new Date().toISOString(),
      auditTrail: `UPDATE#${context.executionId}#${Date.now()}`,
    };
  }

  // Task scheduling using AWS Step Functions or EventBridge
  async handleScheduleTask(action, context) {
    const {
      taskType,
      scheduledFor,
      assignedTo,
      priority = 'normal',
      description,
      relatedPatient,
    } = action.params;

    if (!taskType || !scheduledFor) {
      throw new Error(
        'Task scheduling requires "taskType" and "scheduledFor" parameters'
      );
    }

    const taskId = `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const scheduledDate = new Date(scheduledFor);

    if (scheduledDate <= new Date()) {
      throw new Error('Scheduled time must be in the future');
    }

    // Create task record
    const task = {
      taskId,
      taskType,
      scheduledFor: scheduledDate.toISOString(),
      assignedTo,
      priority,
      description: this.replaceTemplateVariables(description || '', context),
      relatedPatient,
      status: 'scheduled',
      createdBy: context.triggeredBy,
      workflowId: context.workflowId,
      executionId: context.executionId,
      createdAt: new Date().toISOString(),
    };

    // Store task in DynamoDB
    const dynamoDB = new AWS.DynamoDB.DocumentClient();
    await dynamoDB
      .put({
        TableName: process.env.TASKS_TABLE || process.env.EXECUTIONS_TABLE,
        Item: {
          PK: `TASK#${taskId}`,
          SK: 'METADATA',
          GSI1PK: `ASSIGNED#${assignedTo}`,
          GSI1SK: `SCHEDULED#${scheduledDate.toISOString()}`,
          ...task,
        },
      })
      .promise();

    // Schedule reminder using EventBridge (if reminder time is specified)
    if (action.params.reminderMinutes) {
      const reminderTime = new Date(
        scheduledDate.getTime() - action.params.reminderMinutes * 60 * 1000
      );
      if (reminderTime > new Date()) {
        // TODO: Schedule EventBridge rule for reminder
        console.log(`Reminder scheduled for ${reminderTime.toISOString()}`);
      }
    }

    return {
      taskId,
      taskType,
      scheduledFor: scheduledDate.toISOString(),
      assignedTo,
      priority,
      status: 'scheduled',
    };
  }

  // Trigger another workflow
  async handleTriggerWorkflow(action, context) {
    const { workflowName, workflowId, data = {}, delay = 0 } = action.params;

    if (!workflowName && !workflowId) {
      throw new Error(
        'Workflow trigger requires either "workflowName" or "workflowId"'
      );
    }

    const triggerData = {
      ...data,
      triggeredBy: 'workflow',
      parentWorkflowId: context.workflowId,
      parentExecutionId: context.executionId,
    };

    if (delay > 0) {
      // Schedule for later execution using Step Functions
      const stateMachineParams = {
        stateMachineArn: process.env.WORKFLOW_TRIGGER_STATE_MACHINE,
        input: JSON.stringify({
          workflowName,
          workflowId,
          data: triggerData,
          delaySeconds: delay,
        }),
      };

      const result = await stepfunctions
        .startExecution(stateMachineParams)
        .promise();

      return {
        triggerType: 'delayed',
        workflowName: workflowName || workflowId,
        delaySeconds: delay,
        executionArn: result.executionArn,
        scheduledFor: new Date(Date.now() + delay * 1000).toISOString(),
      };
    } else {
      // Immediate execution via Lambda invocation
      const lambdaParams = {
        FunctionName: process.env.WORKFLOW_EXECUTION_FUNCTION,
        InvocationType: 'Event', // Asynchronous
        Payload: JSON.stringify({
          httpMethod: 'POST',
          body: JSON.stringify({
            workflowName,
            workflowId,
            ...triggerData,
          }),
          requestContext: {
            authorizer: {
              claims: {
                sub: context.triggeredBy,
                'custom:role': context.userRole,
                'custom:department': context.userDepartment,
              },
            },
          },
        }),
      };

      const result = await lambda.invoke(lambdaParams).promise();

      return {
        triggerType: 'immediate',
        workflowName: workflowName || workflowId,
        invocationResult: result.StatusCode === 202 ? 'success' : 'failed',
        timestamp: new Date().toISOString(),
      };
    }
  }

  // Log event for audit/monitoring
  async handleLogEvent(action, context) {
    const {
      level = 'info',
      message,
      category = 'workflow',
      data = {},
    } = action.params;

    const logEntry = {
      level,
      message: this.replaceTemplateVariables(message, context),
      category,
      data,
      workflowId: context.workflowId,
      executionId: context.executionId,
      patientId: context.patientId,
      userId: context.triggeredBy,
      timestamp: new Date().toISOString(),
    };

    // Log to CloudWatch
    console.log(`[${level.toUpperCase()}] ${category}:`, logEntry);

    // Store in DynamoDB for audit trail
    const dynamoDB = new AWS.DynamoDB.DocumentClient();
    await dynamoDB
      .put({
        TableName: process.env.AUDIT_LOGS_TABLE || process.env.EXECUTIONS_TABLE,
        Item: {
          PK: `LOG#${Date.now()}`,
          SK: `${category}#${level}`,
          GSI1PK: `WORKFLOW#${context.workflowId}`,
          GSI1SK: `LOG#${new Date().toISOString()}`,
          ...logEntry,
        },
      })
      .promise();

    return {
      logged: true,
      level,
      category,
      timestamp: logEntry.timestamp,
    };
  }

  // Send webhook
  async handleSendWebhook(action, context) {
    const { url, method = 'POST', headers = {}, data = {} } = action.params;

    if (!url) {
      throw new Error('Webhook action requires "url" parameter');
    }

    const webhookData = {
      ...data,
      workflowId: context.workflowId,
      executionId: context.executionId,
      timestamp: new Date().toISOString(),
    };

    // Use Lambda to make HTTP request (or SNS/SQS for reliability)
    const result = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'ClinicalFire-Workflow-Engine/1.0',
        ...headers,
      },
      body: JSON.stringify(webhookData),
    });

    return {
      url,
      method,
      statusCode: result.status,
      success: result.ok,
      timestamp: new Date().toISOString(),
    };
  }

  // Create care plan
  async handleCreateCarePlan(action, context) {
    const {
      patientId,
      planType,
      template,
      goals = [],
      interventions = [],
    } = action.params;

    if (!patientId || !planType) {
      throw new Error('Care plan creation requires "patientId" and "planType"');
    }

    const carePlanId = `cp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const carePlan = {
      carePlanId,
      patientId,
      planType,
      goals,
      interventions,
      createdBy: context.triggeredBy,
      workflowId: context.workflowId,
      executionId: context.executionId,
      status: 'active',
      createdAt: new Date().toISOString(),
    };

    // Store in DynamoDB
    const dynamoDB = new AWS.DynamoDB.DocumentClient();
    await dynamoDB
      .put({
        TableName: process.env.CARE_PLANS_TABLE || process.env.EXECUTIONS_TABLE,
        Item: {
          PK: `CAREPLAN#${carePlanId}`,
          SK: 'METADATA',
          GSI1PK: `PATIENT#${patientId}`,
          GSI1SK: `CAREPLAN#${new Date().toISOString()}`,
          ...carePlan,
        },
      })
      .promise();

    return {
      carePlanId,
      patientId,
      planType,
      status: 'created',
      goalsCount: goals.length,
      interventionsCount: interventions.length,
    };
  }

  // Notify team members
  async handleNotifyTeam(action, context) {
    const {
      teamMembers = [],
      message,
      urgency = 'normal',
      channels = ['email'],
    } = action.params;

    if (teamMembers.length === 0) {
      throw new Error('Team notification requires "teamMembers" array');
    }

    const results = [];
    const processedMessage = this.replaceTemplateVariables(message, context);

    for (const member of teamMembers) {
      for (const channel of channels) {
        try {
          let result;
          switch (channel) {
            case 'email':
              result = await this.handleSendEmail(
                {
                  type: 'send_email',
                  params: {
                    to: member.email,
                    subject: `Team Notification - ${urgency.toUpperCase()}`,
                    body: processedMessage,
                    priority: urgency,
                  },
                },
                context
              );
              break;
            case 'sms':
              if (member.phone) {
                result = await this.handleSendSMS(
                  {
                    type: 'send_sms',
                    params: {
                      phoneNumber: member.phone,
                      message: processedMessage,
                    },
                  },
                  context
                );
              }
              break;
            case 'slack':
              // TODO: Implement Slack integration
              result = { message: 'Slack integration not yet implemented' };
              break;
          }

          results.push({
            member: member.name || member.email,
            channel,
            success: true,
            result,
          });
        } catch (error) {
          results.push({
            member: member.name || member.email,
            channel,
            success: false,
            error: error.message,
          });
        }
      }
    }

    return {
      teamSize: teamMembers.length,
      channelsUsed: channels,
      results,
      timestamp: new Date().toISOString(),
    };
  }

  // Helper methods
  replaceTemplateVariables(text, context) {
    if (!text || typeof text !== 'string') return text;

    return text
      .replace(/\{\{workflowId\}\}/g, context.workflowId || '')
      .replace(/\{\{executionId\}\}/g, context.executionId || '')
      .replace(/\{\{patientId\}\}/g, context.patientId || '')
      .replace(/\{\{triggeredBy\}\}/g, context.triggeredBy || '')
      .replace(/\{\{timestamp\}\}/g, new Date().toISOString())
      .replace(/\{\{date\}\}/g, new Date().toLocaleDateString())
      .replace(/\{\{time\}\}/g, new Date().toLocaleTimeString());
  }

  async loadEmailTemplate(templateName, context) {
    // In production, load from S3 bucket
    const templates = {
      critical_alert: `
        <html>
          <body style="font-family: Arial, sans-serif;">
            <h2 style="color: #d32f2f;">CRITICAL ALERT</h2>
            <p>Workflow: <strong>{{workflowId}}</strong></p>
            <p>Patient: <strong>{{patientId}}</strong></p>
            <p>Time: <strong>{{timestamp}}</strong></p>
            <div style="background: #fff3cd; padding: 10px; border-left: 4px solid #ffc107;">
              {{message}}
            </div>
          </body>
        </html>
      `,
      task_reminder: `
        <html>
          <body style="font-family: Arial, sans-serif;">
            <h3>Task Reminder</h3>
            <p>You have a scheduled task:</p>
            <p><strong>{{taskType}}</strong></p>
            <p>Due: <strong>{{scheduledFor}}</strong></p>
            <p>Patient: <strong>{{patientId}}</strong></p>
          </body>
        </html>
      `,
    };

    const template = templates[templateName] || templates['critical_alert'];
    return this.replaceTemplateVariables(template, context);
  }

  getAlertTopicArn(priority, alertType) {
    const topics = {
      critical: process.env.CRITICAL_ALERTS_TOPIC,
      high: process.env.HIGH_PRIORITY_ALERTS_TOPIC,
      normal: process.env.NORMAL_ALERTS_TOPIC,
      low: process.env.LOW_PRIORITY_ALERTS_TOPIC,
    };

    return topics[priority] || topics['normal'];
  }
}

module.exports = { ActionHandlers };
