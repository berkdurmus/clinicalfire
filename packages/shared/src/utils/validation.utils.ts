import { z } from 'zod';

/**
 * Validates data against a Zod schema and returns either the parsed data or validation errors
 */
export function validateData<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; errors: z.ZodError } {
  try {
    const parsedData = schema.parse(data);
    return { success: true, data: parsedData };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, errors: error };
    }
    throw error;
  }
}

/**
 * Safely parses data with a Zod schema, returning undefined if validation fails
 */
export function safeParseData<T>(schema: z.ZodSchema<T>, data: unknown): T | undefined {
  const result = schema.safeParse(data);
  return result.success ? result.data : undefined;
}

/**
 * Formats Zod validation errors into a more readable format
 */
export function formatValidationErrors(error: z.ZodError): Record<string, string[]> {
  const formattedErrors: Record<string, string[]> = {};
  
  error.errors.forEach((err) => {
    const path = err.path.join('.');
    if (!formattedErrors[path]) {
      formattedErrors[path] = [];
    }
    formattedErrors[path].push(err.message);
  });
  
  return formattedErrors;
}

/**
 * Creates a validation middleware for API endpoints
 */
export function createValidator<T>(schema: z.ZodSchema<T>) {
  return (data: unknown) => {
    const result = validateData(schema, data);
    if (!result.success) {
      throw new Error(`Validation failed: ${JSON.stringify(formatValidationErrors(result.errors))}`);
    }
    return result.data;
  };
}

/**
 * Validates healthcare identifiers (MRN, etc.)
 */
export const healthcareValidators = {
  mrn: z.string().regex(/^[A-Z0-9]{6,12}$/, 'Invalid MRN format'),
  npi: z.string().regex(/^\d{10}$/, 'Invalid NPI format'),
  icd10: z.string().regex(/^[A-Z]\d{2}(\.\d{1,3})?$/, 'Invalid ICD-10 format'),
  cpt: z.string().regex(/^\d{5}$/, 'Invalid CPT code format'),
  loinc: z.string().regex(/^\d{1,5}-\d{1}$/, 'Invalid LOINC code format'),
};

/**
 * Validates FHIR resource identifiers
 */
export const fhirValidators = {
  resourceId: z.string().regex(/^[A-Za-z0-9\-\.]{1,64}$/, 'Invalid FHIR resource ID'),
  reference: z.string().regex(/^[A-Za-z]+\/[A-Za-z0-9\-\.]{1,64}$/, 'Invalid FHIR reference'),
};

/**
 * Common data sanitization functions
 */
export const sanitizers = {
  /**
   * Sanitizes phone numbers to a standard format
   */
  phone: (phone: string): string => {
    return phone.replace(/\D/g, '');
  },
  
  /**
   * Sanitizes email addresses
   */
  email: (email: string): string => {
    return email.toLowerCase().trim();
  },
  
  /**
   * Sanitizes names (removes extra spaces, capitalizes)
   */
  name: (name: string): string => {
    return name
      .trim()
      .replace(/\s+/g, ' ')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  },
}; 