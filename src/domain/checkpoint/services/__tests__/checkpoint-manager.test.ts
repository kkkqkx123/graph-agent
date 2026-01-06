import { CheckpointManager } from '../checkpoint-manager';
import { ID } from '../../../common/value-objects';

describe('CheckpointManager', () => {
  let checkpointManager: CheckpointManager;
  let threadId: string;
  let workflowId: ID;
  let nodeId: ID;
  let stateData: Record<string, unknown>;

  beforeEach(() => {
    checkpointManager = new CheckpointManager(5, 100);
    threadId = 'thread-1';
    workflowId = ID.generate();
    nodeId = ID.generate();
    stateData = { key: 'value', step: 1 };
  });

  describe('create', () => {
    it('应该成功创建检查点', () => {
      const checkpointId = checkpointManager.create(threadId, workflowId, nodeId, stateData);

      expect(checkpointId).toBeDefined();
      expect(checkpointManager.hasCheckpoint(checkpointId)).toBe(true);
    });

    it('应该保存检查点数据', () => {
      const checkpointId = checkpointManager.create(threadId, workflowId, nodeId, stateData);

      const checkpoint = checkpointManager.get(checkpointId);
      expect(checkpoint).not.toBeNull();
      expect(checkpoint?.stateData).toEqual(stateData);
    });

    it('应该为每个线程维护独立的检查点列表', () => {
      const threadId2 = 'thread-2';
      const nodeId2 = ID.generate();

      checkpointManager.create(threadId, workflowId, nodeId, stateData);
      checkpointManager.create(threadId2, workflowId, nodeId2, stateData);

      expect(checkpointManager.getThreadCheckpointCount(threadId)).toBe(1);
      expect(checkpointManager.getThreadCheckpointCount(threadId2)).toBe(1);
    });

    it('应该清理过期的检查点', () => {
      // 创建超过限制的检查点
      for (let i = 0; i < 10; i++) {
        checkpointManager.create(threadId, workflowId, nodeId, { step: i });
      }

      // 应该只保留最新的 5 个
      expect(checkpointManager.getThreadCheckpointCount(threadId)).toBe(5);
    });
  });

  describe('get', () => {
    it('应该返回已创建的检查点', () => {
      const checkpointId = checkpointManager.create(threadId, workflowId, nodeId, stateData);

      const checkpoint = checkpointManager.get(checkpointId);
      expect(checkpoint).not.toBeNull();
      expect(checkpoint?.checkpointId.toString()).toBe(checkpointId);
    });

    it('应该返回 null 如果检查点不存在', () => {
      const checkpoint = checkpointManager.get('non-existent');
      expect(checkpoint).toBeNull();
    });
  });

  describe('restore', () => {
    it('应该成功恢复检查点', () => {
      const checkpointId = checkpointManager.create(threadId, workflowId, nodeId, stateData);

      const restoredData = checkpointManager.restore(checkpointId);
      expect(restoredData).toEqual(stateData);
    });

    it('应该标记检查点为已恢复', () => {
      const checkpointId = checkpointManager.create(threadId, workflowId, nodeId, stateData);

      const checkpoint = checkpointManager.get(checkpointId);
      expect(checkpoint?.restoreCount).toBe(0);

      checkpointManager.restore(checkpointId);

      const restoredCheckpoint = checkpointManager.get(checkpointId);
      expect(restoredCheckpoint?.restoreCount).toBe(1);
    });

    it('应该返回 null 如果检查点不存在', () => {
      const restoredData = checkpointManager.restore('non-existent');
      expect(restoredData).toBeNull();
    });
  });

  describe('delete', () => {
    it('应该成功删除检查点', () => {
      const checkpointId = checkpointManager.create(threadId, workflowId, nodeId, stateData);

      const deleted = checkpointManager.delete(checkpointId);
      expect(deleted).toBe(true);
      expect(checkpointManager.hasCheckpoint(checkpointId)).toBe(false);
    });

    it('应该从线程的检查点列表中删除', () => {
      const checkpointId = checkpointManager.create(threadId, workflowId, nodeId, stateData);

      checkpointManager.delete(checkpointId);

      expect(checkpointManager.getThreadCheckpointCount(threadId)).toBe(0);
    });

    it('应该返回 false 如果检查点不存在', () => {
      const deleted = checkpointManager.delete('non-existent');
      expect(deleted).toBe(false);
    });
  });

  describe('getThreadCheckpoints', () => {
    it('应该返回线程的所有检查点', () => {
      checkpointManager.create(threadId, workflowId, nodeId, { step: 1 });
      checkpointManager.create(threadId, workflowId, nodeId, { step: 2 });
      checkpointManager.create(threadId, workflowId, nodeId, { step: 3 });

      const checkpoints = checkpointManager.getThreadCheckpoints(threadId);
      expect(checkpoints).toHaveLength(3);
    });

    it('应该按时间倒序返回检查点', () => {
      checkpointManager.create(threadId, workflowId, nodeId, { step: 1 });
      checkpointManager.create(threadId, workflowId, nodeId, { step: 2 });
      checkpointManager.create(threadId, workflowId, nodeId, { step: 3 });

      const checkpoints = checkpointManager.getThreadCheckpoints(threadId);
      expect(checkpoints[0].stateData.step).toBe(3);
      expect(checkpoints[1].stateData.step).toBe(2);
      expect(checkpoints[2].stateData.step).toBe(1);
    });

    it('应该返回空数组如果线程没有检查点', () => {
      const checkpoints = checkpointManager.getThreadCheckpoints('non-existent-thread');
      expect(checkpoints).toEqual([]);
    });
  });

  describe('getLatestCheckpoint', () => {
    it('应该返回最新的检查点', () => {
      checkpointManager.create(threadId, workflowId, nodeId, { step: 1 });
      checkpointManager.create(threadId, workflowId, nodeId, { step: 2 });
      checkpointManager.create(threadId, workflowId, nodeId, { step: 3 });

      const latest = checkpointManager.getLatestCheckpoint(threadId);
      expect(latest).not.toBeNull();
      expect(latest?.stateData.step).toBe(3);
    });

    it('应该返回 null 如果线程没有检查点', () => {
      const latest = checkpointManager.getLatestCheckpoint('non-existent-thread');
      expect(latest).toBeNull();
    });
  });

  describe('clearThreadCheckpoints', () => {
    it('应该成功清除线程的所有检查点', () => {
      checkpointManager.create(threadId, workflowId, nodeId, { step: 1 });
      checkpointManager.create(threadId, workflowId, nodeId, { step: 2 });
      checkpointManager.create(threadId, workflowId, nodeId, { step: 3 });

      const deletedCount = checkpointManager.clearThreadCheckpoints(threadId);
      expect(deletedCount).toBe(3);
      expect(checkpointManager.getThreadCheckpointCount(threadId)).toBe(0);
    });

    it('应该返回 0 如果线程没有检查点', () => {
      const deletedCount = checkpointManager.clearThreadCheckpoints('non-existent-thread');
      expect(deletedCount).toBe(0);
    });
  });

  describe('clearAllCheckpoints', () => {
    it('应该清除所有检查点', () => {
      checkpointManager.create('thread-1', workflowId, nodeId, { step: 1 });
      checkpointManager.create('thread-2', workflowId, nodeId, { step: 2 });
      checkpointManager.create('thread-3', workflowId, nodeId, { step: 3 });

      checkpointManager.clearAllCheckpoints();

      expect(checkpointManager.getCheckpointCount()).toBe(0);
      expect(checkpointManager.getAllThreadIds()).toHaveLength(0);
    });
  });

  describe('hasCheckpoint', () => {
    it('应该返回 true 如果检查点存在', () => {
      const checkpointId = checkpointManager.create(threadId, workflowId, nodeId, stateData);

      expect(checkpointManager.hasCheckpoint(checkpointId)).toBe(true);
    });

    it('应该返回 false 如果检查点不存在', () => {
      expect(checkpointManager.hasCheckpoint('non-existent')).toBe(false);
    });
  });

  describe('getCheckpointCount', () => {
    it('应该返回正确的检查点数量', () => {
      checkpointManager.create(threadId, workflowId, nodeId, { step: 1 });
      checkpointManager.create(threadId, workflowId, nodeId, { step: 2 });

      expect(checkpointManager.getCheckpointCount()).toBe(2);
    });

    it('应该返回 0 如果没有检查点', () => {
      expect(checkpointManager.getCheckpointCount()).toBe(0);
    });
  });

  describe('getThreadCheckpointCount', () => {
    it('应该返回线程的检查点数量', () => {
      checkpointManager.create(threadId, workflowId, nodeId, { step: 1 });
      checkpointManager.create(threadId, workflowId, nodeId, { step: 2 });

      expect(checkpointManager.getThreadCheckpointCount(threadId)).toBe(2);
    });

    it('应该返回 0 如果线程没有检查点', () => {
      expect(checkpointManager.getThreadCheckpointCount('non-existent-thread')).toBe(0);
    });
  });

  describe('getAllThreadIds', () => {
    it('应该返回所有线程ID', () => {
      checkpointManager.create('thread-1', workflowId, nodeId, { step: 1 });
      checkpointManager.create('thread-2', workflowId, nodeId, { step: 2 });
      checkpointManager.create('thread-3', workflowId, nodeId, { step: 3 });

      const threadIds = checkpointManager.getAllThreadIds();
      expect(threadIds).toHaveLength(3);
      expect(threadIds).toContain('thread-1');
      expect(threadIds).toContain('thread-2');
      expect(threadIds).toContain('thread-3');
    });

    it('应该返回空数组如果没有检查点', () => {
      const threadIds = checkpointManager.getAllThreadIds();
      expect(threadIds).toEqual([]);
    });
  });

  describe('全局限制', () => {
    it('应该清理全局级别的过期检查点', () => {
      const manager = new CheckpointManager(10, 5);

      // 创建超过全局限制的检查点
      for (let i = 0; i < 10; i++) {
        manager.create(`thread-${i}`, workflowId, nodeId, { step: i });
      }

      // 应该只保留最新的 5 个
      expect(manager.getCheckpointCount()).toBe(5);
    });
  });
});
