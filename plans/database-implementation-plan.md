# 数据库集成实施计划

## 1. 项目现状

### 1.1 当前状态
- `src/infrastructure/persistence` 目录存在严重过度设计
- 大量未实现或不必要的管理器类
- 配置系统分散，未复用现有配置加载机制
- 代码量大但实用性低

### 1.2 目标状态
- 简洁、实用的数据库集成层
- 只支持 PostgreSQL（第一阶段）
- 复用现有的配置加载系统
- 基础 CRUD 功能可用

## 2. 实施策略

### 2.1 核心原则
1. **删除优先**：先删除所有过度设计的代码
2. **保持简单**：每个类只做一件事
3. **复用现有**：直接使用现有的配置加载系统
4. **逐步验证**：每完成一步都进行测试验证

### 2.2 技术栈
- **数据库**：PostgreSQL（第一阶段）
- **ORM**：TypeORM（保持不变）
- **配置**：复用 `src/infrastructure/config/loading` 系统
- **依赖注入**：InversifyJS（保持不变）

## 3. 实施步骤

### 阶段一：清理过度设计（预计时间：2-3小时）

#### 步骤 1.1：删除不必要的文件

**删除以下文件和目录：**

```bash
# 删除 base 目录下的过度设计文件
src/infrastructure/persistence/base/
  ├── batch-operation-manager.ts          # 未实现
  ├── query-builder-helper.ts             # 过度设计
  ├── query-conditions-applier.ts         # 过度设计
  ├── query-options-builder.ts            # 过度设计
  ├── query-template-manager.ts           # 过度设计
  ├── repository-config.ts                # 配置过于复杂
  ├── repository-error-handler.ts         # 过度设计
  ├── soft-delete-manager.ts              # 当前不需要
  ├── transaction-manager.ts              # 功能重复
  └── type-converter-base.ts              # 过度抽象

# 删除 connections 目录下的重复文件
src/infrastructure/persistence/connections/
  ├── connection-pool.ts                  # 与 ConnectionManager 重复
  └── transaction-manager.ts              # 功能重复

# 删除 migrations 目录（当前不需要）
src/infrastructure/persistence/migrations/
```

**保留以下文件：**
```
src/infrastructure/persistence/base/
  ├── base-repository.ts                  # 需要简化
  └── index.ts                            # 更新导出

src/infrastructure/persistence/connections/
  ├── connection-manager.ts               # 需要简化
  └── index.ts                            # 更新导出
```

#### 步骤 1.2：简化 BaseRepository

**修改文件：`src/infrastructure/persistence/base/base-repository.ts`**

**删除内容：**
- 删除所有管理器相关的导入和初始化
- 删除复杂的查询配置接口
- 删除软删除相关逻辑
- 删除事务管理相关逻辑
- 删除批量操作相关逻辑
- 删除查询模板相关逻辑

**保留内容：**
- 基础 CRUD 方法：findById, save, delete, find
- 抽象方法：getModelClass, toDomain, toModel
- 基础查询选项处理

**简化后的结构：**
```typescript
@injectable()
export abstract class BaseRepository<T, TModel extends ObjectLiteral, TId = ID> implements IRepository<T, TId> {
  protected abstract getModelClass(): new () => TModel;
  
  constructor(
    @inject('ConnectionManager') protected connectionManager: ConnectionManager
  ) {}
  
  // 基础 CRUD 操作
  async findById(id: TId): Promise<T | null> { ... }
  async save(entity: T): Promise<T> { ... }
  async delete(id: TId): Promise<boolean> { ... }
  async find(options?: IQueryOptions): Promise<T[]> { ... }
  
  // 抽象方法：由子类实现映射
  protected abstract toDomain(model: TModel): T;
  protected abstract toModel(domain: T): TModel;
  
  // 工具方法
  protected async getRepository(): Promise<Repository<TModel>> { ... }
}
```

#### 步骤 1.3：简化 ConnectionManager

**修改文件：`src/infrastructure/persistence/connections/connection-manager.ts`**

**删除内容：**
- 删除复杂的数据库配置接口
- 删除不必要的方法
- 删除健康检查（当前不需要）

