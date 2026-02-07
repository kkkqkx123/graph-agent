# SDK API Config 模块扩展分析报告

## 一、当前状态分析

### 1.1 现有config模块职责
- **仅支持**：Workflow Definition的配置文件解析
- **核心组件**：
  - `ConfigParser`：解析TOML/JSON格式的workflow配置
  - `ConfigTransformer`：将配置转换为WorkflowDefinition
  - 支持参数化配置（`{{parameters.xxx}}`）
  - 使用`WorkflowValidator`进行验证

### 1.2 SDK中已有的类型定义
- **NodeTemplate**：节点模板类型（`sdk/types/node-template.ts`）
- **TriggerTemplate**：触发器模板类型（`sdk/types/trigger-template.ts`）
- **Script**：脚本类型（`sdk/types/code.ts`）
- **WorkflowDefinition**：工作流定义类型（`sdk/types/workflow.ts`）

### 1.3 SDK中已有的API
- **NodeRegistryAPI**：节点模板管理API（`sdk/api/resources/templates/node-template-registry-api.ts`）
- **TriggerTemplateRegistryAPI**：触发器模板管理API（`sdk/api/resources/templates/trigger-template-registry-api.ts`）
- **ScriptRegistryAPI**：脚本管理API（`sdk/api/resources/scripts/script-registry-api.ts`）

这些API都继承自`GenericResourceAPI`，提供CRUD操作，但**仅支持编程方式注册**，不支持从配置文件加载。

## 二、扩展必要性分析

### 2.1 为什么需要扩展？

#### 2.1.1 配置文件来源多样化
- Workflow定义可以从配置文件加载
- 节点模板、触发器模板、脚本也应该支持从配置文件加载
- 统一的配置管理方式可以提高一致性和易用性

#### 2.1.2 现有API的局限性
- 现有的NodeRegistryAPI、TriggerTemplateRegistryAPI、ScriptRegistryAPI主要通过编程方式注册
- 缺乏从配置文件批量加载的能力
- 配置文件方式更适合版本控制和团队协作

#### 2.1.3 架构一致性
- Workflow支持配置文件加载
- 其他资源类型也应该支持相同的加载方式
- 保持系统架构的一致性和可扩展性

### 2.2 扩展的价值

1. **统一配置管理**：所有资源类型都支持配置文件加载
2. **版本控制友好**：配置文件可以纳入版本控制系统
3. **团队协作**：配置文件便于团队成员共享和协作
4. **环境隔离**：不同环境可以使用不同的配置文件
5. **批量操作**：支持批量加载和导出配置

## 三、扩展方案建议

### 3.1 方案对比

#### 方案1：在现有config模块内扩展（推荐）

**优点**：
- 保持模块结构简单
- 复用现有的解析和验证逻辑
- 统一的配置管理入口
- 代码复用度高

**缺点**：
- config模块职责会增加
- 需要处理多种配置类型

#### 方案2：创建独立的配置子模块

**优点**：
- 职责分离更清晰
- 每个子模块专注于一种配置类型

**缺点**：
- 增加模块复杂度
- 可能导致代码重复
- 维护成本增加

### 3.2 推荐方案：方案1 - 在现有config模块内扩展

#### 3.2.1 设计原则

1. **向后兼容**：保持现有API不变，新增功能不影响现有代码
2. **统一接口**：提供统一的配置加载接口
3. **类型安全**：充分利用TypeScript的类型系统
4. **可扩展性**：便于未来添加新的配置类型
5. **职责分离**：解析、验证、转换逻辑分离

#### 3.2.2 目录结构

```
sdk/api/config/
├── config-parser.ts              # 通用配置解析器（保持现有）
├── config-transformer.ts         # 通用配置转换器（保持现有）
├── types.ts                      # 类型定义（扩展）
├── index.ts                      # 入口文件（扩展）
├── loaders/                      # 配置加载器目录（新增）
│   ├── base-loader.ts            # 基础加载器抽象类
│   ├── workflow-loader.ts        # 工作流配置加载器
│   ├── node-template-loader.ts   # 节点模板配置加载器
│   ├── trigger-template-loader.ts # 触发器模板配置加载器
│   └── script-loader.ts          # 脚本配置加载器
├── validators/                   # 配置验证器目录（新增）
│   ├── base-validator.ts         # 基础验证器抽象类
│   ├── workflow-validator.ts     # 工作流配置验证器
│   ├── node-template-validator.ts # 节点模板配置验证器
│   ├── trigger-template-validator.ts # 触发器模板配置验证器
│   └── script-validator.ts       # 脚本配置验证器
└── utils/                        # 工具函数目录（新增）
    ├── format-detector.ts        # 配置格式检测
    └── parameter-processor.ts    # 参数处理器
```

