# 修正后的验证API扩展方案

## 背景分析

根据用户反馈和代码分析，需要重新评估哪些验证功能应该暴露给API层：

### 用户明确指示：
- **GraphValidator** 和 **MessageValidator** 是内部组件，不需要暴露
- 需要关注 **Code、Tool、Node、Hook** 的验证，因为这些组件的定义需要交给API层和应用层

### 代码现状分析：

1. **Code模块**：
   - `CodeConfigValidator` 完全未暴露
   - `ScriptRegistryAPI.validateScript()` 只能验证已注册的脚本，不能验证配置对象
   - 应用层需要在注册前验证脚本配置

2. **Tool模块**：
   - `ToolConfigValidator` 完全未暴露  
   - `ToolRegistryAPI.validateToolParameters()` 只能验证已注册工具的调用参数，不能验证工具配置
   - 应用层需要在注册前验证工具配置

3. **Node模板**：
   - `NodeTemplateRegistryAPI.validateTemplate()` 实现有副作用（通过注册/注销方式）
   - 需要提供无副作用的独立验证方法

4. **Hook验证**：
   - 目前只在`WorkflowValidator`内部使用
   - 如果应用层需要独立验证Hook配置，则需要暴露

## 修正后的解决方案

### 1. CodeConfigValidatorAPI（必需）

**目的**: 提供脚本配置对象的直接验证，无需先注册

**主要方法**:
- `validateScript(script: Script)` - 验证完整的脚本定义
- `validateExecutionOptions(options: ScriptExecutionOptions)` - 验证执行选项
- `validateSandboxConfig(config: SandboxConfig)` - 验证沙箱配置
- `validateScriptTypeCompatibility(scriptType, content?, filePath?)` - 验证类型兼容性

**使用场景**: 
- 应用层在注册脚本前验证配置
- 脚本编辑器的实时验证
- 脚本导入前的格式验证

### 2. ToolConfigValidatorAPI（必需）

**目的**: 提供工具配置对象的直接验证，无需先注册

**主要方法**:
- `validateTool(tool: Tool)` - 验证完整的工具定义
- `validateParameters(parameters: ToolParameters)` - 验证工具参数schema
- `validateToolConfig(toolType: ToolType, config: any)` - 验证特定类型的工具配置
- `validateToolCallParameters(tool: Tool, parameters: Record<string, any>)` - 验证工具调用参数

**使用场景**:
- 应用层在注册工具前验证配置
- 工具编辑器的实时验证
- 工具导入前的格式验证

### 3. 改进NodeTemplate验证（推荐）

**问题**: 当前`NodeTemplateRegistryAPI.validateTemplate()`有副作用

**解决方案**: 在`NodeTemplateRegistryAPI`中添加无副作用的验证方法

**新增方法**:
- `validateNodeTemplate(template: NodeTemplate): ValidationResult` - 无副作用的模板验证

**实现方式**: 直接调用`validateNodeByType`函数，构造mock节点进行验证

### 4. HookValidatorAPI（可选）

**目的**: 提供Hook配置的独立验证

**主要方法**:
- `validateHook(hook: NodeHook, nodeId: string)` - 验证单个Hook
- `validateHooks(hooks: NodeHook[], nodeId: string)` - 验证Hook数组

**使用场景**: 
- 如果应用层需要独立管理Hook配置
- Hook编辑器的实时验证

## API设计原则

1. **无副作用**: 所有验证方法都不修改任何状态
2. **一致性**: 遵循现有API的设计模式
3. **异步接口**: 所有公共方法返回`Promise`
4. **错误处理**: 统一使用`ValidationResult`或抛出`ValidationError`
5. **底层访问**: 提供获取底层验证器实例的方法

## 实施优先级

1. **高优先级**: CodeConfigValidatorAPI、ToolConfigValidatorAPI
2. **中优先级**: 改进NodeTemplate验证
3. **低优先级**: HookValidatorAPI（根据实际需求决定）

## 文件结构

```
sdk/api/validation/
├── workflow-validator-api.ts (已存在)
├── code-config-validator-api.ts (新增)
└── tool-config-validator-api.ts (新增)
```

## API导出更新

```typescript
// 验证API
export { WorkflowValidatorAPI } from './validation/workflow-validator-api';
export { CodeConfigValidatorAPI } from './validation/code-config-validator-api';
export { ToolConfigValidatorAPI } from './validation/tool-config-validator-api';
```

## 预期收益

1. **增强灵活性**: 应用层可以在注册前验证配置
2. **提高开发效率**: 减少无效配置的注册尝试
3. **改善用户体验**: 提供更早的错误反馈
4. **保持一致性**: 所有验证逻辑都来自同一个验证器

## 风险评估

1. **API膨胀**: 新增两个API类，但提供了实际价值
2. **维护成本**: 需要维护额外的API层代码
3. **向后兼容**: 不影响现有功能，完全向后兼容