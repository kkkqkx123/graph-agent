/**
 * HumanRelay交互接口
 * 
 * 定义人工中转交互的契约
 */

export { HumanRelayPrompt, HumanRelayResponse, HumanRelaySession } from "../entities";
import { HumanRelayPrompt, HumanRelayResponse, HumanRelaySession } from "../entities";
import { HumanRelaySessionStatus } from "../value-objects";


/**
 * 交互状态枚举
 */
export enum InteractionStatus {
  /**
   * 可用
   */
  AVAILABLE = 'available',

  /**
   * 忙碌
   */
  BUSY = 'busy',

  /**
   * 不可用
   */
  UNAVAILABLE = 'unavailable'
}

/**
 * 前端类型枚举
 */
export enum FrontendType {
  /**
   * 命令行界面
   */
  TUI = 'tui',

  /**
   * Web界面
   */
  WEB = 'web',

  /**
   * API接口
   */
  API = 'api'
}

/**
 * 交互统计信息
 */
export interface InteractionStatistics {
  /**
   * 总交互次数
   */
  totalInteractions: number;

  /**
   * 成功交互次数
   */
  successfulInteractions: number;

  /**
   * 超时次数
   */
  timeoutCount: number;

  /**
   * 错误次数
   */
  errorCount: number;

  /**
   * 平均响应时间（毫秒）
   */
  averageResponseTime: number;

  /**
   * 平均用户交互时间（毫秒）
   */
  averageUserInteractionTime: number;

  /**
   * 成功率（百分比）
   */
  successRate: number;
}

/**
 * 人工中转交互服务接口
 */
export interface IHumanRelayInteractionService {
  /**
   * 发送提示给用户并等待响应
   * 
   * @param prompt 提示实体
   * @param timeout 超时时间（秒）
   * @returns 用户响应
   */
  sendPromptAndWaitForResponse(
    prompt: HumanRelayPrompt,
    timeout: number
  ): Promise<HumanRelayResponse>;

  /**
   * 检查用户是否可用
   * 
   * @returns 用户是否可用
   */
  isUserAvailable(): Promise<boolean>;

  /**
   * 获取交互状态
   * 
   * @returns 交互状态
   */
  getInteractionStatus(): Promise<InteractionStatus>;

  /**
   * 取消当前交互
   * 
   * @returns 是否成功取消
   */
  cancelCurrentInteraction(): Promise<boolean>;

  /**
   * 获取前端类型
   * 
   * @returns 前端类型
   */
  getFrontendType(): FrontendType;

  /**
   * 获取交互统计信息
   * 
   * @returns 统计信息
   */
  getInteractionStatistics(): Promise<InteractionStatistics>;

  /**
   * 重置统计信息
   * 
   * @returns 是否成功重置
   */
  resetStatistics(): Promise<boolean>;

  /**
   * 健康检查
   * 
   * @returns 健康状态
   */
  healthCheck(): Promise<{
    status: 'healthy' | 'unhealthy' | 'degraded';
    message?: string;
    lastChecked: Date;
  }>;
}

/**
 * 前端交互服务基础接口
 */
export interface IFrontendInteractionService {
  /**
   * 发送提示给前端
   * 
   * @param prompt 提示实体
   * @returns 用户响应内容
   */
  sendPrompt(prompt: HumanRelayPrompt): Promise<string>;

  /**
   * 检查用户是否可用
   * 
   * @returns 用户是否可用
   */
  isUserAvailable(): Promise<boolean>;

  /**
   * 获取交互状态
   * 
   * @returns 交互状态
   */
  getStatus(): Promise<InteractionStatus>;

  /**
   * 取消当前交互
   * 
   * @returns 是否成功取消
   */
  cancel(): Promise<boolean>;

  /**
   * 获取前端类型
   * 
   * @returns 前端类型
   */
  getFrontendType(): FrontendType;

  /**
   * 配置前端服务
   * 
   * @param config 配置选项
   * @returns 是否成功配置
   */
  configure(config: Record<string, any>): Promise<boolean>;

  /**
   * 获取配置
   * 
   * @returns 当前配置
   */
  getConfiguration(): Promise<Record<string, any>>;

  /**
   * 关闭前端服务
   * 
   * @returns 是否成功关闭
   */
  shutdown(): Promise<boolean>;
}

