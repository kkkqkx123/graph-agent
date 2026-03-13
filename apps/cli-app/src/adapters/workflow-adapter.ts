/**
 * 工作流适配器
 * 封装工作流相关的 SDK API 调用
 */

import { BaseAdapter } from './base-adapter.js';
import { ConfigManager, type ConfigLoadOptions } from '../config/config-manager.js';
import { resolve } from 'path';
import { CLINotFoundError } from '../types/cli-types.js';

/**
 * 工作流适配器
 */
export class WorkflowAdapter extends BaseAdapter {
  private configManager: ConfigManager;

  constructor(configManager?: ConfigManager) {
    super();
    this.configManager = configManager || new ConfigManager();
  }

  /**
   * 从文件注册工作流
   * @param filePath 配置文件路径
   * @param parameters 运行时参数（用于模板替换）
   * @returns 工作流定义
   */
  async registerFromFile(
    filePath: string,
    parameters?: Record<string, any>
  ): Promise<any> {
    return this.executeWithErrorHandling(async () => {
      // 使用 ConfigManager 加载配置
      const fullPath = resolve(process.cwd(), filePath);
      const workflow = await this.configManager.loadWorkflow(fullPath, parameters);
      
      // 使用继承的 sdk 实例
      const api = this.sdk.workflows;
      await api.create(workflow);
      
      this.logger.success(`工作流已注册: ${workflow.id}`);
      return workflow;
    }, '注册工作流');
  }

  /**
   * 从目录批量注册工作流
   * @param options 加载选项
   * @returns 注册结果
   */
  async registerFromDirectory(
    options: ConfigLoadOptions = {}
  ): Promise<{
    success: any[];
    failures: Array<{ filePath: string; error: string }>;
  }> {
    return this.executeWithErrorHandling(async () => {
      // 使用 ConfigManager 批量加载配置
      const result = await this.configManager.loadWorkflows(options);
      
      const success: any[] = [];
      const failures = result.failures;

      // 注册成功加载的工作流
      const api = this.sdk.workflows;
      for (const workflow of result.configs) {
        try {
          await api.create(workflow);
          success.push(workflow);
          this.logger.success(`工作流已注册: ${workflow.id}`);
        } catch (error) {
          failures.push({
            filePath: workflow.id,
            error: error instanceof Error ? error.message : String(error)
          });
          this.logger.error(`注册工作流失败: ${workflow.id}`);
        }
      }

      return { success, failures };
    }, '批量注册工作流');
  }

  /**
   * 列出所有工作流
   */
  async listWorkflows(filter?: any): Promise<any[]> {
    return this.executeWithErrorHandling(async () => {
      const api = this.sdk.workflows;
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
    }, '列出工作流');
  }

  /**
   * 获取工作流详情
   */
  async getWorkflow(id: string): Promise<any> {
    return this.executeWithErrorHandling(async () => {
      const api = this.sdk.workflows;
      const result = await api.get(id);
      const workflow = (result as any).data || result;

      if (!workflow) {
        throw new CLINotFoundError(`工作流不存在: ${id}`, 'Workflow', id);
      }

      return workflow;
    }, '获取工作流详情');
  }

  /**
   * 删除工作流
   */
  async deleteWorkflow(id: string): Promise<void> {
    return this.executeWithErrorHandling(async () => {
      const api = this.sdk.workflows;
      await api.delete(id);

      this.logger.success(`工作流已删除: ${id}`);
    }, '删除工作流');
  }

}