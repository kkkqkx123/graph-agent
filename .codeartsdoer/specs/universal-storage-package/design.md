# 通用存储包技术设计文档

## 1. 架构概览

### 1.1 设计目标
本存储包旨在提供一套灵活、可扩展的存储解决方案，满足 Modular Agent Framework 中检查点（Checkpoint）和线程（Thread）的持久化需求。设计遵循以下原则：

- **抽象优先**：定义统一的存储接口，支持多种后端实现
- **开箱即用**：提供 JSON 和 SQLite 两种开箱即用的存储实现
- **无缝集成**：与现有 SDK 的 `CheckpointStorageCallback` 接口无缝对接
- **类型安全**：充分利用 TypeScript 类型系统，避免运行时错误

### 1.2 架构分层

```
┌─────────────────────────────────────────────────────────────┐
│                    应用层 (Application)                      │
│  SDK 初始化时注入存储适配器                                    │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    适配层 (Adapters)                         │
│  CheckpointStorageAdapter  │  ThreadStorageAdapter          │
│  实现 SDK 回调接口           │  提供线程存储接口               │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    抽象层 (Abstractions)                     │
│  StorageProvider<T>        │  StorageMetadata               │
│  定义统一的 CRUD 接口        │  定义元数据结构                 │
└─────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┴───────────────┐
              ▼                               ▼
┌──────────────────────────┐    ┌──────────────────────────┐
│  JSON 存储后端           │    │  SQLite 存储后端         │
│  JsonStorageProvider     │    │  SqliteStorageProvider   │
│  基于文件系统            │    │  基于 better-sqlite3     │
└──────────────────────────┘    └──────────────────────────┘
```

### 1.3 模块结构

```
packages/storage/
├── src/
│   ├── index.ts                    # 统一导出入口
│   ├── types/                      # 类型定义
│   │   ├── index.ts
│   │   ├── storage-provider.ts     # 存储提供者接口
│   │   ├── storage-metadata.ts     # 元数据类型
│   │   └── storage-errors.ts       # 存储错误类型
│   ├── providers/                  # 存储后端实现
│   │   ├── index.ts
│   │   ├── json/                   # JSON 文件存储
│   │   │   ├── index.ts
│   │   │   └── json-storage-provider.ts
│   │   └── sqlite/                 # SQLite 存储
│   │       ├── index.ts
│   │       ├── sqlite-storage-provider.ts
│   │       └── schema.ts           # 数据库表结构
│   ├── adapters/                   # 适配器层
│   │   ├── index.ts
│   │   ├── checkpoint-storage-adapter.ts
│   │   └── thread-storage-adapter.ts
│   └── factory/                    # 工厂方法
│       ├── index.ts
│       └── storage-factory.ts
├── __tests__/                      # 测试目录
│   ├── providers/
│   │   ├── json-storage-provider.test.ts
│   │   └── sqlite-storage-provider.test.ts
│   ├── adapters/
│   │   ├── checkpoint-storage-adapter.test.ts
│   │   └── thread-storage-adapter.test.ts
│   └── integration/
│       └── sdk-integration.test.ts
├── package.json
├── tsconfig.json
└── README.md
```

**设计简化说明：**
- 移除 `abstractions` 目录：不需要额外的抽象层，接口定义在 `types` 中即可
- 移除 `utils` 目录：序列化逻辑内联到各 Provider 中，JSON 存储使用简单的文件操作
- 移除 `migrations.ts`：当前版本不需要数据库迁移机制
- 移除 `json-file-manager.ts`：文件操作逻辑直接在 Provider 中实现

---

## 2. 核心接口设计

### 2.1 存储提供者接口

```typescript
// src/types/storage-provider.ts

/**
 * 列表查询选项
 */
export interface ListOptions {
  /** 按元数据字段过滤 */
  filter?: Record<string, unknown>;
  /** 最大返回数量 */
  limit?: number;
  /** 偏移量 */
  offset?: number;
  /** 排序字段 */
  orderBy?: string;
  /** 排序方向 */
  orderDirection?: 'asc' | 'desc';
}

/**
 * 列表查询结果
 */
export interface ListResult<T> {
  /** 实体数组 */
  items: T[];
  /** 总数量 */
  total: number;
  /** 是否有更多 */
  hasMore: boolean;
}

/**
 * 存储提供者接口
 * 定义统一的 CRUD 操作接口
 */
export interface StorageProvider<T> {
  /**
   * 保存实体
   * @param id 实体唯一标识
   * @param entity 实体数据
   * @param metadata 可选的元数据
   */
  save(id: string, entity: T, metadata?: StorageMetadata): Promise<void>;

  /**
   * 加载实体
   * @param id 实体唯一标识
   * @returns 实体数据或 null
   */
  load(id: string): Promise<T | null>;

  /**
   * 删除实体
   * @param id 实体唯一标识
   */
  delete(id: string): Promise<void>;

  /**
   * 检查实体是否存在
   * @param id 实体唯一标识
   */
  exists(id: string): Promise<boolean>;

  /**
   * 列出实体
   * @param options 查询选项
   */
  list(options?: ListOptions): Promise<ListResult<string>>;

  /**
   * 获取实体元数据
   * @param id 实体唯一标识
   */
  getMetadata(id: string): Promise<StorageMetadata | null>;

  /**
   * 批量保存
   * @param items 实体数组
   */
  saveBatch(items: Array<{ id: string; entity: T; metadata?: StorageMetadata }>): Promise<void>;

  /**
   * 批量删除
   * @param ids 实体 ID 数组
   */
  deleteBatch(ids: string[]): Promise<void>;

  /**
   * 清空所有数据
   */
  clear(): Promise<void>;

  /**
   * 关闭存储连接
   */
  close(): Promise<void>;
}
```

