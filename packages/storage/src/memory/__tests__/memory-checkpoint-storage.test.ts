/**
 * MemoryCheckpointStorage 测试
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { MemoryCheckpointStorage } from '../memory-checkpoint-storage.js';
import type { CheckpointStorageMetadata } from '@modular-agent/types';

describe('MemoryCheckpointStorage', () => {
  let storage: MemoryCheckpointStorage;

  const createMetadata = (overrides?: Partial<CheckpointStorageMetadata>): CheckpointStorageMetadata => ({
    threadId: 'thread-1',
    workflowId: 'workflow-1',
    timestamp: Date.now(),
    ...overrides
  });

  beforeEach(() => {
    storage = new MemoryCheckpointStorage();
  });

  describe('saveCheckpoint / loadCheckpoint', () => {
    it('should save and load checkpoint', async () => {
      const checkpointId = 'checkpoint-1';
      const data = new Uint8Array([1, 2, 3, 4, 5]);
      const metadata = createMetadata();

      await storage.saveCheckpoint(checkpointId, data, metadata);

      const loaded = await storage.loadCheckpoint(checkpointId);
      expect(loaded).not.toBeNull();
      expect(loaded).toEqual(data);
    });

    it('should return null for non-existent checkpoint', async () => {
      const loaded = await storage.loadCheckpoint('non-existent');
      expect(loaded).toBeNull();
    });

    it('should overwrite existing checkpoint', async () => {
      const checkpointId = 'checkpoint-1';
      const data1 = new Uint8Array([1, 2, 3]);
      const data2 = new Uint8Array([4, 5, 6]);

      await storage.saveCheckpoint(checkpointId, data1, createMetadata());
      await storage.saveCheckpoint(checkpointId, data2, createMetadata());

      const loaded = await storage.loadCheckpoint(checkpointId);
      expect(loaded).toEqual(data2);
    });
  });

  describe('deleteCheckpoint', () => {
    it('should delete checkpoint', async () => {
      const checkpointId = 'checkpoint-1';
      await storage.saveCheckpoint(checkpointId, new Uint8Array([1]), createMetadata());

      await storage.deleteCheckpoint(checkpointId);

      const loaded = await storage.loadCheckpoint(checkpointId);
      expect(loaded).toBeNull();
    });

    it('should not throw for non-existent checkpoint', async () => {
      await expect(storage.deleteCheckpoint('non-existent')).resolves.not.toThrow();
    });
  });

  describe('listCheckpoints', () => {
    beforeEach(async () => {
      await storage.saveCheckpoint('cp-1', new Uint8Array([1]), createMetadata({ threadId: 'thread-1', timestamp: 1000 }));
      await storage.saveCheckpoint('cp-2', new Uint8Array([2]), createMetadata({ threadId: 'thread-1', timestamp: 2000 }));
      await storage.saveCheckpoint('cp-3', new Uint8Array([3]), createMetadata({ threadId: 'thread-2', timestamp: 3000 }));
    });

    it('should list all checkpoints', async () => {
      const ids = await storage.listCheckpoints();
      expect(ids).toHaveLength(3);
    });

    it('should filter by threadId', async () => {
      const ids = await storage.listCheckpoints({ threadId: 'thread-1' });
      expect(ids).toHaveLength(2);
      expect(ids).toContain('cp-1');
      expect(ids).toContain('cp-2');
    });

    it('should filter by workflowId', async () => {
      const ids = await storage.listCheckpoints({ workflowId: 'workflow-1' });
      expect(ids).toHaveLength(3);
    });

    it('should sort by timestamp descending', async () => {
      const ids = await storage.listCheckpoints();
      expect(ids).toEqual(['cp-3', 'cp-2', 'cp-1']);
    });

    it('should support pagination', async () => {
      const ids = await storage.listCheckpoints({ limit: 2 });
      expect(ids).toHaveLength(2);
      expect(ids).toEqual(['cp-3', 'cp-2']);

      const ids2 = await storage.listCheckpoints({ limit: 2, offset: 2 });
      expect(ids2).toHaveLength(1);
      expect(ids2).toEqual(['cp-1']);
    });
  });

  describe('checkpointExists', () => {
    it('should return true for existing checkpoint', async () => {
      await storage.saveCheckpoint('cp-1', new Uint8Array([1]), createMetadata());
      expect(await storage.checkpointExists('cp-1')).toBe(true);
    });

    it('should return false for non-existent checkpoint', async () => {
      expect(await storage.checkpointExists('non-existent')).toBe(false);
    });
  });

  describe('clear', () => {
    it('should clear all checkpoints', async () => {
      await storage.saveCheckpoint('cp-1', new Uint8Array([1]), createMetadata());
      await storage.saveCheckpoint('cp-2', new Uint8Array([2]), createMetadata());

      await storage.clear();

      expect(storage.size).toBe(0);
    });
  });

  describe('size', () => {
    it('should return correct size', async () => {
      expect(storage.size).toBe(0);

      await storage.saveCheckpoint('cp-1', new Uint8Array([1]), createMetadata());
      expect(storage.size).toBe(1);

      await storage.saveCheckpoint('cp-2', new Uint8Array([2]), createMetadata());
      expect(storage.size).toBe(2);

      await storage.deleteCheckpoint('cp-1');
      expect(storage.size).toBe(1);
    });
  });
});
