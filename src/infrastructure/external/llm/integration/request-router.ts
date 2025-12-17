import { injectable, inject } from 'inversify';
import { ILLMWrapper } from '../../../../domain/llm/interfaces/llm-wrapper.interface';
import { ILLMWrapperManager } from '../../../../domain/llm/interfaces/wrapper-manager.interface';
import { LLMRequest } from '../../../../domain/llm/entities/llm-request';
import { LLMResponse } from '../../../../domain/llm/entities/llm-response';
import { EnhancedLLMClientFactory } from './enhanced-llm-client-factory';
import { ConfigManager } from '../../../common/config/config-manager.interface';
import { LLM_DI_IDENTIFIERS } from '../di-identifiers';

/**
 * 请求路由器
 * 
 * 统一处理LLM请求的路由，支持直接客户端调用、包装器调用和轮询池调用
 */
@injectable()
export class RequestRouter {
  constructor(
    @inject(LLM_DI_IDENTIFIERS.LLMWrapperManager) 
    private wrapperManager: ILLMWrapperManager,
    @inject(LLM_DI_IDENTIFIERS.LLMClientFactory) 
    private clientFactory: EnhancedLLMClientFactory,
    @inject(LLM_DI_IDENTIFIERS.ConfigManager) 
    private configManager: ConfigManager
  ) {}

  /**
   * 路由请求到合适的处理器
   * @param request LLM请求
   * @returns LLM响应
   */
  async routeRequest(request: LLMRequest): Promise<LLMResponse> {
    try {
      // 1. 检查是否有特定的包装器配置
      const wrapperName = request.metadata?.wrapperName;
      if (wrapperName) {
        return this.routeToWrapper(wrapperName, request);
      }

      // 2. 检查是否有轮询池配置
      const poolName = request.metadata?.poolName;
      if (poolName) {
        return this.routeToPool(poolName, request);
      }

      // 3. 检查是否有任务组配置
      const groupName = request.metadata?.groupName;
      if (groupName) {
        return this.routeToTaskGroup(groupName, request);
      }

      // 4. 检查是否有提供商和模型配置
      const provider = request.metadata?.provider;
      const model = request.metadata?.model;
      if (provider) {
        return this.routeToClient(provider, model, request);
      }

      // 5. 使用默认配置
      return this.routeToDefault(request);
    } catch (error) {
      // 如果所有路由都失败，尝试使用默认的回退策略
      return this.handleRoutingError(error, request);
    }
  }

