/**
 * HumanRelay域服务
 * 
 * 提供HumanRelay相关的业务逻辑和领域服务
 */

import { injectable } from 'inversify';
import { HumanRelaySession } from '../entities/human-relay-session';
import { HumanRelayPrompt } from '../entities/human-relay-prompt';
import { HumanRelayResponse } from '../entities/human-relay-response';
import { HumanRelayMode } from '../value-objects/human-relay-mode';
import { HumanRelaySessionStatus } from '../value-objects/human-relay-session-status';
import { PromptTemplate } from '../value-objects/prompt-template';
import { ILLMMessage, LLMMessageRole } from '../../../shared/types/llm';

/**
 * HumanRelay域服务
 */
@injectable()
export class HumanRelayDomainService {
  /**
   * 创建新的人工中转会话
   * 
   * @param mode 操作模式
   * @param name 会话名称
   * @param maxHistoryLength 最大历史长度
   * @param sessionTimeout 会话超时时间
   * @returns 创建的会话
   */
  public createSession(
    mode: HumanRelayMode,
    name?: string,
    maxHistoryLength?: number,
    sessionTimeout?: number
  ): HumanRelaySession {
    const sessionName = name || this.generateSessionName(mode);
    
    if (mode === HumanRelayMode.SINGLE) {
      return HumanRelaySession.createSingleTurn(sessionName, sessionTimeout);
    } else {
      return HumanRelaySession.createMultiTurn(
        sessionName,
        maxHistoryLength,
        sessionTimeout
      );
    }
  }

  /**
   * 构建提示词
   * 
   * @param messages LLM消息列表
   * @param mode 操作模式
   * @param history 对话历史（多轮模式）
   * @param template 自定义模板
   * @returns 构建的提示词
   */
  public buildPrompt(
    messages: ILLMMessage[],
    mode: HumanRelayMode,
    history?: ILLMMessage[],
    template?: PromptTemplate
  ): HumanRelayPrompt {
    // 使用默认模板或自定义模板
    const promptTemplate = template || this.getDefaultTemplate(mode);
    
    // 构建提示内容
    const promptContent = this.buildPromptContent(messages, mode, history);
    
    // 构建对话上下文（多轮模式）
    let conversationContext: string | undefined;
    if (mode === HumanRelayMode.MULTI && history && history.length > 0) {
      conversationContext = history
        .map(msg => `${msg.role}: ${msg.content}`)
        .join('\n');
    }
    
    // 创建提示
    if (mode === HumanRelayMode.MULTI) {
      return HumanRelayPrompt.createMultiTurn(
        promptContent,
        conversationContext!,
        promptTemplate
      );
    } else {
      return HumanRelayPrompt.createSingleTurn(promptContent, promptTemplate);
    }
  }

  /**
   * 处理用户响应
   * 
   * @param responseContent 用户响应内容
   * @param session 会话
   * @param prompt 关联的提示
   * @returns 处理后的响应
   */
  public processUserResponse(
    responseContent: string,
    session: HumanRelaySession,
    prompt: HumanRelayPrompt
  ): HumanRelayResponse {
    // 创建响应
    const deliveredAt = prompt.getDeliveredAt();
    const userInteractionTime = deliveredAt ? Date.now() - deliveredAt.getMilliseconds() : 0;
    const response = HumanRelayResponse.createNormal(
      responseContent,
      Date.now() - prompt.getCreatedAt().getMilliseconds(),
      userInteractionTime,
      prompt.getId()
    );
    
    // 更新会话状态
    session.setProcessing();
    
    // 添加助手消息到对话历史
    const assistantMessage: ILLMMessage = {
      role: LLMMessageRole.ASSISTANT,
      content: responseContent,
      metadata: {
        responseId: response.getId().value,
        promptId: prompt.getId().value,
        responseTime: response.getResponseTime()
      }
    };
    
    session.addMessage(assistantMessage);
    session.addResponse(response);
    
    // 如果是单轮模式，完成会话
    if (session.isSingleMode()) {
      session.complete();
    } else {
      // 多轮模式回到活跃状态
      session.activate();
    }
    
    return response;
  }

  /**
   * 处理超时情况
   * 
   * @param session 会话
   * @param prompt 关联的提示
   * @returns 超时响应
   */
  public handleTimeout(
    session: HumanRelaySession,
    prompt: HumanRelayPrompt
  ): HumanRelayResponse {
    // 标记提示为超时
    prompt.markAsTimeout();
    
    // 创建超时响应
    const response = HumanRelayResponse.createTimeout(
      Date.now() - prompt.getCreatedAt().getMilliseconds(),
      prompt.getId()
    );
    
    // 更新会话状态
    session.timeout();
    session.addResponse(response);
    
    return response;
  }

  /**
   * 处理取消情况
   * 
   * @param session 会话
   * @param prompt 关联的提示
   * @returns 取消响应
   */
  public handleCancellation(
    session: HumanRelaySession,
    prompt?: HumanRelayPrompt
  ): HumanRelayResponse {
    // 标记提示为已取消（如果有）
    if (prompt) {
      prompt.markAsCancelled();
    }
    
    // 创建取消响应
    const response = HumanRelayResponse.createCancelled(
      Date.now(),
      prompt?.getId()
    );
    
    // 更新会话状态
    session.cancel();
    if (prompt) {
      session.addResponse(response);
    }
    
    return response;
  }

