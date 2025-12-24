import { HookPoint, HookContext } from './hook-context';
import { BaseHook, HookExecutionResult } from './hook-execution-manager';

/**
 * 日志钩子
 *
 * 记录图执行过程中的日志信息
 */
export class LoggingHook implements BaseHook {
  private logger: (message: string, context?: any) => void;
  private enabled = true;

  constructor(
    private id: string,
    private hookPoint: HookPoint,
    logger: (message: string, context?: any) => void = console.log
  ) {
    this.logger = logger;
  }

  getId(): string {
    return this.id;
  }

  getHookPoint(): HookPoint {
    return this.hookPoint;
  }

  async execute(context: HookContext): Promise<HookExecutionResult> {
    const startTime = Date.now();
    try {
      const message = `钩子执行 [${this.getId()}] 在 ${this.getHookPoint()}`;
      this.logger(message, {
        workflowId: context.workflowId,
        nodeId: context.nodeId,
        edgeId: context.edgeId,
        timestamp: context.timestamp
      });
      return {
        hookId: this.id,
        success: true,
        result: { logged: true },
        executionTime: Date.now() - startTime,
        shouldContinue: true
      };
    } catch (error) {
      return {
        hookId: this.id,
        success: false,
        error: error as Error,
        executionTime: Date.now() - startTime,
        shouldContinue: true
      };
    }
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }
}

/**
 * 验证钩子
 *
 * 验证图执行过程中的数据
 */
export class ValidationHook implements BaseHook {
  private validator: (context: HookContext) => boolean | Promise<boolean>;
  private errorMessage: string;
  private enabled = true;

  constructor(
    private id: string,
    private hookPoint: HookPoint,
    validator: (context: HookContext) => boolean | Promise<boolean>,
    errorMessage: string = '验证失败'
  ) {
    this.validator = validator;
    this.errorMessage = errorMessage;
  }

  getId(): string {
    return this.id;
  }

  getHookPoint(): HookPoint {
    return this.hookPoint;
  }

  async execute(context: HookContext): Promise<HookExecutionResult> {
    const startTime = Date.now();
    try {
      const isValid = await this.validator(context);
      if (!isValid) {
        throw new Error(this.errorMessage);
      }
      return {
        hookId: this.id,
        success: true,
        result: { validated: true },
        executionTime: Date.now() - startTime,
        shouldContinue: true
      };
    } catch (error) {
      return {
        hookId: this.id,
        success: false,
        error: error as Error,
        executionTime: Date.now() - startTime,
        shouldContinue: false
      };
    }
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }
}

/**
 * 缓存钩子
 *
 * 缓存图执行过程中的数据
 */
export class CacheHook implements BaseHook {
  private cache: Map<string, any> = new Map();
  private keyGenerator: (context: HookContext) => string;
  private ttl: number; // 生存时间（毫秒）
  private enabled = true;

  constructor(
    private id: string,
    private hookPoint: HookPoint,
    keyGenerator: (context: HookContext) => string,
    ttl: number = 300000 // 默认5分钟
  ) {
    this.keyGenerator = keyGenerator;
    this.ttl = ttl;
  }

  getId(): string {
    return this.id;
  }

  getHookPoint(): HookPoint {
    return this.hookPoint;
  }

  async execute(context: HookContext): Promise<HookExecutionResult> {
    const startTime = Date.now();
    try {
      const key = this.keyGenerator(context);
      const cached = this.cache.get(key);

      if (cached && Date.now() - cached.timestamp < this.ttl) {
        return {
          hookId: this.id,
          success: true,
          result: { cached: true, data: cached.data, fromCache: true },
          executionTime: Date.now() - startTime,
          shouldContinue: true
        };
      }

      // 如果没有缓存或已过期，返回空结果，实际数据由其他钩子或业务逻辑设置
      return {
        hookId: this.id,
        success: true,
        result: { cached: false, fromCache: false },
        executionTime: Date.now() - startTime,
        shouldContinue: true
      };
    } catch (error) {
      return {
        hookId: this.id,
        success: false,
        error: error as Error,
        executionTime: Date.now() - startTime,
        shouldContinue: true
      };
    }
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  public setCache(key: string, data: any): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  public getCache(key: string): any | undefined {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.ttl) {
      return cached.data;
    }
    return undefined;
  }

