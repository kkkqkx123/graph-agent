/**
 * WorkflowReferenceManager - 工作流引用管理器
 * 负责管理工作流间的引用关系，提供引用检查功能
 * 基于现有 workflow-reference-checker 扩展
 */

import type { WorkflowRegistry } from '../../services/workflow-registry';
import type { ThreadRegistry } from '../../services/thread-registry';
import type {
  WorkflowReference,
  WorkflowReferenceInfo,
  WorkflowReferenceRelation,
  WorkflowReferenceType
} from '@modular-agent/types';
import { checkWorkflowReferences as checkReferences } from '../utils/workflow-reference-checker';
import { SingletonRegistry } from '../context/singleton-registry';

export class WorkflowReferenceManager {
  private referenceRelations: Map<string, WorkflowReferenceRelation[]> = new Map();

  constructor(
    private workflowRegistry: WorkflowRegistry
  ) { }

  /**
   * 获取 ThreadRegistry 实例
   */
  private getThreadRegistry(): ThreadRegistry {
    return SingletonRegistry.getThreadRegistry();
  }

  /**
   * 添加工作流引用关系
   */
  addReferenceRelation(relation: WorkflowReferenceRelation): void {
    const key = relation.targetWorkflowId;
    if (!this.referenceRelations.has(key)) {
      this.referenceRelations.set(key, []);
    }
    this.referenceRelations.get(key)!.push(relation);
  }

  /**
   * 移除工作流引用关系
   */
  removeReferenceRelation(
    sourceWorkflowId: string,
    targetWorkflowId: string,
    referenceType: WorkflowReferenceType
  ): void {
    const relations = this.referenceRelations.get(targetWorkflowId);
    if (relations) {
      const filtered = relations.filter((rel: WorkflowReferenceRelation) =>
        !(rel.sourceWorkflowId === sourceWorkflowId &&
          rel.referenceType === referenceType)
      );
      if (filtered.length === 0) {
        this.referenceRelations.delete(targetWorkflowId);
      } else {
        this.referenceRelations.set(targetWorkflowId, filtered);
      }
    }
  }

  /**
   * 检查工作流是否有引用
   */
  hasReferences(workflowId: string): boolean {
    // 检查 referenceRelations 中的引用（如 trigger、thread 等）
    const hasReferenceRelations = this.referenceRelations.has(workflowId) &&
      this.referenceRelations.get(workflowId)!.length > 0;

    // 检查 workflowRelationships 中的父子关系
    const hasParentRelationship = this.workflowRegistry.getParentWorkflow(workflowId) !== null;

    return hasReferenceRelations || hasParentRelationship;
  }

  /**
   * 获取工作流引用关系
   */
  getReferenceRelations(workflowId: string): WorkflowReferenceRelation[] {
    return this.referenceRelations.get(workflowId) || [];
  }

  /**
   * 清空工作流引用关系
   */
  clearReferenceRelations(workflowId: string): void {
    this.referenceRelations.delete(workflowId);
  }

  /**
   * 检查工作流引用（整合现有功能）
   */
  checkWorkflowReferences(workflowId: string): WorkflowReferenceInfo {
    return checkReferences(this.workflowRegistry, this.getThreadRegistry(), workflowId);
  }

  /**
   * 格式化引用详情信息
   */
  formatReferenceDetails(references: WorkflowReference[]): string {
    if (references.length === 0) {
      return '  No references found.';
    }

    return references.map((ref, index) => {
      const details = Object.entries(ref.details)
        .map(([key, value]) => `${key}: ${value}`)
        .join(', ');

      return `  ${index + 1}. [${ref.type}] ${ref.sourceName} (${ref.sourceId}) - ${ref.isRuntimeReference ? 'Runtime' : 'Static'}${details ? ` - ${details}` : ''}`;
    }).join('\n');
  }

  /**
   * 检查是否可以安全删除工作流
   */
  canSafelyDelete(workflowId: string, options?: { force?: boolean }): { canDelete: boolean; details: string } {
    const referenceInfo = this.checkWorkflowReferences(workflowId);

    if (!referenceInfo.hasReferences) {
      return { canDelete: true, details: 'No references found' };
    }

    if (options?.force) {
      if (referenceInfo.stats.runtimeReferences > 0) {
        const runtimeReferences = referenceInfo.references.filter(ref => ref.isRuntimeReference);
        const runtimeDetails = this.formatReferenceDetails(runtimeReferences);
        return {
          canDelete: true,
          details: `Force deleting workflow with ${referenceInfo.stats.runtimeReferences} active references:\n${runtimeDetails}`
        };
      }
      return { canDelete: true, details: 'Force delete enabled' };
    }

    const referenceDetails = this.formatReferenceDetails(referenceInfo.references);
    return {
      canDelete: false,
      details: `Cannot delete workflow: it is referenced by ${referenceInfo.references.length} other components.\n\nReferences:\n${referenceDetails}\n\nUse force=true to override, or check references first.`
    };
  }

  /**
   * 获取所有引用目标工作流的源工作流ID
   */
  getReferencingWorkflows(targetWorkflowId: string): string[] {
    const referencingWorkflows = new Set<string>();

    // 从引用关系中查找
    const relations = this.getReferenceRelations(targetWorkflowId);
    relations.forEach(relation => {
      referencingWorkflows.add(relation.sourceWorkflowId);
    });

    // 从父子关系中查找
    const parentId = this.workflowRegistry.getParentWorkflow(targetWorkflowId);
    if (parentId) {
      referencingWorkflows.add(parentId);
    }

    return Array.from(referencingWorkflows);
  }

  /**
   * 清理指定工作流的所有引用关系
   */
  cleanupWorkflowReferences(workflowId: string): void {
    // 清空该工作流的引用关系
    this.clearReferenceRelations(workflowId);

    // 从其他工作流的引用关系中移除对该工作流的引用
    for (const [targetId, relations] of this.referenceRelations.entries()) {
      const filteredRelations = relations.filter(
        relation => relation.sourceWorkflowId !== workflowId
      );
      if (filteredRelations.length === 0) {
        this.referenceRelations.delete(targetId);
      } else {
        this.referenceRelations.set(targetId, filteredRelations);
      }
    }
  }
}