#### 3.2.3 核心类型定义扩展

在`types.ts`中添加：

```typescript
/**
 * 配置类型枚举
 */
export enum ConfigType {
  WORKFLOW = 'workflow',
  NODE_TEMPLATE = 'node_template',
  TRIGGER_TEMPLATE = 'trigger_template',
  SCRIPT = 'script'
}

/**
 * 节点模板配置文件格式
 */
export type NodeTemplateConfigFile = NodeTemplate;

/**
 * 触发器模板配置文件格式
 */
export type TriggerTemplateConfigFile = TriggerTemplate;

/**
 * 脚本配置文件格式
 */
export type ScriptConfigFile = Script;

/**
 * 通用配置文件类型
 */
export type ConfigFile = 
  | WorkflowConfigFile 
  | NodeTemplateConfigFile 
  | TriggerTemplateConfigFile 
  | ScriptConfigFile;

/**
 * 解析后的配置对象（扩展）
 */
export interface ParsedConfig<T extends ConfigType = ConfigType> {
  /** 配置类型 */
  configType: T;
  /** 配置格式 */
  format: ConfigFormat;
  /** 配置文件内容 */
  config: ConfigFile;
  /** 原始内容 */
  rawContent: string;
}
```

#### 3.2.4 基础加载器抽象类

创建`loaders/base-loader.ts`：

```typescript
/**
 * 基础配置加载器抽象类
 * 定义所有配置加载器的通用接口
 */
export abstract class BaseConfigLoader<T extends ConfigType> {
  protected configType: T;
  protected parser: ConfigParser;
  protected validator: BaseConfigValidator<T>;

  constructor(
    configType: T,
    validator: BaseConfigValidator<T>
  ) {
    this.configType = configType;
    this.parser = new ConfigParser();
    this.validator = validator;
  }

  /**
   * 从文件加载配置
   */
  async loadFromFile(filePath: string): Promise<ParsedConfig<T>> {
    const parsed = await this.parser.loadFromFile(filePath);
    return {
      ...parsed,
      configType: this.configType
    } as ParsedConfig<T>;
  }

  /**
   * 从内容加载配置
   */
  loadFromContent(content: string, format: ConfigFormat): ParsedConfig<T> {
    const parsed = this.parser.parse(content, format);
    return {
      ...parsed,
      configType: this.configType
    } as ParsedConfig<T>;
  }

  /**
   * 验证配置
   */
  validate(config: ParsedConfig<T>): Result<any, ValidationError[]> {
    return this.validator.validate(config.config);
  }

  /**
   * 加载并验证配置
   */
  async loadAndValidate(filePath: string): Promise<Result<any, ValidationError[]>> {
    const config = await this.loadFromFile(filePath);
    return this.validate(config);
  }

  /**
   * 批量加载配置
   */
  async loadBatch(filePaths: string[]): Promise<ParsedConfig<T>[]> {
    return Promise.all(filePaths.map(path => this.loadFromFile(path)));
  }

  /**
   * 导出配置到文件
   */
  async exportToFile(config: any, filePath: string): Promise<void> {
    const format = this.detectFormat(filePath);
    const content = this.exportToContent(config, format);
    await this.saveToFile(filePath, content);
  }

  /**
   * 导出配置为内容字符串
   */
  exportToContent(config: any, format: ConfigFormat): string {
    // 子类实现
    throw new Error('Method not implemented');
  }

  /**
   * 检测文件格式
   */
  protected detectFormat(filePath: string): ConfigFormat {
    const ext = path.extname(filePath).toLowerCase();
    switch (ext) {
      case '.toml':
        return ConfigFormat.TOML;
      case '.json':
        return ConfigFormat.JSON;
      default:
        throw new ConfigurationError(`无法识别的配置文件扩展名: ${ext}`);
    }
  }

  /**
   * 保存文件
   */
  protected async saveToFile(filePath: string, content: string): Promise<void> {
    const fs = await import('fs/promises');
    await fs.writeFile(filePath, content, 'utf-8');
  }
}
```

