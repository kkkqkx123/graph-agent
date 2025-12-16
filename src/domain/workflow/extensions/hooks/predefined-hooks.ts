import { BaseHook } from './base-hook';
import { HookContext } from './hook-context';
import { HookPoint } from '../../value-objects/hook-point';

/**
 * 日志钩子
 * 
 * 记录图执行过程中的日志信息
 */
export class LoggingHook extends BaseHook {
  private logger: (message: string, context?: any) => void;

  constructor(
    id: string,
    hookPoint: HookPoint,
    logger: (message: string, context?: any) => void = console.log
  ) {
    super(id, hookPoint);
    this.logger = logger;
  }

  protected async onExecute(context: HookContext): Promise<any> {
    const message = `钩子执行 [${this.getId()}] 在 ${this.getHookPoint()}`;
    this.logger(message, {
      workflowId: context.workflowId?.toString(),
      nodeId: context.nodeId,
      edgeId: context.edgeId,
      timestamp: context.timestamp
    });
    return { logged: true };
  }
}

/**
 * 验证钩子
 * 
 * 验证图执行过程中的数据
 */
export class ValidationHook extends BaseHook {
  private validator: (context: HookContext) => boolean | Promise<boolean>;
  private errorMessage: string;

  constructor(
    id: string,
    hookPoint: HookPoint,
    validator: (context: HookContext) => boolean | Promise<boolean>,
    errorMessage: string = '验证失败'
  ) {
    super(id, hookPoint);
    this.validator = validator;
    this.errorMessage = errorMessage;
  }

  protected async onExecute(context: HookContext): Promise<any> {
    const isValid = await this.validator(context);
    if (!isValid) {
      throw new Error(this.errorMessage);
    }
    return { validated: true };
  }
}

/**
 * 缓存钩子
 * 
 * 缓存图执行过程中的数据
 */
export class CacheHook extends BaseHook {
  private cache: Map<string, any> = new Map();
  private keyGenerator: (context: HookContext) => string;
  private ttl: number; // 生存时间（毫秒）

  constructor(
    id: string,
    hookPoint: HookPoint,
    keyGenerator: (context: HookContext) => string,
    ttl: number = 300000 // 默认5分钟
  ) {
    super(id, hookPoint);
    this.keyGenerator = keyGenerator;
    this.ttl = ttl;
  }

  protected async onExecute(context: HookContext): Promise<any> {
    const key = this.keyGenerator(context);
    const cached = this.cache.get(key);

    if (cached && Date.now() - cached.timestamp < this.ttl) {
      return { cached: true, data: cached.data, fromCache: true };
    }

    // 如果没有缓存或已过期，返回空结果，实际数据由其他钩子或业务逻辑设置
    return { cached: false, fromCache: false };
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
export class PerformanceHook extends BaseHook {
  private performanceData: Map<string, any> = new Map();

  constructor(id: string, hookPoint: HookPoint) {
    super(id, hookPoint);
  }

  protected async onExecute(context: HookContext): Promise<any> {
    const startTime = performance.now();
    const startMemory = this.getMemoryUsage();

    // 模拟执行，实际应该由其他钩子或业务逻辑执行
    const result = {
      performanceMonitored: true,
      startTime,
      startMemory
    };

    const endTime = performance.now();
    const endMemory = this.getMemoryUsage();
    const executionTime = endTime - startTime;
    const memoryDelta = endMemory - startMemory;

    const performanceData = {
      hookId: this.getId(),
      hookPoint: this.getHookPoint(),
      workflowId: context.workflowId?.toString(),
      nodeId: context.nodeId,
      executionTime,
      memoryDelta,
      timestamp: new Date()
    };

    this.performanceData.set(`${this.getId()}_${Date.now()}`, performanceData);

    return {
      ...result,
      endTime,
      endMemory,
      executionTime,
      memoryDelta,
      performanceData
    };
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
export class TransformHook extends BaseHook {
  private transformer: (context: HookContext) => Promise<HookContext> | HookContext;

  constructor(
    id: string,
    hookPoint: HookPoint,
    transformer: (context: HookContext) => Promise<HookContext> | HookContext
  ) {
    super(id, hookPoint);
    this.transformer = transformer;
  }

  protected async onExecute(context: HookContext): Promise<any> {
    const transformedContext = await this.transformer(context);
    return {
      transformed: true,
      originalContext: context,
      transformedContext
    };
  }
}

/**
 * 过滤钩子
 * 
 * 根据条件过滤执行
 */
export class FilterHook extends BaseHook {
  private filter: (context: HookContext) => boolean | Promise<boolean>;

  constructor(
    id: string,
    hookPoint: HookPoint,
    filter: (context: HookContext) => boolean | Promise<boolean>
  ) {
    super(id, hookPoint);
    this.filter = filter;
  }

  protected async onExecute(context: HookContext): Promise<any> {
    const shouldExecute = await this.filter(context);
    return {
      filtered: true,
      shouldExecute
    };
  }

  public override shouldExecute(context: HookContext): boolean {
    // 同步版本的过滤检查
    try {
      const result = this.filter(context);
      return result instanceof Promise ? false : result;
    } catch {
      return false;
    }
  }
}