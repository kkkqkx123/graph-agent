import { Jexl, Validator } from '@pawel-up/jexl';

/**
 * 表达式评估结果接口
 */
export interface EvaluationResult {
  readonly success: boolean;
  readonly value: any;
  readonly error?: string;
}

/**
 * 表达式验证结果接口
 */
export interface ExpressionValidationResult {
  readonly valid: boolean;
  readonly errors: string[];
  readonly warnings: string[];
  readonly trimmedExpression: string;
}

/**
 * 表达式评估器
 *
 * 职责：
 * - 评估表达式
 * - 验证表达式语法
 * - 提供安全的表达式执行环境
 *
 * 特性：
 * - 使用 Jexl 库，避免原型污染漏洞
 * - 支持复杂的条件表达式
 * - 支持表达式验证
 * - 支持表达式缓存
 */
export class ExpressionEvaluator {
  private readonly jexl: Jexl;
  private readonly validator: Validator;
  private readonly expressionCache: Map<string, any>;

  constructor() {
    this.jexl = new Jexl();
    this.validator = new Validator(this.jexl.grammar);
    this.expressionCache = new Map();

    // 添加常用的转换器和函数
    this.registerBuiltInTransforms();
    this.registerBuiltInFunctions();
  }

  /**
   * 评估表达式
   * @param expression 表达式字符串
   * @param context 上下文对象
   * @returns 评估结果
   */
  async evaluate(expression: string, context: Record<string, any>): Promise<EvaluationResult> {
    try {
      // 验证表达式
      const validation = this.validate(expression);
      if (!validation.valid) {
        return {
          success: false,
          value: null,
          error: validation.errors.join(', ')
        };
      }

      // 使用修剪后的表达式
      const trimmedExpression = validation.trimmedExpression;

      // 检查缓存
      const cacheKey = `${trimmedExpression}:${JSON.stringify(context)}`;
      if (this.expressionCache.has(cacheKey)) {
        return {
          success: true,
          value: this.expressionCache.get(cacheKey)
        };
      }

      // 评估表达式
      const value = await this.jexl.eval(trimmedExpression, context);

      // 缓存结果
      this.expressionCache.set(cacheKey, value);

      return {
        success: true,
        value
      };
    } catch (error) {
      return {
        success: false,
        value: null,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * 验证表达式
   * @param expression 表达式字符串
   * @param context 可选的上下文对象
   * @returns 验证结果
   */
  validate(expression: string, context?: Record<string, any>): ExpressionValidationResult {
    try {
      const result = this.validator.validate(expression, context, {
        allowUndefinedContext: !context
      });

      return {
        valid: result.valid,
        errors: result.errors.map(e => e.message),
        warnings: result.warnings.map(w => w.message),
        trimmedExpression: expression.trim()
      };
    } catch (error) {
      return {
        valid: false,
        errors: [error instanceof Error ? error.message : String(error)],
        warnings: [],
        trimmedExpression: expression.trim()
      };
    }
  }

  /**
   * 添加自定义转换器
   * @param name 转换器名称
   * @param transform 转换器函数
   */
  addTransform(name: string, transform: (val: any, ...args: any[]) => any): void {
    this.jexl.addTransform(name, transform);
  }

  /**
   * 添加自定义函数
   * @param name 函数名称
   * @param func 函数实现
   */
  addFunction(name: string, func: (...args: any[]) => any): void {
    this.jexl.addFunction(name, func);
  }

  /**
   * 清除表达式缓存
   */
  clearCache(): void {
    this.expressionCache.clear();
  }

  /**
   * 获取缓存大小
   * @returns 缓存中的表达式数量
   */
  getCacheSize(): number {
    return this.expressionCache.size;
  }

  /**
   * 注册内置转换器
   */
  private registerBuiltInTransforms(): void {
    // 字符串转换器
    this.jexl.addTransform('upper', (val: string) => String(val).toUpperCase());
    this.jexl.addTransform('lower', (val: string) => String(val).toLowerCase());
    this.jexl.addTransform('trim', (val: string) => String(val).trim());
    this.jexl.addTransform('length', (val: any) => {
      if (Array.isArray(val) || typeof val === 'string') {
        return val.length;
      }
      if (val && typeof val === 'object') {
        return Object.keys(val).length;
      }
      return 0;
    });

    // 数组转换器
    this.jexl.addTransform('first', (val: any[]) => Array.isArray(val) ? val[0] : val);
    this.jexl.addTransform('last', (val: any[]) => Array.isArray(val) ? val[val.length - 1] : val);
    this.jexl.addTransform('reverse', (val: any[]) => Array.isArray(val) ? [...val].reverse() : val);

    // 类型转换器
    this.jexl.addTransform('string', (val: any) => String(val));
    this.jexl.addTransform('number', (val: any) => Number(val));
    this.jexl.addTransform('boolean', (val: any) => Boolean(val));
  }

  /**
   * 注册内置函数
   */
  private registerBuiltInFunctions(): void {
    // 数学函数
    this.jexl.addFunction('Math.max', (...args: number[]) => Math.max(...args));
    this.jexl.addFunction('Math.min', (...args: number[]) => Math.min(...args));
    this.jexl.addFunction('Math.abs', (val: number) => Math.abs(val));
    this.jexl.addFunction('Math.round', (val: number) => Math.round(val));
    this.jexl.addFunction('Math.floor', (val: number) => Math.floor(val));
    this.jexl.addFunction('Math.ceil', (val: number) => Math.ceil(val));

    // 字符串函数
    this.jexl.addFunction('String.includes', (str: string, substr: string) => String(str).includes(substr));
    this.jexl.addFunction('String.startsWith', (str: string, prefix: string) => String(str).startsWith(prefix));
    this.jexl.addFunction('String.endsWith', (str: string, suffix: string) => String(str).endsWith(suffix));

    // 数组函数
    this.jexl.addFunction('Array.includes', (arr: any[], item: any) => Array.isArray(arr) && arr.includes(item));
    this.jexl.addFunction('Array.indexOf', (arr: any[], item: any) => Array.isArray(arr) ? arr.indexOf(item) : -1);

    // 工具函数
    this.jexl.addFunction('type', (val: any) => typeof val);
    this.jexl.addFunction('isArray', (val: any) => Array.isArray(val));
    this.jexl.addFunction('isObject', (val: any) => val !== null && typeof val === 'object');
    this.jexl.addFunction('isDefined', (val: any) => val !== undefined && val !== null);
  }
}