  public clearCache(): void {
    this.cache.clear();
  }
}

/**
 * 性能监控钩子
 *
 * 监控执行性能
 */
export class PerformanceHook implements BaseHook {
  private performanceData: Map<string, any> = new Map();
  private enabled = true;

  constructor(
    private id: string,
    private hookPoint: HookPoint
  ) {}

  getId(): string {
    return this.id;
  }

  getHookPoint(): HookPoint {
    return this.hookPoint;
  }

  async execute(context: HookContext): Promise<HookExecutionResult> {
    const startTime = Date.now();
    try {
      const startMemory = this.getMemoryUsage();

      // 模拟执行，实际应该由其他钩子或业务逻辑执行
      const result = {
        performanceMonitored: true,
        startTime,
        startMemory
      };

      const endTime = Date.now();
      const endMemory = this.getMemoryUsage();
      const executionTime = endTime - startTime;
      const memoryDelta = endMemory - startMemory;

      const performanceData = {
        hookId: this.getId(),
        hookPoint: this.getHookPoint(),
        workflowId: context.workflowId,
        nodeId: context.nodeId,
        executionTime,
        memoryDelta,
        timestamp: new Date()
      };

      this.performanceData.set(`${this.getId()}_${Date.now()}`, performanceData);

      return {
        hookId: this.id,
        success: true,
        result: {
          ...result,
          endTime,
          endMemory,
          executionTime,
          memoryDelta,
          performanceData
        },
        executionTime: Date.now() - startTime,
        shouldContinue: true
      };
    } catch (error) {
      return {
        hookId: this.id,
        success: false,
        error: error as Error,
        executionTime: Date.now() - startTime,
        shouldContinue: true
      };
    }
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  private getMemoryUsage(): number {
    if (typeof performance !== 'undefined' && (performance as any).memory) {
      return (performance as any).memory.usedJSHeapSize;
    }
    return 0;
  }

  public getPerformanceData(): Map<string, any> {
    return new Map(this.performanceData);
  }

  public clearPerformanceData(): void {
    this.performanceData.clear();
  }
}

/**
 * 转换钩子
 *
 * 转换上下文数据
 */
export class TransformHook implements BaseHook {
  private transformer: (context: HookContext) => Promise<HookContext> | HookContext;
  private enabled = true;

  constructor(
    private id: string,
    private hookPoint: HookPoint,
    transformer: (context: HookContext) => Promise<HookContext> | HookContext
  ) {
    this.transformer = transformer;
  }

  getId(): string {
    return this.id;
  }

  getHookPoint(): HookPoint {
    return this.hookPoint;
  }

  async execute(context: HookContext): Promise<HookExecutionResult> {
    const startTime = Date.now();
    try {
      const transformedContext = await this.transformer(context);
      return {
        hookId: this.id,
        success: true,
        result: {
          transformed: true,
          originalContext: context,
          transformedContext
        },
        executionTime: Date.now() - startTime,
        shouldContinue: true
      };
    } catch (error) {
      return {
        hookId: this.id,
        success: false,
        error: error as Error,
        executionTime: Date.now() - startTime,
        shouldContinue: true
      };
    }
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }
}

/**
 * 过滤钩子
 *
 * 根据条件过滤执行
 */
export class FilterHook implements BaseHook {
  private filter: (context: HookContext) => boolean | Promise<boolean>;
  private enabled = true;

  constructor(
    private id: string,
    private hookPoint: HookPoint,
    filter: (context: HookContext) => boolean | Promise<boolean>
  ) {
    this.filter = filter;
  }

  getId(): string {
    return this.id;
  }

  getHookPoint(): HookPoint {
    return this.hookPoint;
  }

  async execute(context: HookContext): Promise<HookExecutionResult> {
    const startTime = Date.now();
    try {
      const shouldExecute = await this.filter(context);
      return {
        hookId: this.id,
        success: true,
        result: {
          filtered: true,
          shouldExecute
        },
        executionTime: Date.now() - startTime,
        shouldContinue: shouldExecute
      };
    } catch (error) {
      return {
        hookId: this.id,
        success: false,
        error: error as Error,
        executionTime: Date.now() - startTime,
        shouldContinue: false
      };
    }
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }
}