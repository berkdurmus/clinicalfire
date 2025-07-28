'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Activity, PlayCircle, Workflow, Users, AlertTriangle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'

export default function Dashboard() {
  const [stats, setStats] = useState({
    totalWorkflows: 1,
    activeWorkflows: 1,
    todayExecutions: 12,
    successRate: 95,
  })

  const [workflows] = useState([
    {
      name: 'Critical Lab Alert',
      version: '1.0.0',
      description: 'Alert care team when critical lab values are detected',
      enabled: true,
      triggers: [{ type: 'lab_result_received' }],
      actions: [{ type: 'notify_doctor' }, { type: 'create_care_plan' }],
    }
  ])

  const [recentExecutions] = useState([
    {
      id: 'exec_1',
      workflowName: 'Critical Lab Alert',
      success: true,
      duration: 245,
      startedAt: new Date().toISOString(),
    }
  ])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Clinical FIRE Dashboard</h1>
          <p className="text-muted-foreground">
            Fast Interoperable Rules Engine for healthcare workflows
          </p>
        </div>
        <div className="flex gap-2">
          <Button>
            <Workflow className="w-4 h-4 mr-2" />
            Create Workflow
          </Button>
          <Button variant="outline">
            <PlayCircle className="w-4 h-4 mr-2" />
            Trigger Workflow
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Workflows</CardTitle>
            <Workflow className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalWorkflows}</div>
            <p className="text-xs text-muted-foreground">
              {stats.activeWorkflows} active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Executions</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.todayExecutions}</div>
            <p className="text-xs text-muted-foreground">
              +12% from yesterday
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.successRate}%</div>
            <p className="text-xs text-muted-foreground">
              +2.1% from last week
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Alerts</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">3</div>
            <p className="text-xs text-muted-foreground">
              2 critical, 1 warning
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Recent Workflows */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Workflows</CardTitle>
            <CardDescription>
              Your most recently created or modified workflows
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {workflows.map((workflow) => (
                <div key={workflow.name} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium">{workflow.name}</h4>
                      <Badge variant={workflow.enabled ? 'default' : 'secondary'}>
                        {workflow.enabled ? 'Active' : 'Disabled'}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {workflow.description || 'No description provided'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      v{workflow.version} • {workflow.triggers.length} triggers • {workflow.actions.length} actions
                    </p>
                  </div>
                  <Button variant="ghost" size="sm">
                    View
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recent Executions */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Executions</CardTitle>
            <CardDescription>
              Latest workflow execution results
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentExecutions.map((execution) => (
                <div key={execution.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium">{execution.workflowName}</h4>
                      <Badge variant={execution.success ? 'default' : 'destructive'}>
                        {execution.success ? 'Success' : 'Failed'}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Duration: {execution.duration}ms
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(execution.startedAt).toLocaleString()}
                    </p>
                  </div>
                  <Button variant="ghost" size="sm">
                    View
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 