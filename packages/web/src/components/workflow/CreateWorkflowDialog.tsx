'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, X, Zap, Activity } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { workflowService } from '@/lib/services/workflow.service';
import { useAuth } from '@/lib/auth.context';

const workflowSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  version: z.string().min(1, 'Version is required'),
  description: z.string().optional(),
  enabled: z.boolean(),
});

type WorkflowFormData = z.infer<typeof workflowSchema>;

interface Trigger {
  id: string;
  type: string;
  conditions: Array<{
    field: string;
    operator: string;
    value: any;
  }>;
}

interface Action {
  id: string;
  type: string;
  params: Record<string, any>;
  delay?: number;
}

const TRIGGER_TYPES = [
  { value: 'lab_result_received', label: 'Lab Result Received', icon: '🧪' },
  { value: 'vital_signs_updated', label: 'Vital Signs Updated', icon: '💓' },
  { value: 'form_submitted', label: 'Form Submitted', icon: '📋' },
  {
    value: 'appointment_scheduled',
    label: 'Appointment Scheduled',
    icon: '📅',
  },
  {
    value: 'medication_prescribed',
    label: 'Medication Prescribed',
    icon: '💊',
  },
  { value: 'patient_admitted', label: 'Patient Admitted', icon: '🏥' },
  { value: 'patient_discharged', label: 'Patient Discharged', icon: '🚪' },
  { value: 'manual_trigger', label: 'Manual Trigger', icon: '👤' },
];

const ACTION_TYPES = [
  { value: 'notify_doctor', label: 'Notify Doctor', icon: '👨‍⚕️' },
  { value: 'notify_nurse', label: 'Notify Nurse', icon: '👩‍⚕️' },
  { value: 'notify_patient', label: 'Notify Patient', icon: '👤' },
  { value: 'create_care_plan', label: 'Create Care Plan', icon: '📋' },
  { value: 'schedule_appointment', label: 'Schedule Appointment', icon: '📅' },
  { value: 'send_email', label: 'Send Email', icon: '📧' },
  { value: 'send_sms', label: 'Send SMS', icon: '📱' },
  { value: 'create_task', label: 'Create Task', icon: '✅' },
  { value: 'log_event', label: 'Log Event', icon: '📝' },
  { value: 'webhook', label: 'Webhook', icon: '🔗' },
];

