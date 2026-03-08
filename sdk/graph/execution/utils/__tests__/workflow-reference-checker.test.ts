/**
 * WorkflowReferenceChecker 单元测试
 * 测试工作流引用检查功能
 */

import { describe, it, expect, vi } from 'vitest';
import { checkWorkflowReferences } from '../workflow-reference-checker.js';
import type { WorkflowRegistry } from '../../../services/workflow-registry.js';
import type { ThreadRegistry } from '../../../services/thread-registry.js';
import type { ThreadContext } from '../../context/thread-context.js';
import type { WorkflowDefinition, WorkflowTrigger } from '@modular-agent/types';

/**
 * 创建模拟 WorkflowRegistry
 */
function createMockWorkflowRegistry(overrides?: {
  workflows?: Map<string, WorkflowDefinition>;
  parentWorkflow?: string | null;
  hierarchy?: { depth: number };
}): WorkflowRegistry {
  const workflowList = overrides?.workflows
    ? Array.from(overrides.workflows.values()).map(w => ({ id: w.id, name: w.name, version: w.version || '1.0.0' }))
    : [];
  
  return {
    get: vi.fn().mockImplementation((id: string) => overrides?.workflows?.get(id)),
    list: vi.fn().mockReturnValue(workflowList),
    getParentWorkflow: vi.fn().mockReturnValue(overrides?.parentWorkflow || null),
    getWorkflowHierarchy: vi.fn().mockReturnValue(overrides?.hierarchy || { depth: 1 })
  } as unknown as WorkflowRegistry;
}

/**
 * 创建模拟 ThreadRegistry
 */
function createMockThreadRegistry(overrides?: {
  threads?: ThreadContext[];
  isActive?: boolean;
}): ThreadRegistry {
  return {
    getAll: vi.fn().mockReturnValue(overrides?.threads || []),
    isWorkflowActive: vi.fn().mockReturnValue(overrides?.isActive ?? false)
  } as unknown as ThreadRegistry;
}

/**
 * 创建模拟 ThreadContext
 */
function createMockThreadContext(overrides?: {
  threadId?: string;
  workflowId?: string;
  status?: string;
  threadType?: string;
  triggeredSubworkflowId?: string;
  subgraphStack?: any[];
}): ThreadContext {
  return {
    getThreadId: vi.fn().mockReturnValue(overrides?.threadId || 'test-thread'),
    getWorkflowId: vi.fn().mockReturnValue(overrides?.workflowId || 'test-workflow'),
    getStatus: vi.fn().mockReturnValue(overrides?.status || 'RUNNING'),
    getThreadType: vi.fn().mockReturnValue(overrides?.threadType || 'MAIN'),
    getTriggeredSubworkflowId: vi.fn().mockReturnValue(overrides?.triggeredSubworkflowId),
    getSubgraphStack: vi.fn().mockReturnValue(overrides?.subgraphStack || [])
  } as unknown as ThreadContext;
}

/**
 * 创建模拟 WorkflowDefinition
 */
function createMockWorkflow(overrides?: Partial<WorkflowDefinition>): WorkflowDefinition {
  return {
    id: overrides?.id || 'test-workflow',
    name: overrides?.name || 'Test Workflow',
    nodes: [],
    edges: [],
    type: 'default' as any,
    triggers: overrides?.triggers || [],
    variables: overrides?.variables || [],
    description: overrides?.description || '',
    version: '1.0.0',
    createdAt: Date.now(),
    updatedAt: Date.now()
  } as WorkflowDefinition;
}

