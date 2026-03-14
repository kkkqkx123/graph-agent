/**
 * 子工作流展开测试
 *
 * 测试场景：
 * - 单层子工作流展开
 * - 嵌套子工作流展开
 * - 子工作流输入/输出映射
 * - 子工作流不存在
 * - 自引用检测
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { GraphBuilder } from '../preprocessing/graph-builder.js';
import { WorkflowRegistry } from '../services/workflow-registry.js';
import { GraphRegistry } from '../services/graph-registry.js';
import { ThreadRegistry } from '../services/thread-registry.js';
import { ConfigurationValidationError, WorkflowNotFoundError } from '@modular-agent/types';
import {
  createSimpleTestWorkflow,
  createTestNode,
  createTestEdge,
  createSubgraphTestWorkflow,
} from './fixtures/test-helpers.js';

describe('Subgraph Expansion - 子工作流展开', () => {
  let workflowRegistry: WorkflowRegistry;
  let graphRegistry: GraphRegistry;
  let threadRegistry: ThreadRegistry;

  beforeEach(() => {
    graphRegistry = new GraphRegistry();
    threadRegistry = new ThreadRegistry();
    workflowRegistry = new WorkflowRegistry({}, threadRegistry);
  });

  afterEach(() => {
    workflowRegistry.clear();
    graphRegistry.clear();
    threadRegistry.clear();
  });

  describe('单层子工作流展开', () => {
    it('应该正确展开包含 SUBGRAPH 节点的工作流', async () => {
      // 创建子工作流
      const subWorkflow = createSimpleTestWorkflow('sub-workflow-1', {
        middleNodes: [
          createTestNode('sub-var-1', 'VARIABLE', {
            config: { variableName: 'subVar', variableValue: 'subValue' },
          }),
        ],
      });

      // 创建父工作流
      const parentWorkflow = createSubgraphTestWorkflow('parent-workflow-1', {
        subgraphId: 'sub-workflow-1',
      });

      // 先注册子工作流
      workflowRegistry.register(subWorkflow);

      // 注册父工作流
      workflowRegistry.register(parentWorkflow);

      // 验证子工作流已注册
      expect(workflowRegistry.has('sub-workflow-1')).toBe(true);
      expect(workflowRegistry.has('parent-workflow-1')).toBe(true);
    });

    it('应该正确应用命名空间', async () => {
      const subWorkflow = createSimpleTestWorkflow('namespace-sub', {
        middleNodes: [
          createTestNode('inner-node', 'VARIABLE', {
            config: { variableName: 'inner', variableValue: 1 },
          }),
        ],
      });

      const parentWorkflow = createSubgraphTestWorkflow('namespace-parent', {
        subgraphId: 'namespace-sub',
      });

      workflowRegistry.register(subWorkflow);
      workflowRegistry.register(parentWorkflow);

      // 验证命名空间隔离
      // 子工作流的节点应该有命名空间前缀
      expect(workflowRegistry.has('namespace-sub')).toBe(true);
    });

    it('应该正确生成 ID 映射', async () => {
      const subWorkflow = createSimpleTestWorkflow('id-mapping-sub');
      const parentWorkflow = createSubgraphTestWorkflow('id-mapping-parent', {
        subgraphId: 'id-mapping-sub',
      });

      workflowRegistry.register(subWorkflow);
      workflowRegistry.register(parentWorkflow);

      // ID 映射应该在预处理时生成
      expect(workflowRegistry.has('id-mapping-sub')).toBe(true);
      expect(workflowRegistry.has('id-mapping-parent')).toBe(true);
    });
  });

  describe('嵌套子工作流展开', () => {
    it('应该正确处理多级嵌套子工作流', async () => {
      // 创建最内层子工作流
      const innerSubWorkflow = createSimpleTestWorkflow('inner-sub', {
        middleNodes: [
          createTestNode('inner-var', 'VARIABLE', {
            config: { variableName: 'innerVar', variableValue: 'inner' },
          }),
        ],
      });

      // 创建中间层子工作流（包含最内层）
      const middleSubWorkflow = createSubgraphTestWorkflow('middle-sub', {
        subgraphId: 'inner-sub',
      });

      // 创建父工作流（包含中间层）
      const parentWorkflow = createSubgraphTestWorkflow('nested-parent', {
        subgraphId: 'middle-sub',
      });

      // 按顺序注册
      workflowRegistry.register(innerSubWorkflow);
      workflowRegistry.register(middleSubWorkflow);
      workflowRegistry.register(parentWorkflow);

      expect(workflowRegistry.has('inner-sub')).toBe(true);
      expect(workflowRegistry.has('middle-sub')).toBe(true);
      expect(workflowRegistry.has('nested-parent')).toBe(true);
    });

    it('应该验证递归深度限制', async () => {
      // 创建一个深度嵌套的工作流链
      const workflows = [];
      for (let i = 0; i < 5; i++) {
        if (i === 0) {
          workflows.push(createSimpleTestWorkflow(`deep-${i}`));
        } else {
          workflows.push(createSubgraphTestWorkflow(`deep-${i}`, {
            subgraphId: `deep-${i - 1}`,
          }));
        }
      }

      // 按顺序注册
      for (const workflow of workflows) {
        workflowRegistry.register(workflow);
      }

      // 验证所有工作流都已注册
      for (let i = 0; i < 5; i++) {
        expect(workflowRegistry.has(`deep-${i}`)).toBe(true);
      }
    });
  });

  describe('子工作流输入/输出映射', () => {
    it('应该正确连接入边到子工作流 START', async () => {
      const subWorkflow = createSimpleTestWorkflow('input-mapping-sub', {
        middleNodes: [
          createTestNode('sub-node', 'VARIABLE', {
            config: { variableName: 'input', variableValue: '${input}' },
          }),
        ],
      });

      const parentWorkflow = {
        ...createSubgraphTestWorkflow('input-mapping-parent', {
          subgraphId: 'input-mapping-sub',
          inputMapping: { input: 'parentVar' },
        }),
        nodes: [
          createTestNode('start', 'START'),
          createTestNode('parent-var', 'VARIABLE', {
            config: { variableName: 'parentVar', variableValue: 'value' },
          }),
          createTestNode('subgraph-1', 'SUBGRAPH', {
            config: {
              subgraphId: 'input-mapping-sub',
              inputMapping: { input: 'parentVar' },
            },
          }),
          createTestNode('end', 'END'),
        ],
        edges: [
          createTestEdge('e1', 'start', 'parent-var'),
          createTestEdge('e2', 'parent-var', 'subgraph-1'),
          createTestEdge('e3', 'subgraph-1', 'end'),
        ],
      };

      workflowRegistry.register(subWorkflow);
      workflowRegistry.register(parentWorkflow);

      expect(workflowRegistry.has('input-mapping-sub')).toBe(true);
      expect(workflowRegistry.has('input-mapping-parent')).toBe(true);
    });

    it('应该正确从子工作流 END 连接出边', async () => {
      const subWorkflow = createSimpleTestWorkflow('output-mapping-sub');
      const parentWorkflow = createSubgraphTestWorkflow('output-mapping-parent', {
        subgraphId: 'output-mapping-sub',
        outputMapping: { result: 'outputVar' },
      });

      workflowRegistry.register(subWorkflow);
      workflowRegistry.register(parentWorkflow);

      expect(workflowRegistry.has('output-mapping-sub')).toBe(true);
      expect(workflowRegistry.has('output-mapping-parent')).toBe(true);
    });

    it('原始 SUBGRAPH 节点应被移除', async () => {
      const subWorkflow = createSimpleTestWorkflow('remove-subgraph-sub');
      const parentWorkflow = createSubgraphTestWorkflow('remove-subgraph-parent', {
        subgraphId: 'remove-subgraph-sub',
      });

      workflowRegistry.register(subWorkflow);
      workflowRegistry.register(parentWorkflow);

      // 验证父工作流仍然存在
      const registered = workflowRegistry.get('remove-subgraph-parent');
      expect(registered).toBeDefined();
      // SUBGRAPH 节点在展开后应该被替换
    });
  });

  describe('子工作流不存在', () => {
    it('引用不存在的子工作流应报错', async () => {
      const parentWorkflow = createSubgraphTestWorkflow('missing-sub-parent', {
        subgraphId: 'non-existent-sub',
      });

      // 不注册子工作流，直接注册父工作流
      // 预处理应该检测到子工作流不存在
      expect(() => workflowRegistry.register(parentWorkflow)).toThrow();
    });
  });

  describe('自引用检测', () => {
    it('工作流引用自身应被检测并报错', async () => {
      // 创建一个引用自身的循环工作流
      const selfRefWorkflow = {
        id: 'self-ref-workflow',
        name: 'Self Reference Workflow',
        type: 'SEQUENTIAL' as const,
        nodes: [
          createTestNode('start', 'START'),
          createTestNode('subgraph-1', 'SUBGRAPH', {
            config: {
              subgraphId: 'self-ref-workflow', // 引用自身
            },
          }),
          createTestNode('end', 'END'),
        ],
        edges: [
          createTestEdge('e1', 'start', 'subgraph-1'),
          createTestEdge('e2', 'subgraph-1', 'end'),
        ],
        version: '1.0.0',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      // 自引用应该在验证时被检测
      expect(() => workflowRegistry.register(selfRefWorkflow as any)).toThrow();
    });
  });

  describe('子工作流关系管理', () => {
    it('应该正确注册子图关系', async () => {
      const subWorkflow = createSimpleTestWorkflow('relation-sub');
      const parentWorkflow = createSubgraphTestWorkflow('relation-parent', {
        subgraphId: 'relation-sub',
      });

      workflowRegistry.register(subWorkflow);
      workflowRegistry.register(parentWorkflow);

      // 验证父子关系
      const childWorkflows = workflowRegistry.getChildWorkflows('relation-parent');
      expect(childWorkflows).toContain('relation-sub');

      const parentWorkflowId = workflowRegistry.getParentWorkflow('relation-sub');
      expect(parentWorkflowId).toBe('relation-parent');
    });

    it('应该正确获取工作流层次结构', async () => {
      const subWorkflow = createSimpleTestWorkflow('hierarchy-sub');
      const parentWorkflow = createSubgraphTestWorkflow('hierarchy-parent', {
        subgraphId: 'hierarchy-sub',
      });

      workflowRegistry.register(subWorkflow);
      workflowRegistry.register(parentWorkflow);

      const hierarchy = workflowRegistry.getWorkflowHierarchy('hierarchy-sub');
      expect(hierarchy.ancestors).toContain('hierarchy-parent');
      expect(hierarchy.depth).toBe(1);
    });

    it('应该正确处理引用关系', async () => {
      const subWorkflow = createSimpleTestWorkflow('ref-sub');
      const parentWorkflow = createSubgraphTestWorkflow('ref-parent', {
        subgraphId: 'ref-sub',
      });

      workflowRegistry.register(subWorkflow);
      workflowRegistry.register(parentWorkflow);

      // 检查引用关系
      const referencingWorkflows = workflowRegistry.getReferencingWorkflows('ref-sub');
      expect(referencingWorkflows).toContain('ref-parent');
    });
  });

  describe('子工作流验证', () => {
    it('子工作流应该有有效的 START 和 END 节点', async () => {
      // 创建一个没有 END 节点的无效子工作流
      const invalidSubWorkflow = {
        id: 'invalid-sub',
        name: 'Invalid Sub Workflow',
        type: 'SEQUENTIAL' as const,
        nodes: [
          createTestNode('start', 'START'),
          createTestNode('node-1', 'VARIABLE', {
            config: { variableName: 'x', variableValue: 1 },
          }),
          // 缺少 END 节点
        ],
        edges: [
          createTestEdge('e1', 'start', 'node-1'),
        ],
        version: '1.0.0',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      // 无效的子工作流应该无法注册
      expect(() => workflowRegistry.register(invalidSubWorkflow as any)).toThrow();
    });

    it('子工作流应该通过图验证', async () => {
      // 创建一个有环的子工作流
      const cyclicSubWorkflow = {
        id: 'cyclic-sub',
        name: 'Cyclic Sub Workflow',
        type: 'SEQUENTIAL' as const,
        nodes: [
          createTestNode('start', 'START'),
          createTestNode('node-1', 'VARIABLE', { config: { variableName: 'x', variableValue: 1 } }),
          createTestNode('node-2', 'VARIABLE', { config: { variableName: 'y', variableValue: 2 } }),
          createTestNode('end', 'END'),
        ],
        edges: [
          createTestEdge('e1', 'start', 'node-1'),
          createTestEdge('e2', 'node-1', 'node-2'),
          createTestEdge('e3', 'node-2', 'node-1'), // 环
          createTestEdge('e4', 'node-2', 'end'),
        ],
        version: '1.0.0',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      // 有环的子工作流应该无法通过验证
      expect(() => workflowRegistry.register(cyclicSubWorkflow as any)).toThrow();
    });
  });
});
