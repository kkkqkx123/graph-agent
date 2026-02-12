/**
 * 日志工具函数测试
 */

import {
  formatLogMessage,
  mergeContext,
  formatContext,
  createConsoleOutput
} from '../utils';
import { LogLevel } from '../types';

describe('日志工具函数', () => {
  describe('formatLogMessage', () => {
    it('应该格式化日志消息', () => {
      const message = formatLogMessage('info', 'test message');
      expect(message).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z/); // ISO timestamp
      expect(message).toContain('[INFO]');
      expect(message).toContain('test message');
    });

    it('应该包含日志器名称', () => {
      const message = formatLogMessage('debug', 'debug message', 'TestLogger');
      expect(message).toContain('[TestLogger]');
      expect(message).toContain('[DEBUG]');
      expect(message).toContain('debug message');
    });

    it('应该正确处理不同日志级别', () => {
      const levels: LogLevel[] = ['debug', 'info', 'warn', 'error'];
      levels.forEach(level => {
        const message = formatLogMessage(level, 'test');
        expect(message).toContain(`[${level.toUpperCase()}]`);
      });
    });
  });

  describe('mergeContext', () => {
    it('应该合并两个上下文对象', () => {
      const base = { userId: '123' };
      const additional = { action: 'login' };
      const merged = mergeContext(base, additional);
      expect(merged).toEqual({ userId: '123', action: 'login' });
    });

    it('应该处理undefined基础上下文', () => {
      const additional = { action: 'login' };
      const merged = mergeContext(undefined, additional);
      expect(merged).toEqual({ action: 'login' });
    });

    it('应该处理undefined额外上下文', () => {
      const base = { userId: '123' };
      const merged = mergeContext(base, undefined);
      expect(merged).toEqual({ userId: '123' });
    });

    it('应该处理两个undefined', () => {
      const merged = mergeContext(undefined, undefined);
      expect(merged).toBeUndefined();
    });

    it('额外上下文应该覆盖基础上下文的同名属性', () => {
      const base = { userId: '123', action: 'old' };
      const additional = { action: 'new' };
      const merged = mergeContext(base, additional);
      expect(merged).toEqual({ userId: '123', action: 'new' });
    });
  });

  describe('formatContext', () => {
    it('应该格式化上下文对象', () => {
      const context = { userId: '123', action: 'login' };
      const formatted = formatContext(context);
      expect(formatted).toContain('userId');
      expect(formatted).toContain('123');
      expect(formatted).toContain('action');
      expect(formatted).toContain('login');
    });

    it('应该处理undefined上下文', () => {
      const formatted = formatContext(undefined);
      expect(formatted).toBe('');
    });

    it('应该处理空对象', () => {
      const formatted = formatContext({});
      expect(formatted).toBe('');
    });

    it('应该处理复杂对象', () => {
      const context = {
        user: { id: '123', name: 'test' },
        metadata: { timestamp: 1234567890 }
      };
      const formatted = formatContext(context);
      expect(formatted).toContain('user');
      expect(formatted).toContain('metadata');
    });

    it('应该处理无法序列化的对象', () => {
      const circular: any = { name: 'test' };
      circular.self = circular;
      const formatted = formatContext(circular);
      expect(formatted).toContain('无法序列化');
    });
  });

  describe('createConsoleOutput', () => {
    let consoleDebugSpy: jest.SpyInstance;
    let consoleInfoSpy: jest.SpyInstance;
    let consoleWarnSpy: jest.SpyInstance;
    let consoleErrorSpy: jest.SpyInstance;

    beforeEach(() => {
      consoleDebugSpy = jest.spyOn(console, 'debug').mockImplementation();
      consoleInfoSpy = jest.spyOn(console, 'info').mockImplementation();
      consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
      consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    });

    afterEach(() => {
      consoleDebugSpy.mockRestore();
      consoleInfoSpy.mockRestore();
      consoleWarnSpy.mockRestore();
      consoleErrorSpy.mockRestore();
    });

    it('应该为debug级别调用console.debug', () => {
      const output = createConsoleOutput();
      output('debug', 'debug message', { key: 'value' });
      expect(consoleDebugSpy).toHaveBeenCalled();
      expect(consoleDebugSpy).toHaveBeenCalledWith(
        expect.stringContaining('[DEBUG]'),
        expect.any(String)
      );
    });

    it('应该为info级别调用console.info', () => {
      const output = createConsoleOutput();
      output('info', 'info message', { key: 'value' });
      expect(consoleInfoSpy).toHaveBeenCalled();
      expect(consoleInfoSpy).toHaveBeenCalledWith(
        expect.stringContaining('[INFO]'),
        expect.any(String)
      );
    });

    it('应该为warn级别调用console.warn', () => {
      const output = createConsoleOutput();
      output('warn', 'warn message', { key: 'value' });
      expect(consoleWarnSpy).toHaveBeenCalled();
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('[WARN]'),
        expect.any(String)
      );
    });

    it('应该为error级别调用console.error', () => {
      const output = createConsoleOutput();
      output('error', 'error message', { key: 'value' });
      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('[ERROR]'),
        expect.any(String)
      );
    });

    it('应该包含时间戳', () => {
      const output = createConsoleOutput();
      output('info', 'test message');
      expect(consoleInfoSpy).toHaveBeenCalledWith(
        expect.stringMatching(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z/),
        expect.any(String)
      );
    });

    it('应该处理undefined上下文', () => {
      const output = createConsoleOutput();
      output('info', 'test message', undefined);
      expect(consoleInfoSpy).toHaveBeenCalled();
    });
  });
});