# Domain层Value Objects分层重构方案

## 概述

本文档提供了对domain层各模块value-objects的分层分析和重构方案，旨在提高代码的可维护性和可理解性。

## 当前问题

当前domain层各模块的value-objects文件都堆积在单一目录中，缺乏清晰的职责划分，导致：
- 代码结构不清晰
- 难以快速定位相关值对象
- 模块内职责不明确
- 不利于代码维护和理解

## 分层方案

根据值对象的职责和特性，将value-objects分为以下6层：

### 1. 基础层（Base Layer）
- **职责**：通用的、跨模块的基础值对象
- **特点**：被多个模块使用，具有通用性
- **示例**：ID、时间戳、版本等

### 2. 标识层（Identity Layer）
- **职责**：实体标识符相关的值对象
- **特点**：表示实体的唯一标识，通常是简单的ID包装
- **示例**：节点ID、会话ID、线程ID、工作流ID等
- **命名原因**：避免与DDD中的"实体"概念混淆，这些值对象实际上是标识符而非完整的实体

### 3. 复合层（Composite Layer）
- **职责**：复合的值对象，包含多个相关属性
- **特点**：封装复杂的数据结构，提供类型安全和验证
- **示例**：节点值对象、边值对象、线程定义、工作流定义等
- **命名原因**：这些值对象通常包含多个属性，形成复合结构

### 4. 状态层（Status Layer）
- **职责**：状态和枚举相关的值对象
- **特点**：表示实体的状态或分类
- **示例**：节点状态、工作流状态、工具类型等

### 5. 配置层（Configuration Layer）
- **职责**：各种配置相关的值对象
- **特点**：包含实体的配置参数
- **示例**：工作流配置、模型配置、会话配置等

### 6. 操作层（Operation Layer）
- **职责**：操作和执行相关的值对象
- **特点**：与实体的操作和执行过程相关
- **示例**：执行状态、操作结果、执行上下文等

### 7. 统计层（Statistics Layer）
- **职责**：统计和指标相关的值对象
- **特点**：用于监控和分析
- **示例**：性能统计、资源使用、操作统计等

## 各模块分层结构

### Common模块

#### 当前结构
```
src/domain/common/value-objects/
├── id.ts
├── timestamp.ts
├── user-id.ts
├── value-object.ts
├── version.ts
└── index.ts
```

#### 重组后结构
```
src/domain/common/value-objects/
├── base/
│   ├── id.ts              # 保持不变
│   ├── timestamp.ts       # 保持不变
│   ├── value-object.ts    # 保持不变
│   └── version.ts         # 保持不变
├── identity/
│   └── user-id.ts         # 移动到identity目录
└── index.ts               # 更新导出
```

#### 操作清单
- [ ] 创建 `src/domain/common/value-objects/base/` 目录
- [ ] 创建 `src/domain/common/value-objects/identity/` 目录
- [ ] 移动 `user-id.ts` 到 `identity/` 目录
- [ ] 移动 `id.ts`, `timestamp.ts`, `value-object.ts`, `version.ts` 到 `base/` 目录
- [ ] 更新 `index.ts` 文件

### Workflow模块

#### 当前结构
```
src/domain/workflow/value-objects/
├── edge-id.ts
├── edge-type.ts
├── edge-value-object.ts
├── error-handling-strategy.ts
├── execution-mode.ts
├── execution-status.ts
├── execution-strategy.ts
├── hook-point.ts
├── hook-value-object.ts
├── node-id.ts
├── node-status.ts
├── node-type.ts
├── node-value-object.ts
├── prompt-context.ts
├── trigger-value-object.ts
├── workflow-config.ts
├── workflow-definition.ts
├── workflow-status.ts
├── workflow-type.ts
└── index.ts
```

#### 重组后结构
```
src/domain/workflow/value-objects/
├── identity/
│   ├── node-id.ts
│   └── edge-id.ts
├── composite/
│   ├── node-value-object.ts
│   ├── edge-value-object.ts
│   └── workflow-definition.ts
├── status/
│   ├── node-type.ts
│   ├── node-status.ts
│   ├── edge-type.ts
│   ├── workflow-status.ts
│   └── workflow-type.ts
├── configuration/
│   ├── workflow-config.ts
│   ├── execution-mode.ts
│   ├── execution-strategy.ts
│   └── error-handling-strategy.ts
├── operation/
│   ├── execution-status.ts
│   ├── hook-point.ts
│   ├── hook-value-object.ts
│   ├── trigger-value-object.ts
│   └── prompt-context.ts
└── index.ts
```

