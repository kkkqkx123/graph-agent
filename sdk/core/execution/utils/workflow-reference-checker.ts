/**
 * 工作流引用检查器
 * 提供工作流引用检查功能，用于安全删除和更新操作
 */

import type { WorkflowRegistry } from '../../services/workflow-registry';
import type { ThreadRegistry } from '../../services/thread-registry';
import type { ThreadContext } from '../context/thread-context';
import type { WorkflowTrigger } from '../../../types/trigger';
import { TriggerActionType } from '../../../types/trigger';
import type { TriggerReference } from '../../../types/trigger-template';
import type { WorkflowReference, WorkflowReferenceInfo } from '../../../types/workflow-reference';

/**
 * 检查工作流是否被引用
 * @param workflowRegistry 工作流注册表
 * @param threadRegistry 线程注册表
 * @param workflowId 工作流ID
 * @returns 引用信息
 */
export function checkWorkflowReferences(
  workflowRegistry: WorkflowRegistry,
  threadRegistry: ThreadRegistry,
  workflowId: string
): WorkflowReferenceInfo {
  const references: WorkflowReference[] = [];

  // 检查子工作流引用
  const subgraphRefs = checkSubgraphReferences(workflowRegistry, workflowId);
  references.push(...subgraphRefs);

  // 检查触发器引用
  const triggerRefs = checkTriggerReferences(workflowRegistry, workflowId);
  references.push(...triggerRefs);

  // 检查运行时线程引用
  const threadRefs = checkThreadReferences(threadRegistry, workflowId);
  references.push(...threadRefs);

  const runtimeRefs = references.filter(ref => ref.isRuntimeReference).length;

  return {
    hasReferences: references.length > 0,
    references,
    canSafelyDelete: runtimeRefs === 0,
    stats: {
      subgraphReferences: subgraphRefs.length,
      triggerReferences: triggerRefs.length,
      threadReferences: threadRefs.length,
      runtimeReferences: runtimeRefs
    }
  };
}

/**
 * 检查子工作流引用
 */
function checkSubgraphReferences(
  workflowRegistry: WorkflowRegistry,
  workflowId: string
): WorkflowReference[] {
  const references: WorkflowReference[] = [];
  
  // 检查父工作流引用（当前工作流作为子工作流被引用）
  const parentWorkflowId = workflowRegistry.getParentWorkflow(workflowId);
  if (parentWorkflowId) {
    const parentWorkflow = workflowRegistry.get(parentWorkflowId);
    if (parentWorkflow) {
      references.push({
        type: 'subgraph',
        sourceId: parentWorkflowId,
        sourceName: parentWorkflow.name,
        isRuntimeReference: false,
        details: {
          relationshipType: 'parent-child',
          depth: workflowRegistry.getWorkflowHierarchy(workflowId).depth
        }
      });
    }
  }


  return references;
}

/**
 * 检查触发器引用
 */
function checkTriggerReferences(
  workflowRegistry: WorkflowRegistry,
  workflowId: string
): WorkflowReference[] {
  const references: WorkflowReference[] = [];
  const allWorkflows = workflowRegistry.list();

  for (const summary of allWorkflows) {
    const workflow = workflowRegistry.get(summary.id);
    if (!workflow?.triggers) continue;

    for (const trigger of workflow.triggers) {
      if (isTriggerReferencingWorkflow(trigger, workflowId)) {
        // 安全地获取 trigger 的 id 和 name 属性
        let triggerId: string | undefined;
        let triggerName: string | undefined;

        if (isWorkflowTrigger(trigger)) {
          triggerId = trigger.id;
          triggerName = trigger.name;
        } else if (isTriggerReference(trigger)) {
          triggerId = trigger.triggerId;
          triggerName = trigger.triggerName;
        }

        references.push({
          type: 'trigger',
          sourceId: `${workflow.id}:${triggerId || 'unnamed-trigger'}`,
          sourceName: `${workflow.name} - ${triggerName || 'Unnamed Trigger'}`,
          isRuntimeReference: false,
          details: {
            workflowId: workflow.id,
            triggerId: triggerId,
            triggerType: 'START_WORKFLOW'
          }
        });
      }
    }
  }

  return references;
}

/**
 * 检查运行时线程引用
 */
