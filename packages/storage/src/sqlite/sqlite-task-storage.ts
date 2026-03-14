/**
 * SQLite 任务存储实现
 * 基于 better-sqlite3 的任务持久化存储
 */

import type {
  TaskStorageMetadata,
  TaskListOptions,
  TaskStats,
  TaskStatsOptions,
  TaskStatus
} from '@modular-agent/types';
import type { TaskStorageCallback } from '../types/callback/index.js';
import { BaseSqliteStorage, BaseSqliteStorageConfig } from './base-sqlite-storage.js';

/**
 * SQLite 任务存储
 * 实现 TaskStorageCallback 接口
 */
export class SqliteTaskStorage extends BaseSqliteStorage<TaskStorageMetadata> implements TaskStorageCallback {
  constructor(config: BaseSqliteStorageConfig) {
    super(config);
  }

  /**
   * 获取表名
   */
  protected getTableName(): string {
    return 'tasks';
  }

  /**
   * 创建表结构
   */
  protected createTableSchema(): void {
    const db = this.getDb();

    db.exec(`
      CREATE TABLE IF NOT EXISTS tasks (
        id TEXT PRIMARY KEY,
        thread_id TEXT NOT NULL,
        workflow_id TEXT NOT NULL,
        status TEXT NOT NULL,
        submit_time INTEGER NOT NULL,
        start_time INTEGER,
        complete_time INTEGER,
        timeout INTEGER,
        error TEXT,
        error_stack TEXT,
        data BLOB NOT NULL,
        tags TEXT,
        custom_fields TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      )
    `);

    // 创建索引
    db.exec(`CREATE INDEX IF NOT EXISTS idx_tasks_thread_id ON tasks(thread_id)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_tasks_workflow_id ON tasks(workflow_id)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_tasks_submit_time ON tasks(submit_time)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_tasks_complete_time ON tasks(complete_time)`);
  }

  /**
   * 保存任务
   */
  async save(
    taskId: string,
    data: Uint8Array,
    metadata: TaskStorageMetadata
  ): Promise<void> {
    const db = this.getDb();
    const now = Date.now();

    try {
      const stmt = db.prepare(`
        INSERT INTO tasks (
          id, thread_id, workflow_id, status, submit_time, start_time,
          complete_time, timeout, error, error_stack, data, tags,
          custom_fields, created_at, updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          thread_id = excluded.thread_id,
          workflow_id = excluded.workflow_id,
          status = excluded.status,
          submit_time = excluded.submit_time,
          start_time = excluded.start_time,
          complete_time = excluded.complete_time,
          timeout = excluded.timeout,
          error = excluded.error,
          error_stack = excluded.error_stack,
          data = excluded.data,
          tags = excluded.tags,
          custom_fields = excluded.custom_fields,
          updated_at = excluded.updated_at
      `);

      stmt.run(
        taskId,
        metadata.threadId,
        metadata.workflowId,
        metadata.status,
        metadata.submitTime,
        metadata.startTime ?? null,
        metadata.completeTime ?? null,
        metadata.timeout ?? null,
        metadata.error ?? null,
        metadata.errorStack ?? null,
        Buffer.from(data),
        metadata.tags ? JSON.stringify(metadata.tags) : null,
        metadata.customFields ? JSON.stringify(metadata.customFields) : null,
        now,
        now
      );
    } catch (error) {
      this.handleSqliteError(error, 'save', { taskId });
    }
  }

