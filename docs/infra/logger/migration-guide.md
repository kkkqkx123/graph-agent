# 日志系统迁移指南

## 概述

本指南帮助开发者将现有的日志代码迁移到新的统一日志系统。迁移过程分为几个阶段，确保平滑过渡而不影响现有功能。

## 迁移策略

### 阶段1: 准备工作
1. 安装新的日志系统
2. 配置日志输出
3. 设置依赖注入

### 阶段2: 逐步迁移
1. 替换直接console调用
2. 更新现有ILogger使用
3. 统一日志格式

### 阶段3: 优化和清理
1. 移除旧的日志代码
2. 优化日志级别
3. 添加结构化日志

## 详细迁移步骤

### 1. 安装和配置

#### 1.1 更新依赖注入绑定

确保 `LoggerServiceBindings` 已正确配置：

```typescript
// src/infrastructure/container/bindings/infrastructure-bindings.ts
export class LoggerServiceBindings extends ServiceBindings {
  registerServices(container: IContainer, config: ContainerConfiguration): void {
    // 注册日志服务
    container.registerFactory<ILogger>(
      'ILogger',
      () => LoggerFactory.getInstance().createDefaultLogger(),
      { lifetime: ServiceLifetime.SINGLETON }
    );
  }
}
```

#### 1.2 配置日志输出

更新 `configs/global.toml`：

```toml
# 日志输出配置
[[log_outputs]]
type = "console"
level = "DEBUG"
format = "text"
colorize = true
timestamp = true

[[log_outputs]]
type = "file"
level = "INFO"
format = "json"
path = "logs/agent.log"
rotation = "daily"
max_size = "10MB"
max_files = 7
```

### 2. 迁移console调用

#### 2.1 识别console调用

使用以下命令查找所有console调用：

```bash
grep -r "console\." src/ --include="*.ts"
```

#### 2.2 迁移模式

**原始代码**:
```typescript
console.log('用户登录成功', userData);
console.error('数据库连接失败', error);
console.warn('配置项缺失', configKey);
```

**迁移后**:
```typescript
// 在构造函数中注入日志记录器
constructor(@inject('ILogger') private logger: ILogger) {}

// 使用日志记录器
this.logger.info('用户登录成功', { userData });
this.logger.error('数据库连接失败', error as Error);
this.logger.warn('配置项缺失', { configKey });
```

#### 2.3 批量迁移脚本

创建迁移脚本来自动化处理：

```typescript
// scripts/migrate-logs.ts
import * as fs from 'fs';
import * as path from 'path';

const CONSOLE_PATTERNS = [
  /console\.log\(([^)]+)\)/g,
  /console\.error\(([^)]+)\)/g,
  /console\.warn\(([^)]+)\)/g,
  /console\.debug\(([^)]+)\)/g,
  /console\.info\(([^)]+)\)/g
];

function migrateFile(filePath: string): void {
  let content = fs.readFileSync(filePath, 'utf-8');
  
  // 检查是否已经有ILogger注入
  const hasLogger = content.includes('ILogger') || content.includes('@inject');
  
  if (!hasLogger) {
    // 添加ILogger注入
    content = content.replace(
      /(constructor\s*\([^)]*\))/,
      'constructor(@inject(\'ILogger\') private logger: ILogger)'
    );
  }
  
  // 替换console调用
  content = content.replace(/console\.log\(([^,]+),?\s*([^)]*)\)/g, 'this.logger.info($1, $2)');
  content = content.replace(/console\.error\(([^,]+),?\s*([^)]*)\)/g, 'this.logger.error($1, $2)');
  content = content.replace(/console\.warn\(([^,]+),?\s*([^)]*)\)/g, 'this.logger.warn($1, $2)');
  content = content.replace(/console\.debug\(([^,]+),?\s*([^)]*)\)/g, 'this.logger.debug($1, $2)');
  content = content.replace(/console\.info\(([^,]+),?\s*([^)]*)\)/g, 'this.logger.info($1, $2)');
  
  fs.writeFileSync(filePath, content);
}
```

### 3. 更新现有ILogger使用

#### 3.1 检查现有ILogger使用

```bash
grep -r "ILogger" src/ --include="*.ts"
```

#### 3.2 更新导入语句

