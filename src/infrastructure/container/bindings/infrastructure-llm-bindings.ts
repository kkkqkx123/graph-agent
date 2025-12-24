/**
 * LLM模块服务绑定
 */

import { ServiceBindings } from '../container';
import { IContainer, ContainerConfiguration, ServiceLifetime } from '../container';
import { ILogger } from '../../../domain/common/types';

// LLM 客户端
import { TokenBucketLimiter } from '../../llm/rate-limiters/token-bucket-limiter';
import { TokenCalculator } from '../../llm/token-calculators/token-calculator';
import { FeatureRegistry } from '../../llm/features/feature-registry';
import { OpenAIChatClient } from '../../llm/clients/openai-chat-client';
import { OpenAIResponseClient } from '../../llm/clients/openai-response-client';
import { AnthropicClient } from '../../llm/clients/anthropic-client';
import { GeminiClient } from '../../llm/clients/gemini-client';
import { GeminiOpenAIClient } from '../../llm/clients/gemini-openai-client';
import { MockClient } from '../../llm/clients/mock-client';
import { HumanRelayClient } from '../../llm/clients/human-relay-client';

// 工厂类
import { LLMClientFactory } from '../../llm/clients/llm-client-factory';
import { ConverterFactory } from '../../llm/converters/converter-factory';
import { EndpointStrategyFactory } from '../../llm/endpoint-strategies/endpoint-strategy-factory';
import { FeatureFactory } from '../../llm/features/feature-factory';
import { ParameterMapperFactory } from '../../llm/parameter-mappers/parameter-mapper-factory';
import { LLMWrapperFactory } from '../../llm/wrappers/wrapper-factory';

// 管理器
import { PollingPoolManager } from '../../llm/managers/pool-manager';
import { TaskGroupManager } from '../../llm/managers/task-group-manager';

// 配置加载器
import { PoolConfigLoader } from '../../config/loading/loaders/pool-config-loader';
import { TaskGroupConfigLoader } from '../../config/loading/loaders/task-group-config-loader';

// HumanRelay 相关
import { FrontendInteractionManager } from '../../llm/human-relay/frontend-interaction-manager';
import { HumanRelayConfigLoader } from '../../llm/human-relay/config/human-relay-config-loader';
import { TUIInteractionService } from '../../llm/human-relay/services/tui-interaction-service';
import { WebInteractionService } from '../../llm/human-relay/services/web-interaction-service';
import { APIInteractionService } from '../../llm/human-relay/services/api-interaction-service';

/**
 * 基础设施层LLM服务绑定
 */
export class InfrastructureLLMServiceBindings extends ServiceBindings {
  registerServices(container: IContainer, config: ContainerConfiguration): void {
    const logger = container.get<ILogger>('ILogger');

    // 注册基础设施组件
    this.registerInfrastructure(container, config);

    // 注册客户端
    this.registerClients(container, config);

    // 注册工厂类
    this.registerFactories(container, config);

    // 注册管理器
    this.registerManagers(container, config);

    // 注册配置加载器
    this.registerConfigLoaders(container, config);

    // 注册HumanRelay相关服务
    this.registerHumanRelayServices(container, config);
  }

  /**
   * 注册基础设施组件
   */
  private registerInfrastructure(container: IContainer, config: ContainerConfiguration): void {
    // 速率限制器
    container.registerFactory(
      'TokenBucketLimiter',
      // TODO: 修复依赖注入问题
      // () => new TokenBucketLimiter(),
      () => null as any,
      { lifetime: ServiceLifetime.SINGLETON }
    );

    // Token计算器
    container.registerFactory(
      'TokenCalculator',
      () => new TokenCalculator(),
      { lifetime: ServiceLifetime.SINGLETON }
    );

    // 功能注册表
    container.registerFactory(
      'FeatureRegistry',
      () => new FeatureRegistry(),
      { lifetime: ServiceLifetime.SINGLETON }
    );
  }

  /**
   * 注册客户端
   */
  private registerClients(container: IContainer, config: ContainerConfiguration): void {
    const logger = container.get<ILogger>('ILogger');

    // OpenAI Chat客户端
    container.registerFactory(
      'OpenAIChatClient',
      // TODO: 修复依赖注入问题
      // () => new OpenAIChatClient(logger),
      () => null as any,
      { lifetime: ServiceLifetime.SINGLETON }
    );

    // OpenAI Response客户端
    container.registerFactory(
      'OpenAIResponseClient',
      // TODO: 修复依赖注入问题
      // () => new OpenAIResponseClient(logger),
      () => null as any,
      { lifetime: ServiceLifetime.SINGLETON }
    );

    // Anthropic客户端
    container.registerFactory(
      'AnthropicClient',
      // TODO: 修复依赖注入问题
      // () => new AnthropicClient(logger),
      () => null as any,
      { lifetime: ServiceLifetime.SINGLETON }
    );

    // Gemini客户端
    container.registerFactory(
      'GeminiClient',
      // TODO: 修复依赖注入问题
      // () => new GeminiClient(logger),
      () => null as any,
      { lifetime: ServiceLifetime.SINGLETON }
    );

    // Gemini OpenAI兼容客户端
    container.registerFactory(
      'GeminiOpenAIClient',
      // TODO: 修复依赖注入问题
      // () => new GeminiOpenAIClient(logger),
      () => null as any,
      { lifetime: ServiceLifetime.SINGLETON }
    );

    // Mock客户端
    container.registerFactory(
      'MockClient',
      // TODO: 修复依赖注入问题
      // () => new MockClient(logger),
      () => null as any,
      { lifetime: ServiceLifetime.SINGLETON }
    );

    // HumanRelay客户端
    container.registerFactory(
      'HumanRelayClient',
      // TODO: 修复依赖注入问题
      // () => new HumanRelayClient(logger),
      () => null as any,
      { lifetime: ServiceLifetime.SINGLETON }
    );
  }

