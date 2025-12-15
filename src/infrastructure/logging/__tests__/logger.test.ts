/**
 * 日志系统测试
 */

import { 
  LoggerFactory, 
  LoggerConfigBuilder, 
  LogLevel, 
  LogOutputType, 
  LogFormatType 
} from '../index';

describe('日志系统测试', () => {
  let loggerFactory: LoggerFactory;

  beforeEach(() => {
    loggerFactory = LoggerFactory.getInstance();
  });

  afterEach(async () => {
    await loggerFactory.closeAll();
  });

  describe('基本功能测试', () => {
    test('应该能够创建默认日志记录器', () => {
      const logger = loggerFactory.createDefaultLogger();
      expect(logger).toBeDefined();
      expect(logger.getTransportCount()).toBeGreaterThan(0);
    });

    test('应该能够记录不同级别的日志', () => {
      const logger = loggerFactory.createTestLogger();
      
      // 模拟console输出
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      logger.trace('跟踪信息');
      logger.debug('调试信息');
      logger.info('一般信息');
      logger.warn('警告信息');
      logger.error('错误信息');
      logger.fatal('致命错误');
      
      // 验证console被调用
      expect(consoleSpy).toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });

    test('应该能够创建子日志记录器', () => {
      const parentLogger = loggerFactory.createTestLogger();
      const childLogger = parentLogger.child({ module: 'TestModule' });
      
      expect(childLogger).toBeDefined();
      expect(childLogger).not.toBe(parentLogger);
    });
  });

  describe('配置测试', () => {
    test('应该能够使用自定义配置创建日志记录器', () => {
      const config = new LoggerConfigBuilder()
        .setLevel(LogLevel.DEBUG)
        .addConsoleOutput({
          level: LogLevel.DEBUG,
          format: LogFormatType.TEXT
        })
        .build();

      const logger = loggerFactory.createLogger(config);
      expect(logger).toBeDefined();
      expect(logger.getConfig().level).toBe(LogLevel.DEBUG);
    });

    test('应该能够更新日志配置', () => {
      const logger = loggerFactory.createTestLogger();
      const originalLevel = logger.getConfig().level;
      
      logger.updateConfig({ level: LogLevel.ERROR });
      expect(logger.getConfig().level).toBe(LogLevel.ERROR);
      expect(logger.getConfig().level).not.toBe(originalLevel);
    });
  });

  describe('环境特定配置测试', () => {
    test('应该能够创建开发环境日志记录器', () => {
      const logger = loggerFactory.createDevelopmentLogger();
      expect(logger).toBeDefined();
      expect(logger.getConfig().level).toBe(LogLevel.DEBUG);
    });

    test('应该能够创建生产环境日志记录器', () => {
      const logger = loggerFactory.createProductionLogger();
      expect(logger).toBeDefined();
      expect(logger.getConfig().level).toBe(LogLevel.INFO);
    });

    test('应该能够创建测试环境日志记录器', () => {
      const logger = loggerFactory.createTestLogger();
      expect(logger).toBeDefined();
      expect(logger.getConfig().level).toBe(LogLevel.ERROR);
    });
  });

  describe('格式化器测试', () => {
    test('应该能够使用JSON格式化器', () => {
      const logger = loggerFactory.createCustomLogger(
        LogLevel.INFO,
        [{
          type: LogOutputType.CONSOLE,
          format: LogFormatType.JSON
        }]
      );
      
      expect(logger).toBeDefined();
      
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      logger.info('测试消息', { key: 'value' });
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('"message":"测试消息"')
      );
      
      consoleSpy.mockRestore();
    });

    test('应该能够使用文本格式化器', () => {
      const logger = loggerFactory.createCustomLogger(
        LogLevel.INFO,
        [{
          type: LogOutputType.CONSOLE,
          format: LogFormatType.TEXT
        }]
      );
      
      expect(logger).toBeDefined();
      
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      logger.info('测试消息');
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('测试消息')
      );
      
      consoleSpy.mockRestore();
    });
  });

  describe('传输器测试', () => {
    test('应该能够使用控制台传输器', () => {
      const logger = loggerFactory.createCustomLogger(
        LogLevel.INFO,
        [{
          type: LogOutputType.CONSOLE,
          format: LogFormatType.TEXT
        }]
      );
      
      expect(logger).toBeDefined();
      expect(logger.hasEnabledTransports()).toBe(true);
    });

    test('应该能够使用文件传输器', () => {
      const logger = loggerFactory.createCustomLogger(
        LogLevel.INFO,
        [{
          type: LogOutputType.FILE,
          format: LogFormatType.JSON,
          config: {
            path: 'logs/test.log'
          }
        }]
      );
      
      expect(logger).toBeDefined();
      expect(logger.hasEnabledTransports()).toBe(true);
    });
  });

  describe('错误处理测试', () => {
    test('应该能够记录错误信息', () => {
      const logger = loggerFactory.createTestLogger();
      const error = new Error('测试错误');
      
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      logger.error('发生错误', error);
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('发生错误')
      );
      
      consoleSpy.mockRestore();
    });

    test('应该能够处理嵌套错误', () => {
      const logger = loggerFactory.createTestLogger();
      
      try {
        try {
          throw new Error('内部错误');
        } catch (innerError) {
          throw new Error(`外部错误: ${(innerError as Error).message}`);
        }
      } catch (outerError) {
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
        
        logger.error('嵌套错误', outerError as Error);
        
        expect(consoleSpy).toHaveBeenCalled();
        
        consoleSpy.mockRestore();
      }
    });
  });

  describe('性能测试', () => {
    test('应该能够处理大量日志记录', async () => {
      const logger = loggerFactory.createTestLogger();
      const messageCount = 100;
      const startTime = Date.now();
      
      for (let i = 0; i < messageCount; i++) {
        logger.info(`性能测试消息 ${i}`);
      }
      
      await logger.flush();
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // 验证性能在合理范围内（每条日志不超过10ms）
      expect(duration).toBeLessThan(messageCount * 10);
    });
  });

  describe('敏感数据脱敏测试', () => {
    test('应该能够脱敏敏感信息', () => {
      const config = new LoggerConfigBuilder()
        .setLevel(LogLevel.INFO)
        .addConsoleOutput({
          level: LogLevel.INFO,
          format: LogFormatType.TEXT
        })
        .setSensitiveData({
          patterns: ['password', 'token'],
          replacement: '***',
          enabled: true
        })
        .build();

      const logger = loggerFactory.createLogger(config);
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      logger.info('用户登录', { 
        password: 'secret123',
        token: 'abc123',
        username: 'testuser'
      });
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('***')
      );
      expect(consoleSpy).not.toHaveBeenCalledWith(
        expect.stringContaining('secret123')
      );
      
      consoleSpy.mockRestore();
    });
  });

  describe('生命周期测试', () => {
    test('应该能够正确关闭日志记录器', async () => {
      const logger = loggerFactory.createTestLogger();
      
      expect(logger.getTransportCount()).toBeGreaterThan(0);
      
      await logger.close();
      
      // 关闭后传输器数量应该为0
      expect(logger.getTransportCount()).toBe(0);
    });

    test('应该能够刷新日志缓冲区', async () => {
      const logger = loggerFactory.createTestLogger();
      
      // 记录一些日志
      logger.info('测试消息');
      
      // 刷新应该不会抛出错误
      await expect(logger.flush()).resolves.not.toThrow();
      
      await logger.close();
    });
  });
});