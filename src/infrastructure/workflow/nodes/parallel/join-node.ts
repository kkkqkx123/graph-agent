import { NodeId } from '../../../../domain/workflow/value-objects/node/node-id';
import { NodeType, NodeTypeValue, NodeContextTypeValue } from '../../../../domain/workflow/value-objects/node/node-type';
import { Node, NodeExecutionResult, NodeMetadata, ValidationResult, WorkflowExecutionContext } from '../../../../domain/workflow/entities/node';

/**
 * 合并策略枚举
 */
export enum JoinStrategy {
  /** 所有分支都完成 */
  ALL = 'all',
  /** 任意一个分支完成 */
  ANY = 'any',
  /** 多数分支完成 */
  MAJORITY = 'majority',
  /** 指定数量的分支完成 */
  COUNT = 'count'
}

/**
 * 分支结果接口
 */
export interface BranchResult {
  /** 分支ID */
  branchId: string;
  /** 目标节点ID */
  targetNodeId: string;
  /** 是否成功 */
  success: boolean;
  /** 执行结果 */
  result?: any;
  /** 错误信息 */
  error?: string;
  /** 执行时间（毫秒） */
  executionTime?: number;
}

/**
 * Join节点
 * 等待所有并行分支完成并合并结果
 */
export class JoinNode extends Node {
  constructor(
    id: NodeId,
    public readonly joinStrategy: JoinStrategy = JoinStrategy.ALL,
    public readonly requiredCount?: number,
    public readonly timeout: number = 300000, // 默认5分钟超时
    public readonly mergeResults: boolean = true,
    name?: string,
    description?: string,
    position?: { x: number; y: number }
  ) {
    super(
      id,
      NodeType.join(NodeContextTypeValue.PASS_THROUGH),
      name || 'Join',
      description || '并行分支合并节点',
      position
    );
  }

