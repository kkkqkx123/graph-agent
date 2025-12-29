import { NodeId } from '../../../domain/workflow/value-objects/node/node-id';
import { NodeType, NodeTypeValue, NodeContextTypeValue } from '../../../domain/workflow/value-objects/node/node-type';
import { Node, NodeExecutionResult, NodeMetadata, ValidationResult, WorkflowExecutionContext } from './node';

/**
 * 数据转换节点
 * 执行数据转换操作，支持map、filter、reduce、sort、group等转换类型
 */
export class DataTransformNode extends Node {
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
      let result;

      switch (this.transformType) {
        case 'map':
          result = this.mapTransform(data, this.transformConfig);
          break;
        case 'filter':
          result = this.filterTransform(data, this.transformConfig);
          break;
        case 'reduce':
          result = this.reduceTransform(data, this.transformConfig);
          break;
        case 'sort':
          result = this.sortTransform(data, this.transformConfig);
          break;
        case 'group':
          result = this.groupTransform(data, this.transformConfig);
          break;
        default:
          return {
            success: false,
            error: `不支持的转换类型: ${this.transformType}`,
            metadata: {
              transformType: this.transformType,
              sourceData: this.sourceData
            }
          };
      }

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
        metadata: {
          transformType: this.transformType,
          sourceData: this.sourceData
        }
      };
    }
  }

  validate(): ValidationResult {
    const errors: string[] = [];
    const validTransformTypes = ['map', 'filter', 'reduce', 'sort', 'group'];

    if (!this.transformType || typeof this.transformType !== 'string') {
      errors.push('transformType是必需的字符串参数');
    } else if (!validTransformTypes.includes(this.transformType)) {
      errors.push(`transformType必须是以下值之一: ${validTransformTypes.join(', ')}`);
    }

    if (!this.sourceData || typeof this.sourceData !== 'string') {
      errors.push('sourceData是必需的字符串参数');
    }

    if (!this.targetVariable || typeof this.targetVariable !== 'string') {
      errors.push('targetVariable是必需的字符串参数');
    }

    if (this.transformConfig && typeof this.transformConfig !== 'object') {
      errors.push('transformConfig必须是对象类型');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  getMetadata(): NodeMetadata {
    return {
      id: this.id.toString(),
      type: this.type.toString(),
      name: this.name,
      description: this.description,
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

  private mapTransform(data: any[], config: any): any[] {
    const { field, expression } = config;

    if (!field && !expression) {
      throw new Error('map转换需要指定field或expression参数');
    }

    return data.map(item => {
      if (field) {
        return item[field];
      }

      if (expression) {
        try {
          const func = new Function('item', `return ${expression}`);
          return func(item);
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          throw new Error(`表达式求值失败: ${errorMessage}`);
        }
      }

      return item;
    });
  }

  private filterTransform(data: any[], config: any): any[] {
    const { field, value, operator = '===', expression } = config;

    return data.filter(item => {
      if (expression) {
        try {
          const func = new Function('item', `return ${expression}`);
          return func(item);
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          throw new Error(`表达式求值失败: ${errorMessage}`);
        }
      }

      if (field !== undefined) {
        const itemValue = item[field];

        switch (operator) {
          case '===':
            return itemValue === value;
          case '!==':
            return itemValue !== value;
          case '>':
            return itemValue > value;
          case '<':
            return itemValue < value;
          case '>=':
            return itemValue >= value;
          case '<=':
            return itemValue <= value;
          case 'contains':
            return String(itemValue).includes(value);
          case 'startsWith':
            return String(itemValue).startsWith(value);
          case 'endsWith':
            return String(itemValue).endsWith(value);
          default:
            return itemValue === value;
        }
      }

      return true;
    });
  }

  private reduceTransform(data: any[], config: any): any {
    const { field, initialValue = 0, operation = 'sum' } = config;

    return data.reduce((acc, item) => {
      const value = field ? item[field] : item;

      switch (operation) {
        case 'sum':
          return acc + (Number(value) || 0);
        case 'multiply':
          return acc * (Number(value) || 1);
        case 'max':
          return Math.max(acc, Number(value) || acc);
        case 'min':
          return Math.min(acc, Number(value) || acc);
        case 'concat':
          return acc + String(value);
        case 'merge':
          return { ...acc, ...value };
        default:
          return acc + value;
      }
    }, initialValue);
  }

  private sortTransform(data: any[], config: any): any[] {
    const { field, order = 'asc' } = config;

    return [...data].sort((a, b) => {
      const aValue = field ? a[field] : a;
      const bValue = field ? b[field] : b;

      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return order === 'asc' ? aValue - bValue : bValue - aValue;
      }

      const aStr = String(aValue);
      const bStr = String(bValue);

      return order === 'asc'
        ? aStr.localeCompare(bStr)
        : bStr.localeCompare(aStr);
    });
  }

  private groupTransform(data: any[], config: any): any {
    const { field } = config;

    if (!field) {
      throw new Error('group转换需要指定field参数');
    }

    return data.reduce((groups, item) => {
      const key = item[field];
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(item);
      return groups;
    }, {});
  }
}