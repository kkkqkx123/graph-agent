# 多分支数据聚合机制

## 背景

当前 FORK/JOIN 的工作流支持并发执行多个分支，但在数据聚合方面的能力有限。

现状：
- SYNC 节点可以在分支间显式同步单向数据（源分支 → 目标分支）
- 多分支数据必须在 JOIN 后由后续节点（SCRIPT、LLM 等）手动聚合

在需要自动收集所有分支输出的场景中，这增加了工作流复杂度。

---

## 问题场景

### 场景 1：并行处理后聚合结果

```
FORK (并行 3 个分支)
  ├─ Branch A: 调用 LLM 分析用户反馈
  ├─ Branch B: 查询数据库获取历史数据
  └─ Branch C: 调用 API 获取外部数据

需要：在 JOIN 后自动将 [A.result, B.result, C.result] 聚合为一个数组
当前做法：JOIN 后用 SCRIPT 节点手动收集
```

### 场景 2：条件聚合（只收集满足条件的分支结果）

```
FORK (处理多个用户请求)
  └─ 每个分支返回 { userId, status, data }

需要：只聚合 status === 'success' 的分支结果
当前做法：无直接支持，需要后续脚本筛选
```

---

## 提议方案

### 方案 A：JOIN 节点增强

给 JOIN 节点添加数据聚合配置：

**配置选项**：
- `aggregationMode`：none（默认）| array | object | custom
- `arrayMode`：unordered（默认）| ordered
- `filterExpression`：（可选）过滤条件
- `mergeStrategy`：how to handle conflicts when merging objects

**使用示例**：

```
JOIN 节点配置:
  aggregationMode: 'array'
  arrayMode: 'ordered'
  
效果：自动生成 [branch_a_output, branch_b_output, branch_c_output]
存入指定变量 (如 'all_results')
```

**优点**：
- 简单直观，无需额外代码
- JOIN 节点本身就负责分支同步，扩展其职责合理
- 配置化，易于重用

**局限**：
- 只能聚合分支的直接输出
- 复杂的转换逻辑仍需后续脚本

### 方案 B：独立的 Aggregator 节点

创建专门的聚合节点：

**责任**：
- 收集所有分支输出
- 支持灵活的聚合策略（数组、对象、自定义）
- 支持过滤和转换

**使用示例**：

```
FORK → ... → JOIN
           → AGGREGATOR 节点
             ├─ 输入：多个分支的指定变量
             ├─ 聚合策略：array/object/merge/custom
             └─ 输出：聚合结果

AGGREGATOR 配置:
  inputs:
    - sourcePathId: 'branch_a', variable: 'result'
    - sourcePathId: 'branch_b', variable: 'result'
    - sourcePathId: 'branch_c', variable: 'result'
  aggregationMode: 'array'
  outputVariable: 'all_results'
```

**优点**：
- 职责清晰，不污染 JOIN 节点
- 灵活性高，支持复杂的聚合逻辑
- 易于理解"聚合"这个独立的概念

**局限**：
- 引入新节点类型，增加系统复杂度
- 需要显式配置每个输入源

---

## 现状与决策

### 当前设计意图

从 SYNC 节点的设计看，系统倾向于"显式传参"的哲学：
- 所有数据流都在配置中声明
- 避免隐式的全局数据收集
- 便于理解和调试数据流

这意味着自动聚合可能不符合系统的设计方向。

### 推荐决策

**暂不实施内置聚合机制**，原因：

1. **设计一致性**：保持显式数据流的理念
2. **工作流清晰**：多分支聚合在 JOIN 后明确表示，易于追踪
3. **收益有限**：这个场景虽然常见，但聚合逻辑通常简单（SCRIPT 节点即可）
4. **技术债低**：缺少聚合不会导致无法实现功能，只是多一步操作

### 可选的改进

如果未来确实需要改进多分支聚合的体验，建议：

1. **提供聚合工具函数库**
   - 在 SCRIPT 节点中可直接调用 `aggregateResults([...])` 等辅助函数
   - 减少重复代码

2. **发布聚合模板**
   - 常见聚合模式的工作流模板
   - 用户可复用而不需理解细节

3. **增强 VARIABLE 节点**
   - 支持数组和对象的复杂赋值
   - 减少必须使用 SCRIPT 的场景

---

## 结论

当前的设计（多分支聚合由后续节点负责）是合理的：

- ✅ 与"显式数据流"的设计理念一致
- ✅ 保持系统的简洁性
- ✅ 不影响功能完整性

在实际工作流中，这不是瓶颈。建议保持现状，待有具体的痛点反馈后再考虑改进。

