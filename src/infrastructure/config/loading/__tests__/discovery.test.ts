/**
 * ConfigDiscovery 单元测试
 */

import { ConfigDiscovery } from '../discovery';
import { ILogger } from '../../../../domain/common/types';

// Mock Logger
class MockLogger implements ILogger {
  child = jest.fn().mockReturnValue(this);
  trace = jest.fn();
  debug = jest.fn();
  info = jest.fn();
  warn = jest.fn();
  error = jest.fn();
  fatal = jest.fn();
}

describe('ConfigDiscovery', () => {
  let discovery: ConfigDiscovery;
  let logger: ILogger;

  beforeEach(() => {
    logger = new MockLogger();
    discovery = new ConfigDiscovery({}, logger);
  });

  describe('matchPattern', () => {
    it('应该匹配 **/*.toml 模式', () => {
      expect((discovery as any).matchPattern('global.toml', '**/*.toml')).toBe(true);
      expect((discovery as any).matchPattern('llms/gemini.toml', '**/*.toml')).toBe(true);
      expect((discovery as any).matchPattern('tools/builtin/calculator.toml', '**/*.toml')).toBe(true);
    });

    it('不应该匹配非 toml 文件', () => {
      expect((discovery as any).matchPattern('global.json', '**/*.toml')).toBe(false);
      expect((discovery as any).matchPattern('README.md', '**/*.toml')).toBe(false);
    });

    it('应该匹配 **/_* 模式', () => {
      expect((discovery as any).matchPattern('_hidden.toml', '**/_*')).toBe(true);
      expect((discovery as any).matchPattern('llms/_internal.toml', '**/_*')).toBe(true);
      expect((discovery as any).matchPattern('normal.toml', '**/_*')).toBe(false);
    });

    it('应该匹配 **/__* 模式', () => {
      expect((discovery as any).matchPattern('__registry__.toml', '**/__*')).toBe(true);
      expect((discovery as any).matchPattern('tools/__registry__.toml', '**/__*')).toBe(true);
      expect((discovery as any).matchPattern('normal.toml', '**/__*')).toBe(false);
    });

    it('应该匹配 **/test_* 模式', () => {
      expect((discovery as any).matchPattern('test_config.toml', '**/test_*')).toBe(true);
      expect((discovery as any).matchPattern('llms/test_gemini.toml', '**/test_*')).toBe(true);
      expect((discovery as any).matchPattern('normal.toml', '**/test_*')).toBe(false);
    });

    it('应该匹配 **/*.test.* 模式', () => {
      expect((discovery as any).matchPattern('config.test.toml', '**/*.test.*')).toBe(true);
      expect((discovery as any).matchPattern('llms/gemini.test.toml', '**/*.test.*')).toBe(true);
      expect((discovery as any).matchPattern('normal.toml', '**/*.test.*')).toBe(false);
    });

    it('应该处理 Windows 路径分隔符', () => {
      expect((discovery as any).matchPattern('llms\\gemini.toml', '**/*.toml')).toBe(true);
      expect((discovery as any).matchPattern('tools\\builtin\\calculator.toml', '**/*.toml')).toBe(true);
    });
  });

  describe('detectModuleType', () => {
    it('应该正确识别 global 模块', () => {
      expect((discovery as any).detectModuleType('global.toml')).toBe('global');
      expect((discovery as any).detectModuleType('global/settings.toml')).toBe('global');
    });

    it('应该正确识别 environments 模块', () => {
      expect((discovery as any).detectModuleType('environments/dev.toml')).toBe('global');
      expect((discovery as any).detectModuleType('environments/production.toml')).toBe('global');
    });

    it('应该正确识别 llms 模块', () => {
      expect((discovery as any).detectModuleType('llms/gemini.toml')).toBe('llms');
      expect((discovery as any).detectModuleType('llms/provider/gemini.toml')).toBe('llms');
    });

    it('应该正确识别 tools 模块', () => {
      expect((discovery as any).detectModuleType('tools/builtin/calculator.toml')).toBe('tools');
      expect((discovery as any).detectModuleType('tools/mcp/database.toml')).toBe('tools');
    });

    it('应该正确识别 registry 模块', () => {
      expect((discovery as any).detectModuleType('tools/__registry__.toml')).toBe('registry');
      expect((discovery as any).detectModuleType('llms/__registry__.toml')).toBe('registry');
    });

    it('应该正确识别 example 模块', () => {
      expect((discovery as any).detectModuleType('examples/routing.toml')).toBe('example');
      expect((discovery as any).detectModuleType('examples/gemini-usage.toml')).toBe('example');
    });

    it('应该返回 unknown 对于未知模块', () => {
      expect((discovery as any).detectModuleType('unknown/config.toml')).toBe('unknown');
      expect((discovery as any).detectModuleType('random.toml')).toBe('unknown');
    });

    it('应该处理空路径', () => {
      expect((discovery as any).detectModuleType('')).toBe('unknown');
    });
  });

  describe('calculatePriority', () => {
    it('应该给 global 配置最高优先级', () => {
      const priority = (discovery as any).calculatePriority('global.toml', 'global');
      expect(priority).toBe(1100); // 100 + 1000
    });

    it('应该给 environments 配置高优先级', () => {
      const priority = (discovery as any).calculatePriority('environments/dev.toml', 'global');
      expect(priority).toBe(900); // 100 + 800
    });

    it('应该给 registry 配置高优先级', () => {
      const priority = (discovery as any).calculatePriority('tools/__registry__.toml', 'registry');
      expect(priority).toBe(700); // 100 + 600
    });

    it('应该给 common 配置高优先级', () => {
      const priority = (discovery as any).calculatePriority('llms/provider/common/config.toml', 'llms');
      expect(priority).toBe(900); // 100 + 300 (provider) + 500 (common)
    });

    it('应该给 _group 配置较高优先级', () => {
      const priority = (discovery as any).calculatePriority('llms/task_groups/default_group.toml', 'llms');
      expect(priority).toBe(500); // 100 + 400
    });

    it('应该给 provider 配置中等优先级', () => {
      const priority = (discovery as any).calculatePriority('llms/provider/gemini.toml', 'llms');
      expect(priority).toBe(400); // 100 + 300
    });

    it('应该给 examples 配置较低优先级', () => {
      const priority = (discovery as any).calculatePriority('examples/routing.toml', 'example');
      expect(priority).toBe(-100); // 100 - 200
    });

    it('应该给 test 配置最低优先级', () => {
      const priority = (discovery as any).calculatePriority('llms/test_gemini.toml', 'llms');
      expect(priority).toBe(-300); // 100 - 400
    });

    it('应该精确匹配路径段，不使用 includes', () => {
      // 这些文件名包含关键字但不在正确的路径位置
      const priority1 = (discovery as any).calculatePriority('global_settings.toml', 'unknown');
      expect(priority1).toBe(100); // 不应该匹配 global

      const priority2 = (discovery as any).calculatePriority('my_environments.toml', 'unknown');
      expect(priority2).toBe(100); // 不应该匹配 environments

      const priority3 = (discovery as any).calculatePriority('provider_config.toml', 'unknown');
      expect(priority3).toBe(100); // 不应该匹配 provider
    });

    it('应该正确处理嵌套路径', () => {
      const priority = (discovery as any).calculatePriority('llms/provider/gemini/common/config.toml', 'llms');
      // 应该同时匹配 provider (+300) 和 common (+500)
      expect(priority).toBe(900); // 100 + 300 (provider) + 500 (common)
    });
  });

  describe('matchesIncludePatterns', () => {
    it('应该匹配默认的 **/*.toml 模式', () => {
      expect((discovery as any).matchesIncludePatterns('global.toml')).toBe(true);
      expect((discovery as any).matchesIncludePatterns('llms/gemini.toml')).toBe(true);
      expect((discovery as any).matchesIncludePatterns('tools/builtin/calculator.toml')).toBe(true);
    });

    it('不应该匹配非 toml 文件', () => {
      expect((discovery as any).matchesIncludePatterns('global.json')).toBe(false);
      expect((discovery as any).matchesIncludePatterns('README.md')).toBe(false);
    });
  });

  describe('matchesExcludePatterns', () => {
    it('应该排除以 _ 开头的文件', () => {
      expect((discovery as any).matchesExcludePatterns('_hidden.toml')).toBe(true);
      expect((discovery as any).matchesExcludePatterns('llms/_internal.toml')).toBe(true);
    });

    it('应该排除以 __ 开头的文件', () => {
      expect((discovery as any).matchesExcludePatterns('__registry__.toml')).toBe(true);
      expect((discovery as any).matchesExcludePatterns('tools/__registry__.toml')).toBe(true);
    });

    it('应该排除以 test_ 开头的文件', () => {
      expect((discovery as any).matchesExcludePatterns('test_config.toml')).toBe(true);
      expect((discovery as any).matchesExcludePatterns('llms/test_gemini.toml')).toBe(true);
    });

    it('应该排除包含 .test. 的文件', () => {
      expect((discovery as any).matchesExcludePatterns('config.test.toml')).toBe(true);
      expect((discovery as any).matchesExcludePatterns('llms/gemini.test.toml')).toBe(true);
    });

    it('不应该排除正常文件', () => {
      expect((discovery as any).matchesExcludePatterns('global.toml')).toBe(false);
      expect((discovery as any).matchesExcludePatterns('llms/gemini.toml')).toBe(false);
    });
  });

  describe('自定义配置', () => {
    it('应该允许自定义排除模式', () => {
      const customDiscovery = new ConfigDiscovery(
        {
          excludePatterns: ['**/custom_*'],
        },
        logger
      );

      expect((customDiscovery as any).matchesExcludePatterns('custom_file.toml')).toBe(true);
      expect((customDiscovery as any).matchesExcludePatterns('normal.toml')).toBe(false);
    });

    it('应该允许自定义包含模式', () => {
      const customDiscovery = new ConfigDiscovery(
        {
          includePatterns: ['**/*.json'],
        },
        logger
      );

      expect((customDiscovery as any).matchesIncludePatterns('config.json')).toBe(true);
      expect((customDiscovery as any).matchesIncludePatterns('config.toml')).toBe(false);
    });

    it('应该允许自定义文件扩展名', () => {
      const customDiscovery = new ConfigDiscovery(
        {
          fileExtensions: ['.json', '.yaml'],
        },
        logger
      );

      expect((customDiscovery as any).isValidExtension('config.json')).toBe(true);
      expect((customDiscovery as any).isValidExtension('config.yaml')).toBe(true);
      expect((customDiscovery as any).isValidExtension('config.toml')).toBe(false);
    });
  });
});