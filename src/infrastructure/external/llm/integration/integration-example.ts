import { injectable, inject } from 'inversify';
import { LLMRequest } from '../../../../domain/llm/entities/llm-request';
import { LLMResponse } from '../../../../domain/llm/entities/llm-response';
import { LLM_DI_IDENTIFIERS } from '../di-identifiers';
import { RequestRouter } from './request-router';
import { EnhancedLLMClientFactory } from './enhanced-llm-client-factory';
import { LLMWrapperManager } from '../../../../domain/llm/managers/wrapper-manager';
import { LLMOrchestrationService } from '../../../../application/llm/services/llm-orchestration.service';

/**
 * 集成示例
 * 
 * 展示如何使用新的轮询池和任务组系统与现有LLM基础设施集成
 */
@injectable()
export class IntegrationExample {
  constructor(
    @inject(LLM_DI_IDENTIFIERS.RequestRouter) 
    private requestRouter: RequestRouter,
    @inject(LLM_DI_IDENTIFIERS.EnhancedLLMClientFactory) 
    private clientFactory: EnhancedLLMClientFactory,
    @inject(LLM_DI_IDENTIFIERS.LLMWrapperManager) 
    private wrapperManager: LLMWrapperManager,
    @inject(LLM_DI_IDENTIFIERS.LLMOrchestrationService) 
    private orchestrationService: LLMOrchestrationService
  ) {}

  /**
   * 示例1：使用轮询池处理请求
   */
  async exampleWithPollingPool(): Promise<LLMResponse> {
    const request = LLMRequest.create({
      messages: [
        {
          role: 'user',
          content: '请帮我分析这个问题的解决方案'
        }
      ],
      metadata: {
        poolName: 'fast_pool',
        urgency: 'high'
      }
    });

    return await this.requestRouter.routeRequest(request);
  }

  /**
   * 示例2：使用任务组处理请求
   */
  async exampleWithTaskGroup(): Promise<LLMResponse> {
    const request = LLMRequest.create({
      messages: [
        {
          role: 'user',
          content: '请帮我进行深度思考和分析'
        }
      ],
      metadata: {
        groupName: 'thinking_group',
        complexity: 'high'
      }
    });

    return await this.requestRouter.routeRequest(request);
  }

  /**
   * 示例3：使用特定包装器处理请求
   */
  async exampleWithSpecificWrapper(): Promise<LLMResponse> {
    const request = LLMRequest.create({
      messages: [
        {
          role: 'user',
          content: '请使用OpenAI GPT-4处理这个请求'
        }
      ],
      metadata: {
        wrapperName: 'openai-gpt4-adapter',
        provider: 'openai',
        model: 'gpt-4'
      }
    });

    return await this.requestRouter.routeRequest(request);
  }

  /**
   * 示例4：使用默认路由处理请求
   */
  async exampleWithDefaultRouting(): Promise<LLMResponse> {
    const request = LLMRequest.create({
      messages: [
        {
          role: 'user',
          content: '这是一个普通的请求'
        }
      ]
    });

    return await this.requestRouter.routeRequest(request);
  }

  /**
   * 示例5：批量处理多个请求
   */
  async exampleWithBatchProcessing(): Promise<LLMResponse[]> {
    const requests = [
      LLMRequest.create({
        messages: [{ role: 'user', content: '请求1' }],
        metadata: { poolName: 'fast_pool' }
      }),
      LLMRequest.create({
        messages: [{ role: 'user', content: '请求2' }],
        metadata: { groupName: 'thinking_group' }
      }),
      LLMRequest.create({
        messages: [{ role: 'user', content: '请求3' }],
        metadata: { provider: 'openai', model: 'gpt-4o' }
      })
    ];

    const results: LLMResponse[] = [];
    for (const request of requests) {
      try {
        const response = await this.requestRouter.routeRequest(request);
        results.push(response);
      } catch (error) {
        console.error(`处理请求失败:`, error);
      }
    }

    return results;
  }

  /**
   * 示例6：流式响应处理
   */
  async exampleWithStreaming(): Promise<void> {
    const request = LLMRequest.create({
      messages: [
        {
          role: 'user',
          content: '请以流式方式回答这个问题'
        }
      ],
      metadata: {
        poolName: 'fast_pool'
      }
    });

    try {
      const stream = await this.requestRouter.routeStreamRequest(request);
      
      for await (const chunk of stream) {
        console.log('收到流式响应:', chunk);
      }
    } catch (error) {
      console.error('流式请求失败:', error);
    }
  }

  /**
   * 示例7：获取路由建议
   */
  async exampleWithRoutingSuggestion(): Promise<void> {
    const request = LLMRequest.create({
      messages: [
        {
          role: 'user',
          content: '这是一个复杂的分析任务'
        }
      ],
      metadata: {
        complexity: 'high',
        costSensitive: true
      }
    });

    const suggestion = await this.requestRouter.getRoutingSuggestion(request);
    console.log('路由建议:', suggestion);
  }

