'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Clock,
  Activity,
  AlertCircle,
  Users,
  GitBranch,
  Mail,
  Bell,
  MessageSquare,
  Database,
  Calendar,
  Workflow,
  FileText,
  Heart,
  Search,
  Plus,
} from 'lucide-react';

interface NodeTemplate {
  id: string;
  type: 'trigger' | 'condition' | 'action';
  label: string;
  description: string;
  icon: React.ReactNode;
  category: string;
  data: any;
}

const NODE_TEMPLATES: NodeTemplate[] = [
  // Triggers
  {
    id: 'time-trigger',
    type: 'trigger',
    label: 'Time-based Trigger',
    description: 'Trigger workflow at specific times or intervals',
    icon: <Clock className="h-4 w-4" />,
    category: 'triggers',
    data: {
      label: 'Time Trigger',
      triggerType: 'time_based',
      description: 'Executes at scheduled times',
    },
  },
  {
    id: 'event-trigger',
    type: 'trigger',
    label: 'Event Trigger',
    description: 'Trigger when specific events occur',
    icon: <Activity className="h-4 w-4" />,
    category: 'triggers',
    data: {
      label: 'Event Trigger',
      triggerType: 'event_based',
      description: 'Responds to system events',
    },
  },
  {
    id: 'condition-trigger',
    type: 'trigger',
    label: 'Condition Trigger',
    description: 'Trigger when conditions are met',
    icon: <AlertCircle className="h-4 w-4" />,
    category: 'triggers',
    data: {
      label: 'Condition Trigger',
      triggerType: 'condition_based',
      description: 'Activated by data conditions',
    },
  },
  {
    id: 'manual-trigger',
    type: 'trigger',
    label: 'Manual Trigger',
    description: 'Manually triggered by users',
    icon: <Users className="h-4 w-4" />,
    category: 'triggers',
    data: {
      label: 'Manual Trigger',
      triggerType: 'manual',
      description: 'User-initiated execution',
    },
  },

  // Conditions
  {
    id: 'decision-condition',
    type: 'condition',
    label: 'Decision Point',
    description: 'Branch workflow based on conditions',
    icon: <GitBranch className="h-4 w-4" />,
    category: 'conditions',
    data: {
      label: 'Decision Point',
      description: 'Evaluates conditions and branches',
      operator: 'AND',
    },
  },

  // Actions
  {
    id: 'send-email',
    type: 'action',
    label: 'Send Email',
    description: 'Send email notifications',
    icon: <Mail className="h-4 w-4" />,
    category: 'communication',
    data: {
      label: 'Send Email',
      actionType: 'send_email',
      description: 'Email notification action',
      priority: 'normal',
    },
  },
  {
    id: 'send-alert',
    type: 'action',
    label: 'Send Alert',
    description: 'Send critical alerts',
    icon: <Bell className="h-4 w-4" />,
    category: 'communication',
    data: {
      label: 'Send Alert',
      actionType: 'send_alert',
      description: 'Critical alert notification',
      priority: 'high',
    },
  },
  {
    id: 'send-sms',
    type: 'action',
    label: 'Send SMS',
    description: 'Send SMS messages',
    icon: <MessageSquare className="h-4 w-4" />,
    category: 'communication',
    data: {
      label: 'Send SMS',
      actionType: 'send_sms',
      description: 'SMS notification action',
      priority: 'normal',
    },
  },
  {
    id: 'update-record',
    type: 'action',
    label: 'Update Patient Record',
    description: 'Update patient data',
    icon: <Database className="h-4 w-4" />,
    category: 'data',
    data: {
      label: 'Update Record',
      actionType: 'update_patient_record',
      description: 'Modifies patient information',
      priority: 'normal',
    },
  },
  {
    id: 'schedule-task',
    type: 'action',
    label: 'Schedule Task',
    description: 'Schedule follow-up tasks',
    icon: <Calendar className="h-4 w-4" />,
    category: 'workflow',
    data: {
      label: 'Schedule Task',
      actionType: 'schedule_task',
      description: 'Creates scheduled tasks',
      priority: 'normal',
    },
  },
  {
    id: 'trigger-workflow',
    type: 'action',
    label: 'Trigger Workflow',
    description: 'Start another workflow',
    icon: <Workflow className="h-4 w-4" />,
    category: 'workflow',
    data: {
      label: 'Trigger Workflow',
      actionType: 'trigger_workflow',
      description: 'Initiates sub-workflow',
      priority: 'normal',
    },
  },
  {
    id: 'create-care-plan',
    type: 'action',
    label: 'Create Care Plan',
    description: 'Generate patient care plans',
    icon: <Heart className="h-4 w-4" />,
    category: 'clinical',
    data: {
      label: 'Create Care Plan',
      actionType: 'create_care_plan',
      description: 'Generates care plan',
      priority: 'normal',
    },
  },
  {
    id: 'log-event',
    type: 'action',
    label: 'Log Event',
    description: 'Record workflow events',
    icon: <FileText className="h-4 w-4" />,
    category: 'logging',
    data: {
      label: 'Log Event',
      actionType: 'log_event',
      description: 'Records audit information',
      priority: 'low',
    },
  },
];

interface WorkflowNodePaletteProps {
  onAddNode: (nodeData: any) => void;
}

export const WorkflowNodePalette: React.FC<WorkflowNodePaletteProps> = ({
  onAddNode,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const categories = [
    'all',
    'triggers',
    'conditions',
    'communication',
    'data',
    'workflow',
    'clinical',
    'logging',
  ];

  const filteredTemplates = NODE_TEMPLATES.filter((template) => {
    const matchesSearch =
      template.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
      template.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory =
      selectedCategory === 'all' || template.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleAddNode = (template: NodeTemplate) => {
    onAddNode({
      type: template.type,
      ...template.data,
    });
  };

  return (
    <div className="h-full flex flex-col bg-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Workflow Components</CardTitle>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2 top-2.5 h-3 w-3 text-muted-foreground" />
          <Input
            placeholder="Search components..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-7 text-xs h-8"
          />
        </div>

        {/* Category filters */}
        <div className="flex flex-wrap gap-1">
          {categories.map((category) => (
            <Button
              key={category}
              variant={selectedCategory === category ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setSelectedCategory(category)}
              className="text-xs h-6 px-2 capitalize"
            >
              {category}
            </Button>
          ))}
        </div>
      </CardHeader>

      <CardContent className="flex-1 overflow-y-auto p-2 space-y-2">
        {filteredTemplates.map((template) => (
          <Card
            key={template.id}
            className="cursor-pointer hover:bg-accent transition-colors"
            onClick={() => handleAddNode(template)}
          >
            <CardContent className="p-2">
              <div className="flex items-start gap-2">
                <div className="flex-shrink-0 text-muted-foreground mt-0.5">
                  {template.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1 mb-1">
                    <h4 className="font-medium text-xs truncate">
                      {template.label}
                    </h4>
                    <Badge variant="outline" className="text-xs px-1">
                      {template.type}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {template.description}
                  </p>
                </div>
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}

        {filteredTemplates.length === 0 && (
          <div className="text-center py-8">
            <p className="text-sm text-muted-foreground">No components found</p>
            <p className="text-xs text-muted-foreground mt-1">
              Try adjusting your search or category filter
            </p>
          </div>
        )}
      </CardContent>
    </div>
  );
};
