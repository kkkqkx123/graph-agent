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
export class ConnectionPool {
  private connections: Map<string, DataSource> = new Map();
  private config: DataSourceOptions;
  private maxConnections: number;
  private currentConnections: number = 0;

  constructor(@inject('ConfigManager') private configManager: ConfigManager) {
    this.config = this.buildConnectionConfig();
    this.maxConnections = this.configManager.get('database.maxConnections', 10);
  }

  async getConnection(name: string = 'default'): Promise<DataSource> {
    // 检查是否已有可用连接
    const existingConnection = this.connections.get(name);
    if (existingConnection && existingConnection.isInitialized) {
      return existingConnection;
    }

    // 检查连接池是否已满
    if (this.currentConnections >= this.maxConnections) {
      throw new Error('Connection pool is full');
    }

    // 创建新连接
    const connection = await this.createConnection(name);
    this.connections.set(name, connection);
    this.currentConnections++;

    return connection;
  }

  async releaseConnection(name: string = 'default'): Promise<void> {
    const connection = this.connections.get(name);
    if (connection) {
      await connection.close();
      this.connections.delete(name);
      this.currentConnections--;
    }
  }

  async closeAllConnections(): Promise<void> {
    const closePromises = Array.from(this.connections.values()).map(
      connection => connection.close()
    );
    
    await Promise.all(closePromises);
    this.connections.clear();
    this.currentConnections = 0;
  }

  private async createConnection(name: string): Promise<DataSource> {
    const { DataSource } = await import('typeorm');
    
    try {
      const dataSource = new DataSource({
        ...this.config,
        name: name,
      });
      
      await dataSource.initialize();

      return dataSource;
    } catch (error) {
      throw new Error(`Failed to create database connection ${name}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private handleConnectionError(name: string, error: Error): void {
    // 从连接池中移除有问题的连接
    this.connections.delete(name);
    this.currentConnections--;
    
    // 可以在这里添加重连逻辑
    console.error(`Connection ${name} removed from pool due to error:`, error);
  }

  private buildConnectionConfig(): DataSourceOptions {
    const dbConfig = this.configManager.get<DatabaseConfig>('database', {});
    
    const config: any = {
      type: dbConfig.type || 'postgres',
      host: dbConfig.host || 'localhost',
      port: dbConfig.port || 5432,
      username: dbConfig.username || 'postgres',
      password: dbConfig.password || 'password',
      database: dbConfig.database || 'graph_agent',
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

  getPoolStatus(): {
    totalConnections: number;
    maxConnections: number;
    activeConnections: number;
  } {
    return {
      totalConnections: this.currentConnections,
      maxConnections: this.maxConnections,
      activeConnections: this.connections.size,
    };
  }

  async healthCheck(): Promise<{ [key: string]: boolean }> {
    const results: { [key: string]: boolean } = {};
    
    for (const [name, connection] of this.connections) {
      try {
        await connection.query('SELECT 1');
        results[name] = true;
      } catch (error) {
        results[name] = false;
      }
    }
    
    return results;
  }
}