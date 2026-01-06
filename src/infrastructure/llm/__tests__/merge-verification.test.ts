import { AppContainer } from '../../../di/container';
import { TYPES } from '../../../di/service-keys';

/**
 * 合并验证测试
 *
 * 验证LLM模块集成到全局DI系统后的功能完整性
 */
describe('LLM模块DI集成验证', () => {
  beforeAll(() => {
    // 初始化全局容器
    AppContainer.initialize();
  });

  describe('依赖注入容器', () => {
    it('应该成功初始化容器', () => {
      expect(AppContainer.isInitialized()).toBe(true);
    });

    it('应该注册所有必要的LLM服务', () => {
      const requiredServices = [
        TYPES.ConfigLoadingModule,
        TYPES.HttpClient,
        TYPES.LLMClientFactory,
        TYPES.TaskGroupManager,
        TYPES.PollingPoolManager,
        TYPES.LLMWrapperFactory,
      ];

      requiredServices.forEach(service => {
        expect(AppContainer.isBound(service)).toBe(true);
      });
    });
  });

  describe('服务标识符', () => {
    it('应该包含所有客户端标识符', () => {
      const clientIdentifiers = [
        'OpenAIChatClient',
        'OpenAIResponseClient',
        'AnthropicClient',
        'GeminiClient',
        'GeminiOpenAIClient',
        'MockClient',
        'HumanRelayClient',
      ];

      clientIdentifiers.forEach(identifier => {
        expect(TYPES[identifier as keyof typeof TYPES]).toBeDefined();
      });
    });

    it('应该包含所有管理器标识符', () => {
      const managerIdentifiers = ['TaskGroupManager', 'PollingPoolManager'];

      managerIdentifiers.forEach(identifier => {
        expect(TYPES[identifier as keyof typeof TYPES]).toBeDefined();
      });
    });

    it('应该包含所有工厂标识符', () => {
      const factoryIdentifiers = ['LLMClientFactory', 'LLMWrapperFactory'];

      factoryIdentifiers.forEach(identifier => {
        expect(TYPES[identifier as keyof typeof TYPES]).toBeDefined();
      });
    });
  });

  describe('服务获取', () => {
    it('应该能够获取LLMClientFactory', () => {
      const factory = AppContainer.getService(TYPES.LLMClientFactory);
      expect(factory).toBeDefined();
    });

    it('应该能够获取TaskGroupManager', () => {
      const manager = AppContainer.getService(TYPES.TaskGroupManager);
      expect(manager).toBeDefined();
    });

    it('应该能够获取PollingPoolManager', () => {
      const manager = AppContainer.getService(TYPES.PollingPoolManager);
      expect(manager).toBeDefined();
    });

    it('应该能够获取LLMWrapperFactory', () => {
      const factory = AppContainer.getService(TYPES.LLMWrapperFactory);
      expect(factory).toBeDefined();
    });

    it('应该能够获取HttpClient', () => {
      const httpClient = AppContainer.getService(TYPES.HttpClient);
      expect(httpClient).toBeDefined();
    });

    it('应该能够获取ConfigLoadingModule', () => {
      const configModule = AppContainer.getService(TYPES.ConfigLoadingModule);
      expect(configModule).toBeDefined();
    });

    it('应该能够获取TokenBucketLimiter', () => {
      const limiter = AppContainer.getService(TYPES.TokenBucketLimiter);
      expect(limiter).toBeDefined();
    });

    it('应该能够获取TokenCalculator', () => {
      const calculator = AppContainer.getService(TYPES.TokenCalculator);
      expect(calculator).toBeDefined();
    });
  });

  describe('客户端服务', () => {
    it('应该能够获取OpenAIChatClient', () => {
      const client = AppContainer.getService(TYPES.OpenAIChatClient);
      expect(client).toBeDefined();
    });

    it('应该能够获取OpenAIResponseClient', () => {
      const client = AppContainer.getService(TYPES.OpenAIResponseClient);
      expect(client).toBeDefined();
    });

    it('应该能够获取AnthropicClient', () => {
      const client = AppContainer.getService(TYPES.AnthropicClient);
      expect(client).toBeDefined();
    });

    it('应该能够获取GeminiClient', () => {
      const client = AppContainer.getService(TYPES.GeminiClient);
      expect(client).toBeDefined();
    });

    it('应该能够获取GeminiOpenAIClient', () => {
      const client = AppContainer.getService(TYPES.GeminiOpenAIClient);
      expect(client).toBeDefined();
    });

    it('应该能够获取MockClient', () => {
      const client = AppContainer.getService(TYPES.MockClient);
      expect(client).toBeDefined();
    });

    it('应该能够获取HumanRelayClient', () => {
      const client = AppContainer.getService(TYPES.HumanRelayClient);
      expect(client).toBeDefined();
    });
  });
});
