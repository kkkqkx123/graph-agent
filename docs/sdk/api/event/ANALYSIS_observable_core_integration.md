# Observable 模块与 Core 层事件管理分析

## 执行摘要

**建议**：**不需要**把 `observable.ts` 提升到 core 层，但可以考虑用 Observable 模式**改进 API 层的用户交互**。

---

## 一、两种事件系统的对比

### 1. Core 层 EventManager

| 方面 | 特性 | 实现 |
|-----|------|-----|
| **职责** | 全局事件管理（仅对外暴露） | 工作流状态通知 |
| **设计原则** | 内部协调已改用直接方法调用 | 纯粹的观察者模式 |
| **API 接口** | `on/off/once/emit/waitFor` | 传统回调式 |
| **优先级** | ✅ 支持优先级排序 | 优先级高的先执行 |
| **过滤器** | ✅ 支持事件过滤 | `filter: (event) => boolean` |
| **超时控制** | ✅ 支持监听器超时 | 单个监听器可设超时 |
| **错误处理** | ⚠️ 抛出异常，中断流程 | 一个监听器失败停止执行 |
| **事件等待** | ✅ `waitFor(eventType, timeout, filter)` | Promise 式等待 |
| **传播控制** | ✅ `stopPropagation()` | 支持停止事件传播 |
| **内存管理** | ⚠️ 手动清理：`off()` 或 `clear()` | 需要显式注销 |

### 2. API 层 Observable

| 方面 | 特性 | 实现 |
|-----|------|-----|
| **职责** | 响应式事件流（单次执行流） | 用于 `ExecutionBuilder.executeAsync()` |
| **设计原则** | RxJS-like 的流式编程 | 函数式、组合式 |
| **API 接口** | `subscribe(next/error/complete)` | 观察者对象模式 |
| **优先级** | ❌ 无优先级概念 | 顺序执行 |
| **过滤器** | ❌ 不在 Observable 层处理 | 需要操作符（未实现） |
| **超时控制** | ❌ 无超时机制 | 交给订阅方处理 |
| **错误处理** | ✅ 三分点：error 方法独立处理 | 一个错误不影响其他观察者 |
| **事件等待** | ❌ 流式设计，不适合等待 | 通过 complete 或 error 结束 |
| **传播控制** | ❌ 无传播概念 | 单向流动 |
| **内存管理** | ✅ 自动：返回 Subscription 对象 | `subscription.unsubscribe()` |

---

## 二、适用场景分析

### Core 层 EventManager 场景

```
✅ 适合用 EventManager:
├─ 全局系统事件（如 NODE_COMPLETED, THREAD_STARTED）
├─ 多个监听器需要处理同一事件（广播）
├─ 需要事件优先级排序
├─ 需要事件过滤和选择性处理
├─ 需要等待特定事件发生（如 waitForThreadCompleted）
└─ 内部需要控制事件传播
```

**当前用法**：仅用于对外暴露工作流状态，内部协调已改为直接方法调用。

### API 层 Observable 场景

```
✅ 适合用 Observable:
├─ 单次执行流中的进度事件（ExecutionEvent）
├─ 用户订阅单个执行过程的生命周期
├─ 需要响应式编程模式（RxJS-like）
├─ 需要自动资源清理（通过 unsubscribe）
├─ 支持未来的管道操作符（pipe）
└─ 用户可取消执行（AbortController）
```

**当前用法**：`ExecutionBuilder.executeAsync()` 返回 `Observable<ExecutionEvent>`。

---

## 三、Observable 能否改进 Core 层？

### 分析结果：❌ 不适合

#### 原因 1: 设计目标不同

| 层级 | 设计目标 | 改用 Observable 的影响 |
|-----|---------|----------------------|
| **Core EventManager** | 全局事件广播系统 | ❌ Observable 缺少多监听器、优先级等机制 |
| **API Observable** | 单次执行流 | ✅ 当前设计完美匹配 |

#### 原因 2: 功能差异

```typescript
// Core 需要这些 EventManager 特性：
eventManager.on(eventType, listener, { 
  priority: 10,        // Observable 无
  filter: (e) => {},   // Observable 无
  timeout: 5000        // Observable 无
});

eventManager.waitFor(eventType, 5000, (e) => e.threadId === id);  // Observable 无

eventManager.emit(event);  // 需要支持多个监听器，Observable 单向流

eventManager.stopPropagation(event);  // Observable 无此概念
```

#### 原因 3: 性能影响

- EventManager：**全局单例**，长期存活，频繁使用
  - 需要高效的监听器注册/注销
  - 需要快速的事件分发
  
- Observable：**短期对象**，单次执行，自动清理
  - 轻量级设计，性能要求不同

#### 原因 4: 错误处理差异

```typescript
// EventManager：一个监听器失败，整个 emit 停止
await eventManager.emit(event);  // 抛出异常，中断流程
// ❌ 后续监听器不会执行

// Observable：一个错误不影响其他观察者
observable.subscribe({
  next: () => { throw new Error(); },  // 只影响自己
  error: (err) => { /* 处理错误 */ }
});
// ✅ 其他订阅方不受影响
```

---

## 四、改进建议

### 方案 A: 保持现状（推荐）✅

**现状**：
- Core 层：EventManager 专注全局事件管理
- API 层：Observable 专注单次执行流

**优点**：
- 职责清晰，易于维护
- 每层优化针对自己的场景
- 无需跨层依赖

**行动**：无需变更

---

### 方案 B: 增强 Observable 的 API 层表达力

**改进方向**：增加 Observable 操作符支持（for future pipe operators）

