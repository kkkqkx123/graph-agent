import { injectable } from 'inversify';
import { INodeFunction, WorkflowFunctionType } from '../../../../../domain/workflow/interfaces/workflow-functions';
import { BaseWorkflowFunction } from '../../base/base-workflow-function';

/**
 * 数据转换节点函数
 */
@injectable()
export class DataTransformNodeFunction extends BaseWorkflowFunction implements INodeFunction {
  constructor() {
    super(
      'node:data_transform',
      'data_transform_node',
      '执行数据转换的节点函数',
      '1.0.0',
      WorkflowFunctionType.NODE,
      false
    );
  }

  override getParameters() {
    return [
      ...super.getParameters(),
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
    ];
  }

  protected override validateCustomConfig(config: any): string[] {
    const errors: string[] = [];

    const validTransformTypes = ['map', 'filter', 'reduce', 'sort', 'group'];
    
    if (!config.transformType || typeof config.transformType !== 'string') {
      errors.push('transformType是必需的字符串参数');
    } else if (!validTransformTypes.includes(config.transformType)) {
      errors.push(`transformType必须是以下值之一: ${validTransformTypes.join(', ')}`);
    }

    if (!config.sourceData || typeof config.sourceData !== 'string') {
      errors.push('sourceData是必需的字符串参数');
    }

    if (!config.targetVariable || typeof config.targetVariable !== 'string') {
      errors.push('targetVariable是必需的字符串参数');
    }

    if (config.transformConfig && typeof config.transformConfig !== 'object') {
      errors.push('transformConfig必须是对象类型');
    }

    return errors;
  }

  async execute(context: any, config: any): Promise<any> {
    this.checkInitialized();

    const transformType = config.transformType;
    const sourceData = config.sourceData;
    const targetVariable = config.targetVariable;
    const transformConfig = config.transformConfig || {};

    // 获取源数据
    const data = context.getVariable(sourceData);
    if (data === undefined) {
      throw new Error(`源数据变量 ${sourceData} 不存在`);
    }

    if (!Array.isArray(data)) {
      throw new Error(`源数据变量 ${sourceData} 必须是数组`);
    }

    try {
      let result;

      switch (transformType) {
        case 'map':
          result = this.mapTransform(data, transformConfig);
          break;
        case 'filter':
          result = this.filterTransform(data, transformConfig);
          break;
        case 'reduce':
          result = this.reduceTransform(data, transformConfig);
          break;
        case 'sort':
          result = this.sortTransform(data, transformConfig);
          break;
        case 'group':
          result = this.groupTransform(data, transformConfig);
          break;
        default:
          throw new Error(`不支持的转换类型: ${transformType}`);
      }

      // 存储转换结果
      context.setVariable(targetVariable, result);

      // 记录转换操作
      const transformResult = {
        transformType: transformType,
        sourceData: sourceData,
        targetVariable: targetVariable,
        sourceCount: data.length,
        resultCount: Array.isArray(result) ? result.length : Object.keys(result).length,
        config: transformConfig,
        timestamp: new Date().toISOString()
      };

      // 存储转换结果信息
      context.setVariable(`transform_result_${context.getExecutionId()}`, transformResult);

      // 更新上下文中的转换历史
      const transformHistory = context.getVariable('transform_history') || [];
      transformHistory.push(transformResult);
      context.setVariable('transform_history', transformHistory);

      return transformResult;
    } catch (error) {
      // 记录错误
      const errors = context.getVariable('errors') || [];
      const errorMessage = error instanceof Error ? error.message : String(error);
      errors.push({
        type: 'data_transform_error',
        transformType: transformType,
        sourceData: sourceData,
        message: errorMessage,
        timestamp: new Date().toISOString()
      });
      context.setVariable('errors', errors);

      throw new Error(`数据转换失败: ${errorMessage}`);
    }
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
        // 简单的表达式求值
        // 在实际实现中应该使用更安全的表达式解析器
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
        // 使用表达式过滤
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