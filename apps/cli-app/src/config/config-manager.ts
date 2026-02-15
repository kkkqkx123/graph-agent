/**
 * 统一配置管理器
 * 负责从文件系统加载配置，使用 SDK config 模块进行解析
 * 
 * 设计原则：
 * - 配置加载逻辑完全独立
 * - 使用 SDK config 模块提供的解析和验证功能
 * - 支持单文件和批量加载
 * - 支持配置继承和注册表模式
 */

import { 
  ConfigFormat,
  parseWorkflow,
  parseNodeTemplate,
  parseTriggerTemplate,
  parseScript,
  loadConfigContent
} from '@modular-agent/sdk';
import { readdir } from 'fs/promises';
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
   * @param filePath 配置文件路径
   * @param parameters 运行时参数（用于模板替换）
   * @returns 工作流定义
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
   * @param options 加载选项
   * @returns 加载结果
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
   * @param filePath 配置文件路径
   * @returns 节点模板定义
   */
  async loadNodeTemplate(filePath: string): Promise<any> {
    const { content, format } = await loadConfigContent(filePath);
    return parseNodeTemplate(content, format);
  }

  /**
   * 批量加载节点模板配置
   * @param options 加载选项
   * @returns 加载结果
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
   * @param filePath 配置文件路径
   * @returns 触发器模板定义
   */
  async loadTriggerTemplate(filePath: string): Promise<any> {
    const { content, format } = await loadConfigContent(filePath);
    return parseTriggerTemplate(content, format);
  }

  /**
   * 批量加载触发器模板配置
   * @param options 加载选项
   * @returns 加载结果
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
   * @param filePath 配置文件路径
   * @returns 脚本定义
   */
  async loadScript(filePath: string): Promise<any> {
    const { content, format } = await loadConfigContent(filePath);
    return parseScript(content, format);
  }

  /**
   * 批量加载脚本配置
   * @param options 加载选项
   * @returns 加载结果
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
   * @param registryPath 注册表文件路径
   * @param options 加载选项
   * @returns 加载结果
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
   * @param dir 目录路径
   * @param options 加载选项
   * @returns 文件路径数组
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
   * @param content 配置内容
   * @param format 配置格式
   * @param classPath 类路径
   * @returns 解析后的配置
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
 * @param configDir 配置目录路径
 * @returns 配置管理器实例
 */
export function getConfigManager(configDir?: string): ConfigManager {
  if (!globalConfigManager) {
    globalConfigManager = new ConfigManager(configDir);
  }
  return globalConfigManager;
}