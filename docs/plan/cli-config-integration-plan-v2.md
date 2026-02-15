# CLI 应用配置集成方案 V2

## 核心问题分析

### 1. 当前架构的根本性错误

**问题 1：配置加载逻辑分散**
- [`config-loader.ts`](apps/cli-app/src/config/config-loader.ts:1) 只处理 CLI 应用自身的运行时配置
- [`adapters`](apps/cli-app/src/adapters/workflow-adapter.ts:1) 中直接进行文件读取和解析
- 配置加载逻辑与业务逻辑混合，违反了单一职责原则

**问题 2：不支持批量配置加载**
- 当前只支持单个文件加载
- 实际使用的是 [`configs/`](configs:1) 目录结构，包含大量配置文件
- 没有利用 SDK 提供的批量解析功能

**问题 3：未使用 SDK 的配置抽象**
- SDK 的 [`config`](sdk/api/config:1) 模块提供了完整的配置加载抽象
- 包括格式检测、文件读取、批量解析等功能
- 当前实现重复造轮子，且功能不完整

### 2. configs 目录结构分析

```
configs/
├── global.toml                    # 全局配置
├── database/                      # 数据库配置
├── environments/                  # 环境配置
├── examples/                      # 示例配置
├── llms/                          # LLM 配置
│   ├── provider/                  # LLM 提供商配置
│   │   ├── openai/
│   │   ├── gemini/
│   │   └── ...
│   ├── pools/                     # LLM 池配置
│   └── task_groups/               # 任务组配置
├── prompts/                       # 提示词配置
│   ├── rules/
│   ├── system/
│   ├── templates/
│   └── user_commands/
├── scripts/                       # 脚本配置
│   └── inline/
└── tools/                         # 工具配置
    ├── __registry__.toml          # 工具注册表
    ├── mcp/
    ├── rest/
    ├── stateful/
    └── stateless/
```

**关键特性**：
- 模块化组织：按功能分类
- 继承机制：`inherits_from` 字段支持配置继承
- 注册表模式：`__registry__.toml` 定义配置文件列表
- 多格式支持：TOML 为主，JSON 为辅

### 3. SDK config 模块的能力

**提供的功能**：
```typescript
// 格式检测
detectConfigFormat(filePath: string): ConfigFormat

// 文件读取
readConfigFile(filePath: string): Promise<string>
loadConfigContent(filePath: string): Promise<{content, format}>

// 单个配置解析
parseWorkflow(content, format, parameters?)
parseNodeTemplate(content, format)
parseTriggerTemplate(content, format)
parseScript(content, format)

// 批量配置解析
parseBatchWorkflows(contents[], formats[], parameters?[])
parseBatchNodeTemplates(contents[], formats[])
parseBatchTriggerTemplates(contents[], formats[])
parseBatchScripts(contents[], formats[])

// 配置验证
validateWorkflowConfig(config)
validateNodeTemplateConfig(config)
validateTriggerTemplateConfig(config)
validateScriptConfig(config)
```

**设计原则**：
- 纯函数设计，无状态
- 不涉及文件 I/O（除了 `readConfigFile` 和 `loadConfigContent`）
- 不操作注册表
- 职责单一：只负责配置解析和验证

## 正确的架构设计

### 架构原则

1. **配置加载逻辑独立**：创建专门的配置加载器，统一处理所有配置加载
2. **使用 SDK 抽象**：完全依赖 SDK 的 config 模块，不重复实现
3. **支持批量加载**：支持从目录批量加载配置
4. **职责分离**：配置加载、验证、注册完全分离

### 架构层次

```
┌─────────────────────────────────────────────────────────┐
│                    CLI 命令层                            │
│  (workflow register, template register, etc.)           │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────┐
│                  适配器层 (Adapters)                     │
│  - WorkflowAdapter                                       │
│  - TemplateAdapter                                       │
│  - ScriptAdapter                                         │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────┐
│              配置加载层 (ConfigLoader)                   │
│  - 统一的配置加载接口                                     │
│  - 支持单文件和批量加载                                   │
│  - 使用 SDK config 模块                                  │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────┐
│              SDK config 模块                             │
│  - parseWorkflow, parseNodeTemplate, etc.               │
│  - parseBatchWorkflows, etc.                            │
│  - validateWorkflowConfig, etc.                         │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────┐
│              文件系统 (configs/)                         │
│  - workflows/, templates/, scripts/, etc.               │
└─────────────────────────────────────────────────────────┘
```

