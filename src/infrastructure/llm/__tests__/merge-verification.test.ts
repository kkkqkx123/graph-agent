import { LLMDIContainer } from '../di-container';
import { LLM_DI_IDENTIFIERS } from '../di-identifiers';

/**
 * 合并验证测试
 * 
 * 验证两个目录合并后的功能完整性
 */
describe('LLM目录合并验证', () => {
  let container: LLMDIContainer;

  beforeEach(() => {
    container = new LLMDIContainer();
  });

  describe('依赖注入容器', () => {
    it('应该成功创建容器', () => {
      expect(container).toBeDefined();
    });

    it('应该注册所有必要的服务', () => {
      const requiredServices = [
        LLM_DI_IDENTIFIERS.ConfigManager,
        LLM_DI_IDENTIFIERS.HttpClient,
        LLM_DI_IDENTIFIERS.LLMClientFactory,
        LLM_DI_IDENTIFIERS.TaskGroupManager,
        LLM_DI_IDENTIFIERS.PollingPoolManager,
        LLM_DI_IDENTIFIERS.LLMWrapperFactory
      ];

      requiredServices.forEach(service => {
        expect(container.has(service)).toBe(true);
      });
    });

    it('应该验证依赖关系', () => {
      const validation = container.validateDependencies();
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('应该配置完整', () => {
      expect(container.isConfigurationComplete()).toBe(true);
    });
  });

  describe('服务标识符', () => {
    it('应该包含所有客户端标识符', () => {
      const clientIdentifiers: (keyof typeof LLM_DI_IDENTIFIERS)[] = [
        'OpenAIChatClient',
        'OpenAIResponseClient',
        'AnthropicClient',
        'GeminiClient',
        'GeminiOpenAIClient',
        'MockClient',
        'HumanRelayClient'
      ];

      clientIdentifiers.forEach(identifier => {
        expect(LLM_DI_IDENTIFIERS[identifier]).toBeDefined();
      });
    });

    it('应该包含所有管理器标识符', () => {
      const managerIdentifiers: (keyof typeof LLM_DI_IDENTIFIERS)[] = [
        'TaskGroupManager',
        'PollingPoolManager'
      ];

      managerIdentifiers.forEach(identifier => {
        expect(LLM_DI_IDENTIFIERS[identifier]).toBeDefined();
      });
    });

    it('应该包含所有工厂标识符', () => {
      const factoryIdentifiers: (keyof typeof LLM_DI_IDENTIFIERS)[] = [
        'LLMClientFactory',
        'LLMWrapperFactory',
        'ConverterFactory',
        'EndpointStrategyFactory',
        'FeatureFactory',
        'ParameterMapperFactory'
      ];

      factoryIdentifiers.forEach(identifier => {
        expect(LLM_DI_IDENTIFIERS[identifier]).toBeDefined();
      });
    });
  });

  describe('服务获取', () => {
    it('应该能够获取LLMClientFactory', () => {
      const factory = container.get(LLM_DI_IDENTIFIERS.LLMClientFactory);
      expect(factory).toBeDefined();
    });

    it('应该能够获取TaskGroupManager', () => {
      const manager = container.get(LLM_DI_IDENTIFIERS.TaskGroupManager);
      expect(manager).toBeDefined();
    });

    it('应该能够获取PollingPoolManager', () => {
      const manager = container.get(LLM_DI_IDENTIFIERS.PollingPoolManager);
      expect(manager).toBeDefined();
    });

    it('应该能够获取LLMWrapperFactory', () => {
      const factory = container.get(LLM_DI_IDENTIFIERS.LLMWrapperFactory);
      expect(factory).toBeDefined();
    });
  });

  describe('配置报告', () => {
    it('应该生成完整的配置报告', () => {
      const report = container.getFullConfigurationReport();
      
      expect(report.totalServices).toBeGreaterThan(0);
      expect(report.registeredServices).toBeGreaterThan(0);
      expect(report.configurationComplete).toBe(true);
      expect(report.dependencyValidation.isValid).toBe(true);
    });
  });
});