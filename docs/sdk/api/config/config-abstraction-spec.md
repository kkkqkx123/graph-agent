# SDK API Config 配置抽象规范

## 1. 概述

本文档定义了`sdk/api/config`模块如何支持新增配置抽象的标准流程和规范。Config模块采用无状态、纯函数的设计模式，负责配置文件的解析、验证和转换，而应用层负责业务逻辑和状态管理。

## 2. 架构设计原则

### 2.1 Config模块职责
- **无状态设计**：所有函数都是纯函数，不持有任何状态
- **配置解析**：负责将配置文件内容解析为内部格式
- **配置验证**：使用core/validation模块进行验证
- **配置转换**：将配置文件格式转换为运行时类型
- **不涉及文件I/O**：虽然提供便利方法，但核心逻辑不依赖文件操作
- **不操作注册表**：注册逻辑由应用层负责
- **使用纯函数处理器**：所有处理逻辑都是无状态的纯函数，不使用类或注册表

### 2.2 Processors模块职责
- **纯函数设计**：所有函数都是纯函数，不持有任何状态
- **不使用类定义**：只导出函数，不使用类
- **不使用注册表**：直接通过函数调用，不使用注册表管理实例
- **委托给core层验证器**：验证逻辑委托给core层的验证器

### 2.3 应用层职责
- **业务逻辑**：处理具体的业务需求
- **状态管理**：管理应用状态和依赖
- **注册操作**：将解析结果注册到相应的注册表
- **错误处理**：处理业务层面的错误和异常

### 2.4 分层架构
```
┌─────────────────────────────────────────┐
│         应用层 (Application)            │
│  - ConfigurationAPI                     │
│  - WorkflowBuilder                      │
│  - ResourceAPIs                         │
└──────────────┬──────────────────────────┘
                │ 调用
┌──────────────▼──────────────────────────┐
│      Config模块 (sdk/api/config)        │
│  - ConfigParser                         │
│  - ConfigTransformer                    │
│  - Processors (纯函数)                  │
│  - Validators (纯函数)                  │
└──────────────┬──────────────────────────┘
                │ 使用
┌──────────────▼──────────────────────────┐
│      Core验证层 (sdk/core/validation)   │
│  - WorkflowValidator                    │
│  - NodeTemplateValidator                │
│  - 其他验证器                           │
└─────────────────────────────────────────┘
```

## 3. 新增配置类型的标准流程

### 3.1 步骤概览
1. **定义配置类型**：在types.ts中添加新的配置类型
2. **扩展ConfigType枚举**：添加新的配置类型枚举值
3. **实现验证逻辑**：在validators/中添加验证器（纯函数）
4. **实现处理器函数**：在processors/中添加处理器函数（纯函数）
5. **扩展ConfigParser**：在config-parser.ts中添加支持
6. **更新模块导出**：在index.ts中添加导出
7. **应用层集成**：在相应的ResourceAPI中集成配置功能

### 3.2 详细步骤

#### 步骤1：定义配置类型
在`sdk/api/config/types.ts`中添加：

```typescript
/**
 * 新配置文件格式
 * 
 * 说明：直接复用 NewConfigType 类型，完全一致
 */
export type NewConfigFile = NewConfigType;

/**
 * 配置类型枚举
 */
export enum ConfigType {
  WORKFLOW = 'workflow',
  NODE_TEMPLATE = 'node_template',
  TRIGGER_TEMPLATE = 'trigger_template',
  SCRIPT = 'script',
  NEW_CONFIG = 'new_config'  // 新增
}

/**
 * 通用配置文件类型
 */
export type ConfigFile =
  | WorkflowConfigFile
  | NodeTemplateConfigFile
  | TriggerTemplateConfigFile
  | ScriptConfigFile
  | NewConfigFile;  // 新增

/**
 * 解析后的配置对象（通用版本）
 */
export interface ParsedConfig<T extends ConfigType = ConfigType> {
  /** 配置类型 */
  configType: T;
  /** 配置格式 */
  format: ConfigFormat;
  /** 配置文件内容 */
  config: T extends ConfigType.WORKFLOW ? WorkflowConfigFile :
           T extends ConfigType.NODE_TEMPLATE ? NodeTemplateConfigFile :
           T extends ConfigType.TRIGGER_TEMPLATE ? TriggerTemplateConfigFile :
           T extends ConfigType.SCRIPT ? ScriptConfigFile :
           T extends ConfigType.NEW_CONFIG ? NewConfigFile :  // 新增
           ConfigFile;
  /** 原始内容 */
  rawContent: string;
}

// 向后兼容的类型别名
export type ParsedNewConfigConfig = ParsedConfig<ConfigType.NEW_CONFIG>;  // 新增
```

