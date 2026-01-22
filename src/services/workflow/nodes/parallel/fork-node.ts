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
import {
  MarkerNode,
  BranchConfig,
} from '../../../../domain/workflow/value-objects/node/marker-node';

/**
 * Fork节点
 *
 * 标记并行分支的开始，触发ThreadFork服务创建子线程
 *
 * 核心功能：
 * - 标记fork点
 * - 存储分支信息到上下文
 * - 由ThreadExecution调用ThreadFork服务
 *
 * 注意：
 * - 不负责分支策略（由ThreadFork负责）
 * - 不负责并发控制（由ThreadFork负责）
 * - 不负责条件判断（由ConditionNode负责）
 * - 不负责创建分支上下文（由ThreadFork负责）
 * - 不负责调用ThreadFork服务（由ThreadExecution负责）
 */
export class ForkNode extends Node {
  private readonly marker: MarkerNode;

  constructor(
    id: NodeId,
    branches: BranchConfig[],
    name?: string,
    description?: string,
    position?: { x: number; y: number }
  ) {
    super(
      id,
      NodeType.fork(NodeContextTypeValue.ISOLATE),
      name || 'Fork',
      description || '并行分支节点',
      position
    );
    
    // 创建标记节点值对象
    this.marker = MarkerNode.fork(id, branches);
  }

  /**
   * 获取分支配置
   */
  get branches(): BranchConfig[] {
    return this.marker.getBranches();
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
      // ThreadExecution会读取这些信息并调用ThreadFork服务
      context.setVariable('marker_node', this.marker.toJSON());
      context.setVariable('fork_branches', this.branches);
      context.setVariable('fork_branch_count', this.branches.length);
      context.setVariable('fork_execution_id', context.getExecutionId());
      context.setVariable('fork_node_id', this.nodeId.toString());

      const executionTime = Date.now() - startTime;

      return {
        success: true,
        output: {
          message: `已标记${this.branches.length}个并行分支`,
          branches: this.branches.map(branch => ({
            branchId: branch.branchId,
            targetNodeId: branch.targetNodeId,
            name: branch.name,
          })),
          branchCount: this.branches.length,
        },
        executionTime,
        metadata: {
          nodeId: this.nodeId.toString(),
          nodeType: this.type.toString(),
          branchCount: this.branches.length,
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
    // 验证由MarkerNode在创建时完成
    return { valid: true, errors: [] };
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
          name: 'branches',
          type: 'array',
          required: true,
          description: '分支配置列表',
        },
      ],
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
        branches: { type: 'array', description: '分支列表' },
        branchCount: { type: 'number', description: '分支数量' },
      },
    };
  }

  protected createNodeFromProps(props: any): any {
    return new ForkNode(
      props.id,
      props.branches,
      props.name,
      props.description,
      props.position
    );
  }
}