  /**
   * 注册工厂类
   */
  private registerFactories(container: IContainer, config: ContainerConfiguration): void {
    // LLM客户端工厂
    container.registerFactory(
      'LLMClientFactory',
      // TODO: 修复依赖注入问题
      // () => new LLMClientFactory(),
      () => null as any,
      { lifetime: ServiceLifetime.SINGLETON }
    );

    // 转换器工厂
    container.registerFactory(
      'ConverterFactory',
      () => ConverterFactory.getInstance(),
      { lifetime: ServiceLifetime.SINGLETON }
    );

    // 端点策略工厂
    container.registerFactory(
      'EndpointStrategyFactory',
      () => new EndpointStrategyFactory(),
      { lifetime: ServiceLifetime.SINGLETON }
    );

    // 功能工厂
    container.registerFactory(
      'FeatureFactory',
      () => new FeatureFactory(),
      { lifetime: ServiceLifetime.SINGLETON }
    );

    // 参数映射器工厂
    container.registerFactory(
      'ParameterMapperFactory',
      () => new ParameterMapperFactory(),
      { lifetime: ServiceLifetime.SINGLETON }
    );

    // LLM包装器工厂
    container.registerFactory(
      'LLMWrapperFactory',
      // TODO: 修复依赖注入问题
      // () => new LLMWrapperFactory(),
      () => null as any,
      { lifetime: ServiceLifetime.SINGLETON }
    );
  }

  /**
   * 注册管理器
   */
  private registerManagers(container: IContainer, config: ContainerConfiguration): void {
    const logger = container.get<ILogger>('ILogger');

    // 任务组管理器
    container.registerFactory(
      'TaskGroupManager',
      // TODO: 修复依赖注入问题
      // () => new TaskGroupManager(logger),
      () => null as any,
      { lifetime: ServiceLifetime.SINGLETON }
    );

    // 轮询池管理器
    container.registerFactory(
      'PollingPoolManager',
      // TODO: 修复依赖注入问题
      // () => new PollingPoolManager(logger),
      () => null as any,
      { lifetime: ServiceLifetime.SINGLETON }
    );
  }

  /**
   * 注册配置加载器
   */
  private registerConfigLoaders(container: IContainer, config: ContainerConfiguration): void {
    const logger = container.get<ILogger>('ILogger');

    // 轮询池配置加载器
    container.registerFactory(
      'PoolConfigLoader',
      () => new PoolConfigLoader(logger),
      { lifetime: ServiceLifetime.SINGLETON }
    );

    // 任务组配置加载器
    container.registerFactory(
      'TaskGroupConfigLoader',
      () => new TaskGroupConfigLoader(logger),
      { lifetime: ServiceLifetime.SINGLETON }
    );
  }

  /**
   * 注册HumanRelay相关服务
   */
  private registerHumanRelayServices(container: IContainer, config: ContainerConfiguration): void {
    const logger = container.get<ILogger>('ILogger');

    // HumanRelay配置加载器
    container.registerFactory(
      'HumanRelayConfigLoader',
      // TODO: 修复依赖注入问题
      // () => new HumanRelayConfigLoader(),
      () => null as any,
      { lifetime: ServiceLifetime.SINGLETON }
    );

    // 前端交互服务
    container.registerFactory(
      'TUIInteractionService',
      () => new TUIInteractionService(),
      { lifetime: ServiceLifetime.SINGLETON }
    );

    container.registerFactory(
      'WebInteractionService',
      () => new WebInteractionService(),
      { lifetime: ServiceLifetime.SINGLETON }
    );

    container.registerFactory(
      'APIInteractionService',
      () => new APIInteractionService(),
      { lifetime: ServiceLifetime.SINGLETON }
    );

    // 前端交互管理器
    container.registerFactory(
      'FrontendInteractionManager',
      // TODO: 修复依赖注入问题
      // () => new FrontendInteractionManager(),
      () => null as any,
      { lifetime: ServiceLifetime.SINGLETON }
    );
  }
}