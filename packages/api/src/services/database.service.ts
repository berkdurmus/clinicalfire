import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';

interface DatabaseRecord {
  [key: string]: any;
}

interface Table {
  [id: string]: DatabaseRecord;
}

interface Database {
  [tableName: string]: Table;
}

export class DatabaseService {
  private static instance: DatabaseService;
  private db: Database = {};
  private initialized = false;

  private constructor() {
    // Initialize empty database
    this.db = {
      workflows: {},
      executions: {},
      execution_logs: {},
      users: {}
    };
  }

  static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;
    
    this.seedInitialData();
    this.initialized = true;
  }

  private seedInitialData(): void {
    // Create default admin user (password: admin123)
    const passwordHash = bcrypt.hashSync('admin123', 10);
    
    this.db.users['user_admin'] = {
      id: 'user_admin',
      email: 'admin@clinical-fire.com',
      password_hash: passwordHash,
      first_name: 'Admin',
      last_name: 'User',
      role: 'admin',
      is_active: 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // Create sample workflow
    const sampleWorkflow = {
      id: 'wf_sample_critical_lab_alert',
      name: 'Critical Lab Alert',
      version: '1.0.0',
      description: 'Alert care team when critical lab values are detected',
      enabled: 1,
      triggers: JSON.stringify([
        {
          type: 'lab_result_received',
          conditions: [
            {
              field: 'test_type',
              operator: 'equals',
              value: 'troponin'
            },
            {
              field: 'value',
              operator: 'greater_than',
              value: 0.04
            }
          ]
        }
      ]),
      actions: JSON.stringify([
        {
          type: 'notify_doctor',
          params: {
            urgency: 'high',
            message: 'Critical troponin level detected: {{value}} ng/mL',
            recipients: ['on_call_cardiologist']
          }
        },
        {
          type: 'create_care_plan',
          params: {
            template: 'acute_mi_protocol',
            auto_schedule: true
          }
        },
        {
          type: 'log_event',
          params: {
            category: 'critical_alert',
            severity: 'high',
            message: 'Critical troponin alert triggered'
          }
        }
      ]),
      metadata: JSON.stringify({
        category: 'laboratory',
        priority: 'critical'
      }),
      created_by: 'user_admin',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    this.db.workflows[sampleWorkflow.id] = sampleWorkflow;
  }

  // Simple query interface that mimics SQLite
  prepare(sql: string) {
    return {
      get: (...params: any[]) => this.executeGet(sql, params),
      all: (...params: any[]) => this.executeAll(sql, params),
      run: (...params: any[]) => this.executeRun(sql, params)
    };
  }

  private executeGet(sql: string, params: any[]): any {
    // Simple implementation for common queries
    if (sql.includes('SELECT id FROM users WHERE email = ?')) {
      const email = params[0];
      return Object.values(this.db.users).find((user: any) => user.email === email) || null;
    }
    
    if (sql.includes('SELECT * FROM workflows WHERE id = ?')) {
      const id = params[0];
      return this.db.workflows[id] || null;
    }

    if (sql.includes('SELECT COUNT(*) as total FROM workflows')) {
      return { total: Object.keys(this.db.workflows).length };
    }

    return null;
  }

  private executeAll(sql: string, params: any[]): any[] {
    if (sql.includes('SELECT * FROM workflows')) {
      return Object.values(this.db.workflows);
    }
    return [];
  }

  private executeRun(sql: string, params: any[]): { changes: number; lastInsertRowid?: number } {
    if (sql.includes('INSERT INTO workflows')) {
      const [id, name, version, description, enabled, triggers, actions, metadata, created_by, created_at, updated_at] = params;
      this.db.workflows[id] = {
        id, name, version, description, enabled, triggers, actions, metadata, created_by, created_at, updated_at
      };
      return { changes: 1 };
    }

    if (sql.includes('UPDATE workflows')) {
      const id = params[params.length - 1]; // ID is usually last parameter in UPDATE
      if (this.db.workflows[id]) {
        // Update logic would go here
        return { changes: 1 };
      }
      return { changes: 0 };
    }

    if (sql.includes('DELETE FROM workflows')) {
      const id = params[0];
      if (this.db.workflows[id]) {
        delete this.db.workflows[id];
        return { changes: 1 };
      }
      return { changes: 0 };
    }

    return { changes: 0 };
  }

  transaction(fn: () => void) {
    // Simple transaction implementation
    return () => {
      try {
        fn();
      } catch (error) {
        // In a real implementation, this would rollback changes
        throw error;
      }
    };
  }

  close(): void {
    // Nothing to close for in-memory database
  }
} 