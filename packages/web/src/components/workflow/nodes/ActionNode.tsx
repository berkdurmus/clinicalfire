'use client';

import React from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Mail,
  Bell,
  MessageSquare,
  Database,
  Calendar,
  Workflow,
  FileText,
  Webhook,
  Users,
  Heart,
  Play,
} from 'lucide-react';

interface ActionNodeData {
  label: string;
  type: string;
  description?: string;
  actionType:
    | 'send_email'
    | 'send_alert'
    | 'send_sms'
    | 'update_patient_record'
    | 'schedule_task'
    | 'trigger_workflow'
    | 'log_event'
    | 'send_webhook'
    | 'create_care_plan'
    | 'notify_team';
  priority?: 'low' | 'normal' | 'high' | 'critical';
  config?: any;
  delay?: number;
  condition?: any;
}

const getActionIcon = (actionType: string) => {
  switch (actionType) {
    case 'send_email':
      return <Mail className="h-4 w-4" />;
    case 'send_alert':
      return <Bell className="h-4 w-4" />;
    case 'send_sms':
      return <MessageSquare className="h-4 w-4" />;
    case 'update_patient_record':
      return <Database className="h-4 w-4" />;
    case 'schedule_task':
      return <Calendar className="h-4 w-4" />;
    case 'trigger_workflow':
      return <Workflow className="h-4 w-4" />;
    case 'log_event':
      return <FileText className="h-4 w-4" />;
    case 'send_webhook':
      return <Webhook className="h-4 w-4" />;
    case 'create_care_plan':
      return <Heart className="h-4 w-4" />;
    case 'notify_team':
      return <Users className="h-4 w-4" />;
    default:
      return <Play className="h-4 w-4" />;
  }
};

const getActionColor = (actionType: string) => {
  switch (actionType) {
    case 'send_email':
    case 'send_sms':
    case 'notify_team':
      return 'bg-blue-50 border-blue-200';
    case 'send_alert':
      return 'bg-red-50 border-red-200';
    case 'update_patient_record':
    case 'create_care_plan':
      return 'bg-green-50 border-green-200';
    case 'schedule_task':
      return 'bg-purple-50 border-purple-200';
    case 'trigger_workflow':
      return 'bg-indigo-50 border-indigo-200';
    case 'log_event':
    case 'send_webhook':
      return 'bg-gray-50 border-gray-200';
    default:
      return 'bg-gray-50 border-gray-200';
  }
};

const getPriorityColor = (priority?: string) => {
  switch (priority) {
    case 'critical':
      return 'bg-red-500 text-white';
    case 'high':
      return 'bg-orange-500 text-white';
    case 'normal':
      return 'bg-blue-500 text-white';
    case 'low':
      return 'bg-gray-500 text-white';
    default:
      return 'bg-blue-500 text-white';
  }
};

export const ActionNode: React.FC<NodeProps<ActionNodeData>> = ({
  data,
  selected,
}) => {
  const actionType = data.actionType || 'log_event';
  const icon = getActionIcon(actionType);
  const colorClass = getActionColor(actionType);
  const priority = data.priority || 'normal';

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
              <div className="flex items-center gap-1">
                <Badge variant="secondary" className="text-xs">
                  Action
                </Badge>
                {priority !== 'normal' && (
                  <Badge className={`text-xs ${getPriorityColor(priority)}`}>
                    {priority}
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {data.description && (
            <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
              {data.description}
            </p>
          )}

          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium capitalize text-muted-foreground">
                {actionType.replace(/_/g, ' ')}
              </span>
            </div>

            {data.delay && (
              <div className="text-xs text-muted-foreground">
                Delay: {data.delay}s
              </div>
            )}

            {data.condition && (
              <div className="text-xs text-muted-foreground">
                Conditional execution
              </div>
            )}

            {data.config && Object.keys(data.config).length > 0 && (
              <div className="text-xs text-muted-foreground">
                {Object.keys(data.config).length} parameter(s)
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Input handle */}
      <Handle
        type="target"
        position={Position.Left}
        id="action-input"
        className="w-3 h-3 bg-primary border-2 border-white"
      />

      {/* Output handle (for chaining actions) */}
      <Handle
        type="source"
        position={Position.Right}
        id="action-output"
        className="w-3 h-3 bg-primary border-2 border-white"
      />
    </div>
  );
};
