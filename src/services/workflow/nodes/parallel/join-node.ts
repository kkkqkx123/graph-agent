import { NodeId } from '../../../../domain/workflow/value-objects/node/node-id';
import {
  NodeType,
  NodeContextTypeValue,
} from '../../../../domain/workflow/value-objects/node/node-type';
import {
  Node,
  NodeExecutionResult,
  NodeMetadata,
  ValidationResult,
  WorkflowExecutionContext,
} from '../../../../domain/workflow/entities/node';
import { MarkerNode } from '../../../../domain/workflow/value-objects/node/marker-node';

/**
 * Join节点
 *
 * 标记并行分支的结束，由ThreadExecution调用ThreadJoin服务等待子线程完成
 *
 * 核心功能：
 * - 标记join点
 * - 存储标记信息到上下文
 * - 由ThreadExecution调用ThreadJoin服务
 *
 * 注意：
 * - 不负责合并策略（由ThreadJoin负责）
 * - 不负责超时控制（由ThreadJoin负责）
 * - 不负责结果合并（由ThreadJoin负责）
 * - 不负责检查合并条件（由ThreadJoin负责）
 * - 不负责调用ThreadJoin服务（由ThreadExecution负责）
 */
export class JoinNode extends Node {
  private readonly marker: MarkerNode;

  constructor(
    id: NodeId,
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
    
    // 创建标记节点值对象
    this.marker = MarkerNode.join(id);
  }

  /**
   * 获取标记节点
   */
  getMarker(): MarkerNode {
    return this.marker;
  }

  async execute(context: WorkflowExecutionContext): Promise<NodeExecutionResult> {
    const startTime = Date.now();

    try {
      // 存储标记信息到上下文
      // ThreadExecution会读取这些信息并调用ThreadJoin服务
      context.setVariable('marker_node', this.marker.toJSON());
      context.setVariable('join_node_id', this.nodeId.toString());

      // 获取分支信息（由ThreadExecution的ThreadJoin服务填充）
      const forkBranches = context.getVariable('fork_branches') || [];
      const forkBranchCount = context.getVariable('fork_branch_count') || 0;

      if (!forkBranches || forkBranches.length === 0) {
        return {
          success: true,
          output: {
            message: '没有需要等待的分支',
            branchResults: [],
          },
          executionTime: Date.now() - startTime,
          metadata: {
            nodeId: this.nodeId.toString(),
            nodeType: this.type.toString(),
            branchCount: 0,
          },
        };
      }

      // 获取分支结果（由ThreadJoin服务收集）
      const branchResults: any[] = [];
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
            executionTime: branchResult?.executionTime,
          });
        } else {
          // 分支未完成
          branchResults.push({
            branchId,
            targetNodeId: branch.targetNodeId,
            success: false,
            error: 'Branch not completed',
          });
        }
      }

      // 检查是否所有分支都已完成
      const allCompleted = branchResults.every(br => br.success);

      if (!allCompleted) {
        return {
          success: true,
          output: {
            message: '等待更多分支完成',
            branchResults,
            completedCount: branchResults.filter(br => br.success).length,
            totalBranches: forkBranchCount,
          },
          executionTime: Date.now() - startTime,
          metadata: {
            nodeId: this.nodeId.toString(),
            nodeType: this.type.toString(),
            branchCount: branchResults.length,
            completedCount: branchResults.filter(br => br.success).length,
            totalBranches: forkBranchCount,
            waiting: true,
          },
        };
      }

      // 清理分支相关变量
      context.setVariable('fork_branches', undefined);
      context.setVariable('fork_branch_count', undefined);
      context.setVariable('fork_execution_id', undefined);
      context.setVariable('fork_node_id', undefined);
      context.setVariable('completed_branches', undefined);

      // 清理分支结果变量
      for (const branch of forkBranches) {
        context.setVariable(`branch_result_${branch.branchId}`, undefined);
      }

      const executionTime = Date.now() - startTime;

      return {
        success: true,
        output: {
          message: '所有分支已完成',
          branchResults,
          completedCount: branchResults.length,
          totalBranches: forkBranchCount,
        },
        executionTime,
        metadata: {
          nodeId: this.nodeId.toString(),
          nodeType: this.type.toString(),
          branchCount: branchResults.length,
          completedCount: branchResults.length,
          totalBranches: forkBranchCount,
        },
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
          nodeType: this.type.toString(),
        },
      };
    }
  }

  validate(): ValidationResult {
    // Join节点不需要验证
    return { valid: true, errors: [] };
  }

  getMetadata(): NodeMetadata {
    return {
      id: this.nodeId.toString(),
      type: this.type.toString(),
      name: this.name,
      description: this.description,
      status: this.status.toString(),
      parameters: [],
    };
  }

  getInputSchema(): Record<string, any> {
    return {
      type: 'object',
      properties: {},
      required: [],
    };
  }

  getOutputSchema(): Record<string, any> {
    return {
      type: 'object',
      properties: {
        message: { type: 'string', description: '执行消息' },
        branchResults: { type: 'array', description: '分支结果列表' },
        completedCount: { type: 'number', description: '已完成分支数' },
        totalBranches: { type: 'number', description: '总分支数' },
      },
    };
  }

  protected createNodeFromProps(props: any): any {
    return new JoinNode(
      props.id,
      props.name,
      props.description,
      props.position
    );
  }
}