  async execute(context: WorkflowExecutionContext): Promise<NodeExecutionResult> {
    const startTime = Date.now();

    try {
      // 获取分支信息
      const forkBranches = context.getVariable('fork_branches') || [];
      const forkBranchCount = context.getVariable('fork_branch_count') || 0;
      const forkExecutionId = context.getVariable('fork_execution_id');

      if (!forkBranches || forkBranches.length === 0) {
        return {
          success: true,
          output: {
            message: '没有需要等待的分支',
            branchResults: []
          },
          executionTime: Date.now() - startTime,
          metadata: {
            nodeId: this.nodeId.toString(),
            nodeType: this.type.toString(),
            branchCount: 0
          }
        };
      }

      // 收集分支结果
      const branchResults: BranchResult[] = [];
      const completedBranches: string[] = context.getVariable('completed_branches') || [];

      for (const branch of forkBranches) {
        const branchId = branch.branchId;
        const isCompleted = completedBranches.includes(branchId);

        if (isCompleted) {
          // 获取分支结果
          const branchResult = context.getVariable(`branch_result_${branchId}`);
          branchResults.push({
            branchId,
            targetNodeId: branch.targetNodeId,
            success: branchResult?.success || false,
            result: branchResult?.output,
            error: branchResult?.error,
            executionTime: branchResult?.executionTime
          });
        } else {
          // 分支未完成
          branchResults.push({
            branchId,
            targetNodeId: branch.targetNodeId,
            success: false,
            error: 'Branch not completed'
          });
        }
      }

      // 检查是否满足合并条件
      const canJoin = this.checkJoinCondition(branchResults, forkBranchCount);

      if (!canJoin.canJoin) {
        return {
          success: true,
          output: {
            message: '等待更多分支完成',
            branchResults,
            completedCount: canJoin.completedCount,
            requiredCount: canJoin.requiredCount
          },
          executionTime: Date.now() - startTime,
          metadata: {
            nodeId: this.nodeId.toString(),
            nodeType: this.type.toString(),
            branchCount: branchResults.length,
            completedCount: canJoin.completedCount,
            requiredCount: canJoin.requiredCount,
            waiting: true
          }
        };
      }

      // 合并分支结果
      let mergedResults: Record<string, unknown> = {};

      if (this.mergeResults) {
        mergedResults = this.mergeBranchResults(branchResults);
      }

      // 清理分支相关变量
      context.setVariable('fork_branches', undefined);
      context.setVariable('fork_branch_count', undefined);
      context.setVariable('fork_execution_id', undefined);
      context.setVariable('completed_branches', undefined);

      // 清理分支结果变量
      for (const branch of forkBranches) {
        context.setVariable(`branch_result_${branch.branchId}`, undefined);
      }

      const executionTime = Date.now() - startTime;

      return {
        success: true,
        output: {
          message: '所有分支已完成并合并',
          branchResults,
          mergedResults: this.mergeResults ? mergedResults : undefined,
          completedCount: canJoin.completedCount,
          totalBranches: forkBranchCount
        },
        executionTime,
        metadata: {
          nodeId: this.nodeId.toString(),
          nodeType: this.type.toString(),
          branchCount: branchResults.length,
          completedCount: canJoin.completedCount,
          totalBranches: forkBranchCount,
          joinStrategy: this.joinStrategy
        }
      };
    } catch (error) {
      const executionTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);

      return {
        success: false,
        error: errorMessage,
        executionTime,
        metadata: {
          nodeId: this.nodeId.toString(),
          nodeType: this.type.toString()
        }
      };
    }
  }

  /**
   * 检查是否满足合并条件
   * @param branchResults 分支结果列表
   * @param totalBranches 总分支数
   * @returns 是否可以合并
   */
  private checkJoinCondition(
    branchResults: BranchResult[],
    totalBranches: number
  ): { canJoin: boolean; completedCount: number; requiredCount: number } {
    const completedBranches = branchResults.filter(br => br.success);
    const completedCount = completedBranches.length;

    let requiredCount = 0;

    switch (this.joinStrategy) {
      case JoinStrategy.ALL:
        requiredCount = totalBranches;
        break;

      case JoinStrategy.ANY:
        requiredCount = 1;
        break;

      case JoinStrategy.MAJORITY:
        requiredCount = Math.ceil(totalBranches / 2);
        break;

      case JoinStrategy.COUNT:
        requiredCount = this.requiredCount || 1;
        break;
    }

    return {
      canJoin: completedCount >= requiredCount,
      completedCount,
      requiredCount
    };
  }

  /**
   * 合并分支结果
   * @param branchResults 分支结果列表
   * @returns 合并后的结果
   */
  private mergeBranchResults(branchResults: BranchResult[]): Record<string, unknown> {
    const merged: Record<string, unknown> = {
      success: true,
      branchCount: branchResults.length,
      successCount: branchResults.filter(br => br.success).length,
      failureCount: branchResults.filter(br => !br.success).length
    };

    // 合并所有分支的结果
    const results: Record<string, unknown> = {};
    for (const branchResult of branchResults) {
      if (branchResult.success && branchResult.result) {
        results[branchResult.branchId] = branchResult.result;
      }
    }
    merged['results'] = results;

    // 收集所有错误
    const errors: string[] = [];
    for (const branchResult of branchResults) {
      if (!branchResult.success && branchResult.error) {
        errors.push(`[${branchResult.branchId}] ${branchResult.error}`);
      }
    }
    if (errors.length > 0) {
      merged['errors'] = errors;
    }

    return merged;
  }

  validate(): ValidationResult {
    const errors: string[] = [];

    if (!Object.values(JoinStrategy).includes(this.joinStrategy)) {
      errors.push('joinStrategy必须是有效的JoinStrategy值');
    }

    if (this.joinStrategy === JoinStrategy.COUNT) {
      if (this.requiredCount === undefined || this.requiredCount <= 0) {
        errors.push('COUNT策略需要指定有效的requiredCount');
      }
    }

    if (typeof this.timeout !== 'number' || this.timeout <= 0) {
      errors.push('timeout必须是正数');
    }

    if (typeof this.mergeResults !== 'boolean') {
      errors.push('mergeResults必须是布尔类型');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  getMetadata(): NodeMetadata {
    return {
      id: this.nodeId.toString(),
      type: this.type.toString(),
      name: this.name,
      description: this.description,
      status: this.status.toString(),
      parameters: [
        {
          name: 'joinStrategy',
          type: 'string',
          required: false,
          description: '合并策略：all（全部）、any（任意）、majority（多数）、count（指定数量）',
          defaultValue: 'all'
        },
        {
          name: 'requiredCount',
          type: 'number',
          required: false,
          description: 'COUNT策略下需要的完成分支数'
        },
        {
          name: 'timeout',
          type: 'number',
          required: false,
          description: '超时时间（毫秒）',
          defaultValue: 300000
        },
        {
          name: 'mergeResults',
          type: 'boolean',
          required: false,
          description: '是否合并分支结果',
          defaultValue: true
        }
      ]
    };
  }

  getInputSchema(): Record<string, any> {
    return {
      type: 'object',
      properties: {},
      required: []
    };
  }

  getOutputSchema(): Record<string, any> {
    return {
      type: 'object',
      properties: {
        message: { type: 'string', description: '执行消息' },
        branchResults: { type: 'array', description: '分支结果列表' },
        mergedResults: { type: 'object', description: '合并后的结果' },
        completedCount: { type: 'number', description: '已完成分支数' },
        totalBranches: { type: 'number', description: '总分支数' }
      }
    };
  }

  protected createNodeFromProps(props: any): any {
    return new JoinNode(
      props.id,
      props.joinStrategy,
      props.requiredCount,
      props.timeout,
      props.mergeResults,
      props.name,
      props.description,
      props.position
    );
  }
}