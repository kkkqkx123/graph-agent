import { Binding, BindingType } from './binding.js';
import { BindingScope, Container, Constructor, Request, ServiceIdentifier } from './types.js';

// ============================================================
// 解析引擎
// ============================================================

/**
 * 解析上下文
 */
export interface ResolutionContext {
  /** 当前请求 */
  request: Request;
  /** 已解析的依赖 */
  resolved: Map<symbol, unknown>;
}

/**
 * 解析引擎
 */
export class ResolutionEngine {
  private singletonCache = new Map<symbol, unknown>();
  private scopedCache = new Map<symbol, unknown>();

  /**
   * 激活绑定（创建实例）
   */
  activateBinding<T extends {}>(
    binding: Binding<T>,
    request: Request,
    container: Container
  ): T {
    // 检查单例缓存
    if (binding.scope === BindingScope.SINGLETON) {
      if (this.singletonCache.has(binding.id)) {
        return this.singletonCache.get(binding.id) as T;
      }
    }

    // 检查作用域缓存
    if (binding.scope === BindingScope.SCOPED) {
      if (this.scopedCache.has(binding.id)) {
        return this.scopedCache.get(binding.id) as T;
      }
    }

    // 创建实例
    let instance: T;

    switch (binding.type) {
      case BindingType.CONSTANT:
        instance = binding.constantValue as T;
        break;

      case BindingType.FACTORY:
        if (!binding.factory) {
          throw new Error('Factory binding missing factory function');
        }
        instance = binding.factory(container);
        break;

      case BindingType.DYNAMIC:
        if (!binding.dynamicValue) {
          throw new Error('Dynamic binding missing dynamic value function');
        }
        instance = binding.dynamicValue(container);
        break;

      case BindingType.INSTANCE:
        if (!binding.implementation) {
          throw new Error('Instance binding missing implementation class');
        }
        instance = this.createInstance(binding.implementation, request, (id, req) => container.getWithRequest(id as ServiceIdentifier<T>, req));
        break;

      default:
        throw new Error(`Unknown binding type: ${binding.type}`);
    }

    // 缓存单例/作用域实例
    if (binding.scope === BindingScope.SINGLETON) {
      this.singletonCache.set(binding.id, instance);
    } else if (binding.scope === BindingScope.SCOPED) {
      this.scopedCache.set(binding.id, instance);
    }

    return instance;
  }

  /**
   * 创建类实例（自动解析构造函数参数）
   */
  private createInstance<T extends {}>(
    constructor: Constructor<T>,
    request: Request,
    resolveDependency: (id: ServiceIdentifier, req: Request) => unknown
  ): T {
    // 获取构造函数参数类型
    const paramTypes = this.getConstructorParams(constructor);

    // 递归解析依赖
    const args = paramTypes.map((type, index) => {
      // 检测循环依赖（在创建子请求之前检查父链）
      if (this.detectCircularDependency(type, request)) {
        throw new Error(
          `Circular dependency detected: ${this.stringifyId(type)} at depth ${request.depth + 1}`
        );
      }

      const childRequest: Request = {
        serviceId: type,
        parentContext: request,
        depth: request.depth + 1,
      };

      return resolveDependency(type, childRequest);
    });

    return new constructor(...args);
  }

  /**
   * 获取构造函数参数列表
   */
  private getConstructorParams(constructor: Constructor): ServiceIdentifier[] {
    // 从静态 $inject 属性获取
    return (constructor as any).$inject || [];
  }

  /**
   * 检测循环依赖
   */
  private detectCircularDependency(serviceId: ServiceIdentifier, request: Request): boolean {
    let current: Request | undefined = request;
    while (current) {
      if (current.serviceId === serviceId) {
        return true;
      }
      current = current.parentContext;
    }
    return false;
  }

  /**
   * 转换服务标识符为字符串
   */
  private stringifyId(serviceId: ServiceIdentifier): string {
    if (typeof serviceId === 'symbol') return serviceId.toString();
    if (typeof serviceId === 'string') return serviceId;
    return serviceId.name;
  }

  /**
   * 清除作用域缓存
   */
  clearScopedCache(): void {
    this.scopedCache.clear();
  }

  /**
   * 清除所有缓存
   */
  clearAllCaches(): void {
    this.singletonCache.clear();
    this.scopedCache.clear();
  }
}
