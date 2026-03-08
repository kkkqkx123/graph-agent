/**
 * SQLite 工作流存储实现
 * 基于 better-sqlite3 的工作流持久化存储
 */

import Database, { SqliteError } from 'better-sqlite3';
import type {
  WorkflowStorageMetadata,
  WorkflowListOptions,
  WorkflowVersionInfo,
  WorkflowVersionListOptions
} from '@modular-agent/types';
import type { WorkflowStorageCallback } from '../types/workflow-callback.js';
import { StorageError, StorageInitializationError } from '../types/storage-errors.js';

/**
 * SQLite 工作流存储配置
 */
export interface SqliteWorkflowStorageConfig {
  /** 数据库文件路径 */
  dbPath: string;
  /** 是否启用日志 */
  enableLogging?: boolean;
  /** 是否以只读模式打开 */
  readonly?: boolean;
  /** 数据库文件不存在时是否抛出错误 */
  fileMustExist?: boolean;
  /** 数据库锁定时的超时时间（毫秒） */
  timeout?: number;
}

/**
 * SQLite 工作流存储
 * 实现 WorkflowStorageCallback 接口
 */
export class SqliteWorkflowStorage implements WorkflowStorageCallback {
  private db: Database.Database | null = null;
  private initialized: boolean = false;

  constructor(private readonly config: SqliteWorkflowStorageConfig) {}

  /**
   * 初始化存储
   */
  async initialize(): Promise<void> {
    try {
      const options: Database.Options = {
        readonly: this.config.readonly ?? false,
        fileMustExist: this.config.fileMustExist ?? false,
        timeout: this.config.timeout ?? 5000
      };

      this.db = new Database(this.config.dbPath, options);

      this.db.pragma('journal_mode = WAL');
      this.db.pragma('wal_autocheckpoint = 1000');
      this.db.pragma('synchronous = NORMAL');

      if (!this.config.readonly) {
        // 创建工作流表
        this.db.exec(`
          CREATE TABLE IF NOT EXISTS workflows (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            version TEXT NOT NULL,
            description TEXT,
            author TEXT,
            category TEXT,
            tags TEXT,
            enabled INTEGER DEFAULT 1,
            data BLOB NOT NULL,
            node_count INTEGER NOT NULL,
            edge_count INTEGER NOT NULL,
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL,
            custom_fields TEXT
          )
        `);

        // 创建版本表
        this.db.exec(`
          CREATE TABLE IF NOT EXISTS workflow_versions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            workflow_id TEXT NOT NULL,
            version TEXT NOT NULL,
            data BLOB NOT NULL,
            change_note TEXT,
            created_at INTEGER NOT NULL,
            created_by TEXT,
            UNIQUE(workflow_id, version)
          )
        `);

        // 创建索引
        this.db.exec(`CREATE INDEX IF NOT EXISTS idx_workflows_name ON workflows(name)`);
        this.db.exec(`CREATE INDEX IF NOT EXISTS idx_workflows_category ON workflows(category)`);
        this.db.exec(`CREATE INDEX IF NOT EXISTS idx_workflows_author ON workflows(author)`);
        this.db.exec(`CREATE INDEX IF NOT EXISTS idx_workflow_versions_workflow_id ON workflow_versions(workflow_id)`);
      }

      this.initialized = true;
    } catch (error) {
      throw new StorageInitializationError(
        `Failed to initialize SQLite workflow storage: ${this.config.dbPath}`,
        error as Error
      );
    }
  }

  private ensureInitialized(): void {
    if (!this.initialized || !this.db) {
      throw new StorageError(
        'Storage not initialized. Call initialize() first.',
        'initialize'
      );
    }
  }

  private getDb(): Database.Database {
    this.ensureInitialized();
    return this.db!;
  }

  private handleSqliteError(error: unknown, operation: string, context?: Record<string, unknown>): never {
    if (error instanceof SqliteError) {
      throw new StorageError(
        `SQLite error [${error.code}]: ${error.message}`,
        operation,
        { ...context, code: error.code },
        error
      );
    }

    throw new StorageError(
      `Storage operation failed: ${operation}`,
      operation,
      context,
      error as Error
    );
  }

  async save(
    workflowId: string,
    data: Uint8Array,
    metadata: WorkflowStorageMetadata
  ): Promise<void> {
    const db = this.getDb();
    const now = Date.now();

    try {
      const stmt = db.prepare(`
        INSERT INTO workflows (
          id, name, version, description, author, category, tags, enabled,
          data, node_count, edge_count, created_at, updated_at, custom_fields
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          name = excluded.name,
          version = excluded.version,
          description = excluded.description,
          author = excluded.author,
          category = excluded.category,
          tags = excluded.tags,
          enabled = excluded.enabled,
          data = excluded.data,
          node_count = excluded.node_count,
          edge_count = excluded.edge_count,
          updated_at = excluded.updated_at,
          custom_fields = excluded.custom_fields
      `);

      stmt.run(
        workflowId,
        metadata.name,
        metadata.version,
        metadata.description ?? null,
        metadata.author ?? null,
        metadata.category ?? null,
        metadata.tags ? JSON.stringify(metadata.tags) : null,
        metadata.enabled !== false ? 1 : 0,
        Buffer.from(data),
        metadata.nodeCount,
        metadata.edgeCount,
        now,
        now,
        metadata.customFields ? JSON.stringify(metadata.customFields) : null
      );
    } catch (error) {
      this.handleSqliteError(error, 'save', { workflowId });
    }
  }

