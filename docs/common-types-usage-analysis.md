# SDK 通用类型使用分析报告

## 执行摘要

本报告分析了 SDK 中 ID、Timestamp 和 Version 的使用情况，发现存在不一致性和缺乏统一管理的问题。建议采用混合策略：SDK 内部强制使用工具函数，应用层允许灵活性但提供验证和默认值机制。

**重要更新**：所有工具函数已从 const 对象改为直接导出函数，与项目现有代码风格（如 `path-resolver.ts`）保持一致。

## 1. ID 使用情况分析

### 1.1 使用范围

ID 在 SDK 中被广泛使用，涉及以下核心实体：
- Workflow（工作流）
- Node（节点）
- Edge（边）
- Thread（线程）
- Tool（工具）
- LLMProfile（LLM 配置）
- Checkpoint（检查点）
- Event（事件）
- ToolCall（工具调用）

### 1.2 当前生成模式

通过代码搜索发现以下 ID 生成模式：

#### 模式 1：使用 generateId()（推荐但未统一）
```typescript
// 在 thread-builder.ts、checkpoint-manager.ts 等文件中使用
import { generateId } from '../utils';

const threadId = generateId();
const checkpointId = generateId();
```

#### 模式 2：使用 Date.now() + 随机数
```typescript
// 在 human-relay.ts、gemini 客户端等文件中使用
const requestId = `human-relay-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
const toolCallId = `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
```

#### 模式 3：使用固定前缀 + 时间戳
```typescript
// 在 profile-manager-api.ts 中使用
const profileId = overrides.id || `profile-${Date.now()}`;
```

#### 模式 4：硬编码字符串（主要用于测试）
```typescript
// 在测试文件中广泛使用
const workflow = {
  id: 'test-workflow',
  nodes: [
    { id: 'node-start', ... },
    { id: 'node-end', ... }
  ]
};
```

### 1.3 存在的问题

1. **不一致性**：不同模块使用不同的 ID 生成策略
2. **缺乏验证**：没有统一的 ID 格式验证机制
3. **测试污染**：测试中的硬编码 ID 可能污染生产代码逻辑
4. **可读性问题**：某些 ID 格式（如纯 UUID）不利于调试

## 2. Timestamp 使用情况分析

### 2.1 使用范围

Timestamp 用于记录以下时间信息：
- createdAt（创建时间）
- updatedAt（更新时间）
- startTime（开始时间）
- endTime（结束时间）
- timestamp（通用时间戳）
- duration（持续时间）

### 2.2 当前生成模式

#### 模式 1：直接使用 Date.now()（占 90% 以上）
```typescript
// 绝大多数地方使用这种方式
const now = Date.now();
thread.startTime = Date.now();
event.timestamp = Date.now();
```

#### 模式 2：使用 now()（推荐但使用率低）
```typescript
// 推荐使用，但实际使用率很低
import { now as getCurrentTimestamp } from '../utils';

const now = getCurrentTimestamp();
```

#### 模式 3：使用 new Date().getTime()
```typescript
// 在 builtin 工具执行器中使用
const timestamp = new Date().getTime();
```

### 2.3 存在的问题

1. **工具函数未被充分利用**：`timestampFromDate()`、`timestampToDate()`、`timestampToISOString()` 等有用的转换方法使用率极低
2. **时区问题**：所有时间戳都是毫秒级 Unix 时间戳，没有时区信息
3. **缺乏标准化**：没有统一的时间戳生成入口

## 3. Version 使用情况分析

### 3.1 使用范围

Version 主要用于：
- Workflow.version（工作流版本）
- Thread.workflowVersion（线程关联的工作流版本）
- API version（API 版本）
- LLM API version（LLM API 版本）

### 3.2 当前生成模式

#### 模式 1：硬编码 '1.0.0'（占 95% 以上）
```typescript
// 几乎所有地方都硬编码为 '1.0.0'
const workflow = {
  version: '1.0.0',
  ...
};
```

#### 模式 2：使用 initialVersion()（推荐但使用率低）
```typescript
// 推荐使用，但实际使用率很低
import { initialVersion } from '../utils';

const version = initialVersion(); // 返回 '1.0.0'
```

