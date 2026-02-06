# 脚本启用/禁用功能实现方案分析

## 问题描述

在 `sdk/api/resources/scripts/script-registry-api.ts:114-119` 中，存在一个未完成的过滤逻辑：

```typescript
if (filter.enabled !== undefined) {
  // 注意：Script接口目前没有enabled字段，这里假设所有脚本都是启用的
  // 如果需要支持禁用脚本，需要在Script接口中添加enabled字段
  return true;
}
```

当前代码虽然定义了 `ScriptFilter.enabled` 字段，但由于 `Script` 接口缺少 `enabled` 字段，导致过滤功能无法正常工作。

## 架构分析

根据 SDK 的分层架构：

```
Types Layer (sdk/types/) ← Utils Layer ← Core Layer ← API Layer
```

### 当前相关文件

1. **Types 层** (`sdk/types/code.ts`)
   - 定义 `Script` 接口
   - 定义 `ScriptMetadata` 接口
   - 定义 `ScriptType` 枚举

2. **API 层** (`sdk/api/types/code-types.ts`)
   - 定义 `ScriptFilter` 接口（已包含 `enabled` 字段）
   - 定义 `ScriptRegistrationConfig` 接口（已包含 `enable` 字段）

3. **Core 层** (`sdk/core/`)
   - `code/code-registry.ts`: 脚本注册表
   - `services/code-service.ts`: 脚本服务

4. **API 层** (`sdk/api/resources/scripts/`)
   - `script-registry-api.ts`: 脚本资源管理 API

## 实现方案

### 方案选择

**推荐方案：在 Script 接口中添加 enabled 字段**

**理由**：
1. `enabled` 是脚本的核心状态属性，应该直接放在 `Script` 接口中
2. 符合现有架构设计原则
3. 便于查询和过滤
4. 向后兼容性好（设置默认值）

### 需要修改的文件

#### 1. Types 层修改

**文件**: `sdk/types/code.ts`

**修改内容**:
在 `Script` 接口中添加 `enabled` 字段：

```typescript
export interface Script {
  /** 脚本唯一标识符 */
  id: ID;
  /** 脚本名称 */
  name: string;
  /** 脚本类型 */
  type: ScriptType;
  /** 脚本描述 */
  description: string;
  /** 脚本内容（内联代码） */
  content?: string;
  /** 脚本文件路径（外部文件） */
  filePath?: string;
  /** 脚本执行选项 */
  options: ScriptExecutionOptions;
  /** 脚本元数据 */
  metadata?: ScriptMetadata;
  /** 是否启用（默认为 true） */
  enabled?: boolean;
}
```

**注意**：
- 使用可选字段 `enabled?: boolean` 保持向后兼容
- 默认值为 `true`（在代码逻辑中处理）

#### 2. Core 层修改

**文件**: `sdk/core/code/code-registry.ts`

**修改内容**:

a) 在 `validate` 方法中添加 `enabled` 字段验证：

```typescript
validate(script: Script): boolean {
  // ... 现有验证逻辑 ...
  
  // 验证 enabled 字段（如果提供）
  if (script.enabled !== undefined && typeof script.enabled !== 'boolean') {
    throw new ValidationError(
      'Script enabled must be a boolean',
      'enabled',
      script.enabled
    );
  }
  
  return true;
}
```

b) 在 `register` 方法中设置默认值：

```typescript
register(script: Script): void {
  // 验证脚本定义
  this.validate(script);
  
  // 设置默认值
  const scriptWithDefaults: Script = {
    ...script,
    enabled: script.enabled !== undefined ? script.enabled : true
  };
  
  // 检查脚本名称是否已存在
  if (this.scripts.has(script.name)) {
    throw new ValidationError(
      `Script with name '${script.name}' already exists`,
      'name',
      script.name
    );
  }
  
  // 注册脚本
  this.scripts.set(script.name, scriptWithDefaults);
}
```

c) 在 `update` 方法中保持默认值：

```typescript
update(scriptName: string, updates: Partial<Script>): void {
  const script = this.get(scriptName);
  if (!script) {
    throw new NotFoundError(
      `Script '${scriptName}' not found`,
      'script',
      scriptName
    );
  }
  
  const updatedScript = { 
    ...script, 
    ...updates,
    // 确保 enabled 字段有默认值
    enabled: updates.enabled !== undefined ? updates.enabled : (script.enabled ?? true)
  };
  
  this.validate(updatedScript);
  this.scripts.set(scriptName, updatedScript);
}
```