### 2.2 元数据类型

```typescript
// src/types/storage-metadata.ts

/**
 * 存储元数据
 * 用于索引和查询的元数据信息
 */
export interface StorageMetadata {
  /** 创建时间戳 */
  createdAt: number;
  /** 更新时间戳 */
  updatedAt: number;
  /** 自定义标签 */
  tags?: string[];
  /** 自定义字段 */
  customFields?: Record<string, unknown>;
  /** 数据模型类型标识 */
  modelType: string;
  /** 关联的父模型 ID（如 threadId） */
  parentId?: string;
  /** 关联的工作流 ID */
  workflowId?: string;
}

/**
 * 检查点存储元数据
 * 扩展基础元数据，添加检查点特有字段
 */
export interface CheckpointStorageMetadataExt extends StorageMetadata {
  modelType: 'checkpoint';
  parentId: string;  // threadId
  workflowId: string;
  timestamp: number;
}

/**
 * 线程存储元数据
 * 扩展基础元数据，添加线程特有字段
 */
export interface ThreadStorageMetadataExt extends StorageMetadata {
  modelType: 'thread';
  workflowId: string;
  status: string;
  startTime: number;
  endTime?: number;
}
```

### 2.3 存储错误类型

```typescript
// src/types/storage-errors.ts

import { SDKError, ErrorSeverity } from '@modular-agent/types';

/**
 * 存储错误基类
 */
export class StorageError extends SDKError {
  constructor(
    message: string,
    public readonly operation: string,
    context?: Record<string, unknown>,
    cause?: Error,
    severity?: ErrorSeverity
  ) {
    super(message, severity, { ...context, operation }, cause);
  }

  protected override getDefaultSeverity(): ErrorSeverity {
    return 'error';
  }
}

/**
 * 存储配额超限错误
 */
export class StorageQuotaExceededError extends StorageError {
  constructor(
    message: string,
    public readonly requiredBytes: number,
    public readonly availableBytes: number,
    context?: Record<string, unknown>
  ) {
    super(message, 'quota', { ...context, requiredBytes, availableBytes });
  }
}

/**
 * 实体未找到错误
 */
export class EntityNotFoundError extends StorageError {
  constructor(
    message: string,
    public readonly entityId: string,
    public readonly entityType: string,
    context?: Record<string, unknown>
  ) {
    super(message, 'load', { ...context, entityId, entityType });
  }
}

/**
 * 存储初始化错误
 */
export class StorageInitializationError extends StorageError {
  constructor(
    message: string,
    cause?: Error,
    context?: Record<string, unknown>
  ) {
    super(message, 'initialize', context, cause);
  }
}

/**
 * 序列化错误
 */
export class SerializationError extends StorageError {
  constructor(
    message: string,
    public readonly entityId: string,
    cause?: Error,
    context?: Record<string, unknown>
  ) {
    super(message, 'serialize', { ...context, entityId }, cause);
  }
}
```

---

## 3. JSON 存储后端设计

### 3.1 文件组织结构

```
{baseDir}/
├── checkpoints/
│   └── {threadId}/
│       └── {checkpointId}.json
├── threads/
│   └── {workflowId}/
│       └── {threadId}.json
└── .metadata/
    ├── checkpoints.json      # 检查点元数据索引
    └── threads.json          # 线程元数据索引
```

### 3.2 JSON 文件格式

每个实体文件包含数据和元数据：

```json
{
  "id": "checkpoint-123",
  "data": { ... },           // 实体数据
  "metadata": {
    "createdAt": 1699999999999,
    "updatedAt": 1699999999999,
    "entityType": "checkpoint",
    "parentId": "thread-456",
    "workflowId": "workflow-789",
    "tags": ["manual", "important"],
    "customFields": {}
  }
}
```

### 3.3 JsonStorageProvider 实现

