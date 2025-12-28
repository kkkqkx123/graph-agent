import { ValueObject } from '../../../common/value-objects/value-object';
import { PromptContext } from './prompt-context';
import { ValidationResult } from './context-filter';

/**
 * 边上下文过滤器类型
 */
export enum EdgeContextFilterType {
  /** 传递所有上下文 */
  PASS_ALL = 'pass_all',
  /** 不传递上下文 */
  PASS_NONE = 'pass_none',
  /** 选择性传递 */
  SELECTIVE = 'selective',
  /** 条件传递 */
  CONDITIONAL = 'conditional',
  /** 转换传递 */
  TRANSFORM = 'transform'
}

/**
 * 转换规则
 */
export interface TransformRule {
  /** 源模式 */
  readonly sourcePattern: string;
  /** 目标模式 */
  readonly targetPattern: string;
  /** 转换函数 */
  readonly transform: string;
}

/**
 * 边上下文过滤器属性接口
 */
export interface EdgeContextFilterProps {
  /** 过滤器类型 */
  readonly type: EdgeContextFilterType;
  /** 包含模式（仅SELECTIVE和CONDITIONAL类型） */
  readonly includePatterns?: string[];
  /** 排除模式（仅SELECTIVE和CONDITIONAL类型） */
  readonly excludePatterns?: string[];
  /** 转换规则（仅TRANSFORM类型） */
  readonly transformRules?: TransformRule[];
  /** 条件表达式（仅CONDITIONAL类型） */
  readonly condition?: string;
}

/**
 * 边上下文过滤器值对象
 *
 * 用于在边传递时过滤和转换提示词上下文
 */
export class EdgeContextFilter extends ValueObject<EdgeContextFilterProps> {
  private constructor(props: EdgeContextFilterProps) {
    super(props);
  }

  /**
   * 创建边上下文过滤器
   * @param props 过滤器属性
   * @returns 边上下文过滤器实例
   */
  public static create(props: EdgeContextFilterProps): EdgeContextFilter {
    const filter = new EdgeContextFilter(props);
    filter.validate();
    return filter;
  }

  /**
   * 创建传递所有上下文的过滤器
   * @returns 边上下文过滤器实例
   */
  public static passAll(): EdgeContextFilter {
    return new EdgeContextFilter({
      type: EdgeContextFilterType.PASS_ALL
    });
  }

  /**
   * 创建不传递上下文的过滤器
   * @returns 边上下文过滤器实例
   */
  public static passNone(): EdgeContextFilter {
    return new EdgeContextFilter({
      type: EdgeContextFilterType.PASS_NONE
    });
  }

  /**
   * 创建选择性传递过滤器
   * @param includePatterns 包含模式
   * @param excludePatterns 排除模式
   * @returns 边上下文过滤器实例
   */
  public static selective(
    includePatterns: string[],
    excludePatterns: string[] = []
  ): EdgeContextFilter {
    return new EdgeContextFilter({
      type: EdgeContextFilterType.SELECTIVE,
      includePatterns,
      excludePatterns
    });
  }

  /**
   * 创建条件传递过滤器
   * @param condition 条件表达式
   * @param includePatterns 包含模式
   * @param excludePatterns 排除模式
   * @returns 边上下文过滤器实例
   */
  public static conditional(
    condition: string,
    includePatterns: string[] = [],
    excludePatterns: string[] = []
  ): EdgeContextFilter {
    return new EdgeContextFilter({
      type: EdgeContextFilterType.CONDITIONAL,
      condition,
      includePatterns,
      excludePatterns
    });
  }

  /**
   * 创建转换传递过滤器
   * @param transformRules 转换规则
   * @returns 边上下文过滤器实例
   */
  public static transform(transformRules: TransformRule[]): EdgeContextFilter {
    return new EdgeContextFilter({
      type: EdgeContextFilterType.TRANSFORM,
      transformRules
    });
  }

  /**
   * 应用过滤器到上下文
   * @param context 提示词上下文
   * @returns 过滤后的提示词上下文
   */
  public applyFilter(context: PromptContext): PromptContext {
    switch (this.props.type) {
      case EdgeContextFilterType.PASS_ALL:
        return context.clone();

      case EdgeContextFilterType.PASS_NONE:
        return PromptContext.create(
          context.template,
          new Map(),
          [],
          {}
        );

      case EdgeContextFilterType.SELECTIVE:
        return this.applySelectiveFilter(context);

      case EdgeContextFilterType.CONDITIONAL:
        return this.applyConditionalFilter(context);

      case EdgeContextFilterType.TRANSFORM:
        return this.applyTransformFilter(context);

      default:
        return context.clone();
    }
  }

