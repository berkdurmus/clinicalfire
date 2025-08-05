'use client';

import React from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { GitBranch, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';

interface ConditionNodeData {
  label: string;
  type: string;
  description?: string;
  conditions?: any[];
  operator?: 'AND' | 'OR';
  config?: any;
}

export const ConditionNode: React.FC<NodeProps<ConditionNodeData>> = ({
  data,
  selected,
}) => {
  const conditionCount = data.conditions?.length || 1;
  const operator = data.operator || 'AND';

  return (
    <div className={`min-w-[220px] ${selected ? 'ring-2 ring-primary' : ''}`}>
      <Card className="bg-yellow-50 border-yellow-200 shadow-md hover:shadow-lg transition-shadow">
        <CardContent className="p-3">
          <div className="flex items-center gap-2 mb-2">
            <div className="flex-shrink-0 text-muted-foreground">
              <GitBranch className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-medium text-sm truncate">{data.label}</h4>
              <Badge variant="secondary" className="text-xs">
                Condition
              </Badge>
            </div>
          </div>

          {data.description && (
            <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
              {data.description}
            </p>
          )}

          <div className="space-y-1">
            {conditionCount > 1 && (
              <div className="flex items-center gap-1">
                <span className="text-xs font-medium">
                  {conditionCount} conditions
                </span>
                <Badge variant="outline" className="text-xs px-1">
                  {operator}
                </Badge>
              </div>
            )}

            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                Decision Point
              </span>
              <AlertTriangle className="h-3 w-3 text-yellow-600" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Input handle */}
      <Handle
        type="target"
        position={Position.Left}
        id="condition-input"
        className="w-3 h-3 bg-primary border-2 border-white"
      />

      {/* Output handles for true/false paths */}
      <Handle
        type="source"
        position={Position.Right}
        id="condition-true"
        style={{ top: '30%' }}
        className="w-3 h-3 bg-green-500 border-2 border-white"
      />
      <div className="absolute -right-8 top-[25%] text-xs text-green-600 font-medium">
        True
      </div>

      <Handle
        type="source"
        position={Position.Right}
        id="condition-false"
        style={{ top: '70%' }}
        className="w-3 h-3 bg-red-500 border-2 border-white"
      />
      <div className="absolute -right-8 top-[65%] text-xs text-red-600 font-medium">
        False
      </div>
    </div>
  );
};
