# 数据库配置集成方案

## 1. 现有配置系统分析

### 1.1 配置加载架构

当前项目的配置加载系统位于 `src/infrastructure/config/loading/`，采用模块化设计：

```
config/loading/
├── base-loader.ts              # 基础加载器
├── config-loading-module.ts    # 配置加载主模块
├── discovery.ts                # 配置发现
├── loaders/                    # 各类加载器
│   ├── llm-loader.ts          # LLM配置加载
│   ├── pool-config-loader.ts  # 轮询池配置加载
│   ├── tool-loader.ts         # 工具配置加载
│   └── ...
└── types.ts                    # 类型定义
```

### 1.2 加载器实现模式

所有加载器都继承自 `BaseModuleLoader`，实现以下核心功能：

1. **moduleType**: 定义加载的模块类型（如 'llm', 'pool'）
2. **preprocessFiles**: 预处理配置文件（调整优先级等）
3. **mergeConfigs**: 合并多个配置
4. **validateConfig**: 验证配置有效性

### 1.3 配置存储位置

配置文件存储在 `configs/` 目录下，按模块类型组织：

```
configs/
├── llm/
│   ├── common.toml
│   └── providers/
├── tools/
│   └── common.toml
└── workflows/
    └── common.toml
```

## 2. 数据库配置集成设计

### 2.1 创建数据库配置加载器

#### 文件：`src/infrastructure/config/loading/loaders/database-loader.ts`

```typescript
/**
 * 数据库配置加载器
 * 
 * 负责加载和验证数据库配置，支持 PostgreSQL 和 SQLite
 */

import { BaseModuleLoader } from '../base-loader';
import { ConfigFile, ModuleConfig, ModuleMetadata } from '../types';
import { ILogger } from '../../../../domain/common/types';

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
  entities?: string[];
}

/**
 * 数据库配置加载器
 */
export class DatabaseLoader extends BaseModuleLoader {
  readonly moduleType = 'database';

  constructor(logger: ILogger) {
    super(logger);
  }

  /**
   * 预处理数据库配置文件
   * 
   * 优先级规则：
   * 1. database.local.toml（最高优先级）
   * 2. database.toml
   * 3. database.default.toml（最低优先级）
   */
  protected override async preprocessFiles(files: ConfigFile[]): Promise<ConfigFile[]> {
    return files.map(file => {
      // 本地配置优先级最高
      if (file.path.includes('.local.toml')) {
        file.priority += 1000;
      }
      // 默认配置优先级最低
      else if (file.path.includes('.default.toml')) {
        file.priority += 100;
      }
      // 标准配置居中
      else {
        file.priority += 500;
      }
      
      return file;
    });
  }

  /**
   * 合并数据库配置
   * 
   * 按优先级合并，高优先级覆盖低优先级
   */
  protected async mergeConfigs(configs: Record<string, any>[]): Promise<Record<string, any>> {
    if (configs.length === 0) {
      throw new Error('No database configuration found');
    }

    // 按优先级排序（高优先级在前）
    const sortedConfigs = configs.sort((a, b) => (b.priority || 0) - (a.priority || 0));
    
    // 从最低优先级开始合并
    const result = sortedConfigs.reduceRight((merged, config) => {
      return this.deepMerge(merged, config);
    }, {});

    return result;
  }

  /**
   * 验证数据库配置
   */
  protected async validateConfig(config: Record<string, any>): Promise<boolean> {
    const requiredFields = ['type', 'host', 'port', 'username', 'password', 'database'];
    
    for (const field of requiredFields) {
      if (!config[field]) {
        throw new Error(`Database configuration missing required field: ${field}`);
      }
    }

    // 验证数据库类型
    if (!['postgres', 'sqlite'].includes(config.type)) {
      throw new Error(`Unsupported database type: ${config.type}. Supported types: postgres, sqlite`);
    }

    // 验证端口号
    if (typeof config.port !== 'number' || config.port < 1 || config.port > 65535) {
      throw new Error(`Invalid port number: ${config.port}`);
    }

    return true;
  }

  /**
   * 深度合并配置对象
   */
  private deepMerge(target: any, source: any): any {
    const result = { ...target };
    
    for (const key in source) {
      if (source[key] === null || source[key] === undefined) {
        continue;
      }
      
      if (typeof source[key] === 'object' && !Array.isArray(source[key])) {
        result[key] = this.deepMerge(result[key] || {}, source[key]);
      } else {
        result[key] = source[key];
      }
    }
    
    return result;
  }
}
```

