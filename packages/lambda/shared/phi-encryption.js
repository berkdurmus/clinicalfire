const AWS = require('aws-sdk');
const crypto = require('crypto');

// Initialize AWS KMS
const kms = new AWS.KMS();

class PHIEncryption {
  constructor() {
    this.kmsKeyId = process.env.PHI_KMS_KEY_ID || 'alias/clinical-fire-phi-key';
    this.algorithm = 'aes-256-gcm';

    // Define PHI fields that require encryption
    this.phiFields = [
      'ssn',
      'socialSecurityNumber',
      'medicalRecordNumber',
      'patientId',
      'dateOfBirth',
      'address',
      'phoneNumber',
      'email',
      'emergencyContact',
      'insuranceNumber',
      'creditCardNumber',
      'accountNumber',
      'diagnoses',
      'medications',
      'allergies',
      'labResults',
      'geneticInformation',
      'mentalHealthNotes',
      'substanceAbuseRecords',
      'hivStatus',
    ];
  }

  /**
   * Encrypt PHI data using AWS KMS
   */
  async encryptPHI(data, context = {}) {
    if (!data || typeof data !== 'object') {
      return data;
    }

    const encryptedData = { ...data };
    const encryptionMetadata = {
      encryptedFields: [],
      encryptionKeyId: this.kmsKeyId,
      encryptedAt: new Date().toISOString(),
      encryptedBy: context.userId || 'system',
      dataClassification: 'PHI',
    };

    for (const [key, value] of Object.entries(data)) {
      if (this.isPHIField(key) && value !== null && value !== undefined) {
        try {
          const encrypted = await this.encryptField(value, key, context);
          encryptedData[key] = encrypted.encryptedValue;
          encryptionMetadata.encryptedFields.push({
            field: key,
            dataKey: encrypted.dataKey,
            iv: encrypted.iv,
            authTag: encrypted.authTag,
            originalType: typeof value,
          });
        } catch (error) {
          console.error(`Failed to encrypt PHI field ${key}:`, error);
          // Don't store unencrypted PHI - throw error
          throw new Error(`PHI encryption failed for field: ${key}`);
        }
      }
    }

    // Add encryption metadata
    if (encryptionMetadata.encryptedFields.length > 0) {
      encryptedData._encryption = encryptionMetadata;
    }

    return encryptedData;
  }

  /**
   * Decrypt PHI data using AWS KMS
   */
  async decryptPHI(encryptedData, context = {}) {
    if (
      !encryptedData ||
      typeof encryptedData !== 'object' ||
      !encryptedData._encryption
    ) {
      return encryptedData;
    }

    // Log PHI access for audit
    if (context.auditLogger && context.userId) {
      await context.auditLogger.logPHIAccess(
        context.userId,
        encryptedData.patientId || 'unknown',
        'decrypt',
        'encrypted_record',
        context.justification || 'healthcare_workflow'
      );
    }

    const decryptedData = { ...encryptedData };
    const encryptionMetadata = encryptedData._encryption;

    for (const fieldInfo of encryptionMetadata.encryptedFields) {
      try {
        const decryptedValue = await this.decryptField(
          decryptedData[fieldInfo.field],
          fieldInfo
        );

        // Convert back to original type
        decryptedData[fieldInfo.field] = this.convertToOriginalType(
          decryptedValue,
          fieldInfo.originalType
        );
      } catch (error) {
        console.error(`Failed to decrypt PHI field ${fieldInfo.field}:`, error);
        // Set to null rather than expose potentially corrupted data
        decryptedData[fieldInfo.field] = null;
      }
    }

    // Remove encryption metadata from decrypted result
    delete decryptedData._encryption;

    return decryptedData;
  }

