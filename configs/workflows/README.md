# Workflow配置目录结构说明

## 目录结构

```
configs/workflows/
├── base/                    # 基础子工作流（无状态、可复用）
│   ├── llm-call.toml       # LLM调用基础操作
│   ├── tool-execution.toml # 工具执行基础操作
│   └── data-transform.toml # 数据转换基础操作
├── features/                # 功能完整工作流
│   ├── data-processing/    # 数据处理工作流
│   ├── analysis/           # 分析工作流
│   └── ...
└── business/               # 业务完整工作流
    ├── order-processing/   # 订单处理工作流
    ├── user-onboarding/    # 用户入职工作流
    └── ...
```

## 层次说明

### 1. 基础子工作流 (base/)
**特点**：
- 封装多个节点/边才能实现的基础操作
- 无状态，可独立测试
- 可被功能工作流和业务工作流引用
- 必须符合子工作流标准

**示例**：
- `llm-call.toml`: LLM调用+工具执行
- `tool-execution.toml`: 工具调用+结果验证
- `data-transform.toml`: 数据转换+格式化

### 2. 功能工作流 (features/)
**特点**：
- 按功能领域划分
- 可引用基础子工作流
- 实现特定功能逻辑
- 可被业务工作流引用

**示例**：
- `data-processing/data-analysis.toml`: 数据分析功能
- `analysis/risk-analysis.toml`: 风险分析功能

### 3. 业务工作流 (business/)
**特点**：
- 完整的业务流程
- 可组合功能和基础子工作流
- 面向具体业务场景
- 可直接执行

**示例**：
- `order-processing/order-analysis.toml`: 订单分析业务流程
- `user-onboarding/user-registration.toml`: 用户注册业务流程