  /**
   * 处理错误情况
   * 
   * @param session 会话
   * @param errorMessage 错误信息
   * @param prompt 关联的提示
   * @returns 错误响应
   */
  public handleError(
    session: HumanRelaySession,
    errorMessage: string,
    prompt?: HumanRelayPrompt
  ): HumanRelayResponse {
    // 标记提示为错误（如果有）
    if (prompt) {
      prompt.markAsError();
    }
    
    // 创建错误响应
    const response = HumanRelayResponse.createError(
      errorMessage,
      Date.now(),
      prompt?.getId()
    );
    
    // 更新会话状态
    session.setError();
    if (prompt) {
      session.addResponse(response);
    }
    
    return response;
  }

  /**
   * 验证会话是否可以进行新的交互
   * 
   * @param session 会话
   * @returns 验证结果
   */
  public validateSessionForInteraction(session: HumanRelaySession): {
    isValid: boolean;
    reason?: string;
  } {
    // 检查会话状态
    if (!session.canAcceptInteraction()) {
      return {
        isValid: false,
        reason: `会话状态不允许新的交互: ${session.getStatus()}`
      };
    }
    
    // 检查会话是否超时
    if (session.isTimeout()) {
      return {
        isValid: false,
        reason: '会话已超时'
      };
    }
    
    // 检查是否有正在进行的交互
    const currentPrompt = session.getCurrentPrompt();
    if (currentPrompt && currentPrompt.isWaitingForResponse()) {
      return {
        isValid: false,
        reason: '已有正在进行的交互，请等待完成'
      };
    }
    
    return { isValid: true };
  }

  /**
   * 获取会话健康状态
   * 
   * @param session 会话
   * @returns 健康状态
   */
  public getSessionHealthStatus(session: HumanRelaySession): {
    status: 'healthy' | 'warning' | 'critical';
    issues: string[];
    recommendations: string[];
  } {
    const issues: string[] = [];
    const recommendations: string[] = [];
    
    // 检查会话状态
    if (session.getStatus() === HumanRelaySessionStatus.ERROR) {
      issues.push('会话处于错误状态');
      recommendations.push('检查错误日志并重启会话');
    }
    
    if (session.getStatus() === HumanRelaySessionStatus.TIMEOUT) {
      issues.push('会话已超时');
      recommendations.push('增加超时时间或检查用户可用性');
    }
    
    // 检查响应时间
    const stats = session.getStatistics();
    if (stats.averageResponseTime > 300000) { // 5分钟
      issues.push('平均响应时间过长');
      recommendations.push('考虑优化提示词或提供更好的用户指导');
    }
    
    // 检查成功率
    if (stats.successRate < 50) {
      issues.push('成功率过低');
      recommendations.push('检查用户交互流程和错误处理');
    }
    
    // 检查会话持续时间
    if (session.getDuration() > 3600) { // 1小时
      issues.push('会话持续时间过长');
      recommendations.push('考虑定期清理长时间运行的会话');
    }
    
    // 确定健康状态
    let status: 'healthy' | 'warning' | 'critical' = 'healthy';
    if (issues.length > 0) {
      status = issues.length > 2 ? 'critical' : 'warning';
    }
    
    return { status, issues, recommendations };
  }

  // 私有辅助方法

  /**
   * 生成会话名称
   */
  private generateSessionName(mode: HumanRelayMode): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const modeText = mode === HumanRelayMode.SINGLE ? '单轮' : '多轮';
    return `HumanRelay-${modeText}-${timestamp}`;
  }

  /**
   * 获取默认模板
   */
  private getDefaultTemplate(mode: HumanRelayMode): PromptTemplate {
    if (mode === HumanRelayMode.SINGLE) {
      return PromptTemplate.createSingleTurnDefault();
    } else {
      return PromptTemplate.createMultiTurnDefault();
    }
  }

  /**
   * 构建提示内容
   */
  private buildPromptContent(
    messages: ILLMMessage[],
    mode: HumanRelayMode,
    history?: ILLMMessage[]
  ): string {
    if (mode === HumanRelayMode.SINGLE) {
      // 单轮模式：合并所有消息
      return messages
        .map(msg => `${msg.role}: ${msg.content}`)
        .join('\n');
    } else {
      // 多轮模式：只使用最新消息作为增量提示
      const latestMessage = messages[messages.length - 1];
      if (!latestMessage) {
        return '';
      }
      return `${latestMessage.role}: ${latestMessage.content}`;
    }
  }

  /**
   * 估算token数量（简化实现）
   */
  private estimateTokens(text: string): number {
    // 简单的token估算，实际实现可能需要更精确的计算
    return Math.ceil(text.length / 4);
  }

  /**
   * 清理和格式化消息内容
   */
  private sanitizeMessageContent(content: string): string {
    return content
      .trim()
      .replace(/\s+/g, ' ')
      .replace(/[\r\n]+/g, '\n');
  }
}