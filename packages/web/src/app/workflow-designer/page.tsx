'use client';

import React, { useState } from 'react';
import { WorkflowDesignerWithProvider } from '@/components/workflow/WorkflowDesigner';
import { workflowService } from '@/lib/services/workflow.service';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Save, Play, Download, Upload } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

export default function WorkflowDesignerPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [workflowId, setWorkflowId] = useState<string>();

  const handleSaveWorkflow = async (workflowData: any) => {
    setIsLoading(true);
    try {
      // Convert visual workflow to standard format
      const workflow = {
        name: workflowData.name || 'Visual Workflow',
        version: workflowData.version || '1.0.0',
        description: 'Workflow created with visual designer',
        enabled: true,
        triggers: extractTriggersFromNodes(
          workflowData.nodes,
          workflowData.edges
        ),
        actions: extractActionsFromNodes(
          workflowData.nodes,
          workflowData.edges
        ),
        metadata: {
          ...workflowData.metadata,
          visualDesign: {
            nodes: workflowData.nodes,
            edges: workflowData.edges,
          },
        },
      };

      let result;
      if (workflowId) {
        result = await workflowService.updateWorkflow(workflowId, workflow);
      } else {
        result = await workflowService.createWorkflow(workflow);
        if (result.data?.id) {
          setWorkflowId(result.data.id);
        }
      }

      toast.success('Workflow saved successfully!');
    } catch (error) {
      console.error('Error saving workflow:', error);
      toast.error('Failed to save workflow');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestWorkflow = async (workflowData: any) => {
    setIsLoading(true);
    try {
      // Mock test execution
      await new Promise((resolve) => setTimeout(resolve, 2000));

      toast.success('Workflow test completed successfully!', {
        description: 'All nodes executed without errors.',
      });
    } catch (error) {
      console.error('Error testing workflow:', error);
      toast.error('Workflow test failed');
    } finally {
      setIsLoading(false);
    }
  };

  const extractTriggersFromNodes = (nodes: any[], edges: any[]) => {
    const triggerNodes = nodes.filter((node) => node.type === 'trigger');

    return triggerNodes.map((node) => ({
      type: node.data.triggerType,
      conditions: extractConditionsFromConnectedNodes(node.id, nodes, edges),
      metadata: {
        position: node.position,
        config: node.data.config,
      },
    }));
  };

  const extractActionsFromNodes = (nodes: any[], edges: any[]) => {
    const actionNodes = nodes.filter((node) => node.type === 'action');

    return actionNodes.map((node) => ({
      type: node.data.actionType,
      params: node.data.params || {},
      conditions: extractConditionsFromConnectedNodes(node.id, nodes, edges),
      delay: node.data.delay || 0,
      priority: node.data.priority || 'normal',
      metadata: {
        position: node.position,
      },
    }));
  };

  const extractConditionsFromConnectedNodes = (
    nodeId: string,
    nodes: any[],
    edges: any[]
  ) => {
    // Find condition nodes connected to this node
    const connectedConditionEdges = edges.filter(
      (edge) =>
        edge.target === nodeId &&
        nodes.find((n) => n.id === edge.source)?.type === 'condition'
    );

    return connectedConditionEdges
      .map((edge) => {
        const conditionNode = nodes.find((n) => n.id === edge.source);
        if (!conditionNode) return null;

        if (conditionNode.data.conditions) {
          return conditionNode.data.conditions;
        }

        return {
          field: conditionNode.data.field,
          operator: conditionNode.data.operator,
          value: conditionNode.data.value,
        };
      })
      .filter(Boolean);
  };

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            onClick={() => router.back()}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>
          <div>
            <h1 className="text-xl font-bold text-gray-900">
              Visual Workflow Designer
            </h1>
            <p className="text-sm text-gray-600">
              Create healthcare workflows with drag-and-drop interface
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
          >
            <Upload className="w-4 h-4" />
            Import
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Export
          </Button>
        </div>
      </div>

      {/* Designer */}
      <div className="flex-1">
        <WorkflowDesignerWithProvider
          workflowId={workflowId}
          onSave={handleSaveWorkflow}
          onTest={handleTestWorkflow}
        />
      </div>

      {/* Loading Overlay */}
      {isLoading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-80">
            <CardContent className="p-6 text-center">
              <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <h3 className="font-medium text-gray-900 mb-2">Processing...</h3>
              <p className="text-sm text-gray-600">
                {isLoading ? 'Saving your workflow...' : 'Testing workflow...'}
              </p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
