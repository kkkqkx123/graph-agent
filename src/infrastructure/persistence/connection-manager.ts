import { injectable, inject } from 'inversify';
import { DataSource, DataSourceOptions } from 'typeorm';
import { ConfigLoadingModule } from '../config/loading/config-loading-module';
import { DatabaseConfig } from '../config/loading/schemas';
import { ILogger } from '../../domain/common/types/logger-types';
import { TYPES } from '../../di/service-keys';

/**
 * 连接健康检查结果
 */
export interface HealthCheckResult {
  /** 健康状态 */
  status: 'healthy' | 'unhealthy';
  /** 延迟（毫秒） */
  latency: number;
  /** 错误信息 */
  error?: string;
}

@injectable()
export class ConnectionManager {
  private connection: DataSource | null = null;
  private config: DataSourceOptions;
  private healthCheckInterval: NodeJS.Timeout | null = null;

  constructor(
    @inject(TYPES.ConfigLoadingModule) private configManager: ConfigLoadingModule,
    @inject(TYPES.Logger) private logger: ILogger
  ) {
    this.config = this.buildConnectionConfig();
  }

  /**
   * 获取数据库连接
   */
  async getConnection(): Promise<DataSource> {
    if (!this.connection || !this.connection.isInitialized) {
      this.connection = new DataSource(this.config);
      await this.connection.initialize();
      const logData: Record<string, any> = { database: this.config.database };
      if (this.config.type === 'postgres' && 'host' in this.config) {
        logData['host'] = this.config['host'];
      }
      this.logger.info('数据库连接已建立', logData);
    }
    return this.connection;
  }

  /**
   * 关闭数据库连接
   */
  async closeConnection(): Promise<void> {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }

    if (this.connection && this.connection.isInitialized) {
      await this.connection.close();
      this.connection = null;
      this.logger.info('数据库连接已关闭');
    }
  }

  /**
   * 健康检查
   */
  async healthCheck(): Promise<HealthCheckResult> {
    const start = Date.now();
    try {
      const connection = await this.getConnection();
      await connection.query('SELECT 1');
      return {
        status: 'healthy',
        latency: Date.now() - start,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error('数据库健康检查失败', error as Error);
      return {
        status: 'unhealthy',
        latency: Date.now() - start,
        error: errorMessage,
      };
    }
  }

  /**
   * 启动定期健康检查
   */
  startHealthCheck(intervalMs: number = 30000): void {
    if (this.healthCheckInterval) {
      this.logger.warn('健康检查已在运行');
      return;
    }

    this.healthCheckInterval = setInterval(async () => {
      const result = await this.healthCheck();
      if (result.status === 'unhealthy') {
        this.logger.error('数据库健康检查失败', undefined, {
          latency: result.latency,
          error: result.error,
        });
      }
    }, intervalMs);

    this.logger.info('定期健康检查已启动', { intervalMs });
  }

  /**
   * 停止定期健康检查
   */
  stopHealthCheck(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
      this.logger.info('定期健康检查已停止');
    }
  }

  /**
   * 构建连接配置
   */
  private buildConnectionConfig(): DataSourceOptions {
    const dbConfig = this.configManager.get<DatabaseConfig>('database', {});
    const dbType = dbConfig.type || 'postgres';

    if (dbType === 'sqlite') {
      return {
        type: 'sqlite',
        database: dbConfig.database || 'graph_agent.db',
        entities: [__dirname + '/../models/*.model.ts'],
        synchronize: dbConfig.synchronize || false,
        logging: dbConfig.logging || false,
      } as DataSourceOptions;
    }

    // PostgreSQL configuration
    return {
      type: 'postgres',
      host: dbConfig.host || 'localhost',
      port: dbConfig.port || 5432,
      username: dbConfig.username || 'postgres',
      password: dbConfig.password || 'password',
      database: dbConfig.database || 'graph_agent',
      entities: [__dirname + '/../models/*.model.ts'],
      synchronize: dbConfig.synchronize || false,
      logging: dbConfig.logging || false,
      // 连接池配置
      poolSize: dbConfig.poolSize || 10,
      extra: {
        max: dbConfig.maxConnections || 10,
        min: dbConfig.minConnections || 2,
        idleTimeoutMillis: dbConfig.idleTimeout || 30000,
        connectionTimeoutMillis: dbConfig.connectionTimeout || 2000,
        acquireTimeoutMillis: dbConfig.acquireTimeout || 10000,
        reapIntervalMillis: 1000,
        createRetryIntervalMillis: 200,
      },
    } as DataSourceOptions;
  }
}