#### 操作清单
- [ ] 创建 `identity/`, `composite/`, `status/`, `configuration/`, `operation/` 目录
- [ ] 移动相应文件到对应目录
- [ ] 更新 `index.ts` 文件

### Sessions模块

#### 当前结构
```
src/domain/sessions/value-objects/
├── index.ts
├── llm-statistics.ts
├── operation-statistics.ts
├── performance-statistics.ts
├── resource-usage.ts
├── session-activity.ts
├── session-config.ts
├── session-id.ts
├── session-status.ts
└── operations/
    ├── copy/
    │   ├── copy-context.ts
    │   └── copy-strategy.ts
    ├── fork/
    │   ├── fork-context.ts
    │   └── fork-strategy.ts
    ├── index.ts
    └── thread-operation-result.ts
```

#### 重组后结构
```
src/domain/sessions/value-objects/
├── identity/
│   └── session-id.ts
├── status/
│   └── session-status.ts
├── configuration/
│   └── session-config.ts
├── operation/
│   ├── session-activity.ts
│   └── operations/
│       ├── copy/
│       │   ├── copy-context.ts
│       │   └── copy-strategy.ts
│       ├── fork/
│       │   ├── fork-context.ts
│       │   └── fork-strategy.ts
│       ├── index.ts
│       └── thread-operation-result.ts
├── statistics/
│   ├── llm-statistics.ts
│   ├── performance-statistics.ts
│   ├── resource-usage.ts
│   └── operation-statistics.ts
└── index.ts
```

#### 操作清单
- [ ] 创建 `identity/`, `status/`, `configuration/`, `operation/`, `statistics/` 目录
- [ ] 移动相应文件到对应目录
- [ ] 保持 `operations/` 子目录结构，移动到 `operation/` 下
- [ ] 更新 `index.ts` 文件

### LLM模块

#### 当前结构
```
src/domain/llm/value-objects/
├── echelon.ts
├── human-relay-config.ts
├── human-relay-mode.ts
├── human-relay-session-status.ts
├── index.ts
├── llm-message.ts
├── llm-request-options.ts
├── model-config.ts
├── pool-instance.ts
├── prompt-template.ts
└── rotation-strategy.ts
```

#### 重组后结构
```
src/domain/llm/value-objects/
├── composite/
│   └── pool-instance.ts
├── status/
│   ├── echelon.ts
│   ├── human-relay-mode.ts
│   └── human-relay-session-status.ts
├── configuration/
│   ├── model-config.ts
│   ├── llm-request-options.ts
│   ├── human-relay-config.ts
│   └── prompt-template.ts
├── operation/
│   ├── llm-message.ts
│   └── rotation-strategy.ts
└── index.ts
```

#### 操作清单
- [ ] 创建 `composite/`, `status/`, `configuration/`, `operation/` 目录
- [ ] 移动相应文件到对应目录
- [ ] 更新 `index.ts` 文件

### Threads模块

#### 当前结构
```
src/domain/threads/value-objects/
├── execution-context.ts
├── index.ts
├── node-execution.ts
├── thread-definition.ts
├── thread-execution.ts
├── thread-id.ts
├── thread-priority.ts
└── thread-status.ts
```

#### 重组后结构
```
src/domain/threads/value-objects/
├── identity/
│   └── thread-id.ts
├── composite/
│   ├── thread-definition.ts
│   └── thread-execution.ts
├── status/
│   ├── thread-status.ts
│   └── thread-priority.ts
├── operation/
│   ├── node-execution.ts
│   └── execution-context.ts
└── index.ts
```

#### 操作清单
- [ ] 创建 `identity/`, `composite/`, `status/`, `operation/` 目录
- [ ] 移动相应文件到对应目录
- [ ] 更新 `index.ts` 文件

### Tools模块

#### 当前结构
```
src/domain/tools/value-objects/
├── tool-execution-status.ts
├── tool-status.ts
└── tool-type.ts
```

#### 重组后结构
```
src/domain/tools/value-objects/
├── status/
│   ├── tool-type.ts
│   ├── tool-status.ts
│   └── tool-execution-status.ts
└── index.ts
```

#### 操作清单
- [ ] 创建 `status/` 目录
- [ ] 移动所有文件到 `status/` 目录
- [ ] 创建 `index.ts` 文件

### Checkpoint模块

#### 当前结构
```
src/domain/checkpoint/value-objects/
├── checkpoint-id.ts
├── checkpoint-type.ts
└── index.ts
```

