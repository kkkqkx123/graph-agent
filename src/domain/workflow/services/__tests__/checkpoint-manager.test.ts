import { CheckpointManager } from '../checkpoint-manager';
import { ID } from '../../../common/value-objects';
import { WorkflowState } from '../value-objects/workflow-state';

describe('CheckpointManager', () => {
  let checkpointManager: CheckpointManager;
  let threadId: string;
  let workflowId: ID;
  let nodeId: ID;
  let state: WorkflowState;

  beforeEach(() => {
    checkpointManager = new CheckpointManager(5, 100);
    threadId = 'thread-1';
    workflowId = ID.generate();
    nodeId = ID.generate();
    state = WorkflowState.initial(workflowId);
  });

  afterEach(() => {
    checkpointManager.clearAllCheckpoints();
  });

  describe('create', () => {
    it('应该创建检查点', () => {
      const checkpointId = checkpointManager.create(threadId, workflowId, nodeId, state);

      expect(checkpointId).toBeDefined();
      expect(checkpointId).toMatch(/^cp-\d+-[a-z0-9]+$/);
      expect(checkpointManager.hasCheckpoint(checkpointId)).toBe(true);
    });

    it('应该保存检查点元数据', () => {
      const metadata = { key: 'value', step: 1 };

      const checkpointId = checkpointManager.create(threadId, workflowId, nodeId, state, metadata);

      const checkpoint = checkpointManager.get(checkpointId);
      expect(checkpoint?.metadata).toEqual(metadata);
    });

    it('应该限制每个线程的检查点数量', () => {
      const smallManager = new CheckpointManager(3, 100);

      // 创建 5 个检查点
      for (let i = 0; i < 5; i++) {
        smallManager.create(threadId, workflowId, nodeId, state, { index: i });
      }

      // 应该只保留最新的 3 个
      expect(smallManager.getThreadCheckpointCount(threadId)).toBe(3);
    });

    it('应该限制总检查点数量', () => {
      const smallManager = new CheckpointManager(10, 5);

      // 创建 10 个线程，每个线程 1 个检查点
      for (let i = 0; i < 10; i++) {
        smallManager.create(`thread-${i}`, workflowId, nodeId, state);
      }

      // 应该只保留最新的 5 个
      expect(smallManager.getCheckpointCount()).toBe(5);
    });
  });

  describe('get', () => {
    it('应该获取已创建的检查点', () => {
      const checkpointId = checkpointManager.create(threadId, workflowId, nodeId, state);

      const checkpoint = checkpointManager.get(checkpointId);

      expect(checkpoint).not.toBeNull();
      expect(checkpoint?.id).toBe(checkpointId);
      expect(checkpoint?.threadId).toBe(threadId);
      expect(checkpoint?.workflowId.value).toBe(workflowId.value);
      expect(checkpoint?.currentNodeId.value).toBe(nodeId.value);
    });

    it('应该返回 null 对于不存在的检查点', () => {
      const checkpoint = checkpointManager.get('non-existent');

      expect(checkpoint).toBeNull();
    });
  });

  describe('restore', () => {
    it('应该恢复检查点的状态', () => {
      const updatedState = state.updateStateData(state, { key: 'value' });
      const checkpointId = checkpointManager.create(threadId, workflowId, nodeId, updatedState);

      const restoredState = checkpointManager.restore(checkpointId);

      expect(restoredState).not.toBeNull();
      expect(restoredState?.getData('key')).toBe('value');
    });

    it('应该返回 null 对于不存在的检查点', () => {
      const restoredState = checkpointManager.restore('non-existent');

      expect(restoredState).toBeNull();
    });
  });

  describe('delete', () => {
    it('应该删除检查点', () => {
      const checkpointId = checkpointManager.create(threadId, workflowId, nodeId, state);

      const deleted = checkpointManager.delete(checkpointId);

      expect(deleted).toBe(true);
      expect(checkpointManager.hasCheckpoint(checkpointId)).toBe(false);
    });

    it('应该返回 false 对于不存在的检查点', () => {
      const deleted = checkpointManager.delete('non-existent');

      expect(deleted).toBe(false);
    });

    it('应该从线程的检查点列表中删除', () => {
      const checkpointId = checkpointManager.create(threadId, workflowId, nodeId, state);

      checkpointManager.delete(checkpointId);

      const threadCheckpoints = checkpointManager.getThreadCheckpoints(threadId);
      expect(threadCheckpoints).toHaveLength(0);
    });
  });

  describe('getThreadCheckpoints', () => {
    it('应该获取线程的所有检查点', () => {
      checkpointManager.create(threadId, workflowId, nodeId, state, { step: 1 });
      checkpointManager.create(threadId, workflowId, nodeId, state, { step: 2 });
      checkpointManager.create(threadId, workflowId, nodeId, state, { step: 3 });

      const checkpoints = checkpointManager.getThreadCheckpoints(threadId);

      expect(checkpoints).toHaveLength(3);
      // 应该按时间倒序排列
      expect(checkpoints[0].metadata?.step).toBe(3);
      expect(checkpoints[1].metadata?.step).toBe(2);
      expect(checkpoints[2].metadata?.step).toBe(1);
    });

    it('应该返回空数组对于没有检查点的线程', () => {
      const checkpoints = checkpointManager.getThreadCheckpoints('non-existent');

      expect(checkpoints).toEqual([]);
    });
  });

  describe('getLatestCheckpoint', () => {
    it('应该获取最新的检查点', () => {
      checkpointManager.create(threadId, workflowId, nodeId, state, { step: 1 });
      checkpointManager.create(threadId, workflowId, nodeId, state, { step: 2 });
      checkpointManager.create(threadId, workflowId, nodeId, state, { step: 3 });

      const latest = checkpointManager.getLatestCheckpoint(threadId);

      expect(latest).not.toBeNull();
      expect(latest?.metadata?.step).toBe(3);
    });

    it('应该返回 null 对于没有检查点的线程', () => {
      const latest = checkpointManager.getLatestCheckpoint('non-existent');

      expect(latest).toBeNull();
    });
  });

  describe('clearThreadCheckpoints', () => {
    it('应该清除线程的所有检查点', () => {
      checkpointManager.create(threadId, workflowId, nodeId, state);
      checkpointManager.create(threadId, workflowId, nodeId, state);
      checkpointManager.create(threadId, workflowId, nodeId, state);

      const deletedCount = checkpointManager.clearThreadCheckpoints(threadId);

      expect(deletedCount).toBe(3);
      expect(checkpointManager.getThreadCheckpointCount(threadId)).toBe(0);
    });

    it('应该返回 0 对于没有检查点的线程', () => {
      const deletedCount = checkpointManager.clearThreadCheckpoints('non-existent');

      expect(deletedCount).toBe(0);
    });
  });

  describe('clearAllCheckpoints', () => {
    it('应该清除所有检查点', () => {
      checkpointManager.create('thread-1', workflowId, nodeId, state);
      checkpointManager.create('thread-2', workflowId, nodeId, state);
      checkpointManager.create('thread-3', workflowId, nodeId, state);

      checkpointManager.clearAllCheckpoints();

      expect(checkpointManager.getCheckpointCount()).toBe(0);
      expect(checkpointManager.getAllThreadIds()).toHaveLength(0);
    });
  });

  describe('hasCheckpoint', () => {
    it('应该返回 true 对于存在的检查点', () => {
      const checkpointId = checkpointManager.create(threadId, workflowId, nodeId, state);

      expect(checkpointManager.hasCheckpoint(checkpointId)).toBe(true);
    });

    it('应该返回 false 对于不存在的检查点', () => {
      expect(checkpointManager.hasCheckpoint('non-existent')).toBe(false);
    });
  });

  describe('getCheckpointCount', () => {
    it('应该返回检查点数量', () => {
      checkpointManager.create('thread-1', workflowId, nodeId, state);
      checkpointManager.create('thread-2', workflowId, nodeId, state);
      checkpointManager.create('thread-3', workflowId, nodeId, state);

      expect(checkpointManager.getCheckpointCount()).toBe(3);
    });

    it('应该返回 0 对于没有检查点的情况', () => {
      expect(checkpointManager.getCheckpointCount()).toBe(0);
    });
  });

  describe('getThreadCheckpointCount', () => {
    it('应该返回线程的检查点数量', () => {
      checkpointManager.create(threadId, workflowId, nodeId, state);
      checkpointManager.create(threadId, workflowId, nodeId, state);
      checkpointManager.create(threadId, workflowId, nodeId, state);

      expect(checkpointManager.getThreadCheckpointCount(threadId)).toBe(3);
    });

    it('应该返回 0 对于没有检查点的线程', () => {
      expect(checkpointManager.getThreadCheckpointCount('non-existent')).toBe(0);
    });
  });

  describe('getAllThreadIds', () => {
    it('应该返回所有线程ID', () => {
      checkpointManager.create('thread-1', workflowId, nodeId, state);
      checkpointManager.create('thread-2', workflowId, nodeId, state);
      checkpointManager.create('thread-3', workflowId, nodeId, state);

      const threadIds = checkpointManager.getAllThreadIds();

      expect(threadIds).toHaveLength(3);
      expect(threadIds).toContain('thread-1');
      expect(threadIds).toContain('thread-2');
      expect(threadIds).toContain('thread-3');
    });

    it('应该返回空数组对于没有检查点的情况', () => {
      const threadIds = checkpointManager.getAllThreadIds();

      expect(threadIds).toEqual([]);
    });
  });
});