/**
 * 线程存储适配器测试
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs/promises';
import { JsonStorageProvider } from '../../src/providers/json/json-storage-provider.js';
import { ThreadStorageAdapter } from '../../src/adapters/thread-storage-adapter.js';
import type { Thread } from '@modular-agent/types';

// 创建测试用的 Thread 对象
function createTestThread(overrides: Partial<Thread> = {}): Thread {
  return {
    id: 'thread-1',
    workflowId: 'workflow-1',
    workflowVersion: '1.0.0',
    status: 'running',
    currentNodeId: 'node-1',
    graph: {
      nodes: [],
      edges: [],
      startNodeId: 'start',
      endNodeId: 'end'
    } as any,
    variables: [],
    variableScopes: {
      thread: {},
      workflow: {},
      system: {},
      node: {}
    },
    input: {},
    output: {},
    nodeResults: [],
    startTime: Date.now(),
    errors: [],
    ...overrides
  };
}

describe('ThreadStorageAdapter', () => {
  let tempDir: string;
  let storage: JsonStorageProvider<Thread>;
  let adapter: ThreadStorageAdapter;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'storage-test-'));
    storage = new JsonStorageProvider({
      baseDir: tempDir,
      entityType: 'threads',
      enableFileLock: true,
      enableMetadataIndex: true
    });
    await storage.initialize();
    adapter = new ThreadStorageAdapter(storage);
  });

  afterEach(async () => {
    await adapter.close();
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  describe('saveThread and loadThread', () => {
    it('should save and load thread', async () => {
      const thread = createTestThread();

      await adapter.saveThread(thread);
      const loaded = await adapter.loadThread('thread-1');

      expect(loaded).not.toBeNull();
      expect(loaded?.id).toBe('thread-1');
      expect(loaded?.workflowId).toBe('workflow-1');
      expect(loaded?.status).toBe('running');
    });

    it('should return null for non-existent thread', async () => {
      const loaded = await adapter.loadThread('non-existent');
      expect(loaded).toBeNull();
    });

    it('should update existing thread', async () => {
      const thread1 = createTestThread({ status: 'running' });
      const thread2 = createTestThread({ status: 'completed' });

      await adapter.saveThread(thread1);
      await adapter.saveThread(thread2);
      const loaded = await adapter.loadThread('thread-1');

      expect(loaded?.status).toBe('completed');
    });
  });

  describe('deleteThread', () => {
    it('should delete thread', async () => {
      const thread = createTestThread();

      await adapter.saveThread(thread);
      await adapter.deleteThread('thread-1');
      const loaded = await adapter.loadThread('thread-1');

      expect(loaded).toBeNull();
    });
  });

  describe('threadExists', () => {
    it('should return true for existing thread', async () => {
      const thread = createTestThread();

      await adapter.saveThread(thread);
      const exists = await adapter.threadExists('thread-1');

      expect(exists).toBe(true);
    });

    it('should return false for non-existent thread', async () => {
      const exists = await adapter.threadExists('non-existent');
      expect(exists).toBe(false);
    });
  });

  describe('listThreads', () => {
    it('should list all threads', async () => {
      await adapter.saveThread(createTestThread({ id: 'thread-1' }));
      await adapter.saveThread(createTestThread({ id: 'thread-2' }));
      await adapter.saveThread(createTestThread({ id: 'thread-3' }));

      const threads = await adapter.listThreads();

      expect(threads).toHaveLength(3);
    });

    it('should filter by workflowId', async () => {
      await adapter.saveThread(createTestThread({ id: 'thread-1', workflowId: 'workflow-1' }));
      await adapter.saveThread(createTestThread({ id: 'thread-2', workflowId: 'workflow-2' }));

      const threads = await adapter.listThreads({ workflowId: 'workflow-1' });

      expect(threads).toHaveLength(1);
      expect(threads[0]).toBe('thread-1');
    });

    it('should filter by status', async () => {
      await adapter.saveThread(createTestThread({ id: 'thread-1', status: 'running' }));
      await adapter.saveThread(createTestThread({ id: 'thread-2', status: 'completed' }));

      const threads = await adapter.listThreads({ status: 'running' });

      expect(threads).toHaveLength(1);
      expect(threads[0]).toBe('thread-1');
    });

    it('should support pagination', async () => {
      for (let i = 0; i < 5; i++) {
        await adapter.saveThread(createTestThread({ id: `thread-${i}` }));
      }

      const threads = await adapter.listThreads({ limit: 2, offset: 0 });

      expect(threads).toHaveLength(2);
    });
  });

  describe('listThreadInfos', () => {
    it('should list thread infos with metadata', async () => {
      await adapter.saveThread(createTestThread({ id: 'thread-1', status: 'running' }));
      await adapter.saveThread(createTestThread({ id: 'thread-2', status: 'completed' }));

      const threadInfos = await adapter.listThreadInfos();

      expect(threadInfos).toHaveLength(2);
      expect(threadInfos[0].metadata.status).toBeDefined();
      expect(threadInfos[0].metadata.workflowId).toBeDefined();
    });
  });

  describe('getThreadMetadata', () => {
    it('should return thread metadata', async () => {
      const thread = createTestThread({ status: 'running' });

      await adapter.saveThread(thread);
      const metadata = await adapter.getThreadMetadata('thread-1');

      expect(metadata).not.toBeNull();
      expect(metadata?.workflowId).toBe('workflow-1');
      expect(metadata?.status).toBe('running');
    });

    it('should return null for non-existent thread', async () => {
      const metadata = await adapter.getThreadMetadata('non-existent');
      expect(metadata).toBeNull();
    });
  });

  describe('batch operations', () => {
    it('should save threads in batch', async () => {
      const threads = [
        createTestThread({ id: 'thread-1' }),
        createTestThread({ id: 'thread-2' }),
        createTestThread({ id: 'thread-3' })
      ];

      await adapter.saveThreadsBatch(threads);

      const loadedThreads = await adapter.listThreads();
      expect(loadedThreads).toHaveLength(3);
    });

    it('should delete threads in batch', async () => {
      await adapter.saveThread(createTestThread({ id: 'thread-1' }));
      await adapter.saveThread(createTestThread({ id: 'thread-2' }));
      await adapter.saveThread(createTestThread({ id: 'thread-3' }));

      await adapter.deleteThreadsBatch(['thread-1', 'thread-2']);

      const threads = await adapter.listThreads();
      expect(threads).toHaveLength(1);
      expect(threads[0]).toBe('thread-3');
    });
  });

  describe('clearAllThreads', () => {
    it('should clear all threads', async () => {
      await adapter.saveThread(createTestThread({ id: 'thread-1' }));
      await adapter.saveThread(createTestThread({ id: 'thread-2' }));

      await adapter.clearAllThreads();

      const threads = await adapter.listThreads();
      expect(threads).toHaveLength(0);
    });
  });
});
