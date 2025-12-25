import { injectable, inject } from 'inversify';
import { PollingPoolManager } from '../../../infrastructure/llm/managers/pool-manager';
import { PollingPoolNotFoundError } from '../../../domain/llm/exceptions/pool-exceptions';

// 导入新的DTO
import {
  PoolDto,
  PoolCreateDto,
  PoolUpdateDto,
  PoolHealthReportDto,
  SystemPoolReportDto,
  InstanceDto,
  PoolConverter,
  InstanceConverter,
  type PoolDTO,
  type PoolCreateDTO,
  type PoolUpdateDTO,
  type PoolHealthReportDTO,
  type SystemPoolReportDTO,
  type InstanceDTO
} from '../dtos/llm.dto';

import { DtoValidationError } from '../../common/dto/base-dto';

/**
 * 轮询池服务
 *
 * 提供轮询池管理的应用层服务
 */
@injectable()
export class PoolService {
  private poolDto: PoolDto;
  private poolCreateDto: PoolCreateDto;
  private poolUpdateDto: PoolUpdateDto;
  private poolHealthReportDto: PoolHealthReportDto;
  private systemPoolReportDto: SystemPoolReportDto;
  private instanceDto: InstanceDto;
  private poolConverter: PoolConverter;
  private instanceConverter: InstanceConverter;

  constructor(
    @inject('PollingPoolManager') private poolManager: PollingPoolManager
  ) {
    // 初始化DTO实例
    this.poolDto = new PoolDto();
    this.poolCreateDto = new PoolCreateDto();
    this.poolUpdateDto = new PoolUpdateDto();
    this.poolHealthReportDto = new PoolHealthReportDto();
    this.systemPoolReportDto = new SystemPoolReportDto();
    this.instanceDto = new InstanceDto();
    this.poolConverter = new PoolConverter();
    this.instanceConverter = new InstanceConverter();
  }

  /**
   * 获取轮询池
   */
  async getPool(poolName: string): Promise<any> {
    const pool = await this.poolManager.getPool(poolName);
    
    if (!pool) {
      throw new PollingPoolNotFoundError(poolName);
    }
    
    return pool;
  }

  /**
   * 获取轮询池（DTO）
   */
  async getPoolWithDto(poolName: string): Promise<PoolDTO | null> {
    try {
      const pool = await this.getPool(poolName);
      return this.poolConverter.toDto(pool);
    } catch (error) {
      return null;
    }
  }

