/**
 * 工具执行器基类
 *
 * 提供工具执行器的核心接口和基础功能
 */

import { injectable } from 'inversify';
import { Tool } from '../../../domain/tools/entities/tool';
import { ToolExecution } from '../../../domain/tools/entities/tool-execution';
import { ToolResult } from '../../../domain/tools/entities/tool-result';

/**
 * 工具执行器配置模式
 */
export interface ToolExecutorConfigSchema {
  type: string;
  properties: Record<
    string,
    {
      type: string;
      description?: string;
      required?: string[];
      default?: any;
    }
  >;
  required: string[];
}

/**
 * 工具执行器能力
 */
export interface ToolExecutorCapabilities {
  streaming: boolean;
  async: boolean;
  batch: boolean;
  retry: boolean;
  timeout: boolean;
  cancellation: boolean;
}

/**
 * 工具执行器健康检查
 */
export interface ToolExecutorHealthCheck {
  status: 'healthy' | 'unhealthy';
  message?: string;
  lastChecked: Date;
}

/**
 * 工具执行器基类
 *
 * 职责：定义工具执行器的核心接口
 * 注意：移除了过多的统计和监控功能，保持简洁
 */
@injectable()
export abstract class ToolExecutorBase {
  protected isInitialized = false;
  protected isRunning = false;
  protected config: Record<string, unknown> = {};

  /**
   * 执行工具
   */
  abstract execute(tool: Tool, execution: ToolExecution): Promise<ToolResult>;

  /**
   * 验证工具配置
   */
  abstract validateTool(tool: Tool): Promise<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
  }>;

  /**
   * 验证执行参数
   */
  abstract validateParameters(
    tool: Tool,
    parameters: Record<string, unknown>
  ): Promise<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
  }>;

  /**
   * 获取执行器类型
   */
  abstract getType(): string;

  /**
   * 获取执行器名称
   */
  abstract getName(): string;

  /**
   * 获取执行器版本
   */
  abstract getVersion(): string;

  /**
   * 获取执行器描述
   */
  abstract getDescription(): string;

  /**
   * 获取支持的工具类型
   */
  abstract getSupportedToolTypes(): string[];

  /**
   * 检查是否支持指定工具
   */
  supportsTool(tool: Tool): boolean {
    return this.getSupportedToolTypes().includes(tool.type.value);
  }

  /**
   * 获取配置模式
   */
  abstract getConfigSchema(): ToolExecutorConfigSchema;

  /**
   * 获取执行器能力
   */
  abstract getCapabilities(): ToolExecutorCapabilities;

  /**
   * 健康检查
   */
  abstract healthCheck(): Promise<ToolExecutorHealthCheck>;

  /**
   * 初始化执行器
   */
  async initialize(config: Record<string, unknown>): Promise<boolean> {
    try {
      this.config = config;
      this.isInitialized = true;
      return true;
    } catch (error) {
      console.error(`初始化${this.getName()}失败:`, error);
      return false;
    }
  }

  /**
   * 配置执行器
   */
  async configure(config: Record<string, unknown>): Promise<boolean> {
    try {
      this.config = { ...this.config, ...config };
      return true;
    } catch (error) {
      console.error(`配置${this.getName()}失败:`, error);
      return false;
    }
  }

  /**
   * 获取配置
   */
  getConfiguration(): Record<string, unknown> {
    return { ...this.config };
  }

  /**
   * 重置配置
   */
  resetConfiguration(): void {
    this.config = {};
  }

  /**
   * 启动执行器
   */
  async start(): Promise<boolean> {
    this.isRunning = true;
    return true;
  }

  /**
   * 停止执行器
   */
  async stop(): Promise<boolean> {
    this.isRunning = false;
    return true;
  }

  /**
   * 重启执行器
   */
  async restart(): Promise<boolean> {
    await this.stop();
    await this.start();
    return true;
  }

  /**
   * 检查执行器是否正在运行
   */
  isRunningFlag(): boolean {
    return this.isRunning;
  }

  /**
   * 检查执行器是否已初始化
   */
  isInitializedFlag(): boolean {
    return this.isInitialized;
  }

  /**
   * 批量执行工具
   */
  async executeBatch(tools: Tool[], executions: ToolExecution[]): Promise<ToolResult[]> {
    const results: ToolResult[] = [];
    for (let i = 0; i < tools.length; i++) {
      const tool = tools[i];
      const execution = executions[i];
      if (tool && execution) {
        results.push(await this.execute(tool, execution));
      }
    }
    return results;
  }

  /**
   * 清理资源
   */
  async cleanup(): Promise<boolean> {
    this.config = {};
    return true;
  }

  /**
   * 关闭执行器
   */
  async close(): Promise<boolean> {
    await this.stop();
    await this.cleanup();
    return true;
  }
}