#### 3.2.5 具体加载器实现

**WorkflowLoader**（`loaders/workflow-loader.ts`）：

```typescript
/**
 * 工作流配置加载器
 */
export class WorkflowLoader extends BaseConfigLoader<ConfigType.WORKFLOW> {
  constructor() {
    super(
      ConfigType.WORKFLOW,
      new WorkflowConfigValidator()
    );
  }

  /**
   * 加载并转换为WorkflowDefinition
   */
  async loadAndTransform(
    filePath: string,
    parameters?: Record<string, any>
  ): Promise<WorkflowDefinition> {
    return this.parser.loadAndTransform(filePath, parameters);
  }

  /**
   * 导出工作流为配置文件
   */
  exportToContent(workflowDef: WorkflowDefinition, format: ConfigFormat): string {
    return this.parser.exportWorkflow(workflowDef, format);
  }
}
```

**NodeTemplateLoader**（`loaders/node-template-loader.ts`）：

```typescript
/**
 * 节点模板配置加载器
 */
export class NodeTemplateLoader extends BaseConfigLoader<ConfigType.NODE_TEMPLATE> {
  constructor() {
    super(
      ConfigType.NODE_TEMPLATE,
      new NodeTemplateConfigValidator()
    );
  }

  /**
   * 加载并注册节点模板
   */
  async loadAndRegister(filePath: string): Promise<NodeTemplate> {
    const config = await this.loadAndValidate(filePath);
    if (config.isErr()) {
      throw new ConfigurationError(
        `节点模板配置验证失败: ${config.error.map(e => e.message).join(', ')}`
      );
    }
    
    const template = config.value as NodeTemplate;
    nodeTemplateRegistry.register(template);
    return template;
  }

  /**
   * 批量加载并注册节点模板
   */
  async loadBatchAndRegister(filePaths: string[]): Promise<NodeTemplate[]> {
    const templates: NodeTemplate[] = [];
    for (const filePath of filePaths) {
      const template = await this.loadAndRegister(filePath);
      templates.push(template);
    }
    return templates;
  }

  /**
   * 导出节点模板为配置文件
   */
  exportToContent(template: NodeTemplate, format: ConfigFormat): string {
    switch (format) {
      case ConfigFormat.JSON:
        return stringifyJson(template, true);
      case ConfigFormat.TOML:
        throw new ConfigurationError('TOML格式不支持导出，请使用JSON格式');
      default:
        throw new ConfigurationError(`不支持的配置格式: ${format}`);
    }
  }
}
```

**TriggerTemplateLoader**（`loaders/trigger-template-loader.ts`）：

```typescript
/**
 * 触发器模板配置加载器
 */
export class TriggerTemplateLoader extends BaseConfigLoader<ConfigType.TRIGGER_TEMPLATE> {
  constructor() {
    super(
      ConfigType.TRIGGER_TEMPLATE,
      new TriggerTemplateConfigValidator()
    );
  }

  /**
   * 加载并注册触发器模板
   */
  async loadAndRegister(filePath: string): Promise<TriggerTemplate> {
    const config = await this.loadAndValidate(filePath);
    if (config.isErr()) {
      throw new ConfigurationError(
        `触发器模板配置验证失败: ${config.error.map(e => e.message).join(', ')}`
      );
    }
    
    const template = config.value as TriggerTemplate;
    triggerTemplateRegistry.register(template);
    return template;
  }

  /**
   * 批量加载并注册触发器模板
   */
  async loadBatchAndRegister(filePaths: string[]): Promise<TriggerTemplate[]> {
    const templates: TriggerTemplate[] = [];
    for (const filePath of filePaths) {
      const template = await this.loadAndRegister(filePath);
      templates.push(template);
    }
    return templates;
  }

  /**
   * 导出触发器模板为配置文件
   */
  exportToContent(template: TriggerTemplate, format: ConfigFormat): string {
    switch (format) {
      case ConfigFormat.JSON:
        return stringifyJson(template, true);
      case ConfigFormat.TOML:
        throw new ConfigurationError('TOML格式不支持导出，请使用JSON格式');
      default:
        throw new ConfigurationError(`不支持的配置格式: ${format}`);
    }
  }
}
```

