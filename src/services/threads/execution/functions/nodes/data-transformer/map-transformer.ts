import { injectable } from 'inversify';
import {
  BaseTransformer,
  TransformerConfig,
  WorkflowExecutionContext,
} from './base-transformer';

/**
 * Map转换函数
 * 对数组中的每个元素进行映射转换
 */
@injectable()
export class MapTransformer extends BaseTransformer<TransformerConfig> {
  constructor() {
    super(
      'transform:map',
      'map_transform',
      '对数组中的每个元素进行映射转换，支持字段提取和表达式求值',
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
        description: '要提取的字段名',
      },
      {
        name: 'expression',
        type: 'string',
        required: false,
        description: '转换表达式（JavaScript表达式）',
      },
    ];
  }

  protected override validateCustomConfig(config: any): string[] {
    const errors: string[] = [];

    if (!config.field && !config.expression) {
      errors.push('必须指定field或expression参数');
    }

    return errors;
  }

  override async execute(
    context: WorkflowExecutionContext,
    config: TransformerConfig
  ): Promise<any[]> {
    const { sourceData, config: transformConfig } = config;
    const { field, expression } = transformConfig as Record<string, unknown>;

    if (!Array.isArray(sourceData)) {
      throw new Error('sourceData必须是数组类型');
    }

    return sourceData.map((item: any) => {
      if (field && typeof field === 'string') {
        return item[field];
      }

      if (expression && typeof expression === 'string') {
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
}
