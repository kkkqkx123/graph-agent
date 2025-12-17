/**
 * LLM模块依赖注入标识符
 *
 * 提供类型安全的依赖注入标识符，消除any类型的使用
 */

// 服务标识符定义
export const LLM_DI_IDENTIFIERS = {
  // 基础设施组件
  HttpClient: Symbol.for('HttpClient'),
  ConfigManager: Symbol.for('ConfigManager'),
  TokenBucketLimiter: Symbol.for('TokenBucketLimiter'),
  TokenCalculator: Symbol.for('TokenCalculator'),
  FeatureRegistry: Symbol.for('FeatureRegistry'),
  
  // 客户端实现
  OpenAIChatClient: Symbol.for('OpenAIChatClient'),
  OpenAIResponseClient: Symbol.for('OpenAIResponseClient'),
  AnthropicClient: Symbol.for('AnthropicClient'),
  GeminiClient: Symbol.for('GeminiClient'),
  GeminiOpenAIClient: Symbol.for('GeminiOpenAIClient'),
  MockClient: Symbol.for('MockClient'),
  
  // 工厂类
  LLMClientFactory: Symbol.for('LLMClientFactory'),
  EnhancedLLMClientFactory: Symbol.for('EnhancedLLMClientFactory'),
  ConverterFactory: Symbol.for('ConverterFactory'),
  EndpointStrategyFactory: Symbol.for('EndpointStrategyFactory'),
  FeatureFactory: Symbol.for('FeatureFactory'),
  ParameterMapperFactory: Symbol.for('ParameterMapperFactory'),
  
  // 轮询池和任务组管理器
  PoolManager: Symbol.for('PoolManager'),
  TaskGroupManager: Symbol.for('TaskGroupManager'),
  LLMWrapperManager: Symbol.for('LLMWrapperManager'),
  LLMWrapperFactory: Symbol.for('LLMWrapperFactory'),
  
  // 应用服务
  PoolService: Symbol.for('PoolService'),
  TaskGroupService: Symbol.for('TaskGroupService'),
  ConfigManagementService: Symbol.for('ConfigManagementService'),
  LLMOrchestrationService: Symbol.for('LLMOrchestrationService'),
  
  // 集成组件
  RequestRouter: Symbol.for('RequestRouter'),
  ConfigLoader: Symbol.for('ConfigLoader'),
  LLMClientAdapter: Symbol.for('LLMClientAdapter'),
  
  // 高级特性
  MetricsCollector: Symbol.for('MetricsCollector'),
  HealthChecker: Symbol.for('HealthChecker'),
  AlertingService: Symbol.for('AlertingService'),
  
  // 参数映射器
  OpenAIParameterMapper: Symbol.for('OpenAIParameterMapper'),
  AnthropicParameterMapper: Symbol.for('AnthropicParameterMapper'),
  GeminiParameterMapper: Symbol.for('GeminiParameterMapper'),
  MockParameterMapper: Symbol.for('MockParameterMapper'),
  
  // 端点策略
  OpenAICompatibleEndpointStrategy: Symbol.for('OpenAICompatibleEndpointStrategy'),
  GeminiNativeEndpointStrategy: Symbol.for('GeminiNativeEndpointStrategy'),
  AnthropicEndpointStrategy: Symbol.for('AnthropicEndpointStrategy'),
  MockEndpointStrategy: Symbol.for('MockEndpointStrategy'),
  
  // 功能
  GeminiThinkingBudgetFeature: Symbol.for('GeminiThinkingBudgetFeature'),
  GeminiCachedContentFeature: Symbol.for('GeminiCachedContentFeature'),
  OpenAIResponseFormatFeature: Symbol.for('OpenAIResponseFormatFeature'),
  AnthropicSystemMessageFeature: Symbol.for('AnthropicSystemMessageFeature'),
} as const;