#### 模式 3：WorkflowRegistry 版本管理
```typescript
// WorkflowRegistry 提供了版本管理功能，但需要显式调用
registry.saveVersion(workflow);
registry.rollback(workflowId, version);
```

### 3.3 存在的问题

1. **版本管理功能未被充分利用**：`parseVersion()`、`nextMajorVersion()`、`nextMinorVersion()`、`nextPatchVersion()`、`compareVersion()` 等功能几乎未使用
2. **缺乏自动版本管理**：工作流更新时不会自动递增版本号
3. **版本号语义不明确**：所有版本都是 '1.0.0'，无法区分不同版本

## 4. 建议的改进策略

### 4.1 混合策略：强制与灵活并存

#### 4.1.1 SDK 内部强制使用工具函数

对于 SDK 内部核心逻辑，强制使用工具函数：

```typescript
// ✅ 推荐：SDK 内部使用
import { generateId, now as getCurrentTimestamp, initialVersion } from '../utils';

class ThreadBuilder {
  buildThread(workflow: WorkflowDefinition, options: ThreadOptions): ThreadContext {
    const threadId = generateId(); // 强制使用
    const now = getCurrentTimestamp(); // 强制使用
    const version = initialVersion(); // 强制使用
    
    // ...
  }
}
```

#### 4.1.2 应用层允许灵活性

对于应用层传入的数据，允许灵活性但提供验证和默认值：

```typescript
// ✅ 推荐：应用层 API 提供验证和默认值
import { generateId, isValidId, initialVersion, now as getCurrentTimestamp } from '../utils';

class WorkflowRegistryAPI {
  register(workflow: Partial<WorkflowDefinition>): void {
    // 验证 ID 格式
    if (workflow.id && !isValidId(workflow.id)) {
      throw new ValidationError('Invalid workflow ID format');
    }
    
    // 提供默认值
    const workflowWithDefaults: WorkflowDefinition = {
      id: workflow.id || generateId(),
      version: workflow.version || initialVersion(),
      createdAt: workflow.createdAt || getCurrentTimestamp(),
      updatedAt: workflow.updatedAt || getCurrentTimestamp(),
      // ...
    };
    
    // ...
  }
}
```

### 4.2 ID 生成策略

#### 4.2.1 推荐 ID 格式

根据不同场景，推荐使用不同的 ID 格式：

| 实体类型 | 推荐格式 | 示例 | 说明 |
|---------|---------|------|------|
| Workflow | UUID v4 | `wflow_8f9d3c2a...` | 使用 generateId() |
| Thread | UUID v4 | `thrd_8f9d3c2a...` | 使用 generateId() |
| Node | 短 ID | `node_start`、`node_llm_1` | 可读性强，便于调试 |
| Edge | 短 ID | `edge_1`、`edge_start_to_end` | 可读性强，便于调试 |
| Checkpoint | UUID v4 | `ckpt_8f9d3c2a...` | 使用 generateId() |
| ToolCall | 时间戳+随机 | `call_1640995200000_abc123` | 便于追踪调用顺序 |
| Event | 时间戳+随机 | `evt_1640995200000_abc123` | 便于追踪事件顺序 |

#### 4.2.2 ID 验证规则

```typescript
// 在 id-utils.ts 中添加验证规则
import type { ID } from '../types/common';

/**
 * 验证 ID 格式是否符合规范
 */
export function validateId(id: ID, entityType: string): boolean {
  const patterns = {
    workflow: /^wflow_[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i,
    thread: /^thrd_[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i,
    node: /^node_[a-z0-9_]+$/,
    edge: /^edge_[a-z0-9_]+$/,
    checkpoint: /^ckpt_[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i,
    toolCall: /^call_\d+_[a-z0-9]+$/,
    event: /^evt_\d+_[a-z0-9]+$/
  };
  
  return patterns[entityType]?.test(id) || false;
}
```

### 4.3 Timestamp 管理策略

#### 4.3.1 统一时间戳生成

