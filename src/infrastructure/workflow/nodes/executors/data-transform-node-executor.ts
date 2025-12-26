/**
 * 数据转换节点执行器
 *
 * 负责执行数据转换操作，支持JSONPath表达式、数据验证和格式化
 */

import { injectable } from 'inversify';
import { NodeValueObject } from '../../../../domain/workflow/value-objects/node-value-object';
import { Timestamp } from '../../../../domain/common/value-objects/timestamp';

/**
 * 数据转换配置
 */
export interface DataTransformConfig {
  /** 转换类型 */
  transformType: 'map' | 'filter' | 'aggregate' | 'format' | 'validate' | 'custom';
  /** 源数据路径（JSONPath） */
  sourcePath?: string;
  /** 目标数据路径（JSONPath） */
  targetPath?: string;
  /** 转换规则 */
  transformRule: Record<string, unknown>;
  /** 数据验证规则 */
  validationRules?: ValidationRule[];
  /** 默认值 */
  defaultValue?: unknown;
}

/**
 * 数据验证规则
 */
export interface ValidationRule {
  /** 规则类型 */
  type: 'required' | 'type' | 'range' | 'pattern' | 'custom';
  /** 验证字段路径 */
  path: string;
  /** 期望值 */
  expected?: unknown;
  /** 错误消息 */
  message?: string;
}

/**
 * 数据转换节点执行器
 */
@injectable()
export class DataTransformNodeExecutor {
  /**
   * 执行数据转换节点
   */
  public async execute(
    node: NodeValueObject,
    context: ExecutionContext
  ): Promise<{ success: boolean; output?: unknown; error?: string; metadata?: Record<string, unknown> }> {
    const startTime = Timestamp.now().getMilliseconds();

    try {
      // 1. 解析配置
      const config = this.parseConfig(node);

      // 2. 获取源数据
      const sourceData = this.getSourceData(context, config);

      // 3. 执行数据转换
      const transformedData = this.executeTransform(sourceData, config);

      // 4. 执行数据验证（如果配置了验证规则）
      if (config.validationRules && config.validationRules.length > 0) {
        const validationResult = this.validateData(transformedData, config.validationRules);
        if (!validationResult.valid) {
          return {
            success: false,
            error: `数据验证失败: ${validationResult.errors.join(', ')}`,
            metadata: {
              executionTime: Timestamp.now().getMilliseconds() - startTime,
              nodeId: node.id.toString(),
              nodeType: node.type.toString()
            }
          };
        }
      }

      // 5. 设置目标数据
      this.setTargetData(context, config, transformedData);

      return {
        success: true,
        output: transformedData,
        metadata: {
          executionTime: Timestamp.now().getMilliseconds() - startTime,
          nodeId: node.id.toString(),
          nodeType: node.type.toString(),
          transformType: config.transformType
        }
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        metadata: {
          executionTime: Timestamp.now().getMilliseconds() - startTime,
          nodeId: node.id.toString(),
          nodeType: node.type.toString(),
          errorType: error instanceof Error ? error.constructor.name : 'Unknown'
        }
      };
    }
  }

  /**
   * 验证节点是否可以执行
   */
  public async canExecute(node: NodeValueObject, context: any): Promise<boolean> {
    return node.type.toString() === 'data_transform';
  }

  /**
   * 获取执行器支持的节点类型
   */
  public getSupportedNodeTypes(): string[] {
    return ['data_transform', 'transform', 'data-mapping'];
  }

  /**
   * 解析节点配置
   */
  private parseConfig(node: NodeValueObject): DataTransformConfig {
    const properties = node.properties || {};
    const config = (properties as any)['config'] || properties;

    // 使用类型守卫确保属性存在且类型正确
    const transformType = (config as any).transformType || 'map';
    const sourcePath = (config as any).sourcePath;
    const targetPath = (config as any).targetPath;
    const transformRule = (config as any).transformRule || {};
    const validationRules = (config as any).validationRules || [];
    const defaultValue = (config as any).defaultValue;

    return {
      transformType: transformType as DataTransformConfig['transformType'],
      sourcePath: sourcePath as string | undefined,
      targetPath: targetPath as string | undefined,
      transformRule: transformRule as Record<string, unknown>,
      validationRules: validationRules as ValidationRule[],
      defaultValue: defaultValue
    };
  }

  /**
   * 获取源数据
   */
  private getSourceData(context: ExecutionContext, config: DataTransformConfig): unknown {
    if (config.sourcePath) {
      return this.getValueByPath(context.data, config.sourcePath);
    }
    return context.data;
  }