export function CreateWorkflowDialog({
  onWorkflowCreated,
}: {
  onWorkflowCreated?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [triggers, setTriggers] = useState<Trigger[]>([]);
  const [actions, setActions] = useState<Action[]>([]);
  const { isAuthenticated } = useAuth();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
  } = useForm<WorkflowFormData>({
    resolver: zodResolver(workflowSchema),
    defaultValues: {
      version: '1.0.0',
      enabled: true,
    },
  });

  const addTrigger = () => {
    const newTrigger: Trigger = {
      id: `trigger_${Date.now()}`,
      type: 'manual_trigger',
      conditions: [],
    };
    setTriggers([...triggers, newTrigger]);
  };

  const removeTrigger = (id: string) => {
    setTriggers(triggers.filter((t) => t.id !== id));
  };

  const updateTrigger = (id: string, updates: Partial<Trigger>) => {
    setTriggers(triggers.map((t) => (t.id === id ? { ...t, ...updates } : t)));
  };

  const addAction = () => {
    const newAction: Action = {
      id: `action_${Date.now()}`,
      type: 'log_event',
      params: { message: 'Workflow executed' },
    };
    setActions([...actions, newAction]);
  };

  const removeAction = (id: string) => {
    setActions(actions.filter((a) => a.id !== id));
  };

  const updateAction = (id: string, updates: Partial<Action>) => {
    setActions(actions.map((a) => (a.id === id ? { ...a, ...updates } : a)));
  };

  const onSubmit = async (data: WorkflowFormData) => {
    if (!isAuthenticated) {
      alert('Please login to create workflows');
      return;
    }

    if (triggers.length === 0) {
      alert('Please add at least one trigger');
      return;
    }

    if (actions.length === 0) {
      alert('Please add at least one action');
      return;
    }

    try {
      setIsSubmitting(true);

      const workflowData = {
        ...data,
        triggers: triggers.map(({ id, ...trigger }) => trigger),
        actions: actions.map(({ id, ...action }) => action),
      };

      await workflowService.createWorkflow(workflowData);

      // Reset form
      reset();
      setTriggers([]);
      setActions([]);
      setOpen(false);

      // Notify parent
      onWorkflowCreated?.();

      alert('Workflow created successfully!');
    } catch (error) {
      console.error('Failed to create workflow:', error);
      alert('Failed to create workflow. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="btn-primary">
          <Plus className="w-4 h-4 mr-2" />
          Create Workflow
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-blue-500" />
            Create New Workflow
          </DialogTitle>
          <DialogDescription>
            Design a healthcare workflow with triggers and actions to automate
            clinical processes.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="form-label">Workflow Name</label>
              <Input
                {...register('name')}
                placeholder="e.g., Critical Lab Alert"
                className={errors.name ? 'border-red-500' : ''}
              />
              {errors.name && (
                <p className="text-red-500 text-sm mt-1">
                  {errors.name.message}
                </p>
              )}
            </div>
            <div>
              <label className="form-label">Version</label>
              <Input {...register('version')} placeholder="1.0.0" />
            </div>
          </div>

          <div>
            <label className="form-label">Description</label>
            <Input
              {...register('description')}
              placeholder="Describe what this workflow does..."
            />
          </div>

          {/* Triggers Section */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Zap className="w-5 h-5 text-green-500" />
                Triggers
              </h3>
              <Button
                type="button"
                onClick={addTrigger}
                variant="outline"
                size="sm"
              >
                <Plus className="w-4 h-4 mr-1" />
                Add Trigger
              </Button>
            </div>

            <div className="space-y-3">
              {triggers.map((trigger, index) => (
                <Card key={trigger.id} className="workflow-node trigger">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm">
                        Trigger {index + 1}
                      </CardTitle>
                      <Button
                        type="button"
                        onClick={() => removeTrigger(trigger.id)}
                        variant="ghost"
                        size="sm"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Select
                      value={trigger.type}
                      onValueChange={(value) =>
                        updateTrigger(trigger.id, { type: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select trigger type" />
                      </SelectTrigger>
                      <SelectContent>
                        {TRIGGER_TYPES.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            <div className="flex items-center gap-2">
                              <span>{type.icon}</span>
                              {type.label}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </CardContent>
                </Card>
              ))}

              {triggers.length === 0 && (
                <div className="text-center p-8 border-2 border-dashed border-gray-300 rounded-xl">
                  <Zap className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-500">No triggers added yet</p>
                  <Button
                    type="button"
                    onClick={addTrigger}
                    variant="outline"
                    className="mt-2"
                  >
                    Add your first trigger
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Actions Section */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Activity className="w-5 h-5 text-blue-500" />
                Actions
              </h3>
              <Button
                type="button"
                onClick={addAction}
                variant="outline"
                size="sm"
              >
                <Plus className="w-4 h-4 mr-1" />
                Add Action
              </Button>
            </div>

            <div className="space-y-3">
              {actions.map((action, index) => (
                <Card key={action.id} className="workflow-node action">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm">
                        Action {index + 1}
                      </CardTitle>
                      <Button
                        type="button"
                        onClick={() => removeAction(action.id)}
                        variant="ghost"
                        size="sm"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Select
                      value={action.type}
                      onValueChange={(value) =>
                        updateAction(action.id, { type: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select action type" />
                      </SelectTrigger>
                      <SelectContent>
                        {ACTION_TYPES.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            <div className="flex items-center gap-2">
                              <span>{type.icon}</span>
                              {type.label}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </CardContent>
                </Card>
              ))}

              {actions.length === 0 && (
                <div className="text-center p-8 border-2 border-dashed border-gray-300 rounded-xl">
                  <Activity className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-500">No actions added yet</p>
                  <Button
                    type="button"
                    onClick={addAction}
                    variant="outline"
                    className="mt-2"
                  >
                    Add your first action
                  </Button>
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary"
            >
              {isSubmitting ? 'Creating...' : 'Create Workflow'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
