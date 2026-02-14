/**
 * 工作流适配器
 * 封装工作流相关的 SDK API 调用
 */

import { readFile } from 'fs/promises';
import { resolve } from 'path';
import { parseJson, parseToml } from '@modular-agent/sdk/api';
import { createLogger } from '../utils/logger';

const logger = createLogger();

/**
 * 工作流适配器
 */
export class WorkflowAdapter {
  /**
   * 从文件注册工作流
   */
  async registerFromFile(filePath: string): Promise<any> {
    try {
      const { sdk } = await import('@modular-agent/sdk');
      const fullPath = resolve(process.cwd(), filePath);
      const content = await readFile(fullPath, 'utf-8');

      const workflow = this.parseWorkflowFile(content, fullPath);

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

  /**
   * 解析工作流文件
   */
  private parseWorkflowFile(content: string, filePath: string): any {
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
      throw new Error(`解析工作流文件失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}