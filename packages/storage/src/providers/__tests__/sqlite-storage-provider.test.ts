/**
 * SQLite 存储提供者测试
 * 
 * 注意：SQLite 测试需要编译 better-sqlite3 原生模块
 * 动态检测原生模块是否可用，不可用时自动跳过测试
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs/promises';
import { SqliteStorageProvider } from '../sqlite/sqlite-storage-provider.js';
import type { StorageMetadata } from '../../types/index.js';

// 动态检测 better-sqlite3 原生模块是否可用
let sqliteAvailable = false;
try {
  require('better-sqlite3');
  sqliteAvailable = true;
} catch {
  console.warn('better-sqlite3 native module not available, SQLite tests will be skipped');
}

// 根据原生模块可用性决定是否跳过测试
const describeSqlite = sqliteAvailable ? describe : describe.skip;

describeSqlite('SqliteStorageProvider', () => {
  let tempDir: string;
  let dbPath: string;
  let storage: SqliteStorageProvider<{ name: string; value: number }>;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'storage-test-'));
    dbPath = path.join(tempDir, 'test.db');
    storage = new SqliteStorageProvider({
      dbPath,
      entityType: 'checkpoint'
    });
    await storage.initialize();
  });

  afterEach(async () => {
    await storage.close();
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  describe('save and load', () => {
    it('should save and load an entity', async () => {
      const entity = { name: 'test', value: 42 };
      const metadata: StorageMetadata = {
        createdAt: Date.now(),
        updatedAt: Date.now(),
        modelType: 'checkpoint',
        parentId: 'thread-1',
        workflowId: 'workflow-1'
      };

      await storage.save('checkpoint-1', entity, metadata);
      const loaded = await storage.load('checkpoint-1');

      expect(loaded).toEqual(entity);
    });

    it('should return null for non-existent entity', async () => {
      const loaded = await storage.load('non-existent');
      expect(loaded).toBeNull();
    });

    it('should update existing entity', async () => {
      const entity1 = { name: 'test1', value: 1 };
      const entity2 = { name: 'test2', value: 2 };

      await storage.save('checkpoint-1', entity1);
      await storage.save('checkpoint-1', entity2);
      const loaded = await storage.load('checkpoint-1');

      expect(loaded).toEqual(entity2);
    });
  });

  describe('delete', () => {
    it('should delete an entity', async () => {
      const entity = { name: 'test', value: 42 };
      await storage.save('checkpoint-1', entity);

      await storage.delete('checkpoint-1');
      const loaded = await storage.load('checkpoint-1');

      expect(loaded).toBeNull();
    });
  });

  describe('exists', () => {
    it('should return true for existing entity', async () => {
      const entity = { name: 'test', value: 42 };
      await storage.save('checkpoint-1', entity);

      const exists = await storage.exists('checkpoint-1');
      expect(exists).toBe(true);
    });

    it('should return false for non-existent entity', async () => {
      const exists = await storage.exists('non-existent');
      expect(exists).toBe(false);
    });
  });

  describe('list', () => {
    it('should list all entities', async () => {
      await storage.save('checkpoint-1', { name: 'test1', value: 1 });
      await storage.save('checkpoint-2', { name: 'test2', value: 2 });
      await storage.save('checkpoint-3', { name: 'test3', value: 3 });

      const result = await storage.list();

      expect(result.items).toHaveLength(3);
      expect(result.total).toBe(3);
    });

    it('should filter entities by parentId (threadId)', async () => {
      const metadata1: StorageMetadata = {
        createdAt: Date.now(),
        updatedAt: Date.now(),
        modelType: 'checkpoint',
        parentId: 'thread-1'
      };
      const metadata2: StorageMetadata = {
        createdAt: Date.now(),
        updatedAt: Date.now(),
        modelType: 'checkpoint',
        parentId: 'thread-2'
      };

      await storage.save('checkpoint-1', { name: 'test1', value: 1 }, metadata1);
      await storage.save('checkpoint-2', { name: 'test2', value: 2 }, metadata2);

      const result = await storage.list({
        filter: { parentId: 'thread-1' }
      });

      expect(result.items).toHaveLength(1);
      expect(result.items[0]).toBe('checkpoint-1');
    });

    it('should filter entities by workflowId', async () => {
      const metadata1: StorageMetadata = {
        createdAt: Date.now(),
        updatedAt: Date.now(),
        modelType: 'checkpoint',
        workflowId: 'workflow-1'
      };
      const metadata2: StorageMetadata = {
        createdAt: Date.now(),
        updatedAt: Date.now(),
        modelType: 'checkpoint',
        workflowId: 'workflow-2'
      };

      await storage.save('checkpoint-1', { name: 'test1', value: 1 }, metadata1);
      await storage.save('checkpoint-2', { name: 'test2', value: 2 }, metadata2);

      const result = await storage.list({
        filter: { workflowId: 'workflow-1' }
      });

      expect(result.items).toHaveLength(1);
      expect(result.items[0]).toBe('checkpoint-1');
    });

    it('should support pagination', async () => {
      await storage.save('checkpoint-1', { name: 'test1', value: 1 });
      await storage.save('checkpoint-2', { name: 'test2', value: 2 });
      await storage.save('checkpoint-3', { name: 'test3', value: 3 });

      const result = await storage.list({ limit: 2, offset: 0 });

      expect(result.items).toHaveLength(2);
      expect(result.total).toBe(3);
      expect(result.hasMore).toBe(true);
    });
  });

  describe('getMetadata', () => {
    it('should return metadata for entity', async () => {
      const metadata: StorageMetadata = {
        createdAt: Date.now(),
        updatedAt: Date.now(),
        modelType: 'checkpoint',
        parentId: 'thread-1',
        workflowId: 'workflow-1',
        tags: ['tag1', 'tag2']
      };

      await storage.save('checkpoint-1', { name: 'test', value: 42 }, metadata);
      const loadedMetadata = await storage.getMetadata('checkpoint-1');

      expect(loadedMetadata).not.toBeNull();
      expect(loadedMetadata?.parentId).toBe('thread-1');
      expect(loadedMetadata?.workflowId).toBe('workflow-1');
      expect(loadedMetadata?.tags).toEqual(['tag1', 'tag2']);
    });

    it('should return null for non-existent entity', async () => {
      const metadata = await storage.getMetadata('non-existent');
      expect(metadata).toBeNull();
    });
  });

  describe('batch operations', () => {
    it('should save batch', async () => {
      const items = [
        { id: 'checkpoint-1', entity: { name: 'test1', value: 1 } },
        { id: 'checkpoint-2', entity: { name: 'test2', value: 2 } },
        { id: 'checkpoint-3', entity: { name: 'test3', value: 3 } }
      ];

      await storage.saveBatch(items);

      const result = await storage.list();
      expect(result.items).toHaveLength(3);
    });

    it('should delete batch', async () => {
      await storage.save('checkpoint-1', { name: 'test1', value: 1 });
      await storage.save('checkpoint-2', { name: 'test2', value: 2 });
      await storage.save('checkpoint-3', { name: 'test3', value: 3 });

      await storage.deleteBatch(['checkpoint-1', 'checkpoint-2']);

      const result = await storage.list();
      expect(result.items).toHaveLength(1);
    });
  });

  describe('clear', () => {
    it('should clear all entities', async () => {
      await storage.save('checkpoint-1', { name: 'test1', value: 1 });
      await storage.save('checkpoint-2', { name: 'test2', value: 2 });

      await storage.clear();

      const result = await storage.list();
      expect(result.items).toHaveLength(0);
    });
  });
});

describeSqlite('SqliteStorageProvider (thread)', () => {
  let tempDir: string;
  let dbPath: string;
  let storage: SqliteStorageProvider<{ id: string; status: string }>;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'storage-test-'));
    dbPath = path.join(tempDir, 'test.db');
    storage = new SqliteStorageProvider({
      dbPath,
      entityType: 'thread'
    });
    await storage.initialize();
  });

  afterEach(async () => {
    await storage.close();
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('should save and load thread entity', async () => {
    const entity = { id: 'thread-1', status: 'running' };
    const metadata: StorageMetadata = {
      createdAt: Date.now(),
      updatedAt: Date.now(),
      modelType: 'thread',
      workflowId: 'workflow-1',
      customFields: {
        status: 'running',
        startTime: Date.now()
      }
    };

    await storage.save('thread-1', entity, metadata);
    const loaded = await storage.load('thread-1');

    expect(loaded).toEqual(entity);
  });

  it('should filter threads by status', async () => {
    const metadata1: StorageMetadata = {
      createdAt: Date.now(),
      updatedAt: Date.now(),
      modelType: 'thread',
      customFields: { status: 'running' }
    };
    const metadata2: StorageMetadata = {
      createdAt: Date.now(),
      updatedAt: Date.now(),
      modelType: 'thread',
      customFields: { status: 'completed' }
    };

    await storage.save('thread-1', { id: 'thread-1', status: 'running' }, metadata1);
    await storage.save('thread-2', { id: 'thread-2', status: 'completed' }, metadata2);

    const result = await storage.list({
      filter: { status: 'running' }
    });

    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toBe('thread-1');
  });
});
