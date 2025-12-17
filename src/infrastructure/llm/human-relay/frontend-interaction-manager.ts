/**
 * 前端交互管理器
 * 
 * 协调不同前端服务的交互管理器
 * 注意：这里只提供接口框架，具体的前端实现被跳过
 */

import { injectable, inject } from 'inversify';
import { 
  IHumanRelayInteractionService,
  InteractionStatus,
  FrontendType,
  InteractionStatistics
} from '../../../domain/llm/interfaces/human-relay-interaction.interface';
import { 
  HumanRelayPrompt,
  HumanRelayResponse
} from '../../../domain/llm/entities';
import { 
  ITUIInteractionService,
  IWebInteractionService,
  IAPIInteractionService
} from './interfaces/frontend-services.interface';
import { LLM_DI_IDENTIFIERS } from '../../external/llm/di-identifiers';

/**
 * 前端交互管理器
 */
@injectable()
export class FrontendInteractionManager implements IHumanRelayInteractionService {
  private currentInteraction: Promise<HumanRelayResponse> | null = null;
  private statistics: InteractionStatistics = {
    totalInteractions: 0,
    successfulInteractions: 0,
    timeoutCount: 0,
    errorCount: 0,
    averageResponseTime: 0,
    averageUserInteractionTime: 0,
    successRate: 0
  };

  constructor(
    @inject(LLM_DI_IDENTIFIERS.TUIInteractionService) 
    private tuiService: ITUIInteractionService,
    @inject(LLM_DI_IDENTIFIERS.WebInteractionService) 
    private webService: IWebInteractionService,
    @inject(LLM_DI_IDENTIFIERS.APIInteractionService) 
    private apiService: IAPIInteractionService,
    @inject(LLM_DI_IDENTIFIERS.ConfigManager) 
    private configManager: any
  ) {}

  /**
   * 发送提示给用户并等待响应
   */
  public async sendPromptAndWaitForResponse(
    prompt: HumanRelayPrompt,
    timeout: number
  ): Promise<HumanRelayResponse> {
    // 如果已有交互在进行中，等待完成
    if (this.currentInteraction) {
      await this.currentInteraction;
    }

    // 获取当前前端服务
    const frontendService = this.getCurrentFrontendService();
    
    // 创建新的交互
    this.currentInteraction = this.executeInteraction(
      frontendService,
      prompt,
      timeout
    );

    try {
      const response = await this.currentInteraction;
      this.updateStatistics(response);
      return response;
    } finally {
      this.currentInteraction = null;
    }
  }

  /**
   * 检查用户是否可用
   */
  public async isUserAvailable(): Promise<boolean> {
    try {
      const frontendService = this.getCurrentFrontendService();
      return await frontendService.isUserAvailable();
    } catch (error) {
      console.error('检查用户可用性时出错:', error);
      return false;
    }
  }

  /**
   * 获取交互状态
   */
  public async getInteractionStatus(): Promise<InteractionStatus> {
    try {
      const frontendService = this.getCurrentFrontendService();
      return await frontendService.getStatus();
    } catch (error) {
      console.error('获取交互状态时出错:', error);
      return InteractionStatus.UNAVAILABLE;
    }
  }

  /**
   * 取消当前交互
   */
  public async cancelCurrentInteraction(): Promise<boolean> {
    try {
      if (this.currentInteraction) {
        const frontendService = this.getCurrentFrontendService();
        const cancelled = await frontendService.cancel();
        this.currentInteraction = null;
        return cancelled;
      }
      return true;
    } catch (error) {
      console.error('取消交互时出错:', error);
      return false;
    }
  }

  /**
   * 获取前端类型
   */
  public getFrontendType(): FrontendType {
    const config = this.configManager.get('humanRelay.frontend', {});
    return config.type || FrontendType.TUI;
  }

  /**
   * 获取交互统计信息
   */
  public async getInteractionStatistics(): Promise<InteractionStatistics> {
    return { ...this.statistics };
  }

