import { injectable } from 'inversify';
import {
  BaseTransformFunction,
  TransformFunctionConfig,
  WorkflowExecutionContext,
} from './base-transform-function';

/**
 * Reduce转换函数
 * 将数组元素归约为单个值
 */
@injectable()
export class ReduceTransformFunction extends BaseTransformFunction<TransformFunctionConfig> {
  constructor() {
    super(
      'transform:reduce',
      'reduce_transform',
      '将数组元素归约为单个值，支持多种聚合操作',
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
        description: '要聚合的字段名',
      },
      {
        name: 'initialValue',
        type: 'any',
        required: false,
        description: '初始值',
        defaultValue: 0,
      },
      {
        name: 'operation',
        type: 'string',
        required: false,
        description: '聚合操作：sum, multiply, max, min, concat, merge',
        defaultValue: 'sum',
      },
    ];
  }

  protected override validateCustomConfig(config: any): string[] {
    const errors: string[] = [];
    const validOperations = ['sum', 'multiply', 'max', 'min', 'concat', 'merge'];

    if (config.operation && !validOperations.includes(config.operation)) {
      errors.push(`operation必须是以下值之一: ${validOperations.join(', ')}`);
    }

    return errors;
  }

  override async execute(
    context: WorkflowExecutionContext,
    config: TransformFunctionConfig
  ): Promise<any> {
    this.checkInitialized();

    const { sourceData, config: transformConfig } = config;
    const {
      field,
      initialValue = 0,
      operation = 'sum',
    } = transformConfig as Record<string, unknown>;

    if (!Array.isArray(sourceData)) {
      throw new Error('sourceData必须是数组类型');
    }

    return sourceData.reduce((acc: any, item: any) => {
      const value = field && typeof field === 'string' ? item[field] : item;

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
}