**保留内容：**
- getConnection() 方法
- closeConnection() 方法
- 基础配置构建逻辑

**简化后的结构：**
```typescript
@injectable()
export class ConnectionManager {
  private connection: DataSource | null = null;
  private config: DataSourceOptions;

  constructor(@inject('ConfigManager') private configManager: ConfigManager) {
    this.config = this.buildConnectionConfig();
  }

  async getConnection(): Promise<DataSource> { ... }
  async closeConnection(): Promise<void> { ... }
  
  private buildConnectionConfig(): DataSourceOptions { ... }
}
```

### 阶段二：配置系统集成（预计时间：2小时）

#### 步骤 2.1：创建数据库配置加载器

**创建文件：`src/infrastructure/config/loading/loaders/database-loader.ts`**

```typescript
import { BaseModuleLoader } from '../base-loader';
import { ConfigFile } from '../types';
import { ILogger } from '../../../../domain/common/types';

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

export class DatabaseLoader extends BaseModuleLoader {
  readonly moduleType = 'database';

  constructor(logger: ILogger) {
    super(logger);
  }

  protected override async preprocessFiles(files: ConfigFile[]): Promise<ConfigFile[]> {
    return files.map(file => {
      if (file.path.includes('.local.toml')) {
        file.priority += 1000;
      } else if (file.path.includes('.default.toml')) {
        file.priority += 100;
      } else {
        file.priority += 500;
      }
      return file;
    });
  }

  protected async validateConfig(config: Record<string, any>): Promise<boolean> {
    const required = ['type', 'host', 'port', 'username', 'password', 'database'];
    
    for (const field of required) {
      if (!config[field]) {
        throw new Error(`Database configuration missing required field: ${field}`);
      }
    }

    if (!['postgres', 'sqlite'].includes(config.type)) {
      throw new Error(`Unsupported database type: ${config.type}`);
    }

    return true;
  }
}
```

#### 步骤 2.2：注册数据库加载器

**修改文件：`src/infrastructure/config/loading/config-loading-module.ts`**

在 `registerDefaultLoaders()` 方法中添加：

```typescript
private registerDefaultLoaders(): void {
  // ... 现有加载器 ...
  this.registerLoader(new DatabaseLoader(this.logger));
}
```

**修改文件：`src/infrastructure/config/loading/loaders/index.ts`**

```typescript
export { DatabaseLoader } from './database-loader';
```

#### 步骤 2.3：创建配置文件

**创建文件：`configs/database.default.toml`**

```toml
[database]
type = "postgres"
host = "localhost"
port = 5432
username = "postgres"
password = "postgres"
database = "workflow_agent"
synchronize = false
logging = false
entities = ["src/infrastructure/persistence/models/*.model.ts"]
```

**创建文件：`configs/database.toml`**

```toml
# 生产环境配置（可根据需要修改）
[database]
host = "localhost"
port = 5432
username = "postgres"
password = "password"
database = "workflow_agent_prod"
```

**创建文件：`configs/database.local.toml`（添加到 .gitignore）**

```toml
# 本地开发配置
[database]
host = "localhost"
port = 5432
username = "dev_user"
password = "dev_password"
database = "workflow_agent_dev"
logging = true
synchronize = true
```

#### 步骤 2.4：更新 ConnectionManager 使用配置

**修改文件：`src/infrastructure/persistence/connections/connection-manager.ts`**

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
    const dbConfig = this.configManager.get<DatabaseConfig>('database');
    
    if (!dbConfig) {
      throw new Error('Database configuration not found');
    }

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
}
```

### 阶段三：实现基础仓储（预计时间：3-4小时）

#### 步骤 3.1：实现简化的 BaseRepository

**修改文件：`src/infrastructure/persistence/base/base-repository.ts`**

```typescript
import { injectable } from 'inversify';
import { Repository, FindManyOptions, ObjectLiteral } from 'typeorm';
import { IRepository, IQueryOptions } from '../../../../domain/common/repositories/repository';
import { ID } from '../../../../domain/common/value-objects/id';
import { ConnectionManager } from '../connections/connection-manager';

@injectable()
export abstract class BaseRepository<T, TModel extends ObjectLiteral, TId = ID> implements IRepository<T, TId> {
  protected abstract getModelClass(): new () => TModel;

