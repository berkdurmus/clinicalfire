'use client';

import React from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Clock,
  Users,
  Calendar,
  Activity,
  Database,
  AlertCircle,
} from 'lucide-react';

interface TriggerNodeData {
  label: string;
  type: string;
  description?: string;
  triggerType: 'time_based' | 'event_based' | 'condition_based' | 'manual';
  config?: any;
}

const getTriggerIcon = (triggerType: string) => {
  switch (triggerType) {
    case 'time_based':
      return <Clock className="h-4 w-4" />;
    case 'event_based':
      return <Activity className="h-4 w-4" />;
    case 'condition_based':
      return <AlertCircle className="h-4 w-4" />;
    case 'manual':
      return <Users className="h-4 w-4" />;
    default:
      return <Calendar className="h-4 w-4" />;
  }
};

const getTriggerColor = (triggerType: string) => {
  switch (triggerType) {
    case 'time_based':
      return 'bg-blue-50 border-blue-200';
    case 'event_based':
      return 'bg-green-50 border-green-200';
    case 'condition_based':
      return 'bg-orange-50 border-orange-200';
    case 'manual':
      return 'bg-purple-50 border-purple-200';
    default:
      return 'bg-gray-50 border-gray-200';
  }
};

export const TriggerNode: React.FC<NodeProps<TriggerNodeData>> = ({
  data,
  selected,
}) => {
  const triggerType = data.triggerType || 'manual';
  const icon = getTriggerIcon(triggerType);
  const colorClass = getTriggerColor(triggerType);

  return (
    <div className={`min-w-[200px] ${selected ? 'ring-2 ring-primary' : ''}`}>
      <Card
        className={`${colorClass} shadow-md hover:shadow-lg transition-shadow`}
      >
        <CardContent className="p-3">
          <div className="flex items-center gap-2 mb-2">
            <div className="flex-shrink-0 text-muted-foreground">{icon}</div>
            <div className="flex-1 min-w-0">
              <h4 className="font-medium text-sm truncate">{data.label}</h4>
              <Badge variant="secondary" className="text-xs">
                Trigger
              </Badge>
            </div>
          </div>

          {data.description && (
            <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
              {data.description}
            </p>
          )}

          <div className="flex items-center justify-between">
            <span className="text-xs font-medium capitalize text-muted-foreground">
              {triggerType.replace('_', ' ')}
            </span>
            {data.config && (
              <Database className="h-3 w-3 text-muted-foreground" />
            )}
          </div>
        </CardContent>
      </Card>

      {/* Output handle */}
      <Handle
        type="source"
        position={Position.Right}
        id="trigger-output"
        className="w-3 h-3 bg-primary border-2 border-white"
      />
    </div>
  );
};
