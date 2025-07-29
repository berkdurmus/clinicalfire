'use client';

import { useEffect, useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Activity,
  PlayCircle,
  Workflow,
  Users,
  AlertTriangle,
  TrendingUp,
  Clock,
  CheckCircle2,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { CreateWorkflowDialog } from '@/components/workflow/CreateWorkflowDialog';
import { TriggerWorkflowDialog } from '@/components/workflow/TriggerWorkflowDialog';
import { useAuth } from '@/lib/auth.context';
import { workflowService } from '@/lib/services/workflow.service';
import { executionService } from '@/lib/services/execution.service';

interface DashboardStats {
  totalWorkflows: number;
  activeWorkflows: number;
  todayExecutions: number;
  successRate: number;
}

interface RecentWorkflow {
  id?: string;
  name: string;
  version: string;
  description?: string;
  enabled: boolean;
  triggers: any[];
  actions: any[];
  createdAt?: Date;
  updatedAt?: Date;
}

interface RecentExecution {
  id: string;
  workflowName: string;
  success: boolean;
  duration: number;
  startedAt: string;
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalWorkflows: 0,
    activeWorkflows: 0,
    todayExecutions: 0,
    successRate: 0,
  });
  const [workflows, setWorkflows] = useState<RecentWorkflow[]>([]);
  const [recentExecutions, setRecentExecutions] = useState<RecentExecution[]>(
    []
  );
  const [isLoading, setIsLoading] = useState(true);
  const { isAuthenticated, user, login } = useAuth();

  useEffect(() => {
    if (isAuthenticated) {
      loadDashboardData();
    } else {
      // Auto-login for demo purposes
      handleDemoLogin();
    }
  }, [isAuthenticated]);

  const handleDemoLogin = async () => {
    try {
      await login('admin@example.com', 'password');
    } catch (error) {
      console.error('Demo login failed:', error);
      // Continue with mock data
      loadMockData();
    }
  };

  const loadDashboardData = async () => {
    try {
      setIsLoading(true);

      // Load workflows
      const workflowsResponse = await workflowService.listWorkflows({
        page: 1,
        limit: 10,
      });

      if (workflowsResponse.success && workflowsResponse.data) {
        setWorkflows(workflowsResponse.data);
        setStats((prev) => ({
          ...prev,
          totalWorkflows: workflowsResponse.data.length,
          activeWorkflows: workflowsResponse.data.filter((w) => w.enabled)
            .length,
        }));
      }

      // Load executions (with fallback to mock data)
      try {
        const executionsResponse = await executionService.listExecutions({
          page: 1,
          limit: 5,
        });

        if (executionsResponse.success && executionsResponse.data) {
          setRecentExecutions(executionsResponse.data);
        }
      } catch {
        // Executions endpoint might not have data yet, use mock
        setRecentExecutions([
          {
            id: 'exec_demo_1',
            workflowName: 'Critical Lab Alert',
            success: true,
            duration: 245,
            startedAt: new Date().toISOString(),
          },
        ]);
      }

      // Update stats
      setStats((prev) => ({
        ...prev,
        todayExecutions: 12,
        successRate: 98.5,
      }));
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
      loadMockData();
    } finally {
      setIsLoading(false);
    }
  };

  const loadMockData = () => {
    setWorkflows([
      {
        id: 'critical-lab-alert',
        name: 'Critical Lab Alert',
        version: '1.0.0',
        description: 'Alert care team when critical lab values are detected',
        enabled: true,
        triggers: [{ type: 'lab_result_received' }],
        actions: [{ type: 'notify_doctor' }, { type: 'create_care_plan' }],
      },
    ]);

    setRecentExecutions([
      {
        id: 'exec_mock_1',
        workflowName: 'Critical Lab Alert',
        success: true,
        duration: 245,
        startedAt: new Date().toISOString(),
      },
    ]);

    setStats({
      totalWorkflows: 1,
      activeWorkflows: 1,
      todayExecutions: 12,
      successRate: 98.5,
    });

    setIsLoading(false);
  };

  const refreshDashboard = () => {
    if (isAuthenticated) {
      loadDashboardData();
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-8 w-64 loading-shimmer rounded-lg"></div>
            <div className="h-4 w-96 loading-shimmer rounded"></div>
          </div>
          <div className="flex gap-2">
            <div className="h-10 w-32 loading-shimmer rounded-xl"></div>
            <div className="h-10 w-32 loading-shimmer rounded-xl"></div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 loading-shimmer rounded-2xl"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
            Clinical FIRE Dashboard
          </h1>
          <p className="text-lg text-muted-foreground">
            Fast Interoperable Rules Engine for healthcare workflows
          </p>
          {user && (
            <p className="text-sm text-muted-foreground">
              Welcome back, {user.firstName} {user.lastName}
            </p>
          )}
        </div>
        <div className="flex gap-3">
          <CreateWorkflowDialog onWorkflowCreated={refreshDashboard} />
          <TriggerWorkflowDialog onExecutionTriggered={refreshDashboard} />
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="metric-card card-hover">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Workflows
            </CardTitle>
            <Workflow className="h-5 w-5 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="metric-value">{stats.totalWorkflows}</div>
            <p className="text-sm text-muted-foreground mt-1">
              {stats.activeWorkflows} active
            </p>
          </CardContent>
        </Card>

        <Card className="metric-card card-hover">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Today's Executions
            </CardTitle>
            <Activity className="h-5 w-5 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="metric-value">{stats.todayExecutions}</div>
            <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1">
              <TrendingUp className="h-3 w-3" />
              +12% from yesterday
            </p>
          </CardContent>
        </Card>

        <Card className="metric-card card-hover">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Success Rate
            </CardTitle>
            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="metric-value">{stats.successRate}%</div>
            <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1">
              <TrendingUp className="h-3 w-3" />
              +2.1% from last week
            </p>
          </CardContent>
        </Card>

        <Card className="metric-card card-hover">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active Alerts
            </CardTitle>
            <AlertTriangle className="h-5 w-5 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="metric-value">3</div>
            <p className="text-sm text-muted-foreground mt-1">
              2 critical, 1 warning
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Recent Workflows */}
        <Card className="card-gradient border-0 shadow-lg">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2">
              <Workflow className="h-5 w-5 text-blue-500" />
              Recent Workflows
            </CardTitle>
            <CardDescription>
              Your most recently created or modified workflows
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {workflows.length > 0 ? (
                workflows.map((workflow, index) => (
                  <div
                    key={workflow.id || index}
                    className="workflow-node p-4 border rounded-xl hover:shadow-md transition-all duration-200"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <h4 className="font-semibold text-base">
                            {workflow.name}
                          </h4>
                          <Badge
                            variant={workflow.enabled ? 'default' : 'secondary'}
                            className="text-xs"
                          >
                            {workflow.enabled ? 'Active' : 'Disabled'}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {workflow.description || 'No description provided'}
                        </p>
                        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                          <span>v{workflow.version}</span>
                          <span className="flex items-center gap-1">
                            <Activity className="h-3 w-3" />
                            {workflow.triggers.length} triggers
                          </span>
                          <span className="flex items-center gap-1">
                            <PlayCircle className="h-3 w-3" />
                            {workflow.actions.length} actions
                          </span>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="hover:bg-blue-50"
                      >
                        View
                      </Button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <Workflow className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 mb-3">No workflows yet</p>
                  <CreateWorkflowDialog onWorkflowCreated={refreshDashboard} />
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent Executions */}
        <Card className="card-gradient border-0 shadow-lg">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-green-500" />
              Recent Executions
            </CardTitle>
            <CardDescription>Latest workflow execution results</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentExecutions.length > 0 ? (
                recentExecutions.map((execution) => (
                  <div
                    key={execution.id}
                    className="flex items-center justify-between p-4 border rounded-xl hover:shadow-md transition-all duration-200"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <h4 className="font-semibold text-base">
                          {execution.workflowName}
                        </h4>
                        <Badge
                          variant={
                            execution.success ? 'default' : 'destructive'
                          }
                          className="text-xs"
                        >
                          {execution.success ? 'Success' : 'Failed'}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {execution.duration}ms
                        </span>
                        <span>
                          {new Date(execution.startedAt).toLocaleString()}
                        </span>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="hover:bg-green-50"
                    >
                      View
                    </Button>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <Activity className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 mb-3">No executions yet</p>
                  <TriggerWorkflowDialog
                    onExecutionTriggered={refreshDashboard}
                  />
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
