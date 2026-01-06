import { injectable } from 'inversify';
import {
  BaseTransformFunction,
  TransformFunctionConfig,
  WorkflowExecutionContext,
} from './base-transform-function';

/**
 * Group转换函数
 * 根据字段值对数组元素进行分组
 */
@injectable()
export class GroupTransformFunction extends BaseTransformFunction<TransformFunctionConfig> {
  constructor() {
    super(
      'transform:group',
      'group_transform',
      '根据字段值对数组元素进行分组',
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
        required: true,
        description: '要分组的字段名',
      },
    ];
  }

  protected override validateCustomConfig(config: any): string[] {
    const errors: string[] = [];

    if (!config.field) {
      errors.push('field是必需参数');
    }

    return errors;
  }

  override async execute(
    context: WorkflowExecutionContext,
    config: TransformFunctionConfig
  ): Promise<Record<string, any[]>> {
    this.checkInitialized();

    const { sourceData, config: transformConfig } = config;
    const { field } = transformConfig as Record<string, unknown>;

    if (!Array.isArray(sourceData)) {
      throw new Error('sourceData必须是数组类型');
    }

    if (!field || typeof field !== 'string') {
      throw new Error('field是必需参数');
    }

    return sourceData.reduce((groups: Record<string, any[]>, item: any) => {
      const key = String(item[field]);
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(item);
      return groups;
    }, {});
  }
}