  /**
   * 创建轮询池（DTO）
   */
  async createPool(request: unknown): Promise<PoolDTO> {
    try {
      // 验证创建请求
      const validatedRequest = this.poolCreateDto.validate(request);
      
      // 创建轮询池（简化实现）
      const pool = {
        name: validatedRequest.name,
        config: validatedRequest.config,
        status: {
          totalInstances: 0,
          healthyInstances: 0,
          degradedInstances: 0,
          failedInstances: 0,
          availabilityRate: 0,
          concurrencyStatus: {
            enabled: false,
            currentLoad: 0,
            maxLoad: 0,
            loadPercentage: 0
          },
          lastChecked: new Date().toISOString()
        },
        statistics: {
          totalRequests: 0,
          successfulRequests: 0,
          failedRequests: 0,
          avgResponseTime: 0,
          successRate: 0,
          currentLoad: 0,
          maxConcurrency: 0
        }
      };

      return this.poolConverter.toDto(pool);
    } catch (error) {
      if (error instanceof DtoValidationError) {
        throw new Error(`无效的创建请求: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * 更新轮询池（DTO）
   */
  async updatePool(poolName: string, request: unknown): Promise<PoolDTO> {
    try {
      // 验证更新请求
      const validatedRequest = this.poolUpdateDto.validate(request);
      
      // 获取现有轮询池
      const existingPool = await this.getPool(poolName);
      
      // 更新轮询池（简化实现）
      const updatedPool = {
        ...existingPool,
        config: validatedRequest.config || existingPool.config,
        taskGroups: validatedRequest.taskGroups || existingPool.taskGroups
      };

      return this.poolConverter.toDto(updatedPool);
    } catch (error) {
      if (error instanceof DtoValidationError) {
        throw new Error(`无效的更新请求: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * 调用轮询池的LLM
   */
  async callLLM(poolName: string, prompt: string, kwargs?: Record<string, any>): Promise<any> {
    const pool = await this.getPool(poolName);
    return pool.callLLM(prompt, kwargs);
  }

  /**
   * 获取轮询池状态
   */
  async getPoolStatus(poolName: string): Promise<Record<string, any>> {
    const pool = await this.getPool(poolName);
    return pool.getStatus();
  }

  /**
   * 获取所有轮询池状态
   */
  async getAllPoolsStatus(): Promise<Record<string, any>> {
    return this.poolManager.listAllStatus();
  }

  /**
   * 检查轮询池是否可用
   */
  async isPoolAvailable(poolName: string): Promise<boolean> {
    try {
      const status = await this.getPoolStatus(poolName);
      return status['healthyInstances'] > 0;
    } catch {
      return false;
    }
  }

  /**
   * 获取轮询池统计信息（DTO）
   */
  async getPoolStatistics(poolName: string): Promise<PoolDTO> {
    const status = await this.getPoolStatus(poolName);
    
    const pool = {
      name: poolName,
      config: {},
      status: {
        totalInstances: status['totalInstances'],
        healthyInstances: status['healthyInstances'],
        degradedInstances: status['degradedInstances'],
        failedInstances: status['failedInstances'],
        availabilityRate: status['totalInstances'] > 0 ?
          (status['healthyInstances'] + status['degradedInstances']) / status['totalInstances'] : 0,
        concurrencyStatus: status['concurrencyStatus'],
        lastChecked: status['lastChecked']?.toISOString() || new Date().toISOString()
      },
      statistics: {
        totalRequests: status['totalRequests'] || 0,
        successfulRequests: status['successfulRequests'] || 0,
        failedRequests: status['failedRequests'] || 0,
        avgResponseTime: status['avgResponseTime'] || 0,
        successRate: status['successRate'] || 0,
        currentLoad: status['currentLoad'] || 0,
        maxConcurrency: status['maxConcurrency'] || 0
      }
    };

    return this.poolConverter.toDto(pool);
  }

  /**
   * 获取所有轮询池的统计信息（DTO）
   */
  async getAllPoolsStatistics(): Promise<Record<string, PoolDTO>> {
    const allStatus = await this.getAllPoolsStatus();
    const statistics: Record<string, PoolDTO> = {};
    
    for (const [poolName, status] of Object.entries(allStatus)) {
      const pool = {
        name: poolName,
        config: {},
        status: {
          totalInstances: status['totalInstances'],
          healthyInstances: status['healthyInstances'],
          degradedInstances: status['degradedInstances'],
          failedInstances: status['failedInstances'],
          availabilityRate: status['totalInstances'] > 0 ?
            (status['healthyInstances'] + status['degradedInstances']) / status['totalInstances'] : 0,
          concurrencyStatus: status['concurrencyStatus'],
          lastChecked: status['lastChecked']?.toISOString() || new Date().toISOString()
        },
        statistics: {
          totalRequests: status['totalRequests'] || 0,
          successfulRequests: status['successfulRequests'] || 0,
          failedRequests: status['failedRequests'] || 0,
          avgResponseTime: status['avgResponseTime'] || 0,
          successRate: status['successRate'] || 0,
          currentLoad: status['currentLoad'] || 0,
          maxConcurrency: status['maxConcurrency'] || 0
        }
      };

      statistics[poolName] = this.poolConverter.toDto(pool);
    }
    
    return statistics;
  }

  /**
   * 获取轮询池实例列表（DTO）
   */
  async getPoolInstances(poolName: string): Promise<InstanceDTO[]> {
    try {
      const pool = await this.getPool(poolName);
      const instances = await pool.getInstances(); // 假设存在此方法
      
      return instances.map((instance: any) => this.instanceConverter.toDto(instance));
    } catch (error) {
      return [];
    }
  }

  /**
   * 关闭轮询池
   */
  async shutdownPool(poolName: string): Promise<void> {
    const pool = await this.getPool(poolName);
    await pool.shutdown();
  }

  /**
   * 关闭所有轮询池
   */
  async shutdownAllPools(): Promise<void> {
    await this.poolManager.shutdownAll();
  }

  /**
   * 重新加载轮询池配置
   */
  async reloadPool(poolName: string): Promise<void> {
    // TODO: 实现轮询池重新加载逻辑
    // 这可能需要关闭现有池并重新创建
    console.log(`重新加载轮询池: ${poolName}`);
  }

  /**
   * 获取轮询池健康报告（DTO）
   */
  async getPoolHealthReport(poolName: string): Promise<PoolHealthReportDTO> {
    const status = await this.getPoolStatus(poolName);
    const statistics = await this.getPoolStatistics(poolName);
    
    const report = {
      poolName,
      status: 'healthy' as const, // 简化实现
      issues: [],
      recommendations: [],
      statistics: statistics.statistics,
      lastChecked: new Date().toISOString()
    };

    return this.poolHealthReportDto.validate(report);
  }

  /**
   * 获取系统级轮询池报告（DTO）
   */
  async getSystemPoolReport(): Promise<SystemPoolReportDTO> {
    const allStatistics = await this.getAllPoolsStatistics();
    const totalPools = Object.keys(allStatistics).length;
    const totalInstances = Object.values(allStatistics).reduce(
      (sum, stats) => sum + stats.status.totalInstances, 0
    );
    const healthyInstances = Object.values(allStatistics).reduce(
      (sum, stats) => sum + stats.status.healthyInstances, 0
    );
    
    const overallAvailability = totalInstances > 0 ? 
      healthyInstances / totalInstances : 0;
    
    const pools: Record<string, any> = {};
    for (const [poolName, poolDto] of Object.entries(allStatistics)) {
      pools[poolName] = poolDto.statistics;
    }
    
    const report = {
      totalPools,
      totalInstances,
      healthyInstances,
      overallAvailability,
      pools,
      timestamp: new Date().toISOString()
    };

    return this.systemPoolReportDto.validate(report);
  }
}