  /**
   * 执行数据转换
   */
  private executeTransform(sourceData: unknown, config: DataTransformConfig): unknown {
    switch (config.transformType) {
      case 'map':
        return this.executeMapTransform(sourceData, config.transformRule);
      case 'filter':
        return this.executeFilterTransform(sourceData, config.transformRule);
      case 'aggregate':
        return this.executeAggregateTransform(sourceData, config.transformRule);
      case 'format':
        return this.executeFormatTransform(sourceData, config.transformRule);
      case 'validate':
        return this.executeValidateTransform(sourceData, config.transformRule);
      case 'custom':
        return this.executeCustomTransform(sourceData, config.transformRule);
      default:
        return sourceData;
    }
  }

  /**
   * 执行映射转换
   */
  private executeMapTransform(
    sourceData: unknown,
    rule: Record<string, unknown>
  ): unknown {
    if (Array.isArray(sourceData)) {
      return sourceData.map(item => this.mapObject(item, rule));
    } else if (typeof sourceData === 'object' && sourceData !== null) {
      return this.mapObject(sourceData, rule);
    }
    return sourceData;
  }

  /**
   * 映射对象属性
   */
  private mapObject(
    obj: unknown,
    rule: Record<string, unknown>
  ): Record<string, unknown> {
    const result: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(rule)) {
      if (typeof value === 'string' && value.startsWith('$')) {
        // 引用源数据
        result[key] = this.getValueByPath(obj, value);
      } else if (typeof value === 'object' && value !== null) {
        // 嵌套映射
        result[key] = this.mapObject(obj, value as Record<string, unknown>);
      } else {
        // 直接赋值
        result[key] = value;
      }
    }