  constructor(protected connectionManager: ConnectionManager) {}

  async findById(id: TId): Promise<T | null> {
    const repository = await this.getRepository();
    const model = await repository.findOne({ where: { id } as any });
    return model ? this.toDomain(model) : null;
  }

  async save(entity: T): Promise<T> {
    const repository = await this.getRepository();
    const model = this.toModel(entity);
    const saved = await repository.save(model);
    return this.toDomain(saved);
  }

  async delete(id: TId): Promise<boolean> {
    const repository = await this.getRepository();
    const result = await repository.delete(id as any);
    return result.affected > 0;
  }

  async find(options?: IQueryOptions): Promise<T[]> {
    const repository = await this.getRepository();
    const models = await repository.find(this.buildFindOptions(options));
    return models.map(model => this.toDomain(model));
  }

  protected abstract toDomain(model: TModel): T;
  protected abstract toModel(domain: T): TModel;

  protected async getRepository(): Promise<Repository<TModel>> {
    const dataSource = await this.connectionManager.getConnection();
    return dataSource.getRepository(this.getModelClass());
  }

  protected buildFindOptions(options?: IQueryOptions): FindManyOptions<TModel> {
    if (!options) return {};
    
    return {
      skip: options.offset,
      take: options.limit,
      order: options.sort ? { [options.sort.field]: options.sort.order } : undefined
    };
  }
}
```

#### 步骤 3.2：实现 SessionModel

**修改文件：`src/infrastructure/persistence/models/session.model.ts`**

```typescript
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('sessions')
export class SessionModel {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ nullable: true })
  userId?: string;

  @Column('simple-array')
  threadIds!: string[];

  @Column({
    type: 'enum',
    enum: ['active', 'paused', 'closed'],
    default: 'active'
  })
  state!: string;

  @Column('jsonb')
  context!: any;

  @Column('jsonb', { nullable: true })
  metadata?: any;

  @Column({ default: 1 })
  version!: number;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
```

#### 步骤 3.3：实现 SessionRepository

**修改文件：`src/infrastructure/persistence/repositories/session-repository.ts`**

```typescript
import { injectable, inject } from 'inversify';
import { SessionRepository as ISessionRepository } from '../../../../domain/sessions/repositories/session-repository';
import { Session } from '../../../../domain/sessions/entities/session';
import { ID } from '../../../../domain/common/value-objects/id';
import { SessionModel } from '../models/session.model';
import { BaseRepository } from '../base/base-repository';
import { ConnectionManager } from '../connections/connection-manager';

@injectable()
export class SessionRepository extends BaseRepository<Session, SessionModel> implements ISessionRepository {
  constructor(
    @inject('ConnectionManager') connectionManager: ConnectionManager
  ) {
    super(connectionManager);
  }

  protected getModelClass(): new () => SessionModel {
    return SessionModel;
  }

  protected toDomain(model: SessionModel): Session {
    return new Session(
      new ID(model.id),
      model.userId ? new ID(model.userId) : undefined,
      model.threadIds.map(id => new ID(id)),
      model.state as any,
      model.context,
      model.metadata,
      model.version,
      model.createdAt,
      model.updatedAt
    );
  }

  protected toModel(domain: Session): SessionModel {
    const model = new SessionModel();
    model.id = domain.id.value;
    model.userId = domain.userId?.value;
    model.threadIds = domain.threadIds.map(id => id.value);
    model.state = domain.state;
    model.context = domain.context;
    model.metadata = domain.metadata;
    model.version = domain.version;
    model.createdAt = domain.createdAt;
    model.updatedAt = domain.updatedAt;
    return model;
  }

  async findByUserId(userId: ID): Promise<Session[]> {
    const repository = await this.getRepository();
    const models = await repository.find({ where: { userId: userId.value } });
    return models.map(model => this.toDomain(model));
  }

  async findActive(): Promise<Session[]> {
    const repository = await this.getRepository();
    const models = await repository.find({ where: { state: 'active' } });
    return models.map(model => this.toDomain(model));
  }
}
```

#### 步骤 3.4：实现 ThreadModel 和 ThreadRepository

**修改文件：`src/infrastructure/persistence/models/thread.model.ts`**

```typescript
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne } from 'typeorm';
import { SessionModel } from './session.model';

