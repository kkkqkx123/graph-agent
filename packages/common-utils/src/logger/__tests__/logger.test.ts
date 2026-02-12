/**
 * Logger单元测试
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
import type { LogStream, LogEntry } from '../types';

describe('BaseLogger', () => {
  let mockStream: LogStream;
  let writtenEntries: LogEntry[];

  beforeEach(() => {
    writtenEntries = [];
    mockStream = {
      write: (entry: LogEntry) => {
        writtenEntries.push(entry);
      },
      flush: (callback?: () => void) => {
        if (callback) callback();
      }
    };
  });

  describe('构造函数', () => {
    it('应该使用默认选项创建实例', () => {
      const logger = createLogger();
      expect(logger.getLevel()).toBe('info');
    });

    it('应该使用自定义选项创建实例', () => {
      const logger = createLogger({
        level: 'debug',
        name: 'test-logger',
        stream: mockStream
      });
      expect(logger.getLevel()).toBe('debug');
    });

    it('应该合并基础上下文', () => {
      const logger = createLogger({
        base: { pkg: 'test-pkg', module: 'test-module' },
        stream: mockStream
      });
      logger.info('test message');
      expect(writtenEntries[0]?.context).toEqual({
        pkg: 'test-pkg',
        module: 'test-module'
      });
    });
  });

  describe('setLevel和getLevel', () => {
    it('应该设置和获取日志级别', () => {
      const logger = createLogger({ stream: mockStream });
      expect(logger.getLevel()).toBe('info');

      logger.setLevel('debug');
      expect(logger.getLevel()).toBe('debug');

      logger.setLevel('error');
      expect(logger.getLevel()).toBe('error');
    });
  });

  describe('isLevelEnabled', () => {
    it('应该正确判断日志级别是否启用', () => {
      const logger = createLogger({ level: 'info', stream: mockStream });

      expect(logger.isLevelEnabled('debug')).toBe(false);
      expect(logger.isLevelEnabled('info')).toBe(true);
      expect(logger.isLevelEnabled('warn')).toBe(true);
      expect(logger.isLevelEnabled('error')).toBe(true);
    });

    it('应该在debug级别时启用所有级别', () => {
      const logger = createLogger({ level: 'debug', stream: mockStream });

      expect(logger.isLevelEnabled('debug')).toBe(true);
      expect(logger.isLevelEnabled('info')).toBe(true);
      expect(logger.isLevelEnabled('warn')).toBe(true);
      expect(logger.isLevelEnabled('error')).toBe(true);
    });

    it('应该在error级别时只启用error级别', () => {
      const logger = createLogger({ level: 'error', stream: mockStream });

      expect(logger.isLevelEnabled('debug')).toBe(false);
      expect(logger.isLevelEnabled('info')).toBe(false);
      expect(logger.isLevelEnabled('warn')).toBe(false);
      expect(logger.isLevelEnabled('error')).toBe(true);
    });
  });

  describe('日志输出方法', () => {
    it('应该在级别启用时输出debug日志', () => {
      const logger = createLogger({ level: 'debug', stream: mockStream });
      logger.debug('debug message', { key: 'value' });

      expect(writtenEntries).toHaveLength(1);
      expect(writtenEntries[0]?.level).toBe('debug');
      expect(writtenEntries[0]?.message).toBe('debug message');
      expect(writtenEntries[0]?.context).toEqual({ key: 'value' });
      expect(writtenEntries[0]?.timestamp).toBeDefined();
    });

    it('应该在级别禁用时不输出debug日志', () => {
      const logger = createLogger({ level: 'info', stream: mockStream });
      logger.debug('debug message');

      expect(writtenEntries).toHaveLength(0);
    });

    it('应该输出info日志', () => {
      const logger = createLogger({ level: 'info', stream: mockStream });
      logger.info('info message', { userId: '123' });

      expect(writtenEntries).toHaveLength(1);
      expect(writtenEntries[0]?.level).toBe('info');
      expect(writtenEntries[0]?.message).toBe('info message');
      expect(writtenEntries[0]?.context).toEqual({ userId: '123' });
    });

    it('应该输出warn日志', () => {
      const logger = createLogger({ level: 'warn', stream: mockStream });
      logger.warn('warn message');

      expect(writtenEntries).toHaveLength(1);
      expect(writtenEntries[0]?.level).toBe('warn');
      expect(writtenEntries[0]?.message).toBe('warn message');
    });

    it('应该输出error日志', () => {
      const logger = createLogger({ level: 'error', stream: mockStream });
      logger.error('error message', { error: 'test error' });

      expect(writtenEntries).toHaveLength(1);
      expect(writtenEntries[0]?.level).toBe('error');
      expect(writtenEntries[0]?.message).toBe('error message');
      expect(writtenEntries[0]?.context).toEqual({ error: 'test error' });
    });

    it('应该合并基础上下文和日志上下文', () => {
      const logger = createLogger({
        base: { pkg: 'test-pkg' },
        stream: mockStream
      });
      logger.info('test message', { module: 'test-module' });

      expect(writtenEntries[0]?.context).toEqual({
        pkg: 'test-pkg',
        module: 'test-module'
      });
    });

    it('应该支持不包含时间戳', () => {
      const logger = createLogger({
        timestamp: false,
        stream: mockStream
      });
      logger.info('test message');

      expect(writtenEntries[0]?.timestamp).toBeUndefined();
    });
  });

  describe('child方法', () => {
    it('应该创建子记录器', () => {
      const parent = createLogger({
        name: 'parent',
        base: { pkg: 'test-pkg' },
        stream: mockStream
      });
      const child = parent.child('child', { module: 'child-module' });

      expect(child.getLevel()).toBe(parent.getLevel());
      child.info('child message');

      expect(writtenEntries[0]?.context).toEqual({
        pkg: 'test-pkg',
        module: 'child-module'
      });
    });

    it('子记录器应该继承父记录器的级别', () => {
      const parent = createLogger({
        level: 'debug',
        stream: mockStream
      });
      const child = parent.child('child');

      expect(child.getLevel()).toBe('debug');
      expect(child.isLevelEnabled('debug')).toBe(true);
    });

    it('子记录器应该共享父记录器的stream', () => {
      const parent = createLogger({ stream: mockStream });
      const child = parent.child('child');

      child.info('child message');
      expect(writtenEntries).toHaveLength(1);
    });

    it('子记录器应该合并名称', () => {
      const parent = createLogger({ name: 'parent', stream: mockStream });
      const child = parent.child('child');

      child.info('test message');
      // 名称应该在context中
      expect(writtenEntries[0]?.context?.module).toBe('child');
    });

    it('应该支持多级子记录器', () => {
      const parent = createLogger({
        name: 'parent',
        base: { pkg: 'root' },
        stream: mockStream
      });
      const child1 = parent.child('child1');
      const child2 = child1.child('child2');

      child2.info('nested message');
      expect(writtenEntries[0]?.context).toEqual({
        pkg: 'root',
        module: 'child2'
      });
    });
  });

  describe('flush方法', () => {
    it('应该调用stream的flush方法', (done) => {
      const flushCallback = jest.fn();
      const streamWithFlush: LogStream = {
        write: () => {},
        flush: (callback?: () => void) => {
          if (callback) callback();
        }
      };
      const logger = createLogger({ stream: streamWithFlush });

      if (logger.flush) {
        logger.flush(() => {
          done();
        });
      } else {
        done();
      }
    });

    it('应该在没有flush方法时不报错', () => {
      const streamWithoutFlush: LogStream = {
        write: () => {}
      };
      const logger = createLogger({ stream: streamWithoutFlush });

      expect(() => {
        if (logger.flush) {
          logger.flush();
        }
      }).not.toThrow();
    });
  });
});

describe('NoopLogger', () => {
  it('应该创建空操作日志器', () => {
    const logger = createNoopLogger();
    expect(logger.getLevel()).toBe('off');
  });

  it('不应该输出任何日志', () => {
    const logger = createNoopLogger();
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

    logger.debug('debug');
    logger.info('info');
    logger.warn('warn');
    logger.error('error');

    expect(consoleSpy).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('child应该返回自身', () => {
    const logger = createNoopLogger();
    const child = logger.child('child');

    expect(child).toBe(logger);
  });

  it('isLevelEnabled应该始终返回false', () => {
    const logger = createNoopLogger();

    expect(logger.isLevelEnabled('debug')).toBe(false);
    expect(logger.isLevelEnabled('info')).toBe(false);
    expect(logger.isLevelEnabled('warn')).toBe(false);
    expect(logger.isLevelEnabled('error')).toBe(false);
  });
});

describe('工厂函数', () => {
  let mockStream: LogStream;

  beforeEach(() => {
    mockStream = {
      write: () => {},
      flush: (callback?: () => void) => {
        if (callback) callback();
      }
    };
  });

  describe('createLogger', () => {
    it('应该创建基础日志器', () => {
      const logger = createLogger({ stream: mockStream });
      expect(logger).toBeDefined();
      expect(logger.getLevel()).toBe('info');
    });

    it('应该支持自定义配置', () => {
      const logger = createLogger({
        level: 'debug',
        name: 'custom',
        stream: mockStream
      });
      expect(logger.getLevel()).toBe('debug');
    });
  });

  describe('createPackageLogger', () => {
    it('应该创建包级别日志器', () => {
      const logger = createPackageLogger('test-pkg', { stream: mockStream });
      expect(logger).toBeDefined();
    });

    it('应该包含包名在上下文中', () => {
      const writtenEntries: LogEntry[] = [];
      const stream: LogStream = {
        write: (entry: LogEntry) => {
          writtenEntries.push(entry);
        }
      };
      const logger = createPackageLogger('test-pkg', { stream });
      logger.info('test message');

      expect(writtenEntries[0]?.context?.pkg).toBe('test-pkg');
    });
  });

  describe('createConsoleLogger', () => {
    it('应该创建console日志器', () => {
      const logger = createConsoleLogger('debug');
      expect(logger).toBeDefined();
      expect(logger.getLevel()).toBe('debug');
    });

    it('应该使用默认info级别', () => {
      const logger = createConsoleLogger();
      expect(logger.getLevel()).toBe('info');
    });
  });

  describe('createNoopLogger', () => {
    it('应该创建空操作日志器', () => {
      const logger = createNoopLogger();
      expect(logger.getLevel()).toBe('off');
    });
  });
});

describe('全局日志器', () => {
  let mockStream: LogStream;

  beforeEach(() => {
    mockStream = {
      write: () => {},
      flush: (callback?: () => void) => {
        if (callback) callback();
      }
    };
    // 重置全局日志器
    setGlobalLogger(createLogger({ stream: mockStream }));
  });

  describe('setGlobalLogger和getGlobalLogger', () => {
    it('应该设置和获取全局日志器', () => {
      const customLogger = createLogger({ level: 'debug', stream: mockStream });
      setGlobalLogger(customLogger);

      const global = getGlobalLogger();
      expect(global.getLevel()).toBe('debug');
    });

    it('应该默认创建info级别的全局日志器', () => {
      const global = getGlobalLogger();
      expect(global.getLevel()).toBe('info');
    });
  });

  describe('setGlobalLogLevel和getGlobalLogLevel', () => {
    it('应该设置全局日志级别', () => {
      setGlobalLogLevel('debug');
      expect(getGlobalLogLevel()).toBe('debug');

      setGlobalLogLevel('error');
      expect(getGlobalLogLevel()).toBe('error');
    });

    it('应该影响全局日志器的级别', () => {
      setGlobalLogLevel('debug');
      const global = getGlobalLogger();
      expect(global.getLevel()).toBe('debug');
    });

    it('应该支持NoopLogger', () => {
      setGlobalLogger(createNoopLogger());
      setGlobalLogLevel('debug');

      // 应该创建新的BaseLogger而不是修改NoopLogger
      const global = getGlobalLogger();
      expect(global.getLevel()).toBe('debug');
    });
  });
});