#### 步骤2：实现验证逻辑
在`sdk/api/config/validators/`中创建`new-config-validator.ts`：

```typescript
/**
 * 新配置验证函数
 * 负责验证新配置的有效性
 * 注意：实际验证逻辑委托给core层的验证器，这里仅作为适配器
 */

import type { NewConfigType } from '../../../types/new-config';
import type { ConfigFile } from '../types';
import { ConfigType } from '../types';
import { ok, err } from '../../../utils/result-utils';
import type { Result } from '../../../types/result';
import { ValidationError } from '../../../types/errors';
import {
  validateRequiredFields,
  validateStringField,
  // ... 其他需要的验证函数
} from './base-validator';

/**
 * 验证新配置
 * @param config 配置对象
 * @returns 验证结果
 */
export function validateNewConfigConfig(config: ConfigFile): Result<NewConfigType, ValidationError[]> {
  const newConfig = config as NewConfigType;
  const errors: ValidationError[] = [];

  // 验证必需字段
  errors.push(...validateRequiredFields(
    newConfig,
    ['id', 'name', 'type'],  // 根据实际类型定义
    'NewConfig'
  ));

  // 验证字符串字段
  if (newConfig.name) {
    errors.push(...validateStringField(newConfig.name, 'NewConfig.name', {
      minLength: 1,
      maxLength: 100
    }));
  }

  // ... 其他验证逻辑

  if (errors.length > 0) {
    return err(errors);
  }

  return ok(newConfig);
}
```

#### 步骤3：实现处理器函数
在`sdk/api/config/processors/`中创建`new-config.ts`：

```typescript
/**
 * 新配置处理函数
 * 提供新配置的验证、转换和导出功能
 * 所有函数都是无状态的纯函数
 */

import type { ParsedConfig } from '../types';
import { ConfigType, ConfigFormat } from '../types';
import type { Result } from '../../../types/result';
import { ValidationError } from '../../../types/errors';
import { validateNewConfigConfig } from '../validators/new-config-validator';
import type { NewConfigType } from '../../../types/new-config';

/**
 * 验证新配置
 * @param config 解析后的配置对象
 * @returns 验证结果
 */
export function validateNewConfig(config: ParsedConfig<ConfigType.NEW_CONFIG>): Result<ParsedConfig<ConfigType.NEW_CONFIG>, ValidationError[]> {
  return validateNewConfigConfig(config.config);
}

/**
 * 转换新配置（可选）
 * 处理参数替换或其他转换逻辑
 * @param config 解析后的配置对象
 * @param parameters 运行时参数（可选）
 * @returns 转换后的配置对象
 */
export function transformNewConfig(
  config: ParsedConfig<ConfigType.NEW_CONFIG>,
  parameters?: Record<string, any>
): NewConfigType {
  // 实现转换逻辑（如果需要）
  return config.config;
}

/**
 * 导出新配置（可选）
 * @param config 配置对象
 * @param format 配置格式
 * @returns 配置文件内容字符串
 */
export function exportNewConfig(config: NewConfigType, format: ConfigFormat): string {
  // 实现导出逻辑
  switch (format) {
    case ConfigFormat.JSON:
      return JSON.stringify(config, null, 2);
    case ConfigFormat.TOML:
      throw new Error('TOML格式暂不支持导出，请使用JSON格式');
    default:
      throw new Error(`不支持的配置格式: ${format}`);
  }
}
```

#### 步骤4：更新processors导出
在`sdk/api/config/processors/index.ts`中添加导出：

```typescript
// 新配置处理函数
export {
  validateNewConfig,
  transformNewConfig,
  exportNewConfig
} from './new-config';
```

#### 步骤5：扩展ConfigParser
在`sdk/api/config/config-parser.ts`中添加支持：

```typescript
import {
  validateWorkflow,
  validateNodeTemplate,
  validateScript,
  validateTriggerTemplate,
  validateNewConfig  // 新增
} from './processors';

validate<T extends ConfigType>(config: ParsedConfig<T>) {
  switch (config.configType) {
    case ConfigType.WORKFLOW:
      return validateWorkflow(config as ParsedConfig<ConfigType.WORKFLOW>);
    case ConfigType.NODE_TEMPLATE:
      return validateNodeTemplate(config as ParsedConfig<ConfigType.NODE_TEMPLATE>);
    case ConfigType.SCRIPT:
      return validateScript(config as ParsedConfig<ConfigType.SCRIPT>);
    case ConfigType.TRIGGER_TEMPLATE:
      return validateTriggerTemplate(config as ParsedConfig<ConfigType.TRIGGER_TEMPLATE>);
    case ConfigType.NEW_CONFIG:  // 新增
      return validateNewConfig(config as ParsedConfig<ConfigType.NEW_CONFIG>);
    default:
      throw new ConfigurationError(
        `未找到配置类型 ${config.configType} 的处理器`,
        config.configType
      );
  }
}
```