  /**
   * 路由到特定包装器
   * @param wrapperName 包装器名称
   * @param request LLM请求
   * @returns LLM响应
   */
  private async routeToWrapper(wrapperName: string, request: LLMResponse): Promise<LLMResponse> {
    try {
      const wrapper = await this.wrapperManager.getWrapper(wrapperName);
      if (!wrapper) {
        throw new Error(`Wrapper not found: ${wrapperName}`);
      }
      return wrapper.generateResponse(request);
    } catch (error) {
      throw new Error(`Failed to route to wrapper ${wrapperName}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 路由到轮询池
   * @param poolName 轮询池名称
   * @param request LLM请求
   * @returns LLM响应
   */
  private async routeToPool(poolName: string, request: LLMRequest): Promise<LLMResponse> {
    try {
      const pool = await this.wrapperManager.getPool(poolName);
      if (!pool) {
        throw new Error(`Pool not found: ${poolName}`);
      }
      return pool.generateResponse(request);
    } catch (error) {
      throw new Error(`Failed to route to pool ${poolName}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 路由到任务组
   * @param groupName 任务组名称
   * @param request LLM请求
   * @returns LLM响应
   */
  private async routeToTaskGroup(groupName: string, request: LLMRequest): Promise<LLMResponse> {
    try {
      const taskGroup = await this.wrapperManager.getTaskGroup(groupName);
      if (!taskGroup) {
        throw new Error(`Task group not found: ${groupName}`);
      }
      return taskGroup.generateResponse(request);
    } catch (error) {
      throw new Error(`Failed to route to task group ${groupName}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 路由到特定客户端
   * @param provider 提供商名称
   * @param model 模型名称（可选）
   * @param request LLM请求
   * @returns LLM响应
   */
  private async routeToClient(provider: string, model?: string, request?: LLMRequest): Promise<LLMResponse> {
    try {
      const wrapper = this.clientFactory.createWrapper(provider, model);
      return wrapper.generateResponse(request!);
    } catch (error) {
      throw new Error(`Failed to route to client ${provider}${model ? `/${model}` : ''}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 路由到默认处理器
   * @param request LLM请求
   * @returns LLM响应
   */
  private async routeToDefault(request: LLMRequest): Promise<LLMResponse> {
    try {
      // 从配置中获取默认提供商和模型
      const defaultProvider = this.configManager.get('llm.default_provider', 'openai');
      const defaultModel = this.configManager.get('llm.default_model');
      
      return this.routeToClient(defaultProvider, defaultModel, request);
    } catch (error) {
      throw new Error(`Failed to route to default handler: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 处理路由错误
   * @param error 错误对象
   * @param request 原始请求
   * @returns LLM响应
   */
  private async handleRoutingError(error: any, request: LLMRequest): Promise<LLMResponse> {
    console.error('All routing attempts failed:', error);

    // 尝试使用Mock客户端作为最后的回退
    try {
      const mockWrapper = this.clientFactory.createWrapper('mock');
      return mockWrapper.generateResponse(request);
    } catch (mockError) {
      // 如果连Mock客户端都失败，返回错误响应
      throw new Error(`All routing attempts failed, including fallback: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 路由流式请求
   * @param request LLM请求
   * @returns 流式响应
   */
  async routeStreamRequest(request: LLMRequest): Promise<AsyncIterable<LLMResponse>> {
    try {
      // 1. 检查是否有特定的包装器配置
      const wrapperName = request.metadata?.wrapperName;
      if (wrapperName) {
        const wrapper = await this.wrapperManager.getWrapper(wrapperName);
        if (wrapper) {
          return wrapper.generateResponseStream(request);
        }
      }

      // 2. 检查是否有轮询池配置
      const poolName = request.metadata?.poolName;
      if (poolName) {
        const pool = await this.wrapperManager.getPool(poolName);
        if (pool) {
          return pool.generateResponseStream(request);
        }
      }

      // 3. 检查是否有任务组配置
      const groupName = request.metadata?.groupName;
      if (groupName) {
        const taskGroup = await this.wrapperManager.getTaskGroup(groupName);
        if (taskGroup) {
          return taskGroup.generateResponseStream(request);
        }
      }

      // 4. 检查是否有提供商和模型配置
      const provider = request.metadata?.provider;
      const model = request.metadata?.model;
      if (provider) {
        const wrapper = this.clientFactory.createWrapper(provider, model);
        return wrapper.generateResponseStream(request);
      }

      // 5. 使用默认配置
      const defaultProvider = this.configManager.get('llm.default_provider', 'openai');
      const defaultModel = this.configManager.get('llm.default_model');
      const defaultWrapper = this.clientFactory.createWrapper(defaultProvider, defaultModel);
      return defaultWrapper.generateResponseStream(request);
    } catch (error) {
      throw new Error(`Failed to route stream request: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 获取路由建议
   * @param request LLM请求
   * @returns 路由建议
   */
  async getRoutingSuggestion(request: LLMRequest): Promise<{
    recommendedRoute: string;
    alternatives: string[];
    reasoning: string;
  }> {
    const alternatives: string[] = [];
    let recommendedRoute = 'default';
    let reasoning = 'Using default routing strategy';

    // 分析请求特征，提供路由建议
    if (request.metadata?.urgency === 'high') {
      recommendedRoute = 'fast_pool';
      reasoning = 'High urgency request, routing to fast pool';
      alternatives.push('fast_group', 'openai-gpt4o-mini');
    }

    if (request.metadata?.complexity === 'high') {
      recommendedRoute = 'thinking_group';
      reasoning = 'High complexity request, routing to thinking group';
      alternatives.push('powerful_pool', 'openai-gpt5');
    }

    if (request.metadata?.costSensitive === true) {
      recommendedRoute = 'cost_effective_group';
      reasoning = 'Cost sensitive request, routing to cost effective group';
      alternatives.push('anthropic-claude-3-haiku', 'gemini-2.5-flash');
    }

    // 检查请求大小
    const estimatedTokens = this.estimateTokens(request);
    if (estimatedTokens > 100000) {
      recommendedRoute = 'high_context_pool';
      reasoning = 'Large context request, routing to high context pool';
      alternatives.push('anthropic-claude-3-opus', 'gemini-2.5-pro');
    }

    return {
      recommendedRoute,
      alternatives,
      reasoning
    };
  }

  /**
   * 估算请求的Token数量
   * @param request LLM请求
   * @returns 估算的Token数量
   */
  private estimateTokens(request: LLMRequest): number {
    let totalChars = 0;
    
    for (const message of request.messages) {
      totalChars += message.content.length;
      if (message.role) {
        totalChars += message.role.length;
      }
    }
    
    // 粗略估算：1个Token约等于4个字符
    return Math.ceil(totalChars / 4);
  }

  /**
   * 获取可用的路由选项
   * @returns 路由选项列表
   */
  async getAvailableRoutes(): Promise<{
    wrappers: string[];
    pools: string[];
    taskGroups: string[];
    providers: string[];
  }> {
    const wrappers = await this.wrapperManager.getWrapperNames();
    const pools = await this.wrapperManager.getPoolNames();
    const taskGroups = await this.wrapperManager.getTaskGroupNames();
    const providers = this.clientFactory.getSupportedProviders();

    return {
      wrappers,
      pools,
      taskGroups,
      providers
    };
  }

  /**
   * 验证路由配置
   * @param request LLM请求
   * @returns 验证结果
   */
  async validateRouting(request: LLMRequest): Promise<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // 检查包装器配置
    if (request.metadata?.wrapperName) {
      const wrapper = await this.wrapperManager.getWrapper(request.metadata.wrapperName);
      if (!wrapper) {
        errors.push(`Wrapper not found: ${request.metadata.wrapperName}`);
      }
    }

    // 检查轮询池配置
    if (request.metadata?.poolName) {
      const pool = await this.wrapperManager.getPool(request.metadata.poolName);
      if (!pool) {
        errors.push(`Pool not found: ${request.metadata.poolName}`);
      }
    }

    // 检查任务组配置
    if (request.metadata?.groupName) {
      const taskGroup = await this.wrapperManager.getTaskGroup(request.metadata.groupName);
      if (!taskGroup) {
        errors.push(`Task group not found: ${request.metadata.groupName}`);
      }
    }

    // 检查提供商配置
    if (request.metadata?.provider) {
      const supportedProviders = this.clientFactory.getSupportedProviders();
      if (!supportedProviders.includes(request.metadata.provider.toLowerCase())) {
        errors.push(`Unsupported provider: ${request.metadata.provider}`);
      }
    }

    // 检查请求内容
    if (!request.messages || request.messages.length === 0) {
      errors.push('Request must contain at least one message');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * 获取路由统计信息
   * @returns 路由统计
   */
  async getRoutingStatistics(): Promise<{
    totalRequests: number;
    successfulRoutes: number;
    failedRoutes: number;
    routeDistribution: Record<string, number>;
    averageLatency: number;
  }> {
    // 这里应该实现实际的统计逻辑
    // 目前返回模拟数据
    return {
      totalRequests: 1000,
      successfulRoutes: 950,
      failedRoutes: 50,
      routeDistribution: {
        'wrapper': 300,
        'pool': 400,
        'taskGroup': 200,
        'client': 80,
        'default': 20
      },
      averageLatency: 150
    };
  }
}