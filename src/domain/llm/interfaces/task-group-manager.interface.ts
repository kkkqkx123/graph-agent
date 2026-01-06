/**
 * 层级信息元组
 */
export type EchelonInfo = [string, number, string[]];

/**
 * 降级配置
 */
export interface FallbackConfig {
  strategy: string;
  maxAttempts: number;
  retryDelay: number;
  fallbackGroups?: string[];
}

/**
 * 域层任务组管理器接口
 * 
 * 此接口定义了域层需要的任务组管理能力，
 * 避免直接依赖基础设施层的具体实现
 */
export interface ITaskGroupManager {
  /**
   * 获取指定任务组的模型列表
   */
  getModelsForGroup(groupName: string): Promise<string[]>;

  /**
   * 按优先级获取任务组的层级信息
   */
  getGroupModelsByPriority(groupName: string): Promise<EchelonInfo[]>;

  /**
   * 获取降级配置
   */
  getFallbackConfig(groupName: string): Promise<FallbackConfig>;

  /**
   * 检查任务组是否存在
   */
  hasGroup(groupName: string): Promise<boolean>;
}