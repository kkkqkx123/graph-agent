/**
 * Web交互服务实现
 * 
 * 提供Web界面的交互服务
 * 注意：这是一个占位符实现，实际的前端实现被跳过
 */

import { injectable } from 'inversify';
import { HumanRelayPrompt } from '../../../../domain/llm/entities/human-relay-prompt';
import { InteractionStatus } from '../../../../domain/llm/interfaces/human-relay-interaction.interface';
import { BaseWebInteractionService } from '../interfaces/frontend-services.interface';

/**
 * Web交互服务实现（占位符）
 */
@injectable()
export class WebInteractionService extends BaseWebInteractionService {
  private isConnected: boolean = false;
  private clients: Map<string, any> = new Map();

  constructor(config: Record<string, any> = {}) {
    super(config);
  }

  /**
   * 发送提示给Web界面
   */
  public async sendPrompt(prompt: HumanRelayPrompt): Promise<string> {
    // 占位符实现
    throw new Error('Web交互服务尚未实现，请使用TUI交互服务');
  }

  /**
   * 检查用户是否可用
   */
  public async isUserAvailable(): Promise<boolean> {
    return this.isConnected && this.clients.size > 0;
  }

  /**
   * 获取交互状态
   */
  public async getStatus(): Promise<InteractionStatus> {
    if (!this.isConnected) {
      return InteractionStatus.UNAVAILABLE;
    }
    return this.clients.size > 0 ? InteractionStatus.AVAILABLE : InteractionStatus.BUSY;
  }

  /**
   * 取消当前交互
   */
  public async cancel(): Promise<boolean> {
    // 占位符实现
    return true;
  }

  /**
   * 获取连接的客户端数量
   */
  public async getConnectedClientsCount(): Promise<number> {
    return this.clients.size;
  }

  /**
   * 广播消息给所有客户端
   */
  public async broadcast(message: any): Promise<boolean> {
    // 占位符实现
    return true;
  }

  /**
   * 发送消息给特定客户端
   */
  public async sendToClient(clientId: string, message: any): Promise<boolean> {
    // 占位符实现
    return true;
  }

  /**
   * 断开特定客户端连接
   */
  public async disconnectClient(clientId: string): Promise<boolean> {
    this.clients.delete(clientId);
    return true;
  }

  /**
   * 启动WebSocket服务器
   */
  public async startServer(): Promise<boolean> {
    // 占位符实现
    this.isConnected = true;
    return true;
  }

  /**
   * 停止WebSocket服务器
   */
  public async stopServer(): Promise<boolean> {
    this.isConnected = false;
    this.clients.clear();
    return true;
  }
}