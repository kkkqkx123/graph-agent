/**
 * BaseJsonStorage Tests
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { BaseJsonStorage, type BaseJsonStorageConfig } from '../base-json-storage.js';
import { StorageError } from '../../types/storage-errors.js';

interface TestMetadata {
  name: string;
  value: number;
}

// Create a concrete implementation for testing
class TestJsonStorage extends BaseJsonStorage<TestMetadata> {
  async list(): Promise<string[]> {
    return this.getAllIds();
  }
}

describe('BaseJsonStorage', () => {
  let storage: TestJsonStorage;
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'base-json-test-'));
    storage = new TestJsonStorage({ baseDir: tempDir });
    await storage.initialize();
  });

  afterEach(async () => {
    await storage.close();
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  describe('initialize', () => {
    it('should create base directory if not exists', async () => {
      const newDir = path.join(os.tmpdir(), 'base-json-new-' + Date.now());
      const newStorage = new TestJsonStorage({ baseDir: newDir });

      await newStorage.initialize();

      const stat = await fs.stat(newDir);
      expect(stat.isDirectory()).toBe(true);

      await newStorage.close();
      await fs.rm(newDir, { recursive: true, force: true });
    });

    it('should load existing files on initialize', async () => {
      // Create a file manually
      const existingData = {
        id: 'existing-1',
        data: [1, 2, 3],
        metadata: { name: 'test', value: 42 }
      };
      await fs.writeFile(
        path.join(tempDir, 'existing-1.json'),
        JSON.stringify(existingData)
      );

      // Reinitialize
      await storage.close();
      storage = new TestJsonStorage({ baseDir: tempDir });
      await storage.initialize();

      const loaded = await storage.load('existing-1');
      expect(loaded).not.toBeNull();
      expect(loaded).toEqual(new Uint8Array([1, 2, 3]));
    });

    it('should ignore invalid JSON files on load', async () => {
      // Create an invalid JSON file
      await fs.writeFile(path.join(tempDir, 'invalid.json'), 'not valid json');

      // Should not throw
      const newStorage = new TestJsonStorage({ baseDir: tempDir });
      await expect(newStorage.initialize()).resolves.not.toThrow();
      await newStorage.close();
    });
  });

  describe('save', () => {
    it('should save data to file', async () => {
      const id = 'test-1';
      const data = new Uint8Array([1, 2, 3, 4, 5]);
      const metadata: TestMetadata = { name: 'test', value: 100 };

      await storage.save(id, data, metadata);

      const files = await fs.readdir(tempDir);
      expect(files).toContain('test-1.json');
    });

    it('should overwrite existing data', async () => {
      const id = 'test-1';
      const data1 = new Uint8Array([1, 2, 3]);
      const data2 = new Uint8Array([4, 5, 6]);

      await storage.save(id, data1, { name: 'test1', value: 1 });
      await storage.save(id, data2, { name: 'test2', value: 2 });

      const loaded = await storage.load(id);
      expect(loaded).toEqual(data2);
    });

    it('should throw if not initialized', async () => {
      const uninitializedStorage = new TestJsonStorage({ baseDir: tempDir });

      await expect(
        uninitializedStorage.save('test', new Uint8Array([1]), { name: 'test', value: 1 })
      ).rejects.toThrow(StorageError);
    });
  });

  describe('load', () => {
    it('should load saved data', async () => {
      const id = 'test-1';
      const data = new Uint8Array([1, 2, 3, 4, 5]);

      await storage.save(id, data, { name: 'test', value: 100 });

      const loaded = await storage.load(id);
      expect(loaded).toEqual(data);
    });

    it('should return null for non-existent id', async () => {
      const loaded = await storage.load('non-existent');
      expect(loaded).toBeNull();
    });

    it('should throw if not initialized', async () => {
      const uninitializedStorage = new TestJsonStorage({ baseDir: tempDir });

      await expect(uninitializedStorage.load('test')).rejects.toThrow(StorageError);
    });
  });

  describe('delete', () => {
    it('should delete existing data', async () => {
      const id = 'test-1';
      await storage.save(id, new Uint8Array([1]), { name: 'test', value: 1 });

      await storage.delete(id);

      const loaded = await storage.load(id);
      expect(loaded).toBeNull();
    });

    it('should not throw for non-existent id', async () => {
      await expect(storage.delete('non-existent')).resolves.not.toThrow();
    });

    it('should remove file from disk', async () => {
      const id = 'test-1';
      await storage.save(id, new Uint8Array([1]), { name: 'test', value: 1 });

      await storage.delete(id);

      const files = await fs.readdir(tempDir);
      expect(files).not.toContain('test-1.json');
    });
  });

  describe('exists', () => {
    it('should return true for existing data', async () => {
      await storage.save('test-1', new Uint8Array([1]), { name: 'test', value: 1 });

      expect(await storage.exists('test-1')).toBe(true);
    });

    it('should return false for non-existent data', async () => {
      expect(await storage.exists('non-existent')).toBe(false);
    });
  });

  describe('getMetadata', () => {
    it('should return metadata for existing data', async () => {
      const metadata: TestMetadata = { name: 'test-name', value: 42 };
      await storage.save('test-1', new Uint8Array([1]), metadata);

      const loaded = await storage.getMetadata('test-1');
      expect(loaded).toEqual(metadata);
    });

    it('should return null for non-existent data', async () => {
      const loaded = await storage.getMetadata('non-existent');
      expect(loaded).toBeNull();
    });
  });

  describe('clear', () => {
    it('should clear all data', async () => {
      await storage.save('test-1', new Uint8Array([1]), { name: 'test1', value: 1 });
      await storage.save('test-2', new Uint8Array([2]), { name: 'test2', value: 2 });

      await storage.clear();

      const ids = await storage.list();
      expect(ids).toHaveLength(0);
    });

    it('should remove all files from disk', async () => {
      await storage.save('test-1', new Uint8Array([1]), { name: 'test1', value: 1 });
      await storage.save('test-2', new Uint8Array([2]), { name: 'test2', value: 2 });

      await storage.clear();

      const files = await fs.readdir(tempDir);
      expect(files.filter(f => f.endsWith('.json'))).toHaveLength(0);
    });
  });

  describe('close', () => {
    it('should clear metadata index', async () => {
      await storage.save('test-1', new Uint8Array([1]), { name: 'test', value: 1 });

      await storage.close();

      // After close, should throw when trying to access
      await expect(storage.load('test-1')).rejects.toThrow(StorageError);
    });

    it('should set initialized to false', async () => {
      await storage.close();

      await expect(storage.save('test', new Uint8Array([1]), { name: 'test', value: 1 })).rejects.toThrow(
        'Storage not initialized'
      );
    });
  });

  describe('file locking', () => {
    it('should handle concurrent writes with file lock enabled', async () => {
      const lockedStorage = new TestJsonStorage({
        baseDir: tempDir,
        enableFileLock: true
      });
      await lockedStorage.initialize();

      const id = 'concurrent-test';
      const promises = [];

      // Write multiple times concurrently
      for (let i = 0; i < 10; i++) {
        promises.push(
          lockedStorage.save(id, new Uint8Array([i]), { name: `test-${i}`, value: i })
        );
      }

      await Promise.all(promises);

      // Should have one file
      const loaded = await lockedStorage.load(id);
      expect(loaded).not.toBeNull();
      expect(loaded!.length).toBe(1);

      await lockedStorage.close();
    });
  });

  describe('ID sanitization', () => {
    it('should sanitize IDs with special characters', async () => {
      const dangerousId = 'test/\\:*?"<>|id';
      const data = new Uint8Array([1, 2, 3]);

      await storage.save(dangerousId, data, { name: 'test', value: 1 });

      // Should create a sanitized file name (special chars replaced with _)
      const files = await fs.readdir(tempDir);
      expect(files.some(f => f.includes('/'))).toBe(false);
      expect(files.some(f => f.includes('\\'))).toBe(false);
      expect(files.some(f => f.includes(':'))).toBe(false);

      // Should still be able to load with original id
      const loaded = await storage.load(dangerousId);
      expect(loaded).toEqual(data);
    });
  });
});
