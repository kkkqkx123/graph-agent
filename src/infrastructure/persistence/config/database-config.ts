/**
 * 数据库配置接口
 */
export interface DatabaseConfig {
  type: 'postgres' | 'sqlite';
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
  synchronize?: boolean;
  logging?: boolean;
}

/**
 * 数据库配置验证 schema
 */
export const databaseConfigSchema = {
  type: 'object',
  required: ['type', 'host', 'port', 'username', 'password', 'database'],
  properties: {
    type: { type: 'string', enum: ['postgres', 'sqlite'] },
    host: { type: 'string' },
    port: { type: 'number', minimum: 1, maximum: 65535 },
    username: { type: 'string' },
    password: { type: 'string' },
    database: { type: 'string' },
    synchronize: { type: 'boolean' },
    logging: { type: 'boolean' }
  }
};