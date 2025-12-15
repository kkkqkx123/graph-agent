# 日志系统实现指南

## 概述

本文档提供了Modular Agent Framework日志系统的详细实现指南，包括如何使用、配置和扩展日志系统。

## 快速开始

### 1. 基本使用

```typescript
import { LoggerFactory } from '../../infrastructure/logging';

// 创建日志记录器
const logger = LoggerFactory.getInstance().createDefaultLogger();

// 记录不同级别的日志
logger.info('应用程序启动');
logger.error('发生错误', new Error('详细错误信息'));
logger.debug('调试信息', { userId: 123, action: 'login' });
```

### 2. 使用依赖注入

```typescript
import { inject } from '../../infrastructure/container';
import { ILogger } from '@shared/types/logger';

export class UserService {
  constructor(@inject('ILogger') private logger: ILogger) {}

  async createUser(userData: any): Promise<User> {
    this.logger.info('创建用户', { email: userData.email });
    
    try {
      const user = await this.userRepository.create(userData);
      this.logger.info('用户创建成功', { userId: user.id });
      return user;
    } catch (error) {
      this.logger.error('用户创建失败', error as Error, { email: userData.email });
      throw error;
    }
  }
}
```

### 3. 创建子日志记录器

```typescript
// 创建带有上下文的子日志记录器
const userLogger = logger.child({ module: 'UserService', userId: 123 });

userLogger.info('用户操作', { action: 'updateProfile' });
// 输出将包含 module: 'UserService' 和 userId: 123
```

## 配置系统

### 1. 使用配置构建器

```typescript
import { LoggerConfigBuilder, LogLevel, LogOutputType, LogFormatType } from '../../infrastructure/logging';

const config = new LoggerConfigBuilder()
  .setLevel(LogLevel.DEBUG)
  .addConsoleOutput({
    level: LogLevel.DEBUG,
    format: LogFormatType.TEXT,
    colorize: true,
    timestamp: true
  })
  .addFileOutput({
    level: LogLevel.INFO,
    format: LogFormatType.JSON,
    path: 'logs/app.log',
    rotation: 'daily',
    max_size: '100MB',
    max_files: 30
  })
  .setSensitiveData({
    patterns: ['password', 'token'],
    replacement: '***',
    enabled: true
  })
  .build();

const logger = LoggerFactory.getInstance().createLogger(config);
```

### 2. 从TOML配置加载

```typescript
// 假设有以下TOML配置
const tomlConfig = {
  log_level: 'INFO',
  log_outputs: [
    {
      type: 'console',
      level: 'DEBUG',
      format: 'text',
      colorize: true
    },
    {
      type: 'file',
      level: 'INFO',
      format: 'json',
      path: 'logs/agent.log',
      rotation: 'daily',
      max_size: '10MB'
    }
  ],
  secret_patterns: [
    'sk-[a-zA-Z0-9]{20,}',
    'password["\']?\\s*[:=]\\s*["\']?[^"\'\\s]+'
  ]
};

const logger = LoggerFactory.getInstance().createFromToml(tomlConfig);
```

### 3. 环境特定配置

```typescript
const loggerFactory = LoggerFactory.getInstance();

// 开发环境
const devLogger = loggerFactory.createDevelopmentLogger();

// 生产环境
const prodLogger = loggerFactory.createProductionLogger();

// 测试环境
const testLogger = loggerFactory.createTestLogger();
```

## 格式化器

### 1. 使用内置格式化器

```typescript
import { FormatterFactory, LogFormatType } from '../../infrastructure/logging';

const formatterFactory = FormatterFactory.getInstance();

// JSON格式化器
const jsonFormatter = formatterFactory.createFormatter(LogFormatType.JSON);

// 文本格式化器
const textFormatter = formatterFactory.createFormatter(LogFormatType.TEXT);
```

### 2. 自定义格式化器选项

```typescript
import { JsonFormatter, TextFormatter } from '../../infrastructure/logging';

// 自定义JSON格式化器
const customJsonFormatter = new JsonFormatter({
  pretty: true,
  includeTimestamp: true,
  includeLevel: true,
  includeContext: true,
  includeStack: true,
  sanitize: true
});

// 自定义文本格式化器
const customTextFormatter = new TextFormatter({
  colorize: true,
  includeTimestamp: true,
  timestampFormat: 'locale',
  includeContext: true,
  includeStack: true,
  sanitize: true,
  separator: ' | ',
  prefix: '[APP]',
  suffix: '[/APP]'
});
```

### 3. 创建自定义格式化器

```typescript
import { BaseFormatter, LogEntry } from '../../infrastructure/logging';

export class CustomFormatter extends BaseFormatter {
  readonly name = 'custom';

  format(entry: LogEntry): string {
    const timestamp = this.formatTimestamp(entry.timestamp);
    const level = this.formatLevel(entry.level.toUpperCase());
    const context = this.formatContext(entry.context);
    
    let message = `[${timestamp}] ${level} ${entry.message}`;
    
    if (context) {
      message += ` ${context}`;
    }
    
    if (entry.error) {
      message += ` ${this.formatError(entry.error)}`;
    }
    
    return message;
  }
}
```

## 传输器

### 1. 使用内置传输器

```typescript
import { TransportFactory, LogOutputType } from '../../infrastructure/logging';

const transportFactory = TransportFactory.getInstance();

// 控制台传输器
const consoleTransport = transportFactory.createTransport({
  type: LogOutputType.CONSOLE,
  level: 'DEBUG',
  format: 'TEXT'
});

// 文件传输器
const fileTransport = transportFactory.createTransport({
  type: LogOutputType.FILE,
  level: 'INFO',
  format: 'JSON',
  path: 'logs/app.log',
  rotation: 'daily',
  max_size: '100MB'
});
```

