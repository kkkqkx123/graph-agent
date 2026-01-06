import { LLMClientFactory } from '../clients/llm-client-factory';
import { ConfigManager } from '../../config/config-manager';

/**
 * 简化的 Gemini 客户端选择测试
 * 避免复杂的依赖注入问题
 */
describe('Gemini Client Selection (Simple)', () => {
  let factory: LLMClientFactory;
  let configManager: ConfigManager;

  beforeEach(() => {
    // 创建模拟的配置管理器
    configManager = {
      get: jest.fn().mockReturnValue('native'),
      set: jest.fn(),
      has: jest.fn(),
      delete: jest.fn(),
      getAll: jest.fn(),
      reload: jest.fn(),
      watch: jest.fn(),
      unwatch: jest.fn(),
      initialize: jest.fn(),
    } as any;

    // 创建模拟的客户端
    const mockOpenAIChatClient = { getClientName: () => 'openai-chat' } as any;
    const mockOpenAIResponseClient = { getClientName: () => 'openai-response' } as any;
    const mockAnthropicClient = { getClientName: () => 'anthropic' } as any;
    const mockGeminiClient = { getClientName: () => 'gemini' } as any;
    const mockGeminiOpenAIClient = { getClientName: () => 'gemini-openai' } as any;
    const mockMockClient = { getClientName: () => 'mock' } as any;
    const mockHumanRelayClient = { getClientName: () => 'human-relay' } as any;

    // 直接创建工厂实例，传入所有必需的依赖
    factory = new LLMClientFactory(
      mockOpenAIChatClient,
      mockOpenAIResponseClient,
      mockAnthropicClient,
      mockGeminiClient,
      mockGeminiOpenAIClient,
      mockMockClient,
      mockHumanRelayClient,
      configManager
    );
  });

  test('应该默认使用原生 Gemini 客户端', () => {
    const client = factory.createClient('gemini');
    expect(client.getClientName()).toBe('gemini');
  });

  test('应该支持 google 作为提供商别名', () => {
    const client = factory.createClient('google');
    expect(client.getClientName()).toBe('gemini');
  });

  test('应该抛出不支持的提供商错误', () => {
    expect(() => {
      factory.createClient('unsupported-provider');
    }).toThrow('不支持的LLM提供商: unsupported-provider');
  });
});
