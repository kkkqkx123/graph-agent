/**
 * Logger 模块单元测试
 * 测试日志系统的核心功能和工具函数
 */

import {
  createLogger,
  createPackageLogger,
  createConsoleLogger,
  createNoopLogger,
  setGlobalLogger,
  getGlobalLogger,
  setGlobalLogLevel,
  getGlobalLogLevel
} from '../logger';
import {
  shouldLog,
  formatTimestamp,
  createConsoleOutput,
  createAsyncOutput,
  mergeContext,
  formatContext
} from '../utils';
import { LOG_LEVEL_PRIORITY, LogLevel, LoggerContext, Logger } from '../types';

// Mock console 方法
const mockConsole = {
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
};

describe('Logger 模块测试', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Object.assign(console, mockConsole);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('工具函数测试', () => {
    describe('shouldLog', () => {
      it('应该正确判断日志级别是否应该输出', () => {
        expect(shouldLog('debug', 'debug')).toBe(true);
        expect(shouldLog('debug', 'info')).toBe(true);
        expect(shouldLog('debug', 'warn')).toBe(true);
        expect(shouldLog('debug', 'error')).toBe(true);
        
        expect(shouldLog('info', 'debug')).toBe(false);
        expect(shouldLog('info', 'info')).toBe(true);
        expect(shouldLog('info', 'warn')).toBe(true);
        expect(shouldLog('info', 'error')).toBe(true);
        
        expect(shouldLog('warn', 'debug')).toBe(false);
        expect(shouldLog('warn', 'info')).toBe(false);
        expect(shouldLog('warn', 'warn')).toBe(true);
        expect(shouldLog('warn', 'error')).toBe(true);
        
        expect(shouldLog('error', 'debug')).toBe(false);
        expect(shouldLog('error', 'info')).toBe(false);
        expect(shouldLog('error', 'warn')).toBe(false);
        expect(shouldLog('error', 'error')).toBe(true);
      });
    });

    describe('formatTimestamp', () => {
      it('应该返回 ISO 格式的时间戳', () => {
        const timestamp = formatTimestamp();
        expect(timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
      });
    });

    describe('mergeContext', () => {
      it('应该正确合并上下文对象', () => {
        const base: LoggerContext = { pkg: 'test', module: 'core' };
        const additional: LoggerContext = { userId: '123', action: 'login' };
        const merged = mergeContext(base, additional);
        
        expect(merged).toEqual({
          pkg: 'test',
          module: 'core',
          userId: '123',
          action: 'login'
        });
      });

      it('应该处理空对象', () => {
        const base: LoggerContext = { pkg: 'test' };
        const merged = mergeContext(base, {});
        expect(merged).toEqual({ pkg: 'test' });
      });

      it('应该处理 undefined', () => {
        const base: LoggerContext = { pkg: 'test' };
        const merged = mergeContext(base, undefined);
        expect(merged).toEqual({ pkg: 'test' });
      });
    });

    describe('formatContext', () => {
      it('应该正确格式化上下文', () => {
        const context: LoggerContext = { userId: '123', action: 'login' };
        const formatted = formatContext(context);
        expect(formatted).toBe('{"userId":"123","action":"login"}');
      });

      it('应该返回空字符串当上下文为空', () => {
        expect(formatContext({})).toBe('');
        expect(formatContext(undefined as any)).toBe('');
      });
    });

    describe('createConsoleOutput', () => {
      it('应该创建同步控制台输出函数', () => {
        const output = createConsoleOutput({ json: false, timestamp: true });
        
        output('info', 'Test message', { key: 'value' });
        
        expect(mockConsole.log).toHaveBeenCalled();
        const callArgs = mockConsole.log.mock.calls[0][0];
        expect(callArgs).toContain('[INFO]');
        expect(callArgs).toContain('Test message');
        expect(callArgs).toContain('key');
      });

      it('应该支持 JSON 格式输出', () => {
        const output = createConsoleOutput({ json: true, timestamp: true });
        
        output('info', 'Test message', { key: 'value' });
        
        expect(mockConsole.log).toHaveBeenCalled();
        const callArgs = mockConsole.log.mock.calls[0][0];
        const parsed = JSON.parse(callArgs);
        expect(parsed.level).toBe('info');
        expect(parsed.msg).toBe('Test message');
        expect(parsed.key).toBe('value');
        expect(parsed.time).toBeDefined();
      });

      it('应该支持不显示时间戳', () => {
        const output = createConsoleOutput({ json: false, timestamp: false });
        
        output('info', 'Test message');
        
        expect(mockConsole.log).toHaveBeenCalled();
        const callArgs = mockConsole.log.mock.calls[0][0];
        expect(callArgs).not.toMatch(/\[\d{4}-\d{2}-\d{2}T/);
      });

      it('应该根据日志级别使用不同的 console 方法', () => {
        const output = createConsoleOutput({ json: false, timestamp: false });
        
        output('debug', 'Debug message');
        expect(mockConsole.debug).toHaveBeenCalled();
        
        output('warn', 'Warn message');
        expect(mockConsole.warn).toHaveBeenCalled();
        
        output('error', 'Error message');
        expect(mockConsole.error).toHaveBeenCalled();
        
        output('info', 'Info message');
        expect(mockConsole.log).toHaveBeenCalled();
      });
    });

    describe('createAsyncOutput', () => {
      it('应该创建异步输出函数', (done) => {
        const output = createAsyncOutput({ json: false, timestamp: false, batchSize: 2 });
        
        output('info', 'Message 1');
        output('info', 'Message 2');
        
        setTimeout(() => {
          expect(mockConsole.log).toHaveBeenCalledTimes(2);
          done();
        }, 100);
      });

      it('应该批量处理日志', (done) => {
        const output = createAsyncOutput({ json: false, timestamp: false, batchSize: 3 });
        
        output('info', 'Message 1');
        output('info', 'Message 2');
        output('info', 'Message 3');
        
        setTimeout(() => {
          expect(mockConsole.log).toHaveBeenCalledTimes(3);
          done();
        }, 100);
      });
    });
  });

  describe('BaseLogger 测试', () => {
    describe('日志级别管理', () => {
      it('应该正确设置和获取日志级别', () => {
        const logger = createLogger({ level: 'info' });
        
        expect(logger.getLevel()).toBe('info');
        
        logger.setLevel('debug');
        expect(logger.getLevel()).toBe('debug');
        
        logger.setLevel('error');
        expect(logger.getLevel()).toBe('error');
      });

      it('应该正确判断日志级别是否启用', () => {
        const logger = createLogger({ level: 'warn' });
        
        expect(logger.isLevelEnabled('debug')).toBe(false);
        expect(logger.isLevelEnabled('info')).toBe(false);
        expect(logger.isLevelEnabled('warn')).toBe(true);
        expect(logger.isLevelEnabled('error')).toBe(true);
      });
    });

    describe('日志输出', () => {
      it('应该根据日志级别过滤输出', () => {
        const logger = createLogger({ level: 'warn' });
        
        logger.debug('Debug message');
        logger.info('Info message');
        logger.warn('Warn message');
        logger.error('Error message');
        
        expect(mockConsole.debug).not.toHaveBeenCalled();
        expect(mockConsole.log).not.toHaveBeenCalled();
        expect(mockConsole.warn).toHaveBeenCalledTimes(1);
        expect(mockConsole.error).toHaveBeenCalledTimes(1);
      });

      it('应该输出所有级别的日志当级别为 debug', () => {
        const logger = createLogger({ level: 'debug' });
        
        logger.debug('Debug message');
        logger.info('Info message');
        logger.warn('Warn message');
        logger.error('Error message');
        
        expect(mockConsole.debug).toHaveBeenCalledTimes(1);
        expect(mockConsole.log).toHaveBeenCalledTimes(1);
        expect(mockConsole.warn).toHaveBeenCalledTimes(1);
        expect(mockConsole.error).toHaveBeenCalledTimes(1);
      });

      it('应该支持上下文信息', () => {
        const logger = createLogger({ level: 'info', timestamp: false });
        
        logger.info('Test message', { userId: '123', action: 'login' });
        
        expect(mockConsole.log).toHaveBeenCalled();
        const callArgs = mockConsole.log.mock.calls[0][0];
        expect(callArgs).toContain('Test message');
        expect(callArgs).toContain('userId');
      });

      it('应该合并 logger 上下文和调用上下文', () => {
        const logger = createLogger({ 
          level: 'info', 
          timestamp: false,
          name: 'TestModule'
        });
        
        logger.info('Test message', { userId: '123' });
        
        expect(mockConsole.log).toHaveBeenCalled();
      });
    });

    describe('Child Logger', () => {
      it('应该创建子记录器', () => {
        const parentLogger = createLogger({ level: 'info', name: 'Parent' });
        const childLogger = parentLogger.child('Child');
        
        expect(childLogger).toBeDefined();
        expect(childLogger.getLevel()).toBe('info');
      });

      it('子记录器应该继承父记录器的配置', () => {
        const parentLogger = createLogger({ level: 'debug', name: 'Parent' });
        const childLogger = parentLogger.child('Child');
        
        expect(childLogger.getLevel()).toBe('debug');
      });

      it('子记录器的级别设置应该独立于父记录器', () => {
        const parentLogger = createLogger({ level: 'debug', name: 'Parent' });
        const childLogger = parentLogger.child('Child');
        
        childLogger.setLevel('error');
        
        expect(parentLogger.getLevel()).toBe('debug');
        expect(childLogger.getLevel()).toBe('error');
      });

      it('子记录器应该合并上下文', () => {
        const parentLogger = createLogger({ level: 'info', name: 'Parent' });
        const childLogger = parentLogger.child('Child', { extra: 'value' });
        
        childLogger.info('Test message');
        
        expect(mockConsole.log).toHaveBeenCalled();
      });
    });
  });

  describe('工厂函数测试', () => {
    describe('createLogger', () => {
      it('应该创建默认配置的日志器', () => {
        const logger = createLogger();
        
        expect(logger.getLevel()).toBe('info');
        expect(logger.isLevelEnabled('info')).toBe(true);
      });

      it('应该创建自定义配置的日志器', () => {
        const logger = createLogger({ level: 'debug', name: 'TestLogger' });
        
        expect(logger.getLevel()).toBe('debug');
        expect(logger.isLevelEnabled('debug')).toBe(true);
      });

      it('应该支持异步输出', () => {
        const logger = createLogger({ level: 'info', async: true });
        
        logger.info('Async message');
        
        expect(mockConsole.log).not.toHaveBeenCalled();
      });
    });

    describe('createPackageLogger', () => {
      it('应该创建包级别日志器', () => {
        const logger = createPackageLogger('test-package');
        
        expect(logger.getLevel()).toBe('info');
        expect(logger.isLevelEnabled('info')).toBe(true);
      });

      it('应该支持自定义配置', () => {
        const logger = createPackageLogger('test-package', { level: 'debug' });
        
        expect(logger.getLevel()).toBe('debug');
      });
    });

    describe('createConsoleLogger', () => {
      it('应该创建控制台日志器', () => {
        const logger = createConsoleLogger('warn');
        
        expect(logger.getLevel()).toBe('warn');
        expect(logger.isLevelEnabled('warn')).toBe(true);
      });

      it('应该使用默认级别 info', () => {
        const logger = createConsoleLogger();
        
        expect(logger.getLevel()).toBe('info');
      });
    });

    describe('createNoopLogger', () => {
      it('应该创建空操作日志器', () => {
        const logger = createNoopLogger();
        
        expect(logger.getLevel()).toBe('off');
        expect(logger.isLevelEnabled('debug')).toBe(false);
        expect(logger.isLevelEnabled('info')).toBe(false);
        expect(logger.isLevelEnabled('warn')).toBe(false);
        expect(logger.isLevelEnabled('error')).toBe(false);
      });

      it('空操作日志器不应该输出任何日志', () => {
        const logger = createNoopLogger();
        
        logger.debug('Debug message');
        logger.info('Info message');
        logger.warn('Warn message');
        logger.error('Error message');
        
        expect(mockConsole.debug).not.toHaveBeenCalled();
        expect(mockConsole.log).not.toHaveBeenCalled();
        expect(mockConsole.warn).not.toHaveBeenCalled();
        expect(mockConsole.error).not.toHaveBeenCalled();
      });

      it('空操作日志器的 child 应该返回自身', () => {
        const logger = createNoopLogger();
        const child = logger.child('Child');
        
        expect(child).toBe(logger);
      });
    });
  });

  describe('全局日志器测试', () => {
    beforeEach(() => {
      setGlobalLogger(createLogger({ level: 'info' }));
    });

    describe('setGlobalLogger 和 getGlobalLogger', () => {
      it('应该设置和获取全局日志器', () => {
        const customLogger = createLogger({ level: 'debug' });
        setGlobalLogger(customLogger);
        
        const retrieved = getGlobalLogger();
        expect(retrieved).toBe(customLogger);
        expect(retrieved.getLevel()).toBe('debug');
      });
    });

    describe('setGlobalLogLevel 和 getGlobalLogLevel', () => {
      it('应该设置和获取全局日志级别', () => {
        setGlobalLogLevel('debug');
        expect(getGlobalLogLevel()).toBe('debug');
        
        setGlobalLogLevel('error');
        expect(getGlobalLogLevel()).toBe('error');
      });

      it('应该影响全局日志器的行为', () => {
        setGlobalLogLevel('warn');
        const logger = getGlobalLogger();
        
        logger.debug('Debug message');
        logger.info('Info message');
        logger.warn('Warn message');
        
        expect(mockConsole.debug).not.toHaveBeenCalled();
        expect(mockConsole.log).not.toHaveBeenCalled();
        expect(mockConsole.warn).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('集成测试', () => {
    it('应该支持完整的日志器使用场景', () => {
      const pkgLogger = createPackageLogger('my-package', { level: 'debug', timestamp: false });
      
      const moduleLogger = pkgLogger.child('my-module');
      
      moduleLogger.debug('Debug info', { value: 123 });
      moduleLogger.info('Process started', { processId: 'abc' });
      moduleLogger.warn('Cache miss', { key: 'user:123' });
      moduleLogger.error('API failed', { error: 'timeout' });
      
      expect(mockConsole.debug).toHaveBeenCalledTimes(1);
      expect(mockConsole.log).toHaveBeenCalledTimes(1);
      expect(mockConsole.warn).toHaveBeenCalledTimes(1);
      expect(mockConsole.error).toHaveBeenCalledTimes(1);
    });

    it('应该支持 JSON 格式的完整场景', () => {
      const logger = createLogger({ level: 'info', json: true, timestamp: false });
      
      logger.info('User login', { userId: '123', ip: '192.168.1.1' });
      
      expect(mockConsole.log).toHaveBeenCalled();
      const callArgs = mockConsole.log.mock.calls[0][0];
      const parsed = JSON.parse(callArgs);
      expect(parsed.level).toBe('info');
      expect(parsed.msg).toBe('User login');
      expect(parsed.userId).toBe('123');
      expect(parsed.ip).toBe('192.168.1.1');
    });
  });

  describe('边界情况测试', () => {
    it('应该处理空消息', () => {
      const logger = createLogger({ level: 'info', timestamp: false });
      
      logger.info('');
      
      expect(mockConsole.log).toHaveBeenCalled();
    });

    it('应该处理空上下文', () => {
      const logger = createLogger({ level: 'info', timestamp: false });
      
      logger.info('Test message', {});
      
      expect(mockConsole.log).toHaveBeenCalled();
    });

    it('应该处理 undefined 上下文', () => {
      const logger = createLogger({ level: 'info', timestamp: false });
      
      logger.info('Test message', undefined as any);
      
      expect(mockConsole.log).toHaveBeenCalled();
    });

    it('应该处理特殊字符', () => {
      const logger = createLogger({ level: 'info', timestamp: false });
      
      logger.info('Test with special chars: \n\t\r', { key: 'value with "quotes"' });
      
      expect(mockConsole.log).toHaveBeenCalled();
    });

    it('应该处理嵌套对象', () => {
      const logger = createLogger({ level: 'info', timestamp: false });
      
      logger.info('Nested object', { 
        user: { 
          id: '123', 
          profile: { 
            name: 'Test User',
            settings: { theme: 'dark' }
          } 
        } 
      });
      
      expect(mockConsole.log).toHaveBeenCalled();
    });
  });
});