### 2.2 配置加载器注册

#### 文件：`src/infrastructure/config/loading/loaders/index.ts`

```typescript
// 现有导出
export { LLMLoader } from './llm-loader';
export { ToolLoader } from './tool-loader';
export { WorkflowFunctionLoader } from './workflow-function-loader';
export { PromptLoader } from './prompt-loader';
export { PoolConfigLoader } from './pool-config-loader';
export { TaskGroupConfigLoader } from './task-group-config-loader';

// 添加数据库加载器
export { DatabaseLoader } from './database-loader';
```

### 2.3 配置加载模块集成

#### 文件：`src/infrastructure/config/loading/config-loading-module.ts`

在构造函数中添加数据库加载器：

```typescript
export class ConfigLoadingModule {
  // ... 现有代码 ...

  constructor(
    logger: ILogger,
    options: ConfigLoadingModuleOptions = {}
  ) {
    this.logger = logger.child({ module: 'ConfigLoadingModule' });
    this.options = {
      cacheTTL: 300000,
      enableCache: true,
      enableValidation: true,
      enablePreValidation: true,
      validationSeverityThreshold: 'error',
      ...options
    };

    // 初始化组件
    this.discovery = new ConfigDiscovery(logger);
    this.resolver = new DependencyResolver();
    this.registry = new TypeRegistry();
    this.cache = new LoadingCache(this.options.cacheTTL!, this.options.enableCache!);
    this.ruleManager = new RuleManager(logger);

    // 注册默认加载器
    this.registerDefaultLoaders();
  }

  /**
   * 注册默认加载器
   */
  private registerDefaultLoaders(): void {
    // 现有加载器
    this.registerLoader(new LLMLoader(this.logger));
    this.registerLoader(new ToolLoader(this.logger));
    this.registerLoader(new WorkflowFunctionLoader(this.logger));
    this.registerLoader(new PromptLoader(this.logger));
    this.registerLoader(new PoolConfigLoader(this.logger));
    this.registerLoader(new TaskGroupConfigLoader(this.logger));
    
    // 添加数据库加载器
    this.registerLoader(new DatabaseLoader(this.logger));
  }

  // ... 其余代码 ...
}
```

### 2.4 配置文件结构

#### 文件：`configs/database.toml`

```toml
# 数据库基础配置
[database]
type = "postgres"              # 数据库类型: postgres, sqlite
host = "localhost"            # 数据库主机
port = 5432                     # 数据库端口
username = "postgres"         # 数据库用户名
password = "password"         # 数据库密码
database = "workflow_agent"   # 数据库名称

# 数据库行为配置
synchronize = false            # 是否自动同步实体结构（开发环境可设为 true）
logging = false                # 是否启用 SQL 日志

# 实体路径配置
entities = [
  "src/infrastructure/persistence/models/*.model.ts"
]
```

#### 文件：`configs/database.local.toml`（本地开发配置）

```toml
# 本地开发配置，优先级高于 database.toml
[database]
host = "localhost"
port = 5432
username = "dev_user"
password = "dev_password"
database = "workflow_agent_dev"

# 开发环境启用日志
logging = true
synchronize = true
```

#### 文件：`configs/database.default.toml`（默认配置）

```toml
# 默认配置，优先级最低
[database]
type = "postgres"
host = "localhost"
port = 5432
username = "postgres"
password = "postgres"
database = "workflow_agent"
synchronize = false
logging = false
```

### 2.5 环境变量支持

通过现有的 `EnvironmentProcessor` 支持环境变量覆盖：

```bash
# 数据库连接配置
DB_TYPE=postgres
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=password
DB_DATABASE=workflow_agent

# 数据库行为配置
DB_SYNCHRONIZE=false
DB_LOGGING=false
```

环境变量会自动映射到配置路径 `database.type`, `database.host` 等。

### 2.6 在 Persistence 层使用配置

#### 文件：`src/infrastructure/persistence/connections/connection-manager.ts`

