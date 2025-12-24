import { Container } from 'inversify';
import { LLM_DI_IDENTIFIERS, ServiceType, DEPENDENCY_GRAPH } from './di-identifiers';
import { ConfigManager } from '../config/config-manager';
import { HttpClient } from '../common/http/http-client';
import { RetryHandler } from '../common/http/retry-handler';
import { CircuitBreaker } from '../common/http/circuit-breaker';
import { RateLimiter } from '../common/http/rate-limiter';

// LLM 客户端
import { TokenBucketLimiter } from './rate-limiters/token-bucket-limiter';
import { TokenCalculator } from './token-calculators/token-calculator';
import { FeatureRegistry } from './features/feature-registry';
import { OpenAIChatClient } from './clients/openai-chat-client';
import { OpenAIResponseClient } from './clients/openai-response-client';
import { AnthropicClient } from './clients/anthropic-client';
import { GeminiClient } from './clients/gemini-client';
import { GeminiOpenAIClient } from './clients/gemini-openai-client';
import { MockClient } from './clients/mock-client';
import { HumanRelayClient } from './clients/human-relay-client';

// 工厂类
import { LLMClientFactory } from './clients/llm-client-factory';
import { ConverterFactory } from './converters/converter-factory';
import { EndpointStrategyFactory } from './endpoint-strategies/endpoint-strategy-factory';
import { FeatureFactory } from './features/feature-factory';
import { ParameterMapperFactory } from './parameter-mappers/parameter-mapper-factory';
import { LLMWrapperFactory } from './wrappers/wrapper-factory';

// 管理器
import { PollingPoolManager } from './managers/pool-manager';
import { TaskGroupManager } from './managers/task-group-manager';

// 配置加载器
import { PoolConfigLoader } from '../config/loading/loaders/pool-config-loader';
import { TaskGroupConfigLoader } from '../config/loading/loaders/task-group-config-loader';

/**
 * 验证结果接口
 */
interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

/**
 * LLM模块依赖注入容器配置
 *
 * 负责注册所有LLM相关的服务和组件到依赖注入容器
 * 提供类型安全的依赖注入和依赖关系验证
 */

export class LLMDIContainer {
  private container: Container;

  constructor() {
    this.container = new Container();
    this.configure();
  }

  /**
   * 配置依赖注入容器
   */
  private configure(): void {
    // 注册基础设施组件
    this.registerInfrastructure();

    // 注册客户端
    this.registerClients();

    // 注册工厂类
    this.registerFactories();

    // 注册管理器
    this.registerManagers();

    // 注册配置加载器
    this.registerConfigLoaders();

    // HumanRelay相关服务已简化，不再需要额外注册
  }

  /**
   * 注册基础设施组件
   */
  private registerInfrastructure(): void {
    // 配置管理器
    this.container.bind<ConfigManager>(LLM_DI_IDENTIFIERS.ConfigManager)
      .to(ConfigManager)
      .inSingletonScope();

    // HTTP相关依赖
    this.container.bind<RetryHandler>('RetryHandler')
      .to(RetryHandler)
      .inSingletonScope();

    this.container.bind<CircuitBreaker>('CircuitBreaker')
      .to(CircuitBreaker)
      .inSingletonScope();

    this.container.bind<RateLimiter>('RateLimiter')
      .to(RateLimiter)
      .inSingletonScope();

    // 为HttpClient提供ConfigManager
    this.container.bind<ConfigManager>('ConfigManager')
      .to(ConfigManager)
      .inSingletonScope();

    // HTTP客户端
    this.container.bind<HttpClient>(LLM_DI_IDENTIFIERS.HttpClient)
      .to(HttpClient)
      .inSingletonScope();

    // 速率限制器
    this.container.bind<TokenBucketLimiter>(LLM_DI_IDENTIFIERS.TokenBucketLimiter)
      .to(TokenBucketLimiter)
      .inSingletonScope();

    // Token计算器
    this.container.bind<TokenCalculator>(LLM_DI_IDENTIFIERS.TokenCalculator)
      .to(TokenCalculator)
      .inSingletonScope();

    // 功能注册表
    this.container.bind<FeatureRegistry>(LLM_DI_IDENTIFIERS.FeatureRegistry)
      .to(FeatureRegistry)
      .inSingletonScope();
  }

