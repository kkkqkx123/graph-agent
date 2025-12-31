import { HistoryManager, HistoryRecord, HistoryStatistics } from '../history-manager';
import { ID } from '../../../common/value-objects';

describe('HistoryManager', () => {
  let historyManager: HistoryManager;
  let threadId: string;
  let nodeId: ID;

  beforeEach(() => {
    historyManager = new HistoryManager();
    threadId = 'thread-1';
    nodeId = ID.generate();
  });

  describe('recordExecution', () => {
    it('应该成功记录执行历史', () => {
      const historyId = historyManager.recordExecution(
        threadId,
        nodeId,
        { result: 'success' },
        'success',
        { metadata: 'test' }
      );

      expect(historyId).toBeDefined();
      expect(historyId).toMatch(/^hist-\d+-[a-z0-9]+$/);
    });

    it('应该保存执行历史', () => {
      historyManager.recordExecution(threadId, nodeId, { result: 'success' }, 'success');

      const history = historyManager.getHistory(threadId);
      expect(history).toHaveLength(1);
      expect(history[0].nodeId.equals(nodeId)).toBe(true);
      expect(history[0].status).toBe('success');
      expect(history[0].result).toEqual({ result: 'success' });
    });

    it('应该支持不同的执行状态', () => {
      historyManager.recordExecution(threadId, nodeId, undefined, 'success');
      historyManager.recordExecution(threadId, nodeId, undefined, 'failure');
      historyManager.recordExecution(threadId, nodeId, undefined, 'pending');
      historyManager.recordExecution(threadId, nodeId, undefined, 'running');

      const history = historyManager.getHistory(threadId);
      expect(history).toHaveLength(4);
      expect(history[0].status).toBe('success');
      expect(history[1].status).toBe('failure');
      expect(history[2].status).toBe('pending');
      expect(history[3].status).toBe('running');
    });

    it('应该为每个线程维护独立的历史', () => {
      const nodeId2 = ID.generate();
      historyManager.recordExecution(threadId, nodeId, undefined, 'success');
      historyManager.recordExecution('thread-2', nodeId2, undefined, 'success');

      expect(historyManager.getHistory(threadId)).toHaveLength(1);
      expect(historyManager.getHistory('thread-2')).toHaveLength(1);
    });
  });

  describe('getHistory', () => {
    it('应该返回所有执行历史', () => {
      historyManager.recordExecution(threadId, nodeId, undefined, 'success');
      historyManager.recordExecution(threadId, nodeId, undefined, 'failure');

      const history = historyManager.getHistory(threadId);
      expect(history).toHaveLength(2);
    });

    it('应该返回空数组如果没有历史', () => {
      const history = historyManager.getHistory('non-existent-thread');
      expect(history).toEqual([]);
    });

    it('应该返回历史记录的副本', () => {
      historyManager.recordExecution(threadId, nodeId, undefined, 'success');

      const history1 = historyManager.getHistory(threadId);
      const history2 = historyManager.getHistory(threadId);

      expect(history1).not.toBe(history2);
      expect(history1).toEqual(history2);
    });
  });

  describe('getNodeHistory', () => {
    it('应该返回指定节点的执行历史', () => {
      const nodeId2 = ID.generate();
      historyManager.recordExecution(threadId, nodeId, undefined, 'success');
      historyManager.recordExecution(threadId, nodeId2, undefined, 'success');
      historyManager.recordExecution(threadId, nodeId, undefined, 'failure');

      const nodeHistory = historyManager.getNodeHistory(threadId, nodeId);
      expect(nodeHistory).toHaveLength(2);
      expect(nodeHistory[0].nodeId.equals(nodeId)).toBe(true);
      expect(nodeHistory[1].nodeId.equals(nodeId)).toBe(true);
    });

    it('应该返回空数组如果节点没有历史', () => {
      const nodeId2 = ID.generate();
      historyManager.recordExecution(threadId, nodeId, undefined, 'success');

      const nodeHistory = historyManager.getNodeHistory(threadId, nodeId2);
      expect(nodeHistory).toEqual([]);
    });
  });

  describe('getLatestHistory', () => {
    it('应该返回最新的执行历史', () => {
      historyManager.recordExecution(threadId, nodeId, undefined, 'success');
      historyManager.recordExecution(threadId, nodeId, undefined, 'failure');
      historyManager.recordExecution(threadId, nodeId, undefined, 'pending');

      const latestHistory = historyManager.getLatestHistory(threadId);
      expect(latestHistory).toHaveLength(3);
      expect(latestHistory[0].status).toBe('pending');
      expect(latestHistory[1].status).toBe('failure');
      expect(latestHistory[2].status).toBe('success');
    });

    it('应该支持限制返回数量', () => {
      historyManager.recordExecution(threadId, nodeId, undefined, 'success');
      historyManager.recordExecution(threadId, nodeId, undefined, 'failure');
      historyManager.recordExecution(threadId, nodeId, undefined, 'pending');

      const latestHistory = historyManager.getLatestHistory(threadId, 2);
      expect(latestHistory).toHaveLength(2);
      expect(latestHistory[0].status).toBe('pending');
      expect(latestHistory[1].status).toBe('failure');
    });

    it('应该返回空数组如果没有历史', () => {
      const latestHistory = historyManager.getLatestHistory('non-existent-thread');
      expect(latestHistory).toEqual([]);
    });
  });

  describe('getHistoryStatistics', () => {
    it('应该返回正确的统计信息', () => {
      historyManager.recordExecution(threadId, nodeId, undefined, 'success');
      historyManager.recordExecution(threadId, nodeId, undefined, 'success');
      historyManager.recordExecution(threadId, nodeId, undefined, 'failure');
      historyManager.recordExecution(threadId, nodeId, undefined, 'pending');
      historyManager.recordExecution(threadId, nodeId, undefined, 'running');

      const statistics = historyManager.getHistoryStatistics(threadId);
      expect(statistics.totalExecutions).toBe(5);
      expect(statistics.successCount).toBe(2);
      expect(statistics.failureCount).toBe(1);
      expect(statistics.pendingCount).toBe(1);
      expect(statistics.runningCount).toBe(1);
    });

    it('应该返回零统计如果没有历史', () => {
      const statistics = historyManager.getHistoryStatistics('non-existent-thread');
      expect(statistics.totalExecutions).toBe(0);
      expect(statistics.successCount).toBe(0);
      expect(statistics.failureCount).toBe(0);
      expect(statistics.pendingCount).toBe(0);
      expect(statistics.runningCount).toBe(0);
    });
  });

  describe('clearHistory', () => {
    it('应该成功清除执行历史', () => {
      historyManager.recordExecution(threadId, nodeId, undefined, 'success');
      expect(historyManager.hasHistory(threadId)).toBe(true);

      historyManager.clearHistory(threadId);
      expect(historyManager.hasHistory(threadId)).toBe(false);
    });

    it('应该不抛出错误如果历史不存在', () => {
      expect(() => {
        historyManager.clearHistory('non-existent-thread');
      }).not.toThrow();
    });
  });

  describe('clearAllHistories', () => {
    it('应该清除所有执行历史', () => {
      historyManager.recordExecution('thread-1', nodeId, undefined, 'success');
      historyManager.recordExecution('thread-2', nodeId, undefined, 'success');
      historyManager.recordExecution('thread-3', nodeId, undefined, 'success');

      expect(historyManager.getAllThreadIds()).toHaveLength(3);

      historyManager.clearAllHistories();
      expect(historyManager.getAllThreadIds()).toHaveLength(0);
    });
  });

  describe('hasHistory', () => {
    it('应该返回 true 如果有执行历史', () => {
      historyManager.recordExecution(threadId, nodeId, undefined, 'success');
      expect(historyManager.hasHistory(threadId)).toBe(true);
    });

    it('应该返回 false 如果没有执行历史', () => {
      expect(historyManager.hasHistory('non-existent-thread')).toBe(false);
    });

    it('应该返回 false 如果历史已清除', () => {
      historyManager.recordExecution(threadId, nodeId, undefined, 'success');
      historyManager.clearHistory(threadId);
      expect(historyManager.hasHistory(threadId)).toBe(false);
    });
  });

  describe('getAllThreadIds', () => {
    it('应该返回所有线程ID', () => {
      historyManager.recordExecution('thread-1', nodeId, undefined, 'success');
      historyManager.recordExecution('thread-2', nodeId, undefined, 'success');
      historyManager.recordExecution('thread-3', nodeId, undefined, 'success');

      const threadIds = historyManager.getAllThreadIds();
      expect(threadIds).toHaveLength(3);
      expect(threadIds).toContain('thread-1');
      expect(threadIds).toContain('thread-2');
      expect(threadIds).toContain('thread-3');
    });

    it('应该返回空数组如果没有历史', () => {
      const threadIds = historyManager.getAllThreadIds();
      expect(threadIds).toEqual([]);
    });
  });

  describe('getHistoryCount', () => {
    it('应该返回正确的历史记录数量', () => {
      historyManager.recordExecution(threadId, nodeId, undefined, 'success');
      historyManager.recordExecution(threadId, nodeId, undefined, 'success');

      expect(historyManager.getHistoryCount(threadId)).toBe(2);
    });

    it('应该返回 0 如果没有历史', () => {
      expect(historyManager.getHistoryCount('non-existent-thread')).toBe(0);
    });
  });

  describe('历史记录ID生成', () => {
    it('应该生成唯一的ID', () => {
      const id1 = historyManager.recordExecution(threadId, nodeId, undefined, 'success');
      const id2 = historyManager.recordExecution(threadId, nodeId, undefined, 'success');

      expect(id1).not.toBe(id2);
    });

    it('应该生成符合格式的ID', () => {
      const id = historyManager.recordExecution(threadId, nodeId, undefined, 'success');
      expect(id).toMatch(/^hist-\d+-[a-z0-9]+$/);
    });
  });
});