  async load(workflowId: string): Promise<Uint8Array | null> {
    const db = this.getDb();

    try {
      const stmt = db.prepare(`SELECT data FROM workflows WHERE id = ?`);
      const row = stmt.get(workflowId) as { data: Buffer } | undefined;

      if (!row) {
        return null;
      }

      return new Uint8Array(row.data);
    } catch (error) {
      this.handleSqliteError(error, 'load', { workflowId });
    }
  }

  async delete(workflowId: string): Promise<void> {
    const db = this.getDb();

    try {
      // 删除版本
      const deleteVersions = db.prepare(`DELETE FROM workflow_versions WHERE workflow_id = ?`);
      deleteVersions.run(workflowId);

      // 删除工作流
      const deleteWorkflow = db.prepare(`DELETE FROM workflows WHERE id = ?`);
      deleteWorkflow.run(workflowId);
    } catch (error) {
      this.handleSqliteError(error, 'delete', { workflowId });
    }
  }

  async list(options?: WorkflowListOptions): Promise<string[]> {
    const db = this.getDb();

    try {
      let sql = `SELECT id FROM workflows`;
      const params: unknown[] = [];
      const conditions: string[] = [];

      if (options?.name) {
        conditions.push('name LIKE ?');
        params.push(`%${options.name}%`);
      }

      if (options?.author) {
        conditions.push('author = ?');
        params.push(options.author);
      }

      if (options?.category) {
        conditions.push('category = ?');
        params.push(options.category);
      }

      if (options?.enabled !== undefined) {
        conditions.push('enabled = ?');
        params.push(options.enabled ? 1 : 0);
      }

      if (options?.createdAtFrom) {
        conditions.push('created_at >= ?');
        params.push(options.createdAtFrom);
      }

      if (options?.createdAtTo) {
        conditions.push('created_at <= ?');
        params.push(options.createdAtTo);
      }

      if (options?.updatedAtFrom) {
        conditions.push('updated_at >= ?');
        params.push(options.updatedAtFrom);
      }

      if (options?.updatedAtTo) {
        conditions.push('updated_at <= ?');
        params.push(options.updatedAtTo);
      }

      if (options?.tags && options.tags.length > 0) {
        conditions.push(`tags LIKE ?`);
        params.push(`%"${options.tags[0]}"%`);
      }

      if (conditions.length > 0) {
        sql += ' WHERE ' + conditions.join(' AND ');
      }

      const sortBy = options?.sortBy ?? 'updatedAt';
      const sortOrder = options?.sortOrder ?? 'desc';
      sql += ` ORDER BY ${sortBy} ${sortOrder.toUpperCase()}`;

      if (options?.limit !== undefined) {
        sql += ' LIMIT ?';
        params.push(options.limit);
      }

      if (options?.offset !== undefined) {
        sql += ' OFFSET ?';
        params.push(options.offset);
      }

      const stmt = db.prepare(sql);
      const rows = stmt.all(...params) as Array<{ id: string }>;

      return rows.map(row => row.id);
    } catch (error) {
      this.handleSqliteError(error, 'list', { options });
    }
  }

  async exists(workflowId: string): Promise<boolean> {
    const db = this.getDb();

    try {
      const stmt = db.prepare(`SELECT 1 FROM workflows WHERE id = ?`);
      const row = stmt.get(workflowId);
      return row !== undefined;
    } catch (error) {
      this.handleSqliteError(error, 'exists', { workflowId });
    }
  }

  async getMetadata(workflowId: string): Promise<WorkflowStorageMetadata | null> {
    const db = this.getDb();

    try {
      const stmt = db.prepare(`
        SELECT
          id, name, version, description, author, category, tags, enabled,
          node_count, edge_count, created_at, updated_at, custom_fields
        FROM workflows WHERE id = ?
      `);
      const row = stmt.get(workflowId) as {
        id: string;
        name: string;
        version: string;
        description: string | null;
        author: string | null;
        category: string | null;
        tags: string | null;
        enabled: number;
        node_count: number;
        edge_count: number;
        created_at: number;
        updated_at: number;
        custom_fields: string | null;
      } | undefined;

      if (!row) {
        return null;
      }

      return {
        workflowId: row.id,
        name: row.name,
        version: row.version,
        description: row.description ?? undefined,
        author: row.author ?? undefined,
        category: row.category ?? undefined,
        tags: row.tags ? JSON.parse(row.tags) : undefined,
        enabled: row.enabled === 1,
        nodeCount: row.node_count,
        edgeCount: row.edge_count,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        customFields: row.custom_fields ? JSON.parse(row.custom_fields) : undefined
      };
    } catch (error) {
      this.handleSqliteError(error, 'getMetadata', { workflowId });
    }
  }

