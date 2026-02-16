/**
 * ADD_TOOL节点验证器测试
 */

import { validateAddToolNode } from '../add-tool-validator';
import { NodeType } from '@modular-agent/types';
import { ConfigurationValidationError } from '@modular-agent/types';
import { ToolRegistry } from '../../../tools/tool-registry';
import { ToolType } from '@modular-agent/types';

describe('validateAddToolNode', () => {
  const createMockNode = (config: any) => ({
    id: 'add-tool-1',
    name: 'Add Tool Node',
    type: 'ADD_TOOL',
    config,
    incomingEdgeIds: [],
    outgoingEdgeIds: []
  });

  describe('有效配置', () => {
    it('应该接受最小配置', () => {
      const node = createMockNode({
        toolIds: ['tool-1', 'tool-2']
      });

      const result = validateAddToolNode(node);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toEqual(node);
      }
    });

    it('应该接受完整配置', () => {
      const node = createMockNode({
        toolIds: ['tool-1', 'tool-2'],
        descriptionTemplate: 'Tool: {{toolName}}',
        scope: 'THREAD',
        overwrite: true,
        metadata: {
          category: 'test',
          priority: 1
        }
      });

      const result = validateAddToolNode(node);

      expect(result.isOk()).toBe(true);
    });

    it('应该接受WORKFLOW作用域', () => {
      const node = createMockNode({
        toolIds: ['tool-1'],
        scope: 'WORKFLOW'
      });

      const result = validateAddToolNode(node);

      expect(result.isOk()).toBe(true);
    });

    it('应该接受GLOBAL作用域', () => {
      const node = createMockNode({
        toolIds: ['tool-1'],
        scope: 'global'
      });

      const result = validateAddToolNode(node);

      expect(result.isOk()).toBe(true);
    });

    it('应该接受overwrite为false', () => {
      const node = createMockNode({
        toolIds: ['tool-1'],
        overwrite: false
      });

      const result = validateAddToolNode(node);

      expect(result.isOk()).toBe(true);
    });

    it('应该接受descriptionTemplate', () => {
      const node = createMockNode({
        toolIds: ['tool-1'],
        descriptionTemplate: 'Custom description'
      });

      const result = validateAddToolNode(node);

      expect(result.isOk()).toBe(true);
    });

    it('应该接受metadata', () => {
      const node = createMockNode({
        toolIds: ['tool-1'],
        metadata: {
          customField: 'value'
        }
      });

      const result = validateAddToolNode(node);

      expect(result.isOk()).toBe(true);
    });
  });

  describe('无效配置', () => {
    it('应该拒绝缺少toolIds', () => {
      const node = createMockNode({});

      const result = validateAddToolNode(node);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error[0]).toBeInstanceOf(ConfigurationValidationError);
        expect(result.error[0].message).toContain('toolIds');
      }
    });

    it('应该拒绝空的toolIds数组', () => {
      const node = createMockNode({
        toolIds: []
      });

      const result = validateAddToolNode(node);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error[0].message).toContain('At least one tool ID is required');
      }
    });

    it('应该拒绝包含空字符串的toolIds', () => {
      const node = createMockNode({
        toolIds: ['tool-1', '']
      });

      const result = validateAddToolNode(node);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error[0].message).toContain('Tool ID must not be empty');
      }
    });

    it('应该拒绝无效的scope值', () => {
      const node = createMockNode({
        toolIds: ['tool-1'],
        scope: 'INVALID_SCOPE' as any
      });

      const result = validateAddToolNode(node);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error[0].message).toContain('scope');
      }
    });

    it('应该拒绝非布尔值的overwrite', () => {
      const node = createMockNode({
        toolIds: ['tool-1'],
        overwrite: 'true' as any
      });

      const result = validateAddToolNode(node);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error[0].message).toContain('overwrite');
      }
    });

    it('应该拒绝非字符串的descriptionTemplate', () => {
      const node = createMockNode({
        toolIds: ['tool-1'],
        descriptionTemplate: 123 as any
      });

      const result = validateAddToolNode(node);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error[0].message).toContain('descriptionTemplate');
      }
    });
  });

  describe('节点类型验证', () => {
    it('应该拒绝非ADD_TOOL节点类型', () => {
      const node = {
        id: 'llm-node-1',
        name: 'LLM Node',
        type: 'LLM',
        config: {
          toolIds: ['tool-1']
        },
        incomingEdgeIds: [],
        outgoingEdgeIds: []
      };

      const result = validateAddToolNode(node);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error[0].message).toContain('Invalid node type for ADD_TOOL validator');
      }
    });
  });

  describe('错误路径', () => {
    it('应该提供正确的配置路径', () => {
      const node = createMockNode({
        toolIds: []
      });

      const result = validateAddToolNode(node);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error[0].configPath).toContain('node.add-tool-1.config.toolIds');
      }
    });

    it('应该提供正确的配置类型', () => {
      const node = createMockNode({
        toolIds: []
      });

      const result = validateAddToolNode(node);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error[0].configType).toBe('node');
      }
    });
  });

  describe('工具存在性验证（可选）', () => {
    let toolRegistry: ToolRegistry;

    beforeEach(() => {
      toolRegistry = new ToolRegistry();
      // 注册一些测试工具
      toolRegistry.register({
        id: 'tool-1',
        name: 'Tool 1',
        type: 'STATELESS',
        description: 'Test tool 1',
        parameters: {
          properties: {},
          required: []
        },
        config: {
          execute: async () => ({})
        }
      });
      toolRegistry.register({
        id: 'tool-2',
        name: 'Tool 2',
        type: 'STATELESS',
        description: 'Test tool 2',
        parameters: {
          properties: {},
          required: []
        },
        config: {
          execute: async () => ({})
        }
      });
    });

    it('应该在提供toolRegistry时验证工具存在性', () => {
      const node = createMockNode({
        toolIds: ['tool-1', 'tool-2']
      });

      const result = validateAddToolNode(node, toolRegistry);

      expect(result.isOk()).toBe(true);
    });

    it('应该在工具不存在时返回错误', () => {
      const node = createMockNode({
        toolIds: ['tool-1', 'non-existent-tool']
      });

      const result = validateAddToolNode(node, toolRegistry);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error[0].message).toContain('Tool IDs not found in registry');
        expect(result.error[0].message).toContain('non-existent-tool');
      }
    });

    it('应该在所有工具都不存在时返回错误', () => {
      const node = createMockNode({
        toolIds: ['non-existent-1', 'non-existent-2']
      });

      const result = validateAddToolNode(node, toolRegistry);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error[0].message).toContain('non-existent-1');
        expect(result.error[0].message).toContain('non-existent-2');
      }
    });

    it('应该在不提供toolRegistry时跳过工具存在性验证', () => {
      const node = createMockNode({
        toolIds: ['non-existent-tool']
      });

      const result = validateAddToolNode(node);

      expect(result.isOk()).toBe(true);
    });

    it('应该提供正确的错误路径', () => {
      const node = createMockNode({
        toolIds: ['tool-1', 'non-existent-tool']
      });

      const result = validateAddToolNode(node, toolRegistry);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error[0].configPath).toContain('node.add-tool-1.config.toolIds');
      }
    });
  });
});