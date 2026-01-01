import { NodeId } from '../../../domain/workflow/value-objects/node/node-id';
import { NodeType, NodeTypeValue, NodeContextTypeValue } from '../../../domain/workflow/value-objects/node/node-type';
import { Node, NodeExecutionResult, NodeMetadata, ValidationResult, WorkflowExecutionContext } from '../../../domain/workflow/entities/node';
import { TransformStrategyFactory } from './strategies/data-transformer/transform-strategy-factory';

/**
 * 数据转换节点
 * 执行数据转换操作，支持map、filter、reduce、sort、group等转换类型
 * 使用策略模式将不同的转换逻辑分离到独立的策略类中
 */
export class DataTransformNode extends Node {
  private strategy: any;

  constructor(
    id: NodeId,
    public readonly transformType: 'map' | 'filter' | 'reduce' | 'sort' | 'group',
    public readonly sourceData: string,
    public readonly targetVariable: string,
    public readonly transformConfig: Record<string, unknown> = {},
    name?: string,
    description?: string,
    position?: { x: number; y: number }
  ) {
    super(
      id,
      NodeType.task(NodeContextTypeValue.TRANSFORM),
      name,
      description,
      position
    );

    // 创建转换策略实例
    this.strategy = TransformStrategyFactory.create(this.transformType);
  }

  async execute(context: WorkflowExecutionContext): Promise<NodeExecutionResult> {
    // 获取源数据
    const data = context.getVariable(this.sourceData);
    if (data === undefined) {
      return {
        success: false,
        error: `源数据变量 ${this.sourceData} 不存在`,
        metadata: {
          transformType: this.transformType,
          sourceData: this.sourceData
        }
      };
    }

    if (!Array.isArray(data)) {
      return {
        success: false,
        error: `源数据变量 ${this.sourceData} 必须是数组`,
        metadata: {
          transformType: this.transformType,
          sourceData: this.sourceData
        }
      };
    }

    try {
      // 使用策略执行转换
      const result = this.strategy.transform(data, this.transformConfig);

      // 存储转换结果
      context.setVariable(this.targetVariable, result);

      // 记录转换操作
      const transformResult = {
        transformType: this.transformType,
        sourceData: this.sourceData,
        targetVariable: this.targetVariable,
        sourceCount: data.length,
        resultCount: Array.isArray(result) ? result.length : Object.keys(result).length,
        config: this.transformConfig,
        timestamp: new Date().toISOString()
      };

      // 存储转换结果信息
      context.setVariable(`transform_result_${context.getExecutionId()}`, transformResult);

      // 更新上下文中的转换历史
      const transformHistory = context.getVariable('transform_history') || [];
      transformHistory.push(transformResult);
      context.setVariable('transform_history', transformHistory);

      return {
        success: true,
        output: transformResult,
        executionTime: 0,
        metadata: {
          transformType: this.transformType,
          sourceData: this.sourceData,
          targetVariable: this.targetVariable,
          sourceCount: data.length,
          resultCount: Array.isArray(result) ? result.length : Object.keys(result).length
        }
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      // 记录错误
      const errors = context.getVariable('errors') || [];
      errors.push({
        type: 'data_transform_error',
        transformType: this.transformType,
        sourceData: this.sourceData,
        message: errorMessage,
        timestamp: new Date().toISOString()
      });
      context.setVariable('errors', errors);

      return {
        success: false,
        error: errorMessage,
        executionTime: 0,
        metadata: {
          transformType: this.transformType,
          sourceData: this.sourceData
        }
      };
    }
  }

  validate(): ValidationResult {
    const errors: string[] = [];

    // 验证transformType
    if (!this.transformType || typeof this.transformType !== 'string') {
      errors.push('transformType是必需的字符串参数');
    } else if (!TransformStrategyFactory.isSupported(this.transformType)) {
      errors.push(`transformType必须是以下值之一: ${TransformStrategyFactory.getSupportedTypes().join(', ')}`);
    }

    // 验证sourceData
    if (!this.sourceData || typeof this.sourceData !== 'string') {
      errors.push('sourceData是必需的字符串参数');
    }

    // 验证targetVariable
    if (!this.targetVariable || typeof this.targetVariable !== 'string') {
      errors.push('targetVariable是必需的字符串参数');
    }

    // 验证transformConfig
    if (this.transformConfig && typeof this.transformConfig !== 'object') {
      errors.push('transformConfig必须是对象类型');
    }

    // 使用策略验证配置
    if (errors.length === 0) {
      const strategyValidation = this.strategy.validate(this.transformConfig);
      if (!strategyValidation.valid) {
        errors.push(...strategyValidation.errors);
      }
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
          name: 'transformType',
          type: 'string',
          required: true,
          description: '转换类型：map, filter, reduce, sort, group'
        },
        {
          name: 'sourceData',
          type: 'string',
          required: true,
          description: '源数据变量名'
        },
        {
          name: 'targetVariable',
          type: 'string',
          required: true,
          description: '目标变量名'
        },
        {
          name: 'transformConfig',
          type: 'object',
          required: false,
          description: '转换配置',
          defaultValue: {}
        }
      ]
    };
  }

  getInputSchema(): Record<string, any> {
    return {
      type: 'object',
      properties: {
        input: { type: 'any', description: '任务输入' }
      },
      required: ['input']
    };
  }

  getOutputSchema(): Record<string, any> {
    return {
      type: 'object',
      properties: {
        output: { type: 'any', description: '任务输出' }
      }
    };
  }

}