**文件**: `sdk/core/services/code-service.ts`

**修改内容**:

添加启用/禁用脚本的便捷方法：

```typescript
/**
 * 启用脚本
 * @param scriptName 脚本名称
 * @throws NotFoundError 如果脚本不存在
 */
enableScript(scriptName: string): void {
  this.updateScript(scriptName, { enabled: true });
}

/**
 * 禁用脚本
 * @param scriptName 脚本名称
 * @throws NotFoundError 如果脚本不存在
 */
disableScript(scriptName: string): void {
  this.updateScript(scriptName, { enabled: false });
}

/**
 * 检查脚本是否启用
 * @param scriptName 脚本名称
 * @returns 是否启用
 * @throws NotFoundError 如果脚本不存在
 */
isScriptEnabled(scriptName: string): boolean {
  const script = this.getScript(scriptName);
  return script.enabled ?? true;
}
```

#### 3. API 层修改

**文件**: `sdk/api/resources/scripts/script-registry-api.ts`

**修改内容**:

a) 修复 `applyFilter` 方法中的过滤逻辑：

```typescript
protected applyFilter(scripts: Script[], filter: ScriptFilter): Script[] {
  return scripts.filter(script => {
    if (filter.name && !script.name.includes(filter.name)) {
      return false;
    }
    if (filter.type && script.type !== filter.type) {
      return false;
    }
    if (filter.category && script.metadata?.category !== filter.category) {
      return false;
    }
    if (filter.tags && script.metadata?.tags) {
      if (!filter.tags.every(tag => script.metadata?.tags?.includes(tag))) {
        return false;
      }
    }
    if (filter.enabled !== undefined) {
      // 使用 enabled 字段进行过滤，默认值为 true
      const scriptEnabled = script.enabled ?? true;
      if (scriptEnabled !== filter.enabled) {
        return false;
      }
    }
    return true;
  });
}
```

b) 添加启用/禁用脚本的 API 方法：

```typescript
/**
 * 启用脚本
 * @param scriptName 脚本名称
 */
async enableScript(scriptName: string): Promise<void> {
  this.codeService.enableScript(scriptName);
  // 清除缓存
  this.invalidateCache();
}

/**
 * 禁用脚本
 * @param scriptName 脚本名称
 */
async disableScript(scriptName: string): Promise<void> {
  this.codeService.disableScript(scriptName);
  // 清除缓存
  this.invalidateCache();
}

/**
 * 检查脚本是否启用
 * @param scriptName 脚本名称
 * @returns 是否启用
 */
async isScriptEnabled(scriptName: string): Promise<boolean> {
  return this.codeService.isScriptEnabled(scriptName);
}
```

c) 在 `validateResource` 方法中添加 `enabled` 字段验证：

```typescript
protected override validateResource(script: Script): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!script.name || script.name.trim() === '') {
    errors.push('脚本名称不能为空');
  }

  if (!script.type || script.type.trim() === '') {
    errors.push('脚本类型不能为空');
  }

  if (!script.content && !script.filePath) {
    errors.push('脚本内容或文件路径必须提供其中一个');
  }

  if (!script.description || script.description.trim() === '') {
    errors.push('脚本描述不能为空');
  }

  // 验证 enabled 字段（如果提供）
  if (script.enabled !== undefined && typeof script.enabled !== 'boolean') {
    errors.push('enabled 字段必须是布尔值');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}
```

## 实现步骤

### 步骤 1: 修改 Types 层
1. 在 `sdk/types/code.ts` 的 `Script` 接口中添加 `enabled?: boolean` 字段
2. 运行类型检查：`cd sdk && tsc --noEmit`

### 步骤 2: 修改 Core 层
1. 修改 `sdk/core/code/code-registry.ts`：
   - 更新 `validate` 方法
   - 更新 `register` 方法（设置默认值）
   - 更新 `update` 方法（保持默认值）
2. 修改 `sdk/core/services/code-service.ts`：
   - 添加 `enableScript` 方法
   - 添加 `disableScript` 方法
   - 添加 `isScriptEnabled` 方法
3. 运行类型检查：`cd sdk && tsc --noEmit`

### 步骤 3: 修改 API 层
1. 修改 `sdk/api/resources/scripts/script-registry-api.ts`：
   - 修复 `applyFilter` 方法
   - 添加 `enableScript` 方法
   - 添加 `disableScript` 方法
   - 添加 `isScriptEnabled` 方法
   - 更新 `validateResource` 方法
