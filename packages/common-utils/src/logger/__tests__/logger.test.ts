/**
 * Logger核心功能测试
 */

import {
  createLogger,
  createConsoleLogger,
  createNoopLogger,
  setGlobalLogger,
  getGlobalLogger,
  setGlobalLogLevel,
  getGlobalLogLevel
} from '../logger';
import { Logger, LogLevel } from '../types';

describe('Logger', () => {
  let mockOutput: jest.Mock;
  let logger: Logger;

  beforeEach(() => {
    mockOutput = jest.fn();
    logger = createLogger({
      level: 'debug',
      output: mockOutput
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createLogger', () => {
    it('应该创建logger实例', () => {
      expect(logger).toBeDefined();
      expect(typeof logger.debug).toBe('function');
      expect(typeof logger.info).toBe('function');
      expect(typeof logger.warn).toBe('function');
      expect(typeof logger.error).toBe('function');
    });

    it('应该使用默认级别info', () => {
      const defaultLogger = createLogger({ output: mockOutput });
      defaultLogger.debug('debug message');
      expect(mockOutput).not.toHaveBeenCalled();
    });

    it('应该支持自定义名称', () => {
      const namedLogger = createLogger({
        name: 'TestLogger',
        level: 'info',
        output: mockOutput
      });
      namedLogger.info('test message');
      expect(mockOutput).toHaveBeenCalledWith('info', expect.stringContaining('[TestLogger]'), undefined);
    });
  });

  describe('日志级别过滤', () => {
    it('debug级别应该输出所有日志', () => {
      const debugLogger = createLogger({ level: 'debug', output: mockOutput });
      debugLogger.debug('debug');
      debugLogger.info('info');
      debugLogger.warn('warn');
      debugLogger.error('error');
      expect(mockOutput).toHaveBeenCalledTimes(4);
    });

    it('info级别应该输出info及以上日志', () => {
      const infoLogger = createLogger({ level: 'info', output: mockOutput });
      infoLogger.debug('debug');
      infoLogger.info('info');
      infoLogger.warn('warn');
      infoLogger.error('error');
      expect(mockOutput).toHaveBeenCalledTimes(3);
    });

    it('warn级别应该输出warn及以上日志', () => {
      const warnLogger = createLogger({ level: 'warn', output: mockOutput });
      warnLogger.debug('debug');
      warnLogger.info('info');
      warnLogger.warn('warn');
      warnLogger.error('error');
      expect(mockOutput).toHaveBeenCalledTimes(2);
    });

    it('error级别应该只输出error日志', () => {
      const errorLogger = createLogger({ level: 'error', output: mockOutput });
      errorLogger.debug('debug');
      errorLogger.info('info');
      errorLogger.warn('warn');
      errorLogger.error('error');
      expect(mockOutput).toHaveBeenCalledTimes(1);
    });

    it('off级别不应该输出任何日志', () => {
      const offLogger = createLogger({ level: 'off', output: mockOutput });
      offLogger.debug('debug');
      offLogger.info('info');
      offLogger.warn('warn');
      offLogger.error('error');
      expect(mockOutput).not.toHaveBeenCalled();
    });
  });

  describe('上下文信息', () => {
    it('应该支持上下文信息', () => {
      logger.info('test message', { userId: '123', action: 'login' });
      expect(mockOutput).toHaveBeenCalledWith('info', 'test message', { userId: '123', action: 'login' });
    });

    it('应该支持undefined上下文', () => {
      logger.info('test message');
      expect(mockOutput).toHaveBeenCalledWith('info', 'test message', undefined);
    });
  });

  describe('createConsoleLogger', () => {
    it('应该创建console日志器', () => {
      const consoleLogger = createConsoleLogger('debug');
      expect(consoleLogger).toBeDefined();
      expect(typeof consoleLogger.debug).toBe('function');
    });

    it('应该使用默认info级别', () => {
      const consoleLogger = createConsoleLogger();
      expect(consoleLogger).toBeDefined();
    });
  });

  describe('createNoopLogger', () => {
    it('应该创建空操作日志器', () => {
      const noopLogger = createNoopLogger();
      expect(noopLogger).toBeDefined();
      
      // 所有方法都不应该抛出异常
      expect(() => {
        noopLogger.debug('debug');
        noopLogger.info('info');
        noopLogger.warn('warn');
        noopLogger.error('error');
      }).not.toThrow();
    });
  });

  describe('全局日志管理', () => {
    const originalGlobalLogger = getGlobalLogger();

    afterEach(() => {
      setGlobalLogger(originalGlobalLogger);
    });

    it('应该能够设置和获取全局日志器', () => {
      const customLogger = createLogger({ level: 'debug', output: mockOutput });
      setGlobalLogger(customLogger);
      expect(getGlobalLogger()).toBe(customLogger);
    });

    it('应该能够设置全局日志级别', () => {
      const globalLogger = getGlobalLogger();
      setGlobalLogLevel('debug');
      expect(getGlobalLogLevel()).toBe('debug');
      
      setGlobalLogLevel('error');
      expect(getGlobalLogLevel()).toBe('error');
    });

    it('全局日志器应该独立工作', () => {
      setGlobalLogLevel('debug');
      const globalLogger = getGlobalLogger();
      
      // 使用console输出进行测试
      const consoleSpy = jest.spyOn(console, 'info').mockImplementation();
      globalLogger.info('global message');
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('LoggerImpl级别管理', () => {
    it('应该能够动态设置日志级别', () => {
      const dynamicLogger = createLogger({ level: 'info', output: mockOutput });
      
      dynamicLogger.debug('debug message');
      expect(mockOutput).not.toHaveBeenCalled();
      
      // 设置为debug级别
      (dynamicLogger as any).setLevel('debug');
      dynamicLogger.debug('debug message');
      expect(mockOutput).toHaveBeenCalled();
    });

    it('应该能够获取当前日志级别', () => {
      const levelLogger = createLogger({ level: 'warn', output: mockOutput });
      const currentLevel = (levelLogger as any).getLevel();
      expect(currentLevel).toBe('warn');
    });
  });
});