/**
 * ExecutionStateManager 单元测试
 */

import { ExecutionStateManager } from '../execution-state-manager';

describe('ExecutionStateManager', () => {
  let manager: ExecutionStateManager;

  beforeEach(() => {
    manager = new ExecutionStateManager();
  });

  describe('基本功能测试', () => {
    it('应该正确初始化状态', () => {
      const state = manager.getState();
      expect(state.isExecuting).toBe(false);
      expect(state.currentWorkflowId).toBe('');
      expect(state.executionHistory).toHaveLength(0);
      expect(state.startTime).toBeUndefined();
    });

    it('应该开始执行', () => {
      manager.startExecution('workflow-1');
      
      const state = manager.getState();
      expect(state.isExecuting).toBe(true);
      expect(state.currentWorkflowId).toBe('workflow-1');
      expect(state.executionHistory).toHaveLength(0);
      expect(state.startTime).toBeDefined();
      expect(state.startTime).toBeGreaterThan(0);
    });

    it('应该结束执行', () => {
      manager.startExecution('workflow-1');
      manager.endExecution();
      
      const state = manager.getState();
      expect(state.isExecuting).toBe(false);
      expect(state.currentWorkflowId).toBe('');
      expect(state.startTime).toBeUndefined();
    });

    it('应该添加执行结果', () => {
      manager.startExecution('workflow-1');
      
      const result1 = { nodeId: 'node-1', output: 'result1' };
      const result2 = { nodeId: 'node-2', output: 'result2' };
      
      manager.addExecutionResult(result1);
      manager.addExecutionResult(result2);
      
      const history = manager.getHistory();
      expect(history).toHaveLength(2);
      expect(history[0]).toEqual(result1);
      expect(history[1]).toEqual(result2);
    });

    it('应该在开始执行时清空历史记录', () => {
      manager.startExecution('workflow-1');
      manager.addExecutionResult({ nodeId: 'node-1', output: 'result1' });
      
      // 重新开始执行
      manager.startExecution('workflow-2');
      
      const history = manager.getHistory();
      expect(history).toHaveLength(0);
      expect(manager.getCurrentWorkflowId()).toBe('workflow-2');
    });
  });

  describe('状态查询测试', () => {
    it('应该正确返回执行状态', () => {
      manager.startExecution('workflow-1');
      manager.addExecutionResult({ nodeId: 'node-1', output: 'result1' });
      
      const state = manager.getState();
      expect(state.isExecuting).toBe(true);
      expect(state.currentWorkflowId).toBe('workflow-1');
      expect(state.executionHistory).toHaveLength(1);
      expect(state.startTime).toBeDefined();
    });

    it('应该返回历史记录的副本', () => {
      manager.startExecution('workflow-1');
      manager.addExecutionResult({ nodeId: 'node-1', output: 'result1' });
      
      const history1 = manager.getHistory();
      const history2 = manager.getHistory();
      
      // 修改一个副本不应该影响另一个
      history1.push({ nodeId: 'node-2', output: 'result2' });
      
      expect(history1).toHaveLength(2);
      expect(history2).toHaveLength(1);
    });

    it('应该正确检查是否正在执行', () => {
      expect(manager.isCurrentlyExecuting()).toBe(false);
      
      manager.startExecution('workflow-1');
      expect(manager.isCurrentlyExecuting()).toBe(true);
      
      manager.endExecution();
      expect(manager.isCurrentlyExecuting()).toBe(false);
    });

    it('应该正确返回当前工作流ID', () => {
      expect(manager.getCurrentWorkflowId()).toBe('');
      
      manager.startExecution('workflow-1');
      expect(manager.getCurrentWorkflowId()).toBe('workflow-1');
      
      manager.endExecution();
      expect(manager.getCurrentWorkflowId()).toBe('');
    });

    it('应该正确计算执行时长', async () => {
      expect(manager.getExecutionDuration()).toBe(0);
      
      manager.startExecution('workflow-1');
      
      // 等待一小段时间
      await new Promise(resolve => setTimeout(resolve, 10));
      
      const duration = manager.getExecutionDuration();
      expect(duration).toBeGreaterThanOrEqual(10);
      expect(duration).toBeLessThan(100); // 不应该太长
      
      manager.endExecution();
      expect(manager.getExecutionDuration()).toBe(0);
    });
  });

  describe('清空和克隆测试', () => {
    it('应该清空所有状态', () => {
      manager.startExecution('workflow-1');
      manager.addExecutionResult({ nodeId: 'node-1', output: 'result1' });
      
      manager.clear();
      
      const state = manager.getState();
      expect(state.isExecuting).toBe(false);
      expect(state.currentWorkflowId).toBe('');
      expect(state.executionHistory).toHaveLength(0);
      expect(state.startTime).toBeUndefined();
    });

    it('应该正确克隆状态管理器', () => {
      manager.startExecution('workflow-1');
      manager.addExecutionResult({ nodeId: 'node-1', output: 'result1' });
      
      const cloned = manager.clone();
      
      // 验证克隆的状态
      const clonedState = cloned.getState();
      const originalState = manager.getState();
      
      expect(clonedState.isExecuting).toBe(originalState.isExecuting);
      expect(clonedState.currentWorkflowId).toBe(originalState.currentWorkflowId);
      expect(clonedState.executionHistory).toEqual(originalState.executionHistory);
      expect(clonedState.startTime).toBe(originalState.startTime);
      
      // 修改克隆不应该影响原始
      cloned.addExecutionResult({ nodeId: 'node-2', output: 'result2' });
      
      expect(cloned.getHistory()).toHaveLength(2);
      expect(manager.getHistory()).toHaveLength(1);
    });
  });

  describe('边界情况测试', () => {
    it('应该处理空的工作流ID', () => {
      manager.startExecution('');
      
      expect(manager.getCurrentWorkflowId()).toBe('');
      expect(manager.isCurrentlyExecuting()).toBe(true);
    });

    it('应该处理多次开始执行', () => {
      manager.startExecution('workflow-1');
      manager.addExecutionResult({ nodeId: 'node-1', output: 'result1' });
      
      // 再次开始执行应该清空历史
      manager.startExecution('workflow-2');
      
      expect(manager.getCurrentWorkflowId()).toBe('workflow-2');
      expect(manager.getHistory()).toHaveLength(0);
    });

    it('应该处理多次结束执行', () => {
      manager.startExecution('workflow-1');
      manager.endExecution();
      
      // 再次结束执行不应该报错
      expect(() => manager.endExecution()).not.toThrow();
      
      expect(manager.isCurrentlyExecuting()).toBe(false);
    });

    it('应该处理未开始执行时添加结果', () => {
      // 未开始执行时添加结果
      manager.addExecutionResult({ nodeId: 'node-1', output: 'result1' });
      
      // 开始执行后，之前的结果应该被清空
      manager.startExecution('workflow-1');
      
      expect(manager.getHistory()).toHaveLength(0);
    });

    it('应该处理空的历史记录', () => {
      manager.startExecution('workflow-1');
      
      const history = manager.getHistory();
      expect(history).toEqual([]);
      expect(history).toHaveLength(0);
    });
  });

  describe('并发安全测试', () => {
    it('应该正确处理快速的状态变更', async () => {
      const promises = [];
      
      for (let i = 0; i < 10; i++) {
        promises.push(
          (async (index) => {
            manager.startExecution(`workflow-${index}`);
            manager.addExecutionResult({ nodeId: `node-${index}`, output: `result-${index}` });
            await new Promise(resolve => setTimeout(resolve, 1));
            manager.endExecution();
          })(i)
        );
      }
      
      await Promise.all(promises);
      
      // 最终状态应该是未执行
      expect(manager.isCurrentlyExecuting()).toBe(false);
      expect(manager.getCurrentWorkflowId()).toBe('');
    });
  });
});