**ScriptLoader**（`loaders/script-loader.ts`）：

```typescript
/**
 * 脚本配置加载器
 */
export class ScriptLoader extends BaseConfigLoader<ConfigType.SCRIPT> {
  constructor() {
    super(
      ConfigType.SCRIPT,
      new ScriptConfigValidator()
    );
  }

  /**
   * 加载并注册脚本
   */
  async loadAndRegister(filePath: string): Promise<Script> {
    const config = await this.loadAndValidate(filePath);
    if (config.isErr()) {
      throw new ConfigurationError(
        `脚本配置验证失败: ${config.error.map(e => e.message).join(', ')}`
      );
    }
    
    const script = config.value as Script;
    codeService.registerScript(script);
    return script;
  }

  /**
   * 批量加载并注册脚本
   */
  async loadBatchAndRegister(filePaths: string[]): Promise<Script[]> {
    const scripts: Script[] = [];
    for (const filePath of filePaths) {
      const script = await this.loadAndRegister(filePath);
      scripts.push(script);
    }
    return scripts;
  }

  /**
   * 导出脚本为配置文件
   */
  exportToContent(script: Script, format: ConfigFormat): string {
    switch (format) {
      case ConfigFormat.JSON:
        return stringifyJson(script, true);
      case ConfigFormat.TOML:
        throw new ConfigurationError('TOML格式不支持导出，请使用JSON格式');
      default:
        throw new ConfigurationError(`不支持的配置格式: ${format}`);
    }
  }
}
```

#### 3.2.6 统一配置管理器

创建`config-manager.ts`：

```typescript
/**
 * 统一配置管理器
 * 提供所有配置类型的统一管理接口
 */
export class ConfigManager {
  private workflowLoader: WorkflowLoader;
  private nodeTemplateLoader: NodeTemplateLoader;
  private triggerTemplateLoader: TriggerTemplateLoader;
  private scriptLoader: ScriptLoader;

  constructor() {
    this.workflowLoader = new WorkflowLoader();
    this.nodeTemplateLoader = new NodeTemplateLoader();
    this.triggerTemplateLoader = new TriggerTemplateLoader();
    this.scriptLoader = new ScriptLoader();
  }

  /**
   * 获取工作流加载器
   */
  get workflows() {
    return this.workflowLoader;
  }

  /**
   * 获取节点模板加载器
   */
  get nodeTemplates() {
    return this.nodeTemplateLoader;
  }

  /**
   * 获取触发器模板加载器
   */
  get triggerTemplates() {
    return this.triggerTemplateLoader;
  }

  /**
   * 获取脚本加载器
   */
  get scripts() {
    return this.scriptLoader;
  }

  /**
   * 从目录加载所有配置
   */
  async loadFromDirectory(
    directory: string,
    options?: {
      workflows?: boolean;
      nodeTemplates?: boolean;
      triggerTemplates?: boolean;
      scripts?: boolean;
    }
  ): Promise<{
    workflows?: WorkflowDefinition[];
    nodeTemplates?: NodeTemplate[];
    triggerTemplates?: TriggerTemplate[];
    scripts?: Script[];
  }> {
    const result: any = {};
    const fs = await import('fs/promises');

    try {
      const files = await fs.readdir(directory);
      
      if (options?.workflows !== false) {
        const workflowFiles = files.filter(f => f.endsWith('.json') || f.endsWith('.toml'));
        if (workflowFiles.length > 0) {
          result.workflows = await Promise.all(
            workflowFiles.map(f => this.workflowLoader.loadAndTransform(path.join(directory, f)))
          );
        }
      }

      if (options?.nodeTemplates !== false) {
        const nodeTemplateFiles = files.filter(f => f.includes('node-template'));
        if (nodeTemplateFiles.length > 0) {
          result.nodeTemplates = await this.nodeTemplateLoader.loadBatchAndRegister(
            nodeTemplateFiles.map(f => path.join(directory, f))
          );
        }
      }

      if (options?.triggerTemplates !== false) {
        const triggerTemplateFiles = files.filter(f => f.includes('trigger-template'));
        if (triggerTemplateFiles.length > 0) {
          result.triggerTemplates = await this.triggerTemplateLoader.loadBatchAndRegister(
            triggerTemplateFiles.map(f => path.join(directory, f))
          );
        }
      }

      if (options?.scripts !== false) {
        const scriptFiles = files.filter(f => f.includes('script'));
        if (scriptFiles.length > 0) {
          result.scripts = await this.scriptLoader.loadBatchAndRegister(
            scriptFiles.map(f => path.join(directory, f))
          );
        }
      }

      return result;
    } catch (error) {
      throw new ConfigurationError(
        `从目录加载配置失败: ${error instanceof Error ? error.message : '未知错误'}`
      );
    }
  }
}

// 导出单例实例
export const configManager = new ConfigManager();
```

