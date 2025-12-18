import { ConfigManagerImpl } from '../../common/config/config-manager';

describe('配置模型加载测试', () => {
  let configManager: ConfigManagerImpl;

  beforeEach(() => {
    // 创建配置管理器实例
    configManager = new ConfigManagerImpl('./configs');
  });

  describe('配置管理器模型列表加载', () => {
    test('应该从配置中加载 OpenAI 模型列表', () => {
      const openaiModels = configManager.get('llm.openai.models', []);
      expect(openaiModels).toContain('gpt-4');
      expect(openaiModels).toContain('gpt-4o');
      expect(openaiModels).toContain('gpt-3.5-turbo');
    });

    test('应该从配置中加载 Gemini 模型列表', () => {
      const geminiModels = configManager.get('llm.gemini.models', []);
      expect(geminiModels).toContain('gemini-2.5-pro');
      expect(geminiModels).toContain('gemini-2.5-flash');
    });

    test('应该从配置中加载 Anthropic 模型列表', () => {
      const anthropicModels = configManager.get('llm.anthropic.models', []);
      expect(anthropicModels).toContain('claude-3-opus-20240229');
      expect(anthropicModels).toContain('claude-3-sonnet-20240229');
      expect(anthropicModels).toContain('claude-3-haiku-20240307');
    });

    test('应该从配置中加载 Mock 模型列表', () => {
      const mockModels = configManager.get('llm.mock.models', []);
      expect(mockModels).toContain('mock-model');
      expect(mockModels).toContain('mock-model-turbo');
      expect(mockModels).toContain('mock-model-pro');
    });
  });

  describe('配置覆盖测试', () => {
    test('应该能够通过配置覆盖默认模型列表', () => {
      // 模拟配置覆盖
      const customModels = ['custom-gemini-model-1', 'custom-gemini-model-2'];
      configManager.set('llm.gemini.models', customModels);

      const geminiModels = configManager.get('llm.gemini.models', []);
      expect(geminiModels).toEqual(customModels);
    });
  });

  describe('配置回退测试', () => {
    test('当配置不存在时应该使用默认值', () => {
      // 获取不存在的配置
      const nonExistentModels = configManager.get('llm.nonexistent.models', ['default-model']);
      expect(nonExistentModels).toEqual(['default-model']);
    });
  });

  describe('配置结构验证', () => {
    test('应该正确设置默认配置', () => {
      const config = configManager.getConfigStructure();

      // 验证 OpenAI 配置
      expect(config.openai).toBeDefined();
      expect(config.openai.models).toBeInstanceOf(Array);
      expect(config.openai.models.length).toBeGreaterThan(0);

      // 验证 Gemini 配置
      expect(config.gemini).toBeDefined();
      expect(config.gemini.models).toBeInstanceOf(Array);
      expect(config.gemini.models.length).toBeGreaterThan(0);

      // 验证 Anthropic 配置
      expect(config.anthropic).toBeDefined();
      expect(config.anthropic.models).toBeInstanceOf(Array);
      expect(config.anthropic.models.length).toBeGreaterThan(0);

      // 验证 Mock 配置
      expect(config.mock).toBeDefined();
      expect(config.mock.models).toBeInstanceOf(Array);
      expect(config.mock.models.length).toBeGreaterThan(0);
    });
  });
});