### 2. 创建自定义传输器

```typescript
import { BaseTransport, LogEntry } from '../../infrastructure/logging';

export class DatabaseTransport extends BaseTransport {
  readonly name = 'database';

  async log(entry: LogEntry): Promise<void> {
    if (!this.shouldLog(entry.level)) {
      return;
    }

    // 实现数据库日志记录逻辑
    await this.saveToDatabase(entry);
  }

  private async saveToDatabase(entry: LogEntry): Promise<void> {
    // 数据库保存逻辑
  }
}
```

## 敏感数据脱敏

### 1. 使用默认脱敏配置

```typescript
import { SensitiveDataUtils } from '../../infrastructure/logging';

const message = '用户登录成功，token: sk-1234567890abcdef';
const sanitized = SensitiveDataUtils.sanitize(message, {
  patterns: ['sk-[a-zA-Z0-9]{20,}'],
  replacement: '***',
  enabled: true
});

// 结果: "用户登录成功，token: ***"
```

### 2. 自定义脱敏模式

```typescript
const customConfig = {
  patterns: [
    'password["\']?\\s*[:=]\\s*["\']?[^"\'\\s]+',
    'api_key["\']?\\s*[:=]\\s*["\']?[^"\'\\s]+',
    '\\b\\d{4}[-\\s]?\\d{4}[-\\s]?\\d{4}[-\\s]?\\d{4}\\b' // 信用卡号
  ],
  replacement: '[REDACTED]',
  enabled: true
};
```

## 最佳实践

### 1. 分层日志策略

```typescript
// Infrastructure层 - 记录技术细节
export class DatabaseConnection {
  constructor(private logger: ILogger) {}

  async connect(): Promise<void> {
    this.logger.debug('正在连接数据库', { host: 'localhost', port: 5432 });
    // 连接逻辑
    this.logger.info('数据库连接成功');
  }
}

// Application层 - 记录业务流程
export class UserService {
  constructor(private logger: ILogger) {}

  async createUser(userData: any): Promise<User> {
    this.logger.info('开始创建用户', { email: userData.email });
    // 业务逻辑
    this.logger.info('用户创建成功', { userId: user.id });
    return user;
  }
}

// Domain层 - 仅记录关键业务事件
export class User {
  constructor(private logger: ILogger) {}

  changeEmail(newEmail: string): void {
    // 验证逻辑
    this.email = newEmail;
    this.logger.warn('用户邮箱已更改', { userId: this.id, oldEmail: this.email, newEmail });
  }
}
```

### 2. 结构化日志

```typescript
// 好的做法 - 使用结构化上下文
logger.info('用户登录', {
  userId: user.id,
  email: user.email,
  ip: request.ip,
  userAgent: request.headers['user-agent'],
  timestamp: new Date().toISOString()
});

// 避免 - 非结构化消息
logger.info(`用户 ${user.email} 从 ${request.ip} 登录`);
```

### 3. 错误日志

```typescript
try {
  await riskyOperation();
} catch (error) {
  // 记录完整的错误信息
  logger.error('操作失败', error as Error, {
    operation: 'riskyOperation',
    userId: currentUser.id,
    requestId: context.requestId
  });
}
```

### 4. 性能考虑

```typescript
// 使用条件日志避免不必要的字符串拼接
if (logger.shouldLog('DEBUG')) {
  logger.debug('复杂调试信息', {
    data: expensiveOperation(),
    context: buildComplexContext()
  });
}

// 使用异步日志记录
await logger.flush(); // 在应用关闭时确保所有日志都已写入
```

## 故障排除

### 1. 常见问题

**问题**: 日志没有输出
- 检查日志级别配置
- 确认传输器已正确配置
- 验证文件路径权限

**问题**: 文件日志轮转不工作
- 检查轮转策略配置
- 确认文件大小格式正确
- 验证目录权限

**问题**: 敏感信息没有被脱敏
- 检查脱敏模式是否正确
- 确认脱敏功能已启用
- 验证正则表达式语法

### 2. 调试技巧

```typescript
// 启用详细日志
const debugLogger = LoggerFactory.getInstance().createLogger({
  level: LogLevel.TRACE,
  outputs: [{
    type: LogOutputType.CONSOLE,
    level: LogLevel.TRACE,
    format: LogFormatType.TEXT
  }]
});

// 检查配置
const configManager = LoggerFactory.getInstance().getConfigManager();
console.log('当前日志配置:', configManager.getConfig());

// 检查传输器状态
const logger = LoggerFactory.getInstance().createDefaultLogger();
console.log('传输器数量:', logger.getTransportCount());
console.log('是否有启用的传输器:', logger.hasEnabledTransports());
```

## 扩展指南

### 1. 添加新的传输器类型

1. 实现 `ILoggerTransport` 接口
2. 继承 `BaseTransport` 类
3. 在 `TransportFactory` 中注册

### 2. 添加新的格式化器

1. 实现 `ILoggerFormatter` 接口
2. 继承 `BaseFormatter` 类
3. 在 `FormatterFactory` 中注册

### 3. 集成外部日志服务

```typescript
export class RemoteTransport extends BaseTransport {
  async log(entry: LogEntry): Promise<void> {
    const payload = {
      timestamp: entry.timestamp,
      level: entry.level,
      message: entry.message,
      context: entry.context,
      service: 'agent-framework'
    };

    await fetch('https://logs.example.com/api/logs', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.api_key}`
      },
      body: JSON.stringify(payload)
    });
  }
}
```

## 总结

新的日志系统提供了灵活、可配置、高性能的日志记录功能。通过合理使用配置、格式化器和传输器，可以满足不同场景下的日志需求。遵循最佳实践可以确保日志系统的有效性和可维护性。