### 数据流

```
CLI 命令
  ↓
Adapter (业务逻辑)
  ↓
ConfigLoader (配置加载)
  ↓
SDK config (解析和验证)
  ↓
文件系统 (读取配置文件)
```

## 详细设计方案

### 1. 创建统一的配置加载器

**文件位置**: `apps/cli-app/src/config/config-manager.ts`

**职责**:
- 统一的配置加载接口
- 支持单文件和批量加载
- 使用 SDK config 模块
- 处理配置继承和注册表

**接口设计**:

```typescript
import { 
  ConfigFormat,
  parseWorkflow,
  parseNodeTemplate,
  parseTriggerTemplate,
  parseScript,
  parseBatchWorkflows,
  parseBatchNodeTemplates,
  parseBatchTriggerTemplates,
  parseBatchScripts,
  loadConfigContent,
  detectConfigFormat
} from '@modular-agent/sdk';
import { readdir, readFile } from 'fs/promises';
import { join, extname } from 'path';

/**
 * 配置加载选项
 */
export interface ConfigLoadOptions {
  /** 配置目录路径 */
  configDir?: string;
  /** 是否递归加载子目录 */
  recursive?: boolean;
  /** 文件模式过滤 */
  filePattern?: RegExp;
  /** 运行时参数（用于工作流） */
  parameters?: Record<string, any>;
  /** 是否验证配置 */
  validate?: boolean;
}

/**
 * 配置加载结果
 */
export interface ConfigLoadResult<T> {
  /** 成功加载的配置 */
  configs: T[];
  /** 加载失败的文件 */
  failures: Array<{
    filePath: string;
    error: string;
  }>;
}

/**
 * 统一配置管理器
 * 负责从文件系统加载配置，使用 SDK config 模块进行解析
 */
export class ConfigManager {
  private configDir: string;

  constructor(configDir: string = './configs') {
    this.configDir = configDir;
  }

  /**
   * 加载单个工作流配置
   */
  async loadWorkflow(
    filePath: string,
    parameters?: Record<string, any>
  ): Promise<any> {
    const { content, format } = await loadConfigContent(filePath);
    return parseWorkflow(content, format, parameters);
  }

  /**
   * 批量加载工作流配置
   */
  async loadWorkflows(
    options: ConfigLoadOptions = {}
  ): Promise<ConfigLoadResult<any>> {
    const dir = options.configDir || join(this.configDir, 'workflows');
    const files = await this.scanConfigFiles(dir, options);
    
    const configs: any[] = [];
    const failures: Array<{ filePath: string; error: string }> = [];

    for (const file of files) {
      try {
        const { content, format } = await loadConfigContent(file);
        const workflow = parseWorkflow(
          content, 
          format, 
          options.parameters
        );
        configs.push(workflow);
      } catch (error) {
        failures.push({
          filePath: file,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }

    return { configs, failures };
  }

  /**
   * 加载单个节点模板配置
   */
  async loadNodeTemplate(filePath: string): Promise<any> {
    const { content, format } = await loadConfigContent(filePath);
    return parseNodeTemplate(content, format);
  }

  /**
   * 批量加载节点模板配置
   */
  async loadNodeTemplates(
    options: ConfigLoadOptions = {}
  ): Promise<ConfigLoadResult<any>> {
    const dir = options.configDir || join(this.configDir, 'templates', 'node-templates');
    const files = await this.scanConfigFiles(dir, options);
    
    const configs: any[] = [];
    const failures: Array<{ filePath: string; error: string }> = [];

    for (const file of files) {
      try {
        const { content, format } = await loadConfigContent(file);
        const template = parseNodeTemplate(content, format);
        configs.push(template);
      } catch (error) {
        failures.push({
          filePath: file,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }

    return { configs, failures };
  }

  /**
   * 加载单个触发器模板配置
   */
  async loadTriggerTemplate(filePath: string): Promise<any> {
    const { content, format } = await loadConfigContent(filePath);
    return parseTriggerTemplate(content, format);
  }

  /**
   * 批量加载触发器模板配置
   */
  async loadTriggerTemplates(
    options: ConfigLoadOptions = {}
  ): Promise<ConfigLoadResult<any>> {
    const dir = options.configDir || join(this.configDir, 'templates', 'trigger-templates');
    const files = await this.scanConfigFiles(dir, options);
    
    const configs: any[] = [];
    const failures: Array<{ filePath: string; error: string }> = [];

    for (const file of files) {
      try {
        const { content, format } = await loadConfigContent(file);
        const template = parseTriggerTemplate(content, format);
        configs.push(template);
      } catch (error) {
        failures.push({
          filePath: file,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }

    return { configs, failures };
  }

  /**
   * 加载单个脚本配置
   */
  async loadScript(filePath: string): Promise<any> {
    const { content, format } = await loadConfigContent(filePath);
    return parseScript(content, format);
  }

  /**
   * 批量加载脚本配置
   */
  async loadScripts(
    options: ConfigLoadOptions = {}
  ): Promise<ConfigLoadResult<any>> {
    const dir = options.configDir || join(this.configDir, 'scripts');
    const files = await this.scanConfigFiles(dir, options);
    
    const configs: any[] = [];
    const failures: Array<{ filePath: string; error: string }> = [];

    for (const file of files) {
      try {
        const { content, format } = await loadConfigContent(file);
        const script = parseScript(content, format);
        configs.push(script);
      } catch (error) {
        failures.push({
          filePath: file,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }

    return { configs, failures };
  }

  /**
   * 从注册表配置加载
   */
  async loadFromRegistry(
    registryPath: string,
    options: ConfigLoadOptions = {}
  ): Promise<ConfigLoadResult<any>> {
    const { content, format } = await loadConfigContent(registryPath);
    const registry = format === ConfigFormat.TOML 
      ? await import('@iarna/toml').then(m => m.parse(content))
      : JSON.parse(content);

    const configs: any[] = [];
    const failures: Array<{ filePath: string; error: string }> = [];

    // 遍历注册表中的配置文件
    for (const [key, value] of Object.entries(registry)) {
      if (key.startsWith('tool_types.') && typeof value === 'object') {
        const typeConfig = value as any;
        if (typeConfig.enabled && typeConfig.config_directory && typeConfig.config_files) {
          const dir = join(this.configDir, 'tools', typeConfig.config_directory);
          for (const file of typeConfig.config_files) {
            try {
              const filePath = join(dir, file);
              const { content, format } = await loadConfigContent(filePath);
              // 根据类型解析
              const config = await this.parseByType(content, format, typeConfig.class_path);
              configs.push(config);
            } catch (error) {
              failures.push({
                filePath: join(dir, file),
                error: error instanceof Error ? error.message : String(error)
              });
            }
          }
        }
      }
    }

    return { configs, failures };
  }

  /**
   * 扫描配置文件
   */
  private async scanConfigFiles(
    dir: string,
    options: ConfigLoadOptions
  ): Promise<string[]> {
    const files: string[] = [];
    const entries = await readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = join(dir, entry.name);

      if (entry.isDirectory() && options.recursive !== false) {
        // 递归扫描子目录
        const subFiles = await this.scanConfigFiles(fullPath, options);
        files.push(...subFiles);
      } else if (entry.isFile()) {
        const ext = extname(entry.name).toLowerCase();
        if (ext === '.toml' || ext === '.json') {
          // 应用文件模式过滤
          if (!options.filePattern || options.filePattern.test(entry.name)) {
            files.push(fullPath);
          }
        }
      }
    }

    return files;
  }

  /**
   * 根据类型解析配置
   */
  private async parseByType(
    content: string,
    format: ConfigFormat,
    classPath: string
  ): Promise<any> {
    // 根据类路径判断配置类型
    if (classPath.includes('workflow')) {
      return parseWorkflow(content, format);
    } else if (classPath.includes('node_template')) {
      return parseNodeTemplate(content, format);
    } else if (classPath.includes('trigger_template')) {
      return parseTriggerTemplate(content, format);
    } else if (classPath.includes('script')) {
      return parseScript(content, format);
    } else {
      // 默认解析为 JSON/TOML
      return format === ConfigFormat.TOML
        ? await import('@iarna/toml').then(m => m.parse(content))
        : JSON.parse(content);
    }
  }
}

/**
 * 全局配置管理器实例
 */
let globalConfigManager: ConfigManager | null = null;

/**
 * 获取全局配置管理器实例
 */
export function getConfigManager(configDir?: string): ConfigManager {
  if (!globalConfigManager) {
    globalConfigManager = new ConfigManager(configDir);
  }
  return globalConfigManager;
}
```

