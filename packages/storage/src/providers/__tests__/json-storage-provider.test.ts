/**
 * JSON 存储提供者测试
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs/promises';
import { JsonStorageProvider } from '../json/json-storage-provider.js';
import type { StorageMetadata } from '../../types/index.js';

describe('JsonStorageProvider', () => {
  let tempDir: string;
  let storage: JsonStorageProvider<{ name: string; value: number }>;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'storage-test-'));
    storage = new JsonStorageProvider({
      baseDir: tempDir,
      entityType: 'test-entities',
      enableFileLock: true,
      enableMetadataIndex: true
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
        modelType: 'test'
      };

      await storage.save('entity-1', entity, metadata);
      const loaded = await storage.load('entity-1');

      expect(loaded).toEqual(entity);
    });

    it('should return null for non-existent entity', async () => {
      const loaded = await storage.load('non-existent');
      expect(loaded).toBeNull();
    });

    it('should update existing entity', async () => {
      const entity1 = { name: 'test1', value: 1 };
      const entity2 = { name: 'test2', value: 2 };

      await storage.save('entity-1', entity1);
      await storage.save('entity-1', entity2);
      const loaded = await storage.load('entity-1');

      expect(loaded).toEqual(entity2);
    });
  });

  describe('delete', () => {
    it('should delete an entity', async () => {
      const entity = { name: 'test', value: 42 };
      await storage.save('entity-1', entity);

      await storage.delete('entity-1');
      const loaded = await storage.load('entity-1');

      expect(loaded).toBeNull();
    });

    it('should not throw when deleting non-existent entity', async () => {
      await expect(storage.delete('non-existent')).resolves.not.toThrow();
    });
  });

  describe('exists', () => {
    it('should return true for existing entity', async () => {
      const entity = { name: 'test', value: 42 };
      await storage.save('entity-1', entity);

      const exists = await storage.exists('entity-1');
      expect(exists).toBe(true);
    });

    it('should return false for non-existent entity', async () => {
      const exists = await storage.exists('non-existent');
      expect(exists).toBe(false);
    });
  });

  describe('list', () => {
    it('should list all entities', async () => {
      await storage.save('entity-1', { name: 'test1', value: 1 });
      await storage.save('entity-2', { name: 'test2', value: 2 });
      await storage.save('entity-3', { name: 'test3', value: 3 });

      const result = await storage.list();

      expect(result.items).toHaveLength(3);
      expect(result.total).toBe(3);
      expect(result.hasMore).toBe(false);
    });

    it('should filter entities by metadata', async () => {
      const metadata1: StorageMetadata = {
        createdAt: Date.now(),
        updatedAt: Date.now(),
        modelType: 'test',
        workflowId: 'workflow-1'
      };
      const metadata2: StorageMetadata = {
        createdAt: Date.now(),
        updatedAt: Date.now(),
        modelType: 'test',
        workflowId: 'workflow-2'
      };

      await storage.save('entity-1', { name: 'test1', value: 1 }, metadata1);
      await storage.save('entity-2', { name: 'test2', value: 2 }, metadata2);

      const result = await storage.list({
        filter: { workflowId: 'workflow-1' }
      });

      expect(result.items).toHaveLength(1);
      expect(result.items[0]).toBe('entity-1');
    });

    it('should support pagination', async () => {
      await storage.save('entity-1', { name: 'test1', value: 1 });
      await storage.save('entity-2', { name: 'test2', value: 2 });
      await storage.save('entity-3', { name: 'test3', value: 3 });

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
        modelType: 'test',
        workflowId: 'workflow-1',
        tags: ['tag1', 'tag2']
      };

      await storage.save('entity-1', { name: 'test', value: 42 }, metadata);
      const loadedMetadata = await storage.getMetadata('entity-1');

      expect(loadedMetadata).not.toBeNull();
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
        { id: 'entity-1', entity: { name: 'test1', value: 1 } },
        { id: 'entity-2', entity: { name: 'test2', value: 2 } },
        { id: 'entity-3', entity: { name: 'test3', value: 3 } }
      ];

      await storage.saveBatch(items);

      const result = await storage.list();
      expect(result.items).toHaveLength(3);
    });

    it('should delete batch', async () => {
      await storage.save('entity-1', { name: 'test1', value: 1 });
      await storage.save('entity-2', { name: 'test2', value: 2 });
      await storage.save('entity-3', { name: 'test3', value: 3 });

      await storage.deleteBatch(['entity-1', 'entity-2']);

      const result = await storage.list();
      expect(result.items).toHaveLength(1);
      expect(result.items[0]).toBe('entity-3');
    });
  });

  describe('clear', () => {
    it('should clear all entities', async () => {
      await storage.save('entity-1', { name: 'test1', value: 1 });
      await storage.save('entity-2', { name: 'test2', value: 2 });

      await storage.clear();

      const result = await storage.list();
      expect(result.items).toHaveLength(0);
    });
  });

  describe('parentId organization', () => {
    it('should organize files by parentId', async () => {
      const metadata: StorageMetadata = {
        createdAt: Date.now(),
        updatedAt: Date.now(),
        modelType: 'test',
        parentId: 'parent-1'
      };

      await storage.save('entity-1', { name: 'test', value: 42 }, metadata);

      // 检查文件是否在正确的目录下
      const entityDir = path.join(tempDir, 'test-entities', 'parent-1');
      const files = await fs.readdir(entityDir);
      expect(files).toContain('entity-1.json');
    });
  });
});