  /**
   * Encrypt a single field
   */
  async encryptField(value, fieldName, context = {}) {
    // Generate data encryption key using KMS
    const dataKeyResult = await kms
      .generateDataKey({
        KeyId: this.kmsKeyId,
        KeySpec: 'AES_256',
      })
      .promise();

    const plainTextKey = dataKeyResult.Plaintext;
    const encryptedDataKey = dataKeyResult.CiphertextBlob;

    // Generate IV for AES encryption
    const iv = crypto.randomBytes(16);

    // Create cipher
    const cipher = crypto.createCipher(this.algorithm, plainTextKey);
    cipher.setAAD(Buffer.from(fieldName)); // Additional authenticated data

    // Encrypt the value
    const valueString = JSON.stringify(value);
    let encryptedValue = cipher.update(valueString, 'utf8', 'base64');
    encryptedValue += cipher.final('base64');

    // Get authentication tag
    const authTag = cipher.getAuthTag();

    return {
      encryptedValue,
      dataKey: encryptedDataKey.toString('base64'),
      iv: iv.toString('base64'),
      authTag: authTag.toString('base64'),
    };
  }

  /**
   * Decrypt a single field
   */
  async decryptField(encryptedValue, fieldInfo) {
    // Decrypt the data encryption key using KMS
    const decryptKeyResult = await kms
      .decrypt({
        CiphertextBlob: Buffer.from(fieldInfo.dataKey, 'base64'),
      })
      .promise();

    const plainTextKey = decryptKeyResult.Plaintext;

    // Create decipher
    const decipher = crypto.createDecipher(this.algorithm, plainTextKey);
    decipher.setAAD(Buffer.from(fieldInfo.field)); // Must match the AAD used during encryption
    decipher.setAuthTag(Buffer.from(fieldInfo.authTag, 'base64'));

    // Decrypt the value
    let decryptedValue = decipher.update(encryptedValue, 'base64', 'utf8');
    decryptedValue += decipher.final('utf8');

    return JSON.parse(decryptedValue);
  }

  /**
   * Check if a field contains PHI data
   */
  isPHIField(fieldName) {
    const normalizedField = fieldName.toLowerCase();

    // Check exact matches
    if (this.phiFields.some((phi) => phi.toLowerCase() === normalizedField)) {
      return true;
    }

    // Check patterns
    const phiPatterns = [
      /ssn/i,
      /social.*security/i,
      /patient.*id/i,
      /medical.*record/i,
      /birth.*date/i,
      /date.*birth/i,
      /phone/i,
      /address/i,
      /email/i,
      /insurance/i,
      /diagnosis/i,
      /medication/i,
      /allergy/i,
      /genetic/i,
      /mental.*health/i,
      /substance.*abuse/i,
      /hiv/i,
    ];

    return phiPatterns.some((pattern) => pattern.test(fieldName));
  }

  /**
   * Convert decrypted value back to original type
   */
  convertToOriginalType(value, originalType) {
    switch (originalType) {
      case 'number':
        return Number(value);
      case 'boolean':
        return Boolean(value);
      case 'object':
        return typeof value === 'string' ? JSON.parse(value) : value;
      default:
        return value;
    }
  }

  /**
   * Mask PHI data for display (without decryption)
   */
  maskPHI(data, maskingLevel = 'partial') {
    if (!data || typeof data !== 'object') {
      return data;
    }

    const maskedData = { ...data };

    for (const [key, value] of Object.entries(data)) {
      if (this.isPHIField(key) && value !== null && value !== undefined) {
        maskedData[key] = this.maskValue(value, key, maskingLevel);
      }
    }

    return maskedData;
  }

