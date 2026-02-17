// ============================================================
// 核心类型定义
// ============================================================

/**
 * 服务标识符类型
 * 可以是 Symbol、字符串或类构造函数
 */
export type ServiceIdentifier<T = unknown> =
  | symbol
  | string
  | (new (...args: any[]) => T);

/**
 * 绑定作用域类型
 */
export enum BindingScope {
  /** 每次解析创建新实例 */
  TRANSIENT = 'transient',
  /** 全局单例 */
  SINGLETON = 'singleton',
  /** 作用域内单例 */
  SCOPED = 'scoped',
}

/**
 * 绑定类型
 */
export enum BindingType {
  /** 类实例 */
  INSTANCE = 'instance',
  /** 常量值 */
  CONSTANT = 'constant',
  /** 工厂函数 */
  FACTORY = 'factory',
  /** 动态值 */
  DYNAMIC = 'dynamic',
}

/**
 * 解析请求上下文
 */
export interface Request {
  /** 请求的服务标识符 */
  serviceId: ServiceIdentifier;
  /** 父级请求上下文 */
  parentContext?: Request;
  /** 解析深度 */
  depth: number;
}

/**
 * 可注入类的标记接口
 * 实现类需要定义静态 $inject 属性
 */
export interface Injectable {
  /** 依赖列表 */
  $inject?: ServiceIdentifier[];
}

/**
 * 构造函数类型
 */
export type Constructor<T = {}> = new (...args: any[]) => T;

/**
 * 容器接口（前向声明）
 */
export interface Container {
  get<T extends {}>(serviceId: ServiceIdentifier<T>): T;
  getWithRequest<T extends {}>(serviceId: ServiceIdentifier<T>, request: Request): T;
  getAll<T extends {}>(serviceId: ServiceIdentifier<T>): T[];
  tryGet<T extends {}>(serviceId: ServiceIdentifier<T>): T | undefined;
  isBound(serviceId: ServiceIdentifier): boolean;
}

/**
 * 工厂函数类型
 */
export type Factory<T> = (container: Container) => T;

/**
 * 动态值函数类型
 */
export type DynamicValue<T> = (container: Container) => T;