function checkThreadReferences(
  threadRegistry: ThreadRegistry,
  workflowId: string
): WorkflowReference[] {
  const references: WorkflowReference[] = [];

  // 快速检查：使用活跃工作流集合进行快速过滤
  if (!threadRegistry.isWorkflowActive(workflowId)) {
    return references;
  }

  // 详细检查：仅对活跃工作流进行详细遍历
  const allThreads = threadRegistry.getAll();

  for (const threadContext of allThreads) {
    // 检查主线程是否使用该工作流
    if (threadContext.getWorkflowId() === workflowId) {
      references.push(createMainWorkflowReference(threadContext));
    }

    // 检查触发的子工作流上下文
    const triggeredSubworkflowId = threadContext.getTriggeredSubworkflowId();
    if (triggeredSubworkflowId === workflowId) {
      references.push(createTriggeredSubworkflowReference(threadContext));
    }

    // 检查子图执行栈引用（新增）
    const subgraphStack = threadContext.getSubgraphStack();
    for (const context of subgraphStack) {
      if (context.workflowId === workflowId) {
        references.push(createSubgraphStackReference(threadContext, context));
      }
    }
  }

  return references;
}

/**
 * 创建主工作流引用
 */
function createMainWorkflowReference(threadContext: ThreadContext): WorkflowReference {
  return {
    type: 'thread',
    sourceId: threadContext.getThreadId(),
    sourceName: `Thread ${threadContext.getThreadId()}`,
    isRuntimeReference: true,
    details: {
      threadStatus: threadContext.getStatus(),
      threadType: threadContext.getThreadType(),
      referenceType: 'main-workflow'
    }
  };
}

/**
 * 创建触发的子工作流引用
 */
function createTriggeredSubworkflowReference(threadContext: ThreadContext): WorkflowReference {
  return {
    type: 'thread',
    sourceId: threadContext.getThreadId(),
    sourceName: `Thread ${threadContext.getThreadId()} (Triggered Subworkflow)`,
    isRuntimeReference: true,
    details: {
      threadStatus: threadContext.getStatus(),
      threadType: threadContext.getThreadType(),
      contextType: 'triggered-subworkflow'
    }
  };
}

/**
 * 创建子图执行栈引用
 */
function createSubgraphStackReference(threadContext: ThreadContext, context: any): WorkflowReference {
  return {
    type: 'thread',
    sourceId: threadContext.getThreadId(),
    sourceName: `Thread ${threadContext.getThreadId()} (Subgraph Stack)`,
    isRuntimeReference: true,
    details: {
      threadStatus: threadContext.getStatus(),
      threadType: threadContext.getThreadType(),
      contextType: 'subgraph-stack',
      depth: context.depth,
      parentWorkflowId: context.parentWorkflowId
    }
  };
}

/**
 * 判断触发器是否引用指定工作流
 */
function isTriggerReferencingWorkflow(
  trigger: WorkflowTrigger | TriggerReference,
  targetWorkflowId: string
): boolean {
  // 处理 WorkflowTrigger 类型
  if (isWorkflowTrigger(trigger)) {
    if (trigger.action?.type === TriggerActionType.START_WORKFLOW) {
      const workflowId = trigger.action.parameters?.['workflowId'];
      return workflowId === targetWorkflowId;
    }

    // 处理 ExecuteTriggeredSubgraphActionConfig
    if (trigger.action?.type === TriggerActionType.EXECUTE_TRIGGERED_SUBGRAPH) {
      const triggeredWorkflowId = trigger.action.parameters?.['triggeredWorkflowId'];
      return triggeredWorkflowId === targetWorkflowId;
    }
  }

  // 处理 TriggerReference 类型
  if (isTriggerReference(trigger)) {
    if (trigger.configOverride?.action?.type === TriggerActionType.START_WORKFLOW) {
      const workflowId = trigger.configOverride.action.parameters?.['workflowId'];
      return workflowId === targetWorkflowId;
    }

    if (trigger.configOverride?.action?.type === TriggerActionType.EXECUTE_TRIGGERED_SUBGRAPH) {
      const triggeredWorkflowId = trigger.configOverride.action.parameters?.['triggeredWorkflowId'];
      return triggeredWorkflowId === targetWorkflowId;
    }
  }

  return false;
}

/**
 * 类型守卫：检查是否为 WorkflowTrigger
 */
function isWorkflowTrigger(trigger: WorkflowTrigger | TriggerReference): trigger is WorkflowTrigger {
  return 'action' in trigger;
}

/**
 * 类型守卫：检查是否为 TriggerReference
 */
function isTriggerReference(trigger: WorkflowTrigger | TriggerReference): trigger is TriggerReference {
  return 'templateName' in trigger;
}