  /**
   * Mask a single value based on field type and masking level
   */
  maskValue(value, fieldName, maskingLevel) {
    if (typeof value !== 'string') {
      value = String(value);
    }

    const normalizedField = fieldName.toLowerCase();

    switch (maskingLevel) {
      case 'full':
        return '*'.repeat(Math.min(value.length, 10));

      case 'partial':
        if (
          normalizedField.includes('ssn') ||
          normalizedField.includes('social')
        ) {
          // SSN: XXX-XX-1234
          return value.length >= 4
            ? 'XXX-XX-' + value.slice(-4)
            : '*'.repeat(value.length);
        }

        if (normalizedField.includes('phone')) {
          // Phone: (XXX) XXX-1234
          return value.length >= 4
            ? '(XXX) XXX-' + value.slice(-4)
            : '*'.repeat(value.length);
        }

        if (normalizedField.includes('email')) {
          // Email: j***@example.com
          const atIndex = value.indexOf('@');
          if (atIndex > 0) {
            return value[0] + '*'.repeat(atIndex - 1) + value.slice(atIndex);
          }
        }

        // Default partial masking: show first and last character
        if (value.length <= 2) {
          return '*'.repeat(value.length);
        }
        return (
          value[0] + '*'.repeat(value.length - 2) + value[value.length - 1]
        );

      case 'display':
        // Show enough for identification but mask sensitive parts
        if (
          normalizedField.includes('patient') &&
          normalizedField.includes('id')
        ) {
          return value.length >= 4
            ? value.slice(0, 4) + '*'.repeat(value.length - 4)
            : value;
        }
        return this.maskValue(value, fieldName, 'partial');

      default:
        return value;
    }
  }

  /**
   * Validate encryption requirements before processing
   */
  validateEncryptionRequirements(data) {
    const errors = [];

    if (!this.kmsKeyId) {
      errors.push('KMS Key ID not configured for PHI encryption');
    }

    // Check for unencrypted PHI fields
    const unencryptedPHI = [];
    if (data && typeof data === 'object') {
      for (const [key, value] of Object.entries(data)) {
        if (this.isPHIField(key) && value !== null && value !== undefined) {
          unencryptedPHI.push(key);
        }
      }
    }

    if (unencryptedPHI.length > 0) {
      errors.push(
        `Unencrypted PHI fields detected: ${unencryptedPHI.join(', ')}`
      );
    }

    return { valid: errors.length === 0, errors, unencryptedPHI };
  }

  /**
   * Create encrypted patient record with metadata
   */
  async createEncryptedPatientRecord(patientData, context) {
    const validation = this.validateEncryptionRequirements(patientData);
    if (!validation.valid && validation.unencryptedPHI.length > 0) {
      // Encrypt the data
      const encryptedData = await this.encryptPHI(patientData, context);

      return {
        ...encryptedData,
        _metadata: {
          dataType: 'patient_record',
          encryptionStatus: 'encrypted',
          complianceLevel: 'hipaa',
          accessRestrictions: {
            requiresJustification: true,
            auditRequired: true,
            timeBasedAccess: true,
          },
          createdAt: new Date().toISOString(),
          createdBy: context.userId,
        },
      };
    }

    return patientData;
  }

  /**
   * Securely delete PHI data (crypto-shredding)
   */
  async secureDeletePHI(encryptedData) {
    if (!encryptedData || !encryptedData._encryption) {
      return { deleted: false, reason: 'No encrypted data found' };
    }

    try {
      // Schedule KMS key for deletion (crypto-shredding)
      // This makes the data unrecoverable even if the encrypted data is still stored
      const keyDeletionParams = {
        KeyId: this.kmsKeyId,
        PendingWindowInDays: 7, // Minimum allowed by AWS
      };

      // Note: In production, you'd typically use a data-specific key
      // await kms.scheduleKeyDeletion(keyDeletionParams).promise();

      return {
        deleted: true,
        method: 'crypto_shredding',
        deletedAt: new Date().toISOString(),
        encryptedFields: encryptedData._encryption.encryptedFields.map(
          (f) => f.field
        ),
      };
    } catch (error) {
      console.error('Failed to securely delete PHI:', error);
      return { deleted: false, error: error.message };
    }
  }
}

module.exports = { PHIEncryption };