```typescript
// 当前（仅预留）
observable.pipe(...operators)  // pipe 方法存在但无操作符

// 未来可实现
observable
  .pipe(
    filter(event => event.type === 'progress'),
    map(event => event.progress),
    debounce(300)
  )
  .subscribe(progress => console.log(progress));
```

**实施**：
1. 实现基础操作符（filter, map, debounce, throttle）
2. 完善 OperatorFunction 类型
3. 添加测试用例

**优点**：
- 提升用户体验
- 实现完整的响应式编程体验
- 保持 API 层的独立性

---

### 方案 C: 创建 Bridge 层（不推荐）

**想法**：在 API 层提供 EventManager → Observable 的转换

```typescript
// 不推荐：增加复杂度
const eventObservable = createObservableFromEventManager(
  eventManager,
  EventType.NODE_COMPLETED,
  (event) => event.nodeId === nodeId
);
```

**缺点**：
- 增加 API 层复杂度
- Core 事件机制已完善，无需转换
- 用户需要学习两种 API

---

## 五、分层建议总结

```
┌─────────────────────────────────────────┐
│         Application Layer               │
│    (apps/web-app 等)                    │
└──────────────┬──────────────────────────┘
               │
┌──────────────▼──────────────────────────┐
│          API Layer (sdk/api/)           │
│                                         │
│  • ExecutionBuilder.executeAsync()     │
│    → Observable<ExecutionEvent>        │
│  • 响应式编程接口                      │
│  • 单次执行流管理                      │
└──────────────┬──────────────────────────┘
               │
┌──────────────▼──────────────────────────┐
│      Core Layer (sdk/core/)             │
│                                         │
│  • EventManager（全局事件系统）        │
│  • 优先级、过滤、超时等高级功能       │
│  • 仅对外暴露，内部用直接方法调用     │
└─────────────────────────────────────────┘
```

### 分层原则

| 层级 | 职责 | 事件机制 | 何时使用 |
|-----|------|---------|--------|
| **App** | 用户交互 | 调用 API 层 | 显示执行进度 |
| **API** | 用户接口 | Observable + EventManager | 执行管理 |
| **Core** | 内部实现 | EventManager | 内部状态通知 |

---

## 六、关键指标对比

### 1. 当前代码统计

```
EventManager：
├─ 代码行数：381 行
├─ 功能特性：9 个核心方法
├─ 测试覆盖：完整
├─ 使用范围：Core 层 + API 层（消费）

Observable：
├─ 代码行数：185 行
├─ 功能特性：5 个核心方法（pipe 预留）
├─ 测试覆盖：20+ 测试用例，完整
├─ 使用范围：API 层（ExecutionBuilder）
```

### 2. 学习成本

```
使用 Observable：
├─ 新用户成本：低（RxJS 风格，流行）
├─ 文档需求：已有完整注释
├─ 学习资源：RxJS 官方教程

使用 EventManager：
├─ 新用户成本：中（自定义 API）
├─ 文档需求：需要详细说明
├─ 学习资源：项目内部文档
```

---

## 七、实施建议

### 短期（当前）✅
- ✅ 保持 Observable 在 API 层
- ✅ 保持 EventManager 在 Core 层
- ✅ 补充文档说明各层职责

### 中期（下个版本）
- 📋 实现 Observable 操作符（filter, map）
- 📋 增强 ExecutionBuilder.executeAsync() 文档
- 📋 添加 Observable 最佳实践示例

### 长期
- 🔮 考虑 Observable 与其他 RxJS 库的互操作性
- 🔮 评估是否需要 Subject 或 BehaviorSubject 等类型
- 🔮 制定响应式编程规范

---

## 附录：代码示例

### Observable 使用示例（当前）

```typescript
// API 层：ExecutionBuilder
const execution = sdk.builder()
  .withWorkflow('my-workflow')
  .withInput({ data: 'value' });

// 返回 Observable<ExecutionEvent>
const observable = execution.executeAsync();

observable.subscribe({
  next: (event: ExecutionEvent) => {
    if (event.type === 'start') console.log('开始');
    if (event.type === 'progress') console.log('进度:', event.progress);
  },
  error: (err) => console.error('错误:', err),
  complete: () => console.log('完成')
});
```

### Observable 最佳实践（未来）

```typescript
// 使用 pipe（待实现）
execution.executeAsync()
  .pipe(
    filter(event => event.type === 'progress'),
    map(event => event.progress),
    throttle(1000)  // 防止过多更新
  )
  .subscribe(progress => updateUI(progress));

// 取消执行
const subscription = observable.subscribe(...);
subscription.unsubscribe();  // 自动清理
```

### EventManager 使用示例（Core 层内部）

```typescript
// Core 层：EventManager
const unsubscribe = eventManager.on(
  EventType.NODE_COMPLETED,
  (event) => console.log('节点完成:', event.nodeId),
  { 
    priority: 10,           // 高优先级
    filter: (e) => e.result.isSuccess  // 仅成功的节点
  }
);

// 等待事件
await eventManager.waitFor(
  EventType.THREAD_COMPLETED,
  30000,  // 30秒超时
  (event) => event.threadId === myThreadId
);
```

---

## 结论

| 维度 | 结论 |
|-----|------|
| **是否提升 Observable 到 Core？** | ❌ 不需要 |
| **是否用 Observable 改进 EventManager？** | ❌ 不适合 |
| **是否增强 Observable 功能？** | ✅ 建议实现操作符 |
| **是否调整分层？** | ✅ 明确文档和职责边界 |

**最终建议**：保持现有分层架构，并在 API 层增强 Observable 的操作符支持，为用户提供更优雅的响应式编程体验。
