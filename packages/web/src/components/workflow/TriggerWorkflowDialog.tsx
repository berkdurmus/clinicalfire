'use client'

import React, { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { Play, Clock, Zap } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { workflowService } from '@/lib/services/workflow.service'
import { executionService } from '@/lib/services/execution.service'
import { useAuth } from '@/lib/auth.context'

interface WorkflowOption {
  id: string
  name: string
  description?: string
  enabled: boolean
}

interface TriggerFormData {
  workflowId: string
  patientId: string
  dataType: string
  testValue: string
}

const TEST_DATA_PRESETS = {
  lab_result: {
    test_type: 'troponin',
    value: 0.08,
    unit: 'ng/mL',
    status: 'final',
    patient_name: 'John Doe',
    patient_mrn: 'MRN123456'
  },
  vital_signs: {
    systolic_bp: 180,
    diastolic_bp: 110,
    heart_rate: 95,
    temperature: 99.2,
    timestamp: new Date().toISOString()
  },
  medication: {
    medication_name: 'Metformin',
    dose: '500mg',
    frequency: 'twice daily',
    prescribed_date: new Date().toISOString()
  },
  form_data: {
    form_type: 'assessment',
    score: 85,
    completed_by: 'Dr. Smith',
    completion_date: new Date().toISOString()
  }
}

export function TriggerWorkflowDialog({ onExecutionTriggered }: { onExecutionTriggered?: () => void }) {
  const [open, setOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [workflows, setWorkflows] = useState<WorkflowOption[]>([])
  const [isLoadingWorkflows, setIsLoadingWorkflows] = useState(false)
  const { isAuthenticated } = useAuth()

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
    reset,
  } = useForm<TriggerFormData>({
    defaultValues: {
      patientId: 'PT001',
      dataType: 'lab_result',
      testValue: '0.08'
    }
  })

  const selectedDataType = watch('dataType')

  useEffect(() => {
    if (open && isAuthenticated) {
      loadWorkflows()
    }
  }, [open, isAuthenticated])

  const loadWorkflows = async () => {
    try {
      setIsLoadingWorkflows(true)
      const response = await workflowService.listWorkflows({
        page: 1,
        limit: 50,
        enabled: true
      })
      
      const workflowOptions = response.data?.map(w => ({
        id: w.id || w.name,
        name: w.name,
        description: w.description,
        enabled: w.enabled
      })) || []
      
      setWorkflows(workflowOptions)
      
      // Auto-select first workflow
      if (workflowOptions.length > 0) {
        setValue('workflowId', workflowOptions[0].id)
      }
    } catch (error) {
      console.error('Failed to load workflows:', error)
      // Use mock data if API fails
      const mockWorkflows = [
        { id: 'critical-lab-alert', name: 'Critical Lab Alert', description: 'Alert for critical lab values', enabled: true }
      ]
      setWorkflows(mockWorkflows)
      setValue('workflowId', mockWorkflows[0].id)
    } finally {
      setIsLoadingWorkflows(false)
    }
  }

  const generateTestData = (dataType: string, customValue?: string) => {
    const baseData = { ...TEST_DATA_PRESETS[dataType as keyof typeof TEST_DATA_PRESETS] }
    
    if (customValue && dataType === 'lab_result') {
      baseData.value = parseFloat(customValue) || baseData.value
    }
    
    return {
      ...baseData,
      patient_id: watch('patientId'),
      triggerType: dataType,
      timestamp: new Date().toISOString()
    }
  }

  const onSubmit = async (data: TriggerFormData) => {
    if (!isAuthenticated) {
      alert('Please login to trigger workflows')
      return
    }

    try {
      setIsSubmitting(true)
      
      const testData = generateTestData(data.dataType, data.testValue)
      
      const triggerParams = {
        workflowId: data.workflowId,
        data: testData,
        triggeredBy: 'manual_trigger',
        patientId: data.patientId,
      }

      const response = await executionService.triggerWorkflow(triggerParams)
      
      if (response.success) {
        setOpen(false)
        reset()
        onExecutionTriggered?.()
        alert('Workflow triggered successfully!')
      } else {
        throw new Error(response.error || 'Failed to trigger workflow')
      }
    } catch (error) {
      console.error('Failed to trigger workflow:', error)
      alert('Failed to trigger workflow. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="btn-secondary">
          <Play className="w-4 h-4 mr-2" />
          Trigger Workflow
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-green-500" />
            Trigger Workflow Execution
          </DialogTitle>
          <DialogDescription>
            Execute a workflow with test data to see it in action.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Workflow Selection */}
          <div>
            <label className="form-label">Select Workflow</label>
            {isLoadingWorkflows ? (
              <div className="h-11 loading-shimmer rounded-xl"></div>
            ) : (
              <Select
                value={watch('workflowId')}
                onValueChange={(value) => setValue('workflowId', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose a workflow to execute" />
                </SelectTrigger>
                <SelectContent>
                  {workflows.map((workflow) => (
                    <SelectItem key={workflow.id} value={workflow.id}>
                      <div className="flex items-center justify-between w-full">
                        <span>{workflow.name}</span>
                        <Badge variant="secondary" className="ml-2">
                          {workflow.enabled ? 'Active' : 'Disabled'}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Patient ID */}
          <div>
            <label className="form-label">Patient ID</label>
            <Input
              {...register('patientId', { required: 'Patient ID is required' })}
              placeholder="e.g., PT001"
              className={errors.patientId ? 'border-red-500' : ''}
            />
            {errors.patientId && <p className="text-red-500 text-sm mt-1">{errors.patientId.message}</p>}
          </div>

          {/* Test Data Type */}
          <div>
            <label className="form-label">Test Data Type</label>
            <Select
              value={selectedDataType}
              onValueChange={(value) => setValue('dataType', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="lab_result">🧪 Lab Result</SelectItem>
                <SelectItem value="vital_signs">💓 Vital Signs</SelectItem>
                <SelectItem value="medication">💊 Medication</SelectItem>
                <SelectItem value="form_data">📋 Form Data</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Custom Test Value */}
          {selectedDataType === 'lab_result' && (
            <div>
              <label className="form-label">Test Value (for lab results)</label>
              <Input
                {...register('testValue')}
                placeholder="e.g., 0.08"
                type="number"
                step="0.01"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Critical threshold for troponin is > 0.04 ng/mL
              </p>
            </div>
          )}

          {/* Preview Test Data */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Test Data Preview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="text-xs bg-gray-50 dark:bg-gray-800 p-3 rounded-lg overflow-x-auto">
                {JSON.stringify(generateTestData(selectedDataType, watch('testValue')), null, 2)}
              </pre>
            </CardContent>
          </Card>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || !watch('workflowId')} className="btn-primary">
              {isSubmitting ? 'Triggering...' : 'Trigger Workflow'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
} 