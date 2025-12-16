import { injectable, inject } from 'inversify';
import { DataSource, DataSourceOptions } from 'typeorm';
import { ConfigManager } from '../../config/config-manager';

interface DatabaseConfig {
  type?: 'postgres' | 'mysql' | 'sqlite' | 'mariadb' | 'mssql';
  host?: string;
  port?: number;
  username?: string;
  password?: string;
  database?: string;
  synchronize?: boolean;
  logging?: boolean;
  ssl?: boolean;
  extra?: any;
  connectionLimit?: number;
  acquireTimeout?: number;
  timeout?: number;
  reconnect?: boolean;
}

@injectable()
export class ConnectionManager {
  private connection: DataSource | null = null;
  private config: DataSourceOptions;

  constructor(@inject('ConfigManager') private configManager: ConfigManager) {
    this.config = this.buildConnectionConfig();
  }

  async getConnection(): Promise<DataSource> {
    if (!this.connection || !this.connection.isInitialized) {
      this.connection = new DataSource(this.config);
      await this.connection.initialize();
    }
    return this.connection;
  }

  async closeConnection(): Promise<void> {
    if (this.connection && this.connection.isConnected) {
      await this.connection.close();
      this.connection = null;
    }
  }

  private buildConnectionConfig(): DataSourceOptions {
    const dbConfig = this.configManager.get<DatabaseConfig>('database', {});

    const config: any = {
      type: dbConfig.type || 'postgres',
      host: dbConfig.host || 'localhost',
      port: dbConfig.port || 5432,
      username: dbConfig.username || 'postgres',
      password: dbConfig.password || 'password',
      database: dbConfig.database || 'workflow_agent',
      entities: [__dirname + '/../models/*.model.ts'],
      synchronize: dbConfig.synchronize || false,
      logging: dbConfig.logging || false,
      ssl: dbConfig.ssl || false,
      extra: {
        ...dbConfig.extra,
        connectionLimit: dbConfig.connectionLimit || 10,
        acquireTimeout: dbConfig.acquireTimeout || 60000,
        timeout: dbConfig.timeout || 60000,
        reconnect: dbConfig.reconnect !== false,
      }
    };

    return config as DataSourceOptions;
  }

  async createQueryRunner() {
    const connection = await this.getConnection();
    return connection.createQueryRunner();
  }

  async healthCheck(): Promise<boolean> {
    try {
      const connection = await this.getConnection();
      await connection.query('SELECT 1');
      return true;
    } catch (error) {
      console.error('Database health check failed:', error);
      return false;
    }
  }
}