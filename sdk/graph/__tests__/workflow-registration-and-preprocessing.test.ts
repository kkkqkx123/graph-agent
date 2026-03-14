/**
 * 工作流注册与预处理测试
 *
 * 测试场景：
 * - 基础工作流注册流程
 * - 复杂工作流注册流程
 * - 重复注册处理
 * - 批量注册
 * - 工作流注销
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { WorkflowRegistry } from '../services/workflow-registry.js';
import { GraphRegistry } from '../services/graph-registry.js';
import { ThreadRegistry } from '../services/thread-registry.js';
import { ConfigurationValidationError } from '@modular-agent/types';
import {
  createSimpleTestWorkflow,
  createTestNode,
  createTestEdge,
  createVariableTestWorkflow,
} from './fixtures/test-helpers.js';
import {
  createMockGraphRegistry,
  createMockThreadRegistry,
} from './fixtures/mock-services.js';

describe('WorkflowRegistry - 工作流注册与预处理', () => {
  let workflowRegistry: WorkflowRegistry;
  let graphRegistry: GraphRegistry;
  let threadRegistry: ThreadRegistry;

  beforeEach(() => {
    // 创建新的注册表实例
    graphRegistry = new GraphRegistry();
    threadRegistry = new ThreadRegistry();
    workflowRegistry = new WorkflowRegistry({}, threadRegistry);
  });

  afterEach(() => {
    // 清理
    workflowRegistry.clear();
    graphRegistry.clear();
    threadRegistry.clear();
  });

  describe('基础工作流注册流程', () => {
    it('应该成功注册简单工作流（START -> END）', () => {
      const workflow = createSimpleTestWorkflow('test-workflow-1');

      workflowRegistry.register(workflow);

      expect(workflowRegistry.has('test-workflow-1')).toBe(true);
      expect(workflowRegistry.get('test-workflow-1')).toEqual(workflow);
    });

    it('应该成功注册包含 VARIABLE 节点的工作流', () => {
      const workflow = createVariableTestWorkflow('var-workflow', {
        variableName: 'testVar',
        variableValue: 'testValue',
      });

      workflowRegistry.register(workflow);

      expect(workflowRegistry.has('var-workflow')).toBe(true);
      const registered = workflowRegistry.get('var-workflow');
      expect(registered).toBeDefined();
      expect(registered!.nodes).toHaveLength(3); // START, VARIABLE, END
    });

    it('应该正确存储工作流元数据', () => {
      const workflow = createSimpleTestWorkflow('metadata-test', {
        name: 'Metadata Test Workflow',
      });
      workflow.metadata = {
        author: 'test-author',
        category: 'test-category',
        tags: ['tag1', 'tag2'],
      };

      workflowRegistry.register(workflow);

      const registered = workflowRegistry.get('metadata-test');
      expect(registered!.metadata).toEqual({
        author: 'test-author',
        category: 'test-category',
        tags: ['tag1', 'tag2'],
      });
    });

    it('应该验证工作流定义的基本完整性', () => {
      const invalidWorkflow = {
        id: '',
        name: 'Invalid Workflow',
        type: 'standard' as const,
        nodes: [],
        edges: [],
        version: '1.0.0',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      expect(() => workflowRegistry.register(invalidWorkflow as any)).toThrow(ConfigurationValidationError);
    });
  });

  describe('复杂工作流注册流程', () => {
    it('应该成功注册包含多种节点类型的工作流', () => {
      const workflow = createSimpleTestWorkflow('complex-workflow', {
        middleNodes: [
          createTestNode('var-1', 'VARIABLE', {
            config: { variableName: 'x', variableValue: 1 },
          }),
          createTestNode('script-1', 'SCRIPT', {
            config: { script: 'return x + 1;' },
          }),
          createTestNode('llm-1', 'LLM', {
            config: { model: 'gpt-4', prompt: 'Hello' },
          }),
        ],
      });

      workflowRegistry.register(workflow);

      expect(workflowRegistry.has('complex-workflow')).toBe(true);
      const registered = workflowRegistry.get('complex-workflow');
      expect(registered!.nodes).toHaveLength(5); // START + 3 middle + END
    });

    it('应该正确处理包含 ROUTE 节点的工作流', () => {
      const workflow = createSimpleTestWorkflow('route-workflow', {
        middleNodes: [
          createTestNode('route-1', 'ROUTE', {
            config: {
              conditions: [
                {
                  id: 'cond-1',
                  expression: { type: 'literal', value: true },
                  targetNodeId: 'branch-a',
                },
              ],
              defaultTargetNodeId: 'branch-b',
            },
          }),
          createTestNode('branch-a', 'VARIABLE', {
            config: { variableName: 'branch', variableValue: 'A' },
          }),
          createTestNode('branch-b', 'VARIABLE', {
            config: { variableName: 'branch', variableValue: 'B' },
          }),
        ],
        middleEdges: [
          createTestEdge('edge-route-a', 'route-1', 'branch-a'),
          createTestEdge('edge-route-b', 'route-1', 'branch-b'),
          createTestEdge('edge-a-end', 'branch-a', 'end'),
          createTestEdge('edge-b-end', 'branch-b', 'end'),
        ],
      });

      workflowRegistry.register(workflow);

      expect(workflowRegistry.has('route-workflow')).toBe(true);
    });

    it('应该正确处理包含 FORK/JOIN 节点的工作流', () => {
      const workflow = createSimpleTestWorkflow('fork-join-workflow', {
        middleNodes: [
          createTestNode('fork-1', 'FORK', {
            config: {
              forkPaths: [
                { pathId: 'path-a', childNodeId: 'branch-a' },
                { pathId: 'path-b', childNodeId: 'branch-b' },
              ],
            },
          }),
          createTestNode('branch-a', 'VARIABLE', {
            config: { variableName: 'a', variableValue: 1 },
          }),
          createTestNode('branch-b', 'VARIABLE', {
            config: { variableName: 'b', variableValue: 2 },
          }),
          createTestNode('join-1', 'JOIN', {
            config: {
              forkPathIds: ['path-a', 'path-b'],
            },
          }),
        ],
        middleEdges: [
          createTestEdge('edge-fork-a', 'fork-1', 'branch-a'),
          createTestEdge('edge-fork-b', 'fork-1', 'branch-b'),
          createTestEdge('edge-a-join', 'branch-a', 'join-1'),
          createTestEdge('edge-b-join', 'branch-b', 'join-1'),
        ],
      });

      workflowRegistry.register(workflow);

      expect(workflowRegistry.has('fork-join-workflow')).toBe(true);
    });
  });

  describe('重复注册处理', () => {
    it('应该在重复注册相同 ID 的工作流时抛出错误', () => {
      const workflow = createSimpleTestWorkflow('duplicate-test');

      workflowRegistry.register(workflow);

      expect(() => workflowRegistry.register(workflow)).toThrow(ConfigurationValidationError);
    });

    it('应该报告正确的错误信息', () => {
      const workflow = createSimpleTestWorkflow('error-message-test');

      workflowRegistry.register(workflow);

      try {
        workflowRegistry.register(workflow);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(ConfigurationValidationError);
        expect((error as ConfigurationValidationError).message).toContain('already exists');
      }
    });
  });

  describe('批量注册', () => {
    it('应该成功批量注册多个工作流', () => {
      const workflows = [
        createSimpleTestWorkflow('batch-1'),
        createSimpleTestWorkflow('batch-2'),
        createSimpleTestWorkflow('batch-3'),
      ];

      workflowRegistry.registerBatch(workflows);

      expect(workflowRegistry.size()).toBe(3);
      expect(workflowRegistry.has('batch-1')).toBe(true);
      expect(workflowRegistry.has('batch-2')).toBe(true);
      expect(workflowRegistry.has('batch-3')).toBe(true);
    });

    it('应该在批量注册时验证每个工作流', () => {
      const workflows = [
        createSimpleTestWorkflow('valid-workflow'),
        {
          id: '',
          name: 'Invalid',
          type: 'standard' as const,
          nodes: [],
          edges: [],
          version: '1.0.0',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      ];

      expect(() => workflowRegistry.registerBatch(workflows as any)).toThrow(ConfigurationValidationError);
    });
  });

  describe('工作流注销', () => {
    it('应该成功注销单个工作流', () => {
      const workflow = createSimpleTestWorkflow('unregister-test');
      workflowRegistry.register(workflow);

      workflowRegistry.unregister('unregister-test');

      expect(workflowRegistry.has('unregister-test')).toBe(false);
      expect(workflowRegistry.get('unregister-test')).toBeUndefined();
    });

    it('注销后查询应返回 undefined', () => {
      const workflow = createSimpleTestWorkflow('query-after-unregister');
      workflowRegistry.register(workflow);

      workflowRegistry.unregister('query-after-unregister');

      expect(workflowRegistry.get('query-after-unregister')).toBeUndefined();
    });

    it('应该成功批量注销多个工作流', () => {
      workflowRegistry.registerBatch([
        createSimpleTestWorkflow('batch-unregister-1'),
        createSimpleTestWorkflow('batch-unregister-2'),
        createSimpleTestWorkflow('batch-unregister-3'),
      ]);

      workflowRegistry.unregisterBatch(['batch-unregister-1', 'batch-unregister-2']);

      expect(workflowRegistry.size()).toBe(1);
      expect(workflowRegistry.has('batch-unregister-3')).toBe(true);
    });

    it('清空后应没有任何工作流', () => {
      workflowRegistry.registerBatch([
        createSimpleTestWorkflow('clear-1'),
        createSimpleTestWorkflow('clear-2'),
      ]);

      workflowRegistry.clear();

      expect(workflowRegistry.size()).toBe(0);
    });
  });

  describe('工作流查询', () => {
    beforeEach(() => {
      workflowRegistry.registerBatch([
        {
          ...createSimpleTestWorkflow('query-test-1', { name: 'Alpha Workflow' }),
          metadata: { tags: ['tag-a', 'tag-b'], category: 'cat-1', author: 'author-1' },
        },
        {
          ...createSimpleTestWorkflow('query-test-2', { name: 'Beta Workflow' }),
          metadata: { tags: ['tag-b', 'tag-c'], category: 'cat-1', author: 'author-2' },
        },
        {
          ...createSimpleTestWorkflow('query-test-3', { name: 'Gamma Workflow' }),
          metadata: { tags: ['tag-a'], category: 'cat-2', author: 'author-1' },
        },
      ]);
    });

    it('应该按名称查询工作流', () => {
      const result = workflowRegistry.getByName('Alpha Workflow');
      expect(result).toBeDefined();
      expect(result!.id).toBe('query-test-1');
    });

    it('应该按标签查询工作流', () => {
      const results = workflowRegistry.getByTags(['tag-b']);
      expect(results).toHaveLength(2);
      expect(results.map((w) => w.id).sort()).toEqual(['query-test-1', 'query-test-2']);
    });

    it('应该按分类查询工作流', () => {
      const results = workflowRegistry.getByCategory('cat-1');
      expect(results).toHaveLength(2);
    });

    it('应该按作者查询工作流', () => {
      const results = workflowRegistry.getByAuthor('author-1');
      expect(results).toHaveLength(2);
    });

    it('应该列出所有工作流摘要', () => {
      const summaries = workflowRegistry.list();
      expect(summaries).toHaveLength(3);
      expect(summaries[0]).toHaveProperty('id');
      expect(summaries[0]).toHaveProperty('name');
      expect(summaries[0]).toHaveProperty('nodeCount');
    });

    it('应该搜索工作流', () => {
      const results = workflowRegistry.search('Alpha');
      expect(results).toHaveLength(1);
      expect(results[0]!.id).toBe('query-test-1');
    });
  });

  describe('工作流导入导出', () => {
    it('应该导出工作流为 JSON', () => {
      const workflow = createSimpleTestWorkflow('export-test');
      workflowRegistry.register(workflow);

      const json = workflowRegistry.export('export-test');
      const parsed = JSON.parse(json);

      expect(parsed.id).toBe('export-test');
      expect(parsed.nodes).toBeDefined();
      expect(parsed.edges).toBeDefined();
    });

    it('应该从 JSON 导入工作流', () => {
      const workflow = createSimpleTestWorkflow('import-test');
      const json = JSON.stringify(workflow);

      const importedId = workflowRegistry.import(json);

      expect(importedId).toBe('import-test');
      expect(workflowRegistry.has('import-test')).toBe(true);
    });

    it('导出不存在的工作流应抛出错误', () => {
      expect(() => workflowRegistry.export('non-existent')).toThrow();
    });
  });
});