```typescript
// 在 timestamp-utils.ts 中添加更多实用方法
import type { Timestamp } from '../types/common';

/**
 * 创建带时区信息的时间戳
 */
export function nowWithTimezone(): { timestamp: Timestamp; timezone: string } {
  return {
    timestamp: Date.now(),
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
  };
}

/**
 * 计算时间差（毫秒）
 */
export function diffTimestamp(start: Timestamp, end: Timestamp): number {
  return end - start;
}

/**
 * 格式化持续时间
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(2)}s`;
  if (ms < 3600000) return `${(ms / 60000).toFixed(2)}min`;
  return `${(ms / 3600000).toFixed(2)}h`;
}
```

#### 4.3.2 自动时间戳管理

```typescript
// 在实体创建时自动设置时间戳
import { now as getCurrentTimestamp } from '../utils';

class EntityBase {
  createdAt: Timestamp;
  updatedAt: Timestamp;
  
  constructor() {
    const now = getCurrentTimestamp();
    this.createdAt = now;
    this.updatedAt = now;
  }
  
  update() {
    this.updatedAt = getCurrentTimestamp();
  }
}
```

### 4.4 Version 管理策略

#### 4.4.1 自动版本管理

```typescript
// 在 WorkflowRegistry 中实现自动版本管理
import { nextPatchVersion, initialVersion, now as getCurrentTimestamp } from '../utils';

class WorkflowRegistry {
  register(workflow: WorkflowDefinition): void {
    // 检查是否已存在
    const existing = this.workflows.get(workflow.id);
    if (existing) {
      // 自动递增版本号
      workflow.version = nextPatchVersion(existing.version);
      workflow.updatedAt = getCurrentTimestamp();
    } else {
      // 新工作流，设置初始版本
      workflow.version = workflow.version || initialVersion();
      workflow.createdAt = workflow.createdAt || getCurrentTimestamp();
      workflow.updatedAt = workflow.updatedAt || getCurrentTimestamp();
    }
    
    // ... 保存工作流
  }
}
```

#### 4.4.2 版本号语义化

```typescript
// 扩展 version-utils.ts 以支持语义化版本
import type { Version } from '../types/common';

/**
 * 根据变更类型自动递增版本
 */
export function autoIncrementVersion(currentVersion: Version, changeType: 'major' | 'minor' | 'patch'): Version {
  switch (changeType) {
    case 'major':
      return nextMajorVersion(currentVersion);
    case 'minor':
      return nextMinorVersion(currentVersion);
    case 'patch':
      return nextPatchVersion(currentVersion);
    default:
      return nextPatchVersion(currentVersion);
  }
}

/**
 * 解析版本号的预发布和构建元数据
 */
export function parseFullVersion(version: Version): {
  major: number;
  minor: number;
  patch: number;
  prerelease?: string;
  build?: string;
} {
  const [base, ...rest] = version.split('+');
  const [versionCore, prerelease] = base.split('-');
  const [major, minor, patch] = versionCore.split('.').map(Number);
  
  return {
    major: major || 0,
    minor: minor || 0,
    patch: patch || 0,
    prerelease,
    build: rest.join('+')
  };
}
```

## 5. 实施计划

### 5.1 第一阶段：工具函数增强

1. 增强 `id-utils.ts` 添加 `validateId()` 和格式化方法
2. 增强 `timestamp-utils.ts` 添加 `nowWithTimezone()`、`diffTimestamp()`、`formatDuration()` 等实用工具方法
3. 增强 `version-utils.ts` 添加 `autoIncrementVersion()`、`parseFullVersion()` 等自动版本管理功能

### 5.2 第二阶段：SDK 内部重构

1. 替换所有直接使用 `Date.now()` 为 `now()` 或 `getCurrentTimestamp()`
2. 替换所有硬编码版本号为 `initialVersion()`
3. 统一使用 `generateId()` 生成 ID

### 5.3 第三阶段：API 层增强

1. 在 API 层添加验证和默认值逻辑
2. 提供清晰的错误信息
3. 添加文档和示例

### 5.4 第四阶段：测试和文档

1. 更新测试用例，使用工具函数生成测试数据
2. 编写迁移指南
3. 更新 API 文档

## 6. 风险评估

### 6.1 兼容性风险

- **低风险**：工具函数方法签名保持不变，只是内部实现增强
- **缓解措施**：保持向后兼容，逐步迁移

### 6.2 性能影响

- **极低风险**：工具函数开销可以忽略不计
- **缓解措施**：进行性能基准测试

### 6.3 学习成本

- **低风险**：工具函数接口简单直观
- **缓解措施**：提供清晰的文档和示例

## 7. 结论

当前 SDK 在 ID、Timestamp 和 Version 的管理上存在不一致性和缺乏统一管理的问题。通过采用混合策略（SDK 内部强制使用工具函数，应用层允许灵活性但提供验证和默认值），可以：

1. **提高代码质量**：统一的管理策略减少错误
2. **增强可维护性**：集中管理便于未来修改
3. **改善开发者体验**：清晰的接口和自动化的默认值
4. **保持灵活性**：不限制应用层的特殊需求
5. **更好的树摇优化**：直接导出函数更容易被构建工具优化
6. **更符合函数式编程风格**：无状态函数应该是独立的

建议按照实施计划分阶段推进，优先增强工具函数，然后逐步重构 SDK 内部，最后增强 API 层。

## 附录：工具函数 API 参考

### ID 工具函数

```typescript
import { generateId, isValidId, validateId } from '../utils';

