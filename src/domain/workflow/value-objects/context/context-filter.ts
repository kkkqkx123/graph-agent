import { ValueObject } from '../../../common/value-objects';
import { PromptContext } from './prompt-context';

/**
 * 上下文过滤规则
 */
export interface ContextFilterRule {
  /** 规则类型 */
  readonly type: 'include' | 'exclude' | 'transform';
  /** 匹配模式（支持通配符） */
  readonly pattern: string;
  /** 目标字段（可选，默认为variables） */
  readonly target?: 'variables' | 'history' | 'metadata';
  /** 转换函数（仅transform类型） */
  readonly transform?: string;
  /** 条件表达式（可选） */
  readonly condition?: string;
}

/**
 * 上下文过滤器属性接口
 */
export interface ContextFilterProps {
  /** 过滤规则列表 */
  readonly filterRules: ContextFilterRule[];
  /** 默认行为 */
  readonly defaultBehavior: 'pass' | 'block';
  /** 优先级（数字越大优先级越高） */
  readonly priority: number;
}

/**
 * 上下文过滤器验证结果
 */
export interface ContextFilterValidationResult {
  /** 是否有效 */
  readonly isValid: boolean;
  /** 错误消息 */
  readonly message?: string;
}

/**
 * 上下文过滤器值对象
 *
 * 用于过滤和转换提示词上下文
 */
export class ContextFilter extends ValueObject<ContextFilterProps> {
  private constructor(props: ContextFilterProps) {
    super(props);
  }

  /**
   * 创建上下文过滤器
   * @param props 过滤器属性
   * @returns 上下文过滤器实例
   */
  public static create(props: ContextFilterProps): ContextFilter {
    const filter = new ContextFilter(props);
    filter.validate();
    return filter;
  }

  /**
   * 创建默认的通过所有过滤器
   * @returns 上下文过滤器实例
   */
  public static passAll(): ContextFilter {
    return new ContextFilter({
      filterRules: [],
      defaultBehavior: 'pass',
      priority: 0
    });
  }

  /**
   * 创建默认的阻止所有过滤器
   * @returns 上下文过滤器实例
   */
  public static blockAll(): ContextFilter {
    return new ContextFilter({
      filterRules: [],
      defaultBehavior: 'block',
      priority: 0
    });
  }

  /**
   * 应用过滤规则到上下文
   * @param context 提示词上下文
   * @returns 过滤后的提示词上下文
   */
  public apply(context: PromptContext): PromptContext {
    let filteredVariables = new Map(context.variables);
    let filteredHistory = [...context.history];
    let filteredMetadata = { ...context.metadata };

    // 按优先级排序规则
    const sortedRules = [...this.props.filterRules].sort((a, b) => {
      // transform规则优先级最高
      if (a.type === 'transform' && b.type !== 'transform') return -1;
      if (b.type === 'transform' && a.type !== 'transform') return 1;
      return 0;
    });

    for (const rule of sortedRules) {
      // 检查条件表达式
      if (rule.condition && !this.evaluateCondition(rule.condition, context)) {
        continue;
      }

      const target = rule.target || 'variables';

      switch (rule.type) {
        case 'include':
          if (target === 'variables') {
            filteredVariables = this.applyIncludeRule(filteredVariables, rule.pattern);
          } else if (target === 'history') {
            filteredHistory = this.applyIncludeRuleToHistory(filteredHistory, rule.pattern);
          } else if (target === 'metadata') {
            filteredMetadata = this.applyIncludeRuleToMetadata(filteredMetadata, rule.pattern);
          }
          break;

        case 'exclude':
          if (target === 'variables') {
            filteredVariables = this.applyExcludeRule(filteredVariables, rule.pattern);
          } else if (target === 'history') {
            filteredHistory = this.applyExcludeRuleToHistory(filteredHistory, rule.pattern);
          } else if (target === 'metadata') {
            filteredMetadata = this.applyExcludeRuleToMetadata(filteredMetadata, rule.pattern);
          }
          break;

        case 'transform':
          if (target === 'variables') {
            filteredVariables = this.applyTransformRule(filteredVariables, rule.pattern, rule.transform);
          } else if (target === 'history') {
            filteredHistory = this.applyTransformRuleToHistory(filteredHistory, rule.pattern, rule.transform);
          } else if (target === 'metadata') {
            filteredMetadata = this.applyTransformRuleToMetadata(filteredMetadata, rule.pattern, rule.transform);
          }
          break;
      }
    }

    // 应用默认行为
    if (this.props.defaultBehavior === 'block' && this.props.filterRules.length === 0) {
      filteredVariables = new Map();
      filteredHistory = [];
      filteredMetadata = {};
    }

    return PromptContext.create(
      context.template,
      filteredVariables,
      filteredHistory,
      filteredMetadata
    );
  }

  /**
   * 应用包含规则到变量
   */
  private applyIncludeRule(variables: Map<string, unknown>, pattern: string): Map<string, unknown> {
    const result = new Map<string, unknown>();
    const regex = this.patternToRegex(pattern);

    for (const [key, value] of variables.entries()) {
      if (regex.test(key)) {
        result.set(key, value);
      }
    }

    return result;
  }

