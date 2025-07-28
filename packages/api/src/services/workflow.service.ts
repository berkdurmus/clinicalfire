import { Workflow, Pagination, WorkflowSchema } from '@clinical-fire/shared';
import { RulesEngine } from '@clinical-fire/core';
import { DatabaseService } from './database.service';
import { NotFoundError, BadRequestError, ConflictError } from '../middleware/error.handler';

interface WorkflowListOptions {
  page: number;
  limit: number;
  search?: string;
  enabled?: boolean;
}

export class WorkflowService {
  private db: DatabaseService;
  private rulesEngine: RulesEngine;

  constructor() {
    this.db = DatabaseService.getInstance();
    this.rulesEngine = new RulesEngine();
  }

  async listWorkflows(options: WorkflowListOptions): Promise<{
    workflows: Workflow[];
    pagination: Pagination;
  }> {
    const offset = (options.page - 1) * options.limit;
    
    let whereClause = '';
    const params: any[] = [];
    
    if (options.search) {
      whereClause = 'WHERE name LIKE ? OR description LIKE ?';
      params.push(`%${options.search}%`, `%${options.search}%`);
    }
    
    if (options.enabled !== undefined) {
      whereClause += whereClause ? ' AND ' : 'WHERE ';
      whereClause += 'enabled = ?';
      params.push(options.enabled ? 1 : 0);
    }

    // Get total count
    const countQuery = `SELECT COUNT(*) as total FROM workflows ${whereClause}`;
    const countResult = this.db.prepare(countQuery).get(...params) as { total: number };
    const total = countResult.total;

    // Get workflows
    const query = `
      SELECT * FROM workflows 
      ${whereClause}
      ORDER BY updated_at DESC 
      LIMIT ? OFFSET ?
    `;
    const workflows = this.db.prepare(query).all(...params, options.limit, offset) as any[];

    const pagination: Pagination = {
      page: options.page,
      limit: options.limit,
      total,
      totalPages: Math.ceil(total / options.limit),
    };

    return {
      workflows: workflows.map(this.mapDbToWorkflow),
      pagination,
    };
  }

  async getWorkflowById(id: string): Promise<Workflow | null> {
    const query = 'SELECT * FROM workflows WHERE id = ?';
    const row = this.db.prepare(query).get(id) as any;
    
    return row ? this.mapDbToWorkflow(row) : null;
  }

  async createWorkflow(workflowData: Partial<Workflow>, userId: string): Promise<Workflow> {
    // Validate workflow
    const validation = this.rulesEngine.validateWorkflow(workflowData as Workflow);
    if (!validation.valid) {
      throw BadRequestError(`Workflow validation failed: ${validation.errors.join(', ')}`);
    }

    // Check for duplicate name
    const existing = this.db.prepare('SELECT id FROM workflows WHERE name = ?').get(workflowData.name);
    if (existing) {
      throw ConflictError('Workflow with this name already exists');
    }

    const workflow: Workflow = {
      ...workflowData,
      name: workflowData.name!,
      version: workflowData.version || '1.0.0',
      enabled: workflowData.enabled ?? true,
      triggers: workflowData.triggers || [],
      actions: workflowData.actions || [],
      createdAt: new Date(),
      updatedAt: new Date(),
    } as Workflow;

    const query = `
      INSERT INTO workflows (id, name, version, description, enabled, triggers, actions, metadata, created_by, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const id = `wf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    this.db.prepare(query).run(
      id,
      workflow.name,
      workflow.version,
      workflow.description || null,
      workflow.enabled ? 1 : 0,
      JSON.stringify(workflow.triggers),
      JSON.stringify(workflow.actions),
      JSON.stringify(workflow.metadata || {}),
      userId,
      workflow.createdAt!.toISOString(),
      workflow.updatedAt!.toISOString()
    );

    return { ...workflow, id } as Workflow & { id: string };
  }

  async updateWorkflow(id: string, updates: Partial<Workflow>, userId: string): Promise<Workflow> {
    const existing = await this.getWorkflowById(id);
    if (!existing) {
      throw NotFoundError('Workflow not found');
    }

    const updated = { ...existing, ...updates, updatedAt: new Date() };

    // Validate updated workflow
    const validation = this.rulesEngine.validateWorkflow(updated);
    if (!validation.valid) {
      throw BadRequestError(`Workflow validation failed: ${validation.errors.join(', ')}`);
    }

    const query = `
      UPDATE workflows 
      SET name = ?, version = ?, description = ?, enabled = ?, triggers = ?, actions = ?, metadata = ?, updated_at = ?
      WHERE id = ?
    `;

    this.db.prepare(query).run(
      updated.name,
      updated.version,
      updated.description || null,
      updated.enabled ? 1 : 0,
      JSON.stringify(updated.triggers),
      JSON.stringify(updated.actions),
      JSON.stringify(updated.metadata || {}),
      updated.updatedAt.toISOString(),
      id
    );

    return updated;
  }

  async deleteWorkflow(id: string): Promise<void> {
    const result = this.db.prepare('DELETE FROM workflows WHERE id = ?').run(id);
    if (result.changes === 0) {
      throw NotFoundError('Workflow not found');
    }
  }

  async duplicateWorkflow(id: string, newName: string, userId: string): Promise<Workflow> {
    const original = await this.getWorkflowById(id);
    if (!original) {
      throw NotFoundError('Workflow not found');
    }

    const duplicate: Partial<Workflow> = {
      ...original,
      name: newName,
      version: '1.0.0',
      enabled: false, // Start disabled
    };

    delete (duplicate as any).id;
    delete (duplicate as any).createdAt;
    delete (duplicate as any).updatedAt;

    return this.createWorkflow(duplicate, userId);
  }

  async setWorkflowEnabled(id: string, enabled: boolean): Promise<Workflow> {
    const workflow = await this.getWorkflowById(id);
    if (!workflow) {
      throw NotFoundError('Workflow not found');
    }

    const query = 'UPDATE workflows SET enabled = ?, updated_at = ? WHERE id = ?';
    const updatedAt = new Date().toISOString();
    
    this.db.prepare(query).run(enabled ? 1 : 0, updatedAt, id);

    return { ...workflow, enabled, updatedAt: new Date(updatedAt) };
  }

  private mapDbToWorkflow(row: any): Workflow & { id: string } {
    return {
      id: row.id,
      name: row.name,
      version: row.version,
      description: row.description,
      enabled: row.enabled === 1,
      triggers: JSON.parse(row.triggers),
      actions: JSON.parse(row.actions),
      metadata: JSON.parse(row.metadata || '{}'),
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }
} 