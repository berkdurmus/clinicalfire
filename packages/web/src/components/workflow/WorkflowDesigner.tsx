'use client';

import React, { useCallback, useState, useRef } from 'react';
import ReactFlow, {
  Node,
  Edge,
  addEdge,
  Connection,
  useNodesState,
  useEdgesState,
  Controls,
  MiniMap,
  Background,
  ReactFlowProvider,
  ReactFlowInstance,
  BackgroundVariant,
} from 'reactflow';
import 'reactflow/dist/style.css';

import { TriggerNode } from './nodes/TriggerNode';
import { ConditionNode } from './nodes/ConditionNode';
import { ActionNode } from './nodes/ActionNode';
import { WorkflowNodePalette } from './WorkflowNodePalette';
import { WorkflowValidation } from './WorkflowValidation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Save, Play, ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';

// Custom node types
const nodeTypes = {
  trigger: TriggerNode,
  condition: ConditionNode,
  action: ActionNode,
};

interface WorkflowDesignerProps {
  onSave?: (workflowData: any) => void;
  onTest?: (workflowData: any) => void;
  initialNodes?: Node[];
  initialEdges?: Edge[];
}

const WorkflowDesigner: React.FC<WorkflowDesignerProps> = ({
  onSave,
  onTest,
  initialNodes = [],
  initialEdges = [],
}) => {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [validationErrors, setValidationErrors] = useState<any[]>([]);
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [reactFlowInstance, setReactFlowInstance] =
    useState<ReactFlowInstance | null>(null);

  // Handle new connections between nodes
  const onConnect = useCallback(
    (params: Connection) => {
      const edge = {
        ...params,
        id: `edge-${params.source}-${params.target}`,
        type: 'smoothstep',
        animated: true,
      };
      setEdges((eds) => addEdge(edge, eds));
    },
    [setEdges]
  );

  // Handle node clicks
  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    setSelectedNode(node);
  }, []);

  // Add a new node to the canvas
  const onAddNode = useCallback(
    (nodeData: any) => {
      if (!reactFlowInstance) return;

      const id = `node-${Date.now()}`;
      const position = reactFlowInstance.project({
        x: Math.random() * 400 + 100,
        y: Math.random() * 400 + 100,
      });

      const newNode: Node = {
        id,
        type: nodeData.type,
        position,
        data: { ...nodeData, label: nodeData.label || `${nodeData.type} Node` },
      };

      setNodes((nds) => nds.concat(newNode));
      validateWorkflow([...nodes, newNode], edges);
    },
    [reactFlowInstance, nodes, edges, setNodes]
  );

  // Update node data
  const onUpdateNode = useCallback(
    (nodeId: string, newData: any) => {
      setNodes((nds) =>
        nds.map((node) =>
          node.id === nodeId
            ? { ...node, data: { ...node.data, ...newData } }
            : node
        )
      );
      validateWorkflow(nodes, edges);
    },
    [nodes, edges, setNodes]
  );

  // Delete a node
  const onDeleteNode = useCallback(
    (nodeId: string) => {
      setNodes((nds) => nds.filter((node) => node.id !== nodeId));
      setEdges((eds) =>
        eds.filter((edge) => edge.source !== nodeId && edge.target !== nodeId)
      );
      if (selectedNode?.id === nodeId) {
        setSelectedNode(null);
      }
    },
    [setNodes, setEdges, selectedNode]
  );

  // Validate the workflow
  const validateWorkflow = useCallback(
    (currentNodes: Node[], currentEdges: Edge[]) => {
      const errors: any[] = [];

      // Check for trigger nodes
      const triggerNodes = currentNodes.filter(
        (node) => node.type === 'trigger'
      );
      if (triggerNodes.length === 0) {
        errors.push({
          type: 'error',
          message: 'Workflow must have at least one trigger node',
          nodeId: null,
        });
      }

      // Check for disconnected nodes
      currentNodes.forEach((node) => {
        const hasIncomingEdge = currentEdges.some(
          (edge) => edge.target === node.id
        );
        const hasOutgoingEdge = currentEdges.some(
          (edge) => edge.source === node.id
        );

        if (node.type !== 'trigger' && !hasIncomingEdge) {
          errors.push({
            type: 'warning',
            message: `Node "${node.data.label}" has no incoming connections`,
            nodeId: node.id,
          });
        }

        if (node.type !== 'action' && !hasOutgoingEdge) {
          errors.push({
            type: 'warning',
            message: `Node "${node.data.label}" has no outgoing connections`,
            nodeId: node.id,
          });
        }
      });

      setValidationErrors(errors);
    },
    []
  );

  // Handle save action
  const handleSave = useCallback(() => {
    if (onSave) {
      const workflowData = {
        nodes: nodes.map((node) => ({
          id: node.id,
          type: node.type,
          position: node.position,
          data: node.data,
        })),
        edges: edges.map((edge) => ({
          id: edge.id,
          source: edge.source,
          target: edge.target,
          sourceHandle: edge.sourceHandle,
          targetHandle: edge.targetHandle,
        })),
      };
      onSave(workflowData);
    }
  }, [nodes, edges, onSave]);

  // Handle test action
  const handleTest = useCallback(() => {
    if (onTest) {
      const workflowData = {
        nodes: nodes.map((node) => ({
          id: node.id,
          type: node.type,
          position: node.position,
          data: node.data,
        })),
        edges: edges.map((edge) => ({
          id: edge.id,
          source: edge.source,
          target: edge.target,
          sourceHandle: edge.sourceHandle,
          targetHandle: edge.targetHandle,
        })),
      };
      onTest(workflowData);
    }
  }, [nodes, edges, onTest]);

  return (
    <div className="flex h-full w-full bg-background">
      {/* Node Palette */}
      <div className="w-64 border-r border-border bg-card">
        <WorkflowNodePalette onAddNode={onAddNode} />
      </div>

      {/* Main Canvas */}
      <div className="flex-1 flex flex-col">
        {/* Toolbar */}
        <div className="border-b border-border bg-card p-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleSave}>
                <Save className="h-4 w-4 mr-1" />
                Save
              </Button>
              <Button variant="outline" size="sm" onClick={handleTest}>
                <Play className="h-4 w-4 mr-1" />
                Test
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => reactFlowInstance?.zoomIn()}
              >
                <ZoomIn className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => reactFlowInstance?.zoomOut()}
              >
                <ZoomOut className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => reactFlowInstance?.fitView()}
              >
                <Maximize2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Canvas */}
        <div ref={reactFlowWrapper} className="flex-1">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            onInit={setReactFlowInstance}
            nodeTypes={nodeTypes}
            fitView
            attributionPosition="bottom-left"
            className="bg-background"
          >
            <Controls />
            <MiniMap />
            <Background variant={BackgroundVariant.Dots} gap={12} size={1} />
          </ReactFlow>
        </div>
      </div>

      {/* Properties Panel & Validation */}
      <div className="w-80 border-l border-border bg-card flex flex-col">
        {/* Node Properties */}
        {selectedNode && (
          <Card className="m-2 mb-1">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Node Properties</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div>
                <label className="text-xs font-medium text-muted-foreground">
                  Type
                </label>
                <p className="text-sm capitalize">{selectedNode.type}</p>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">
                  Label
                </label>
                <p className="text-sm">{selectedNode.data.label}</p>
              </div>
              {selectedNode.data.description && (
                <div>
                  <label className="text-xs font-medium text-muted-foreground">
                    Description
                  </label>
                  <p className="text-xs text-muted-foreground">
                    {selectedNode.data.description}
                  </p>
                </div>
              )}
              <Button
                variant="destructive"
                size="sm"
                onClick={() => onDeleteNode(selectedNode.id)}
                className="w-full mt-2"
              >
                Delete Node
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Validation Panel */}
        <div className="flex-1 m-2 mt-1">
          <WorkflowValidation validationResults={validationErrors} />
        </div>
      </div>
    </div>
  );
};

// Provider wrapper for ReactFlow
export const WorkflowDesignerWithProvider: React.FC<WorkflowDesignerProps> = (
  props
) => {
  return (
    <ReactFlowProvider>
      <WorkflowDesigner {...props} />
    </ReactFlowProvider>
  );
};

export { WorkflowDesigner };
export default WorkflowDesigner;
