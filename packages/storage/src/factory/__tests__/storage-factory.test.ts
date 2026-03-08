/**
 * 存储工厂测试
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs/promises';
import { StorageFactory } from '../storage-factory.js';

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

describe('StorageFactory', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'storage-test-'));
  });

  afterEach(async () => {
    // Windows 上需要等待一小段时间确保文件句柄释放
    await new Promise(resolve => setTimeout(resolve, 100));
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  describe('createJsonCheckpointStorage', () => {
    it('should create JSON checkpoint storage', async () => {
      const storage = await StorageFactory.createJsonCheckpointStorage({
        baseDir: tempDir
      });

      expect(storage).toBeDefined();

      // 测试基本操作
      const data = new TextEncoder().encode('test data');
      await storage.save('checkpoint-1', data);
      const loaded = await storage.load('checkpoint-1');
      expect(loaded).toEqual(data);

      await storage.close();
    });
  });

  describe('createJsonThreadStorage', () => {
    it('should create JSON thread storage', async () => {
      const storage = await StorageFactory.createJsonThreadStorage({
        baseDir: tempDir
      });

      expect(storage).toBeDefined();

      // 测试基本操作
      const thread = { id: 'thread-1', status: 'running' };
      await storage.save('thread-1', thread as any);
      const loaded = await storage.load('thread-1');
      expect(loaded).toEqual(thread);

      await storage.close();
    });
  });

  // SQLite 测试需要编译原生模块，动态检测是否可用
  describeSqlite('createSqliteCheckpointStorage', () => {
    it('should create SQLite checkpoint storage', async () => {
      const dbPath = path.join(tempDir, 'test.db');
      const storage = await StorageFactory.createSqliteCheckpointStorage({
        dbPath
      });

      expect(storage).toBeDefined();

      // 测试基本操作
      const data = new TextEncoder().encode('test data');
      await storage.save('checkpoint-1', data);
      const loaded = await storage.load('checkpoint-1');
      expect(loaded).toEqual(data);

      await storage.close();
    });
  });

  describeSqlite('createSqliteThreadStorage', () => {
    it('should create SQLite thread storage', async () => {
      const dbPath = path.join(tempDir, 'test.db');
      const storage = await StorageFactory.createSqliteThreadStorage({
        dbPath
      });

      expect(storage).toBeDefined();

      // 测试基本操作
      const thread = { id: 'thread-1', status: 'running' };
      await storage.save('thread-1', thread as any);
      const loaded = await storage.load('thread-1');
      expect(loaded).toEqual(thread);

      await storage.close();
    });
  });

  describe('createCheckpointAdapter', () => {
    it('should create checkpoint adapter', async () => {
      const storage = await StorageFactory.createJsonCheckpointStorage({
        baseDir: tempDir
      });

      const adapter = StorageFactory.createCheckpointAdapter(storage);

      expect(adapter).toBeDefined();
      expect(adapter.saveCheckpoint).toBeDefined();
      expect(adapter.loadCheckpoint).toBeDefined();

      await storage.close();
    });
  });

  describe('createThreadAdapter', () => {
    it('should create thread adapter', async () => {
      const storage = await StorageFactory.createJsonThreadStorage({
        baseDir: tempDir
      });

      const adapter = StorageFactory.createThreadAdapter(storage);

      expect(adapter).toBeDefined();
      expect(adapter.saveThread).toBeDefined();
      expect(adapter.loadThread).toBeDefined();

      await storage.close();
    });
  });

  describe('createJsonStorageSuite', () => {
    it('should create complete JSON storage suite', async () => {
      const suite = await StorageFactory.createJsonStorageSuite({
        baseDir: tempDir
      });

      expect(suite.checkpointStorage).toBeDefined();
      expect(suite.threadStorage).toBeDefined();
      expect(suite.checkpointAdapter).toBeDefined();
      expect(suite.threadAdapter).toBeDefined();

      // 测试检查点适配器
      const data = new TextEncoder().encode('checkpoint data');
      await suite.checkpointAdapter.saveCheckpoint('checkpoint-1', data, {
        threadId: 'thread-1',
        workflowId: 'workflow-1',
        timestamp: Date.now()
      });
      const loadedCheckpoint = await suite.checkpointAdapter.loadCheckpoint('checkpoint-1');
      expect(loadedCheckpoint).toEqual(data);

      // 测试线程适配器
      const thread = { id: 'thread-1', status: 'running' };
      await suite.threadAdapter.saveThread(thread as any);
      const loadedThread = await suite.threadAdapter.loadThread('thread-1');
      expect(loadedThread).toEqual(thread);

      await suite.checkpointStorage.close();
      await suite.threadStorage.close();
    });
  });

  describeSqlite('createSqliteStorageSuite', () => {
    it('should create complete SQLite storage suite', async () => {
      const dbPath = path.join(tempDir, 'test.db');
      const suite = await StorageFactory.createSqliteStorageSuite({
        dbPath
      });

      expect(suite.checkpointStorage).toBeDefined();
      expect(suite.threadStorage).toBeDefined();
      expect(suite.checkpointAdapter).toBeDefined();
      expect(suite.threadAdapter).toBeDefined();

      // 测试检查点适配器
      const data = new TextEncoder().encode('checkpoint data');
      await suite.checkpointAdapter.saveCheckpoint('checkpoint-1', data, {
        threadId: 'thread-1',
        workflowId: 'workflow-1',
        timestamp: Date.now()
      });
      const loadedCheckpoint = await suite.checkpointAdapter.loadCheckpoint('checkpoint-1');
      expect(loadedCheckpoint).toEqual(data);

      // 测试线程适配器
      const thread = { id: 'thread-1', status: 'running' };
      await suite.threadAdapter.saveThread(thread as any);
      const loadedThread = await suite.threadAdapter.loadThread('thread-1');
      expect(loadedThread).toEqual(thread);

      await suite.checkpointStorage.close();
      await suite.threadStorage.close();
    });
  });
});