@Entity('threads')
export class ThreadModel {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  sessionId!: string;

  @Column()
  title!: string;

  @Column('jsonb', { nullable: true })
  metadata?: any;

  @Column({ default: true })
  isActive!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @ManyToOne(() => SessionModel, session => session.threads)
  session?: SessionModel;
}
```

**修改文件：`src/infrastructure/persistence/repositories/thread-repository.ts`**

```typescript
import { injectable, inject } from 'inversify';
import { ThreadRepository as IThreadRepository } from '../../../../domain/threads/repositories/thread-repository';
import { Thread } from '../../../../domain/threads/entities/thread';
import { ID } from '../../../../domain/common/value-objects/id';
import { ThreadModel } from '../models/thread.model';
import { BaseRepository } from '../base/base-repository';
import { ConnectionManager } from '../connections/connection-manager';

@injectable()
export class ThreadRepository extends BaseRepository<Thread, ThreadModel> implements IThreadRepository {
  constructor(
    @inject('ConnectionManager') connectionManager: ConnectionManager
  ) {
    super(connectionManager);
  }

  protected getModelClass(): new () => ThreadModel {
    return ThreadModel;
  }

  protected toDomain(model: ThreadModel): Thread {
    return new Thread(
      new ID(model.id),
      new ID(model.sessionId),
      model.title,
      model.metadata,
      model.isActive,
      model.createdAt,
      model.updatedAt
    );
  }

  protected toModel(domain: Thread): ThreadModel {
    const model = new ThreadModel();
    model.id = domain.id.value;
    model.sessionId = domain.sessionId.value;
    model.title = domain.title;
    model.metadata = domain.metadata;
    model.isActive = domain.isActive;
    model.createdAt = domain.createdAt;
    model.updatedAt = domain.updatedAt;
    return model;
  }

  async findBySessionId(sessionId: ID): Promise<Thread[]> {
    const repository = await this.getRepository();
    const models = await repository.find({ where: { sessionId: sessionId.value } });
    return models.map(model => this.toDomain(model));
  }

  async findActiveBySessionId(sessionId: ID): Promise<Thread[]> {
    const repository = await this.getRepository();
    const models = await repository.find({ 
      where: { sessionId: sessionId.value, isActive: true } 
    });
    return models.map(model => this.toDomain(model));
  }
}
```

### 阶段四：集成和测试（预计时间：2-3小时）

#### 步骤 4.1：更新索引文件

**修改文件：`src/infrastructure/persistence/index.ts`**

```typescript
export { ConnectionManager } from './connections/connection-manager';
export { BaseRepository } from './base/base-repository';

export { SessionModel } from './models/session.model';
export { ThreadModel } from './models/thread.model';

export { SessionRepository } from './repositories/session-repository';
export { ThreadRepository } from './repositories/thread-repository';
```

**修改文件：`src/infrastructure/persistence/base/index.ts`**

```typescript
export { BaseRepository } from './base-repository';
```

**修改文件：`src/infrastructure/persistence/connections/index.ts`**

```typescript
export { ConnectionManager } from './connection-manager';
```

**修改文件：`src/infrastructure/persistence/models/index.ts`**

```typescript
export { SessionModel } from './session.model';
export { ThreadModel } from './thread.model';
```

**修改文件：`src/infrastructure/persistence/repositories/index.ts`**

```typescript
export { SessionRepository } from './session-repository';
export { ThreadRepository } from './thread-repository';
```

#### 步骤 4.2：创建测试文件

**创建文件：`src/infrastructure/persistence/__tests__/connection-manager.test.ts`**

```typescript
import { ConnectionManager } from '../connections/connection-manager';
import { ConfigManager } from '../../../config/config-manager';

