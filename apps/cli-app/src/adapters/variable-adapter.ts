/**
 * 变量适配器
 * 封装变量相关的 SDK API 调用
 */

import { BaseAdapter } from './base-adapter.js';
import type { VariableFilter } from '@modular-agent/types';

/**
 * 变量适配器
 */
export class VariableAdapter extends BaseAdapter {
  /**
   * 获取变量值
   */
  async getVariable(threadId: string, variableName: string): Promise<any> {
    return this.executeWithErrorHandling(async () => {
      const api = this.sdk.variables;
      const result = await api.get(`${threadId}:${variableName}`);
      const variable = (result as any).data || result;
      return variable;
    }, '获取变量');
  }

  /**
   * 设置变量值
   */
  async setVariable(threadId: string, variableName: string, value: any): Promise<void> {
    return this.executeWithErrorHandling(async () => {
      const api = this.sdk.variables;
      const registry = api.getRegistry();
      const threadContext = registry.get(threadId);
      if (!threadContext) {
        throw new Error(`Thread not found: ${threadId}`);
      }
      await threadContext.setVariable(variableName, value);
      this.logger.success(`变量已设置: ${variableName}`);
    }, '设置变量');
  }

  /**
   * 列出线程的所有变量
   */
  async listVariables(threadId: string): Promise<Record<string, any>> {
    return this.executeWithErrorHandling(async () => {
      const api = this.sdk.variables;
      const result = await api.getAll({ threadId });
      const variables = (result as any).data || result;
      return variables as Record<string, any>;
    }, '列出变量');
  }

  /**
   * 删除变量
   */
  async deleteVariable(threadId: string, variableName: string): Promise<void> {
    return this.executeWithErrorHandling(async () => {
      const api = this.sdk.variables;
      await api.delete(`${threadId}:${variableName}`);
      this.logger.success(`变量已删除: ${variableName}`);
    }, '删除变量');
  }

  /**
   * 获取变量定义信息
   */
  async getVariableDefinition(threadId: string, variableName: string): Promise<{
    name: string;
    type: string;
    description?: string;
    defaultValue?: any;
    required?: boolean;
  } | null> {
    return this.executeWithErrorHandling(async () => {
      const api = this.sdk.variables;
      const definitions = await api.getThreadVariableDefinitions(threadId);
      const definition = definitions[variableName] || null;
      return definition;
    }, '获取变量定义');
  }
}