  /**
   * 列出任务ID
   */
  async list(options?: TaskListOptions): Promise<string[]> {
    const db = this.getDb();

    try {
      let sql = `SELECT id FROM tasks`;
      const params: unknown[] = [];
      const conditions: string[] = [];

      if (options?.threadId) {
        conditions.push('thread_id = ?');
        params.push(options.threadId);
      }

      if (options?.workflowId) {
        conditions.push('workflow_id = ?');
        params.push(options.workflowId);
      }

      if (options?.status) {
        if (Array.isArray(options.status)) {
          conditions.push(`status IN (${options.status.map(() => '?').join(', ')})`);
          params.push(...options.status);
        } else {
          conditions.push('status = ?');
          params.push(options.status);
        }
      }

      if (options?.submitTimeFrom) {
        conditions.push('submit_time >= ?');
        params.push(options.submitTimeFrom);
      }

      if (options?.submitTimeTo) {
        conditions.push('submit_time <= ?');
        params.push(options.submitTimeTo);
      }

      if (options?.startTimeFrom) {
        conditions.push('start_time >= ?');
        params.push(options.startTimeFrom);
      }

      if (options?.startTimeTo) {
        conditions.push('start_time <= ?');
        params.push(options.startTimeTo);
      }

      if (options?.completeTimeFrom) {
        conditions.push('complete_time >= ?');
        params.push(options.completeTimeFrom);
      }

      if (options?.completeTimeTo) {
        conditions.push('complete_time <= ?');
        params.push(options.completeTimeTo);
      }

      if (options?.tags && options.tags.length > 0) {
        conditions.push(`tags LIKE ?`);
        params.push(`%"${options.tags[0]}"%`);
      }

      if (conditions.length > 0) {
        sql += ' WHERE ' + conditions.join(' AND ');
      }

      const sortBy = options?.sortBy ?? 'submitTime';
      const sortOrder = options?.sortOrder ?? 'desc';
      // Convert camelCase to snake_case for SQL column names
      const sortColumn = sortBy === 'submitTime' ? 'submit_time' :
                         sortBy === 'startTime' ? 'start_time' :
                         sortBy === 'completeTime' ? 'complete_time' :
                         sortBy;
      sql += ` ORDER BY ${sortColumn} ${sortOrder.toUpperCase()}`;

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

  /**
   * 获取元数据
   */
  async getMetadata(taskId: string): Promise<TaskStorageMetadata | null> {
    const db = this.getDb();

    try {
      const stmt = db.prepare(`
        SELECT
          id,
          thread_id as "threadId",
          workflow_id as "workflowId",
          status,
          submit_time as "submitTime",
          start_time as "startTime",
          complete_time as "completeTime",
          timeout,
          error,
          error_stack as "errorStack",
          tags,
          custom_fields as "customFields"
        FROM tasks WHERE id = ?
      `);
      const row = stmt.get(taskId) as {
        id: string;
        threadId: string;
        workflowId: string;
        status: string;
        submitTime: number;
        startTime: number | null;
        completeTime: number | null;
        timeout: number | null;
        error: string | null;
        errorStack: string | null;
        tags: string | null;
        customFields: string | null;
      } | undefined;

      if (!row) {
        return null;
      }

      return {
        taskId: row.id,
        threadId: row.threadId,
        workflowId: row.workflowId,
        status: row.status as TaskStatus,
        submitTime: row.submitTime,
        startTime: row.startTime ?? undefined,
        completeTime: row.completeTime ?? undefined,
        timeout: row.timeout ?? undefined,
        error: row.error ?? undefined,
        errorStack: row.errorStack ?? undefined,
        tags: row.tags ? JSON.parse(row.tags) : undefined,
        customFields: row.customFields ? JSON.parse(row.customFields) : undefined
      };
    } catch (error) {
      this.handleSqliteError(error, 'getMetadata', { taskId });
    }
  }

  /**
   * 获取任务统计信息
   */
  async getTaskStats(options?: TaskStatsOptions): Promise<TaskStats> {
    const db = this.getDb();

    try {
      let whereClause = '';
      const params: unknown[] = [];

      if (options?.workflowId) {
        whereClause = 'WHERE workflow_id = ?';
        params.push(options.workflowId);
      }

      if (options?.timeFrom) {
        whereClause = whereClause ? `${whereClause} AND submit_time >= ?` : 'WHERE submit_time >= ?';
        params.push(options.timeFrom);
      }

      if (options?.timeTo) {
        whereClause = whereClause ? `${whereClause} AND submit_time <= ?` : 'WHERE submit_time <= ?';
        params.push(options.timeTo);
      }

      // 获取总数和状态统计
      const countStmt = db.prepare(`
        SELECT
          COUNT(*) as total,
          SUM(CASE WHEN status = 'QUEUED' THEN 1 ELSE 0 END) as queued,
          SUM(CASE WHEN status = 'RUNNING' THEN 1 ELSE 0 END) as running,
          SUM(CASE WHEN status = 'COMPLETED' THEN 1 ELSE 0 END) as completed,
          SUM(CASE WHEN status = 'FAILED' THEN 1 ELSE 0 END) as failed,
          SUM(CASE WHEN status = 'CANCELLED' THEN 1 ELSE 0 END) as cancelled,
          SUM(CASE WHEN status = 'TIMEOUT' THEN 1 ELSE 0 END) as timeout
        FROM tasks ${whereClause}
      `);
      const countRow = countStmt.get(...params) as {
        total: number;
        queued: number;
        running: number;
        completed: number;
        failed: number;
        cancelled: number;
        timeout: number;
      };

      // 获取按工作流分组统计
      const workflowStmt = db.prepare(`
        SELECT workflow_id, COUNT(*) as count
        FROM tasks ${whereClause}
        GROUP BY workflow_id
      `);
      const workflowRows = workflowStmt.all(...params) as Array<{
        workflow_id: string;
        count: number;
      }>;

      const byWorkflow: Record<string, number> = {};
      for (const row of workflowRows) {
        byWorkflow[row.workflow_id] = row.count;
      }

      // 计算执行时间统计
      const timeWhereClause = whereClause
        ? `${whereClause} AND status = 'COMPLETED' AND start_time IS NOT NULL AND complete_time IS NOT NULL`
        : 'WHERE status = \'COMPLETED\' AND start_time IS NOT NULL AND complete_time IS NOT NULL';
      const timeStmt = db.prepare(`
        SELECT
          AVG(complete_time - start_time) as avg_time,
          MAX(complete_time - start_time) as max_time,
          MIN(complete_time - start_time) as min_time
        FROM tasks ${timeWhereClause}
      `);
      const timeRow = timeStmt.get(...params) as {
        avg_time: number | null;
        max_time: number | null;
        min_time: number | null;
      };

      const total = countRow.total || 0;
      const completed = countRow.completed || 0;
      const timeoutCount = countRow.timeout || 0;

      return {
        total,
        byStatus: {
          QUEUED: countRow.queued || 0,
          RUNNING: countRow.running || 0,
          COMPLETED: completed,
          FAILED: countRow.failed || 0,
          CANCELLED: countRow.cancelled || 0,
          TIMEOUT: timeoutCount
        },
        byWorkflow,
        avgExecutionTime: timeRow.avg_time ?? undefined,
        maxExecutionTime: timeRow.max_time ?? undefined,
        minExecutionTime: timeRow.min_time ?? undefined,
        successRate: total > 0 ? completed / total : undefined,
        timeoutRate: total > 0 ? timeoutCount / total : undefined
      };
    } catch (error) {
      this.handleSqliteError(error, 'getStats', { options });
    }
  }

  /**
   * 清理过期任务
   */
  async cleanupTasks(retentionTime: number): Promise<number> {
    const db = this.getDb();
    const cutoffTime = Date.now() - retentionTime;

    try {
      const stmt = db.prepare(`
        DELETE FROM tasks
        WHERE status IN ('COMPLETED', 'FAILED', 'CANCELLED', 'TIMEOUT')
        AND complete_time IS NOT NULL
        AND complete_time < ?
      `);
      const result = stmt.run(cutoffTime);
      return result.changes;
    } catch (error) {
      this.handleSqliteError(error, 'cleanup', { retentionTime });
    }
  }
}
