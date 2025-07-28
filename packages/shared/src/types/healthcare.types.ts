import { z } from 'zod';

// Patient information
export const PatientSchema = z.object({
  id: z.string(),
  mrn: z.string(), // Medical Record Number
  firstName: z.string(),
  lastName: z.string(),
  dateOfBirth: z.date(),
  gender: z.enum(['male', 'female', 'other', 'unknown']),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  address: z.object({
    street: z.string(),
    city: z.string(),
    state: z.string(),
    zipCode: z.string(),
    country: z.string(),
  }).optional(),
  emergencyContact: z.object({
    name: z.string(),
    relationship: z.string(),
    phone: z.string(),
  }).optional(),
});

export type Patient = z.infer<typeof PatientSchema>;

// Lab result
export const LabResultSchema = z.object({
  id: z.string(),
  patientId: z.string(),
  testType: z.string(),
  testName: z.string(),
  value: z.union([z.string(), z.number()]),
  unit: z.string().optional(),
  referenceRange: z.string().optional(),
  status: z.enum(['preliminary', 'final', 'corrected', 'cancelled']),
  abnormalFlag: z.enum(['normal', 'high', 'low', 'critical_high', 'critical_low']).optional(),
  timestamp: z.date(),
  orderedBy: z.string(),
  performedBy: z.string().optional(),
  labId: z.string().optional(),
});

export type LabResult = z.infer<typeof LabResultSchema>;

// Vital signs
export const VitalSignsSchema = z.object({
  id: z.string(),
  patientId: z.string(),
  timestamp: z.date(),
  bloodPressure: z.object({
    systolic: z.number(),
    diastolic: z.number(),
    unit: z.string().default('mmHg'),
  }).optional(),
  heartRate: z.object({
    value: z.number(),
    unit: z.string().default('bpm'),
  }).optional(),
  temperature: z.object({
    value: z.number(),
    unit: z.enum(['celsius', 'fahrenheit']),
  }).optional(),
  respiratoryRate: z.object({
    value: z.number(),
    unit: z.string().default('breaths/min'),
  }).optional(),
  oxygenSaturation: z.object({
    value: z.number(),
    unit: z.string().default('%'),
  }).optional(),
  weight: z.object({
    value: z.number(),
    unit: z.enum(['kg', 'lbs']),
  }).optional(),
  height: z.object({
    value: z.number(),
    unit: z.enum(['cm', 'inches']),
  }).optional(),
  recordedBy: z.string(),
});

export type VitalSigns = z.infer<typeof VitalSignsSchema>;

// Healthcare provider
export const ProviderSchema = z.object({
  id: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  title: z.string(), // Dr., RN, etc.
  specialty: z.string().optional(),
  department: z.string().optional(),
  email: z.string().email(),
  phone: z.string().optional(),
  pager: z.string().optional(),
  role: z.enum(['doctor', 'nurse', 'technician', 'administrator', 'other']),
  isOnCall: z.boolean().default(false),
});

export type Provider = z.infer<typeof ProviderSchema>;

// Medication
export const MedicationSchema = z.object({
  id: z.string(),
  name: z.string(),
  genericName: z.string().optional(),
  dosage: z.string(),
  route: z.string(), // oral, IV, IM, etc.
  frequency: z.string(),
  startDate: z.date(),
  endDate: z.date().optional(),
  prescribedBy: z.string(),
  patientId: z.string(),
  instructions: z.string().optional(),
  status: z.enum(['active', 'discontinued', 'held', 'completed']),
});

export type Medication = z.infer<typeof MedicationSchema>;

// Care plan
export const CarePlanSchema = z.object({
  id: z.string(),
  patientId: z.string(),
  title: z.string(),
  description: z.string().optional(),
  status: z.enum(['draft', 'active', 'on_hold', 'revoked', 'completed']),
  intent: z.enum(['proposal', 'plan', 'order', 'option']),
  category: z.array(z.string()), // e.g., ['assessment', 'treatment']
  createdBy: z.string(),
  createdAt: z.date(),
  updatedAt: z.date().optional(),
  goals: z.array(z.object({
    id: z.string(),
    description: z.string(),
    targetDate: z.date().optional(),
    status: z.enum(['proposed', 'planned', 'accepted', 'active', 'on_hold', 'completed', 'cancelled']),
  })),
  activities: z.array(z.object({
    id: z.string(),
    title: z.string(),
    description: z.string().optional(),
    status: z.enum(['not_started', 'scheduled', 'in_progress', 'on_hold', 'completed', 'cancelled']),
    scheduledDate: z.date().optional(),
    completedDate: z.date().optional(),
    assignedTo: z.string().optional(),
  })),
});

export type CarePlan = z.infer<typeof CarePlanSchema>;

// Appointment
export const AppointmentSchema = z.object({
  id: z.string(),
  patientId: z.string(),
  providerId: z.string(),
  title: z.string(),
  description: z.string().optional(),
  startTime: z.date(),
  endTime: z.date(),
  location: z.string().optional(),
  appointmentType: z.string(), // consultation, procedure, follow-up, etc.
  status: z.enum(['scheduled', 'confirmed', 'arrived', 'in_progress', 'completed', 'cancelled', 'no_show']),
  priority: z.enum(['routine', 'urgent', 'emergency']).default('routine'),
  notes: z.string().optional(),
  createdBy: z.string(),
  createdAt: z.date(),
});

export type Appointment = z.infer<typeof AppointmentSchema>; 