#### 重组后结构
```
src/domain/checkpoint/value-objects/
├── identity/
│   └── checkpoint-id.ts
├── status/
│   └── checkpoint-type.ts
└── index.ts
```

#### 操作清单
- [ ] 创建 `identity/`, `status/` 目录
- [ ] 移动相应文件到对应目录
- [ ] 更新 `index.ts` 文件

### History模块

#### 当前结构
```
src/domain/history/value-objects/
├── history-type.ts
└── index.ts
```

#### 重组后结构
```
src/domain/history/value-objects/
├── status/
│   └── history-type.ts
└── index.ts
```

#### 操作清单
- [ ] 创建 `status/` 目录
- [ ] 移动 `history-type.ts` 到 `status/` 目录
- [ ] 更新 `index.ts` 文件

### Prompts模块

#### 当前结构
```
src/domain/prompts/value-objects/
├── index.ts
├── prompt-id.ts
├── prompt-status.ts
└── prompt-type.ts
```

#### 重组后结构
```
src/domain/prompts/value-objects/
├── identity/
│   └── prompt-id.ts
├── status/
│   ├── prompt-status.ts
│   └── prompt-type.ts
└── index.ts
```

#### 操作清单
- [ ] 创建 `identity/`, `status/` 目录
- [ ] 移动相应文件到对应目录
- [ ] 更新 `index.ts` 文件

## 实施指南

### 实施原则

1. **渐进式重构**：按模块逐步进行，避免一次性大规模修改
2. **保持向后兼容**：在重构过程中保持API的兼容性
3. **测试驱动**：确保每个步骤都有对应的测试覆盖
4. **文档同步**：及时更新相关文档和注释

### 实施顺序

按照依赖关系，建议按以下顺序进行重构：

1. **Common模块**（基础层，被其他模块依赖）
2. **Checkpoint模块**（依赖较少）
3. **History模块**（依赖较少）
4. **Prompts模块**（依赖较少）
5. **Tools模块**（依赖较少）
6. **LLM模块**（中等依赖）
7. **Threads模块**（中等依赖）
8. **Sessions模块**（依赖较多）
9. **Workflow模块**（依赖最多）

### 模块重构步骤

每个模块的重构遵循以下步骤：

1. **创建新的目录结构**
2. **移动文件到新目录**
3. **更新文件内的导入路径**
4. **更新index.ts文件**
5. **运行测试验证**
6. **修复测试失败**
7. **提交更改**

### 自动化脚本

#### 目录创建脚本

```javascript
// scripts/create-directories.js
const fs = require('fs');
const path = require('path');

const modules = [
  'common',
  'workflow',
  'sessions',
  'llm',
  'threads',
  'tools',
  'checkpoint',
  'history',
  'prompts'
];

const layerMap = {
  common: ['base', 'identity'],
  workflow: ['identity', 'composite', 'status', 'configuration', 'operation'],
  sessions: ['identity', 'status', 'configuration', 'operation', 'statistics'],
  llm: ['composite', 'status', 'configuration', 'operation'],
  threads: ['identity', 'composite', 'status', 'operation'],
  tools: ['status'],
  checkpoint: ['identity', 'status'],
  history: ['status'],
  prompts: ['identity', 'status']
};

modules.forEach(module => {
  const basePath = `src/domain/${module}/value-objects`;
  const layers = layerMap[module] || [];
  
  layers.forEach(layer => {
    const dirPath = path.join(basePath, layer);
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
      console.log(`创建目录: ${dirPath}`);
    }
  });
});
```

#### 文件移动脚本

```javascript
// scripts/move-files.js
const fs = require('fs');
const path = require('path');

const fileMoves = [
  // Common模块
  { from: 'src/domain/common/value-objects/id.ts', to: 'src/domain/common/value-objects/base/id.ts' },
  { from: 'src/domain/common/value-objects/timestamp.ts', to: 'src/domain/common/value-objects/base/timestamp.ts' },
  { from: 'src/domain/common/value-objects/value-object.ts', to: 'src/domain/common/value-objects/base/value-object.ts' },
  { from: 'src/domain/common/value-objects/version.ts', to: 'src/domain/common/value-objects/base/version.ts' },
  { from: 'src/domain/common/value-objects/user-id.ts', to: 'src/domain/common/value-objects/identity/user-id.ts' },
  
  // Workflow模块
  { from: 'src/domain/workflow/value-objects/node-id.ts', to: 'src/domain/workflow/value-objects/identity/node-id.ts' },
  { from: 'src/domain/workflow/value-objects/node-value-object.ts', to: 'src/domain/workflow/value-objects/composite/node-value-object.ts' },
  // ... 其他文件移动映射
];

fileMoves.forEach(move => {
  if (fs.existsSync(move.from)) {
    // 确保目标目录存在
    const targetDir = path.dirname(move.to);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }
    
    // 移动文件
    fs.renameSync(move.from, move.to);
    console.log(`移动文件: ${move.from} -> ${move.to}`);
  } else {
    console.log(`文件不存在: ${move.from}`);
  }
});
```

