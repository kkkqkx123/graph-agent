/**
 * 应用层配置管理器示例
 *
 * 设计原则：
 * - 应用层负责配置文件加载和状态管理
 * - 使用SDK提供的无状态配置解析函数
 * - 显式控制配置注册和生命周期
 * - 文件 I/O 由应用层处理
 */

import { sdk } from '@modular-agent/sdk';
import {
  parseWorkflow,
  parseNodeTemplate,
  parseTriggerTemplate,
  parseScript,
  ConfigFormat
} from '@modular-agent/sdk/api/config';
import * as path from 'path';
import * as fs from 'fs/promises';

/**
 * 应用层配置管理器
 * 负责配置文件的加载、注册和管理
 */
export class AppConfigManager {

  /**
   * 检测文件格式
   * @param filePath 文件路径
   * @returns 配置格式
   */
  private detectFormat(filePath: string): ConfigFormat {
    const ext = path.extname(filePath).toLowerCase();
    switch (ext) {
      case '.toml':
        return ConfigFormat.TOML;
      case '.json':
        return ConfigFormat.JSON;
      default:
        throw new Error(`无法识别的配置文件扩展名: ${ext}`);
    }
  }

  /**
   * 从目录加载并注册所有配置
   * @param configDir 配置目录路径
   */
  async loadAndRegisterConfigs(configDir: string): Promise<void> {
    console.log(`开始加载配置文件: ${configDir}`);

    try {
      // 1. 扫描目录获取所有文件
      const files = await fs.readdir(configDir);
      
      // 分类配置文件
      const workflowFiles: string[] = [];
      const nodeTemplateFiles: string[] = [];
      const triggerTemplateFiles: string[] = [];
      const scriptFiles: string[] = [];

      for (const file of files) {
        const filePath = path.join(configDir, file);
        const stat = await fs.stat(filePath);
        
        if (!stat.isFile()) continue;

        if (file.endsWith('.json') || file.endsWith('.toml')) {
          if (file.includes('node-template') || file.includes('node_template')) {
            nodeTemplateFiles.push(filePath);
          } else if (file.includes('trigger-template') || file.includes('trigger_template')) {
            triggerTemplateFiles.push(filePath);
          } else if (file.includes('script') && !file.includes('template')) {
            scriptFiles.push(filePath);
          } else {
            workflowFiles.push(filePath);
          }
        }
      }

      console.log('扫描到的配置文件:', {
        workflows: workflowFiles.length,
        nodeTemplates: nodeTemplateFiles.length,
        triggerTemplates: triggerTemplateFiles.length,
        scripts: scriptFiles.length
      });

      // 2. 加载并注册工作流
      if (workflowFiles.length > 0) {
        console.log(`加载 ${workflowFiles.length} 个工作流配置...`);
        for (const filePath of workflowFiles) {
          try {
            const content = await fs.readFile(filePath, 'utf-8');
            const format = this.detectFormat(filePath);
            const workflow = parseWorkflow(content, format);
            await sdk.workflows.register(workflow);
            console.log(`✓ 工作流已注册: ${workflow.id}`);
          } catch (error) {
            console.error(`✗ 工作流加载失败: ${filePath}`, error);
          }
        }
      }

      // 3. 加载并注册节点模板
      if (nodeTemplateFiles.length > 0) {
        console.log(`加载 ${nodeTemplateFiles.length} 个节点模板配置...`);
        for (const filePath of nodeTemplateFiles) {
          try {
            const content = await fs.readFile(filePath, 'utf-8');
            const format = this.detectFormat(filePath);
            const template = parseNodeTemplate(content, format);
            sdk.nodeTemplates.register(template);
            console.log(`✓ 节点模板已注册: ${template.name}`);
          } catch (error) {
            console.error(`✗ 节点模板加载失败: ${filePath}`, error);
          }
        }
      }

      // 4. 加载并注册触发器模板
      if (triggerTemplateFiles.length > 0) {
        console.log(`加载 ${triggerTemplateFiles.length} 个触发器模板配置...`);
        for (const filePath of triggerTemplateFiles) {
          try {
            const content = await fs.readFile(filePath, 'utf-8');
            const format = this.detectFormat(filePath);
            const template = parseTriggerTemplate(content, format);
            sdk.triggerTemplates.register(template);
            console.log(`✓ 触发器模板已注册: ${template.name}`);
          } catch (error) {
            console.error(`✗ 触发器模板加载失败: ${filePath}`, error);
          }
        }
      }

      // 5. 加载并注册脚本
      if (scriptFiles.length > 0) {
        console.log(`加载 ${scriptFiles.length} 个脚本配置...`);
        for (const filePath of scriptFiles) {
          try {
            const content = await fs.readFile(filePath, 'utf-8');
            const format = this.detectFormat(filePath);
            const script = parseScript(content, format);
            sdk.scripts.register(script);
            console.log(`✓ 脚本已注册: ${script.name}`);
          } catch (error) {
            console.error(`✗ 脚本加载失败: ${filePath}`, error);
          }
        }
      }

      console.log('配置加载完成');
    } catch (error) {
      console.error('配置加载过程出错:', error);
      throw error;
    }
  }

  /**
   * 获取配置摘要
   */
  async getConfigSummary(): Promise<Record<string, number>> {
    const [workflows, nodeTemplates, triggerTemplates, scripts] = await Promise.all([
      sdk.workflows.count(),
      sdk.nodeTemplates.count(),
      sdk.triggerTemplates.count(),
      sdk.scripts.count()
    ]);

    return {
      workflows,
      nodeTemplates,
      triggerTemplates,
      scripts
    };
  }

  /**
   * 清除所有已注册的配置
   */
  async clearAllConfigs(): Promise<void> {
    console.log('清除所有已注册的配置...');
    await Promise.all([
      sdk.workflows.clear(),
      sdk.nodeTemplates.clear(),
      sdk.triggerTemplates.clear(),
      sdk.scripts.clear()
    ]);
    console.log('配置清除完成');
  }

  /**
   * 重新加载配置
   * @param configDir 配置目录路径
   */
  async reloadConfigs(configDir: string): Promise<void> {
    console.log('重新加载配置...');
    await this.clearAllConfigs();
    await this.loadAndRegisterConfigs(configDir);
  }
}

/**
 * 创建应用配置管理器实例
 */
export function createAppConfigManager(): AppConfigManager {
  return new AppConfigManager();
}