describe('ConnectionManager', () => {
  let connectionManager: ConnectionManager;
  let configManager: ConfigManager;

  beforeEach(() => {
    configManager = new ConfigManager();
    connectionManager = new ConnectionManager(configManager);
  });

  afterEach(async () => {
    await connectionManager.closeConnection();
  });

  test('should get connection successfully', async () => {
    const connection = await connectionManager.getConnection();
    expect(connection).toBeDefined();
    expect(connection.isInitialized).toBe(true);
  });

  test('should close connection successfully', async () => {
    await connectionManager.getConnection();
    await connectionManager.closeConnection();
    
    const connection = await connectionManager.getConnection();
    expect(connection.isInitialized).toBe(true);
  });
});
```

**创建文件：`src/infrastructure/persistence/__tests__/session-repository.test.ts`**

```typescript
import { SessionRepository } from '../repositories/session-repository';
import { ConnectionManager } from '../connections/connection-manager';
import { Session } from '../../../../domain/sessions/entities/session';
import { ID } from '../../../../domain/common/value-objects/id';

describe('SessionRepository', () => {
  let repository: SessionRepository;
  let connectionManager: ConnectionManager;

  beforeEach(() => {
    connectionManager = new ConnectionManager(configManager);
    repository = new SessionRepository(connectionManager);
  });

  test('should save and find session', async () => {
    const session = new Session(
      new ID(),
      new ID('user-123'),
      [new ID('thread-1')],
      'active',
      { test: true },
      null,
      1,
      new Date(),
      new Date()
    );

    const saved = await repository.save(session);
    expect(saved.id).toEqual(session.id);

    const found = await repository.findById(session.id);
    expect(found).toBeDefined();
    expect(found?.id).toEqual(session.id);
  });
});
```

#### 步骤 4.3：创建集成测试

**创建文件：`src/infrastructure/persistence/__tests__/integration.test.ts`**

```typescript
import { Container } from 'inversify';
import { ConnectionManager } from '../connections/connection-manager';
import { SessionRepository } from '../repositories/session-repository';
import { ThreadRepository } from '../repositories/thread-repository';
import { ConfigLoadingModule } from '../../config/loading/config-loading-module';
import { ConfigManager } from '../../config/config-manager';

describe('Persistence Integration', () => {
  let container: Container;
  let connectionManager: ConnectionManager;
  let sessionRepository: SessionRepository;
  let threadRepository: ThreadRepository;

  beforeAll(async () => {
    // 初始化配置
    const configModule = new ConfigLoadingModule(logger);
    await configModule.loadConfig();

    // 设置依赖注入
    container = new Container();
    container.bind<ConnectionManager>('ConnectionManager').to(ConnectionManager);
    container.bind<SessionRepository>('SessionRepository').to(SessionRepository);
    container.bind<ThreadRepository>('ThreadRepository').to(ThreadRepository);

    connectionManager = container.get<ConnectionManager>('ConnectionManager');
    sessionRepository = container.get<SessionRepository>('SessionRepository');
    threadRepository = container.get<ThreadRepository>('ThreadRepository');
  });

  afterAll(async () => {
    await connectionManager.closeConnection();
  });

  test('should perform complete workflow', async () => {
    // 创建会话
    const session = await sessionRepository.save(new Session(...));
    expect(session.id).toBeDefined();

    // 创建线程
    const thread = await threadRepository.save(new Thread(...));
    expect(thread.id).toBeDefined();

    // 查询验证
    const foundSession = await sessionRepository.findById(session.id);
    expect(foundSession).toBeDefined();

    const foundThread = await threadRepository.findById(thread.id);
    expect(foundThread).toBeDefined();
  });
});
```

#### 步骤 4.4：手动测试验证

**创建测试脚本：`scripts/test-database.js`**

```javascript
const { Container } = require('inversify');

async function testDatabase() {
  console.log('Testing database connection...');
  
  try {
    // 初始化配置
    const configModule = new ConfigLoadingModule(logger);
    await configModule.loadConfig();
    
    // 测试连接
    const connectionManager = container.get('ConnectionManager');
    const connection = await connectionManager.getConnection();
    
    console.log('✓ Database connection successful');
    console.log(`  - Type: ${connection.options.type}`);
    console.log(`  - Host: ${connection.options.host}`);
    
    // 测试仓储操作
    const sessionRepo = container.get('SessionRepository');
    const sessions = await sessionRepo.find();
    
    console.log(`✓ Session repository working (${sessions.length} sessions found)`);
    
    await connectionManager.closeConnection();
    console.log('✓ Database connection closed');
    
  } catch (error) {
    console.error('✗ Database test failed:', error.message);
    process.exit(1);
  }
}

