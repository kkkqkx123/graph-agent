/**
 * ExecutionBuilder异步执行单元测试
 */

import { ExecutionBuilder } from '../execution-builder';
import type { ThreadResult } from '@modular-agent/types/thread';

describe('ExecutionBuilder - 异步执行', () => {
  let mockExecutor: any;
  let executionBuilder: ExecutionBuilder;

  beforeEach(() => {
    mockExecutor = {
      executeWorkflow: jest.fn()
    };
    executionBuilder = new ExecutionBuilder(mockExecutor);
  });

  describe('executeAsync', () => {
    test('应该返回Observable', () => {
      executionBuilder.withWorkflow('test-workflow');
      const observable = executionBuilder.executeAsync();
      expect(observable).toBeDefined();
      expect(observable.subscribe).toBeDefined();
    });

    test('应该发送开始事件', (done) => {
      mockExecutor.executeWorkflow.mockResolvedValue({ status: 'completed' });
      executionBuilder.withWorkflow('test-workflow');

      executionBuilder.executeAsync().subscribe({
        next: (event: any) => {
          if (event.type === 'start') {
            expect(event.workflowId).toBe('test-workflow');
            expect(event.timestamp).toBeDefined();
            done();
          }
        }
      });
    });

    test('应该发送完成事件', (done) => {
      const mockResult: ThreadResult = {
        status: 'completed',
        output: { data: 'test' },
        steps: []
      };
      mockExecutor.executeWorkflow.mockResolvedValue(mockResult);
      executionBuilder.withWorkflow('test-workflow');

      executionBuilder.executeAsync().subscribe({
        next: (event: any) => {
          if (event.type === 'complete') {
            expect(event.result).toEqual(mockResult);
            expect(event.workflowId).toBe('test-workflow');
          }
        },
        complete: () => {
          done();
        }
      });
    });

    test('应该发送错误事件', (done) => {
      const mockError = new Error('Test error');
      mockExecutor.executeWorkflow.mockRejectedValue(mockError);
      executionBuilder.withWorkflow('test-workflow');

      executionBuilder.executeAsync().subscribe({
        next: (event: any) => {
          if (event.type === 'error') {
            expect(event.error).toEqual(mockError);
          }
        },
        error: (err) => {
          expect(err).toEqual(mockError);
          done();
        }
      });
    });

    test('未设置workflowId时应该发送错误', (done) => {
      executionBuilder.executeAsync().subscribe({
        error: (err) => {
          expect(err.message).toContain('工作流ID未设置');
          done();
        }
      });
    });
  });

  describe('observeProgress', () => {
    test('应该发送进度事件', (done) => {
      executionBuilder.withWorkflow('test-workflow');
      const observable = executionBuilder.observeProgress();

      observable.subscribe({
        next: (event: any) => {
          expect(event.type).toBe('progress');
          expect(event.workflowId).toBe('test-workflow');
          expect(event.progress).toBeDefined();
          done();
        }
      });

      // 触发进度回调
      executionBuilder['onProgressCallbacks'].forEach((cb: any) => {
        cb({ step: 1, total: 10 });
      });
    });
  });

  describe('observeNodeExecuted', () => {
    test('应该发送节点执行事件', (done) => {
      executionBuilder.withWorkflow('test-workflow');
      const observable = executionBuilder.observeNodeExecuted();

      observable.subscribe({
        next: (event: any) => {
          expect(event.type).toBe('nodeExecuted');
          expect(event.workflowId).toBe('test-workflow');
          expect(event.nodeResult).toBeDefined();
          done();
        }
      });

      // 触发节点执行回调
      if (executionBuilder['options'].onNodeExecuted) {
        executionBuilder['options'].onNodeExecuted({ nodeId: 'test', output: {} });
      }
    });
  });

  describe('observeError', () => {
    test('应该发送错误事件', (done) => {
      executionBuilder.withWorkflow('test-workflow');
      const observable = executionBuilder.observeError();

      observable.subscribe({
        next: (event: any) => {
          expect(event.type).toBe('error');
          expect(event.workflowId).toBe('test-workflow');
          expect(event.error).toBeDefined();
          done();
        }
      });

      // 触发错误回调
      executionBuilder['onErrorCallbacks'].forEach((cb: any) => {
        cb(new Error('Test error'));
      });
    });
  });

  describe('observeAll', () => {
    test('应该发送所有类型的事件', (done) => {
      executionBuilder.withWorkflow('test-workflow');
      const observable = executionBuilder.observeAll();

      const eventTypes: string[] = [];
      observable.subscribe({
        next: (event: any) => {
          eventTypes.push(event.type);
          if (eventTypes.length >= 3) {
            expect(eventTypes).toContain('progress');
            expect(eventTypes).toContain('nodeExecuted');
            expect(eventTypes).toContain('error');
            done();
          }
        }
      });

      // 触发各种事件
      executionBuilder['onProgressCallbacks'].forEach((cb: any) => cb({ step: 1 }));
      if (executionBuilder['options'].onNodeExecuted) {
        executionBuilder['options'].onNodeExecuted({ nodeId: 'test' });
      }
      executionBuilder['onErrorCallbacks'].forEach((cb: any) => cb(new Error('Test')));
    });
  });

  describe('cancel', () => {
    test('应该取消执行', (done) => {
      mockExecutor.executeWorkflow.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({ status: 'completed' }), 1000))
      );
      executionBuilder.withWorkflow('test-workflow');

      executionBuilder.executeAsync().subscribe({
        next: (event: any) => {
          if (event.type === 'cancelled') {
            expect(event.reason).toBe('Execution was cancelled');
            done();
          }
        }
      });

      // 立即取消
      setTimeout(() => {
        executionBuilder.cancel();
      }, 10);
    }, 2000);
  });

  describe('管道操作', () => {
    test('应该支持管道操作符', (done) => {
      mockExecutor.executeWorkflow.mockResolvedValue({ status: 'completed' });
      executionBuilder.withWorkflow('test-workflow');

      executionBuilder
        .executeAsync()
        .pipe(
          (source: any) => {
            let count = 0;
            return {
              subscribe: (observer: any) => {
                return source.subscribe({
                  next: (event: any) => {
                    count++;
                    observer.next({ ...event, count });
                  },
                  error: (err: any) => observer.error(err),
                  complete: () => observer.complete()
                });
              }
            };
          }
        )
        .subscribe({
          next: (event: any) => {
            expect(event.count).toBeDefined();
          },
          complete: () => {
            done();
          }
        });
    });
  });
});