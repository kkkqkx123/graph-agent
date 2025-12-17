import { IPollingPool } from './pool-manager.interface';

/**
 * 任务组管理器接口
 *
 * 定义任务组管理的契约
 */
export interface ITaskGroupManager {
  /**
   * 获取组引用对应的模型列表
   * @param groupReference 组引用
   * @returns 模型名称列表
   */
  getModelsForGroup(groupReference: string): Promise<string[]>;

  /**
   * 解析组引用字符串
   * @param reference 组引用
   * @returns [组名称, 层级或任务名称]
   */
  parseGroupReference(reference: string): [string, string | null];

  /**
   * 获取降级组列表
   * @param groupReference 组引用
   * @returns 降级组引用列表
   */
  getFallbackGroups(groupReference: string): Promise<string[]>;

  /**
   * 获取层级配置
   * @param groupName 任务组名称
   * @param echelonName 层级名称
   * @returns 层级配置
   */
  getEchelonConfig(groupName: string, echelonName: string): Promise<Record<string, any> | null>;

  /**
   * 按优先级获取组的模型
   * @param groupName 组名称
   * @returns [(层级名称, 优先级, 模型列表), ...] 按优先级排序
   */
  getGroupModelsByPriority(groupName: string): Promise<Array<[string, number, string[]]>>;

  /**
   * 列出所有任务组名称
   * @returns 任务组名称列表
   */
  listTaskGroups(): Promise<string[]>;

  /**
   * 验证组引用是否有效
   * @param reference 组引用
   * @returns 是否有效
   */
  validateGroupReference(reference: string): Promise<boolean>;

  /**
   * 获取任务组的降级配置
   * @param groupName 任务组名称
   * @returns 降级配置字典
   */
  getFallbackConfig(groupName: string): Promise<Record<string, any>>;

  /**
   * 获取轮询池的降级配置
   * @param poolName 轮询池名称
   * @returns 降级配置字典
   */
  getPollingPoolFallbackConfig(poolName: string): Promise<Record<string, any>>;

  /**
   * 获取全局降级配置
   * @returns 全局降级配置
   */
  getGlobalFallbackConfig(): Promise<Record<string, any>>;
}

/**
 * LLM包装器接口
 */
export interface ILLMWrapper {
  /**
   * 生成响应
   * @param request LLM请求
   * @returns LLM响应
   */
  generateResponse(request: any): Promise<any>;

  /**
   * 流式生成响应
   * @param request LLM请求
   * @returns 响应流
   */
  generateResponseStream(request: any): Promise<AsyncIterable<any>>;

  /**
   * 获取包装器名称
   * @returns 包装器名称
   */
  getName(): string;

  /**
   * 检查包装器是否可用
   * @returns 是否可用
   */
  isAvailable(): Promise<boolean>;

  /**
   * 获取包装器状态
   * @returns 状态信息
   */
  getStatus(): Promise<Record<string, any>>;
}

/**
 * 轮询池包装器接口
 */
export interface IPollingPoolWrapper extends ILLMWrapper {
  /**
   * 轮询池名称
   */
  readonly poolName: string;

  /**
   * 获取轮询池
   * @returns 轮询池实例
   */
  getPool(): Promise<IPollingPool | null>;
}

/**
 * 任务组包装器接口
 */
export interface ITaskGroupWrapper extends ILLMWrapper {
  /**
   * 任务组名称
   */
  readonly groupName: string;

  /**
   * 获取任务组管理器
   * @returns 任务组管理器
   */
  getTaskGroupManager(): Promise<ITaskGroupManager | null>;
}