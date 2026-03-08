/**
 * JsonCheckpointStorage 测试
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { JsonCheckpointStorage } from '../json-checkpoint-storage.js';
import type { CheckpointStorageMetadata } from '@modular-agent/types';

describe('JsonCheckpointStorage', () => {
  let storage: JsonCheckpointStorage;
  let tempDir: string;

  const createMetadata = (overrides?: Partial<CheckpointStorageMetadata>): CheckpointStorageMetadata => ({
    threadId: 'thread-1',
    workflowId: 'workflow-1',
    timestamp: Date.now(),
    ...overrides
  });

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'storage-test-'));
    storage = new JsonCheckpointStorage({ baseDir: tempDir });
    await storage.initialize();
  });

  afterEach(async () => {
    await storage.close();
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  describe('initialize', () => {
    it('should create base directory', async () => {
      const newDir = path.join(os.tmpdir(), 'storage-test-new-' + Date.now());
      const newStorage = new JsonCheckpointStorage({ baseDir: newDir });

      await newStorage.initialize();

      const stat = await fs.stat(newDir);
      expect(stat.isDirectory()).toBe(true);

      await newStorage.close();
      await fs.rm(newDir, { recursive: true, force: true });
    });
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

    it('should persist checkpoint to file', async () => {
      const checkpointId = 'checkpoint-1';
      const data = new Uint8Array([1, 2, 3]);

      await storage.saveCheckpoint(checkpointId, data, createMetadata());

      const files = await fs.readdir(tempDir);
      expect(files).toContain('checkpoint-1.json');
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
    });

    it('should sort by timestamp descending', async () => {
      const ids = await storage.listCheckpoints();
      expect(ids).toEqual(['cp-3', 'cp-2', 'cp-1']);
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

      const ids = await storage.listCheckpoints();
      expect(ids).toHaveLength(0);
    });
  });
});
