/**
 * 路径类型工具
 * 提供编译时类型安全的配置路径访问
 */

/**
 * 将对象类型转换为点号分隔的路径字符串类型
 * 
 * @example
 * type Paths = PathOf<{ a: { b: number } }> // "a" | "a.b"
 */
export type PathOf<T> = T extends object
  ? {
      [K in keyof T]: T[K] extends object
        ? K extends string
          ? `${K}` | `${K}.${PathOf<T[K]>}`
          : never
        : K extends string
        ? `${K}`
        : never;
    }[keyof T]
  : never;

/**
 * 根据路径获取对应的值类型
 * 
 * @example
 * type Value = ValueAtPath<{ a: { b: number } }, "a.b"> // number
 */
export type ValueAtPath<T, P extends string> = P extends `${infer K}.${infer Rest}`
  ? K extends keyof T
    ? ValueAtPath<T[K], Rest>
    : never
  : P extends keyof T
  ? T[P]
  : never;

/**
 * 配置访问器接口
 */
export interface IConfigAccessor<T> {
  /**
   * 获取配置值（类型安全）
   * 
   * @param path - 配置路径，支持点号分隔
   * @returns 配置值，类型由路径自动推导
   */
  get<P extends PathOf<T>>(path: P): ValueAtPath<T, P>;

  /**
   * 获取配置值（带默认值）
   * 
   * @param path - 配置路径
   * @param defaultValue - 默认值
   * @returns 配置值或默认值
   */
  getOrDefault<P extends PathOf<T>>(
    path: P,
    defaultValue: ValueAtPath<T, P>
  ): ValueAtPath<T, P>;

  /**
   * 检查配置路径是否存在
   * 
   * @param path - 配置路径
   * @returns 是否存在
   */
  has<P extends PathOf<T>>(path: P): boolean;
}