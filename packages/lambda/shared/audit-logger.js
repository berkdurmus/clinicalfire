const AWS = require('aws-sdk');

// Initialize AWS services
const dynamoDB = new AWS.DynamoDB.DocumentClient();
const cloudWatch = new AWS.CloudWatch();

class AuditLogger {
  constructor() {
    this.auditTable =
      process.env.AUDIT_LOGS_TABLE || process.env.EXECUTIONS_TABLE;
    this.enableCloudWatchMetrics =
      process.env.ENABLE_CLOUDWATCH_METRICS !== 'false';
  }

  /**
   * Log a healthcare audit event
   */
  async logAuditEvent(eventData) {
    const auditEntry = {
      auditId: `audit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      ...eventData,
      compliance: {
        hipaaRequired: true,
        dataClassification: this.classifyData(eventData),
        retentionPeriod: this.getRetentionPeriod(eventData.eventType),
      },
    };

    try {
      // Store in DynamoDB for long-term retention
      await this.storeToDynamoDB(auditEntry);

      // Log to CloudWatch for monitoring
      await this.logToCloudWatch(auditEntry);

      // Send metrics if enabled
      if (this.enableCloudWatchMetrics) {
        await this.sendMetrics(auditEntry);
      }

      console.log('Audit event logged:', {
        auditId: auditEntry.auditId,
        eventType: auditEntry.eventType,
        userId: auditEntry.userId,
        resourceType: auditEntry.resourceType,
      });

      return auditEntry.auditId;
    } catch (error) {
      console.error('Failed to log audit event:', error);
      // Don't throw - audit failures shouldn't break workflows
      return null;
    }
  }

  /**
   * Log user authentication events
   */
  async logAuthEvent(
    userId,
    eventType,
    ipAddress,
    userAgent,
    success = true,
    additionalData = {}
  ) {
    return this.logAuditEvent({
      eventType: `auth_${eventType}`,
      category: 'authentication',
      userId,
      success,
      ipAddress,
      userAgent,
      ...additionalData,
    });
  }

  /**
   * Log data access events
   */
  async logDataAccess(
    userId,
    resourceType,
    resourceId,
    action,
    patientId = null,
    additionalData = {}
  ) {
    return this.logAuditEvent({
      eventType: 'data_access',
      category: 'data_access',
      userId,
      resourceType,
      resourceId,
      action, // 'read', 'create', 'update', 'delete'
      patientId,
      ...additionalData,
    });
  }

  /**
   * Log workflow execution events
   */
  async logWorkflowEvent(
    workflowId,
    executionId,
    userId,
    action,
    patientId = null,
    additionalData = {}
  ) {
    return this.logAuditEvent({
      eventType: 'workflow_execution',
      category: 'workflow',
      userId,
      workflowId,
      executionId,
      action, // 'triggered', 'completed', 'failed', 'cancelled'
      patientId,
      ...additionalData,
    });
  }

  /**
   * Log configuration changes
   */
  async logConfigChange(userId, configType, changes, previousValues = {}) {
    return this.logAuditEvent({
      eventType: 'config_change',
      category: 'configuration',
      userId,
      configType,
      changes,
      previousValues,
      changeCount: Object.keys(changes).length,
    });
  }

  /**
   * Log security events
   */
  async logSecurityEvent(
    eventType,
    userId,
    severity,
    description,
    ipAddress = null,
    additionalData = {}
  ) {
    return this.logAuditEvent({
      eventType: `security_${eventType}`,
      category: 'security',
      userId,
      severity, // 'low', 'medium', 'high', 'critical'
      description,
      ipAddress,
      ...additionalData,
    });
  }

  /**
   * Log PHI access events (special handling for patient data)
   */
  async logPHIAccess(
    userId,
    patientId,
    action,
    dataType,
    justification,
    additionalData = {}
  ) {
    return this.logAuditEvent({
      eventType: 'phi_access',
      category: 'phi_access',
      userId,
      patientId,
      action,
      dataType, // 'medical_record', 'lab_results', 'vitals', etc.
      justification,
      requiresReview: this.requiresReview(action, dataType),
      ...additionalData,
    });
  }

  /**
   * Store audit entry in DynamoDB
   */
  async storeToDynamoDB(auditEntry) {
    const params = {
      TableName: this.auditTable,
      Item: {
        PK: `AUDIT#${auditEntry.auditId}`,
        SK: `${auditEntry.category}#${auditEntry.timestamp}`,
        GSI1PK: `USER#${auditEntry.userId}`,
        GSI1SK: `AUDIT#${auditEntry.timestamp}`,
        GSI2PK: `CATEGORY#${auditEntry.category}`,
        GSI2SK: `AUDIT#${auditEntry.timestamp}`,
        TTL: this.calculateTTL(auditEntry.compliance.retentionPeriod),
        ...auditEntry,
      },
    };