### 2. 重构 Adapters

**文件位置**: `apps/cli-app/src/adapters/workflow-adapter.ts`

**重构后的实现**:

```typescript
/**
 * 工作流适配器
 * 封装工作流相关的 SDK API 调用
 */

import { createLogger } from '../utils/logger';
import { ConfigManager, type ConfigLoadOptions } from '../config/config-manager';

const logger = createLogger();

/**
 * 工作流适配器
 */
export class WorkflowAdapter {
  private configManager: ConfigManager;

  constructor(configManager?: ConfigManager) {
    this.configManager = configManager || new ConfigManager();
  }

  /**
   * 从文件注册工作流
   */
  async registerFromFile(
    filePath: string,
    parameters?: Record<string, any>
  ): Promise<any> {
    try {
      const { sdk } = await import('@modular-agent/sdk');
      
      // 使用 ConfigManager 加载配置
      const workflow = await this.configManager.loadWorkflow(filePath, parameters);
      
      // 注册到 SDK
      const api = sdk.workflows;
      await api.create(workflow);
      
      logger.success(`工作流已注册: ${workflow.id}`);
      return workflow;
    } catch (error) {
      logger.error(`注册工作流失败: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * 从目录批量注册工作流
   */
  async registerFromDirectory(
    options: ConfigLoadOptions = {}
  ): Promise<{
    success: any[];
    failures: Array<{ filePath: string; error: string }>;
  }> {
    try {
      const { sdk } = await import('@modular-agent/sdk');
      
      // 使用 ConfigManager 批量加载配置
      const result = await this.configManager.loadWorkflows(options);
      
      const success: any[] = [];
      const failures = result.failures;

      // 注册成功加载的工作流
      const api = sdk.workflows;
      for (const workflow of result.configs) {
        try {
          await api.create(workflow);
          success.push(workflow);
          logger.success(`工作流已注册: ${workflow.id}`);
        } catch (error) {
          failures.push({
            filePath: workflow.id,
            error: error instanceof Error ? error.message : String(error)
          });
          logger.error(`注册工作流失败: ${workflow.id}`);
        }
      }

      return { success, failures };
    } catch (error) {
      logger.error(`批量注册工作流失败: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * 列出所有工作流
   */
  async listWorkflows(filter?: any): Promise<any[]> {
    try {
      const { sdk } = await import('@modular-agent/sdk');
      const api = sdk.workflows;
      const result = await api.getAll();
      const workflows = (result as any).data || result;

      // 转换为摘要格式
      const summaries = (workflows as any[]).map((wf: any) => ({
        id: wf.id,
        name: wf.name,
        version: wf.version,
        description: wf.description,
        status: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }));

      return summaries;
    } catch (error) {
      logger.error(`列出工作流失败: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * 获取工作流详情
   */
  async getWorkflow(id: string): Promise<any> {
    try {
      const { sdk } = await import('@modular-agent/sdk');
      const api = sdk.workflows;
      const result = await api.get(id);
      const workflow = (result as any).data || result;

      if (!workflow) {
        throw new Error(`工作流不存在: ${id}`);
      }

      return workflow;
    } catch (error) {
      logger.error(`获取工作流详情失败: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * 删除工作流
   */
  async deleteWorkflow(id: string): Promise<void> {
    try {
      const { sdk } = await import('@modular-agent/sdk');
      const api = sdk.workflows;
      await api.delete(id);

      logger.success(`工作流已删除: ${id}`);
    } catch (error) {
      logger.error(`删除工作流失败: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }
}
```

**文件位置**: `apps/cli-app/src/adapters/template-adapter.ts`

**重构后的实现**:

```typescript
/**
 * 模板适配器
 * 封装模板相关的 SDK API 调用
 */

import { BaseAdapter } from './base-adapter';
import { ConfigManager, type ConfigLoadOptions } from '../config/config-manager';

/**
 * 模板适配器
 */
export class TemplateAdapter extends BaseAdapter {
  private configManager: ConfigManager;

  constructor(configManager?: ConfigManager) {
    super();
    this.configManager = configManager || new ConfigManager();
  }

  /**
   * 从文件注册节点模板
   */
  async registerNodeTemplateFromFile(filePath: string): Promise<any> {
    return this.executeWithErrorHandling(async () => {
      // 使用 ConfigManager 加载配置
      const template = await this.configManager.loadNodeTemplate(filePath);
      
      const api = this.sdk.nodeTemplates;
      await api.create(template);
      
      this.logger.success(`节点模板已注册: ${template.id}`);
      return template;
    }, '注册节点模板');
  }

  /**
   * 从目录批量注册节点模板
   */
  async registerNodeTemplatesFromDirectory(
    options: ConfigLoadOptions = {}
  ): Promise<{
    success: any[];
    failures: Array<{ filePath: string; error: string }>;
  }> {
    return this.executeWithErrorHandling(async () => {
      // 使用 ConfigManager 批量加载配置
      const result = await this.configManager.loadNodeTemplates(options);
      
      const success: any[] = [];
      const failures = result.failures;

      // 注册成功加载的模板
      const api = this.sdk.nodeTemplates;
      for (const template of result.configs) {
        try {
          await api.create(template);
          success.push(template);
          this.logger.success(`节点模板已注册: ${template.id}`);
        } catch (error) {
          failures.push({
            filePath: template.id,
            error: error instanceof Error ? error.message : String(error)
          });
          this.logger.error(`注册节点模板失败: ${template.id}`);
        }
      }

      return { success, failures };
    }, '批量注册节点模板');
  }

  /**
   * 从文件注册触发器模板
   */
  async registerTriggerTemplateFromFile(filePath: string): Promise<any> {
    return this.executeWithErrorHandling(async () => {
      // 使用 ConfigManager 加载配置
      const template = await this.configManager.loadTriggerTemplate(filePath);
      
      const api = this.sdk.triggerTemplates;
      await api.create(template);
      
      this.logger.success(`触发器模板已注册: ${template.id}`);
      return template;
    }, '注册触发器模板');
  }

  /**
   * 从目录批量注册触发器模板
   */
  async registerTriggerTemplatesFromDirectory(
    options: ConfigLoadOptions = {}
  ): Promise<{
    success: any[];
    failures: Array<{ filePath: string; error: string }>;
  }> {
    return this.executeWithErrorHandling(async () => {
      // 使用 ConfigManager 批量加载配置
      const result = await this.configManager.loadTriggerTemplates(options);
      
      const success: any[] = [];
      const failures = result.failures;

      // 注册成功加载的模板
      const api = this.sdk.triggerTemplates;
      for (const template of result.configs) {
        try {
          await api.create(template);
          success.push(template);
          this.logger.success(`触发器模板已注册: ${template.id}`);
        } catch (error) {
          failures.push({
            filePath: template.id,
            error: error instanceof Error ? error.message : String(error)
          });
          this.logger.error(`注册触发器模板失败: ${template.id}`);
        }
      }

      return { success, failures };
    }, '批量注册触发器模板');
  }

  /**
   * 列出所有节点模板
   */
  async listNodeTemplates(filter?: any): Promise<any[]> {
    return this.executeWithErrorHandling(async () => {
      const api = this.sdk.nodeTemplates;
      const result = await api.getAll();
      const templates = (result as any).data || result;

      // 转换为摘要格式
      const summaries = (templates as any[]).map((tmpl: any) => ({
        id: tmpl.id,
        name: tmpl.name,
        type: tmpl.type,
        category: tmpl.category,
        description: tmpl.description,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }));

      return summaries;
    }, '列出节点模板');
  }

  /**
   * 列出所有触发器模板
   */
  async listTriggerTemplates(filter?: any): Promise<any[]> {
    return this.executeWithErrorHandling(async () => {
      const api = this.sdk.triggerTemplates;
      const result = await api.getAll();
      const templates = (result as any).data || result;

      // 转换为摘要格式
      const summaries = (templates as any[]).map((tmpl: any) => ({
        id: tmpl.id,
        name: tmpl.name,
        type: tmpl.type,
        description: tmpl.description,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }));

      return summaries;
    }, '列出触发器模板');
  }

  /**
   * 获取节点模板详情
   */
  async getNodeTemplate(id: string): Promise<any> {
    return this.executeWithErrorHandling(async () => {
      const api = this.sdk.nodeTemplates;
      const result = await api.get(id);
      const template = (result as any).data || result;

      if (!template) {
        throw new Error(`节点模板不存在: ${id}`);
      }

      return template;
    }, '获取节点模板详情');
  }

  /**
   * 获取触发器模板详情
   */
  async getTriggerTemplate(id: string): Promise<any> {
    return this.executeWithErrorHandling(async () => {
      const api = this.sdk.triggerTemplates;
      const result = await api.get(id);
      const template = (result as any).data || result;

      if (!template) {
        throw new Error(`触发器模板不存在: ${id}`);
      }

      return template;
    }, '获取触发器模板详情');
  }

  /**
   * 删除节点模板
   */
  async deleteNodeTemplate(id: string): Promise<void> {
    return this.executeWithErrorHandling(async () => {
      const api = this.sdk.nodeTemplates;
      await api.delete(id);

      this.logger.success(`节点模板已删除: ${id}`);
    }, '删除节点模板');
  }

  /**
   * 删除触发器模板
   */
  async deleteTriggerTemplate(id: string): Promise<void> {
    return this.executeWithErrorHandling(async () => {
      const api = this.sdk.triggerTemplates;
      await api.delete(id);

      this.logger.success(`触发器模板已删除: ${id}`);
    }, '删除触发器模板');
  }
}
```

### 3. 更新 CLI 命令

**文件位置**: `apps/cli-app/src/commands/workflow/index.ts`

**添加批量注册命令**:

```typescript
import { Command } from 'commander';
import { WorkflowAdapter } from '../../adapters/workflow-adapter';
import { createLogger } from '../../utils/logger';
import { formatWorkflow, formatWorkflowList } from '../../utils/formatter';

const logger = createLogger();

export const workflowCmd = new Command('workflow')
  .description('管理工作流')
  .alias('wf');

// 注册单个工作流
workflowCmd
  .command('register <file>')
  .description('从文件注册工作流')
  .option('-v, --verbose', '详细输出')
  .option('-p, --params <params>', '运行时参数 (JSON 格式)')
  .action(async (file, options: CommandOptions) => {
    try {
      logger.info(`正在注册工作流: ${file}`);
      
      // 解析参数
      const parameters = options.params 
        ? JSON.parse(options.params) 
        : undefined;
      
      const adapter = new WorkflowAdapter();
      const workflow = await adapter.registerFromFile(file, parameters);
      
      console.log(formatWorkflow(workflow, { verbose: options.verbose }));
    } catch (error) {
      logger.error(`注册失败: ${error instanceof Error ? error.message : String(error)}`);
      process.exit(1);
    }
  });

// 批量注册工作流
workflowCmd
  .command('register-batch <directory>')
  .description('从目录批量注册工作流')
  .option('-r, --recursive', '递归加载子目录')
  .option('-p, --pattern <pattern>', '文件模式 (正则表达式)')
  .option('-p, --params <params>', '运行时参数 (JSON 格式)')
  .action(async (directory, options: CommandOptions) => {
    try {
      logger.info(`正在批量注册工作流: ${directory}`);
      
      // 解析参数
      const parameters = options.params 
        ? JSON.parse(options.params) 
        : undefined;
      
      // 解析文件模式
      const filePattern = options.pattern 
        ? new RegExp(options.pattern) 
        : undefined;
      
      const adapter = new WorkflowAdapter();
      const result = await adapter.registerFromDirectory({
        configDir: directory,
        recursive: options.recursive,
        filePattern,
        parameters
      });
      
      // 显示结果
      console.log(`\n成功注册 ${result.success.length} 个工作流`);
      if (result.failures.length > 0) {
        console.log(`\n失败 ${result.failures.length} 个文件:`);
        result.failures.forEach(failure => {
          console.log(`  - ${failure.filePath}: ${failure.error}`);
        });
      }
    } catch (error) {
      logger.error(`批量注册失败: ${error instanceof Error ? error.message : String(error)}`);
      process.exit(1);
    }
  });

// 列出工作流
workflowCmd
  .command('list')
  .description('列出所有工作流')
  .option('-t, --table', '以表格格式输出')
  .option('-v, --verbose', '详细输出')
  .action(async (options: CommandOptions) => {
    try {
      const adapter = new WorkflowAdapter();
      const workflows = await adapter.listWorkflows();

      console.log(formatWorkflowList(workflows, { table: options.table }));
    } catch (error) {
      logger.error(`列出工作流失败: ${error instanceof Error ? error.message : String(error)}`);
      process.exit(1);
    }
  });

// 查看工作流详情
workflowCmd
  .command('show <id>')
  .description('查看工作流详情')
  .option('-v, --verbose', '详细输出')
  .action(async (id, options: CommandOptions) => {
    try {
      const adapter = new WorkflowAdapter();
      const workflow = await adapter.getWorkflow(id);

      console.log(formatWorkflow(workflow, { verbose: options.verbose }));
    } catch (error) {
      logger.error(`获取工作流详情失败: ${error instanceof Error ? error.message : String(error)}`);
      process.exit(1);
    }
  });

// 删除工作流
workflowCmd
  .command('delete <id>')
  .description('删除工作流')
  .action(async (id) => {
    try {
      const adapter = new WorkflowAdapter();
      await adapter.deleteWorkflow(id);
    } catch (error) {
      logger.error(`删除工作流失败: ${error instanceof Error ? error.message : String(error)}`);
      process.exit(1);
    }
  });
```

### 4. 保持 config-loader.ts 不变

**文件位置**: `apps/cli-app/src/config/config-loader.ts`

**说明**:
- 这个文件负责 CLI 应用自身的运行时配置
- 与 SDK config 模块职责不同，不需要修改
- 继续使用 cosmiconfig 和 zod

## 实施计划

### 阶段 1: 创建 ConfigManager
- [ ] 创建 `apps/cli-app/src/config/config-manager.ts`
- [ ] 实现单文件加载方法
- [ ] 实现批量加载方法
- [ ] 实现注册表加载方法
- [ ] 添加单元测试

### 阶段 2: 重构 WorkflowAdapter
- [ ] 更新 `apps/cli-app/src/adapters/workflow-adapter.ts`
- [ ] 使用 ConfigManager 替换直接文件读取
- [ ] 添加批量注册方法
- [ ] 更新测试用例

### 阶段 3: 重构 TemplateAdapter
- [ ] 更新 `apps/cli-app/src/adapters/template-adapter.ts`
- [ ] 使用 ConfigManager 替换直接文件读取
- [ ] 添加批量注册方法
- [ ] 更新测试用例

### 阶段 4: 更新 CLI 命令
- [ ] 添加批量注册命令
- [ ] 添加参数支持
- [ ] 更新帮助文档
- [ ] 添加使用示例

### 阶段 5: 测试和文档
- [ ] 端到端测试
- [ ] 性能测试
- [ ] 更新 README
- [ ] 添加迁移指南

## 预期收益

### 1. 架构清晰
- ✅ 配置加载逻辑完全独立
- ✅ 职责分离明确
- ✅ 易于维护和扩展

### 2. 功能完整
- ✅ 支持单文件和批量加载
- ✅ 支持配置继承
- ✅ 支持注册表模式
- ✅ 支持参数替换

### 3. 代码质量
- ✅ 使用 SDK 抽象，避免重复
- ✅ 类型安全
- ✅ 错误处理完善
- ✅ 易于测试

### 4. 用户体验
- ✅ 批量操作提高效率
- ✅ 详细的错误信息
- ✅ 灵活的配置选项

## 总结

**核心改进**:
1. 创建独立的 [`ConfigManager`](apps/cli-app/src/config/config-manager.ts:1) 统一处理配置加载
2. 完全使用 SDK 的 [`config`](sdk/api/config:1) 模块，不重复实现
3. 支持从 [`configs/`](configs:1) 目录批量加载配置
4. 支持配置继承和注册表模式

**关键原则**:
- 配置加载逻辑独立
- 使用 SDK 抽象
- 支持批量操作
- 职责分离