import { ILLMClient } from './llm-client.interface';

/**
 * 轮询池管理器接口
 *
 * 定义轮询池管理的契约
 */
export interface IPollingPoolManager {
  /**
   * 获取轮询池
   * @param name 轮询池名称
   * @returns 轮询池实例
   */
  getPool(name: string): Promise<IPollingPool | null>;

  /**
   * 获取所有轮询池状态
   * @returns 轮询池状态字典
   */
  listAllStatus(): Promise<Record<string, any>>;

  /**
   * 关闭所有轮询池
   */
  shutdownAll(): Promise<void>;
}

/**
 * 轮询池接口
 */
export interface IPollingPool {
  /**
   * 轮询池名称
   */
  readonly name: string;

  /**
   * 获取可用实例
   * @returns LLM实例
   */
  getInstance(): Promise<ILLMInstance | null>;

  /**
   * 释放实例
   * @param instance LLM实例
   */
  releaseInstance(instance: ILLMInstance): Promise<void>;

  /**
   * 调用LLM
   * @param prompt 提示词
   * @param kwargs 额外参数
   * @returns LLM响应
   */
  callLLM(prompt: string, kwargs?: Record<string, any>): Promise<any>;

  /**
   * 获取轮询池状态
   * @returns 状态信息
   */
  getStatus(): Promise<Record<string, any>>;

  /**
   * 关闭轮询池
   */
  shutdown(): Promise<void>;
}

/**
 * LLM实例接口
 */
export interface ILLMInstance {
  /**
   * 实例ID
   */
  readonly instanceId: string;

  /**
   * 模型名称
   */
  readonly modelName: string;

  /**
   * 组名称
   */
  readonly groupName: string;

  /**
   * 层级
   */
  readonly echelon: string;

  /**
   * LLM客户端
   */
  readonly client: ILLMClient;

  /**
   * 实例状态
   */
  readonly status: InstanceStatus;

  /**
   * 检查实例是否可用
   * @returns 是否可用
   */
  isAvailable(): boolean;

  /**
   * 检查实例是否能接受新请求
   * @returns 是否能接受请求
   */
  canAcceptRequest(): boolean;

  /**
   * 更新性能指标
   * @param responseTime 响应时间
   * @param success 是否成功
   */
  updatePerformance(responseTime: number, success: boolean): void;
}

/**
 * 实例状态枚举
 */
export enum InstanceStatus {
  HEALTHY = 'healthy',
  DEGRADED = 'degraded',
  UNHEALTHY = 'unhealthy',
  FAILED = 'failed',
  RECOVERING = 'recovering'
}

/**
 * 轮询策略枚举
 */
export enum RotationStrategy {
  ROUND_ROBIN = 'round_robin',
  LEAST_RECENTLY_USED = 'least_recently_used',
  WEIGHTED = 'weighted'
}