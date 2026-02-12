# 通用日志模块设计文档

## 1. 背景与需求分析

### 1.1 现状分析
当前项目中存在大量分散的日志调用，主要使用 `console.log/warn/error` 进行基本的日志记录。虽然HTTP客户端已经定义了 `HttpLogger` 接口，但缺乏统一的日志系统。

### 1.2 问题识别
- **日志分散**: 各个模块使用不同的日志方式，难以统一管理
- **功能有限**: console日志缺乏级别控制、上下文信息等高级功能
- **配置困难**: 无法通过统一配置控制日志级别和输出
- **性能影响**: 在生产环境中无法有效关闭调试日志

### 1.3 需求总结
- 提供统一的日志接口和实现
- 支持可配置的日志级别（debug, info, warn, error）
- 支持上下文信息附加
- 与现有HttpLogger接口兼容
- 轻量级实现，避免复杂依赖
- 支持向后兼容的渐进式迁移

## 2. 设计方案

### 2.1 核心架构

#### 设计原则
- **轻量级**: 保持common-utils的简洁性，避免复杂依赖
- **可插拔**: 支持自定义日志输出器，兼容console
- **零配置默认**: 默认使用console，无需额外配置
- **类型安全**: 完全TypeScript支持，接口兼容现有代码
- **性能优化**: 禁用级别下不执行任何操作

#### 核心组件
1. **Logger接口**: 统一日志操作接口
2. **Logger工厂**: 创建不同配置的日志实例
3. **全局日志管理**: 支持全局日志器和级别设置
4. **工具函数**: 上下文处理和消息格式化

### 2.2 接口设计

#### Logger接口
```typescript
interface Logger {
  debug(message: string, context?: Record<string, any>): void;
  info(message: string, context?: Record<string, any>): void;
  warn(message: string, context?: Record<string, any>): void;
  error(message: string, context?: Record<string, any>): void;
}
```

#### LogLevel类型
```typescript
type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'off';
```

#### LoggerOptions配置
```typescript
interface LoggerOptions {
  level?: LogLevel;
  name?: string; // 日志器名称/前缀
  output?: (level: LogLevel, message: string, context?: Record<string, any>) => void;
}
```

### 2.3 实现细节

#### 工厂函数
- `createLogger(options: LoggerOptions)`: 创建带级别的日志实例
- `createConsoleLogger()`: 创建默认的console日志器
- `createNoopLogger()`: 创建空操作日志器（用于禁用日志）

#### 全局管理
- `setGlobalLogger(logger: Logger)`: 设置全局日志器
- `getGlobalLogger()`: 获取全局日志器
- `setGlobalLogLevel(level: LogLevel)`: 设置全局日志级别

#### 性能优化
- 级别检查在方法调用前进行
- 禁用级别下直接返回，不执行任何操作
- 上下文合并延迟到实际输出时进行

## 3. 文件结构

### 3.1 目录结构
```
packages/common-utils/src/
├── logger/
│   ├── index.ts              # 主入口
│   ├── logger.ts             # 核心实现
│   ├── types.ts              # 类型定义
│   ├── utils.ts              # 工具函数
│   └── __tests__/            # 测试文件
└── index.ts                  # 更新主入口
```

### 3.2 导出策略

#### 模块导出
```typescript
// logger/index.ts
export type { Logger, LogLevel, LoggerOptions } from './types';
export { 
  createLogger,
  createConsoleLogger, 
  createNoopLogger,
  setGlobalLogger,
  getGlobalLogger,
  setGlobalLogLevel
} from './logger';
export { formatLogMessage, mergeContext } from './utils';
```

#### Package exports配置
```json
{
  "exports": {
    "./logger": {
      "types": "./dist/logger/index.d.ts",
      "import": "./dist/logger/index.js"
    },
    "./logger/types": {
      "types": "./dist/logger/types.d.ts",
      "import": "./dist/logger/types.js"
    }
  }
}
```

## 4. 集成策略

### 4.1 向后兼容性

#### HttpLogger接口兼容
新Logger接口完全实现现有的HttpLogger接口，确保HTTP客户端无需修改即可使用。

#### 配置系统集成
SDKOptions中的logLevel配置可以直接映射到Logger级别：
```typescript
function createLoggerFromSDKOptions(options: SDKOptions): Logger {
  return createLogger({ level: options.logLevel || 'info' });
}
```

### 4.2 渐进式迁移路径

#### 阶段1: 并行共存
- 新日志模块与现有console日志并行存在
- 不强制替换现有日志调用

#### 阶段2: 优先替换
- 优先替换HTTP客户端中的日志实现
- 在新功能开发中使用新日志模块

#### 阶段3: 完全集成
- 统一日志系统
- 逐步移除冗余的console调用

### 4.3 具体集成点

#### HTTP客户端
- 更新HttpClientConfig.logger类型为Logger | HttpLogger
- 内部自动适配两种接口

#### SDK层
- SDK初始化时创建全局Logger实例
- 替换现有的console.error调用

#### 其他模块
- 提供迁移指南
- 在代码审查中推荐使用新日志系统

## 5. 使用示例

### 5.1 基本使用
```typescript
import { createLogger } from '@modular-agent/common-utils/logger';

const logger = createLogger({ level: 'info' });
logger.info('Application started', { version: '1.0.0' });
logger.debug('Debug info'); // 不会输出
```

### 5.2 全局使用
```typescript
import { setGlobalLogger, setGlobalLogLevel } from '@modular-agent/common-utils/logger';

setGlobalLogLevel('debug');
const logger = getGlobalLogger();
logger.debug('Global debug message');
```

### 5.3 HTTP客户端集成
```typescript
import { createLogger } from '@modular-agent/common-utils/logger';

const httpClient = new HttpClient({
  logger: createLogger({ level: 'debug' })
});
```

## 6. 测试策略

### 6.1 单元测试覆盖
- 所有日志级别的功能测试
- 级别过滤逻辑测试
- 上下文信息处理测试
- 全局日志管理测试

### 6.2 集成测试
- 与HTTP客户端的集成测试
- 与SDK配置系统的集成测试
- 性能基准测试

## 7. 风险评估与缓解

### 7.1 潜在风险
- **性能影响**: 新日志系统可能引入额外开销
- **兼容性问题**: 现有代码可能依赖console的特定行为
- **迁移成本**: 大量现有日志调用需要逐步替换

### 7.2 缓解措施
- **性能监控**: 提供性能基准测试，确保开销最小化
- **回滚策略**: 保持console调用作为备用方案
- **渐进迁移**: 支持并行共存，降低迁移风险

## 8. 结论

添加单独的日志模块到common-utils是必要且合理的。该模块将提供统一、可配置、高性能的日志功能，同时保持向后兼容性，支持渐进式迁移。设计方案遵循项目的轻量级和模块化原则，不会引入不必要的复杂性。