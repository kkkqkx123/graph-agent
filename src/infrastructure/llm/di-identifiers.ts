/**
 * LLM模块依赖注入标识符
 *
 * 提供类型安全的依赖注入标识符，消除any类型的使用
 */

// 服务标识符定义
export const LLM_DI_IDENTIFIERS = {
  // 基础设施组件
  HttpClient: Symbol.for('HttpClient'),
  ConfigLoadingModule: Symbol.for('ConfigLoadingModule'),
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
  HumanRelayClient: Symbol.for('HumanRelayClient'),
  
  // HumanRelay相关
  HumanRelayInteractionService: Symbol.for('HumanRelayInteractionService'),
  HumanRelayConfigLoader: Symbol.for('HumanRelayConfigLoader'),
  
  // 工厂类
  LLMClientFactory: Symbol.for('LLMClientFactory'),
  ConverterFactory: Symbol.for('ConverterFactory'),
  FeatureFactory: Symbol.for('FeatureFactory'),
  LLMWrapperFactory: Symbol.for('LLMWrapperFactory'),
  
  // 管理器
  PollingPoolManager: Symbol.for('PollingPoolManager'),
  TaskGroupManager: Symbol.for('TaskGroupManager'),
  
  // 配置加载器
  PoolConfigLoader: Symbol.for('PoolConfigLoader'),
  TaskGroupConfigLoader: Symbol.for('TaskGroupConfigLoader'),
  
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
  
  // HumanRelay前端服务
  TUIInteractionService: Symbol.for('TUIInteractionService'),
  WebInteractionService: Symbol.for('WebInteractionService'),
  APIInteractionService: Symbol.for('APIInteractionService'),
} as const;

// 服务类型映射 - 使用any类型避免循环依赖，在运行时通过依赖注入保证类型安全
export interface ServiceTypes {
  HttpClient: any;
  ConfigLoadingModule: any;
  TokenBucketLimiter: any;
  TokenCalculator: any;
  FeatureRegistry: any;
  OpenAIChatClient: any;
  OpenAIResponseClient: any;
  AnthropicClient: any;
  GeminiClient: any;
  GeminiOpenAIClient: any;
  MockClient: any;
  HumanRelayClient: any;
  HumanRelayInteractionService: any;
  HumanRelayConfigLoader: any;
  LLMClientFactory: any;
  ConverterFactory: any;
  FeatureFactory: any;
  LLMWrapperFactory: any;
  PollingPoolManager: any;
  TaskGroupManager: any;
  PoolConfigLoader: any;
  TaskGroupConfigLoader: any;
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
  TUIInteractionService: any;
  WebInteractionService: any;
  APIInteractionService: any;
}

// 类型安全的标识符类型
export type LLMDIIdentifiers = typeof LLM_DI_IDENTIFIERS;

// 类型映射工具类型
export type ServiceType<K extends keyof LLMDIIdentifiers> = ServiceTypes[K];

// 依赖关系图
export const DEPENDENCY_GRAPH: Record<keyof LLMDIIdentifiers, (keyof LLMDIIdentifiers)[]> = {
  HttpClient: [],
  ConfigLoadingModule: [],
  TokenBucketLimiter: [],
  TokenCalculator: [],
  FeatureRegistry: [],
  OpenAIChatClient: ['HttpClient', 'ConfigLoadingModule', 'TokenBucketLimiter', 'TokenCalculator'],
  OpenAIResponseClient: ['HttpClient', 'ConfigLoadingModule', 'TokenBucketLimiter', 'TokenCalculator'],
  AnthropicClient: ['HttpClient', 'ConfigLoadingModule', 'TokenBucketLimiter', 'TokenCalculator'],
  GeminiClient: ['HttpClient', 'ConfigLoadingModule', 'TokenBucketLimiter', 'TokenCalculator'],
  GeminiOpenAIClient: ['HttpClient', 'ConfigLoadingModule', 'TokenBucketLimiter', 'TokenCalculator'],
  MockClient: ['HttpClient', 'ConfigLoadingModule', 'TokenBucketLimiter', 'TokenCalculator'],
  HumanRelayClient: ['HumanRelayInteractionService', 'ConfigLoadingModule'],
  HumanRelayInteractionService: ['TUIInteractionService', 'WebInteractionService', 'APIInteractionService', 'ConfigLoadingModule'],
  HumanRelayConfigLoader: ['ConfigLoadingModule'],
  LLMClientFactory: ['OpenAIChatClient', 'OpenAIResponseClient', 'AnthropicClient', 'GeminiClient', 'GeminiOpenAIClient', 'MockClient', 'HumanRelayClient', 'ConfigLoadingModule'],
  ConverterFactory: [],
  FeatureFactory: ['FeatureRegistry'],
  LLMWrapperFactory: ['PollingPoolManager', 'TaskGroupManager'],
  PollingPoolManager: ['TaskGroupManager', 'LLMClientFactory'],
  TaskGroupManager: ['ConfigLoadingModule'],
  PoolConfigLoader: ['ConfigLoadingModule'],
  TaskGroupConfigLoader: ['ConfigLoadingModule'],
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
  TUIInteractionService: ['ConfigLoadingModule'],
  WebInteractionService: ['ConfigLoadingModule'],
  APIInteractionService: ['ConfigLoadingModule'],
};