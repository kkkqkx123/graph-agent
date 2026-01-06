import { NodeId } from '../../../../domain/workflow/value-objects/node/node-id';
import {
  NodeType,
  NodeTypeValue,
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
  /** 分支条件（可选） */
  condition?: string;
  /** 分支权重（用于优先级） */
  weight?: number;
}

/**
 * Fork节点
 * 将执行流拆分为多个并行分支
 */
export class ForkNode extends Node {
  constructor(
    id: NodeId,
    public readonly branches: BranchConfig[],
    public readonly branchStrategy: 'all' | 'conditional' | 'weighted' = 'all',
    public readonly maxConcurrency: number = 5,
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
      // 根据分支策略确定要执行的分支
      let activeBranches: BranchConfig[] = [];

      switch (this.branchStrategy) {
        case 'all':
          // 执行所有分支
          activeBranches = [...this.branches];
          break;

        case 'conditional':
          // 只执行满足条件的分支
          activeBranches = this.branches.filter(branch => {
            if (!branch.condition) return true;
            return this.evaluateCondition(branch.condition, context);
          });
          break;

        case 'weighted':
          // 根据权重选择分支
          activeBranches = this.selectWeightedBranches();
          break;
      }

      if (activeBranches.length === 0) {
        return {
          success: true,
          output: {
            message: '没有可执行的分支',
            branches: [],
          },
          executionTime: Date.now() - startTime,
          metadata: {
            nodeId: this.nodeId.toString(),
            nodeType: this.type.toString(),
            branchCount: 0,
          },
        };
      }

      // 限制并发数量
      const limitedBranches = activeBranches.slice(0, this.maxConcurrency);

      // 创建分支上下文
      const branchContexts = limitedBranches.map(branch => {
        const branchContext = this.createBranchContext(context, branch);
        return {
          branchId: branch.branchId,
          targetNodeId: branch.targetNodeId,
          context: branchContext,
        };
      });

      // 存储分支信息到上下文
      context.setVariable('fork_branches', branchContexts);
      context.setVariable('fork_branch_count', branchContexts.length);
      context.setVariable('fork_execution_id', context.getExecutionId());

      const executionTime = Date.now() - startTime;

      return {
        success: true,
        output: {
          message: `已创建 ${branchContexts.length} 个并行分支`,
          branches: branchContexts.map(bc => ({
            branchId: bc.branchId,
            targetNodeId: bc.targetNodeId,
          })),
          branchCount: branchContexts.length,
        },
        executionTime,
        metadata: {
          nodeId: this.nodeId.toString(),
          nodeType: this.type.toString(),
          branchCount: branchContexts.length,
          maxConcurrency: this.maxConcurrency,
          branchStrategy: this.branchStrategy,
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

  /**
   * 创建分支上下文
   * @param context 原始上下文
   * @param branch 分支配置
   * @returns 分支上下文
   */
  private createBranchContext(
    context: WorkflowExecutionContext,
    branch: BranchConfig
  ): Record<string, unknown> {
    const branchContext: Record<string, unknown> = {
      branchId: branch.branchId,
      branchName: branch.name || branch.branchId,
      parentExecutionId: context.getExecutionId(),
      parentWorkflowId: context.getWorkflowId(),
    };

    // 复制父上下文的变量
    try {
      const commonKeys = ['messages', 'errors', 'tool_calls'];
      for (const key of commonKeys) {
        try {
          const value = context.getVariable(key);
          if (value !== undefined) {
            branchContext[key] = JSON.parse(JSON.stringify(value)); // 深拷贝
          }
        } catch {
          // 忽略复制错误
        }
      }
    } catch {
      // 忽略复制错误
    }

    return branchContext;
  }

  /**
   * 评估条件
   * @param condition 条件表达式
   * @param context 执行上下文
   * @returns 评估结果
   */
  private evaluateCondition(condition: string, context: WorkflowExecutionContext): boolean {
    try {
      // 简单的条件评估逻辑
      const variables: Record<string, unknown> = {
        executionId: context.getExecutionId(),
        workflowId: context.getWorkflowId(),
      };

      // 替换变量引用
      let expression = condition;
      expression = expression.replace(/\$\{([^}]+)\}/g, (match, varName) => {
        const value = variables[varName];
        if (typeof value === 'string') {
          return `'${value}'`;
        }
        return String(value);
      });

      // 安全检查
      const hasUnsafeContent = /eval|function|new|delete|typeof|void|in|instanceof/.test(
        expression
      );
      if (hasUnsafeContent) {
        return false;
      }

      const func = new Function('return ' + expression);
      return Boolean(func());
    } catch {
      return false;
    }
  }

  /**
   * 根据权重选择分支
   * @returns 选中的分支列表
   */
  private selectWeightedBranches(): BranchConfig[] {
    // 简单实现：选择权重最高的分支
    const sortedBranches = [...this.branches].sort((a, b) => {
      const weightA = a.weight || 0;
      const weightB = b.weight || 0;
      return weightB - weightA;
    });

    // 返回权重最高的分支（可以扩展为返回多个）
    return sortedBranches.slice(0, 1);
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

    if (!['all', 'conditional', 'weighted'].includes(this.branchStrategy)) {
      errors.push('branchStrategy必须是all、conditional或weighted之一');
    }

    if (typeof this.maxConcurrency !== 'number' || this.maxConcurrency <= 0) {
      errors.push('maxConcurrency必须是正数');
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
        {
          name: 'branchStrategy',
          type: 'string',
          required: false,
          description: '分支策略：all（全部）、conditional（条件）、weighted（权重）',
          defaultValue: 'all',
        },
        {
          name: 'maxConcurrency',
          type: 'number',
          required: false,
          description: '最大并发数',
          defaultValue: 5,
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
        branches: { type: 'array', description: '创建的分支列表' },
        branchCount: { type: 'number', description: '分支数量' },
      },
    };
  }

  protected createNodeFromProps(props: any): any {
    return new ForkNode(
      props.id,
      props.branches,
      props.branchStrategy,
      props.maxConcurrency,
      props.name,
      props.description,
      props.position
    );
  }
}
