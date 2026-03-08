/**
 * 通用存储回调接口定义
 * 提供存储操作的抽象基类，减少重复代码
 */

/**
 * 存储生命周期接口
 *
 * 定义存储适配器的基本生命周期管理方法
 * 所有存储适配器都应实现此接口
 */
export interface StorageLifecycle {
  /**
   * 初始化存储
   * 创建必要的资源（目录、数据库连接等）
   */
  initialize(): Promise<void>;

  /**
   * 关闭存储连接
   * 释放资源并清理状态
   */
  close(): Promise<void>;

  /**
   * 清空所有数据
   */
  clear(): Promise<void>;
}

/**
 * 通用存储回调接口
 *
 * 提供标准化的 CRUD 操作接口
 * @template TMetadata - 元数据类型
 * @template TListOptions - 列表查询选项类型
 */
export interface BaseStorageCallback<TMetadata, TListOptions>
  extends StorageLifecycle {
  /**
   * 保存数据
   * @param id 唯一标识
   * @param data 序列化后的数据（字节数组）
   * @param metadata 元数据（用于索引和查询）
   */
  save(id: string, data: Uint8Array, metadata: TMetadata): Promise<void>;

  /**
   * 加载数据
   * @param id 唯一标识
   * @returns 数据（字节数组），如果不存在返回 null
   */
  load(id: string): Promise<Uint8Array | null>;

  /**
   * 删除数据
   * @param id 唯一标识
   */
  delete(id: string): Promise<void>;

  /**
   * 列出所有 ID
   * @param options 查询选项（支持多维度过滤和分页）
   * @returns ID 数组
   */
  list(options?: TListOptions): Promise<string[]>;

  /**
   * 检查是否存在
   * @param id 唯一标识
   * @returns 是否存在
   */
  exists(id: string): Promise<boolean>;

  /**
   * 获取元数据
   * @param id 唯一标识
   * @returns 元数据，如果不存在返回 null
   */
  getMetadata(id: string): Promise<TMetadata | null>;
}
