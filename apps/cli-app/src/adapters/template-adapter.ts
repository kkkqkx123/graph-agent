/**
 * 模板适配器
 * 封装模板相关的 SDK API 调用
 */

import { BaseAdapter } from './base-adapter';
import { readFile } from 'fs/promises';
import { resolve } from 'path';
import { parseJson, parseToml } from '@modular-agent/sdk';

/**
 * 模板适配器
 */
export class TemplateAdapter extends BaseAdapter {
  /**
   * 从文件注册节点模板
   */
  async registerNodeTemplateFromFile(filePath: string): Promise<any> {
    return this.executeWithErrorHandling(async () => {
      const fullPath = resolve(process.cwd(), filePath);
      const content = await readFile(fullPath, 'utf-8');

      const template = this.parseTemplateFile(content, fullPath);

      const api = this.sdk.nodeTemplates;
      await api.create(template);

      this.logger.success(`节点模板已注册: ${template.id}`);
      return template;
    }, '注册节点模板');
  }

  /**
   * 从文件注册触发器模板
   */
  async registerTriggerTemplateFromFile(filePath: string): Promise<any> {
    return this.executeWithErrorHandling(async () => {
      const fullPath = resolve(process.cwd(), filePath);
      const content = await readFile(fullPath, 'utf-8');

      const template = this.parseTemplateFile(content, fullPath);

      const api = this.sdk.triggerTemplates;
      await api.create(template);

      this.logger.success(`触发器模板已注册: ${template.id}`);
      return template;
    }, '注册触发器模板');
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

  /**
   * 解析模板文件
   */
  private parseTemplateFile(content: string, filePath: string): any {
    const ext = filePath.split('.').pop()?.toLowerCase();

    try {
      switch (ext) {
        case 'json':
          return parseJson(content);
        case 'toml':
          return parseToml(content);
        default:
          if (content.trim().startsWith('{')) {
            return parseJson(content);
          } else {
            return parseToml(content);
          }
      }
    } catch (error) {
      throw new Error(`解析模板文件失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}