  /**
   * 重置统计信息
   */
  public async resetStatistics(): Promise<boolean> {
    this.statistics = {
      totalInteractions: 0,
      successfulInteractions: 0,
      timeoutCount: 0,
      errorCount: 0,
      averageResponseTime: 0,
      averageUserInteractionTime: 0,
      successRate: 0
    };
    return true;
  }

  /**
   * 健康检查
   */
  public async healthCheck(): Promise<{
    status: 'healthy' | 'unhealthy' | 'degraded';
    message?: string;
    lastChecked: Date;
  }> {
    try {
      const isAvailable = await this.isUserAvailable();
      const status = await this.getInteractionStatus();
      
      let healthStatus: 'healthy' | 'unhealthy' | 'degraded';
      let message: string | undefined;

      if (isAvailable && status === InteractionStatus.AVAILABLE) {
        healthStatus = 'healthy';
        message = '前端交互服务正常';
      } else if (status === InteractionStatus.BUSY) {
        healthStatus = 'degraded';
        message = '前端交互服务忙碌';
      } else {
        healthStatus = 'unhealthy';
        message = '前端交互服务不可用';
      }

      return {
        status: healthStatus,
        message,
        lastChecked: new Date()
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        message: error instanceof Error ? error.message : String(error),
        lastChecked: new Date()
      };
    }
  }

  // 私有方法

  /**
   * 获取当前前端服务
   */
  private getCurrentFrontendService(): ITUIInteractionService | IWebInteractionService | IAPIInteractionService {
    const frontendType = this.getFrontendType();
    
    switch (frontendType) {
      case FrontendType.TUI:
        return this.tuiService;
      case FrontendType.WEB:
        return this.webService;
      case FrontendType.API:
        return this.apiService;
      default:
        throw new Error(`不支持的前端类型: ${frontendType}`);
    }
  }

  /**
   * 执行交互
   */
  private async executeInteraction(
    frontendService: ITUIInteractionService | IWebInteractionService | IAPIInteractionService,
    prompt: HumanRelayPrompt,
    timeout: number
  ): Promise<HumanRelayResponse> {
    const startTime = Date.now();
    
    try {
      // 设置超时
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('交互超时')), timeout * 1000);
      });

      // 执行交互
      const interactionPromise = frontendService.sendPrompt(prompt);
      
      // 等待交互完成或超时
      const responseContent = await Promise.race([interactionPromise, timeoutPromise]);
      
      const responseTime = Date.now() - startTime;
      
      return HumanRelayResponse.createNormal(
        responseContent,
        responseTime,
        responseTime * 0.8, // 估算用户交互时间
        prompt.getId(),
        {
          frontendType: this.getFrontendType(),
          promptId: prompt.getId().getValue(),
          timestamp: new Date()
        }
      );
    } catch (error) {
      const responseTime = Date.now() - startTime;
      
      if (error instanceof Error && error.message === '交互超时') {
        return HumanRelayResponse.createTimeout(responseTime, prompt.getId());
      }
      
      return HumanRelayResponse.createError(
        error instanceof Error ? error.message : String(error),
        responseTime,
        prompt.getId()
      );
    }
  }

  /**
   * 更新统计信息
   */
  private updateStatistics(response: HumanRelayResponse): void {
    this.statistics.totalInteractions++;
    
    if (response.isNormal()) {
      this.statistics.successfulInteractions++;
    } else if (response.isTimeout()) {
      this.statistics.timeoutCount++;
    } else {
      this.statistics.errorCount++;
    }
    
    // 更新平均响应时间
    const totalResponseTime = this.statistics.averageResponseTime * (this.statistics.totalInteractions - 1) + response.getResponseTime();
    this.statistics.averageResponseTime = totalResponseTime / this.statistics.totalInteractions;
    
    // 更新平均用户交互时间
    const totalUserInteractionTime = this.statistics.averageUserInteractionTime * (this.statistics.totalInteractions - 1) + response.getUserInteractionTime();
    this.statistics.averageUserInteractionTime = totalUserInteractionTime / this.statistics.totalInteractions;
    
    // 更新成功率
    this.statistics.successRate = (this.statistics.successfulInteractions / this.statistics.totalInteractions) * 100;
  }
}