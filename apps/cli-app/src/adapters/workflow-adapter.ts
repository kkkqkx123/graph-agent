/**
 * 工作流适配器
 * 封装工作流相关的 SDK API 调用
 */

import { resolve } from 'path';
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
   * @param filePath 配置文件路径
   * @param parameters 运行时参数（用于模板替换）
   * @returns 工作流定义
   */
  async registerFromFile(
    filePath: string,
    parameters?: Record<string, any>
  ): Promise<any> {
    try {
      const { sdk } = await import('@modular-agent/sdk');
      
      // 使用 ConfigManager 加载配置
      const fullPath = resolve(process.cwd(), filePath);
      const workflow = await this.configManager.loadWorkflow(fullPath, parameters);
      
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
   * @param options 加载选项
   * @returns 注册结果
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