/**
 * SQLite 数据库表结构定义
 */

/**
 * 检查点表创建语句
 */
export const CREATE_CHECKPOINTS_TABLE = `
  CREATE TABLE IF NOT EXISTS checkpoints (
    id TEXT PRIMARY KEY,
    thread_id TEXT NOT NULL,
    workflow_id TEXT NOT NULL,
    timestamp INTEGER NOT NULL,
    data BLOB NOT NULL,
    tags TEXT,
    custom_fields TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  )
`;

/**
 * 线程表创建语句
 */
export const CREATE_THREADS_TABLE = `
  CREATE TABLE IF NOT EXISTS threads (
    id TEXT PRIMARY KEY,
    workflow_id TEXT NOT NULL,
    status TEXT NOT NULL,
    start_time INTEGER NOT NULL,
    end_time INTEGER,
    data TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  )
`;

/**
 * 索引创建语句
 */
export const CREATE_CHECKPOINTS_THREAD_ID_INDEX = `
  CREATE INDEX IF NOT EXISTS idx_checkpoints_thread_id ON checkpoints(thread_id)
`;

export const CREATE_CHECKPOINTS_WORKFLOW_ID_INDEX = `
  CREATE INDEX IF NOT EXISTS idx_checkpoints_workflow_id ON checkpoints(workflow_id)
`;

export const CREATE_CHECKPOINTS_TIMESTAMP_INDEX = `
  CREATE INDEX IF NOT EXISTS idx_checkpoints_timestamp ON checkpoints(timestamp)
`;

export const CREATE_THREADS_WORKFLOW_ID_INDEX = `
  CREATE INDEX IF NOT EXISTS idx_threads_workflow_id ON threads(workflow_id)
`;

export const CREATE_THREADS_STATUS_INDEX = `
  CREATE INDEX IF NOT EXISTS idx_threads_status ON threads(status)
`;

/**
 * 所有初始化语句
 */
export const INIT_STATEMENTS = [
  CREATE_CHECKPOINTS_TABLE,
  CREATE_THREADS_TABLE,
  CREATE_CHECKPOINTS_THREAD_ID_INDEX,
  CREATE_CHECKPOINTS_WORKFLOW_ID_INDEX,
  CREATE_CHECKPOINTS_TIMESTAMP_INDEX,
  CREATE_THREADS_WORKFLOW_ID_INDEX,
  CREATE_THREADS_STATUS_INDEX
];
