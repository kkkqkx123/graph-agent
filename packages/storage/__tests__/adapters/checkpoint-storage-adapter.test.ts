/**
 * 检查点存储适配器测试
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs/promises';
import { JsonStorageProvider } from '../../src/providers/json/json-storage-provider.js';
import { CheckpointStorageAdapter } from '../../src/adapters/checkpoint-storage-adapter.js';
import type { CheckpointStorageMetadata } from '@modular-agent/types';

describe('CheckpointStorageAdapter', () => {
  let tempDir: string;
  let storage: JsonStorageProvider<Uint8Array>;
  let adapter: CheckpointStorageAdapter;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'storage-test-'));
    storage = new JsonStorageProvider({
      baseDir: tempDir,
      entityType: 'checkpoints',
      enableFileLock: true,
      enableMetadataIndex: true
    });
    await storage.initialize();
    adapter = new CheckpointStorageAdapter(storage);
  });

  afterEach(async () => {
    await adapter.close();
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  describe('saveCheckpoint and loadCheckpoint', () => {
    it('should save and load checkpoint data', async () => {
      const data = new TextEncoder().encode('checkpoint data');
      const metadata: CheckpointStorageMetadata = {
        threadId: 'thread-1',
        workflowId: 'workflow-1',
        timestamp: Date.now()
      };

      await adapter.saveCheckpoint('checkpoint-1', data, metadata);
      const loaded = await adapter.loadCheckpoint('checkpoint-1');

      expect(loaded).toEqual(data);
    });

    it('should return null for non-existent checkpoint', async () => {
      const loaded = await adapter.loadCheckpoint('non-existent');
      expect(loaded).toBeNull();
    });
  });

  describe('deleteCheckpoint', () => {
    it('should delete checkpoint', async () => {
      const data = new TextEncoder().encode('checkpoint data');
      const metadata: CheckpointStorageMetadata = {
        threadId: 'thread-1',
        workflowId: 'workflow-1',
        timestamp: Date.now()
      };

      await adapter.saveCheckpoint('checkpoint-1', data, metadata);
      await adapter.deleteCheckpoint('checkpoint-1');
      const loaded = await adapter.loadCheckpoint('checkpoint-1');

      expect(loaded).toBeNull();
    });
  });

  describe('checkpointExists', () => {
    it('should return true for existing checkpoint', async () => {
      const data = new TextEncoder().encode('checkpoint data');
      const metadata: CheckpointStorageMetadata = {
        threadId: 'thread-1',
        workflowId: 'workflow-1',
        timestamp: Date.now()
      };

      await adapter.saveCheckpoint('checkpoint-1', data, metadata);
      const exists = await adapter.checkpointExists('checkpoint-1');

      expect(exists).toBe(true);
    });

    it('should return false for non-existent checkpoint', async () => {
      const exists = await adapter.checkpointExists('non-existent');
      expect(exists).toBe(false);
    });
  });

  describe('listCheckpoints', () => {
    it('should list all checkpoints', async () => {
      const metadata: CheckpointStorageMetadata = {
        threadId: 'thread-1',
        workflowId: 'workflow-1',
        timestamp: Date.now()
      };

      await adapter.saveCheckpoint('checkpoint-1', new Uint8Array([1]), metadata);
      await adapter.saveCheckpoint('checkpoint-2', new Uint8Array([2]), metadata);
      await adapter.saveCheckpoint('checkpoint-3', new Uint8Array([3]), metadata);

      const checkpoints = await adapter.listCheckpoints();

      expect(checkpoints).toHaveLength(3);
    });

    it('should filter by threadId', async () => {
      const metadata1: CheckpointStorageMetadata = {
        threadId: 'thread-1',
        workflowId: 'workflow-1',
        timestamp: Date.now()
      };
      const metadata2: CheckpointStorageMetadata = {
        threadId: 'thread-2',
        workflowId: 'workflow-1',
        timestamp: Date.now()
      };

      await adapter.saveCheckpoint('checkpoint-1', new Uint8Array([1]), metadata1);
      await adapter.saveCheckpoint('checkpoint-2', new Uint8Array([2]), metadata2);

      const checkpoints = await adapter.listCheckpoints({ threadId: 'thread-1' });

      expect(checkpoints).toHaveLength(1);
      expect(checkpoints[0]).toBe('checkpoint-1');
    });

    it('should filter by workflowId', async () => {
      const metadata1: CheckpointStorageMetadata = {
        threadId: 'thread-1',
        workflowId: 'workflow-1',
        timestamp: Date.now()
      };
      const metadata2: CheckpointStorageMetadata = {
        threadId: 'thread-1',
        workflowId: 'workflow-2',
        timestamp: Date.now()
      };

      await adapter.saveCheckpoint('checkpoint-1', new Uint8Array([1]), metadata1);
      await adapter.saveCheckpoint('checkpoint-2', new Uint8Array([2]), metadata2);

      const checkpoints = await adapter.listCheckpoints({ workflowId: 'workflow-1' });

      expect(checkpoints).toHaveLength(1);
      expect(checkpoints[0]).toBe('checkpoint-1');
    });

    it('should support pagination', async () => {
      const metadata: CheckpointStorageMetadata = {
        threadId: 'thread-1',
        workflowId: 'workflow-1',
        timestamp: Date.now()
      };

      for (let i = 0; i < 5; i++) {
        await adapter.saveCheckpoint(`checkpoint-${i}`, new Uint8Array([i]), {
          ...metadata,
          timestamp: Date.now() + i
        });
      }

      const checkpoints = await adapter.listCheckpoints({ limit: 2, offset: 0 });

      expect(checkpoints).toHaveLength(2);
    });
  });

  describe('getCheckpointMetadata', () => {
    it('should return checkpoint metadata', async () => {
      const data = new TextEncoder().encode('checkpoint data');
      const metadata: CheckpointStorageMetadata = {
        threadId: 'thread-1',
        workflowId: 'workflow-1',
        timestamp: 1234567890,
        tags: ['important']
      };

      await adapter.saveCheckpoint('checkpoint-1', data, metadata);
      const loadedMetadata = await adapter.getCheckpointMetadata('checkpoint-1');

      expect(loadedMetadata).not.toBeNull();
      expect(loadedMetadata?.threadId).toBe('thread-1');
      expect(loadedMetadata?.workflowId).toBe('workflow-1');
      expect(loadedMetadata?.timestamp).toBe(1234567890);
      expect(loadedMetadata?.tags).toEqual(['important']);
    });

    it('should return null for non-existent checkpoint', async () => {
      const metadata = await adapter.getCheckpointMetadata('non-existent');
      expect(metadata).toBeNull();
    });
  });

  describe('batch operations', () => {
    it('should delete checkpoints in batch', async () => {
      const metadata: CheckpointStorageMetadata = {
        threadId: 'thread-1',
        workflowId: 'workflow-1',
        timestamp: Date.now()
      };

      await adapter.saveCheckpoint('checkpoint-1', new Uint8Array([1]), metadata);
      await adapter.saveCheckpoint('checkpoint-2', new Uint8Array([2]), metadata);
      await adapter.saveCheckpoint('checkpoint-3', new Uint8Array([3]), metadata);

      await adapter.deleteCheckpointsBatch(['checkpoint-1', 'checkpoint-2']);

      const checkpoints = await adapter.listCheckpoints();
      expect(checkpoints).toHaveLength(1);
      expect(checkpoints[0]).toBe('checkpoint-3');
    });
  });

  describe('clearAllCheckpoints', () => {
    it('should clear all checkpoints', async () => {
      const metadata: CheckpointStorageMetadata = {
        threadId: 'thread-1',
        workflowId: 'workflow-1',
        timestamp: Date.now()
      };

      await adapter.saveCheckpoint('checkpoint-1', new Uint8Array([1]), metadata);
      await adapter.saveCheckpoint('checkpoint-2', new Uint8Array([2]), metadata);

      await adapter.clearAllCheckpoints();

      const checkpoints = await adapter.listCheckpoints();
      expect(checkpoints).toHaveLength(0);
    });
  });
});