  /**
   * 应用选择性过滤器
   */
  private applySelectiveFilter(context: PromptContext): PromptContext {
    let filteredVariables = new Map(context.variables);
    let filteredHistory = [...context.history];
    let filteredMetadata = { ...context.metadata };

    // 应用包含模式
    if (this.props.includePatterns && this.props.includePatterns.length > 0) {
      filteredVariables = this.filterVariables(filteredVariables, this.props.includePatterns, true);
      filteredHistory = this.filterHistory(filteredHistory, this.props.includePatterns, true);
      filteredMetadata = this.filterMetadata(filteredMetadata, this.props.includePatterns, true);
    }

    // 应用排除模式
    if (this.props.excludePatterns && this.props.excludePatterns.length > 0) {
      filteredVariables = this.filterVariables(filteredVariables, this.props.excludePatterns, false);
      filteredHistory = this.filterHistory(filteredHistory, this.props.excludePatterns, false);
      filteredMetadata = this.filterMetadata(filteredMetadata, this.props.excludePatterns, false);
    }

    return PromptContext.create(
      context.template,
      filteredVariables,
      filteredHistory,
      filteredMetadata
    );
  }

  /**
   * 应用条件过滤器
   */
  private applyConditionalFilter(context: PromptContext): PromptContext {
    // 评估条件表达式
    if (this.props.condition && !this.evaluateCondition(this.props.condition, context)) {
      // 条件不满足，返回空上下文
      return PromptContext.create(
        context.template,
        new Map(),
        [],
        {}
      );
    }

    // 条件满足，应用选择性过滤
    return this.applySelectiveFilter(context);
  }

  /**
   * 应用转换过滤器
   */
  private applyTransformFilter(context: PromptContext): PromptContext {
    let transformedVariables = new Map(context.variables);
    let transformedHistory = [...context.history];
    let transformedMetadata = { ...context.metadata };

    if (this.props.transformRules) {
      for (const rule of this.props.transformRules) {
        transformedVariables = this.transformVariables(
          transformedVariables,
          rule.sourcePattern,
          rule.targetPattern,
          rule.transform
        );
        transformedHistory = this.transformHistory(
          transformedHistory,
          rule.sourcePattern,
          rule.targetPattern,
          rule.transform
        );
        transformedMetadata = this.transformMetadata(
          transformedMetadata,
          rule.sourcePattern,
          rule.targetPattern,
          rule.transform
        );
      }
    }

    return PromptContext.create(
      context.template,
      transformedVariables,
      transformedHistory,
      transformedMetadata
    );
  }

  /**
   * 过滤变量
   */
  private filterVariables(
    variables: Map<string, unknown>,
    patterns: string[],
    include: boolean
  ): Map<string, unknown> {
    const result = new Map<string, unknown>();
    const regexes = patterns.map(p => this.patternToRegex(p));

    for (const [key, value] of variables.entries()) {
      const matches = regexes.some(regex => regex.test(key));
      if (matches === include) {
        result.set(key, value);
      }
    }

    return result;
  }

  /**
   * 过滤历史记录
   */
  private filterHistory(history: any[], patterns: string[], include: boolean): any[] {
    const regexes = patterns.map(p => this.patternToRegex(p));
    return history.filter(entry => {
      const matches = regexes.some(regex => regex.test(entry.nodeId));
      return matches === include;
    });
  }

  /**
   * 过滤元数据
   */
  private filterMetadata(metadata: Record<string, unknown>, patterns: string[], include: boolean): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    const regexes = patterns.map(p => this.patternToRegex(p));

    for (const [key, value] of Object.entries(metadata)) {
      const matches = regexes.some(regex => regex.test(key));
      if (matches === include) {
        result[key] = value;
      }
    }

