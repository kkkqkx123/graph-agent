/**
 * CodeConfigValidatorAPI测试用例
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { CodeConfigValidatorAPI } from '../code-config-validator-api';
import { ScriptType } from '../../../types/code';
import type { Script, ScriptExecutionOptions, SandboxConfig } from '../../../types/code';

describe('CodeConfigValidatorAPI', () => {
  let validatorAPI: CodeConfigValidatorAPI;

  beforeEach(() => {
    validatorAPI = new CodeConfigValidatorAPI();
  });

  describe('validateScript', () => {
    it('应该验证有效的脚本定义', async () => {
      const validScript: Script = {
        id: 'test-script',
        name: 'test-script',
        type: ScriptType.PYTHON,
        description: 'Test script',
        content: 'print("Hello, World!")',
        options: {
          timeout: 30000,
          retries: 3,
          retryDelay: 1000
        }
      };

      const result = await validatorAPI.validateScript(validScript);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('应该拒绝缺少必需字段的脚本', async () => {
      const invalidScript = {
        id: 'test-script',
        name: 'test-script',
        type: ScriptType.PYTHON
      } as any;

      const result = await validatorAPI.validateScript(invalidScript);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('应该拒绝无效的脚本类型', async () => {
      const invalidScript = {
        id: 'test-script',
        name: 'test-script',
        type: 'invalid-type',
        description: 'Test script',
        content: 'print("Hello")',
        options: {}
      } as any;

      const result = await validatorAPI.validateScript(invalidScript);
      expect(result.valid).toBe(false);
    });
  });

  describe('validateExecutionOptions', () => {
    it('应该验证有效的执行选项', async () => {
      const validOptions: ScriptExecutionOptions = {
        timeout: 30000,
        retries: 3,
        retryDelay: 1000,
        workingDirectory: '/tmp',
        environment: {
          PATH: '/usr/bin'
        }
      };

      const result = await validatorAPI.validateExecutionOptions(validOptions);
      expect(result.valid).toBe(true);
    });

    it('应该拒绝无效的超时值', async () => {
      const invalidOptions = {
        timeout: -100
      } as any;

      const result = await validatorAPI.validateExecutionOptions(invalidOptions);
      expect(result.valid).toBe(false);
    });
  });

  describe('validateSandboxConfig', () => {
    it('应该验证有效的沙箱配置', async () => {
      const validConfig: SandboxConfig = {
        type: 'docker',
        image: 'python:3.9',
        resourceLimits: {
          memory: 512,
          cpu: 1
        },
        network: {
          enabled: true,
          allowedDomains: ['example.com']
        }
      };

      const result = await validatorAPI.validateSandboxConfig(validConfig);
      expect(result.valid).toBe(true);
    });

    it('应该拒绝无效的沙箱类型', async () => {
      const invalidConfig = {
        type: 'invalid-type'
      } as any;

      const result = await validatorAPI.validateSandboxConfig(invalidConfig);
      expect(result.valid).toBe(false);
    });
  });

  describe('validateScriptTypeCompatibility', () => {
    it('应该验证Python脚本与.py文件的兼容性', async () => {
      const result = await validatorAPI.validateScriptTypeCompatibility(
        ScriptType.PYTHON,
        undefined,
        'script.py'
      );
      expect(result.valid).toBe(true);
    });

    it('应该拒绝Python脚本与.js文件的不兼容', async () => {
      const result = await validatorAPI.validateScriptTypeCompatibility(
        ScriptType.PYTHON,
        undefined,
        'script.js'
      );
      expect(result.valid).toBe(false);
    });

    it('应该验证Python脚本内容', async () => {
      const pythonContent = 'def hello():\n    print("Hello")';
      const result = await validatorAPI.validateScriptTypeCompatibility(
        ScriptType.PYTHON,
        pythonContent
      );
      expect(result.valid).toBe(true);
    });
  });

  describe('validateExecutionEnvironment', () => {
    it('应该验证有效的执行环境', async () => {
      const script: Script = {
        id: 'test-script',
        name: 'test-script',
        type: ScriptType.PYTHON,
        description: 'Test script',
        content: 'print("Hello")',
        options: {
          environment: {
            PATH: '/usr/bin'
          }
        }
      };

      const environment = {
        pythonAvailable: true
      };

      const result = await validatorAPI.validateExecutionEnvironment(script, environment);
      expect(result.valid).toBe(true);
    });

    it('应该拒绝缺少Python环境的Python脚本', async () => {
      const script: Script = {
        id: 'test-script',
        name: 'test-script',
        type: ScriptType.PYTHON,
        description: 'Test script',
        content: 'print("Hello")',
        options: {}
      };

      const environment = {
        pythonAvailable: false
      };

      const result = await validatorAPI.validateExecutionEnvironment(script, environment);
      expect(result.valid).toBe(false);
    });
  });

  describe('getCodeConfigValidator', () => {
    it('应该返回底层CodeConfigValidator实例', () => {
      const validator = validatorAPI.getCodeConfigValidator();
      expect(validator).toBeDefined();
      expect(validator.constructor.name).toBe('CodeConfigValidator');
    });
  });
});