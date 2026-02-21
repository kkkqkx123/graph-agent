/**
 * Human Relay 适配器
 * 封装 Human Relay 相关的 SDK API 调用
 */

import { BaseAdapter } from './base-adapter.js';
import type { HumanRelayConfig, HumanRelayFilter } from '@modular-agent/sdk';

/**
 * Human Relay 适配器
 */
export class HumanRelayAdapter extends BaseAdapter {
  /**
   * 列出所有 Human Relay 配置
   */
  async listConfigs(filter?: HumanRelayFilter): Promise<HumanRelayConfig[]> {
    return this.executeWithErrorHandling(async () => {
      const api = this.sdk.humanRelay;
      const result = await api.getAll(filter);
      const configs = (result as any).data || result;
      return configs as HumanRelayConfig[];
    }, '列出 Human Relay 配置');
  }

  /**
   * 获取 Human Relay 配置详情
   */
  async getConfig(id: string): Promise<HumanRelayConfig> {
    return this.executeWithErrorHandling(async () => {
      const api = this.sdk.humanRelay;
      const result = await api.get(id);
      const config = (result as any).data || result;
      return config as HumanRelayConfig;
    }, '获取 Human Relay 配置');
  }

  /**
   * 创建 Human Relay 配置
   */
  async createConfig(config: HumanRelayConfig): Promise<HumanRelayConfig> {
    return this.executeWithErrorHandling(async () => {
      const api = this.sdk.humanRelay;
      await api.create(config);
      this.logger.success(`Human Relay 配置已创建: ${config.id}`);
      return config;
    }, '创建 Human Relay 配置');
  }

  /**
   * 更新 Human Relay 配置
   */
  async updateConfig(id: string, updates: Partial<HumanRelayConfig>): Promise<HumanRelayConfig> {
    return this.executeWithErrorHandling(async () => {
      const api = this.sdk.humanRelay;
      await api.update(id, updates);
      const result = await api.get(id);
      const config = (result as any).data || result;
      this.logger.success(`Human Relay 配置已更新: ${id}`);
      return config as HumanRelayConfig;
    }, '更新 Human Relay 配置');
  }

  /**
   * 删除 Human Relay 配置
   */
  async deleteConfig(id: string): Promise<void> {
    return this.executeWithErrorHandling(async () => {
      const api = this.sdk.humanRelay;
      await api.delete(id);
      this.logger.success(`Human Relay 配置已删除: ${id}`);
    }, '删除 Human Relay 配置');
  }

  /**
   * 启用 Human Relay 配置
   */
  async enableConfig(id: string): Promise<void> {
    return this.executeWithErrorHandling(async () => {
      const api = this.sdk.humanRelay;
      await api.update(id, { enabled: true });
      this.logger.success(`Human Relay 配置已启用: ${id}`);
    }, '启用 Human Relay 配置');
  }

  /**
   * 禁用 Human Relay 配置
   */
  async disableConfig(id: string): Promise<void> {
    return this.executeWithErrorHandling(async () => {
      const api = this.sdk.humanRelay;
      await api.update(id, { enabled: false });
      this.logger.success(`Human Relay 配置已禁用: ${id}`);
    }, '禁用 Human Relay 配置');
  }
}