#### 步骤6：更新模块导出
在`sdk/api/config/index.ts`中添加导出：

```typescript
// 类型定义
export {
  // ... 其他类型
  NewConfigFile,
  ParsedNewConfigConfig
} from './types';

// 配置验证函数导出
export { validateNewConfigConfig } from './validators/new-config-validator';

// 配置处理函数导出（纯函数）
export {
  // ... 其他处理函数
  validateNewConfig,
  transformNewConfig,
  exportNewConfig
} from './processors';
```

#### 步骤7：应用层集成
在应用层（如`sdk/api/resources/`）中集成新配置类型：

```typescript
import { ConfigParser } from '../../config';
import { ConfigFormat, ConfigType } from '../../config/types';
import { validateNewConfig, transformNewConfig } from '../../config/processors';

export class NewConfigRegistryAPI extends GenericResourceAPI {
  private parser = new ConfigParser();

  /**
   * 从配置文件创建新配置
   * @param content 配置文件内容
   * @param format 配置格式
   * @returns 创建的配置对象
   */
  async createFromFile(content: string, format: ConfigFormat) {
    // 解析配置
    const parsedConfig = this.parser.parse(content, format, ConfigType.NEW_CONFIG);

    // 验证配置
    const validationResult = validateNewConfig(parsedConfig);
    if (validationResult.isErr()) {
      throw new Error(`配置验证失败: ${validationResult.error.map(e => e.message).join(', ')}`);
    }

    // 转换配置（如果需要）
    const transformedConfig = transformNewConfig(parsedConfig);

    // 注册配置
    return this.create(transformedConfig);
  }

  /**
   * 从配置文件路径创建新配置
   * @param filePath 配置文件路径
   * @returns 创建的配置对象
   */
  async createFromConfig(filePath: string) {
    const parsedConfig = await this.parser.loadFromFile(filePath, ConfigType.NEW_CONFIG);
    
    // 验证配置
    const validationResult = validateNewConfig(parsedConfig);
    if (validationResult.isErr()) {
      throw new Error(`配置验证失败: ${validationResult.error.map(e => e.message).join(', ')}`);
    }

    // 转换配置（如果需要）
    const transformedConfig = transformNewConfig(parsedConfig);

    // 注册配置
    return this.create(transformedConfig);
  }
}
```

## 4. 配置文件格式示例

### 4.1 JSON格式示例

```json
{
  "id": "new-config-001",
  "name": "示例配置",
  "type": "example",
  "description": "这是一个示例配置",
  "config": {
    "key1": "value1",
    "key2": "value2"
  }
}
```

### 4.2 TOML格式示例

```toml
id = "new-config-001"
name = "示例配置"
type = "example"
description = "这是一个示例配置"

[config]
key1 = "value1"
key2 = "value2"
```

## 5. 最佳实践

### 5.1 类型一致性
- 配置文件类型与运行时类型保持完全一致
- 避免重复定义，确保类型安全
- 使用类型别名提高可读性

### 5.2 验证逻辑复用
- 验证逻辑委托给core层的验证器
- 不在api/config层重复实现验证逻辑
- 使用base-validator中的通用验证函数

### 5.3 错误处理
- 使用Result类型统一错误处理
- 提供清晰的错误信息
- 支持批量验证和错误收集

### 5.4 测试覆盖
- 为每个验证函数编写单元测试
- 测试正常情况和边界情况
- 测试错误处理逻辑

### 5.5 文档更新
- 更新类型定义的注释
- 更新配置文件格式示例
- 更新使用示例

## 6. 扩展性考虑

### 6.1 支持新格式
- 通过扩展ConfigFormat枚举支持新格式
- 在ConfigParser中添加新的解析逻辑
- 在processors中添加新的导出逻辑

### 6.2 配置模板
- 定义配置模板结构
- 支持模板参数替换
- 提供模板验证功能

### 6.3 验证规则扩展
- 支持自定义验证规则
- 支持验证规则组合
- 支持条件验证

## 7. 总结

通过遵循本规范，可以确保：
1. **一致性**：所有配置类型遵循相同的处理流程
2. **可维护性**：清晰的职责分离，易于维护和扩展
3. **可测试性**：纯函数设计，易于单元测试
4. **类型安全**：完整的类型定义，避免运行时错误
5. **无状态设计**：所有处理器都是纯函数，不持有状态
6. **不使用类和注册表**：直接通过函数调用，简化架构