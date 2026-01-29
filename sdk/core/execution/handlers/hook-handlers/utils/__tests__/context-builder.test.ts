/**
 * context-builder 单元测试
 */

import {
  buildHookEvaluationContext,
  convertToEvaluationContext,
  type HookEvaluationContext
} from '../context-builder';
import type { HookExecutionContext } from '../../index';
import type { NodeExecutionResult } from '../../../../../../types/thread';

describe('context-builder', () => {
  describe('buildHookEvaluationContext', () => {
    it('应该正确构建完整的Hook评估上下文', () => {
      // 准备测试数据
      const mockThread = {
        id: 'thread-1',
        workflowId: 'workflow-1',
        variableValues: {
          var1: 'value1',
          var2: 42
        }
      } as any;

      const mockNode = {
        id: 'node-1',
        type: 'LLM_NODE',
        config: {
          model: 'gpt-4',
          temperature: 0.7
        },
        metadata: {
          description: 'Test node'
        }
      } as any;

      const mockResult: NodeExecutionResult = {
        nodeId: 'node-1',
        nodeType: 'LLM_NODE',
        step: 1,
        status: 'COMPLETED',
        data: {
          output: 'Generated text'
        },
        executionTime: 1500,
        error: null
      };

      const context: HookExecutionContext = {
        thread: mockThread,
        node: mockNode,
        result: mockResult
      };

      // 执行函数
      const result = buildHookEvaluationContext(context);

      // 验证结果
      expect(result).toEqual({
        output: mockResult.data,
        status: mockResult.status,
        executionTime: mockResult.executionTime,
        error: mockResult.error,
        variables: mockThread.variableValues,
        config: mockNode.config,
        metadata: mockNode.metadata
      });
    });

    it('应该处理缺少result的情况', () => {
      const mockThread = {
        id: 'thread-1',
        workflowId: 'workflow-1',
        variableValues: {}
      } as any;

      const mockNode = {
        id: 'node-1',
        type: 'LLM_NODE',
        config: {},
        metadata: {}
      } as any;

      const context: HookExecutionContext = {
        thread: mockThread,
        node: mockNode
      };

      const result = buildHookEvaluationContext(context);

      expect(result).toEqual({
        output: undefined,
        status: 'PENDING',
        executionTime: 0,
        error: undefined,
        variables: {},
        config: {},
        metadata: {}
      });
    });

    it('应该处理包含错误的结果', () => {
      const mockThread = {
        id: 'thread-1',
        workflowId: 'workflow-1',
        variableValues: {}
      } as any;

      const mockNode = {
        id: 'node-1',
        type: 'LLM_NODE',
        config: {},
        metadata: {}
      } as any;

      const mockError = new Error('Test error');
      const mockResult: NodeExecutionResult = {
        nodeId: 'node-1',
        nodeType: 'LLM_NODE',
        step: 1,
        status: 'FAILED',
        data: null,
        executionTime: 500,
        error: mockError
      };

      const context: HookExecutionContext = {
        thread: mockThread,
        node: mockNode,
        result: mockResult
      };

      const result = buildHookEvaluationContext(context);

      expect(result).toEqual({
        output: null,
        status: 'FAILED',
        executionTime: 500,
        error: mockError,
        variables: {},
        config: {},
        metadata: {}
      });
    });

    it('应该正确处理复杂的输出数据', () => {
      const mockThread = {
        id: 'thread-1',
        workflowId: 'workflow-1',
        variableValues: {}
      } as any;

      const mockNode = {
        id: 'node-1',
        type: 'LLM_NODE',
        config: {},
        metadata: {}
      } as any;

      const complexData = {
        nested: {
          array: [1, 2, 3],
          object: { key: 'value' }
        },
        primitive: 'text'
      };

      const mockResult: NodeExecutionResult = {
        nodeId: 'node-1',
        nodeType: 'LLM_NODE',
        step: 1,
        status: 'COMPLETED',
        data: complexData,
        executionTime: 1000,
        error: null
      };

      const context: HookExecutionContext = {
        thread: mockThread,
        node: mockNode,
        result: mockResult
      };

      const result = buildHookEvaluationContext(context);

      expect(result.output).toEqual(complexData);
    });
  });

  describe('convertToEvaluationContext', () => {
    it('应该正确转换为EvaluationContext', () => {
      const hookContext: HookEvaluationContext = {
        output: { result: 'test output' },
        status: 'SUCCESS',
        executionTime: 1200,
        error: null,
        variables: {
          var1: 'value1',
          var2: 100
        },
        config: { model: 'gpt-4' },
        metadata: { description: 'test' }
      };

      const result = convertToEvaluationContext(hookContext);

      expect(result).toEqual({
        input: {},
        output: {
          result: hookContext.output,
          status: hookContext.status,
          executionTime: hookContext.executionTime,
          error: hookContext.error
        },
        variables: hookContext.variables
      });
    });

    it('应该处理包含错误的上下文', () => {
      const mockError = new Error('Test error');
      const hookContext: HookEvaluationContext = {
        output: null,
        status: 'FAILED',
        executionTime: 300,
        error: mockError,
        variables: {},
        config: {},
        metadata: {}
      };

      const result = convertToEvaluationContext(hookContext);

      expect(result['output']['error']).toBe(mockError);
      expect(result['output']['status']).toBe('FAILED');
    });

    it('应该处理空变量', () => {
      const hookContext: HookEvaluationContext = {
        output: 'simple output',
        status: 'SUCCESS',
        executionTime: 500,
        error: undefined,
        variables: {},
        config: {},
        metadata: {}
      };

      const result = convertToEvaluationContext(hookContext);

      expect(result.variables).toEqual({});
      expect(result['output']['result']).toBe('simple output');
    });

    it('应该保持input为空对象', () => {
      const hookContext: HookEvaluationContext = {
        output: 'output',
        status: 'SUCCESS',
        executionTime: 100,
        error: undefined,
        variables: {},
        config: {},
        metadata: {}
      };

      const result = convertToEvaluationContext(hookContext);

      expect(result.input).toEqual({});
    });
  });
});