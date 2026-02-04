/**
 * ExecutionBuilder 单元测试
 */

import { ExecutionBuilder } from '../execution-builder';
import { ThreadExecutorAPI } from '../../core/thread-executor-api';
import { workflowRegistry } from '../../../core/services/workflow-registry';
import type { WorkflowDefinition } from '../../../types/workflow';
import { NodeType } from '../../../types/node';

describe('ExecutionBuilder', () => {
  let executionBuilder: ExecutionBuilder;
  let executor: ThreadExecutorAPI;

  beforeEach(() => {
    executor = new ThreadExecutorAPI(workflowRegistry);
    executionBuilder = new ExecutionBuilder(executor);
  });

  describe('配置执行选项', () => {
    it('应该设置工作流ID', () => {
      const builder = executionBuilder.withWorkflow('test-workflow');
      expect(builder).toBe(executionBuilder);
    });

    it('应该设置输入数据', () => {
      const builder = executionBuilder.withInput({ data: 'test' });
      expect(builder).toBe(executionBuilder);
    });

    it('应该设置最大执行步数', () => {
      const builder = executionBuilder.withMaxSteps(100);
      expect(builder).toBe(executionBuilder);
    });

    it('应该设置超时时间', () => {
      const builder = executionBuilder.withTimeout(30000);
      expect(builder).toBe(executionBuilder);
    });

    it('应该启用检查点', () => {
      const builder = executionBuilder.withCheckpoints(true);
      expect(builder).toBe(executionBuilder);
    });

    it('应该设置节点执行回调', () => {
      const callback = jest.fn();
      const builder = executionBuilder.onNodeExecuted(callback);
      expect(builder).toBe(executionBuilder);
    });

    it('应该设置进度回调', () => {
      const callback = jest.fn();
      const builder = executionBuilder.onProgress(callback);
      expect(builder).toBe(executionBuilder);
    });

    it('应该设置错误回调', () => {
      const callback = jest.fn();
      const builder = executionBuilder.onError(callback);
      expect(builder).toBe(executionBuilder);
    });
  });

  describe('链式调用', () => {
    it('应该支持完整的链式调用', () => {
      const progressCallback = jest.fn();
      const errorCallback = jest.fn();

      const builder = executionBuilder
        .withWorkflow('test-workflow')
        .withInput({ data: 'test' })
        .withMaxSteps(100)
        .withTimeout(30000)
        .withCheckpoints(true)
        .onProgress(progressCallback)
        .onError(errorCallback);

      expect(builder).toBe(executionBuilder);
    });
  });

  describe('执行错误处理', () => {
    it('应该在未设置工作流ID时抛出错误', async () => {
      await expect(executionBuilder.execute()).rejects.toThrow('工作流ID未设置');
    });

    it('应该在未设置工作流ID时返回错误Result', async () => {
      const result = await executionBuilder.executeSafe();
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe('工作流ID未设置');
      }
    });
  });

  describe('Promise支持', () => {
    it('应该支持then方法', async () => {
      const onFulfilled = jest.fn();
      const onRejected = jest.fn();

      executionBuilder.withWorkflow('test-workflow');
      
      // 由于工作流不存在，会抛出错误
      await executionBuilder
        .then(onFulfilled, onRejected)
        .catch(() => {
          // 忽略错误
        });

      expect(onRejected).toHaveBeenCalled();
    });

    it('应该支持catch方法', async () => {
      const onRejected = jest.fn();

      executionBuilder.withWorkflow('test-workflow');
      
      await executionBuilder
        .catch(onRejected)
        .catch(() => {
          // 忽略错误
        });

      expect(onRejected).toHaveBeenCalled();
    });

    it('应该支持finally方法', async () => {
      const onFinally = jest.fn();

      executionBuilder.withWorkflow('test-workflow');
      
      await executionBuilder
        .finally(onFinally)
        .catch(() => {
          // 忽略错误
        });

      expect(onFinally).toHaveBeenCalled();
    });
  });
});