  /**
   * 应用包含规则到历史记录
   */
  private applyIncludeRuleToHistory(history: any[], pattern: string): any[] {
    const regex = this.patternToRegex(pattern);
    return history.filter(entry => regex.test(entry.nodeId));
  }

  /**
   * 应用包含规则到元数据
   */
  private applyIncludeRuleToMetadata(metadata: Record<string, unknown>, pattern: string): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    const regex = this.patternToRegex(pattern);

    for (const [key, value] of Object.entries(metadata)) {
      if (regex.test(key)) {
        result[key] = value;
      }
    }

    return result;
  }

  /**
   * 应用排除规则到变量
   */
  private applyExcludeRule(variables: Map<string, unknown>, pattern: string): Map<string, unknown> {
    const result = new Map<string, unknown>();
    const regex = this.patternToRegex(pattern);

    for (const [key, value] of variables.entries()) {
      if (!regex.test(key)) {
        result.set(key, value);
      }
    }

    return result;
  }

  /**
   * 应用排除规则到历史记录
   */
  private applyExcludeRuleToHistory(history: any[], pattern: string): any[] {
    const regex = this.patternToRegex(pattern);
    return history.filter(entry => !regex.test(entry.nodeId));
  }

  /**
   * 应用排除规则到元数据
   */
  private applyExcludeRuleToMetadata(metadata: Record<string, unknown>, pattern: string): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    const regex = this.patternToRegex(pattern);

    for (const [key, value] of Object.entries(metadata)) {
      if (!regex.test(key)) {
        result[key] = value;
      }
    }

    return result;
  }

  /**
   * 应用转换规则到变量
   */
  private applyTransformRule(variables: Map<string, unknown>, pattern: string, transform?: string): Map<string, unknown> {
    const result = new Map<string, unknown>();
    const regex = this.patternToRegex(pattern);

    for (const [key, value] of variables.entries()) {
      if (regex.test(key) && transform) {
        // 简单的转换逻辑：将值转换为字符串并添加前缀
        result.set(key, `${transform}:${String(value)}`);
      } else {
        result.set(key, value);
      }
    }

    return result;
  }

  /**
   * 应用转换规则到历史记录
   */
  private applyTransformRuleToHistory(history: any[], pattern: string, transform?: string): any[] {
    const regex = this.patternToRegex(pattern);
    return history.map(entry => {
      if (regex.test(entry.nodeId) && transform) {
        return {
          ...entry,
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
   * 应用转换规则到元数据
   */
  private applyTransformRuleToMetadata(metadata: Record<string, unknown>, pattern: string, transform?: string): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    const regex = this.patternToRegex(pattern);

    for (const [key, value] of Object.entries(metadata)) {
      if (regex.test(key) && transform) {
        result[key] = `${transform}:${String(value)}`;
      } else {
        result[key] = value;
      }
    }

    return result;
  }

  /**
   * 将模式转换为正则表达式
   */
  private patternToRegex(pattern: string): RegExp {
    // 将通配符 * 转换为正则表达式 .*
    const regexPattern = pattern.replace(/\*/g, '.*');
    return new RegExp(`^${regexPattern}$`);
  }

  /**
   * 评估条件表达式
   */
  private evaluateCondition(condition: string, context: PromptContext): boolean {
    // 简化的条件评估逻辑
    // 实际实现应该使用更安全的表达式解析器
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
   * 验证过滤规则
   * @returns 验证结果
   */
  public validateRules(): ContextFilterValidationResult {
    for (const rule of this.props.filterRules) {
      if (!rule.pattern || rule.pattern.trim().length === 0) {
        return {
          isValid: false,
          message: '过滤规则的模式不能为空'
        };
      }

      if (rule.type === 'transform' && !rule.transform) {
        return {
          isValid: false,
          message: '转换规则必须指定转换函数'
        };
      }
    }

    return {
      isValid: true
    };
  }

  /**
   * 合并两个过滤器
   * @param other 另一个过滤器
   * @returns 合并后的过滤器
   */
  public merge(other: ContextFilter): ContextFilter {
    const mergedRules = [...this.props.filterRules, ...other.props.filterRules];
    const mergedPriority = Math.max(this.props.priority, other.props.priority);

    return ContextFilter.create({
      filterRules: mergedRules,
      defaultBehavior: this.props.defaultBehavior,
      priority: mergedPriority
    });
  }

  /**
   * 获取优先级
   */
  public get priority(): number {
    return this.props.priority;
  }

  /**
   * 获取默认行为
   */
  public get defaultBehavior(): 'pass' | 'block' {
    return this.props.defaultBehavior;
  }

  /**
   * 获取过滤规则
   */
  public get filterRules(): ContextFilterRule[] {
    return [...this.props.filterRules];
  }

  /**
   * 验证值对象的有效性
   */
  public override validate(): void {
    const result = this.validateRules();
    if (!result.isValid) {
      throw new Error(result.message || '上下文过滤器验证失败');
    }
  }
}