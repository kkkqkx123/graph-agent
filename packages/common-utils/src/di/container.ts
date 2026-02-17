import {
  BindInFluentSyntax,
  BindToFluentSyntax,
  BindWhenFluentSyntax,
  Binding,
  BindingBuilder,
} from './binding.js';
import { ResolutionEngine } from './resolver.js';
import { Request, ServiceIdentifier } from './types.js';

// ============================================================
// 依赖注入容器
// ============================================================

export class Container {
  /** 绑定注册表: 服务标识符 -> 绑定列表 */
  private bindings = new Map<symbol, Binding[]>();

  /** 解析引擎 */
  private resolver: ResolutionEngine;

  /** 父容器 */
  private parent?: Container;

  constructor(parent?: Container) {
    this.parent = parent;
    this.resolver = new ResolutionEngine();
  }

  // ----------------------------------------------------------
  // 服务注册
  // ----------------------------------------------------------

  /**
   * 绑定服务
   * @param serviceId 服务标识符
   * @returns 绑定配置语法
   */
  bind<T>(serviceId: ServiceIdentifier<T>): BindToFluentSyntax<T> & BindInFluentSyntax<T> & BindWhenFluentSyntax<T> {
    const bindingId = Symbol('binding');
    const builder = new BindingBuilder<T>(bindingId, serviceId);
    let bindingAdded = false;

    // 包装 builder，在配置完成后自动添加到注册表
    const self = this;
    const wrappedBuilder = new Proxy(builder, {
      get(target, prop, receiver) {
        const value = Reflect.get(target, prop, receiver);

        // 如果是 void 返回类型的方法，执行后自动注册绑定
        if (
          typeof value === 'function' &&
          (prop === 'toConstantValue' || prop === 'toFactory')
        ) {
          return (...args: any[]) => {
            const result = value.apply(target, args);
            if (!bindingAdded) {
              self.addBinding(target.getBinding());
              bindingAdded = true;
            }
            return result;
          };
        }

        // 如果是返回语法接口的方法，保持链式调用
        if (typeof value === 'function') {
          return (...args: any[]) => {
            const result = value.apply(target, args);
            // 如果返回的是 builder 自身，返回代理对象
            if (result === target) {
              // 对于 to() 和 toDynamicValue()，立即添加绑定
              if ((prop === 'to' || prop === 'toDynamicValue') && !bindingAdded) {
                self.addBinding(target.getBinding());
                bindingAdded = true;
              }
              return wrappedBuilder;
            }
            return result;
          };
        }

        return value;
      },
    }) as BindToFluentSyntax<T> & BindInFluentSyntax<T> & BindWhenFluentSyntax<T>;

    // 对于 when 方法需要特殊处理
    const originalWhen = builder.when.bind(builder);
    (wrappedBuilder as any).when = (constraint: (request: Request) => boolean) => {
      originalWhen(constraint);
      if (!bindingAdded) {
        self.addBinding(builder.getBinding());
        bindingAdded = true;
      }
    };

    return wrappedBuilder;
  }

  /**
   * 添加绑定到注册表
   */
  private addBinding(binding: Binding): void {
    const key = this.getKey(binding.serviceId);
    const list = this.bindings.get(key) || [];
    list.push(binding);
    this.bindings.set(key, list);
  }

  // ----------------------------------------------------------
  // 服务解析
  // ----------------------------------------------------------

  /**
   * 解析单个服务
   * @param serviceId 服务标识符
   * @returns 服务实例
   */
  get<T extends {}>(serviceId: ServiceIdentifier<T>): T {
    const request: Request = {
      serviceId,
      depth: 0,
    };

    return this.resolve<T>(serviceId, request);
  }

  /**
   * 解析单个服务（带请求上下文，用于依赖解析）
   * @param serviceId 服务标识符
   * @param request 请求上下文
   * @returns 服务实例
   */
  getWithRequest<T extends {}>(serviceId: ServiceIdentifier<T>, request: Request): T {
    return this.resolve<T>(serviceId, request);
  }

  /**
   * 解析所有匹配的服务（多绑定）
   * @param serviceId 服务标识符
   * @returns 服务实例数组
   */
  getAll<T extends {}>(serviceId: ServiceIdentifier<T>): T[] {
    const request: Request = {
      serviceId,
      depth: 0,
    };

    return this.resolveAll<T>(serviceId, request);
  }

  /**
   * 尝试解析服务，不存在返回 undefined
   */
  tryGet<T extends {}>(serviceId: ServiceIdentifier<T>): T | undefined {
    try {
      return this.get<T>(serviceId);
    } catch {
      return undefined;
    }
  }

  /**
   * 核心解析逻辑
   */
  private resolve<T extends {}>(serviceId: ServiceIdentifier<T>, request: Request): T {
    const candidates = this.findBindings(serviceId, request);

    if (candidates.length === 0) {
      // 尝试从父容器解析
      if (this.parent) {
        return this.parent.get(serviceId);
      }
      throw new Error(
        `No binding found for ${this.stringifyId(serviceId)}`
      );
    }

    if (candidates.length > 1) {
      throw new Error(
        `Ambiguous bindings for ${this.stringifyId(serviceId)}. ` +
          `Found ${candidates.length} bindings. Use getAll() to retrieve all bindings.`
      );
    }

    return this.resolver.activateBinding<T>(
      candidates[0] as Binding<T>,
      request,
      this
    );
  }

  /**
   * 解析所有匹配的绑定
   */
  private resolveAll<T extends {}>(serviceId: ServiceIdentifier<T>, request: Request): T[] {
    const candidates = this.findBindings(serviceId, request);

    if (candidates.length === 0 && this.parent) {
      return this.parent.getAll(serviceId);
    }

    return candidates.map((binding) =>
      this.resolver.activateBinding<T>(binding as Binding<T>, request, this)
    );
  }

  /**
   * 查找匹配的绑定
   */
  private findBindings(
    serviceId: ServiceIdentifier,
    request: Request
  ): Binding[] {
    const key = this.getKey(serviceId);
    const list = this.bindings.get(key) || [];

    // 过滤条件约束
    return list.filter((b) => !b.when || b.when(request));
  }

  // ----------------------------------------------------------
  // 容器管理
  // ----------------------------------------------------------

  /**
   * 创建子容器
   */
  createChild(): Container {
    return new Container(this);
  }

  /**
   * 检查服务是否已绑定
   */
  isBound(serviceId: ServiceIdentifier): boolean {
    const key = this.getKey(serviceId);
    const list = this.bindings.get(key);
    return (list && list.length > 0) || (this.parent?.isBound(serviceId) ?? false);
  }

  /**
   * 清除作用域缓存
   */
  clearScopedCache(): void {
    this.resolver.clearScopedCache();
  }

  /**
   * 清除所有缓存
   */
  clearAllCaches(): void {
    this.resolver.clearAllCaches();
  }

  // ----------------------------------------------------------
  // 辅助方法
  // ----------------------------------------------------------

  /**
   * 获取服务标识符的键值
   */
  private getKey(serviceId: ServiceIdentifier): symbol {
    if (typeof serviceId === 'symbol') {
      return serviceId;
    }
    if (typeof serviceId === 'string') {
      return Symbol.for(serviceId);
    }
    return Symbol.for(serviceId.name);
  }

  /**
   * 转换服务标识符为字符串
   */
  private stringifyId(serviceId: ServiceIdentifier): string {
    if (typeof serviceId === 'symbol') return serviceId.toString();
    if (typeof serviceId === 'string') return serviceId;
    return serviceId.name;
  }
}
