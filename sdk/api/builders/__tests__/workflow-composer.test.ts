/**
 * WorkflowComposer单元测试
 */

import { WorkflowComposer, sequential, parallel, mergeWorkflows } from '../workflow-composer';
import type { WorkflowDefinition } from '@modular-agent/types/workflow';
import type { ThreadResult } from '@modular-agent/types/thread';

describe('WorkflowComposer', () => {
  let mockExecutor: jest.Mock;
  let mockWorkflow1: WorkflowDefinition;
  let mockWorkflow2: WorkflowDefinition;
  let mockWorkflow3: WorkflowDefinition;

  beforeEach(() => {
    mockExecutor = jest.fn();
    mockWorkflow1 = {
      id: 'workflow-1',
      name: 'Workflow 1',
      version: '1.0.0',
      nodes: [],
      edges: [],
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    mockWorkflow2 = {
      id: 'workflow-2',
      name: 'Workflow 2',
      version: '1.0.0',
      nodes: [],
      edges: [],
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    mockWorkflow3 = {
      id: 'workflow-3',
      name: 'Workflow 3',
      version: '1.0.0',
      nodes: [],
      edges: [],
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
  });

  describe('基础功能', () => {
    test('应该添加工作流', () => {
      const composer = new WorkflowComposer();
      composer.addWorkflow(mockWorkflow1, 'workflow-1');
      expect(composer.getItemCount()).toBe(1);
    });

    test('应该设置组合类型', () => {
      const composer = new WorkflowComposer();
      composer.setType('parallel');
      expect(composer.getConfig().type).toBe('parallel');
    });

    test('应该设置合并策略', () => {
      const composer = new WorkflowComposer();
      composer.setMergeStrategy('first');
      expect(composer.getConfig().mergeStrategy).toBe('first');
    });

    test('应该清空组合项', () => {
      const composer = new WorkflowComposer();
      composer.addWorkflow(mockWorkflow1, 'workflow-1');
      composer.clear();
      expect(composer.getItemCount()).toBe(0);
    });
  });

  describe('串联执行', () => {
    test('应该按顺序执行工作流', async () => {
      const executionOrder: string[] = [];
      mockExecutor.mockImplementation((id: string) => {
        executionOrder.push(id);
        return Promise.resolve({ status: 'completed', output: { workflowId: id } } as ThreadResult);
      });

      const composer = new WorkflowComposer();
      composer
        .addWorkflow(mockWorkflow1, 'workflow-1')
        .addWorkflow(mockWorkflow2, 'workflow-2')
        .addWorkflow(mockWorkflow3, 'workflow-3')
        .setType('sequential');

      const result = await composer.execute(mockExecutor);

      expect(result.success).toBe(true);
      expect(result.results.length).toBe(3);
      expect(executionOrder).toEqual(['workflow-1', 'workflow-2', 'workflow-3']);
    });

    test('应该在错误时停止执行', async () => {
      mockExecutor
        .mockResolvedValueOnce({ status: 'completed' } as ThreadResult)
        .mockRejectedValueOnce(new Error('Test error'))
        .mockResolvedValueOnce({ status: 'completed' } as ThreadResult);

      const composer = new WorkflowComposer();
      composer
        .addWorkflow(mockWorkflow1, 'workflow-1')
        .addWorkflow(mockWorkflow2, 'workflow-2')
        .addWorkflow(mockWorkflow3, 'workflow-3')
        .setType('sequential')
        .setContinueOnError(false);

      const result = await composer.execute(mockExecutor);

      expect(result.success).toBe(false);
      expect(result.results.length).toBe(2);
      expect(result.errors.length).toBe(1);
    });

    test('应该在错误时继续执行', async () => {
      mockExecutor
        .mockResolvedValueOnce({ status: 'completed' } as ThreadResult)
        .mockRejectedValueOnce(new Error('Test error'))
        .mockResolvedValueOnce({ status: 'completed' } as ThreadResult);

      const composer = new WorkflowComposer();
      composer
        .addWorkflow(mockWorkflow1, 'workflow-1')
        .addWorkflow(mockWorkflow2, 'workflow-2')
        .addWorkflow(mockWorkflow3, 'workflow-3')
        .setType('sequential')
        .setContinueOnError(true);

      const result = await composer.execute(mockExecutor);

      expect(result.success).toBe(false);
      expect(result.results.length).toBe(3);
      expect(result.errors.length).toBe(1);
    });
  });

  describe('并联执行', () => {
    test('应该并行执行工作流', async () => {
      mockExecutor.mockImplementation((id: string) => {
        return Promise.resolve({ status: 'completed', output: { workflowId: id } } as ThreadResult);
      });

      const composer = new WorkflowComposer();
      composer
        .addWorkflow(mockWorkflow1, 'workflow-1')
        .addWorkflow(mockWorkflow2, 'workflow-2')
        .addWorkflow(mockWorkflow3, 'workflow-3')
        .setType('parallel');

      const result = await composer.execute(mockExecutor);

      expect(result.success).toBe(true);
      expect(result.results.length).toBe(3);
    });

    test('应该收集所有错误', async () => {
      mockExecutor
        .mockResolvedValueOnce({ status: 'completed' } as ThreadResult)
        .mockRejectedValueOnce(new Error('Error 1'))
        .mockRejectedValueOnce(new Error('Error 2'));

      const composer = new WorkflowComposer();
      composer
        .addWorkflow(mockWorkflow1, 'workflow-1')
        .addWorkflow(mockWorkflow2, 'workflow-2')
        .addWorkflow(mockWorkflow3, 'workflow-3')
        .setType('parallel');

      const result = await composer.execute(mockExecutor);

      expect(result.success).toBe(false);
      expect(result.results.length).toBe(3);
      expect(result.errors.length).toBe(2);
    });
  });

  describe('结果合并', () => {
    test('应该使用first策略', async () => {
      mockExecutor.mockResolvedValue({ status: 'completed', output: { value: 1 } } as ThreadResult);

      const composer = new WorkflowComposer();
      composer
        .addWorkflow(mockWorkflow1, 'workflow-1')
        .addWorkflow(mockWorkflow2, 'workflow-2')
        .setMergeStrategy('first');

      const result = await composer.execute(mockExecutor);

      expect(result.mergedResult?.output).toEqual({ value: 1 });
    });

    test('应该使用last策略', async () => {
      mockExecutor
        .mockResolvedValueOnce({ status: 'completed', output: { value: 1 } } as ThreadResult)
        .mockResolvedValueOnce({ status: 'completed', output: { value: 2 } } as ThreadResult);

      const composer = new WorkflowComposer();
      composer
        .addWorkflow(mockWorkflow1, 'workflow-1')
        .addWorkflow(mockWorkflow2, 'workflow-2')
        .setMergeStrategy('last');

      const result = await composer.execute(mockExecutor);

      expect(result.mergedResult?.output).toEqual({ value: 2 });
    });

    test('应该使用all策略', async () => {
      mockExecutor.mockResolvedValue({ status: 'completed', output: { value: 1 } } as ThreadResult);

      const composer = new WorkflowComposer();
      composer
        .addWorkflow(mockWorkflow1, 'workflow-1')
        .addWorkflow(mockWorkflow2, 'workflow-2')
        .setMergeStrategy('all');

      const result = await composer.execute(mockComposer);

      expect(result.mergedResult?.output).toHaveProperty('combined');
      expect(result.mergedResult?.output.results).toHaveLength(2);
    });

    test('应该使用自定义合并函数', async () => {
      mockExecutor
        .mockResolvedValueOnce({ status: 'completed', output: { value: 1 } } as ThreadResult)
        .mockResolvedValueOnce({ status: 'completed', output: { value: 2 } } as ThreadResult);

      const composer = new WorkflowComposer();
      composer
        .addWorkflow(mockWorkflow1, 'workflow-1')
        .addWorkflow(mockWorkflow2, 'workflow-2')
        .setCustomMergeFn((results) => ({
          status: 'completed',
          output: { sum: results.reduce((acc, r) => acc + (r.output?.value || 0), 0) }
        } as ThreadResult));

      const result = await composer.execute(mockExecutor);

      expect(result.mergedResult?.output).toEqual({ sum: 3 });
    });
  });

  describe('超时处理', () => {
    test('应该在超时时抛出错误', async () => {
      mockExecutor.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({ status: 'completed' } as ThreadResult), 200))
      );

      const composer = new WorkflowComposer();
      composer
        .addWorkflow(mockWorkflow1, 'workflow-1')
        .setTimeout(100);

      const result = await composer.execute(mockExecutor);

      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0].message).toContain('timeout');
    }, 500);
  });

  describe('异步执行', () => {
    test('应该返回Observable', (done) => {
      mockExecutor.mockResolvedValue({ status: 'completed' } as ThreadResult);

      const composer = new WorkflowComposer();
      composer.addWorkflow(mockWorkflow1, 'workflow-1');

      const observable = composer.executeAsync(mockExecutor);
      expect(observable).toBeDefined();
      expect(observable.subscribe).toBeDefined();

      observable.subscribe({
        next: (event: any) => {
          if (event.type === 'complete') {
            expect(event.result.success).toBe(true);
            done();
          }
        }
      });
    });

    test('应该发送开始事件', (done) => {
      mockExecutor.mockResolvedValue({ status: 'completed' } as ThreadResult);

      const composer = new WorkflowComposer();
      composer.addWorkflow(mockWorkflow1, 'workflow-1');

      composer.executeAsync(mockExecutor).subscribe({
        next: (event: any) => {
          if (event.type === 'start') {
            expect(event.compositionType).toBeDefined();
            expect(event.workflowCount).toBe(1);
            done();
          }
        }
      });
    });
  });

  describe('辅助函数', () => {
    test('sequential应该创建串联组合', () => {
      const composer = sequential(
        { workflow: mockWorkflow1, workflowId: 'workflow-1' },
        { workflow: mockWorkflow2, workflowId: 'workflow-2' }
      );

      expect(composer.getConfig().type).toBe('sequential');
      expect(composer.getItemCount()).toBe(2);
    });

    test('parallel应该创建并联组合', () => {
      const composer = parallel(
        { workflow: mockWorkflow1, workflowId: 'workflow-1' },
        { workflow: mockWorkflow2, workflowId: 'workflow-2' }
      );

      expect(composer.getConfig().type).toBe('parallel');
      expect(composer.getItemCount()).toBe(2);
    });

    test('merge应该创建合并组合', () => {
      const composer = mergeWorkflows(
        { workflow: mockWorkflow1, workflowId: 'workflow-1' },
        { workflow: mockWorkflow2, workflowId: 'workflow-2' }
      );

      expect(composer.getConfig().type).toBe('merge');
      expect(composer.getItemCount()).toBe(2);
    });
  });
});