    return result;
  }

  /**
   * 执行过滤转换
   */
  private executeFilterTransform(
    sourceData: unknown,
    rule: Record<string, unknown>
  ): unknown {
    if (!Array.isArray(sourceData)) {
      return sourceData;
    }

    const condition = (rule as any).condition as Record<string, unknown>;
    if (!condition) {
      return sourceData;
    }

    return sourceData.filter(item => {
      return this.evaluateCondition(item, condition);
    });
  }

  /**
   * 执行聚合转换
   */
  private executeAggregateTransform(
    sourceData: unknown,
    rule: Record<string, unknown>
  ): unknown {
    if (!Array.isArray(sourceData)) {
      return sourceData;
    }

    const operation = (rule as any).operation as string;
    const field = (rule as any).field as string;

    switch (operation) {
      case 'sum':
        return sourceData.reduce((sum, item) => {
          const value = this.getValueByPath(item, field);
          return sum + (typeof value === 'number' ? value : 0);
        }, 0);

      case 'avg':
        const sum = sourceData.reduce((acc, item) => {
          const value = this.getValueByPath(item, field);
          return acc + (typeof value === 'number' ? value : 0);
        }, 0);
        return sum / sourceData.length;

      case 'min':
        return Math.min(...sourceData.map(item => {
          const value = this.getValueByPath(item, field);
          return typeof value === 'number' ? value : Infinity;
        }));

      case 'max':
        return Math.max(...sourceData.map(item => {
          const value = this.getValueByPath(item, field);
          return typeof value === 'number' ? value : -Infinity;
        }));

      case 'count':
        return sourceData.length;

      case 'collect':
        return sourceData.map(item => this.getValueByPath(item, field));

      default:
        return sourceData;
    }
  }

  /**
   * 执行格式化转换
   */
  private executeFormatTransform(
    sourceData: unknown,
    rule: Record<string, unknown>
  ): unknown {
    if (typeof sourceData !== 'object' || sourceData === null) {
      return sourceData;
    }

    const result: Record<string, unknown> = {};
    const format = (rule as any).format as Record<string, string>;

    if (format) {
      for (const [key, formatStr] of Object.entries(format)) {
        const value = this.getValueByPath(sourceData, key);
        result[key] = this.formatValue(value, formatStr);
      }
    }

    return result;
  }

  /**
   * 执行验证转换
   */
  private executeValidateTransform(
    sourceData: unknown,
    rule: Record<string, unknown>
  ): unknown {
    // 验证转换实际上在主流程中处理验证规则
    return sourceData;
  }

  /**
   * 执行自定义转换
   */
  private executeCustomTransform(
    sourceData: unknown,
    rule: Record<string, unknown>
  ): unknown {
    // 自定义转换可以通过脚本或函数实现
    const customFunction = (rule as any).function as string;
    if (customFunction && typeof customFunction === 'string') {
      // TODO: 实现自定义函数调用
      // 这需要集成脚本引擎（如JavaScript引擎）
    }
    return sourceData;
  }

  /**
   * 验证数据
   */
  private validateData(
    data: unknown,
    rules: ValidationRule[]
  ): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    for (const rule of rules) {
      const value = this.getValueByPath(data, rule.path);

      switch (rule.type) {
        case 'required':
          if (value === undefined || value === null || value === '') {
            errors.push(rule.message || `${rule.path}是必需的`);
          }
          break;

        case 'type':
          const expectedType = rule.expected as string;
          if (expectedType === 'string' && typeof value !== 'string') {
            errors.push(rule.message || `${rule.path}应该是字符串类型`);
          } else if (expectedType === 'number' && typeof value !== 'number') {
            errors.push(rule.message || `${rule.path}应该是数字类型`);
          } else if (expectedType === 'boolean' && typeof value !== 'boolean') {
            errors.push(rule.message || `${rule.path}应该是布尔类型`);
          } else if (expectedType === 'array' && !Array.isArray(value)) {
            errors.push(rule.message || `${rule.path}应该是数组类型`);
          }
          break;

        case 'range':
          if (typeof value === 'number') {
            const range = rule.expected as [number, number];
            if (value < range[0] || value > range[1]) {
              errors.push(rule.message || `${rule.path}应该在${range[0]}到${range[1]}之间`);
            }
          }
          break;

        case 'pattern':
          if (typeof value === 'string' && rule.expected) {
            const regex = new RegExp(rule.expected as string);
            if (!regex.test(value)) {
              errors.push(rule.message || `${rule.path}格式不正确`);
            }
          }
          break;
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * 设置目标数据
   */
  private setTargetData(
    context: ExecutionContext,
    config: DataTransformConfig,
    data: unknown
  ): void {
    if (config.targetPath) {
      this.setValueByPath(context.data, config.targetPath, data);
    }
  }

  /**
   * 根据路径获取值
   */
  private getValueByPath(obj: unknown, path: string): unknown {
    if (!path || path === '$' || path === '.') {
      return obj;
    }

    const parts = path.replace(/^\$\.?/, '').split('.');
    let current: unknown = obj;

    for (const part of parts) {
      if (current === null || current === undefined) {
        return undefined;
      }

      if (Array.isArray(current)) {
        const index = parseInt(part, 10);
        current = current[index];
      } else if (typeof current === 'object') {
        current = (current as Record<string, unknown>)[part];
      } else {
        return undefined;
      }
    }

    return current;
  }

  /**
   * 根据路径设置值
   */
  private setValueByPath(
    obj: Record<string, unknown>,
    path: string,
    value: unknown
  ): void {
    const parts = path.replace(/^\$\.?/, '').split('.');
    let current: Record<string, unknown> = obj;

    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      if (part && (!(part in current) || (current as any)[part] === undefined)) {
        (current as any)[part] = {};
      }
      if (part) {
        current = (current as any)[part] as Record<string, unknown>;
      }
    }

    const lastPart = parts[parts.length - 1];
    if (lastPart) {
      (current as any)[lastPart] = value;
    }
  }

  /**
   * 评估条件
   */
  private evaluateCondition(
    item: unknown,
    condition: Record<string, unknown>
  ): boolean {
    for (const [key, expected] of Object.entries(condition)) {
      const actual = this.getValueByPath(item, key);
      if (actual !== expected) {
        return false;
      }
    }
    return true;
  }

  /**
   * 格式化值
   */
  private formatValue(value: unknown, format: string): string {
    if (value === null || value === undefined) {
      return '';
    }

    switch (format) {
      case 'uppercase':
        return String(value).toUpperCase();
      case 'lowercase':
        return String(value).toLowerCase();
      case 'trim':
        return String(value).trim();
      case 'date':
        return value instanceof Date ? value.toISOString() : String(value);
      case 'number':
        return typeof value === 'number' ? value.toFixed(2) : String(value);
      default:
        return String(value);
    }
  }
}

/**
 * 执行上下文接口
 */
interface ExecutionContext {
  executionId: string;
  workflowId: string;
  data: Record<string, unknown>;
  variables: Map<string, unknown>;
  executionHistory: Array<{
    nodeId: string;
    timestamp: Date;
    result: unknown;
    status: string;
  }>;
  metadata?: Record<string, unknown>;
  startTime: Date;
  status: string;
}
