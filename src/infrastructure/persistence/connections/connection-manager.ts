import { injectable, inject } from 'inversify';
import { DataSource, DataSourceOptions } from 'typeorm';
import { ConfigManager } from '../../config/config-manager';

interface DatabaseConfig {
  type?: 'postgres' | 'sqlite';
  host?: string;
  port?: number;
  username?: string;
  password?: string;
  database?: string;
  synchronize?: boolean;
  logging?: boolean;
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

    return {
      type: dbConfig.type || 'postgres',
      host: dbConfig.host || 'localhost',
      port: dbConfig.port || 5432,
      username: dbConfig.username || 'postgres',
      password: dbConfig.password || 'password',
      database: dbConfig.database || 'graph_agent',
      entities: [__dirname + '/../models/*.model.ts'],
      synchronize: dbConfig.synchronize || false,
      logging: dbConfig.logging || false
    };
  }
}