/**
 * APIFactory单元测试
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import {
  APIFactory,
  type SDKAPIConfig,
  type AllAPIs
} from '../api-factory';

describe('APIFactory', () => {
  let factory: APIFactory;

  beforeEach(() => {
    factory = APIFactory.getInstance();
    factory.reset();
  });

  afterEach(() => {
    factory.reset();
  });

  describe('单例模式', () => {
    it('应该是单例', () => {
      const instance1 = APIFactory.getInstance();
      const instance2 = APIFactory.getInstance();

      expect(instance1).toBe(instance2);
    });
  });

  describe('配置管理', () => {
    it('应该配置工厂', () => {
      const config: SDKAPIConfig = {
        workflow: { enableCache: false },
        tool: { enableLogging: true }
      };

      factory.configure(config);

      const result = factory.getConfig();

      expect(result.workflow?.enableCache).toBe(false);
      expect(result.tool?.enableLogging).toBe(true);
    });

    it('应该合并配置', () => {
      factory.configure({
        workflow: { enableCache: true }
      });

      factory.configure({
        workflow: { enableLogging: true }
      });

      const result = factory.getConfig();

      expect(result.workflow?.enableCache).toBe(true);
      expect(result.workflow?.enableLogging).toBe(true);
    });

    it('应该重置配置', () => {
      factory.configure({
        workflow: { enableCache: true }
      });

      factory.reset();

      const result = factory.getConfig();

      expect(result).toEqual({});
    });
  });

  describe('创建API实例', () => {
    it('应该创建WorkflowAPI', () => {
      const api = factory.createWorkflowAPI();

      expect(api).toBeDefined();
      expect(api.constructor.name).toBe('WorkflowRegistryAPI');
    });

    it('应该创建ToolAPI', () => {
      const api = factory.createToolAPI();

      expect(api).toBeDefined();
      expect(api.constructor.name).toBe('ToolRegistryAPI');
    });

    it('应该创建ThreadAPI', () => {
      const api = factory.createThreadAPI();

      expect(api).toBeDefined();
      expect(api.constructor.name).toBe('ThreadRegistryAPI');
    });

    it('应该创建ScriptAPI', () => {
      const api = factory.createScriptAPI();

      expect(api).toBeDefined();
      expect(api.constructor.name).toBe('ScriptRegistryAPI');
    });

    it('应该创建ProfileAPI', () => {
      const api = factory.createProfileAPI();

      expect(api).toBeDefined();
      expect(api.constructor.name).toBe('ProfileRegistryAPI');
    });

    it('应该创建NodeTemplateAPI', () => {
      const api = factory.createNodeTemplateAPI();

      expect(api).toBeDefined();
      expect(api.constructor.name).toBe('NodeRegistryAPI');
    });

    it('应该创建TriggerTemplateAPI', () => {
      const api = factory.createTriggerTemplateAPI();

      expect(api).toBeDefined();
      expect(api.constructor.name).toBe('TriggerTemplateRegistryAPI');
    });

    it('应该使用全局配置创建API', () => {
      factory.configure({
        workflow: { enableCache: false, enableLogging: true }
      });

      const api = factory.createWorkflowAPI();

      expect(api).toBeDefined();
    });

    it('应该覆盖全局配置', () => {
      factory.configure({
        workflow: { enableCache: true }
      });

      const api = factory.createWorkflowAPI({ enableCache: false });

      expect(api).toBeDefined();
    });

    it('应该缓存API实例', () => {
      const api1 = factory.createWorkflowAPI();
      const api2 = factory.createWorkflowAPI();

      expect(api1).toBe(api2);
    });

    it('应该在提供选项时重新创建实例', () => {
      const api1 = factory.createWorkflowAPI();
      const api2 = factory.createWorkflowAPI({ enableLogging: true });

      expect(api1).not.toBe(api2);
    });
  });

  describe('创建所有API', () => {
    it('应该创建所有API实例', () => {
      const apis = factory.createAllAPIs();

      expect(apis.workflows).toBeDefined();
      expect(apis.tools).toBeDefined();
      expect(apis.threads).toBeDefined();
      expect(apis.scripts).toBeDefined();
      expect(apis.profiles).toBeDefined();
      expect(apis.nodeTemplates).toBeDefined();
      expect(apis.triggerTemplates).toBeDefined();
    });

    it('应该返回相同的实例', () => {
      const apis1 = factory.createAllAPIs();
      const apis2 = factory.createAllAPIs();

      expect(apis1.workflows).toBe(apis2.workflows);
      expect(apis1.tools).toBe(apis2.tools);
      expect(apis1.threads).toBe(apis2.threads);
    });

    it('应该支持自定义配置', () => {
      const apis = factory.createAllAPIs({ enableLogging: true });

      expect(apis.workflows).toBeDefined();
      expect(apis.tools).toBeDefined();
    });
  });

  describe('清除实例', () => {
    it('应该清除所有缓存的实例', () => {
      factory.createWorkflowAPI();
      factory.createToolAPI();

      factory.clearInstances();

      const api1 = factory.createWorkflowAPI();
      const api2 = factory.createToolAPI();

      expect(api1).toBeDefined();
      expect(api2).toBeDefined();
    });
  });
});