```typescript
// src/providers/json/json-storage-provider.ts

import type { StorageProvider, ListOptions, ListResult, StorageMetadata } from '../../types/index.js';
import { JsonFileManager } from './json-file-manager.js';
import { StorageError, EntityNotFoundError } from '../../types/storage-errors.js';
import * as path from 'path';
import * as fs from 'fs/promises';

/**
 * JSON 存储配置
 */
export interface JsonStorageConfig {
  /** 基础目录路径 */
  baseDir: string;
  /** 实体类型（用于子目录命名） */
  entityType: string;
  /** 是否启用文件锁 */
  enableFileLock?: boolean;
  /** 是否启用元数据索引 */
  enableMetadataIndex?: boolean;
}

/**
 * JSON 文件存储提供者
 */
export class JsonStorageProvider<T> implements StorageProvider<T> {
  private fileManager: JsonFileManager;
  private metadataIndex: Map<string, StorageMetadata> = new Map();
  private initialized: boolean = false;

  constructor(private readonly config: JsonStorageConfig) {
    this.fileManager = new JsonFileManager({
      enableFileLock: config.enableFileLock ?? true
    });
  }

  /**
   * 初始化存储
   * 创建必要的目录结构
   */
  async initialize(): Promise<void> {
    const entityDir = path.join(this.config.baseDir, this.config.entityType);
    await fs.mkdir(entityDir, { recursive: true });
    
    if (this.config.enableMetadataIndex) {
      await this.loadMetadataIndex();
    }
    
    this.initialized = true;
  }

  async save(id: string, entity: T, metadata?: StorageMetadata): Promise<void> {
    this.ensureInitialized();
    
    const filePath = this.getFilePath(id, metadata?.parentId);
    const fullMetadata: StorageMetadata = {
      createdAt: Date.now(),
      updatedAt: Date.now(),
      entityType: this.config.entityType,
      ...metadata
    };

    const content = {
      id,
      data: entity,
      metadata: fullMetadata
    };

    await this.fileManager.writeFile(filePath, JSON.stringify(content, null, 2));
    this.metadataIndex.set(id, fullMetadata);
  }

  async load(id: string): Promise<T | null> {
    this.ensureInitialized();
    
    // 尝试从元数据索引获取 parentId
    const metadata = this.metadataIndex.get(id);
    const filePath = this.getFilePath(id, metadata?.parentId);
    
    try {
      const content = await this.fileManager.readFile(filePath);
      const parsed = JSON.parse(content);
      return parsed.data as T;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return null;
      }
      throw new StorageError(
        `Failed to load entity: ${id}`,
        'load',
        { id },
        error as Error
      );
    }
  }

  async delete(id: string): Promise<void> {
    this.ensureInitialized();
    
    const metadata = this.metadataIndex.get(id);
    const filePath = this.getFilePath(id, metadata?.parentId);
    
    try {
      await this.fileManager.deleteFile(filePath);
      this.metadataIndex.delete(id);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw error;
      }
    }
  }

  async exists(id: string): Promise<boolean> {
    this.ensureInitialized();
    
    const metadata = this.metadataIndex.get(id);
    const filePath = this.getFilePath(id, metadata?.parentId);
    
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  async list(options?: ListOptions): Promise<ListResult<string>> {
    this.ensureInitialized();
    
    let ids = Array.from(this.metadataIndex.keys());
    
    // 应用过滤
    if (options?.filter) {
      ids = ids.filter(id => {
        const metadata = this.metadataIndex.get(id);
        return this.matchesFilter(metadata, options.filter!);
      });
    }
    
    // 应用排序
    if (options?.orderBy) {
      ids.sort((a, b) => {
        const metaA = this.metadataIndex.get(a);
        const metaB = this.metadataIndex.get(b);
        const valueA = (metaA as any)?.[options.orderBy!] ?? 0;
        const valueB = (metaB as any)?.[options.orderBy!] ?? 0;
        const cmp = valueA < valueB ? -1 : valueA > valueB ? 1 : 0;
        return options.orderDirection === 'desc' ? -cmp : cmp;
      });
    }
    
    const total = ids.length;
    const offset = options?.offset ?? 0;
    const limit = options?.limit ?? ids.length;
    
    return {
      items: ids.slice(offset, offset + limit),
      total,
      hasMore: offset + limit < total
    };
  }

  async getMetadata(id: string): Promise<StorageMetadata | null> {
    return this.metadataIndex.get(id) ?? null;
  }

  async saveBatch(items: Array<{ id: string; entity: T; metadata?: StorageMetadata }>): Promise<void> {
    for (const item of items) {
      await this.save(item.id, item.entity, item.metadata);
    }
  }

  async deleteBatch(ids: string[]): Promise<void> {
    for (const id of ids) {
      await this.delete(id);
    }
  }

  async clear(): Promise<void> {
    const entityDir = path.join(this.config.baseDir, this.config.entityType);
    await fs.rm(entityDir, { recursive: true, force: true });
    this.metadataIndex.clear();
    await this.initialize();
  }

  async close(): Promise<void> {
    if (this.config.enableMetadataIndex) {
      await this.saveMetadataIndex();
    }
  }

  private getFilePath(id: string, parentId?: string): string {
    if (parentId) {
      // 有父实体时，按父实体 ID 分组存储
      return path.join(
        this.config.baseDir,
        this.config.entityType,
        parentId,
        `${id}.json`
      );
    }
    return path.join(
      this.config.baseDir,
      this.config.entityType,
      `${id}.json`
    );
  }

  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new StorageError(
        'Storage not initialized. Call initialize() first.',
        'initialize'
      );
    }
  }

  private matchesFilter(metadata: StorageMetadata | undefined, filter: Record<string, unknown>): boolean {
    if (!metadata) return false;
    
    for (const [key, value] of Object.entries(filter)) {
      if (key === 'tags' && Array.isArray(value)) {
        // 标签匹配：检查是否包含任一标签
        const tags = metadata.tags ?? [];
        if (!value.some(tag => tags.includes(tag as string))) {
          return false;
        }
      } else if ((metadata as any)[key] !== value) {
        return false;
      }
    }
    return true;
  }

  private async loadMetadataIndex(): Promise<void> {
    const indexPath = path.join(
      this.config.baseDir,
      '.metadata',
      `${this.config.entityType}.json`
    );
    
    try {
      const content = await fs.readFile(indexPath, 'utf-8');
      const index = JSON.parse(content);
      for (const [id, metadata] of Object.entries(index)) {
        this.metadataIndex.set(id, metadata as StorageMetadata);
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw error;
      }
      // 索引文件不存在，从文件系统重建
      await this.rebuildMetadataIndex();
    }
  }

  private async rebuildMetadataIndex(): Promise<void> {
    const entityDir = path.join(this.config.baseDir, this.config.entityType);
    
    try {
      const entries = await fs.readdir(entityDir, { withFileTypes: true });
      
      for (const entry of entries) {
        if (entry.isDirectory()) {
          // 处理按父实体分组的目录
          const subDir = path.join(entityDir, entry.name);
          const files = await fs.readdir(subDir);
          
          for (const file of files) {
            if (file.endsWith('.json')) {
              await this.indexFile(path.join(subDir, file));
            }
          }
        } else if (entry.name.endsWith('.json')) {
          await this.indexFile(path.join(entityDir, entry.name));
        }
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw error;
      }
    }
  }

  private async indexFile(filePath: string): Promise<void> {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const parsed = JSON.parse(content);
      if (parsed.id && parsed.metadata) {
        this.metadataIndex.set(parsed.id, parsed.metadata);
      }
    } catch {
      // 忽略解析错误
    }
  }

  private async saveMetadataIndex(): Promise<void> {
    const metadataDir = path.join(this.config.baseDir, '.metadata');
    await fs.mkdir(metadataDir, { recursive: true });
    
    const indexPath = path.join(metadataDir, `${this.config.entityType}.json`);
    const index = Object.fromEntries(this.metadataIndex);
    
    await fs.writeFile(indexPath, JSON.stringify(index, null, 2));
  }
}
```

