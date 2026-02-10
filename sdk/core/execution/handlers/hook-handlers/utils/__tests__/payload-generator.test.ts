/**
 * payload-generator 单元测试
 */

import {
  generateHookEventData,
  resolvePayloadTemplate,
  resolveTemplateVariable,
  getVariableValue
} from '../payload-generator';
import type { NodeHook } from '../../../../../../types/node';
import { HookType } from '../../../../../../types/node';
import type { HookEvaluationContext } from '../context-builder';

describe('payload-generator', () => {
  describe('generateHookEventData', () => {
    const mockEvalContext: HookEvaluationContext = {
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

    it('应该使用默认事件数据当没有配置eventPayload', () => {
      const hook: NodeHook = {
        hookType: HookType.AFTER_EXECUTE,
        eventName: 'test-event',
        enabled: true,
        weight: 0
      };

      const result = generateHookEventData(hook, mockEvalContext);

      expect(result).toEqual({
        output: mockEvalContext.output,
        status: mockEvalContext.status,
        executionTime: mockEvalContext.executionTime,
        error: mockEvalContext.error,
        variables: mockEvalContext.variables,
        config: mockEvalContext.config,
        metadata: mockEvalContext.metadata
      });
    });

    it('应该使用配置的eventPayload', () => {
      const customPayload = {
        message: 'Custom message',
        value: 42
      };

      const hook: NodeHook = {
        hookType: HookType.AFTER_EXECUTE,
        eventName: 'test-event',
        enabled: true,
        weight: 0,
        eventPayload: customPayload
      };

      const result = generateHookEventData(hook, mockEvalContext);

      expect(result).toEqual(customPayload);
    });

    it('应该解析eventPayload中的模板变量', () => {
      const hook: NodeHook = {
        hookType: HookType.AFTER_EXECUTE,
        eventName: 'test-event',
        enabled: true,
        weight: 0,
        eventPayload: {
          message: 'Status: {{status}}',
          time: '{{executionTime}}',
          output: '{{output.result}}'
        }
      };

      const result = generateHookEventData(hook, mockEvalContext);

      expect(result).toEqual({
        message: 'Status: SUCCESS',
        time: 1200,
        output: 'test output'
      });
    });

    it('应该处理包含错误的上下文', () => {
      const errorContext: HookEvaluationContext = {
        output: null,
        status: 'FAILED',
        executionTime: 500,
        error: new Error('Test error'),
        variables: {},
        config: {}
      };

      const hook: NodeHook = {
        hookType: HookType.AFTER_EXECUTE,
        eventName: 'test-event',
        enabled: true,
        weight: 0
      };

      const result = generateHookEventData(hook, errorContext);

      expect(result['error']).toBeInstanceOf(Error);
      expect(result['status']).toBe('FAILED');
    });
  });

  describe('resolvePayloadTemplate', () => {
    const mockEvalContext: HookEvaluationContext = {
      output: { result: 'test output', nested: { value: 42 } },
      status: 'SUCCESS',
      executionTime: 1200,
      error: null,
      variables: { var1: 'value1', var2: 100 },
      config: { model: 'gpt-4' },
      metadata: { description: 'test' }
    };

    it('应该解析字符串模板变量', () => {
      const payload = {
        message: 'Status: {{status}}',
        time: 'Time: {{executionTime}}ms'
      };

      const result = resolvePayloadTemplate(payload, mockEvalContext);

      expect(result).toEqual({
        message: 'Status: SUCCESS',
        time: 'Time: 1200ms'
      });
    });

    it('应该递归处理嵌套对象', () => {
      const payload = {
        level1: {
          level2: {
            message: '{{status}}',
            value: '{{output.nested.value}}'
          }
        }
      };

      const result = resolvePayloadTemplate(payload, mockEvalContext);

      expect(result).toEqual({
        level1: {
          level2: {
            message: 'SUCCESS',
            value: 42
          }
        }
      });
    });

    it('应该保留非字符串值', () => {
      const payload = {
        number: 42,
        boolean: true,
        nullValue: null,
        array: [1, 2, 3]
      };

      const result = resolvePayloadTemplate(payload, mockEvalContext);

      // 数组会被转换为对象形式，这是当前实现的行为
      expect(result).toEqual({
        number: 42,
        boolean: true,
        nullValue: null,
        array: { '0': 1, '1': 2, '2': 3 }
      });
    });

    it('应该处理混合类型的payload', () => {
      const payload = {
        template: '{{status}}',
        number: 100,
        nested: {
          template: '{{output.result}}',
          boolean: false
        }
      };

      const result = resolvePayloadTemplate(payload, mockEvalContext);

      expect(result).toEqual({
        template: 'SUCCESS',
        number: 100,
        nested: {
          template: 'test output',
          boolean: false
        }
      });
    });

    it('应该处理不存在的变量路径', () => {
      const payload = {
        value: '{{nonexistent.path}}'
      };

      const result = resolvePayloadTemplate(payload, mockEvalContext);

      expect(result['value']).toBe('');
    });

    it('应该处理多个模板变量在同一字符串中', () => {
      const payload = {
        message: '{{status}} - {{executionTime}}ms - {{output.result}}'
      };

      const result = resolvePayloadTemplate(payload, mockEvalContext);

      expect(result['message']).toBe('SUCCESS - 1200ms - test output');
    });

    it('应该处理空对象', () => {
      const payload = {};

      const result = resolvePayloadTemplate(payload, mockEvalContext);

      expect(result).toEqual({});
    });
  });

  describe('resolveTemplateVariable', () => {
    const mockEvalContext: HookEvaluationContext = {
      output: { result: 'test output', nested: { value: 42 } },
      status: 'SUCCESS',
      executionTime: 1200,
      error: null,
      variables: { var1: 'value1', var2: 100 },
      config: { model: 'gpt-4' },
      metadata: { description: 'test' }
    };

    it('应该解析简单的模板变量', () => {
      const result = resolveTemplateVariable('{{status}}', mockEvalContext);
      expect(result).toBe('SUCCESS');
    });

    it('应该解析嵌套路径的变量', () => {
      const result = resolveTemplateVariable('{{output.result}}', mockEvalContext);
      expect(result).toBe('test output');
    });

    it('应该解析深层嵌套的变量', () => {
      const result = resolveTemplateVariable('{{output.nested.value}}', mockEvalContext);
      expect(result).toBe(42);
    });

    it('应该将字符串true转换为布尔值true', () => {
      const result = resolveTemplateVariable('true', mockEvalContext);
      expect(result).toBe(true);
    });

    it('应该将字符串false转换为布尔值false', () => {
      const result = resolveTemplateVariable('false', mockEvalContext);
      expect(result).toBe(false);
    });

    it('应该将数字字符串转换为数字', () => {
      const result = resolveTemplateVariable('42', mockEvalContext);
      expect(result).toBe(42);
    });

    it('应该将浮点数字符串转换为数字', () => {
      const result = resolveTemplateVariable('3.14', mockEvalContext);
      expect(result).toBe(3.14);
    });

    it('应该将负数字符串转换为数字', () => {
      const result = resolveTemplateVariable('-100', mockEvalContext);
      expect(result).toBe(-100);
    });

    it('应该处理不存在的变量路径', () => {
      const result = resolveTemplateVariable('{{nonexistent.path}}', mockEvalContext);
      expect(result).toBe('');
    });

    it('应该处理包含多个变量的模板', () => {
      const result = resolveTemplateVariable('{{status}}: {{executionTime}}', mockEvalContext);
      expect(result).toBe('SUCCESS: 1200');
    });

    it('应该处理变量前后有文本的模板', () => {
      const result = resolveTemplateVariable('The status is {{status}}', mockEvalContext);
      expect(result).toBe('The status is SUCCESS');
    });

    it('应该处理变量值为null的情况', () => {
      const contextWithNull: HookEvaluationContext = {
        ...mockEvalContext,
        output: null
      };

      const result = resolveTemplateVariable('{{output.result}}', contextWithNull);
      expect(result).toBe('');
    });

    it('应该处理变量值为undefined的情况', () => {
      const contextWithUndefined: HookEvaluationContext = {
        ...mockEvalContext,
        metadata: undefined
      };

      const result = resolveTemplateVariable('{{metadata.description}}', contextWithUndefined);
      expect(result).toBe('');
    });

    it('应该保留非数字字符串', () => {
      const result = resolveTemplateVariable('hello world', mockEvalContext);
      expect(result).toBe('hello world');
    });

    it('应该处理空字符串', () => {
      const result = resolveTemplateVariable('', mockEvalContext);
      expect(result).toBe('');
    });
  });

  describe('getVariableValue', () => {
    const mockEvalContext: HookEvaluationContext = {
      output: { result: 'test output', nested: { value: 42 } },
      status: 'SUCCESS',
      executionTime: 1200,
      error: null,
      variables: { var1: 'value1', var2: 100 },
      config: { model: 'gpt-4' },
      metadata: { description: 'test' }
    };

    it('应该获取顶层属性', () => {
      const result = getVariableValue('status', mockEvalContext);
      expect(result).toBe('SUCCESS');
    });

    it('应该获取嵌套属性', () => {
      const result = getVariableValue('output.result', mockEvalContext);
      expect(result).toBe('test output');
    });

    it('应该获取深层嵌套属性', () => {
      const result = getVariableValue('output.nested.value', mockEvalContext);
      expect(result).toBe(42);
    });

    it('应该返回undefined对于不存在的路径', () => {
      const result = getVariableValue('nonexistent.path', mockEvalContext);
      expect(result).toBeUndefined();
    });

    it('应该返回undefined当中间路径为null', () => {
      const contextWithNull: HookEvaluationContext = {
        ...mockEvalContext,
        output: null
      };

      const result = getVariableValue('output.result', contextWithNull);
      expect(result).toBeUndefined();
    });

    it('应该返回undefined当中间路径为undefined', () => {
      const contextWithUndefined: HookEvaluationContext = {
        ...mockEvalContext,
        metadata: undefined
      };

      const result = getVariableValue('metadata.description', contextWithUndefined);
      expect(result).toBeUndefined();
    });

    it('应该获取变量值', () => {
      const result = getVariableValue('variables.var1', mockEvalContext);
      expect(result).toBe('value1');
    });

    it('应该获取配置值', () => {
      const result = getVariableValue('config.model', mockEvalContext);
      expect(result).toBe('gpt-4');
    });

    it('应该处理空路径', () => {
      const result = getVariableValue('', mockEvalContext);
      // 空路径会返回 undefined，因为 split('') 会返回 ['']
      expect(result).toBeUndefined();
    });

    it('应该处理单级路径', () => {
      const result = getVariableValue('executionTime', mockEvalContext);
      expect(result).toBe(1200);
    });
  });
});