#### 3.2.7 更新index.ts

```typescript
// 原有导出
export {
  ConfigFormat,
  NodeConfigFile,
  EdgeConfigFile,
  WorkflowConfigFile,
  ParsedConfig,
  IConfigParser,
  IConfigTransformer
} from './types';

export { ConfigParser } from './config-parser';
export { ConfigTransformer } from './config-transformer';

// 新增导出
export {
  ConfigType,
  NodeTemplateConfigFile,
  TriggerTemplateConfigFile,
  ScriptConfigFile,
  ConfigFile
} from './types';

// 加载器
export { ConfigManager, configManager } from './config-manager';
export { WorkflowLoader } from './loaders/workflow-loader';
export { NodeTemplateLoader } from './loaders/node-template-loader';
export { TriggerTemplateLoader } from './loaders/trigger-template-loader';
export { ScriptLoader } from './loaders/script-loader';
export { BaseConfigLoader } from './loaders/base-loader';

// 验证器
export { BaseConfigValidator } from './validators/base-validator';
export { WorkflowConfigValidator } from './validators/workflow-validator';
export { NodeTemplateConfigValidator } from './validators/node-template-validator';
export { TriggerTemplateConfigValidator } from './validators/trigger-template-validator';
export { ScriptConfigValidator } from './validators/script-validator';
```

## 四、使用示例

### 4.1 加载工作流配置

```typescript
import { configManager } from '@modular-agent/sdk';

// 加载单个工作流
const workflow = await configManager.workflows.loadAndTransform(
  './workflows/chat-workflow.json',
  { model: 'gpt-4' }
);

// 批量加载工作流
const workflows = await configManager.workflows.loadBatch([
  './workflows/workflow1.json',
  './workflows/workflow2.json'
]);
```

### 4.2 加载节点模板配置

```typescript
// 加载并注册节点模板
const nodeTemplate = await configManager.nodeTemplates.loadAndRegister(
  './templates/node-templates/llm-node.json'
);

// 批量加载并注册节点模板
const nodeTemplates = await configManager.nodeTemplates.loadBatchAndRegister([
  './templates/node-templates/llm-node.json',
  './templates/node-templates/code-node.json'
]);
```

### 4.3 加载触发器模板配置

```typescript
// 加载并注册触发器模板
const triggerTemplate = await configManager.triggerTemplates.loadAndRegister(
  './templates/trigger-templates/error-alert.json'
);

// 批量加载并注册触发器模板
const triggerTemplates = await configManager.triggerTemplates.loadBatchAndRegister([
  './templates/trigger-templates/error-alert.json',
  './templates/trigger-templates/completion-notification.json'
]);
```

### 4.4 加载脚本配置

```typescript
// 加载并注册脚本
const script = await configManager.scripts.loadAndRegister(
  './scripts/data-fetch.json'
);

// 批量加载并注册脚本
const scripts = await configManager.scripts.loadBatchAndRegister([
  './scripts/data-fetch.json',
  './scripts/data-process.json'
]);
```

### 4.5 从目录批量加载所有配置

```typescript
// 从目录加载所有配置
const configs = await configManager.loadFromDirectory('./configs', {
  workflows: true,
  nodeTemplates: true,
  triggerTemplates: true,
  scripts: true
});

console.log('加载的工作流:', configs.workflows);
console.log('加载的节点模板:', configs.nodeTemplates);
console.log('加载的触发器模板:', configs.triggerTemplates);
console.log('加载的脚本:', configs.scripts);
```

