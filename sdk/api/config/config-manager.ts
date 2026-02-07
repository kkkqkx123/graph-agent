/**
 * 统一配置管理器
 * 提供所有配置类型的统一管理接口
 */

import type { WorkflowDefinition } from '../../types/workflow';
import type { NodeTemplate } from '../../types/node-template';
import type { TriggerTemplate } from '../../types/trigger-template';
import type { Script } from '../../types/code';
import { WorkflowLoader } from './loaders/workflow-loader';
import { NodeTemplateLoader } from './loaders/node-template-loader';
import { TriggerTemplateLoader } from './loaders/trigger-template-loader';
import { ScriptLoader } from './loaders/script-loader';
import { ConfigurationError } from '../../types/errors';
import * as path from 'path';

/**
 * 配置加载选项
 */
export interface LoadFromDirectoryOptions {
  /** 是否加载工作流配置 */
  workflows?: boolean;
  /** 是否加载节点模板配置 */
  nodeTemplates?: boolean;
  /** 是否加载触发器模板配置 */
  triggerTemplates?: boolean;
  /** 是否加载脚本配置 */
  scripts?: boolean;
  /** 文件名模式（用于过滤特定文件） */
  filePattern?: RegExp;
}

/**
 * 配置加载结果
 */
export interface LoadFromDirectoryResult {
  /** 加载的工作流 */
  workflows?: WorkflowDefinition[];
  /** 加载的节点模板 */
  nodeTemplates?: NodeTemplate[];
  /** 加载的触发器模板 */
  triggerTemplates?: TriggerTemplate[];
  /** 加载的脚本 */
  scripts?: Script[];
}

