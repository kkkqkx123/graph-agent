# maxToolCalls 快速参考

## 参数说明

### maxToolCalls（循环交互次数）

- **类型**: `number`
- **默认值**: `1`（仅一次调用，不进行循环）
- **范围**: ≥ 1
- **含义**: LLM 与工具交互的最大轮数

### maxToolCallsPerRequest（单次调用工具数）

- **类型**: `number`
- **默认值**: `3`
- **范围**: ≥ 1
- **含义**: 单次 LLM 调用最多返回的工具调用数
- **超限**: 抛出 `ExecutionError`

---

## 快速配置示例

### 最小配置（默认值）

```typescript
{
  profileId: 'gpt-4',
  prompt: 'Do something'
  // 使用默认值：maxToolCalls=1, maxToolCallsPerRequest=3
}
```

### 单工具单轮

```typescript
{
  profileId: 'gpt-4',
  prompt: 'Single action',
  maxToolCalls: 1,
  maxToolCallsPerRequest: 1
}
```

### 多轮对话

```typescript
{
  profileId: 'claude-3',
  prompt: 'Complex task',
  maxToolCalls: 5,           // 5轮交互
  maxToolCallsPerRequest: 3  // 单次3个工具
}
```

### 并行执行

```typescript
{
  profileId: 'gpt-4',
  prompt: 'Parallel tasks',
  maxToolCalls: 1,           // 仅一次调用
  maxToolCallsPerRequest: 10 // 单次最多10个工具
}
```

---

## 执行流程

```
┌─────────────────────────────────────────┐
│ LLM 调用（第1轮）                        │
├─────────────────────────────────────────┤
│ LLM 返回：N 个工具调用                   │
│ ✅ 验证：N ≤ maxToolCallsPerRequest    │
│ ↓                                       │
│ 执行 N 个工具                           │
│ ↓                                       │
│ iterationCount == 1                     │
│ iterationCount < maxToolCalls?          │
│   → 如果是：继续循环                    │
│   → 如果否：结束                        │
└─────────────────────────────────────────┘
  ↓
┌─────────────────────────────────────────┐
│ LLM 调用（第2轮） - 如果需要            │
├─────────────────────────────────────────┤
│ ... 重复验证和执行 ...                   │
└─────────────────────────────────────────┘
  ↓
结束（所有轮次完成）
```

---

## 限制组合

| maxToolCalls | maxToolCallsPerRequest | 最大工具调用数 | 说明 |
|---|---|---|---|
| 1 | 1 | 1 | 严格单工具 |
| 1 | 3 | 3 | 单轮多工具 |
| 3 | 1 | 3 | 多轮单工具 |
| 3 | 3 | 9 | 均衡配置 |
| 5 | 10 | 50 | 激进模式 |

---

## 错误消息

### 工具调用数超限

```
ExecutionError: LLM returned 5 tool calls, exceeds limit of 3.
Configure maxToolCallsPerRequest to adjust this limit.
```

**原因**: 单次返回的工具数超过 `maxToolCallsPerRequest`

**解决**: 增加 `maxToolCallsPerRequest` 值或调整 LLM 参数

---

## 修改历史

| 日期 | 修改 | 原因 |
|---|---|---|
| 当前 | 新增 maxToolCallsPerRequest 和默认值调整 | 提高安全性和可控性 |
| 之前 | 硬编码 maxIterations = 10 | 不可配置，风险高 |

---

## 检查清单

在配置 LLM 节点时：

- [ ] 确认 `maxToolCalls` 是否需要多轮交互
- [ ] 确认 `maxToolCallsPerRequest` 是否需要多工具并行
- [ ] 验证总的工具调用数是否在预期范围
- [ ] 考虑 Token 消耗和时间限制

---

## 相关文件

- 完整实现总结: `docs/analysis/maxToolCalls-implementation-summary.md`
- 语义分析: `docs/analysis/maxToolCalls-semantics-analysis.md`
- 处理逻辑: `docs/analysis/maxToolCalls-processing-analysis.md`