### 4.6 导出配置

```typescript
// 导出工作流
await configManager.workflows.exportToFile(
  workflowDef,
  './exported/workflow.json'
);

// 导出节点模板
await configManager.nodeTemplates.exportToFile(
  nodeTemplate,
  './exported/node-template.json'
);

// 导出触发器模板
await configManager.triggerTemplates.exportToFile(
  triggerTemplate,
  './exported/trigger-template.json'
);

// 导出脚本
await configManager.scripts.exportToFile(
  script,
  './exported/script.json'
);
```

## 五、配置文件示例

### 5.1 节点模板配置文件

```json
{
  "name": "gpt4-llm",
  "type": "LLM",
  "description": "GPT-4 LLM节点模板",
  "config": {
    "profileId": "gpt-4",
    "prompt": "请回答用户的问题：{{input.message}}"
  },
  "metadata": {
    "category": "llm",
    "tags": ["gpt-4", "chat"],
    "author": "system"
  },
  "createdAt": 0,
  "updatedAt": 0
}
```

### 5.2 触发器模板配置文件

```json
{
  "name": "error-alert",
  "description": "错误告警触发器",
  "condition": {
    "eventType": "NODE_FAILED",
    "nodeId": "*"
  },
  "action": {
    "type": "SEND_NOTIFICATION",
    "config": {
      "message": "节点执行失败：{{nodeId}}",
      "channel": "email"
    }
  },
  "enabled": true,
  "maxTriggers": 0,
  "metadata": {
    "category": "alert",
    "tags": ["error", "notification"]
  },
  "createdAt": 0,
  "updatedAt": 0
}
```

### 5.3 脚本配置文件

```json
{
  "id": "data-fetch-script",
  "name": "data-fetch",
  "type": "PYTHON",
  "description": "从API获取数据",
  "content": "import requests\n\ndef fetch_data(url):\n    response = requests.get(url)\n    return response.json()\n\nresult = fetch_data('{{parameters.url}}')\nprint(result)",
  "options": {
    "timeout": 30000,
    "retries": 3,
    "retryDelay": 1000,
    "environment": {
      "PYTHONPATH": "/usr/local/lib/python3.9/site-packages"
    }
  },
  "metadata": {
    "category": "data",
    "tags": ["api", "fetch"],
    "author": "system"
  },
  "enabled": true
}
```

## 六、实施计划

### 6.1 第一阶段：基础架构
1. 创建`loaders/`和`validators/`目录
2. 实现`BaseConfigLoader`和`BaseConfigValidator`抽象类
3. 扩展`types.ts`，添加新的类型定义

### 6.2 第二阶段：具体实现
1. 实现`WorkflowLoader`（重构现有逻辑）
2. 实现`NodeTemplateLoader`
3. 实现`TriggerTemplateLoader`
4. 实现`ScriptLoader`

### 6.3 第三阶段：统一管理
1. 实现`ConfigManager`
2. 更新`index.ts`导出
3. 编写单元测试

### 6.4 第四阶段：文档和示例
1. 更新README.md
2. 添加配置文件示例
3. 添加使用示例代码

## 七、注意事项

1. **向后兼容**：保持现有API不变，确保现有代码不受影响
2. **错误处理**：提供清晰的错误信息和错误类型
3. **性能优化**：批量加载时考虑并发控制
4. **安全性**：验证配置文件内容，防止注入攻击
5. **可测试性**：所有组件都应易于测试
6. **文档完善**：提供详细的API文档和使用示例

## 八、总结

通过扩展`sdk/api/config`模块，我们可以：

1. **统一配置管理**：所有资源类型都支持配置文件加载
2. **提高开发效率**：配置文件方式比编程方式更高效
3. **便于团队协作**：配置文件可以纳入版本控制
4. **保持架构一致性**：所有资源类型使用相同的加载方式
5. **增强可扩展性**：便于未来添加新的配置类型

推荐采用**方案1**（在现有config模块内扩展），因为它能够：
- 保持模块结构简单
- 复用现有的解析和验证逻辑
- 提供统一的配置管理入口
- 最大化代码复用
- 最小化维护成本