/**
 * TUI交互服务接口
 */
export interface ITUIInteractionService extends IFrontendInteractionService {
  /**
   * 设置TUI样式
   * 
   * @param style 样式选项
   * @returns 是否成功设置
   */
  setStyle(style: {
    promptStyle?: 'minimal' | 'highlight' | 'detailed';
    inputAreaHeight?: number;
    showTimer?: boolean;
    showHistory?: boolean;
  }): Promise<boolean>;

  /**
   * 显示帮助信息
   * 
   * @returns 是否成功显示
   */
  showHelp(): Promise<boolean>;

  /**
   * 清屏
   * 
   * @returns 是否成功清屏
   */
  clearScreen(): Promise<boolean>;
}

/**
 * Web交互服务接口
 */
export interface IWebInteractionService extends IFrontendInteractionService {
  /**
   * 获取连接的客户端数量
   * 
   * @returns 客户端数量
   */
  getConnectedClientsCount(): Promise<number>;

  /**
   * 广播消息给所有客户端
   * 
   * @param message 消息内容
   * @returns 是否成功广播
   */
  broadcast(message: any): Promise<boolean>;

  /**
   * 发送消息给特定客户端
   * 
   * @param clientId 客户端ID
   * @param message 消息内容
   * @returns 是否成功发送
   */
  sendToClient(clientId: string, message: any): Promise<boolean>;

  /**
   * 断开特定客户端连接
   * 
   * @param clientId 客户端ID
   * @returns 是否成功断开
   */
  disconnectClient(clientId: string): Promise<boolean>;
}

/**
 * API交互服务接口
 */
export interface IAPIInteractionService extends IFrontendInteractionService {
  /**
   * 创建交互会话
   * 
   * @param prompt 提示内容
   * @returns 会话ID
   */
  createInteractionSession(prompt: string): Promise<string>;

  /**
   * 获取交互会话状态
   * 
   * @param sessionId 会话ID
   * @returns 会话状态
   */
  getInteractionSessionStatus(sessionId: string): Promise<{
    status: 'pending' | 'completed' | 'timeout' | 'error';
    response?: string;
    createdAt: Date;
    updatedAt: Date;
  }>;

  /**
   * 提交交互响应
   * 
   * @param sessionId 会话ID
   * @param response 响应内容
   * @returns 是否成功提交
   */
  submitInteractionResponse(sessionId: string, response: string): Promise<boolean>;

  /**
   * 取消交互会话
   * 
   * @param sessionId 会话ID
   * @returns 是否成功取消
   */
  cancelInteractionSession(sessionId: string): Promise<boolean>;
}

/**
 * HumanRelay会话仓库接口
 */
export interface IHumanRelaySessionRepository {
  /**
   * 保存会话
   * 
   * @param session 会话实体
   * @returns 是否成功保存
   */
  save(session: HumanRelaySession): Promise<void>;

  /**
   * 根据ID查找会话
   * 
   * @param sessionId 会话ID
   * @returns 会话实体或null
   */
  findById(sessionId: string): Promise<HumanRelaySession | null>;

  /**
   * 根据状态查找会话
   * 
   * @param status 会话状态
   * @returns 会话列表
   */
  findByStatus(status: HumanRelaySessionStatus): Promise<HumanRelaySession[]>;

  /**
   * 查找活跃会话
   * 
   * @returns 活跃会话列表
   */
  findActiveSessions(): Promise<HumanRelaySession[]>;

  /**
   * 查找超时会话
   * 
   * @returns 超时会话列表
   */
  findTimeoutSessions(): Promise<HumanRelaySession[]>;

  /**
   * 删除会话
   * 
   * @param sessionId 会话ID
   * @returns 是否成功删除
   */
  delete(sessionId: string): Promise<void>;

  /**
   * 清理过期会话
   * 
   * @param olderThanDays 清理多少天前的会话
   * @returns 清理的会话数量
   */
  cleanupExpiredSessions(olderThanDays: number): Promise<number>;

  /**
   * 获取会话统计信息
   * 
   * @returns 统计信息
   */
  getStatistics(): Promise<{
    totalSessions: number;
    activeSessions: number;
    completedSessions: number;
    timeoutSessions: number;
    errorSessions: number;
    averageSessionDuration: number;
  }>;
}