#### 导入路径更新脚本

```javascript
// scripts/update-imports.js
const fs = require('fs');
const path = require('path');
const glob = require('glob');

const importUpdates = [
  // Common模块
  {
    from: /from ['"]\.\.\/common\/value-objects\/id['"]/g,
    to: 'from \'../common/value-objects/base/id\''
  },
  {
    from: /from ['"]\.\.\/common\/value-objects\/timestamp['"]/g,
    to: 'from \'../common/value-objects/base/timestamp\''
  },
  // ... 其他导入路径更新规则
];

// 获取所有TypeScript文件
const files = glob.sync('src/**/*.ts');

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let hasChanges = false;
  
  importUpdates.forEach(update => {
    if (update.from.test(content)) {
      content = content.replace(update.from, update.to);
      hasChanges = true;
    }
  });
  
  if (hasChanges) {
    fs.writeFileSync(file, content);
    console.log(`更新导入路径: ${file}`);
  }
});
```

### 验证与测试

#### 编译检查

```bash
# 检查TypeScript编译
npx tsc --noEmit

# 检查ESLint
npx eslint src/**/*.ts --fix
```

#### 测试运行

```bash
# 运行所有测试
npm test

# 运行特定模块测试
npm test -- --testPathPattern=workflow
npm test -- --testPathPattern=sessions
```

#### 覆盖率检查

```bash
# 检查测试覆盖率
npm test -- --coverage
```

### 回滚计划

如果重构过程中遇到严重问题，可以使用以下回滚策略：

1. **部分回滚**
   ```bash
   git checkout HEAD~1 -- src/domain/workflow/value-objects/
   ```

2. **完全回滚**
   ```bash
   git checkout main -- src/domain/
   ```

3. **创建回滚分支**
   ```bash
   git checkout -b rollback/value-objects
   git checkout main -- .
   ```

### 文档更新

重构完成后，需要更新以下文档：

1. **架构文档**
   - 更新domain层结构说明
   - 更新value-objects分层说明

2. **API文档**
   - 更新导入路径示例
   - 更新使用指南

3. **开发指南**
   - 更新新value-objects创建指南
   - 更新目录结构说明

### 后续维护

1. **代码审查**
   - 确保所有更改符合分层原则
   - 检查是否有循环依赖

2. **性能监控**
   - 监控重构后的性能影响
   - 确保没有引入性能问题

3. **持续改进**
   - 收集开发者反馈
   - 根据使用情况调整分层结构

## 特殊处理

### 单一文件处理
对于只有一个文件的目录（如tools、history），仍然按照分层结构创建目录，保持一致性。

### 子目录处理
对于已有的子目录结构（如sessions/operations），保持其内部结构，将其整体移动到合适的分层目录下。

### 循环依赖处理
重组过程中需要注意避免循环依赖，特别是跨层引用时。

### 目录命名说明

#### Identity vs Entity
- **Identity**：用于标识符值对象，如NodeId、SessionId等，这些是简单的ID包装器
- **Entity**：避免使用此名称，因为在DDD中"实体"有特定含义，容易造成混淆
- **Composite**：用于复合值对象，包含多个属性的复杂结构，如NodeValueObject、WorkflowDefinition等

#### 为什么不使用Entity
1. **概念混淆**：在DDD中，Entity是有身份标识和生命周期的对象，而这里的值对象是不可变的
2. **职责不清**：原来的entity目录既包含简单ID又包含复合对象，职责不明确
3. **语义更准确**：Identity和Composite更准确地描述了这些值对象的实际职责

## 总结

这个分层方案将显著提高代码的可维护性和可理解性，使开发者能够更容易地定位和使用相关的值对象。通过渐进式重构和自动化脚本，可以确保重构过程的顺利进行，同时保持代码的稳定性和测试覆盖率。

改进后的分层方案将原来的"entity"目录拆分为更精确的"identity"和"composite"两个目录，避免了与DDD中"实体"概念的混淆，使职责划分更加清晰。