```typescript
import { injectable, inject } from 'inversify';
import { DataSource, DataSourceOptions } from 'typeorm';
import { ConfigManager } from '../../config/config-manager';
import { DatabaseConfig } from '../../config/loading/loaders/database-loader';

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
    // 从 ConfigManager 获取数据库配置
    const dbConfig = this.configManager.get<DatabaseConfig>('database');
    
    if (!dbConfig) {
      throw new Error('Database configuration not found. Please check configs/database.toml');
    }

    // 验证必要字段
    this.validateConfig(dbConfig);

    return {
      type: dbConfig.type,
      host: dbConfig.host,
      port: dbConfig.port,
      username: dbConfig.username,
      password: dbConfig.password,
      database: dbConfig.database,
      entities: dbConfig.entities || [__dirname + '/../models/*.model.ts'],
      synchronize: dbConfig.synchronize || false,
      logging: dbConfig.logging || false
    };
  }

  private validateConfig(config: DatabaseConfig): void {
    const required = ['type', 'host', 'port', 'username', 'password', 'database'];
    
    for (const field of required) {
      if (!config[field]) {
        throw new Error(`Database configuration missing required field: ${field}`);
      }
    }

    if (!['postgres', 'sqlite'].includes(config.type)) {
      throw new Error(`Unsupported database type: ${config.type}`);
    }
  }
}
```

## 3. 配置加载流程

### 3.1 启动时加载流程

```
1. 应用启动
   ↓
2. ConfigLoadingModule 初始化
   ↓
3. 注册 DatabaseLoader
   ↓
4. 扫描 configs/ 目录
   ↓
5. 发现 database*.toml 文件
   ↓
6. 按优先级排序配置
   ↓
7. 合并配置（高优先级覆盖低优先级）
   ↓
8. 验证配置完整性
   ↓
9. 存储到 ConfigManager
   ↓
10. ConnectionManager 获取配置
    ↓
11. 初始化数据库连接
```

### 3.2 配置优先级规则

1. **最高优先级**：环境变量（通过 EnvironmentProcessor）
2. **高优先级**：`database.local.toml`
3. **中优先级**：`database.toml`
4. **低优先级**：`database.default.toml`
5. **最低优先级**：代码中的默认值

### 3.3 配置合并示例

**database.default.toml:**
```toml
[database]
type = "postgres"
host = "localhost"
port = 5432
username = "postgres"
password = "postgres"
database = "workflow_agent"
logging = false
```

**database.toml:**
```toml
[database]
host = "prod-db.example.com"
username = "prod_user"
database = "workflow_agent_prod"
```

**database.local.toml:**
```toml
[database]
host = "localhost"
username = "dev_user"
logging = true
```

**最终配置:**
```toml
[database]
type = "postgres"              # 来自 default
host = "localhost"             # 来自 local（覆盖 database.toml）
port = 5432                    # 来自 default
username = "dev_user"          # 来自 local（覆盖 database.toml）
password = "postgres"          # 来自 default
database = "workflow_agent_prod" # 来自 database.toml（覆盖 default）
logging = true                 # 来自 local（覆盖 default）
```

## 4. 使用示例

### 4.1 基础使用

```typescript
// 在应用初始化时
const configModule = new ConfigLoadingModule(logger);
await configModule.loadConfig();

// 获取数据库配置
const dbConfig = configManager.get<DatabaseConfig>('database');
console.log(`Connecting to ${dbConfig.host}:${dbConfig.port}`);
```

### 4.2 在仓储中使用

```typescript
@injectable()
export class SessionRepository extends BaseRepository<Session, SessionModel> {
  constructor(
    @inject('ConnectionManager') connectionManager: ConnectionManager
  ) {
    super(connectionManager);
  }

  protected getModelClass(): new () => SessionModel {
    return SessionModel;
  }

  protected toDomain(model: SessionModel): Session {
    // 映射逻辑
  }

  protected toModel(domain: Session): SessionModel {
    // 映射逻辑
  }
}
```

### 4.3 多环境配置

**开发环境:**
```bash
# .env.development
DB_HOST=localhost
DB_DATABASE=workflow_agent_dev
DB_LOGGING=true
DB_SYNCHRONIZE=true
```

**生产环境:**
```bash
# .env.production
DB_HOST=prod-db.example.com
DB_DATABASE=workflow_agent_prod
DB_LOGGING=false
DB_SYNCHRONIZE=false
```

## 5. 优势

### 5.1 复用现有系统
- 无需重新实现配置加载逻辑
- 复用优先级管理、合并、验证等功能
- 统一的配置管理接口

### 5.2 灵活性
- 支持多文件配置
- 支持环境变量覆盖
- 支持本地开发配置
- 支持多环境部署

### 5.3 可维护性
- 配置集中管理
- 清晰的优先级规则
- 完善的验证机制
- 易于调试和排查问题

### 5.4 扩展性
- 可以轻松添加新的数据库类型
- 可以扩展配置验证规则
- 可以添加配置转换逻辑