/**
 * 统一配置管理器
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
   * @param directory 目录路径
   * @param options 加载选项
   * @returns 加载结果
   */
  async loadFromDirectory(
    directory: string,
    options?: LoadFromDirectoryOptions
  ): Promise<LoadFromDirectoryResult> {
    const result: LoadFromDirectoryResult = {};
    const fs = await import('fs/promises');

    try {
      const files = await fs.readdir(directory);
      
      // 应用文件名模式过滤
      const filteredFiles = options?.filePattern 
        ? files.filter(f => options.filePattern!.test(f))
        : files;

      // 加载工作流配置
      if (options?.workflows !== false) {
        const workflowFiles = filteredFiles.filter(f => 
          (f.endsWith('.json') || f.endsWith('.toml')) && 
          !f.includes('template') && 
          !f.includes('script')
        );
        
        if (workflowFiles.length > 0) {
          result.workflows = await Promise.all(
            workflowFiles.map(f => 
              this.workflowLoader.loadAndTransform(path.join(directory, f))
            )
          );
        }
      }

      // 加载节点模板配置
      if (options?.nodeTemplates !== false) {
        const nodeTemplateFiles = filteredFiles.filter(f => 
          f.includes('node-template') || 
          f.includes('node_template')
        );
        
        if (nodeTemplateFiles.length > 0) {
          result.nodeTemplates = await this.nodeTemplateLoader.loadBatchAndRegister(
            nodeTemplateFiles.map(f => path.join(directory, f))
          );
        }
      }

      // 加载触发器模板配置
      if (options?.triggerTemplates !== false) {
        const triggerTemplateFiles = filteredFiles.filter(f => 
          f.includes('trigger-template') || 
          f.includes('trigger_template')
        );
        
        if (triggerTemplateFiles.length > 0) {
          result.triggerTemplates = await this.triggerTemplateLoader.loadBatchAndRegister(
            triggerTemplateFiles.map(f => path.join(directory, f))
          );
        }
      }

      // 加载脚本配置
      if (options?.scripts !== false) {
        const scriptFiles = filteredFiles.filter(f => 
          f.includes('script') && 
          !f.includes('template')
        );
        
        if (scriptFiles.length > 0) {
          result.scripts = await this.scriptLoader.loadBatchAndRegister(
            scriptFiles.map(f => path.join(directory, f))
          );
        }
      }

      return result;
    } catch (error) {
      if (error instanceof ConfigurationError) {
        throw error;
      }
      if (error instanceof Error) {
        throw new ConfigurationError(
          `从目录加载配置失败: ${error.message}`,
          directory,
          { originalError: error.message }
        );
      }
      throw new ConfigurationError('从目录加载配置失败: 未知错误');
    }
  }

  /**
   * 从多个目录加载配置
   * @param directories 目录路径数组
   * @param options 加载选项
   * @returns 加载结果
   */
  async loadFromDirectories(
    directories: string[],
    options?: LoadFromDirectoryOptions
  ): Promise<LoadFromDirectoryResult> {
    const results: LoadFromDirectoryResult = {
      workflows: [],
      nodeTemplates: [],
      triggerTemplates: [],
      scripts: []
    };

    for (const directory of directories) {
      const result = await this.loadFromDirectory(directory, options);
      
      if (result.workflows) {
        results.workflows!.push(...result.workflows);
      }
      if (result.nodeTemplates) {
        results.nodeTemplates!.push(...result.nodeTemplates);
      }
      if (result.triggerTemplates) {
        results.triggerTemplates!.push(...result.triggerTemplates);
      }
      if (result.scripts) {
        results.scripts!.push(...result.scripts);
      }
    }

    return results;
  }

  /**
   * 导出所有配置到目录
   * @param directory 目录路径
   * @param configs 配置对象
   */
  async exportToDirectory(
    directory: string,
    configs: {
      workflows?: WorkflowDefinition[];
      nodeTemplates?: NodeTemplate[];
      triggerTemplates?: TriggerTemplate[];
      scripts?: Script[];
    }
  ): Promise<void> {
    const fs = await import('fs/promises');

    try {
      // 确保目录存在
      await fs.mkdir(directory, { recursive: true });

      // 导出工作流
      if (configs.workflows) {
        for (const workflow of configs.workflows) {
          const filePath = path.join(directory, `${workflow.id}.json`);
          await this.workflowLoader.exportToFile(workflow, filePath);
        }
      }

      // 导出节点模板
      if (configs.nodeTemplates) {
        for (const template of configs.nodeTemplates) {
          const filePath = path.join(directory, `node-template-${template.name}.json`);
          await this.nodeTemplateLoader.exportToFile(template, filePath);
        }
      }

      // 导出触发器模板
      if (configs.triggerTemplates) {
        for (const template of configs.triggerTemplates) {
          const filePath = path.join(directory, `trigger-template-${template.name}.json`);
          await this.triggerTemplateLoader.exportToFile(template, filePath);
        }
      }

      // 导出脚本
      if (configs.scripts) {
        for (const script of configs.scripts) {
          const filePath = path.join(directory, `script-${script.name}.json`);
          await this.scriptLoader.exportToFile(script, filePath);
        }
      }
    } catch (error) {
      if (error instanceof ConfigurationError) {
        throw error;
      }
      if (error instanceof Error) {
        throw new ConfigurationError(
          `导出配置到目录失败: ${error.message}`,
          directory,
          { originalError: error.message }
        );
      }
      throw new ConfigurationError('导出配置到目录失败: 未知错误');
    }
  }

  /**
   * 获取所有已注册的配置摘要
   * @returns 配置摘要
   */
  getSummary() {
    return {
      workflows: {
        count: 0, // 工作流不存储在注册表中
        loader: 'WorkflowLoader'
      },
      nodeTemplates: {
        count: this.nodeTemplateLoader.getAllTemplates().length,
        loader: 'NodeTemplateLoader'
      },
      triggerTemplates: {
        count: this.triggerTemplateLoader.getAllTemplates().length,
        loader: 'TriggerTemplateLoader'
      },
      scripts: {
        count: this.scriptLoader.getAllScripts().length,
        loader: 'ScriptLoader'
      }
    };
  }
}

// 导出单例实例
export const configManager = new ConfigManager();