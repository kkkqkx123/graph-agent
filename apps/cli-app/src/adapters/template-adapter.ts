/**
 * 模板适配器
 * 封装模板相关的 SDK API 调用
 */

import { BaseAdapter } from './base-adapter';
import { resolve } from 'path';
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
   * @param filePath 配置文件路径
   * @returns 节点模板定义
   */
  async registerNodeTemplateFromFile(filePath: string): Promise<any> {
    return this.executeWithErrorHandling(async () => {
      // 使用 ConfigManager 加载配置
      const fullPath = resolve(process.cwd(), filePath);
      const template = await this.configManager.loadNodeTemplate(fullPath);
      
      const api = this.sdk.nodeTemplates;
      await api.create(template);
      
      this.logger.success(`节点模板已注册: ${template.id}`);
      return template;
    }, '注册节点模板');
  }

  /**
   * 从目录批量注册节点模板
   * @param options 加载选项
   * @returns 注册结果
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
   * @param filePath 配置文件路径
   * @returns 触发器模板定义
   */
  async registerTriggerTemplateFromFile(filePath: string): Promise<any> {
    return this.executeWithErrorHandling(async () => {
      // 使用 ConfigManager 加载配置
      const fullPath = resolve(process.cwd(), filePath);
      const template = await this.configManager.loadTriggerTemplate(fullPath);
      
      const api = this.sdk.triggerTemplates;
      await api.create(template);
      
      this.logger.success(`触发器模板已注册: ${template.id}`);
      return template;
    }, '注册触发器模板');
  }

  /**
   * 从目录批量注册触发器模板
   * @param options 加载选项
   * @returns 注册结果
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