    await dynamoDB.put(params).promise();
  }

  /**
   * Log to CloudWatch for real-time monitoring
   */
  async logToCloudWatch(auditEntry) {
    const logData = {
      auditId: auditEntry.auditId,
      timestamp: auditEntry.timestamp,
      eventType: auditEntry.eventType,
      category: auditEntry.category,
      userId: auditEntry.userId,
      success: auditEntry.success,
      severity: auditEntry.severity,
      resourceType: auditEntry.resourceType,
      resourceId: auditEntry.resourceId,
      patientId: auditEntry.patientId,
    };

    console.log('[AUDIT]', JSON.stringify(logData));
  }

  /**
   * Send CloudWatch metrics
   */
  async sendMetrics(auditEntry) {
    const metrics = [];

    // Base metrics for all events
    metrics.push({
      MetricName: 'AuditEvents',
      Dimensions: [
        { Name: 'EventType', Value: auditEntry.eventType },
        { Name: 'Category', Value: auditEntry.category },
      ],
      Value: 1,
      Unit: 'Count',
    });

    // Success/failure metrics
    if (auditEntry.success !== undefined) {
      metrics.push({
        MetricName: auditEntry.success ? 'SuccessfulEvents' : 'FailedEvents',
        Dimensions: [{ Name: 'EventType', Value: auditEntry.eventType }],
        Value: 1,
        Unit: 'Count',
      });
    }

    // Security severity metrics
    if (auditEntry.severity) {
      metrics.push({
        MetricName: 'SecurityEvents',
        Dimensions: [{ Name: 'Severity', Value: auditEntry.severity }],
        Value: 1,
        Unit: 'Count',
      });
    }

    // PHI access metrics
    if (auditEntry.category === 'phi_access') {
      metrics.push({
        MetricName: 'PHIAccess',
        Dimensions: [
          { Name: 'DataType', Value: auditEntry.dataType || 'unknown' },
          { Name: 'Action', Value: auditEntry.action },
        ],
        Value: 1,
        Unit: 'Count',
      });
    }

    // Send metrics to CloudWatch
    if (metrics.length > 0) {
      const params = {
        Namespace: 'ClinicalFire/Audit',
        MetricData: metrics.map((metric) => ({
          ...metric,
          Timestamp: new Date(auditEntry.timestamp),
        })),
      };

      await cloudWatch.putMetricData(params).promise();
    }
  }

  /**
   * Classify data for compliance purposes
   */
  classifyData(eventData) {
    if (eventData.patientId || eventData.category === 'phi_access') {
      return 'PHI'; // Protected Health Information
    }
    if (
      eventData.category === 'authentication' ||
      eventData.category === 'security'
    ) {
      return 'PII'; // Personally Identifiable Information
    }
    if (eventData.category === 'configuration') {
      return 'CONFIG'; // Configuration data
    }
    return 'OPERATIONAL'; // General operational data
  }

  /**
   * Get retention period based on event type (in days)
   */
  getRetentionPeriod(eventType) {
    const retentionPolicies = {
      phi_access: 7 * 365, // 7 years for PHI access
      auth_login: 90, // 90 days for login events
      auth_logout: 90, // 90 days for logout events
      data_access: 365, // 1 year for general data access
      workflow_execution: 7 * 365, // 7 years for healthcare workflows
      config_change: 7 * 365, // 7 years for config changes
      security_event: 7 * 365, // 7 years for security events
    };

    return retentionPolicies[eventType] || 365; // Default 1 year
  }

  /**
   * Calculate TTL for DynamoDB item
   */
  calculateTTL(retentionDays) {
    const retentionSeconds = retentionDays * 24 * 60 * 60;
    return Math.floor(Date.now() / 1000) + retentionSeconds;
  }

  /**
   * Determine if access requires additional review
   */
  requiresReview(action, dataType) {
    const reviewRequired = [
      'medical_record',
      'psychiatric_notes',
      'substance_abuse',
      'genetic_information',
    ];

    return reviewRequired.includes(dataType) || action === 'bulk_export';
  }

  /**
   * Create audit trail for a complete workflow execution
   */
  async createWorkflowAuditTrail(workflowExecution) {
    const {
      workflowId,
      executionId,
      userId,
      patientId,
      triggerType,
      actionResults,
      status,
      duration,
      startTime,
      endTime,
    } = workflowExecution;

    // Log workflow start
    await this.logWorkflowEvent(
      workflowId,
      executionId,
      userId,
      'started',
      patientId,
      {
        triggerType,
        startTime,
      }
    );

    // Log each action execution
    for (const actionResult of actionResults) {
      await this.logAuditEvent({
        eventType: 'workflow_action',
        category: 'workflow',
        userId,
        workflowId,
        executionId,
        patientId,
        actionType: actionResult.actionType,
        success: actionResult.success,
        duration: actionResult.duration,
        error: actionResult.error,
      });
    }

    // Log workflow completion
    await this.logWorkflowEvent(
      workflowId,
      executionId,
      userId,
      status === 'COMPLETED' ? 'completed' : 'failed',
      patientId,
      {
        duration,
        endTime,
        actionCount: actionResults.length,
        successfulActions: actionResults.filter((r) => r.success).length,
      }
    );

    return {
      workflowId,
      executionId,
      auditEventsCreated: actionResults.length + 2, // start + actions + end
      complianceStatus: 'logged',
    };
  }

  /**
   * Query audit logs with filters
   */
  async queryAuditLogs(filters = {}) {
    const {
      userId,
      category,
      eventType,
      startDate,
      endDate,
      patientId,
      limit = 100,
    } = filters;

    let params = {
      TableName: this.auditTable,
      Limit: limit,
    };

    // Build query based on available GSIs
    if (userId) {
      params.IndexName = 'GSI1';
      params.KeyConditionExpression = 'GSI1PK = :userId';
      params.ExpressionAttributeValues = { ':userId': `USER#${userId}` };
    } else if (category) {
      params.IndexName = 'GSI2';
      params.KeyConditionExpression = 'GSI2PK = :category';
      params.ExpressionAttributeValues = {
        ':category': `CATEGORY#${category}`,
      };
    } else {
      // Scan with filters (less efficient but comprehensive)
      params = {
        TableName: this.auditTable,
        FilterExpression: 'begins_with(PK, :prefix)',
        ExpressionAttributeValues: { ':prefix': 'AUDIT#' },
        Limit: limit,
      };
    }

    // Add additional filters
    const filterExpressions = [];
    if (eventType) {
      filterExpressions.push('eventType = :eventType');
      params.ExpressionAttributeValues[':eventType'] = eventType;
    }
    if (patientId) {
      filterExpressions.push('patientId = :patientId');
      params.ExpressionAttributeValues[':patientId'] = patientId;
    }
    if (startDate) {
      filterExpressions.push('#timestamp >= :startDate');
      params.ExpressionAttributeNames = { '#timestamp': 'timestamp' };
      params.ExpressionAttributeValues[':startDate'] = startDate;
    }
    if (endDate) {
      filterExpressions.push('#timestamp <= :endDate');
      params.ExpressionAttributeNames = params.ExpressionAttributeNames || {};
      params.ExpressionAttributeNames['#timestamp'] = 'timestamp';
      params.ExpressionAttributeValues[':endDate'] = endDate;
    }

    if (filterExpressions.length > 0) {
      const existingFilter = params.FilterExpression;
      params.FilterExpression = existingFilter
        ? `${existingFilter} AND ${filterExpressions.join(' AND ')}`
        : filterExpressions.join(' AND ');
    }

    const result = await dynamoDB.query(params).promise();
    return result.Items || [];
  }
}

module.exports = { AuditLogger };
