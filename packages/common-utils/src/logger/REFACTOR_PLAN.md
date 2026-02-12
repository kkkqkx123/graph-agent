# Logger 流式架构改造方案

## 一、现状分析

### 当前实现特点
1. **输出方式**：使用函数回调模式（`LogOutput`类型）
2. **输出实现**：
   - `createConsoleOutput`: 同步控制台输出
   - `createAsyncOutput`: 基于队列的异步输出
3. **架构问题**：
   - 紧耦合：输出逻辑直接嵌入在logger中
   - 扩展性差：添加新的输出方式需要修改logger核心代码
   - 缺乏灵活性：无法同时输出到多个目标

### Pino架构参考
1. **核心设计**：基于Node.js Stream接口
   - 使用`stream.write()`方法输出日志
   - 支持多种stream实现（console、file、transport等）
2. **关键组件**：
   - **Stream接口**：统一的输出抽象
   - **Transport层**：支持多种输出目标
   - **Multistream**：支持同时输出到多个stream
   - **Destination**：创建输出stream的工厂函数

## 二、改造目标

1. **解耦架构**：将logger核心与输出逻辑分离
2. **提升扩展性**：通过实现stream接口轻松添加新输出方式
3. **增强灵活性**：支持多目标输出、管道操作等
4. **保持兼容性**：确保现有API继续可用

## 三、架构设计

### 3.1 核心接口定义

```typescript
// LogStream接口 - 统一的输出抽象
interface LogStream {
  write(data: LogEntry): void;
  flush?(callback?: () => void): void;
  end?(): void;
  on?(event: string, handler: Function): void;
}

// LogEntry - 日志条目
interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp?: string;
  context?: LoggerContext;
  [key: string]: any;
}
```

### 3.2 模块拆分方案

```
packages/common-utils/src/logger/
├── types.ts              # 类型定义（扩展）
├── logger.ts             # 核心logger实现（重构）
├── streams/              # Stream实现层（新增）
│   ├── index.ts          # Stream导出
│   ├── console-stream.ts # 控制台输出stream
│   ├── file-stream.ts    # 文件输出stream
│   ├── async-stream.ts   # 异步输出stream
│   └── multistream.ts    # 多目标输出stream
├── transports/           # Transport层（新增）
│   ├── index.ts          # Transport导出
│   └── transport.ts      # Transport工厂函数
├── utils.ts              # 工具函数（保留）
└── index.ts              # 主入口（更新）
```

### 3.3 Stream实现层

#### 3.3.1 ConsoleStream
- 同步输出到控制台
- 支持JSON和普通格式
- 支持彩色输出

#### 3.3.2 FileStream
- 输出到文件
- 支持文件轮转
- 支持缓冲写入

#### 3.3.3 AsyncStream
- 基于队列的异步输出
- 支持批量处理
- 非阻塞设计

#### 3.3.4 Multistream
- 同时输出到多个stream
- 支持不同级别的日志输出到不同stream
- 支持去重（dedupe）

### 3.4 Transport层

```typescript
// Transport配置
interface TransportOptions {
  target: string | LogStream;
  level?: LogLevel;
  options?: any;
}

// Transport工厂
function transport(options: TransportOptions): LogStream;

// Destination工厂
function destination(dest?: string | number | object): LogStream;
```

## 四、实现步骤

### 阶段1：创建Stream接口和基础实现
1. 定义`LogStream`接口和`LogEntry`类型
2. 实现`ConsoleStream`
3. 实现`FileStream`
4. 实现`AsyncStream`

### 阶段2：实现Multistream
1. 实现多目标输出逻辑
2. 支持级别过滤
3. 支持动态添加/移除stream

### 阶段3：实现Transport层
1. 创建`transport()`工厂函数
2. 创建`destination()`工厂函数
3. 支持自定义transport

### 阶段4：重构BaseLogger
1. 将`output`函数改为使用`LogStream`
2. 更新构造函数接受stream参数
3. 保持child logger的stream继承

### 阶段5：保持向后兼容
1. 保留`createConsoleOutput`和`createAsyncOutput`函数
2. 内部使用stream实现
3. 更新工厂函数支持stream参数

### 阶段6：测试和文档
1. 编写单元测试
2. 编写集成测试
3. 更新使用文档

## 五、API设计

### 5.1 新增API

```typescript
// 创建stream
import { 
  createConsoleStream,
  createFileStream,
  createAsyncStream,
  createMultistream
} from '@common-utils/logger/streams';

// 创建transport
import { transport, destination } from '@common-utils/logger/transports';

// 使用stream创建logger
const logger = createLogger({
  level: 'info',
  stream: createConsoleStream({ pretty: true })
});

// 使用multistream
const multiStream = createMultistream([
  { stream: createConsoleStream(), level: 'info' },
  { stream: createFileStream('./app.log'), level: 'warn' }
]);

const logger = createLogger({
  level: 'debug',
  stream: multiStream
});

// 使用transport
const logger = createLogger({
  level: 'info',
  transport: transport({
    target: 'pino/file',
    options: { destination: './app.log' }
  })
});
```

### 5.2 兼容现有API

```typescript
// 现有API继续可用
const logger = createLogger({
  level: 'info',
  async: true,
  json: true
});

// 内部会自动转换为stream实现
```

## 六、优势分析

### 6.1 扩展性
- 添加新输出方式只需实现`LogStream`接口
- 无需修改logger核心代码

### 6.2 灵活性
- 支持同时输出到多个目标
- 支持不同级别日志输出到不同目标
- 支持stream管道操作

### 6.3 性能
- 异步stream不阻塞主线程
- 批量处理减少I/O操作
- 可配置缓冲策略

### 6.4 兼容性
- 保持现有API不变
- 平滑迁移路径
- 渐进式升级

## 七、风险评估

### 7.1 兼容性风险
- **风险**：现有代码可能依赖内部实现细节
- **缓解**：保持所有公共API不变，内部使用适配器模式

### 7.2 性能风险
- **风险**：Stream抽象可能带来性能开销
- **缓解**：优化stream实现，使用零拷贝技术

### 7.3 复杂度风险
- **风险**：架构复杂度增加
- **缓解**：清晰的模块划分，完善的文档和测试

## 八、迁移建议

### 8.1 渐进式迁移
1. 先实现stream接口和基础实现
2. 保持现有API，内部使用stream
3. 逐步推荐使用新API
4. 最终废弃旧的output函数

### 8.2 兼容性保证
- 所有现有API继续工作
- 内部自动转换为stream实现
- 提供迁移指南

## 九、总结

通过引入基于流的架构，logger系统将获得更好的扩展性、灵活性和性能。改造过程保持向后兼容，确保现有代码无需修改即可继续工作。新的架构为未来的功能扩展（如远程日志、日志聚合等）奠定了基础。