testDatabase();
```

**运行测试：**
```bash
npm run test:persistence
node scripts/test-database.js
```

## 4. 验证清单

### 4.1 代码质量检查
- [ ] 所有不必要的文件已删除
- [ ] BaseRepository 只包含基础 CRUD 方法
- [ ] ConnectionManager 只包含连接管理功能
- [ ] 没有未使用的导入和变量
- [ ] 代码注释清晰简洁

### 4.2 功能验证
- [ ] 配置加载正常工作
- [ ] 数据库连接成功建立
- [ ] SessionRepository 基础操作正常
- [ ] ThreadRepository 基础操作正常
- [ ] 数据映射正确（Domain ↔ Model）

### 4.3 测试覆盖
- [ ] ConnectionManager 有单元测试
- [ ] BaseRepository 有单元测试
- [ ] SessionRepository 有单元测试
- [ ] ThreadRepository 有单元测试
- [ ] 有集成测试验证完整流程

### 4.4 文档完善
- [ ] 配置说明文档（configs/README.md）
- [ ] 数据库集成使用文档
- [ ] 开发环境搭建指南
- [ ] 常见问题解答

## 5. 后续扩展计划（按需实施）

### 5.1 短期扩展（按需）
- [ ] MessageModel 和 MessageRepository
- [ ] WorkflowModel 和 WorkflowRepository
- [ ] HistoryModel 和 HistoryRepository
- [ ] CheckpointModel 和 CheckpointRepository

### 5.2 中期扩展（按需）
- [ ] 软删除功能（如果业务需要）
- [ ] 批量操作优化（如果性能需要）
- [ ] 查询构建器增强（如果查询复杂）
- [ ] 事务管理增强（如果需要复杂事务）

### 5.3 长期扩展（按需）
- [ ] 数据库迁移系统
- [ ] 性能监控和优化
- [ ] 读写分离支持
- [ ] 多租户支持

## 6. 风险评估和应对

### 6.1 技术风险

**风险1：配置加载失败**
- **应对**：添加详细的错误日志，提供配置示例

**风险2：数据库连接失败**
- **应对**：提供连接测试脚本，详细的错误处理

**风险3：数据映射错误**
- **应对**：编写完整的单元测试，验证映射逻辑

### 6.2 时间风险

**风险：实施时间超出预期**
- **应对**：
  - 优先完成核心功能（阶段一和阶段二）
  - 测试可以简化，先保证基本功能可用
  - 后续功能可以按需实施

### 6.3 质量风险

**风险：简化过度导致后续扩展困难**
- **应对**：
  - 保持接口清晰和稳定
  - 添加必要的抽象（如 BaseRepository）
  - 预留合理的扩展点

## 7. 成功标准

### 7.1 功能标准
- [ ] 能够成功连接到 PostgreSQL 数据库
- [ ] 能够执行 Session 的增删改查操作
- [ ] 能够执行 Thread 的增删改查操作
- [ ] 配置系统正常工作，支持多环境

### 7.2 代码质量标准
- [ ] 代码量减少 60% 以上
- [ ] 没有过度设计的代码
- [ ] 每个类职责单一
- [ ] 接口清晰稳定

### 7.3 可维护性标准
- [ ] 新开发者能够快速理解代码
- [ ] 添加新功能不需要修改现有代码
- [ ] 测试覆盖核心功能
- [ ] 文档完善清晰

## 8. 实施时间表

| 阶段 | 任务 | 预计时间 | 实际时间 | 状态 |
|------|------|----------|----------|------|
| 一 | 清理过度设计 | 2-3小时 | | 待开始 |
| 二 | 配置系统集成 | 2小时 | | 待开始 |
| 三 | 基础仓储实现 | 3-4小时 | | 待开始 |
| 四 | 集成和测试 | 2-3小时 | | 待开始 |
| **总计** | | **9-12小时** | | |

**建议：** 分两天完成，每天 4-6 小时，避免疲劳导致的错误。