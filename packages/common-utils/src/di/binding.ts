import {
  BindingScope,
  BindingType,
  Constructor,
  DynamicValue,
  Factory,
  Request,
  ServiceIdentifier,
} from './types.js';

export { BindingType };

// ============================================================
// 绑定模型
// ============================================================

/**
 * 绑定定义
 */
export interface Binding<T = unknown> {
  /** 绑定唯一标识 */
  id: symbol;
  /** 服务标识符 */
  serviceId: ServiceIdentifier<T>;
  /** 绑定类型 */
  type: BindingType;
  /** 作用域 */
  scope: BindingScope;
  /** 实现类 */
  implementation?: Constructor<T>;
  /** 常量值 */
  constantValue?: T;
  /** 工厂函数 */
  factory?: Factory<T>;
  /** 动态值函数 */
  dynamicValue?: DynamicValue<T>;
  /** 条件约束 */
  when?: (request: Request) => boolean;
}

/**
 * 绑定到目标接口
 */
export interface BindToFluentSyntax<T> {
  /**
   * 绑定到类实现
   */
  to(constructor: Constructor<T>): BindInFluentSyntax<T>;

  /**
   * 绑定到常量值
   */
  toConstantValue(value: T): void;

  /**
   * 绑定到工厂函数
   */
  toFactory(factory: Factory<T>): void;

  /**
   * 绑定到动态值
   */
  toDynamicValue(factory: DynamicValue<T>): BindInFluentSyntax<T>;
}

/**
 * 作用域配置接口
 */
export interface BindInFluentSyntax<T> {
  /**
   * 设置为单例作用域
   */
  inSingletonScope(): BindWhenFluentSyntax<T>;

  /**
   * 设置为瞬态作用域
   */
  inTransientScope(): BindWhenFluentSyntax<T>;

  /**
   * 设置为作用域内单例
   */
  inScopedScope(): BindWhenFluentSyntax<T>;

  /**
   * 设置指定作用域
   */
  inScope(scope: BindingScope): BindWhenFluentSyntax<T>;
}

/**
 * 条件约束接口
 */
export interface BindWhenFluentSyntax<T> {
  /**
   * 添加条件约束
   */
  when(constraint: (request: Request) => boolean): void;
}

// ============================================================
// 绑定构建器
// ============================================================

export class BindingBuilder<T> implements BindToFluentSyntax<T>, BindInFluentSyntax<T>, BindWhenFluentSyntax<T> {
  private binding: Binding<T>;

  constructor(bindingId: symbol, serviceId: ServiceIdentifier<T>) {
    this.binding = {
      id: bindingId,
      serviceId,
      type: BindingType.INSTANCE,
      scope: BindingScope.TRANSIENT,
    };
  }

  getBinding(): Binding<T> {
    return this.binding;
  }

  // BindToFluentSyntax
  to(constructor: Constructor<T>): BindInFluentSyntax<T> {
    this.binding.type = BindingType.INSTANCE;
    this.binding.implementation = constructor;
    return this;
  }

  toConstantValue(value: T): void {
    this.binding.type = BindingType.CONSTANT;
    this.binding.constantValue = value;
    this.binding.scope = BindingScope.SINGLETON;
  }

  toFactory(factory: Factory<T>): void {
    this.binding.type = BindingType.FACTORY;
    this.binding.factory = factory;
  }

  toDynamicValue(factory: DynamicValue<T>): BindInFluentSyntax<T> {
    this.binding.type = BindingType.DYNAMIC;
    this.binding.dynamicValue = factory;
    return this;
  }

  // BindInFluentSyntax
  inSingletonScope(): BindWhenFluentSyntax<T> {
    this.binding.scope = BindingScope.SINGLETON;
    return this;
  }

  inTransientScope(): BindWhenFluentSyntax<T> {
    this.binding.scope = BindingScope.TRANSIENT;
    return this;
  }

  inScopedScope(): BindWhenFluentSyntax<T> {
    this.binding.scope = BindingScope.SCOPED;
    return this;
  }

  inScope(scope: BindingScope): BindWhenFluentSyntax<T> {
    this.binding.scope = scope;
    return this;
  }

  // BindWhenFluentSyntax
  when(constraint: (request: Request) => boolean): void {
    this.binding.when = constraint;
  }
}
