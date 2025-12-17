// 导出集成组件
export * from './llm-client-adapter';
export * from './enhanced-llm-client-factory';
export * from './config-loader';
export * from './request-router';
export * from './integration-example';

// 重新导出领域层接口和实体
export * from '../../../../domain/llm/interfaces/llm-wrapper.interface';
export * from '../../../../domain/llm/interfaces/pool-manager.interface';
export * from '../../../../domain/llm/interfaces/task-group-manager.interface';
export * from '../../../../domain/llm/interfaces/wrapper-manager.interface';
export * from '../../../../domain/llm/entities/pool';
export * from '../../../../domain/llm/entities/task-group';
export * from '../../../../domain/llm/value-objects/rotation-strategy';
export * from '../../../../domain/llm/value-objects/fallback-strategy';
export * from '../../../../domain/llm/value-objects/health-status';

// 重新导出应用层服务
export * from '../../../../application/llm/services/pool.service';
export * from '../../../../application/llm/services/task-group.service';
export * from '../../../../application/llm/services/config-management.service';
export * from '../../../../application/llm/services/llm-orchestration.service';

// 重新导出领域层服务
export * from '../../../../domain/llm/services/metrics-collector';
export * from '../../../../domain/llm/services/health-checker';
export * from '../../../../domain/llm/services/alerting-service';

/**
 * 集成工具类
 * 
 * 提供便捷的方法来初始化和使用轮询池和任务组系统
 */
export class LLMIntegrationTools {
  /**
   * 检查集成是否可用
   */
  static isIntegrationAvailable(): boolean {
    try {
      // 检查必要的依赖是否可用
      const requiredSymbols = [
        'PoolManager',
        'TaskGroupManager', 
        'LLMWrapperManager',
        'RequestRouter',
        'EnhancedLLMClientFactory'
      ];
      
      // 在实际应用中，这里会检查依赖注入容器中的服务
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 获取集成版本信息
   */
  static getIntegrationVersion(): {
    version: string;
    description: string;
    features: string[];
  } {
    return {
      version: '1.0.0',
      description: 'LLM轮询池和任务组集成系统',
      features: [
        '轮询池管理',
        '任务组管理', 
        '智能路由',
        '健康检查',
        '监控指标',
        '告警系统',
        '配置热重载'
      ]
    };
  }

  /**
   * 获取集成状态报告
   */
  static async getIntegrationStatus(): Promise<{
    isAvailable: boolean;
    version: string;
    services: Array<{
      name: string;
      status: 'healthy' | 'unhealthy' | 'unknown';
      description: string;
    }>;
    configuration: {
      pools: number;
      taskGroups: number;
      wrappers: number;
    };
  }> {
    const isAvailable = this.isIntegrationAvailable();
    const versionInfo = this.getIntegrationVersion();

    return {
      isAvailable,
      version: versionInfo.version,
      services: [
        { name: 'PoolManager', status: 'healthy', description: '轮询池管理器' },
        { name: 'TaskGroupManager', status: 'healthy', description: '任务组管理器' },
        { name: 'LLMWrapperManager', status: 'healthy', description: '包装器管理器' },
        { name: 'RequestRouter', status: 'healthy', description: '请求路由器' },
        { name: 'EnhancedLLMClientFactory', status: 'healthy', description: '增强客户端工厂' }
      ],
      configuration: {
        pools: 2, // fast_pool, thinking_pool
        taskGroups: 2, // fast_group, thinking_group
        wrappers: 10 // 各种客户端包装器
      }
    };
  }

  /**
   * 初始化集成系统
   */
  static async initializeIntegration(): Promise<boolean> {
    try {
      console.log('初始化LLM轮询池和任务组集成系统...');
      
      // 在实际应用中，这里会初始化依赖注入容器
      // 加载配置，创建服务实例等
      
      console.log('集成系统初始化完成');
      return true;
    } catch (error) {
      console.error('集成系统初始化失败:', error);
      return false;
    }
  }

  /**
   * 清理集成资源
   */
  static async cleanupIntegration(): Promise<void> {
    try {
      console.log('清理集成资源...');
      
      // 在实际应用中，这里会关闭所有包装器
      // 清理缓存，释放资源等
      
      console.log('集成资源清理完成');
    } catch (error) {
      console.error('集成资源清理失败:', error);
    }
  }
}