// 生成新 ID（使用 UUID v4）
const id = generateId();

// 验证 ID 是否有效
const isValid = isValidId(id);

// 验证 ID 格式是否符合规范
const isFormatValid = validateId(id, 'workflow');
```

### Timestamp 工具函数

```typescript
import { 
  now, 
  timestampFromDate, 
  timestampToDate, 
  timestampToISOString,
  nowWithTimezone,
  diffTimestamp,
  formatDuration
} from '../utils';

// 创建当前时间戳
const timestamp = now();

// 从 Date 创建时间戳
const ts = timestampFromDate(new Date());

// 转换为 Date 对象
const date = timestampToDate(timestamp);

// 转换为 ISO 字符串
const iso = timestampToISOString(timestamp);

// 创建带时区信息的时间戳
const { timestamp: ts, timezone } = nowWithTimezone();

// 计算时间差
const diff = diffTimestamp(start, end);

// 格式化持续时间
const formatted = formatDuration(12345); // "12.35s"
```

### Version 工具函数

```typescript
import { 
  initialVersion, 
  parseVersion, 
  nextMajorVersion, 
  nextMinorVersion, 
  nextPatchVersion, 
  compareVersion,
  autoIncrementVersion,
  parseFullVersion
} from '../utils';

// 创建初始版本
const version = initialVersion(); // "1.0.0"

// 解析版本号
const parsed = parseVersion("1.2.3"); // { major: 1, minor: 2, patch: 3 }

// 下一个主版本
const nextMajor = nextMajorVersion("1.2.3"); // "2.0.0"

// 下一个次版本
const nextMinor = nextMinorVersion("1.2.3"); // "1.3.0"

// 下一个补丁版本
const nextPatch = nextPatchVersion("1.2.3"); // "1.2.4"

// 比较版本号
const cmp = compareVersion("1.2.3", "1.2.4"); // -1

// 自动递增版本
const next = autoIncrementVersion("1.2.3", "minor"); // "1.3.0"

// 解析完整版本号
const full = parseFullVersion("1.2.3-alpha.1+build.123");
// { major: 1, minor: 2, patch: 3, prerelease: "alpha.1", build: "build.123" }
```

### Metadata 工具函数

```typescript
import { 
  emptyMetadata, 
  getMetadata, 
  setMetadata, 
  deleteMetadata, 
  hasMetadata, 
  mergeMetadata 
} from '../utils';

// 创建空元数据
const metadata = emptyMetadata();

// 获取元数据值
const value = getMetadata(metadata, 'key');

// 设置元数据值（返回新对象，保持不可变性）
const updated = setMetadata(metadata, 'key', 'value');

// 删除元数据值（返回新对象，保持不可变性）
const deleted = deleteMetadata(updated, 'key');

// 检查是否存在
const exists = hasMetadata(metadata, 'key');

// 合并元数据
const merged = mergeMetadata({ a: 1 }, { b: 2 }, { c: 3 });