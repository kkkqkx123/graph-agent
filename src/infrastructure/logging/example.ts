/**
 * 日志系统使用示例
 */

import { LogLevel } from '../../domain/common/types/logger-types';
import { LoggerFactory, LoggerConfigBuilder, LogOutputType, LogFormatType } from './index';

/**
 * 基本使用示例
 */
async function basicUsageExample(): Promise<void> {
  console.log('=== 基本使用示例 ===');

  // 创建默认日志记录器
  const logger = LoggerFactory.getInstance().createDefaultLogger();

  // 记录不同级别的日志
  logger.debug('这是调试信息', { userId: 123, action: 'login' });
  logger.info('这是一般信息');
  logger.warn('这是警告信息');
  logger.error('这是错误信息', new Error('示例错误'));
  logger.fatal('这是致命错误', new Error('致命错误示例'));

  // 创建子日志记录器
  const childLogger = LoggerFactory.getInstance().createChildLogger({ module: 'UserService', requestId: 'req-123' });
  childLogger.info('子日志记录器消息');

  await logger.flush?.();
  await logger.close?.();
}

/**
 * 自定义配置示例
 */
async function customConfigExample(): Promise<void> {
  console.log('\n=== 自定义配置示例 ===');

  // 使用配置构建器创建自定义配置
  const config = new LoggerConfigBuilder()
    .setLevel(LogLevel.DEBUG)
    .addConsoleOutput({
      level: LogLevel.DEBUG,
      format: LogFormatType.TEXT,
      colorize: true,
      timestamp: true,
    })
    .addFileOutput({
      level: LogLevel.INFO,
      format: LogFormatType.JSON,
      path: 'logs/example.log',
      rotation: 'daily' as any,
      max_size: '10MB',
      max_files: 5,
    })
    .setSensitiveData({
      patterns: ['password', 'token', 'sk-[a-zA-Z0-9]{20,}'],
      replacement: '***',
      enabled: true,
    })
    .setMeta({
      service: 'example-app',
      version: '1.0.0',
    })
    .build();

  // 创建自定义日志记录器
  const logger = LoggerFactory.getInstance().createLogger(config);

  // 测试敏感信息脱敏
  logger.info('用户登录', {
    email: 'user@example.com',
    password: 'secret123',
    token: 'sk-1234567890abcdef1234567890abcdef',
  });

  await logger.flush?.();
  await logger.close?.();
}

/**
 * 环境特定配置示例
 */
async function environmentSpecificExample(): Promise<void> {
  console.log('\n=== 环境特定配置示例 ===');

  // 开发环境日志记录器
  const devLogger = LoggerFactory.getInstance().createDevelopmentLogger();
  devLogger.debug('开发环境调试信息');

  // 生产环境日志记录器
  const prodLogger = LoggerFactory.getInstance().createProductionLogger();
  prodLogger.info('生产环境信息');

  // 测试环境日志记录器
  const testLogger = LoggerFactory.getInstance().createTestLogger();
  testLogger.error('测试环境错误');

  await devLogger.flush?.();
  await prodLogger.flush?.();
  await testLogger.flush?.();

  await devLogger.close?.();
  await prodLogger.close?.();
  await testLogger.close?.();
}

/**
 * 自定义传输器和格式化器示例
 */
async function customTransportExample(): Promise<void> {
  console.log('\n=== 自定义传输器和格式化器示例 ===');

  // 创建自定义日志记录器
  const logger = LoggerFactory.getInstance().createCustomLogger(
    LogLevel.INFO,
    [
      {
        type: LogOutputType.CONSOLE,
        format: LogFormatType.TEXT,
        config: {
          colorize: true,
          timestamp: true,
          separator: ' | ',
          prefix: '[CUSTOM]',
        },
      },
      {
        type: LogOutputType.FILE,
        format: LogFormatType.JSON,
        config: {
          path: 'logs/custom.log',
          pretty: true,
        },
      },
    ],
    { module: 'CustomExample' }
  );

  logger.info('自定义配置日志', { custom: true });
  logger.warn('自定义警告');

  await logger.flush?.();
  await logger.close?.();
}

/**
 * 性能测试示例
 */
async function performanceTest(): Promise<void> {
  console.log('\n=== 性能测试示例 ===');

  const logger = LoggerFactory.getInstance().createDevelopmentLogger();
  const startTime = Date.now();
  const messageCount = 1000;

  console.log(`开始记录 ${messageCount} 条日志...`);

  for (let i = 0; i < messageCount; i++) {
    logger.info(`性能测试消息 ${i}`, {
      index: i,
      timestamp: new Date().toISOString(),
      data: { foo: 'bar', baz: i },
    });
  }

  await logger.flush?.();
  const endTime = Date.now();
  const duration = endTime - startTime;

  console.log(`记录 ${messageCount} 条日志耗时: ${duration}ms`);
  console.log(`平均每条日志耗时: ${(duration / messageCount).toFixed(2)}ms`);

  await logger.close?.();
}

/**
 * 错误处理示例
 */
async function errorHandlingExample(): Promise<void> {
  console.log('\n=== 错误处理示例 ===');

  const logger = LoggerFactory.getInstance().createDefaultLogger();

  try {
    // 模拟一个会抛出错误的操作
    throw new Error('模拟的业务错误');
  } catch (error) {
    logger.error('操作失败', error as Error, {
      operation: 'simulateError',
      userId: 123,
      requestId: 'req-456',
    });
  }

  // 测试嵌套错误
  try {
    try {
      throw new Error('内部错误');
    } catch (innerError) {
      throw new Error(`外部错误: ${(innerError as Error).message}`);
    }
  } catch (outerError) {
    logger.error('嵌套错误', outerError as Error);
  }

  await logger.flush?.();
  await logger.close?.();
}

/**
 * 主函数 - 运行所有示例
 */
async function main(): Promise<void> {
  try {
    await basicUsageExample();
    await customConfigExample();
    await environmentSpecificExample();
    await customTransportExample();
    await performanceTest();
    await errorHandlingExample();

    console.log('\n=== 所有示例执行完成 ===');
  } catch (error) {
    console.error('示例执行失败:', error);
  } finally {
    // 关闭所有日志记录器
    await LoggerFactory.getInstance().closeAll();
  }
}

// 如果直接运行此文件，执行示例
if (require.main === module) {
  main().catch(console.error);
}

export {
  basicUsageExample,
  customConfigExample,
  environmentSpecificExample,
  customTransportExample,
  performanceTest,
  errorHandlingExample,
};
