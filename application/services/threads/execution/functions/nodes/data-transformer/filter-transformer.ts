import { injectable } from 'inversify';
import {
  BaseTransformer,
  TransformerConfig,
  WorkflowExecutionContext,
} from './base-transformer';

/**
 * Filter转换函数
 * 根据条件过滤数组元素
 */
@injectable()
export class FilterTransformer extends BaseTransformer<TransformerConfig> {
  constructor() {
    super(
      'transform:filter',
      'filter_transform',
      '根据条件过滤数组元素，支持字段比较和表达式求值',
      '1.0.0',
      'transform'
    );
  }

  override getParameters() {
    return [
      ...super.getParameters(),
      {
        name: 'field',
        type: 'string',
        required: false,
        description: '要比较的字段名',
      },
      {
        name: 'value',
        type: 'any',
        required: false,
        description: '比较值',
      },
      {
        name: 'operator',
        type: 'string',
        required: false,
        description: '比较操作符：===, !==, >, <, >=, <=, contains, startsWith, endsWith',
        defaultValue: '===',
      },
      {
        name: 'expression',
        type: 'string',
        required: false,
        description: '过滤表达式（JavaScript表达式）',
      },
    ];
  }

  override async execute(
    context: WorkflowExecutionContext,
    config: TransformerConfig
  ): Promise<any[]> {
    const { sourceData, config: transformConfig } = config;
    const {
      field,
      value,
      operator = '===',
      expression,
    } = transformConfig as Record<string, unknown>;

    if (!Array.isArray(sourceData)) {
      throw new Error('sourceData必须是数组类型');
    }

    return sourceData.filter((item: any) => {
      if (expression) {
        try {
          const func = new Function('item', `return ${expression}`);
          return func(item);
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          throw new Error(`表达式求值失败: ${errorMessage}`);
        }
      }

      if (field !== undefined && typeof field === 'string') {
        const itemValue = item[field];

        switch (operator) {
          case '===':
            return itemValue === value;
          case '!==':
            return itemValue !== value;
          case '>':
            return itemValue > (value as any);
          case '<':
            return itemValue < (value as any);
          case '>=':
            return itemValue >= (value as any);
          case '<=':
            return itemValue <= (value as any);
          case 'contains':
            return String(itemValue).includes(String(value));
          case 'startsWith':
            return String(itemValue).startsWith(String(value));
          case 'endsWith':
            return String(itemValue).endsWith(String(value));
          default:
            return itemValue === value;
        }
      }

      return true;
    });
  }
}