describe('checkWorkflowReferences', () => {
  describe('子工作流引用检查', () => {
    it('当工作流有父工作流时，返回子工作流引用', () => {
      const parentWorkflow = createMockWorkflow({
        id: 'parent-workflow',
        name: 'Parent Workflow'
      });

      const workflowRegistry = createMockWorkflowRegistry({
        workflows: new Map([['parent-workflow', parentWorkflow]]),
        parentWorkflow: 'parent-workflow',
        hierarchy: { depth: 1 }
      });

      const threadRegistry = createMockThreadRegistry();

      const result = checkWorkflowReferences(workflowRegistry, threadRegistry, 'child-workflow');

      expect(result.hasReferences).toBe(true);
      expect(result.references).toHaveLength(1);
      expect(result.references[0].type).toBe('subgraph');
      expect(result.references[0].sourceId).toBe('parent-workflow');
      expect(result.references[0].sourceName).toBe('Parent Workflow');
      expect(result.references[0].isRuntimeReference).toBe(false);
    });

    it('当工作流没有父工作流时，不返回子工作流引用', () => {
      const workflowRegistry = createMockWorkflowRegistry({
        parentWorkflow: null
      });

      const threadRegistry = createMockThreadRegistry();

      const result = checkWorkflowReferences(workflowRegistry, threadRegistry, 'standalone-workflow');

      expect(result.references.filter(r => r.type === 'subgraph')).toHaveLength(0);
    });

    it('子工作流引用包含正确的层级深度', () => {
      const parentWorkflow = createMockWorkflow({
        id: 'parent-workflow',
        name: 'Parent Workflow'
      });

      const workflowRegistry = createMockWorkflowRegistry({
        workflows: new Map([['parent-workflow', parentWorkflow]]),
        parentWorkflow: 'parent-workflow',
        hierarchy: { depth: 2 }
      });

      const threadRegistry = createMockThreadRegistry();

      const result = checkWorkflowReferences(workflowRegistry, threadRegistry, 'child-workflow');

      expect(result.references[0].details).toEqual({
        relationshipType: 'parent-child',
        depth: 2
      });
    });
  });

  describe('触发器引用检查', () => {
    it('当工作流被触发器引用时，返回触发器引用', () => {
      const trigger: WorkflowTrigger = {
        id: 'trigger-1',
        name: 'Test Trigger',
        condition: { eventType: 'THREAD_COMPLETED' },
        action: {
          type: 'start_workflow',
          parameters: {
            workflowId: 'target-workflow'
          }
        }
      };

      const workflow = createMockWorkflow({
        id: 'referring-workflow',
        name: 'Referring Workflow',
        triggers: [trigger]
      });

      const workflowRegistry = createMockWorkflowRegistry({
        workflows: new Map([['referring-workflow', workflow]]),
        parentWorkflow: null
      });

      const threadRegistry = createMockThreadRegistry();

      const result = checkWorkflowReferences(workflowRegistry, threadRegistry, 'target-workflow');

      expect(result.hasReferences).toBe(true);
      expect(result.references.some(r => r.type === 'trigger')).toBe(true);

      const triggerRef = result.references.find(r => r.type === 'trigger');
      expect(triggerRef).toBeDefined();
      expect(triggerRef?.sourceId).toContain('referring-workflow');
      expect(triggerRef?.sourceName).toContain('Referring Workflow');
    });

    it('当工作流没有被触发器引用时，不返回触发器引用', () => {
      const trigger: WorkflowTrigger = {
        id: 'trigger-1',
        name: 'Test Trigger',
        condition: { eventType: 'THREAD_COMPLETED' },
        action: {
          type: 'start_workflow',
          parameters: {
            workflowId: 'other-workflow'
          }
        }
      };

      const workflow = createMockWorkflow({
        triggers: [trigger]
      });

      const workflowRegistry = createMockWorkflowRegistry({
        workflows: new Map([['referring-workflow', workflow]]),
        parentWorkflow: null
      });

      const threadRegistry = createMockThreadRegistry();

      const result = checkWorkflowReferences(workflowRegistry, threadRegistry, 'target-workflow');

      expect(result.references.filter(r => r.type === 'trigger')).toHaveLength(0);
    });

    it('应该检查 execute_triggered_subgraph 类型的触发器', () => {
      const trigger: WorkflowTrigger = {
        id: 'trigger-1',
        name: 'Test Trigger',
        condition: { eventType: 'THREAD_COMPLETED' },
        action: {
          type: 'execute_triggered_subgraph',
          parameters: {
            triggeredWorkflowId: 'target-workflow'
          }
        }
      };

      const workflow = createMockWorkflow({
        id: 'referring-workflow',
        name: 'Referring Workflow',
        triggers: [trigger]
      });

      const workflowRegistry = createMockWorkflowRegistry({
        workflows: new Map([['referring-workflow', workflow]]),
        parentWorkflow: null
      });

      const threadRegistry = createMockThreadRegistry();

      const result = checkWorkflowReferences(workflowRegistry, threadRegistry, 'target-workflow');

      expect(result.references.some(r => r.type === 'trigger')).toBe(true);
    });
  });

  describe('运行时线程引用检查', () => {
    it('当工作流被线程使用时，返回线程引用', () => {
      const threadContext = createMockThreadContext({
        threadId: 'thread-1',
        workflowId: 'target-workflow',
        status: 'RUNNING'
      });

      const workflowRegistry = createMockWorkflowRegistry({
        parentWorkflow: null
      });

      const threadRegistry = createMockThreadRegistry({
        threads: [threadContext],
        isActive: true
      });

      const result = checkWorkflowReferences(workflowRegistry, threadRegistry, 'target-workflow');

      expect(result.hasReferences).toBe(true);
      expect(result.references.some(r => r.type === 'thread')).toBe(true);

      const threadRef = result.references.find(r => r.type === 'thread');
      expect(threadRef).toBeDefined();
      expect(threadRef?.sourceId).toBe('thread-1');
      expect(threadRef?.isRuntimeReference).toBe(true);
    });

    it('当工作流被触发的子工作流使用时，返回引用', () => {
      const threadContext = createMockThreadContext({
        threadId: 'thread-1',
        workflowId: 'other-workflow',
        triggeredSubworkflowId: 'target-workflow',
        status: 'RUNNING'
      });

      const workflowRegistry = createMockWorkflowRegistry({
        parentWorkflow: null
      });

      const threadRegistry = createMockThreadRegistry({
        threads: [threadContext],
        isActive: true
      });

      const result = checkWorkflowReferences(workflowRegistry, threadRegistry, 'target-workflow');

      expect(result.references.some(r => r.type === 'thread')).toBe(true);
      const threadRef = result.references.find(r => r.type === 'thread');
      expect(threadRef?.details.contextType).toBe('triggered-subworkflow');
    });

    it('当工作流在子图执行栈中时，返回引用', () => {
      const threadContext = createMockThreadContext({
        threadId: 'thread-1',
        workflowId: 'other-workflow',
        subgraphStack: [
          { workflowId: 'target-workflow', depth: 1, parentWorkflowId: 'parent' }
        ]
      });

      const workflowRegistry = createMockWorkflowRegistry({
        parentWorkflow: null
      });

      const threadRegistry = createMockThreadRegistry({
        threads: [threadContext],
        isActive: true
      });

      const result = checkWorkflowReferences(workflowRegistry, threadRegistry, 'target-workflow');

      expect(result.references.some(r => r.type === 'thread')).toBe(true);
      const threadRef = result.references.find(r => r.type === 'thread');
      expect(threadRef?.details.contextType).toBe('subgraph-stack');
      expect(threadRef?.details.depth).toBe(1);
    });

    it('当工作流没有被任何线程使用时，不返回线程引用', () => {
      const threadContext = createMockThreadContext({
        workflowId: 'other-workflow'
      });

      const workflowRegistry = createMockWorkflowRegistry({
        parentWorkflow: null
      });

      const threadRegistry = createMockThreadRegistry({
        threads: [threadContext],
        isActive: false
      });

      const result = checkWorkflowReferences(workflowRegistry, threadRegistry, 'target-workflow');

      expect(result.references.filter(r => r.type === 'thread')).toHaveLength(0);
    });

    it('当工作流不是活跃工作流时，跳过详细检查', () => {
      const workflowRegistry = createMockWorkflowRegistry({
        parentWorkflow: null
      });

      const threadRegistry = createMockThreadRegistry({
        isActive: false
      });

      const result = checkWorkflowReferences(workflowRegistry, threadRegistry, 'target-workflow');

      expect(threadRegistry.isWorkflowActive).toHaveBeenCalledWith('target-workflow');
      expect(result.references.filter(r => r.type === 'thread')).toHaveLength(0);
    });
  });

  describe('统计信息', () => {
    it('返回正确的引用统计', () => {
      const parentWorkflow = createMockWorkflow({
        id: 'parent-workflow',
        name: 'Parent Workflow'
      });

      const trigger: WorkflowTrigger = {
        id: 'trigger-1',
        name: 'Test Trigger',
        condition: { eventType: 'THREAD_COMPLETED' },
        action: {
          type: 'start_workflow',
          parameters: {
            workflowId: 'target-workflow'
          }
        }
      };

      const referringWorkflow = createMockWorkflow({
        id: 'referring-workflow',
        name: 'Referring Workflow',
        triggers: [trigger]
      });

      const threadContext = createMockThreadContext({
        workflowId: 'target-workflow'
      });

      const workflowRegistry = createMockWorkflowRegistry({
        workflows: new Map([
          ['parent-workflow', parentWorkflow],
          ['referring-workflow', referringWorkflow]
        ]),
        parentWorkflow: 'parent-workflow',
        hierarchy: { depth: 1 }
      });

      const threadRegistry = createMockThreadRegistry({
        threads: [threadContext],
        isActive: true
      });

      const result = checkWorkflowReferences(workflowRegistry, threadRegistry, 'target-workflow');

      expect(result.stats.subgraphReferences).toBe(1);
      expect(result.stats.triggerReferences).toBe(1);
      expect(result.stats.threadReferences).toBe(1);
      expect(result.stats.runtimeReferences).toBe(1);
    });

    it('当没有引用时返回零统计', () => {
      const workflowRegistry = createMockWorkflowRegistry({
        parentWorkflow: null
      });

      const threadRegistry = createMockThreadRegistry({
        isActive: false
      });

      const result = checkWorkflowReferences(workflowRegistry, threadRegistry, 'unused-workflow');

      expect(result.stats.subgraphReferences).toBe(0);
      expect(result.stats.triggerReferences).toBe(0);
      expect(result.stats.threadReferences).toBe(0);
      expect(result.stats.runtimeReferences).toBe(0);
    });
  });

  describe('canSafelyDelete', () => {
    it('当没有运行时引用时可以安全删除', () => {
      const parentWorkflow = createMockWorkflow({
        id: 'parent-workflow',
        name: 'Parent Workflow'
      });

      const workflowRegistry = createMockWorkflowRegistry({
        workflows: new Map([['parent-workflow', parentWorkflow]]),
        parentWorkflow: 'parent-workflow'
      });

      const threadRegistry = createMockThreadRegistry({
        isActive: false
      });

      const result = checkWorkflowReferences(workflowRegistry, threadRegistry, 'target-workflow');

      expect(result.hasReferences).toBe(true); // 有子工作流引用
      expect(result.canSafelyDelete).toBe(true); // 但没有运行时引用
    });

    it('当有运行时引用时不能安全删除', () => {
      const threadContext = createMockThreadContext({
        workflowId: 'target-workflow'
      });

      const workflowRegistry = createMockWorkflowRegistry({
        parentWorkflow: null
      });

      const threadRegistry = createMockThreadRegistry({
        threads: [threadContext],
        isActive: true
      });

      const result = checkWorkflowReferences(workflowRegistry, threadRegistry, 'target-workflow');

      expect(result.hasReferences).toBe(true);
      expect(result.canSafelyDelete).toBe(false);
    });

    it('当没有任何引用时可以安全删除', () => {
      const workflowRegistry = createMockWorkflowRegistry({
        parentWorkflow: null
      });

      const threadRegistry = createMockThreadRegistry({
        isActive: false
      });

      const result = checkWorkflowReferences(workflowRegistry, threadRegistry, 'unused-workflow');

      expect(result.hasReferences).toBe(false);
      expect(result.canSafelyDelete).toBe(true);
    });
  });
});