2. 运行类型检查：`cd sdk && tsc --noEmit`

### 步骤 4: 编写测试
1. 在 `sdk/core/code/__tests__/` 中添加 `code-registry.test.ts` 测试
2. 在 `sdk/core/services/__tests__/` 中添加 `code-service.test.ts` 测试
3. 在 `sdk/api/resources/scripts/__tests__/` 中添加 `script-registry-api.test.ts` 测试

### 步骤 5: 运行测试
```bash
cd sdk
npm test <test_file_path>
```

## 向后兼容性

### 兼容性保证

1. **可选字段**: `enabled` 字段定义为可选字段 `enabled?: boolean`
2. **默认值**: 在 `CodeRegistry.register` 方法中设置默认值为 `true`
3. **现有脚本**: 所有已注册的脚本默认为启用状态
4. **API 行为**: 不传递 `enabled` 参数时，脚本默认启用

### 迁移路径

1. **第一阶段**: 添加 `enabled` 字段，所有现有脚本默认启用
2. **第二阶段**: 逐步为需要禁用的脚本设置 `enabled: false`
3. **第三阶段**: 在应用层使用新的启用/禁用 API

## 使用示例

### 注册脚本（启用）

```typescript
const script: Script = {
  id: generateId(),
  name: 'my-script',
  type: ScriptType.PYTHON,
  description: 'My Python script',
  content: 'print("Hello")',
  options: { timeout: 5000 },
  enabled: true  // 可选，默认为 true
};

scriptRegistryAPI.register(script);
```

### 注册脚本（禁用）

```typescript
const script: Script = {
  id: generateId(),
  name: 'my-disabled-script',
  type: ScriptType.PYTHON,
  description: 'My disabled Python script',
  content: 'print("Disabled")',
  options: { timeout: 5000 },
  enabled: false
};

scriptRegistryAPI.register(script);
```

### 查询启用的脚本

```typescript
const enabledScripts = await scriptRegistryAPI.list({
  enabled: true
});
```

### 查询禁用的脚本

```typescript
const disabledScripts = await scriptRegistryAPI.list({
  enabled: false
});
```

### 启用/禁用脚本

```typescript
// 启用脚本
await scriptRegistryAPI.enableScript('my-script');

// 禁用脚本
await scriptRegistryAPI.disableScript('my-script');

// 检查脚本是否启用
const isEnabled = await scriptRegistryAPI.isScriptEnabled('my-script');
```

## 注意事项

1. **类型安全**: 确保所有使用 `Script` 类型的地方都正确处理 `enabled` 字段
2. **缓存失效**: 启用/禁用脚本后需要清除缓存
3. **执行检查**: 在 `CodeService.execute` 方法中可以考虑检查脚本是否启用（可选）
4. **文档更新**: 更新相关文档说明新增的启用/禁用功能

## 可选增强功能

### 1. 执行时检查启用状态

在 `CodeService.execute` 方法中添加启用状态检查：

```typescript
async execute(
  scriptName: string,
  options: Partial<ScriptExecutionOptions> = {},
  threadContext?: ThreadContext
): Promise<ScriptExecutionResult> {
  const script = this.getScript(scriptName);
  
  // 检查脚本是否启用
  if (!this.isScriptEnabled(scriptName)) {
    throw new CodeExecutionError(
      `Script '${scriptName}' is disabled`,
      scriptName,
      script.type
    );
  }
  
  // ... 其余执行逻辑
}
```

### 2. 批量启用/禁用

在 `ScriptRegistryAPI` 中添加批量操作方法：

```typescript
async enableScripts(scriptNames: string[]): Promise<void> {
  for (const name of scriptNames) {
    await this.enableScript(name);
  }
}

async disableScripts(scriptNames: string[]): Promise<void> {
  for (const name of scriptNames) {
    await this.disableScript(name);
  }
}
```

## 总结

通过在 `Script` 接口中添加 `enabled` 字段，并在各层相应地修改验证、注册、更新和过滤逻辑，可以完整实现脚本的启用/禁用功能。该方案：

1. **符合架构设计**: 遵循 SDK 的分层架构原则
2. **向后兼容**: 使用可选字段和默认值保证兼容性
3. **功能完整**: 提供启用、禁用、查询等完整功能
4. **易于使用**: API 设计简洁直观
5. **可扩展性**: 为未来增强功能预留空间