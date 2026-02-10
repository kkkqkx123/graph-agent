/**
 * 发送通知处理函数单元测试
 */

import { sendNotificationHandler } from '../send-notification-handler';
import type { TriggerAction, TriggerExecutionResult } from '../../../../../types/trigger';
import { TriggerActionType } from '../../../../../types/trigger';
import { ValidationError } from '../../../../../types/errors';

describe('send-notification-handler', () => {
  let mockAction: TriggerAction;
  const triggerId = 'trigger-123';

  beforeEach(() => {
    mockAction = {
      type: TriggerActionType.SEND_NOTIFICATION,
      parameters: {
        message: 'Test notification message',
        recipients: ['user1@example.com', 'user2@example.com'],
        level: 'info'
      }
    };
  });

  describe('基本功能测试', () => {
    it('应该成功发送通知', async () => {
      const result = await sendNotificationHandler(mockAction, triggerId);

      expect(result).toMatchObject({
        triggerId,
        success: true,
        action: mockAction,
        result: {
          message: 'Notification sent successfully',
          notification: {
            message: 'Test notification message',
            recipients: ['user1@example.com', 'user2@example.com'],
            level: 'info',
            status: 'sent'
          }
        }
      });
      expect(result.executionTime).toBeGreaterThan(0);
    });

    it('应该使用默认的recipients数组当参数为空时', async () => {
      mockAction.parameters = {
        message: 'Test message'
      };

      const result = await sendNotificationHandler(mockAction, triggerId);

      expect(result.success).toBe(true);
      expect(result.result.notification.recipients).toEqual([]);
    });

    it('应该使用默认的level当参数为空时', async () => {
      mockAction.parameters = {
        message: 'Test message'
      };

      const result = await sendNotificationHandler(mockAction, triggerId);

      expect(result.success).toBe(true);
      expect(result.result.notification.level).toBe('info');
    });

    it('应该包含正确的时间戳', async () => {
      const startTime = Date.now();
      const result = await sendNotificationHandler(mockAction, triggerId);

      expect(result.result.notification.timestamp).toBeGreaterThanOrEqual(startTime);
      expect(result.result.notification.timestamp).toBeLessThanOrEqual(Date.now());
    });
  });

  describe('参数验证测试', () => {
    it('应该在缺少message参数时返回失败结果', async () => {
      mockAction.parameters = {
        recipients: ['user@example.com'],
        level: 'info'
      };

      const result = await sendNotificationHandler(mockAction, triggerId);

      expect(result.success).toBe(false);
      expect(result.error).toContain('message is required for SEND_NOTIFICATION action');
    });

    it('应该在message参数为空字符串时返回失败结果', async () => {
      mockAction.parameters = {
        message: '',
        recipients: ['user@example.com']
      };

      const result = await sendNotificationHandler(mockAction, triggerId);

      expect(result.success).toBe(false);
      expect(result.error).toContain('message is required for SEND_NOTIFICATION action');
    });

    it('应该在message参数为null时返回失败结果', async () => {
      mockAction.parameters = {
        message: null,
        recipients: ['user@example.com']
      };

      const result = await sendNotificationHandler(mockAction, triggerId);

      expect(result.success).toBe(false);
      expect(result.error).toContain('message is required for SEND_NOTIFICATION action');
    });

    it('应该在message参数为undefined时返回失败结果', async () => {
      mockAction.parameters = {
        message: undefined,
        recipients: ['user@example.com']
      };

      const result = await sendNotificationHandler(mockAction, triggerId);

      expect(result.success).toBe(false);
      expect(result.error).toContain('message is required for SEND_NOTIFICATION action');
    });
  });

  describe('通知级别测试', () => {
    it('应该支持不同的通知级别', async () => {
      const levels = ['info', 'warning', 'error', 'success'];

      for (const level of levels) {
        mockAction.parameters = {
          message: `Test ${level} message`,
          level
        };

        const result = await sendNotificationHandler(mockAction, triggerId);

        expect(result.success).toBe(true);
        expect(result.result.notification.level).toBe(level);
      }
    });

    it('应该处理自定义通知级别', async () => {
      mockAction.parameters = {
        message: 'Test message',
        level: 'custom-level'
      };

      const result = await sendNotificationHandler(mockAction, triggerId);

      expect(result.success).toBe(true);
      expect(result.result.notification.level).toBe('custom-level');
    });
  });

  describe('收件人列表测试', () => {
    it('应该处理空的收件人列表', async () => {
      mockAction.parameters = {
        message: 'Test message',
        recipients: []
      };

      const result = await sendNotificationHandler(mockAction, triggerId);

      expect(result.success).toBe(true);
      expect(result.result.notification.recipients).toEqual([]);
    });

    it('应该处理单个收件人', async () => {
      mockAction.parameters = {
        message: 'Test message',
        recipients: ['single@example.com']
      };

      const result = await sendNotificationHandler(mockAction, triggerId);

      expect(result.success).toBe(true);
      expect(result.result.notification.recipients).toEqual(['single@example.com']);
    });

    it('应该处理多个收件人', async () => {
      mockAction.parameters = {
        message: 'Test message',
        recipients: ['user1@example.com', 'user2@example.com', 'user3@example.com']
      };

      const result = await sendNotificationHandler(mockAction, triggerId);

      expect(result.success).toBe(true);
      expect(result.result.notification.recipients).toHaveLength(3);
    });

    it('应该处理不同类型的收件人标识符', async () => {
      const recipients = [
        'email@example.com',
        'user123',
        'group:admins',
        'slack:channel123'
      ];

      mockAction.parameters = {
        message: 'Test message',
        recipients
      };

      const result = await sendNotificationHandler(mockAction, triggerId);

      expect(result.success).toBe(true);
      expect(result.result.notification.recipients).toEqual(recipients);
    });
  });

  describe('错误处理测试', () => {
    it('应该在参数验证失败时返回失败结果', async () => {
      mockAction.parameters = {}; // 缺少message

      const result = await sendNotificationHandler(mockAction, triggerId);

      expect(result.success).toBe(false);
      expect(result.error).toContain('message is required');
    });

    it('应该记录执行时间即使验证失败', async () => {
      mockAction.parameters = {}; // 缺少message

      const result = await sendNotificationHandler(mockAction, triggerId);

      expect(result.executionTime).toBeGreaterThan(0);
    });
  });

  describe('边界情况测试', () => {
    it('应该处理非常长的消息', async () => {
      const longMessage = 'A'.repeat(1000);
      mockAction.parameters = {
        message: longMessage
      };

      const result = await sendNotificationHandler(mockAction, triggerId);

      expect(result.success).toBe(true);
      expect(result.result.notification.message).toBe(longMessage);
    });

    it('应该处理特殊字符的消息', async () => {
      const specialMessage = 'Test message with special chars: !@#$%^&*()_+-=[]{}|;:,.<>?';
      mockAction.parameters = {
        message: specialMessage
      };

      const result = await sendNotificationHandler(mockAction, triggerId);

      expect(result.success).toBe(true);
      expect(result.result.notification.message).toBe(specialMessage);
    });

    it('应该处理Unicode字符的消息', async () => {
      const unicodeMessage = '测试消息：中文、日本語、한국어 🚀';
      mockAction.parameters = {
        message: unicodeMessage
      };

      const result = await sendNotificationHandler(mockAction, triggerId);

      expect(result.success).toBe(true);
      expect(result.result.notification.message).toBe(unicodeMessage);
    });

    it('应该正确处理不同的triggerId格式', async () => {
      const testTriggerIds = [
        'trigger-1',
        '12345',
        'notification-trigger-id',
        ''
      ];

      for (const testTriggerId of testTriggerIds) {
        mockAction.parameters = {
          message: 'Test message'
        };

        const result = await sendNotificationHandler(mockAction, testTriggerId);

        expect(result.triggerId).toBe(testTriggerId);
        expect(result.success).toBe(true);
      }
    });
  });
});