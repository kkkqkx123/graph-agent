import { injectable } from 'inversify';
import {
  BaseTransformer,
  TransformerConfig,
  WorkflowExecutionContext,
} from './base-transformer';

/**
 * Sort转换函数
 * 对数组元素进行排序
 */
@injectable()
export class SortTransformer extends BaseTransformer<TransformerConfig> {
  constructor() {
    super(
      'transform:sort',
      'sort_transform',
      '对数组元素进行排序，支持升序和降序',
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
        description: '要排序的字段名',
      },
      {
        name: 'order',
        type: 'string',
        required: false,
        description: '排序顺序：asc（升序）或desc（降序）',
        defaultValue: 'asc',
      },
    ];
  }

  protected override validateCustomConfig(config: any): string[] {
    const errors: string[] = [];

    if (config.order && !['asc', 'desc'].includes(config.order)) {
      errors.push('order必须是asc或desc之一');
    }

    return errors;
  }

  override async execute(
    context: WorkflowExecutionContext,
    config: TransformerConfig
  ): Promise<any[]> {
    const { sourceData, config: transformConfig } = config;
    const { field, order = 'asc' } = transformConfig as Record<string, unknown>;

    if (!Array.isArray(sourceData)) {
      throw new Error('sourceData必须是数组类型');
    }

    return [...sourceData].sort((a: any, b: any) => {
      const aValue = field && typeof field === 'string' ? a[field] : a;
      const bValue = field && typeof field === 'string' ? b[field] : b;

      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return order === 'asc' ? aValue - bValue : bValue - aValue;
      }

      const aStr = String(aValue);
      const bStr = String(bValue);

      return order === 'asc' ? aStr.localeCompare(bStr) : bStr.localeCompare(aStr);
    });
  }
}
