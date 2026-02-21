# CLI-App 目录修改计划

## 分析概述

基于架构文档、依赖文档和阶段文档，对比当前 `apps/cli-app` 的实际实现，识别出以下需要修改的项目。

---

## 一、文件结构问题

### 1. bin/ 目录缺失可执行文件
**问题**: `package.json` 中定义的 bin 入口是 `./bin/modular-agent.js`，但该文件不存在

**解决方案**:
```
apps/cli-app/
├── bin/
│   └── modular-agent.js    # 需要创建（从 scripts/ 复制或移动）
```

**操作**: 将 `scripts/modular-agent.js` 复制到 `bin/modular-agent.js`

---

## 二、依赖项问题

### 2. 缺少 YAML 解析依赖
**文档要求**: `dependencies.md` 中列出了 `yaml` 包用于 YAML 文件解析

**当前状态**: `package.json` 中没有 `yaml` 依赖

**解决方案**:
```bash
pnpm add yaml
```

### 3. 缺少 winston 日志库
**文档要求**: `dependencies.md` 中推荐使用 `winston` 进行日志记录

**当前状态**: `package.json` 中没有 `winston` 依赖，但代码中使用的是 `@modular-agent/common-utils` 的日志功能

**评估**: 当前实现使用 `@modular-agent/common-utils` 的日志系统已满足需求，可以暂不添加 `winston`

---

## 三、代码实现问题

### 4. WorkflowAdapter 未继承 BaseAdapter
**架构文档要求**: 适配器层应该统一继承 `BaseAdapter`

**当前状态**: `workflow-adapter.ts` 独立实现，没有继承 `BaseAdapter`

**需要修改**:
- 让 `WorkflowAdapter` 继承 `BaseAdapter`
- 统一错误处理逻辑
- 移除重复的 `createLogger` 实例化

### 5. TemplateAdapter 构造函数问题
**当前状态**: `TemplateAdapter` 的构造函数调用了 `super()`，但没有正确传递参数

**需要修改**:
- 确保 `TemplateAdapter` 正确初始化父类

---

## 四、功能增强建议

### 6. 添加输入验证工具 (src/utils/validator.ts)
**架构文档要求**: 应该有输入验证工具

**当前状态**: 缺少 `src/utils/validator.ts` 文件

**建议实现**:
```typescript
// src/utils/validator.ts
import { z } from 'zod';

export function validateFilePath(path: string): boolean {
  // 验证文件路径格式
}

export function validateJSON(jsonString: string): boolean {
  // 验证 JSON 格式
}

export function validateWorkflowId(id: string): boolean {
  // 验证工作流 ID 格式
}
```

### 7. 命令补全支持
**阶段文档第三阶段**: 要求实现命令自动补全功能

**建议**:
- 添加 `src/commands/completion.ts` 文件
- 在 `package.json` 中添加 completion 命令

### 8. 交互式确认功能
**当前状态**: delete 命令有 `--force` 选项，但没有实际实现交互式确认

**建议**:
- 使用 `inquirer` 实现删除前的交互式确认
- 在没有 `--force` 时提示用户确认

---

## 五、测试相关

### 9. 缺少测试文件
**架构文档要求**: 应该有单元测试、集成测试

**建议添加**:
```
apps/cli-app/
├── __tests__/
│   ├── unit/
│   │   ├── adapters/
│   │   ├── commands/
│   │   └── utils/
│   └── integration/
│       └── commands.test.ts
```

---

## 六、配置文件

### 10. 配置加载器优化
**当前状态**: `config-loader.ts` 存在但未在适配器中充分使用

**建议**:
- 在 `BaseAdapter` 中集成配置加载
- 支持从配置文件读取默认参数

---

## 七、README 更新

### 11. README 内容过时
**当前状态**: README 中许多命令标记为"即将实现"，但实际上已实现

**需要更新**:
- 更新命令列表，移除"即将实现"标记
- 添加批量注册命令的文档
- 更新模板管理命令文档

---

## 修改优先级

| 优先级 | 项目 | 原因 |
|--------|------|------|
| 🔴 高 | bin/modular-agent.js | 影响 CLI 正常运行 |
| 🔴 高 | WorkflowAdapter 继承 BaseAdapter | 代码一致性和维护性 |
| 🟡 中 | 添加 yaml 依赖 | 功能完整性 |
| 🟡 中 | 添加 validator.ts | 架构文档要求 |
| 🟢 低 | 交互式确认功能 | 用户体验优化 |
| 🟢 低 | 命令补全支持 | 阶段文档第三阶段 |
| 🟢 低 | 测试文件 | 质量保证 |
| 🟢 低 | README 更新 | 文档准确性 |

---

## 关于可执行文件的说明

**开发模式**: 开发时使用 `pnpm dev` 启动，直接运行 TypeScript 源码
**生产模式**: 构建后使用 `node dist/index.js` 或 `node bin/modular-agent.js` 运行

可执行文件 `bin/modular-agent.js` 应该在构建后可用，它导入的是 `dist/index.js`。

---

## 关于 getSDK 导入的分析

**当前情况**:
- `base-adapter.ts`: 在构造函数中同步导入 `getSDK` 并赋值给 `this.sdk`
- `workflow-adapter.ts`: 每个方法中都动态导入 `getSDK` (`const { getSDK } = await import('@modular-agent/sdk')`)

**问题**:
1. `workflow-adapter.ts` 没有继承 `BaseAdapter`，所以无法使用父类的 `this.sdk`
2. 即使继承了 `BaseAdapter`，动态导入也是多余的，因为父类已经初始化了 `sdk`

**建议**:
1. 让 `WorkflowAdapter` 继承 `BaseAdapter`
2. 直接使用 `this.sdk` 替代动态导入
3. 如果确实需要延迟加载（如避免循环依赖），应在 `BaseAdapter` 中统一实现懒加载模式
