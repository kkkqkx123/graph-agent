/**
 * UserInteractionResourceAPI 单元测试
 */

import { UserInteractionResourceAPI, type UserInteractionConfig, type UserInteractionFilter } from '../user-interaction-resource-api';
import type { UserInteractionHandler, UserInteractionRequest } from '@modular-agent/types';
import { SingletonRegistry } from '@modular-agent/sdk/core/execution/context/singleton-registry';
import { EventManager } from '@modular-agent/sdk/core/services/event-manager';
import { EventType } from '@modular-agent/types';

// Mock SingletonRegistry
jest.mock('../../../../core/execution/context/singleton-registry');

describe('UserInteractionResourceAPI', () => {
  let api: UserInteractionResourceAPI;
  let mockEventManager: jest.Mocked<EventManager>;

  beforeEach(() => {
    // 创建mock EventManager
    mockEventManager = {
      on: jest.fn(),
      off: jest.fn(),
      emit: jest.fn()
    } as any;

    // 设置SingletonRegistry mock
    (SingletonRegistry.get as jest.Mock).mockReturnValue(mockEventManager);

    // 创建API实例
    api = new UserInteractionResourceAPI();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('处理器管理', () => {
    it('应该能够注册处理器', () => {
      const mockHandler: UserInteractionHandler = {
        handle: jest.fn()
      };

      api.registerHandler(mockHandler);

      expect(api.getHandler()).toBe(mockHandler);
      expect(api.hasHandler()).toBe(true);
    });

    it('应该能够清除处理器', () => {
      const mockHandler: UserInteractionHandler = {
        handle: jest.fn()
      };

      api.registerHandler(mockHandler);
      expect(api.hasHandler()).toBe(true);

      api.clearHandler();
      expect(api.hasHandler()).toBe(false);
      expect(api.getHandler()).toBeUndefined();
    });

    it('应该能够替换处理器', () => {
      const handler1: UserInteractionHandler = {
        handle: jest.fn()
      };
      const handler2: UserInteractionHandler = {
        handle: jest.fn()
      };

      api.registerHandler(handler1);
      api.registerHandler(handler2);

      expect(api.getHandler()).toBe(handler2);
    });
  });

  describe('交互处理', () => {
    it('应该能够成功处理交互请求', async () => {
      const mockHandler: UserInteractionHandler = {
        handle: jest.fn().mockResolvedValue('user input')
      };

      api.registerHandler(mockHandler);

      const request: UserInteractionRequest = {
        interactionId: 'test-interaction-1',
        operationType: 'confirm' as any,
        prompt: '请输入您的选择',
        timeout: 30000
      };

      const result = await api.handleInteraction(request);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe('user input');
      }
      expect(mockHandler.handle).toHaveBeenCalledWith(request, expect.any(Object));
    });

    it('应该在未注册处理器时返回错误', async () => {
      const request: UserInteractionRequest = {
        interactionId: 'test-interaction-1',
        operationType: 'confirm' as any,
        prompt: '请输入您的选择',
        timeout: 30000
      };

      const result = await api.handleInteraction(request);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error?.code).toBe('HANDLER_NOT_REGISTERED');
      }
    });

    it('应该能够处理处理器抛出的错误', async () => {
      const mockHandler: UserInteractionHandler = {
        handle: jest.fn().mockRejectedValue(new Error('Handler error'))
      };

      api.registerHandler(mockHandler);

      const request: UserInteractionRequest = {
        interactionId: 'test-interaction-1',
        operationType: 'confirm' as any,
        prompt: '请输入您的选择',
        timeout: 30000
      };

      const result = await api.handleInteraction(request);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error?.message).toContain('Handler error');
      }
    });
  });

  describe('事件订阅', () => {
    it('应该能够订阅用户交互请求事件', () => {
      const listener = jest.fn();

      api.onInteractionRequested(listener);

      expect(mockEventManager.on).toHaveBeenCalledWith(
        EventType.USER_INTERACTION_REQUESTED,
        listener
      );
    });

    it('应该能够取消订阅用户交互请求事件', () => {
      const listener = jest.fn();

      api.offInteractionRequested(listener);

      expect(mockEventManager.off).toHaveBeenCalledWith(
        EventType.USER_INTERACTION_REQUESTED,
        listener
      );
    });

    it('应该能够订阅用户交互响应事件', () => {
      const listener = jest.fn();

      api.onInteractionResponded(listener);

      expect(mockEventManager.on).toHaveBeenCalledWith(
        EventType.USER_INTERACTION_RESPONDED,
        listener
      );
    });

    it('应该能够订阅用户交互处理完成事件', () => {
      const listener = jest.fn();

      api.onInteractionProcessed(listener);

      expect(mockEventManager.on).toHaveBeenCalledWith(
        EventType.USER_INTERACTION_PROCESSED,
        listener
      );
    });

    it('应该能够订阅用户交互失败事件', () => {
      const listener = jest.fn();

      api.onInteractionFailed(listener);

      expect(mockEventManager.on).toHaveBeenCalledWith(
        EventType.USER_INTERACTION_FAILED,
        listener
      );
    });
  });

  describe('配置管理', () => {
    it('应该能够创建配置', async () => {
      const config: UserInteractionConfig = {
        id: 'config-1',
        name: 'Test Config',
        description: 'Test configuration',
        defaultTimeout: 30000
      };

      const result = await api.create(config);

      expect(result.success).toBe(true);

      const getResult = await api.get('config-1');
      expect(getResult.success).toBe(true);
      if (getResult.success) {
        expect(getResult.data).toEqual(config);
      }
    });

    it('应该能够更新配置', async () => {
      const config: UserInteractionConfig = {
        id: 'config-1',
        name: 'Test Config'
      };

      await api.create(config);

      const updateResult = await api.update('config-1', {
        description: 'Updated description'
      });

      expect(updateResult.success).toBe(true);

      const getResult = await api.get('config-1');
      if (getResult.success) {
        expect(getResult.data?.description).toBe('Updated description');
      }
    });

    it('应该能够删除配置', async () => {
      const config: UserInteractionConfig = {
        id: 'config-1',
        name: 'Test Config'
      };

      await api.create(config);
      await api.delete('config-1');

      const getResult = await api.get('config-1');
      if (getResult.success) {
        expect(getResult.data).toBeNull();
      }
    });

    it('应该能够获取所有配置', async () => {
      const config1: UserInteractionConfig = {
        id: 'config-1',
        name: 'Config 1'
      };
      const config2: UserInteractionConfig = {
        id: 'config-2',
        name: 'Config 2'
      };

      await api.create(config1);
      await api.create(config2);

      const result = await api.getAll();

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data?.length).toBe(2);
      }
    });

    it('应该能够过滤配置', async () => {
      const config1: UserInteractionConfig = {
        id: 'config-1',
        name: 'Test Config'
      };
      const config2: UserInteractionConfig = {
        id: 'config-2',
        name: 'Other Config'
      };

      await api.create(config1);
      await api.create(config2);

      const filter: UserInteractionFilter = {
        name: 'Test'
      };

      const result = await api.getAll(filter);

      expect(result.success).toBe(true);
      if (result.success && result.data && result.data.length > 0) {
        expect(result.data.length).toBe(1);
        expect(result.data[0]?.name).toBe('Test Config');
      }
    });

    it('应该能够获取配置数量', async () => {
      const config1: UserInteractionConfig = {
        id: 'config-1',
        name: 'Config 1'
      };
      const config2: UserInteractionConfig = {
        id: 'config-2',
        name: 'Config 2'
      };

      await api.create(config1);
      await api.create(config2);

      const result = await api.getConfigCount();

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe(2);
      }
    });

    it('应该能够清空所有配置', async () => {
      const config: UserInteractionConfig = {
        id: 'config-1',
        name: 'Test Config'
      };

      await api.create(config);
      await api.clear();

      const result = await api.getConfigCount();
      if (result.success) {
        expect(result.data).toBe(0);
      }
    });
  });

  describe('验证', () => {
    it('应该拒绝无效的配置', async () => {
      const invalidConfig = {
        id: 'config-1'
        // 缺少必需的name字段
      } as any;

      const result = await api.create(invalidConfig);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error?.code).toBe('VALIDATION_ERROR');
      }
    });
  });
});