// 服务类型映射 - 使用any类型避免循环依赖，在运行时通过依赖注入保证类型安全
export interface ServiceTypes {
  HttpClient: any;
  ConfigManager: any;
  TokenBucketLimiter: any;
  TokenCalculator: any;
  FeatureRegistry: any;
  OpenAIChatClient: any;
  OpenAIResponseClient: any;
  AnthropicClient: any;
  GeminiClient: any;
  GeminiOpenAIClient: any;
  MockClient: any;
  LLMClientFactory: any;
  EnhancedLLMClientFactory: any;
  ConverterFactory: any;
  EndpointStrategyFactory: any;
  FeatureFactory: any;
  ParameterMapperFactory: any;
  PoolManager: any;
  TaskGroupManager: any;
  LLMWrapperManager: any;
  LLMWrapperFactory: any;
  PoolService: any;
  TaskGroupService: any;
  ConfigManagementService: any;
  LLMOrchestrationService: any;
  RequestRouter: any;
  ConfigLoader: any;
  LLMClientAdapter: any;
  MetricsCollector: any;
  HealthChecker: any;
  AlertingService: any;
  OpenAIParameterMapper: any;
  AnthropicParameterMapper: any;
  GeminiParameterMapper: any;
  MockParameterMapper: any;
  OpenAICompatibleEndpointStrategy: any;
  GeminiNativeEndpointStrategy: any;
  AnthropicEndpointStrategy: any;
  MockEndpointStrategy: any;
  GeminiThinkingBudgetFeature: any;
  GeminiCachedContentFeature: any;
  OpenAIResponseFormatFeature: any;
  AnthropicSystemMessageFeature: any;
}

// 类型安全的标识符类型
export type LLMDIIdentifiers = typeof LLM_DI_IDENTIFIERS;

// 类型映射工具类型
export type ServiceType<K extends keyof LLMDIIdentifiers> = ServiceTypes[K];

// 依赖关系图
export const DEPENDENCY_GRAPH: Record<keyof LLMDIIdentifiers, (keyof LLMDIIdentifiers)[]> = {
  HttpClient: [],
  ConfigManager: [],
  TokenBucketLimiter: [],
  TokenCalculator: [],
  FeatureRegistry: [],
  OpenAIChatClient: ['HttpClient', 'ConfigManager', 'TokenBucketLimiter', 'TokenCalculator'],
  OpenAIResponseClient: ['HttpClient', 'ConfigManager', 'TokenBucketLimiter', 'TokenCalculator'],
  AnthropicClient: ['HttpClient', 'ConfigManager', 'TokenBucketLimiter', 'TokenCalculator'],
  GeminiClient: ['HttpClient', 'ConfigManager', 'TokenBucketLimiter', 'TokenCalculator'],
  GeminiOpenAIClient: ['HttpClient', 'ConfigManager', 'TokenBucketLimiter', 'TokenCalculator'],
  MockClient: ['HttpClient', 'ConfigManager', 'TokenBucketLimiter', 'TokenCalculator'],
  LLMClientFactory: ['OpenAIChatClient', 'OpenAIResponseClient', 'AnthropicClient', 'GeminiClient', 'MockClient'],
  EnhancedLLMClientFactory: ['OpenAIChatClient', 'OpenAIResponseClient', 'AnthropicClient', 'GeminiClient', 'MockClient', 'ConfigManager'],
  ConverterFactory: [],
  EndpointStrategyFactory: [],
  FeatureFactory: ['FeatureRegistry'],
  ParameterMapperFactory: [],
  PoolManager: ['ConfigManager', 'LLMWrapperFactory', 'HealthChecker'],
  TaskGroupManager: ['ConfigManager', 'LLMWrapperFactory', 'HealthChecker'],
  LLMWrapperManager: ['LLMWrapperFactory', 'MetricsCollector', 'HealthChecker'],
  LLMWrapperFactory: ['EnhancedLLMClientFactory', 'ConfigManager'],
  PoolService: ['PoolManager', 'ConfigManagementService'],
  TaskGroupService: ['TaskGroupManager', 'ConfigManagementService'],
  ConfigManagementService: ['ConfigLoader', 'ConfigManager'],
  LLMOrchestrationService: ['LLMWrapperManager', 'RequestRouter', 'MetricsCollector', 'HealthChecker', 'AlertingService'],
  RequestRouter: ['LLMWrapperManager', 'EnhancedLLMClientFactory', 'ConfigManager'],
  ConfigLoader: ['ConfigManager'],
  LLMClientAdapter: [],
  MetricsCollector: [],
  HealthChecker: [],
  AlertingService: ['MetricsCollector'],
  OpenAIParameterMapper: [],
  AnthropicParameterMapper: [],
  GeminiParameterMapper: [],
  MockParameterMapper: [],
  OpenAICompatibleEndpointStrategy: [],
  GeminiNativeEndpointStrategy: [],
  AnthropicEndpointStrategy: [],
  MockEndpointStrategy: [],
  GeminiThinkingBudgetFeature: [],
  GeminiCachedContentFeature: [],
  OpenAIResponseFormatFeature: [],
  AnthropicSystemMessageFeature: [],
};