  /**
   * 注册客户端
   */
  private registerClients(): void {
    // OpenAI Chat客户端
    this.container.bind<OpenAIChatClient>(LLM_DI_IDENTIFIERS.OpenAIChatClient)
      .to(OpenAIChatClient)
      .inSingletonScope();

    // OpenAI Response客户端
    this.container.bind<OpenAIResponseClient>(LLM_DI_IDENTIFIERS.OpenAIResponseClient)
      .to(OpenAIResponseClient)
      .inSingletonScope();

    // Anthropic客户端
    this.container.bind<AnthropicClient>(LLM_DI_IDENTIFIERS.AnthropicClient)
      .to(AnthropicClient)
      .inSingletonScope();

    // Gemini客户端
    this.container.bind<GeminiClient>(LLM_DI_IDENTIFIERS.GeminiClient)
      .to(GeminiClient)
      .inSingletonScope();

    // Gemini OpenAI兼容客户端
    this.container.bind<GeminiOpenAIClient>(LLM_DI_IDENTIFIERS.GeminiOpenAIClient)
      .to(GeminiOpenAIClient)
      .inSingletonScope();

    // Mock客户端
    this.container.bind<MockClient>(LLM_DI_IDENTIFIERS.MockClient)
      .to(MockClient)
      .inSingletonScope();

    // HumanRelay客户端
    this.container.bind<HumanRelayClient>(LLM_DI_IDENTIFIERS.HumanRelayClient)
      .to(HumanRelayClient)
      .inSingletonScope();
  }

  /**
   * 注册工厂类
   */
  private registerFactories(): void {
    // LLM客户端工厂
    this.container.bind<LLMClientFactory>(LLM_DI_IDENTIFIERS.LLMClientFactory)
      .to(LLMClientFactory)
      .inSingletonScope();

    // 转换器工厂
    this.container.bind<ConverterFactory>(LLM_DI_IDENTIFIERS.ConverterFactory)
      .toConstantValue(ConverterFactory.getInstance());

    // 端点策略工厂
    this.container.bind<EndpointStrategyFactory>(LLM_DI_IDENTIFIERS.EndpointStrategyFactory)
      .to(EndpointStrategyFactory)
      .inSingletonScope();

    // 功能工厂
    this.container.bind<FeatureFactory>(LLM_DI_IDENTIFIERS.FeatureFactory)
      .to(FeatureFactory)
      .inSingletonScope();

    // 参数映射器工厂
    this.container.bind<ParameterMapperFactory>(LLM_DI_IDENTIFIERS.ParameterMapperFactory)
      .to(ParameterMapperFactory)
      .inSingletonScope();

    // LLM包装器工厂
    this.container.bind<LLMWrapperFactory>(LLM_DI_IDENTIFIERS.LLMWrapperFactory)
      .to(LLMWrapperFactory)
      .inSingletonScope();
  }

  /**
   * 注册管理器
   */
  private registerManagers(): void {
    // 任务组管理器
    this.container.bind<TaskGroupManager>(LLM_DI_IDENTIFIERS.TaskGroupManager)
      .to(TaskGroupManager)
      .inSingletonScope();

    // 轮询池管理器
    this.container.bind<PollingPoolManager>(LLM_DI_IDENTIFIERS.PollingPoolManager)
      .to(PollingPoolManager)
      .inSingletonScope();
  }

  /**
   * 注册配置加载器
   */
  private registerConfigLoaders(): void {
    // 轮询池配置加载器
    this.container.bind<PoolConfigLoader>(LLM_DI_IDENTIFIERS.PoolConfigLoader)
      .to(PoolConfigLoader)
      .inSingletonScope();

    // 任务组配置加载器
    this.container.bind<TaskGroupConfigLoader>(LLM_DI_IDENTIFIERS.TaskGroupConfigLoader)
      .to(TaskGroupConfigLoader)
      .inSingletonScope();
  }

  /**
   * 注册HumanRelay相关服务
   * 已简化，不再需要前端交互服务
   */
  private registerHumanRelayServices(): void {
    // HumanRelay客户端已简化，不再需要额外的服务
  }

  /**
   * 获取依赖注入容器
   */
  getContainer(): Container {
    return this.container;
  }