  /**
   * 示例8：验证路由配置
   */
  async exampleWithRoutingValidation(): Promise<void> {
    const request = LLMRequest.create({
      messages: [
        {
          role: 'user',
          content: '测试请求'
        }
      ],
      metadata: {
        poolName: 'fast_pool',
        wrapperName: 'nonexistent_wrapper'
      }
    });

    const validation = await this.requestRouter.validateRouting(request);
    console.log('路由验证结果:', validation);
  }

  /**
   * 示例9：获取可用路由选项
   */
  async exampleWithAvailableRoutes(): Promise<void> {
    const routes = await this.requestRouter.getAvailableRoutes();
    console.log('可用路由选项:', routes);
  }

  /**
   * 示例10：使用编排服务
   */
  async exampleWithOrchestrationService(): Promise<LLMResponse> {
    const request = LLMRequest.create({
      messages: [
        {
          role: 'user',
          content: '使用编排服务处理这个请求'
        }
      ],
      metadata: {
        orchestration: true,
        optimizeFor: 'performance'
      }
    });

    return await this.orchestrationService.processRequest(request);
  }

  /**
   * 示例11：创建自定义包装器
   */
  async exampleWithCustomWrapper(): Promise<void> {
    // 创建自定义包装器配置
    const wrapperConfig = {
      provider: 'openai',
      model: 'gpt-4o',
      instanceId: 'custom-gpt4o-adapter',
      weight: 1.5,
      priority: 1
    };

    // 使用增强工厂创建包装器
    const wrapper = this.clientFactory.createWeightedWrapper(
      wrapperConfig.provider,
      wrapperConfig.model,
      wrapperConfig.weight,
      wrapperConfig.instanceId
    );

    console.log('自定义包装器创建成功:', wrapper.getId());
  }

  /**
   * 示例12：健康检查和监控
   */
  async exampleWithHealthCheck(): Promise<void> {
    // 检查所有包装器的健康状态
    const wrapperNames = await this.wrapperManager.getWrapperNames();
    
    for (const wrapperName of wrapperNames) {
      try {
        const wrapper = await this.wrapperManager.getWrapper(wrapperName);
        const health = await wrapper.healthCheck();
        console.log(`包装器 ${wrapperName} 健康状态:`, health);
      } catch (error) {
        console.error(`检查包装器 ${wrapperName} 健康状态失败:`, error);
      }
    }

    // 获取路由统计信息
    const stats = await this.requestRouter.getRoutingStatistics();
    console.log('路由统计信息:', stats);
  }

  /**
   * 示例13：配置热重载
   */
  async exampleWithConfigReload(): Promise<void> {
    // 模拟配置变更
    console.log('配置变更检测，触发热重载...');
    
    // 在实际应用中，这里会监听配置文件变化
    // 然后调用配置管理器的重载方法
    
    console.log('配置热重载完成');
  }

  /**
   * 示例14：错误处理和降级
   */
  async exampleWithErrorHandling(): Promise<LLMResponse> {
    const request = LLMRequest.create({
      messages: [
        {
          role: 'user',
          content: '这个请求可能会失败'
        }
      ],
      metadata: {
        poolName: 'fast_pool',
        enableFallback: true
      }
    });

    try {
      return await this.requestRouter.routeRequest(request);
    } catch (error) {
      console.error('请求失败，尝试降级处理:', error);
      
      // 降级到默认路由
      const fallbackRequest = LLMRequest.create({
        messages: request.messages,
        metadata: {
          provider: 'mock'  // 使用Mock客户端作为最后的回退
        }
      });

      return await this.requestRouter.routeRequest(fallbackRequest);
    }
  }

  /**
   * 运行所有示例
   */
  async runAllExamples(): Promise<void> {
    console.log('开始运行集成示例...\n');

    try {
      // 示例1：轮询池
      console.log('=== 示例1：使用轮询池处理请求 ===');
      const result1 = await this.exampleWithPollingPool();
      console.log('轮询池请求结果:', result1);

      // 示例2：任务组
      console.log('\n=== 示例2：使用任务组处理请求 ===');
      const result2 = await this.exampleWithTaskGroup();
      console.log('任务组请求结果:', result2);

      // 示例7：路由建议
      console.log('\n=== 示例7：获取路由建议 ===');
      await this.exampleWithRoutingSuggestion();

      // 示例8：路由验证
      console.log('\n=== 示例8：验证路由配置 ===');
      await this.exampleWithRoutingValidation();

      // 示例9：可用路由
      console.log('\n=== 示例9：获取可用路由选项 ===');
      await this.exampleWithAvailableRoutes();

      // 示例12：健康检查
      console.log('\n=== 示例12：健康检查和监控 ===');
      await this.exampleWithHealthCheck();

      console.log('\n所有示例运行完成！');
    } catch (error) {
      console.error('运行示例时发生错误:', error);
    }
  }
}