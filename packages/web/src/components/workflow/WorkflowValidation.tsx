'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AlertTriangle,
  AlertCircle,
  Info,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  X,
  Eye,
} from 'lucide-react';

interface ValidationResult {
  type: 'error' | 'warning' | 'info' | 'success';
  message: string;
  nodeId?: string | null;
  suggestion?: string;
}

interface WorkflowValidationProps {
  validationResults: ValidationResult[];
  onHighlightNode?: (nodeId: string | null) => void;
  onFixIssue?: (result: ValidationResult) => void;
}

const getValidationIcon = (type: string) => {
  switch (type) {
    case 'error':
      return <AlertCircle className="h-4 w-4 text-red-500" />;
    case 'warning':
      return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
    case 'info':
      return <Info className="h-4 w-4 text-blue-500" />;
    case 'success':
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    default:
      return <Info className="h-4 w-4 text-gray-500" />;
  }
};

const getValidationBadgeColor = (type: string) => {
  switch (type) {
    case 'error':
      return 'bg-red-100 text-red-800 border-red-200';
    case 'warning':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'info':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'success':
      return 'bg-green-100 text-green-800 border-green-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

export const WorkflowValidation: React.FC<WorkflowValidationProps> = ({
  validationResults,
  onHighlightNode,
  onFixIssue,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [dismissedResults, setDismissedResults] = useState<Set<number>>(
    new Set()
  );

  const visibleResults = validationResults.filter(
    (_, index) => !dismissedResults.has(index)
  );

  const groupedResults = visibleResults.reduce(
    (acc, result) => {
      if (!acc[result.type]) {
        acc[result.type] = [];
      }
      acc[result.type].push(result);
      return acc;
    },
    {} as Record<string, ValidationResult[]>
  );

  const resultCounts = {
    error: groupedResults.error?.length || 0,
    warning: groupedResults.warning?.length || 0,
    info: groupedResults.info?.length || 0,
    success: groupedResults.success?.length || 0,
  };

  const totalIssues = resultCounts.error + resultCounts.warning;

  const handleDismiss = (index: number) => {
    setDismissedResults((prev) => new Set(Array.from(prev).concat(index)));
  };

  const handleHighlightNode = (nodeId: string | null) => {
    if (onHighlightNode) {
      onHighlightNode(nodeId);
    }
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="h-6 w-6 p-0"
            >
              {isExpanded ? (
                <ChevronDown className="h-3 w-3" />
              ) : (
                <ChevronRight className="h-3 w-3" />
              )}
            </Button>
            Validation
            {totalIssues > 0 && (
              <Badge variant="destructive" className="text-xs">
                {totalIssues}
              </Badge>
            )}
          </CardTitle>
        </div>

        {/* Summary badges */}
        {isExpanded && (
          <div className="flex flex-wrap gap-1">
            {resultCounts.error > 0 && (
              <Badge className={getValidationBadgeColor('error')}>
                {resultCounts.error} errors
              </Badge>
            )}
            {resultCounts.warning > 0 && (
              <Badge className={getValidationBadgeColor('warning')}>
                {resultCounts.warning} warnings
              </Badge>
            )}
            {resultCounts.info > 0 && (
              <Badge className={getValidationBadgeColor('info')}>
                {resultCounts.info} info
              </Badge>
            )}
            {resultCounts.success > 0 && (
              <Badge className={getValidationBadgeColor('success')}>
                {resultCounts.success} passed
              </Badge>
            )}
          </div>
        )}
      </CardHeader>

      {isExpanded && (
        <CardContent className="flex-1 overflow-y-auto p-2 space-y-2">
          {visibleResults.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle className="h-8 w-8 text-green-500 mx-auto mb-2" />
              <p className="text-sm font-medium text-green-700">
                Workflow is valid!
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                No issues found in your workflow configuration.
              </p>
            </div>
          ) : (
            <>
              {/* Errors first */}
              {groupedResults.error?.map((result, index) => (
                <ValidationResultCard
                  key={`error-${index}`}
                  result={result}
                  index={validationResults.indexOf(result)}
                  onHighlight={handleHighlightNode}
                  onDismiss={handleDismiss}
                  onFix={onFixIssue}
                />
              ))}

              {/* Then warnings */}
              {groupedResults.warning?.map((result, index) => (
                <ValidationResultCard
                  key={`warning-${index}`}
                  result={result}
                  index={validationResults.indexOf(result)}
                  onHighlight={handleHighlightNode}
                  onDismiss={handleDismiss}
                  onFix={onFixIssue}
                />
              ))}

              {/* Then info */}
              {groupedResults.info?.map((result, index) => (
                <ValidationResultCard
                  key={`info-${index}`}
                  result={result}
                  index={validationResults.indexOf(result)}
                  onHighlight={handleHighlightNode}
                  onDismiss={handleDismiss}
                  onFix={onFixIssue}
                />
              ))}

              {/* Finally success */}
              {groupedResults.success?.map((result, index) => (
                <ValidationResultCard
                  key={`success-${index}`}
                  result={result}
                  index={validationResults.indexOf(result)}
                  onHighlight={handleHighlightNode}
                  onDismiss={handleDismiss}
                  onFix={onFixIssue}
                />
              ))}
            </>
          )}
        </CardContent>
      )}
    </Card>
  );
};

interface ValidationResultCardProps {
  result: ValidationResult;
  index: number;
  onHighlight: (nodeId: string | null) => void;
  onDismiss: (index: number) => void;
  onFix?: (result: ValidationResult) => void;
}

const ValidationResultCard: React.FC<ValidationResultCardProps> = ({
  result,
  index,
  onHighlight,
  onDismiss,
  onFix,
}) => {
  return (
    <Card
      className={`border ${
        result.type === 'error'
          ? 'border-red-200'
          : result.type === 'warning'
            ? 'border-yellow-200'
            : result.type === 'success'
              ? 'border-green-200'
              : 'border-blue-200'
      }`}
    >
      <CardContent className="p-2">
        <div className="flex items-start gap-2">
          <div className="flex-shrink-0 mt-0.5">
            {getValidationIcon(result.type)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium mb-1">{result.message}</p>

            {result.suggestion && (
              <p className="text-xs text-muted-foreground mb-2">
                💡 {result.suggestion}
              </p>
            )}

            <div className="flex items-center gap-1">
              {result.nodeId && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onHighlight(result.nodeId || null)}
                  className="h-5 text-xs px-1"
                >
                  <Eye className="h-3 w-3 mr-1" />
                  Show
                </Button>
              )}

              {onFix && result.type === 'error' && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onFix(result)}
                  className="h-5 text-xs px-1"
                >
                  Fix
                </Button>
              )}

              <Button
                variant="ghost"
                size="sm"
                onClick={() => onDismiss(index)}
                className="h-5 w-5 p-0 ml-auto"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
