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

/**
 * 分支配置接口
 */
export interface BranchConfig {
  /** 分支ID */
  branchId: string;
  /** 目标节点ID */
  targetNodeId: string;
  /** 分支名称 */
  name?: string;
  /** 分支条件（可选，由ConditionNode处理） */
  condition?: string;
  /** 分支权重（可选，由ThreadFork处理） */
  weight?: number;
}

/**
 * Fork节点
 * 
 * 标记并行分支的开始，触发ThreadFork服务创建子线程
 * 
 * 核心功能：
 * - 标记fork点
 * - 触发ThreadFork服务
 * - 存储分支信息到上下文
 * 
 * 注意：
 * - 不负责分支策略（由ThreadFork负责）
 * - 不负责并发控制（由ThreadFork负责）
 * - 不负责条件判断（由ConditionNode负责）
 * - 不负责创建分支上下文（由ThreadFork负责）
 */
export class ForkNode extends Node {
  constructor(
    id: NodeId,
    public readonly branches: BranchConfig[],
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
  }

  async execute(context: WorkflowExecutionContext): Promise<NodeExecutionResult> {
    const startTime = Date.now();

    try {
      // 验证分支配置
      if (!Array.isArray(this.branches) || this.branches.length === 0) {
        return {
          success: false,
          error: 'branches必须是非空数组',
          executionTime: Date.now() - startTime,
          metadata: {
            nodeId: this.nodeId.toString(),
            nodeType: this.type.toString(),
          },
        };
      }

      // 存储分支信息到上下文
      // ThreadFork服务会读取这些信息并创建子线程
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
    const errors: string[] = [];

    if (!Array.isArray(this.branches) || this.branches.length === 0) {
      errors.push('branches必须是非空数组');
    } else {
      this.branches.forEach((branch, index) => {
        if (!branch.branchId || typeof branch.branchId !== 'string') {
          errors.push(`分支[${index}]缺少branchId`);
        }
        if (!branch.targetNodeId || typeof branch.targetNodeId !== 'string') {
          errors.push(`分支[${index}]缺少targetNodeId`);
        }
      });
    }

    return {
      valid: errors.length === 0,
      errors,
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