  /**
   * 获取服务实例 - 类型安全版本
   */
  get<K extends keyof typeof LLM_DI_IDENTIFIERS>(
    serviceIdentifier: typeof LLM_DI_IDENTIFIERS[K]
  ): ServiceType<K> {
    return this.container.get<ServiceType<K>>(serviceIdentifier);
  }

  /**
   * 获取服务实例 - 兼容版本
   */
  getUnsafe<T>(serviceIdentifier: symbol): T {
    return this.container.get<T>(serviceIdentifier);
  }

  /**
   * 检查服务是否已注册 - 类型安全版本
   */
  has<K extends keyof typeof LLM_DI_IDENTIFIERS>(
    serviceIdentifier: typeof LLM_DI_IDENTIFIERS[K]
  ): boolean {
    return this.container.isBound(serviceIdentifier);
  }

  /**
   * 检查服务是否已注册 - 兼容版本
   */
  hasUnsafe(serviceIdentifier: symbol): boolean {
    return this.container.isBound(serviceIdentifier);
  }

  /**
   * 获取所有已注册的服务标识符
   */
  getRegisteredServices(): symbol[] {
    const services: symbol[] = [];

    // 获取所有LLM相关的服务标识符
    for (const key in LLM_DI_IDENTIFIERS) {
      const identifier = LLM_DI_IDENTIFIERS[key as keyof typeof LLM_DI_IDENTIFIERS];
      if (this.container.isBound(identifier)) {
        services.push(identifier);
      }
    }

    return services;
  }

  /**
   * 验证依赖关系
   */
  validateDependencies(): ValidationResult {
    const errors: string[] = [];

    for (const [serviceName, dependencies] of Object.entries(DEPENDENCY_GRAPH)) {
      for (const dependency of dependencies) {
        if (!this.container.isBound(LLM_DI_IDENTIFIERS[dependency])) {
          errors.push(`服务 ${serviceName} 缺少依赖: ${dependency}`);
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * 检查容器配置是否完整
   */
  isConfigurationComplete(): boolean {
    const requiredServices = [
      LLM_DI_IDENTIFIERS.ConfigManager,
      LLM_DI_IDENTIFIERS.HttpClient,
      LLM_DI_IDENTIFIERS.TokenBucketLimiter,
      LLM_DI_IDENTIFIERS.TokenCalculator,
      LLM_DI_IDENTIFIERS.OpenAIChatClient,
      LLM_DI_IDENTIFIERS.AnthropicClient,
      LLM_DI_IDENTIFIERS.GeminiClient,
      LLM_DI_IDENTIFIERS.MockClient,
      LLM_DI_IDENTIFIERS.LLMClientFactory,
      LLM_DI_IDENTIFIERS.TaskGroupManager,
      LLM_DI_IDENTIFIERS.PollingPoolManager,
      LLM_DI_IDENTIFIERS.LLMWrapperFactory
    ];

    return requiredServices.every(service => this.container.isBound(service));
  }

  /**
   * 获取完整的配置报告
   */
  getFullConfigurationReport(): {
    totalServices: number;
    registeredServices: number;
    missingServices: symbol[];
    configurationComplete: boolean;
    dependencyValidation: ValidationResult;
  } {
    const basicReport = this.getConfigurationReport();
    const dependencyValidation = this.validateDependencies();

    return {
      ...basicReport,
      dependencyValidation
    };
  }

  /**
   * 获取配置状态报告
   */
  getConfigurationReport(): {
    totalServices: number;
    registeredServices: number;
    missingServices: symbol[];
    configurationComplete: boolean;
  } {
    const allServices = Object.values(LLM_DI_IDENTIFIERS);
    const registeredServices = allServices.filter(service => this.container.isBound(service));
    const missingServices = allServices.filter(service => !this.container.isBound(service));

    return {
      totalServices: allServices.length,
      registeredServices: registeredServices.length,
      missingServices,
      configurationComplete: this.isConfigurationComplete()
    };
  }

  /**
   * 重置容器
   */
  reset(): void {
    this.container.unbindAll();
    this.configure();
  }

  /**
   * 创建默认配置的容器实例
   */
  static createDefault(): LLMDIContainer {
    return new LLMDIContainer();
  }
}