**原始代码**:
```typescript
import { ILogger } from '@shared/types/logger';
```

**迁移后**:
```typescript
import { ILogger } from '@shared/types/logger';
// 或者使用新的日志系统导入
import { LoggerFactory } from '../../infrastructure/logging';
```

#### 3.3 更新日志记录器创建

**原始代码**:
```typescript
// 直接创建或手动注入
const logger = container.get<ILogger>('ILogger');
```

**迁移后**:
```typescript
// 使用工厂模式
const logger = LoggerFactory.getInstance().createDefaultLogger();

// 或使用依赖注入
constructor(@inject('ILogger') private logger: ILogger) {}
```

### 4. 分层迁移策略

#### 4.1 Infrastructure层

优先迁移Infrastructure层，因为这是日志系统的核心：

```typescript
// src/infrastructure/database/connection.ts
export class DatabaseConnection {
  constructor(@inject('ILogger') private logger: ILogger) {}

  async connect(): Promise<void> {
    this.logger.debug('正在建立数据库连接', { 
      host: this.config.host,
      port: this.config.port 
    });
    
    try {
      await this.createConnection();
      this.logger.info('数据库连接成功');
    } catch (error) {
      this.logger.error('数据库连接失败', error as Error);
      throw error;
    }
  }
}
```

#### 4.2 Application层

迁移Application层的业务日志：

```typescript
// src/application/services/user-service.ts
export class UserService {
  constructor(
    @inject('ILogger') private logger: ILogger,
    @inject('IUserRepository') private userRepository: IUserRepository
  ) {}

  async createUser(userData: CreateUserRequest): Promise<User> {
    this.logger.info('开始创建用户', { email: userData.email });
    
    try {
      const user = await this.userRepository.create(userData);
      this.logger.info('用户创建成功', { 
        userId: user.id,
        email: user.email 
      });
      return user;
    } catch (error) {
      this.logger.error('用户创建失败', error as Error, { 
        email: userData.email 
      });
      throw error;
    }
  }
}
```

#### 4.3 Domain层

Domain层应该只记录关键业务事件：

```typescript
// src/domain/entities/user.ts
export class User {
  constructor(
    private id: string,
    private email: string,
    @inject('ILogger') private logger: ILogger
  ) {}

  changeEmail(newEmail: string): void {
    if (!this.isValidEmail(newEmail)) {
      throw new InvalidEmailError(newEmail);
    }
    
    const oldEmail = this.email;
    this.email = newEmail;
    
    // 只记录关键业务事件
    this.logger.warn('用户邮箱已更改', {
      userId: this.id,
      oldEmail,
      newEmail
    });
  }
}
```

### 5. 日志级别优化

#### 5.1 级别映射指南

| 原始调用 | 新级别 | 使用场景 |
|---------|--------|----------|
| console.log | INFO | 一般信息 |
| console.error | ERROR | 错误信息 |
| console.warn | WARN | 警告信息 |
| console.debug | DEBUG | 调试信息 |
| - | TRACE | 详细跟踪 |

#### 5.2 级别优化示例

```typescript
// 优化前
console.log('开始处理请求');
console.log('请求参数:', params);
console.log('处理完成');

// 优化后
this.logger.info('开始处理请求', { requestId });
this.logger.debug('请求参数', { params });
this.logger.info('处理完成', { requestId, duration });
```

### 6. 结构化日志

#### 6.1 非结构化到结构化

**非结构化**:
```typescript
console.log(`用户 ${user.name} (ID: ${user.id}) 从 ${ip} 登录成功`);
```

**结构化**:
```typescript
this.logger.info('用户登录成功', {
  userId: user.id,
  userName: user.name,
  ip,
  timestamp: new Date().toISOString(),
  userAgent: request.headers['user-agent']
});
```

#### 6.2 上下文信息

使用子日志记录器提供上下文：

```typescript
// 创建带上下文的日志记录器
const userLogger = this.logger.child({ 
  module: 'UserService',
  userId: user.id 
});

// 使用子日志记录器
userLogger.info('更新用户资料');
userLogger.error('更新失败', error);
```

### 7. 错误处理改进

#### 7.1 错误日志最佳实践

