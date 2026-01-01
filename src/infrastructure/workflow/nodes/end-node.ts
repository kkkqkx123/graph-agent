import { NodeId } from '../../../domain/workflow/value-objects/node/node-id';
import { NodeType, NodeTypeValue, NodeContextTypeValue } from '../../../domain/workflow/value-objects/node/node-type';
import { Node, NodeExecutionResult, NodeMetadata, ValidationResult, WorkflowExecutionContext } from '../../../domain/workflow/entities/node';

/**
 * 结束节点
 * 工作流的出口点，负责收集执行结果和清理资源
 */
export class EndNode extends Node {
  constructor(
    id: NodeId,
    public readonly collectResults: boolean = true,
    public readonly cleanupResources: boolean = true,
    public readonly returnVariables?: string[],
    name?: string,
    description?: string,
    position?: { x: number; y: number }
  ) {
    super(
      id,
      NodeType.end(NodeContextTypeValue.PASS_THROUGH),
      name || 'End',
      description || '工作流结束节点',
      position
    );
  }

  async execute(context: WorkflowExecutionContext): Promise<NodeExecutionResult> {
    const startTime = Date.now();

    try {
      // 记录工作流结束时间
      const endTime = new Date().toISOString();
      context.setVariable('workflow_end_time', endTime);

      // 更新执行统计
      const stats = context.getVariable('execution_stats') || {};
      stats.endTime = Date.now();
      stats.duration = stats.endTime - stats.startTime;
      context.setVariable('execution_stats', stats);

      // 收集执行结果
      const results: Record<string, unknown> = {};

      if (this.collectResults) {
        // 收集所有节点结果
        const allVariables = context.getAllVariables();
        for (const [key, value] of Object.entries(allVariables)) {
          // 收集以特定前缀开头的变量（如 node_result_、llm_response_、tool_result_）
          if (key.startsWith('node_result_') || key.startsWith('llm_response_') || key.startsWith('tool_result_')) {
            results[key] = value;
          }
        }

        // 如果指定了返回变量，只收集指定的变量
        if (this.returnVariables && this.returnVariables.length > 0) {
          const filteredResults: Record<string, unknown> = {};
          for (const varName of this.returnVariables) {
            if (allVariables[varName] !== undefined) {
              filteredResults[varName] = allVariables[varName];
            }
          }
          Object.assign(results, filteredResults);
        }
      }

      // 清理资源
      if (this.cleanupResources) {
        // 清理临时变量
        const allVariables = context.getAllVariables();
        for (const [key, value] of Object.entries(allVariables)) {
          if (key.startsWith('temp_') || key.startsWith('internal_')) {
            context.setVariable(key, undefined);
          }
        }
      }

      const executionTime = Date.now() - startTime;

      return {
        success: true,
        output: {
          message: '工作流已完成',
          endTime,
          duration: stats.duration || 0,
          results: this.collectResults ? results : undefined,
          stats: stats
        },
        executionTime,
        metadata: {
          nodeId: this.nodeId.toString(),
          nodeType: this.type.toString(),
          collectedResults: Object.keys(results),
          duration: stats.duration || 0
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

  validate(): ValidationResult {
    const errors: string[] = [];

    if (typeof this.collectResults !== 'boolean') {
      errors.push('collectResults必须是布尔类型');
    }

    if (typeof this.cleanupResources !== 'boolean') {
      errors.push('cleanupResources必须是布尔类型');
    }

    if (this.returnVariables && !Array.isArray(this.returnVariables)) {
      errors.push('returnVariables必须是数组类型');
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
          name: 'collectResults',
          type: 'boolean',
          required: false,
          description: '是否收集执行结果',
          defaultValue: true
        },
        {
          name: 'cleanupResources',
          type: 'boolean',
          required: false,
          description: '是否清理临时资源',
          defaultValue: true
        },
        {
          name: 'returnVariables',
          type: 'array',
          required: false,
          description: '要返回的变量名称列表',
          defaultValue: []
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
        message: { type: 'string', description: '结束消息' },
        endTime: { type: 'string', description: '结束时间' },
        duration: { type: 'number', description: '执行时长（毫秒）' },
        results: { type: 'object', description: '执行结果集合' },
        stats: { type: 'object', description: '执行统计信息' }
      }
    };
  }
}