  async updateWorkflowMetadata(
    workflowId: string,
    metadata: Partial<WorkflowStorageMetadata>
  ): Promise<void> {
    const db = this.getDb();
    const now = Date.now();

    try {
      const updates: string[] = ['updated_at = ?'];
      const params: unknown[] = [now];

      if (metadata.name !== undefined) {
        updates.push('name = ?');
        params.push(metadata.name);
      }
      if (metadata.description !== undefined) {
        updates.push('description = ?');
        params.push(metadata.description);
      }
      if (metadata.author !== undefined) {
        updates.push('author = ?');
        params.push(metadata.author);
      }
      if (metadata.category !== undefined) {
        updates.push('category = ?');
        params.push(metadata.category);
      }
      if (metadata.tags !== undefined) {
        updates.push('tags = ?');
        params.push(JSON.stringify(metadata.tags));
      }
      if (metadata.enabled !== undefined) {
        updates.push('enabled = ?');
        params.push(metadata.enabled ? 1 : 0);
      }
      if (metadata.customFields !== undefined) {
        updates.push('custom_fields = ?');
        params.push(JSON.stringify(metadata.customFields));
      }

      params.push(workflowId);

      const stmt = db.prepare(`UPDATE workflows SET ${updates.join(', ')} WHERE id = ?`);
      stmt.run(...params);
    } catch (error) {
      this.handleSqliteError(error, 'updateMetadata', { workflowId });
    }
  }

  // ==================== 版本管理 ====================

  async saveWorkflowVersion(
    workflowId: string,
    version: string,
    data: Uint8Array,
    changeNote?: string
  ): Promise<void> {
    const db = this.getDb();
    const now = Date.now();

    try {
      const stmt = db.prepare(`
        INSERT INTO workflow_versions (workflow_id, version, data, change_note, created_at)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(workflow_id, version) DO UPDATE SET
          data = excluded.data,
          change_note = excluded.change_note,
          created_at = excluded.created_at
      `);

      stmt.run(workflowId, version, Buffer.from(data), changeNote ?? null, now);
    } catch (error) {
      this.handleSqliteError(error, 'saveVersion', { workflowId, version });
    }
  }

  async listWorkflowVersions(
    workflowId: string,
    options?: WorkflowVersionListOptions
  ): Promise<WorkflowVersionInfo[]> {
    const db = this.getDb();

    try {
      let sql = `
        SELECT version, created_at, created_by, change_note
        FROM workflow_versions
        WHERE workflow_id = ?
        ORDER BY created_at DESC
      `;
      const params: unknown[] = [workflowId];

      if (options?.limit !== undefined) {
        sql += ' LIMIT ?';
        params.push(options.limit);
      }

      if (options?.offset !== undefined) {
        sql += ' OFFSET ?';
        params.push(options.offset);
      }

      const stmt = db.prepare(sql);
      const rows = stmt.all(...params) as Array<{
        version: string;
        created_at: number;
        created_by: string | null;
        change_note: string | null;
      }>;

      // 获取当前版本
      const currentWorkflow = db.prepare(`SELECT version FROM workflows WHERE id = ?`).get(workflowId) as { version: string } | undefined;
      const currentVersion = currentWorkflow?.version;

      return rows.map(row => ({
        version: row.version,
        createdAt: row.created_at,
        createdBy: row.created_by ?? undefined,
        changeNote: row.change_note ?? undefined,
        isCurrent: row.version === currentVersion
      }));
    } catch (error) {
      this.handleSqliteError(error, 'listVersions', { workflowId });
    }
  }

  async loadWorkflowVersion(workflowId: string, version: string): Promise<Uint8Array | null> {
    const db = this.getDb();

    try {
      const stmt = db.prepare(`
        SELECT data FROM workflow_versions WHERE workflow_id = ? AND version = ?
      `);
      const row = stmt.get(workflowId, version) as { data: Buffer } | undefined;

      if (!row) {
        return null;
      }

      return new Uint8Array(row.data);
    } catch (error) {
      this.handleSqliteError(error, 'loadVersion', { workflowId, version });
    }
  }

  async deleteWorkflowVersion(workflowId: string, version: string): Promise<void> {
    const db = this.getDb();

    try {
      const stmt = db.prepare(`
        DELETE FROM workflow_versions WHERE workflow_id = ? AND version = ?
      `);
      stmt.run(workflowId, version);
    } catch (error) {
      this.handleSqliteError(error, 'deleteVersion', { workflowId, version });
    }
  }

  async clear(): Promise<void> {
    const db = this.getDb();

    try {
      db.exec(`DELETE FROM workflow_versions`);
      db.exec(`DELETE FROM workflows`);
    } catch (error) {
      this.handleSqliteError(error, 'clear', {});
    }
  }

  async close(): Promise<void> {
    if (this.db) {
      try {
        this.db.close();
      } catch (error) {
        if (this.config.enableLogging) {
          console.error('Error closing database:', error);
        }
      } finally {
        this.db = null;
        this.initialized = false;
      }
    }
  }
}