```typescript
// 优化前
try {
  await operation();
} catch (error) {
  console.error('操作失败:', error.message);
}

// 优化后
try {
  await operation();
} catch (error) {
  this.logger.error('操作失败', error as Error, {
    operation: 'userCreation',
    userId: currentUser?.id,
    requestId: context.requestId,
    stack: error.stack
  });
}
```

### 8. 性能优化

#### 8.1 避免不必要的日志计算

```typescript
// 优化前
logger.debug('用户数据:', JSON.stringify(expensiveUserData()));

// 优化后
if (logger.shouldLog('DEBUG')) {
  logger.debug('用户数据', expensiveUserData());
}
```

#### 8.2 异步日志处理

```typescript
// 在应用关闭时确保日志写入完成
process.on('SIGTERM', async () => {
  logger.info('应用正在关闭...');
  await logger.flush();
  await logger.close();
  process.exit(0);
});
```

## 验证和测试

### 1. 迁移验证清单

- [ ] 所有console调用已替换为ILogger
- [ ] 日志级别使用正确
- [ ] 结构化日志格式一致
- [ ] 敏感信息已脱敏
- [ ] 错误日志包含完整上下文
- [ ] 性能影响最小

### 2. 测试日志输出

```typescript
// 创建测试脚本验证日志输出
import { LoggerFactory } from '../src/infrastructure/logging';

async function testLogging() {
  const logger = LoggerFactory.getInstance().createTestLogger();
  
  logger.trace('跟踪信息');
  logger.debug('调试信息', { debug: true });
  logger.info('一般信息');
  logger.warn('警告信息');
  logger.error('错误信息', new Error('测试错误'));
  logger.fatal('致命错误', new Error('致命错误'));
  
  await logger.flush();
  await logger.close();
}

testLogging().catch(console.error);
```

### 3. 集成测试

```typescript
describe('日志系统集成测试', () => {
  let logger: ILogger;
  
  beforeEach(() => {
    logger = LoggerFactory.getInstance().createTestLogger();
  });
  
  afterEach(async () => {
    await logger.close();
  });
  
  it('应该正确记录不同级别的日志', () => {
    const spy = jest.spyOn(console, 'log');
    
    logger.info('测试消息');
    
    expect(spy).toHaveBeenCalledWith(
      expect.stringContaining('INFO')
    );
  });
});
```

## 常见问题和解决方案

### 1. 问题: 日志没有输出

**原因**: 日志级别配置过高
**解决**: 检查并调整日志级别配置

```typescript
// 检查当前配置
const config = LoggerFactory.getInstance().getConfigManager().getConfig();
console.log('当前日志级别:', config.level);
```

### 2. 问题: 文件日志不工作

**原因**: 文件路径权限问题
**解决**: 确保日志目录存在且有写权限

```typescript
// 确保日志目录存在
import * as fs from 'fs';
import * as path from 'path';

const logDir = path.dirname('logs/app.log');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}
```

### 3. 问题: 敏感信息泄露

**原因**: 脱敏模式不正确
**解决**: 更新脱敏配置

```typescript
const config = new LoggerConfigBuilder()
  .setSensitiveData({
    patterns: [
      'password["\']?\\s*[:=]\\s*["\']?[^"\'\\s]+',
      'token["\']?\\s*[:=]\\s*["\']?[^"\'\\s]+'
    ],
    replacement: '***',
    enabled: true
  })
  .build();
```

## 迁移时间表

### 第1周: 准备阶段
- 配置日志系统
- 设置依赖注入
- 创建迁移脚本

### 第2-3周: Infrastructure层迁移
- 迁移数据库相关日志
- 迁移HTTP客户端日志
- 迁移配置系统日志

### 第4-5周: Application层迁移
- 迁移服务层日志
- 迁移业务流程日志
- 优化日志结构

### 第6周: Domain层迁移
- 迁移实体日志
- 迁移领域服务日志
- 清理旧代码

### 第7周: 测试和优化
- 运行集成测试
- 性能优化
- 文档更新

## 总结

通过系统性的迁移，可以将现有的分散日志代码统一到新的日志系统中。迁移过程中要注意保持业务功能的连续性，同时逐步优化日志质量和性能。完成迁移后，将获得统一、可配置、高性能的日志系统。