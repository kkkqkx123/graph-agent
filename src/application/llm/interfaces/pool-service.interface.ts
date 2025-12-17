import { 
  ILLMPoolManager, 
  PoolConfig, 
  PoolHealthStatus 
} from '../../../domain/llm/interfaces/pool-manager.interface';
import { Pool } from '../../../domain/llm/entities/pool';
import { PoolStatistics } from '../services/pool.service';

/**
 * 轮询池服务接口
 * 
 * 扩展领域层的轮询池管理器接口，添加应用层特定的功能
 */
export interface IPoolService extends ILLMPoolManager {
  /**
   * 获取所有轮询池
   * @returns 轮询池列表
   */
  getAllPools(): Promise<Pool[]>;

  /**
   * 更新轮询池配置
   * @param poolName 池名称
   * @param config 新配置
   * @returns 更新后的池
   */
  updatePoolConfig(poolName: string, config: Partial<PoolConfig>): Promise<Pool>;

  /**
   * 删除轮询池
   * @param poolName 池名称
   * @returns 是否成功
   */
  deletePool(poolName: string): Promise<boolean>;

  /**
   * 获取池统计信息
   * @param poolName 池名称
   * @returns 统计信息
   */
  getPoolStatistics(poolName: string): Promise<PoolStatistics>;

  /**
   * 执行全局健康检查
   * @returns 所有池的健康状态
   */
  globalHealthCheck(): Promise<Record<string, PoolHealthStatus>>;

  /**
   * 获取所有池的统计信息
   * @returns 所有池的统计信息
   */
  getAllPoolStatistics(): Promise<Record<string, PoolStatistics>>;

  /**
   * 重启池
   * @param poolName 池名称
   */
  restartPool(poolName: string): Promise<void>;

  /**
   * 关闭服务
   */
  shutdown(): Promise<void>;
}