    return result;
  }

  /**
   * 转换变量
   */
  private transformVariables(
    variables: Map<string, unknown>,
    sourcePattern: string,
    targetPattern: string,
    transform: string
  ): Map<string, unknown> {
    const result = new Map<string, unknown>();
    const sourceRegex = this.patternToRegex(sourcePattern);

    for (const [key, value] of variables.entries()) {
      if (sourceRegex.test(key)) {
        // 应用转换
        const newKey = key.replace(sourceRegex, targetPattern);
        const newValue = this.applyTransform(value, transform);
        result.set(newKey, newValue);
      } else {
        result.set(key, value);
      }
    }

    return result;
  }

  /**
   * 转换历史记录
   */
  private transformHistory(
    history: any[],
    sourcePattern: string,
    targetPattern: string,
    transform: string
  ): any[] {
    const sourceRegex = this.patternToRegex(sourcePattern);
    return history.map(entry => {
      if (sourceRegex.test(entry.nodeId)) {
        return {
          ...entry,
          nodeId: entry.nodeId.replace(sourceRegex, targetPattern),
          metadata: {
            ...entry.metadata,
            transformed: transform
          }
        };
      }
      return entry;
    });
  }

  /**
   * 转换元数据
   */
  private transformMetadata(
    metadata: Record<string, unknown>,
    sourcePattern: string,
    targetPattern: string,
    transform: string
  ): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    const sourceRegex = this.patternToRegex(sourcePattern);

    for (const [key, value] of Object.entries(metadata)) {
      if (sourceRegex.test(key)) {
        const newKey = key.replace(sourceRegex, targetPattern);
        const newValue = this.applyTransform(value, transform);
        result[newKey] = newValue;
      } else {
        result[key] = value;
      }
    }

    return result;
  }

  /**
   * 应用转换函数
   */
  private applyTransform(value: unknown, transform: string): unknown {
    // 简化的转换逻辑
    // 实际实现应该使用更安全的表达式解析器
    try {
      const func = new Function('value', `return ${transform}`);
      return func(value);
    } catch (error) {
      console.warn(`转换函数执行失败: ${transform}`, error);
      return value;
    }
  }

  /**
   * 将模式转换为正则表达式
   */
  private patternToRegex(pattern: string): RegExp {
    const regexPattern = pattern.replace(/\*/g, '.*');
    return new RegExp(`^${regexPattern}$`);
  }

  /**
   * 评估条件表达式
   */
  private evaluateCondition(condition: string, context: PromptContext): boolean {
    try {
      const variables = Object.fromEntries(context.variables);
      const func = new Function('context', 'variables', `return ${condition}`);
      return func(context, variables);
    } catch (error) {
      console.warn(`条件表达式评估失败: ${condition}`, error);
      return false;
    }
  }

  /**
   * 验证过滤器配置
   * @returns 验证结果
   */
  public validateFilter(): ValidationResult {
    switch (this.props.type) {
      case EdgeContextFilterType.SELECTIVE:
        if (!this.props.includePatterns || this.props.includePatterns.length === 0) {
          return {
            isValid: false,
            message: 'SELECTIVE类型过滤器必须指定包含模式'
          };
        }
        break;

      case EdgeContextFilterType.CONDITIONAL:
        if (!this.props.condition) {
          return {
            isValid: false,
            message: 'CONDITIONAL类型过滤器必须指定条件表达式'
          };
        }
        break;

      case EdgeContextFilterType.TRANSFORM:
        if (!this.props.transformRules || this.props.transformRules.length === 0) {
          return {
            isValid: false,
            message: 'TRANSFORM类型过滤器必须指定转换规则'
          };
        }
        break;
    }

    return {
      isValid: true
    };
  }

  /**
   * 检查是否支持特定上下文类型
   * @param contextType 上下文类型
   * @returns 是否支持
   */
  public supportsContextType(contextType: string): boolean {
    // 所有过滤器类型都支持所有上下文类型
    // 可以根据需要添加更复杂的逻辑
    return true;
  }

  /**
   * 获取过滤器类型
   */
  public get type(): EdgeContextFilterType {
    return this.props.type;
  }

  /**
   * 获取包含模式
   */
  public get includePatterns(): string[] {
    return this.props.includePatterns || [];
  }

  /**
   * 获取排除模式
   */
  public get excludePatterns(): string[] {
    return this.props.excludePatterns || [];
  }

  /**
   * 获取转换规则
   */
  public get transformRules(): TransformRule[] {
    return this.props.transformRules || [];
  }

  /**
   * 获取条件表达式
   */
  public get condition(): string | undefined {
    return this.props.condition;
  }

  /**
   * 验证值对象的有效性
   */
  public override validate(): void {
    const result = this.validateFilter();
    if (!result.isValid) {
      throw new Error(result.message || '边上下文过滤器验证失败');
    }
  }
}