### 3.4 文件锁实现

```typescript
// src/utils/file-lock.ts

import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * 简单的文件锁实现
 * 使用 .lock 文件实现互斥访问
 */
export class FileLock {
  private lockPath: string;
  private locked: boolean = false;

  constructor(filePath: string) {
    this.lockPath = `${filePath}.lock`;
  }

  async acquire(timeout: number = 5000): Promise<void> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      try {
        await fs.mkdir(this.lockPath);
        this.locked = true;
        return;
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'EEXIST') {
          throw error;
        }
        // 等待一段时间后重试
        await new Promise(resolve => setTimeout(resolve, 50));
      }
    }
    
    throw new Error(`Failed to acquire lock: ${this.lockPath}`);
  }

  async release(): Promise<void> {
    if (this.locked) {
      await fs.rmdir(this.lockPath);
      this.locked = false;
    }
  }
}
```

---

## 4. SQLite 存储后端设计

### 4.1 数据库表结构

```typescript
// src/providers/sqlite/schema.ts

/**
 * 数据库表结构定义
 */
export const SCHEMA = {
  /**
   * 通用数据模型表
   * 支持多种模型类型：checkpoint、thread、workflow-template、graph 等
   */
  models: `
    CREATE TABLE IF NOT EXISTS models (
      id TEXT PRIMARY KEY,
      model_type TEXT NOT NULL,
      parent_id TEXT,
      workflow_id TEXT,
      data BLOB NOT NULL,
      tags TEXT,
      custom_fields TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
    
    CREATE INDEX IF NOT EXISTS idx_models_type ON models(model_type);
    CREATE INDEX IF NOT EXISTS idx_models_parent_id ON models(parent_id);
    CREATE INDEX IF NOT EXISTS idx_models_workflow_id ON models(workflow_id);
    CREATE INDEX IF NOT EXISTS idx_models_created_at ON models(created_at);
  `
};

/**
 * 初始化数据库表
 */
export function initializeSchema(db: any): void {
  for (const sql of Object.values(SCHEMA)) {
    db.exec(sql);
  }
}
```

**设计说明：**
- 使用统一的 `models` 表存储所有类型的数据模型
- `model_type` 字段区分不同类型：checkpoint、thread、workflow-template、graph 等
- 通过索引优化常用查询：按类型、父ID、工作流ID、创建时间查询
- 避免为每种模型类型创建单独的表，简化扩展

### 4.2 SqliteStorageProvider 实现

```typescript
// src/providers/sqlite/sqlite-storage-provider.ts

import type { StorageProvider, ListOptions, ListResult, StorageMetadata } from '../../types/index.js';
import { StorageError } from '../../types/storage-errors.js';
import { initializeSchema } from './schema.js';
import Database from 'better-sqlite3';

/**
 * SQLite 存储配置
 */
export interface SqliteStorageConfig {
  /** 数据库文件路径 */
  dbPath: string;
  /** 数据模型类型 */
  modelType: string;
}

/**
 * SQLite 存储提供者
 * 使用统一的 models 表存储所有类型的数据模型
 */
export class SqliteStorageProvider<T> implements StorageProvider<T> {
  private db: Database.Database;
  private initialized: boolean = false;

  constructor(private readonly config: SqliteStorageConfig) {
    this.db = new Database(config.dbPath);
  }

  /**
   * 初始化存储
   * 创建必要的表结构
   */
  async initialize(): Promise<void> {
    // 启用 WAL 模式（提高并发性能）
    this.db.pragma('journal_mode = WAL');
    
    // 初始化表结构
    initializeSchema(this.db);
    
    this.initialized = true;
  }

  async save(id: string, entity: T, metadata?: StorageMetadata): Promise<void> {
    this.ensureInitialized();
    
    const now = Date.now();
    const data = this.serialize(entity);
    
    const stmt = this.db.prepare(`
      INSERT INTO models (id, model_type, parent_id, workflow_id, data, tags, custom_fields, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        parent_id = excluded.parent_id,
        workflow_id = excluded.workflow_id,
        data = excluded.data,
        tags = excluded.tags,
        custom_fields = excluded.custom_fields,
        updated_at = excluded.updated_at
    `);
    
    stmt.run(
      id,
      this.config.modelType,
      metadata?.parentId ?? null,
      metadata?.workflowId ?? null,
      data,
      JSON.stringify(metadata?.tags ?? []),
      JSON.stringify(metadata?.customFields ?? {}),
      metadata?.createdAt ?? now,
      now
    );
  }

  async load(id: string): Promise<T | null> {
    this.ensureInitialized();
    
    const stmt = this.db.prepare(`
      SELECT data FROM models WHERE id = ? AND model_type = ?
    `);
    const row = stmt.get(id, this.config.modelType) as { data: Buffer } | undefined;
    
    if (!row) {
      return null;
    }
    
    return this.deserialize(row.data);
  }

  async delete(id: string): Promise<void> {
    this.ensureInitialized();
    
    const stmt = this.db.prepare(`
      DELETE FROM models WHERE id = ? AND model_type = ?
    `);
    stmt.run(id, this.config.modelType);
  }

  async exists(id: string): Promise<boolean> {
    this.ensureInitialized();
    
    const stmt = this.db.prepare(`
      SELECT 1 FROM models WHERE id = ? AND model_type = ?
    `);
    const row = stmt.get(id, this.config.modelType);
    return row !== undefined;
  }

  async list(options?: ListOptions): Promise<ListResult<string>> {
    this.ensureInitialized();
    
    let sql = `SELECT id FROM models WHERE model_type = ?`;
    const params: unknown[] = [this.config.modelType];
    const conditions: string[] = [];
    
    // 构建过滤条件
    if (options?.filter) {
      for (const [key, value] of Object.entries(options.filter)) {
        if (key === 'tags' && Array.isArray(value)) {
          // 标签过滤：使用 JSON 查询
          for (const tag of value) {
            conditions.push(`tags LIKE ?`);
            params.push(`%"${tag}"%`);
          }
        } else if (key === 'parentId') {
          conditions.push(`parent_id = ?`);
          params.push(value);
        } else if (key === 'workflowId') {
          conditions.push(`workflow_id = ?`);
          params.push(value);
        }
      }
    }
    
    if (conditions.length > 0) {
      sql += ` AND ${conditions.join(' AND ')}`;
    }
    
    // 排序
    sql += ` ORDER BY created_at DESC`;
    
    // 获取总数
    const countSql = sql.replace('SELECT id', 'SELECT COUNT(*) as total');
    const countStmt = this.db.prepare(countSql);
    const countRow = countStmt.get(...params) as { total: number };
    const total = countRow.total;
    
    // 分页
    if (options?.limit !== undefined) {
      sql += ` LIMIT ?`;
      params.push(options.limit);
    }
    if (options?.offset !== undefined) {
      sql += ` OFFSET ?`;
      params.push(options.offset);
    }
    
    const stmt = this.db.prepare(sql);
    const rows = stmt.all(...params) as Array<{ id: string }>;
    
    return {
      items: rows.map(row => row.id),
      total,
      hasMore: (options?.offset ?? 0) + (options?.limit ?? total) < total
    };
  }

  async getMetadata(id: string): Promise<StorageMetadata | null> {
    this.ensureInitialized();
    
    const stmt = this.db.prepare(`
      SELECT parent_id, workflow_id, tags, custom_fields, created_at, updated_at
      FROM models
      WHERE id = ? AND model_type = ?
    `);
    const row = stmt.get(id, this.config.modelType) as {
      parent_id: string | null;
      workflow_id: string | null;
      tags: string;
      custom_fields: string;
      created_at: number;
      updated_at: number;
    } | undefined;
    
    if (!row) {
      return null;
    }
    
    return {
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      modelType: this.config.modelType,
      parentId: row.parent_id ?? undefined,
      workflowId: row.workflow_id ?? undefined,
      tags: JSON.parse(row.tags),
      customFields: JSON.parse(row.custom_fields)
    };
  }

  async saveBatch(items: Array<{ id: string; entity: T; metadata?: StorageMetadata }>): Promise<void> {
    this.ensureInitialized();
    
    const now = Date.now();
    
    // 使用事务批量插入
    const insert = this.db.prepare(`
      INSERT INTO models (id, model_type, parent_id, workflow_id, data, tags, custom_fields, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        parent_id = excluded.parent_id,
        workflow_id = excluded.workflow_id,
        data = excluded.data,
        tags = excluded.tags,
        custom_fields = excluded.custom_fields,
        updated_at = excluded.updated_at
    `);
    
    const insertMany = this.db.transaction((items: Array<{ id: string; entity: T; metadata?: StorageMetadata }>) => {
      for (const item of items) {
        insert.run(
          item.id,
          this.config.modelType,
          item.metadata?.parentId ?? null,
          item.metadata?.workflowId ?? null,
          this.serialize(item.entity),
          JSON.stringify(item.metadata?.tags ?? []),
          JSON.stringify(item.metadata?.customFields ?? {}),
          item.metadata?.createdAt ?? now,
          now
        );
      }
    });
    
    insertMany(items);
  }

  async deleteBatch(ids: string[]): Promise<void> {
    this.ensureInitialized();
    
    const placeholders = ids.map(() => '?').join(',');
    const stmt = this.db.prepare(`
      DELETE FROM models WHERE id IN (${placeholders}) AND model_type = ?
    `);
    stmt.run(...ids, this.config.modelType);
  }

  async clear(): Promise<void> {
    this.ensureInitialized();
    this.db.prepare(`DELETE FROM models WHERE model_type = ?`).run(this.config.modelType);
  }

  async close(): Promise<void> {
    this.db.close();
  }

  private serialize(entity: T): Buffer {
    const json = JSON.stringify(entity);
    return Buffer.from(json, 'utf-8');
  }

  private deserialize(data: Buffer): T {
    const json = data.toString('utf-8');
    return JSON.parse(json);
  }

  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new StorageError(
        'Storage not initialized. Call initialize() first.',
        'initialize'
      );
    }
  }
}
```

---

## 5. 适配器层设计

### 5.1 检查点存储适配器

```typescript
// src/adapters/checkpoint-storage-adapter.ts

import type { CheckpointStorageCallback } from '@modular-agent/types';
import type { CheckpointStorageMetadata, CheckpointListOptions } from '@modular-agent/types';
import type { StorageProvider } from '../types/index.js';
import type { Checkpoint } from '@modular-agent/types';

/**
 * 检查点存储适配器
 * 实现 SDK 的 CheckpointStorageCallback 接口
 */
export class CheckpointStorageAdapter implements CheckpointStorageCallback {
  constructor(private readonly provider: StorageProvider<Checkpoint>) {}

  async saveCheckpoint(
    checkpointId: string,
    data: Uint8Array,
    metadata: CheckpointStorageMetadata
  ): Promise<void> {
    // 反序列化数据以获取完整检查点对象
    const checkpoint = this.deserializeCheckpoint(data);
    
    // 保存到存储提供者
    await this.provider.save(checkpointId, checkpoint, {
      createdAt: metadata.timestamp,
      updatedAt: metadata.timestamp,
      modelType: 'checkpoint',
      parentId: metadata.threadId,
      workflowId: metadata.workflowId,
      tags: metadata.tags,
      customFields: metadata.customFields
    });
  }

  async loadCheckpoint(checkpointId: string): Promise<Uint8Array | null> {
    const checkpoint = await this.provider.load(checkpointId);
    if (!checkpoint) {
      return null;
    }
    return this.serializeCheckpoint(checkpoint);
  }

  async deleteCheckpoint(checkpointId: string): Promise<void> {
    await this.provider.delete(checkpointId);
  }

  async listCheckpoints(options?: CheckpointListOptions): Promise<string[]> {
    const filter: Record<string, unknown> = {};
    
    if (options?.threadId) {
      filter.parentId = options.threadId;
    }
    if (options?.workflowId) {
      filter.workflowId = options.workflowId;
    }
    if (options?.tags && options.tags.length > 0) {
      filter.tags = options.tags;
    }
    
    const result = await this.provider.list({
      filter,
      limit: options?.limit,
      offset: options?.offset
    });
    
    return result.items;
  }

  async checkpointExists(checkpointId: string): Promise<boolean> {
    return this.provider.exists(checkpointId);
  }

  private serializeCheckpoint(checkpoint: Checkpoint): Uint8Array {
    const json = JSON.stringify(checkpoint);
    return new TextEncoder().encode(json);
  }

  private deserializeCheckpoint(data: Uint8Array): Checkpoint {
    const json = new TextDecoder().decode(data);
    return JSON.parse(json);
  }
}
```

### 5.2 线程存储适配器

```typescript
// src/adapters/thread-storage-adapter.ts

import type { StorageProvider, StorageMetadata } from '../types/index.js';
import type { Thread, ThreadStatus } from '@modular-agent/types';

/**
 * 线程列表查询选项
 */
export interface ThreadListOptions {
  /** 按工作流 ID 过滤 */
  workflowId?: string;
  /** 按状态过滤 */
  status?: ThreadStatus;
  /** 最大返回数量 */
  limit?: number;
  /** 偏移量 */
  offset?: number;
}

/**
 * 线程存储适配器
 * 提供线程实体的持久化接口
 */
export class ThreadStorageAdapter {
  constructor(private readonly provider: StorageProvider<Thread>) {}

  /**
   * 保存线程
   */
  async saveThread(thread: Thread): Promise<void> {
    const metadata: StorageMetadata = {
      createdAt: thread.startTime,
      updatedAt: thread.endTime ?? thread.startTime,
      modelType: 'thread',
      workflowId: thread.workflowId,
      customFields: {
        status: thread.status,
        currentNodeId: thread.currentNodeId
      }
    };
    
    await this.provider.save(thread.id, thread, metadata);
  }

  /**
   * 加载线程
   */
  async loadThread(id: string): Promise<Thread | null> {
    return this.provider.load(id);
  }

  /**
   * 删除线程
   */
  async deleteThread(id: string): Promise<void> {
    await this.provider.delete(id);
  }

  /**
   * 列出线程
   */
  async listThreads(options?: ThreadListOptions): Promise<string[]> {
    const filter: Record<string, unknown> = {};
    
    if (options?.workflowId) {
      filter.workflowId = options.workflowId;
    }
    
    const result = await this.provider.list({
      filter,
      limit: options?.limit,
      offset: options?.offset
    });
    
    return result.items;
  }

  /**
   * 检查线程是否存在
   */
  async threadExists(id: string): Promise<boolean> {
    return this.provider.exists(id);
  }

  /**
   * 批量保存线程
   */
  async saveThreads(threads: Thread[]): Promise<void> {
    await this.provider.saveBatch(
      threads.map(thread => ({
        id: thread.id,
        entity: thread,
        metadata: {
          createdAt: thread.startTime,
          updatedAt: thread.endTime ?? thread.startTime,
          modelType: 'thread',
          workflowId: thread.workflowId
        }
      }))
    );
  }

  /**
   * 批量删除线程
   */
  async deleteThreads(ids: string[]): Promise<void> {
    await this.provider.deleteBatch(ids);
  }
}
```

---

## 6. 工厂方法设计

```typescript
// src/factory/storage-factory.ts

import type { StorageProvider } from '../types/index.js';
import { JsonStorageProvider, JsonStorageConfig } from '../providers/json/index.js';
import { SqliteStorageProvider, SqliteStorageConfig } from '../providers/sqlite/index.js';
import { CheckpointStorageAdapter } from '../adapters/checkpoint-storage-adapter.js';
import { ThreadStorageAdapter } from '../adapters/thread-storage-adapter.js';
import type { Checkpoint, Thread } from '@modular-agent/types';

/**
 * 存储类型
 */
export type StorageType = 'json' | 'sqlite';

/**
 * 基础存储配置
 */
export interface BaseStorageConfig {
  /** 存储类型 */
  type: StorageType;
}

/**
 * JSON 存储配置
 */
export interface JsonStorageConfigExt extends BaseStorageConfig {
  type: 'json';
  /** 基础目录路径 */
  baseDir: string;
}

/**
 * SQLite 存储配置
 */
export interface SqliteStorageConfigExt extends BaseStorageConfig {
  type: 'sqlite';
  /** 数据库文件路径 */
  dbPath: string;
}

/**
 * 存储配置（联合类型）
 */
export type StorageConfig = JsonStorageConfigExt | SqliteStorageConfigExt;

/**
 * 存储工厂
 * 提供统一的存储实例创建方法
 */
export class StorageFactory {
  /**
   * 创建 JSON 存储提供者
   */
  private static async createJsonStorage<T>(
    config: JsonStorageConfig
  ): Promise<JsonStorageProvider<T>> {
    const provider = new JsonStorageProvider<T>(config);
    await provider.initialize();
    return provider;
  }

  /**
   * 创建 SQLite 存储提供者
   */
  private static async createSqliteStorage<T>(
    config: SqliteStorageConfig
  ): Promise<SqliteStorageProvider<T>> {
    const provider = new SqliteStorageProvider<T>(config);
    await provider.initialize();
    return provider;
  }

  /**
   * 创建检查点存储适配器
   */
  static async createCheckpointAdapter(config: StorageConfig): Promise<CheckpointStorageAdapter> {
    let provider: StorageProvider<Checkpoint>;
    
    if (config.type === 'json') {
      provider = await this.createJsonStorage<Checkpoint>({
        baseDir: config.baseDir,
        modelType: 'checkpoint'
      });
    } else {
      provider = await this.createSqliteStorage<Checkpoint>({
        dbPath: config.dbPath,
        modelType: 'checkpoint'
      });
    }
    
    return new CheckpointStorageAdapter(provider);
  }

  /**
   * 创建线程存储适配器
   */
  static async createThreadAdapter(config: StorageConfig): Promise<ThreadStorageAdapter> {
    let provider: StorageProvider<Thread>;
    
    if (config.type === 'json') {
      provider = await this.createJsonStorage<Thread>({
        baseDir: config.baseDir,
        modelType: 'thread'
      });
    } else {
      provider = await this.createSqliteStorage<Thread>({
        dbPath: config.dbPath,
        modelType: 'thread'
      });
    }
    
    return new ThreadStorageAdapter(provider);
  }

  /**
   * 创建完整的存储套件
   * 同时创建检查点和线程存储适配器
   */
  static async createStorageSuite(config: StorageConfig): Promise<{
    checkpointAdapter: CheckpointStorageAdapter;
    threadAdapter: ThreadStorageAdapter;
  }> {
    const [checkpointAdapter, threadAdapter] = await Promise.all([
      this.createCheckpointAdapter(config),
      this.createThreadAdapter(config)
    ]);
    
    return {
      checkpointAdapter,
      threadAdapter
    };
  }
}
```

**设计说明：**
- 使用联合类型 `StorageConfig` 提供类型安全的配置
- 工厂方法简化为只暴露必要的公共 API
- 内部方法使用 `private` 修饰符，避免外部直接创建 Provider

---

## 7. SDK 集成设计

### 7.1 集成方式

存储包通过 SDK 的 `setStorageCallback` 函数集成：

```typescript
// 应用层使用示例
import { StorageFactory } from '@modular-agent/storage';
import { setStorageCallback, initializeSDK } from '@modular-agent/sdk';

async function main() {
  // 创建检查点存储适配器
  const checkpointAdapter = await StorageFactory.createCheckpointAdapter({
    type: 'sqlite',
    sqlite: {
      dbPath: './data/agent.db'
    }
  });
  
  // 注入到 SDK
  setStorageCallback(checkpointAdapter);
  
  // 初始化 SDK
  initializeSDK();
  
  // ... 应用逻辑
}
```

### 7.2 DI 容器集成

存储包提供便捷的 DI 集成方法：

```typescript
// src/integration/sdk-integration.ts

import { setStorageCallback } from '@modular-agent/sdk';
import type { StorageConfig } from '../factory/storage-factory.js';
import { StorageFactory } from '../factory/storage-factory.js';

/**
 * 配置 SDK 存储
 * 便捷方法，自动创建适配器并注入 SDK
 */
export async function configureSDKStorage(config: StorageConfig): Promise<void> {
  const checkpointAdapter = await StorageFactory.createCheckpointAdapter(config);
  setStorageCallback(checkpointAdapter);
}
```

---

## 9. 依赖关系

### 9.1 package.json

```json
{
  "name": "@modular-agent/storage",
  "version": "1.0.0",
  "description": "Universal storage package for Modular Agent Framework",
  "type": "module",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js"
    }
  },
  "scripts": {
    "build": "tsc",
    "test": "vitest run --reporter=verbose",
    "test:watch": "vitest --watch",
    "test:coverage": "vitest run --coverage",
    "typecheck": "tsc --noEmit",
    "typecheck:tests": "tsc --noEmit -p tsconfig.test.json"
  },
  "dependencies": {
    "@modular-agent/types": "workspace:*",
    "@modular-agent/common-utils": "workspace:*",
    "better-sqlite3": "^11.0.0"
  },
  "devDependencies": {
    "@types/better-sqlite3": "^7.6.11"
  }
}
```

### 9.2 外部依赖说明

- **better-sqlite3**：高性能 SQLite 绑定，支持同步 API 和事务
  - 优点：性能优秀，API 简洁，支持 WAL 模式
  - 注意：需要原生编译，确保 Node.js 版本兼容

---

## 10. 扩展性设计

### 10.1 自定义存储后端

开发者可以实现 `StorageProvider` 接口，创建自定义存储后端：

```typescript
// 自定义存储示例
class CustomStorageProvider<T> implements StorageProvider<T> {
  // 实现接口方法...
}

// 使用自定义存储
const customProvider = new CustomStorageProvider<Checkpoint>({ ... });
const checkpointAdapter = new CheckpointStorageAdapter(customProvider);
setStorageCallback(checkpointAdapter);
```

### 10.2 新增数据模型类型

如需新增数据模型类型（如 workflow-template、graph），只需：

1. 定义新的模型类型常量
2. 创建对应的适配器类
3. 在工厂方法中添加创建方法

SQLite 存储使用统一的 `models` 表，通过 `model_type` 字段区分不同类型，无需修改表结构。

---

## 11. 安全考虑

### 11.1 数据安全

- **输入验证**：验证所有输入数据的合法性
- **路径遍历防护**：JSON 存储中防止路径遍历攻击
- **SQL 注入防护**：SQLite 存储使用参数化查询

### 11.2 访问控制

- **文件权限**：JSON 存储文件设置适当的权限
- **数据库权限**：SQLite 数据库文件权限控制

---

## 12. 性能优化

### 12.1 JSON 存储

- **简单实现**：直接读写文件，避免复杂的缓存机制
- **目录组织**：按模型类型分目录存储，便于管理

---

## 13. 错误处理

存储操作失败时抛出 `StorageError`，包含详细的错误信息：

```typescript
try {
  await storage.save(id, data);
} catch (error) {
  if (error instanceof StorageError) {
    console.error(`Storage operation failed: ${error.operation}`, error.context);
  }
  throw error;
}
```
