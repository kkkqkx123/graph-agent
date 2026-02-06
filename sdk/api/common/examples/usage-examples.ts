/**
 * Command模式使用示例
 * 展示如何使用CommandExecutor和中间件
 */

import { CommandExecutor } from '../../common/command-executor';
import { LoggingMiddleware, ValidationMiddleware, CacheMiddleware, MetricsMiddleware, RetryMiddleware } from '../../types/command-middleware';
import {
  GreetingCommand,
  CalculateCommand,
  ExecuteWorkflowCommand,
  CounterCommand,
  SyncAddCommand
} from './example-commands';
import { success, failure, isSuccess } from '../../types/execution-result';

/**
 * 示例1: 基本使用
 */
export async function basicUsageExample() {
  console.log('=== 基本使用示例 ===');

  // 创建执行器
  const executor = new CommandExecutor();

  // 创建并执行命令
  const command = new GreetingCommand('World');
  const result = await executor.execute(command);

  if (isSuccess(result)) {
    console.log('成功:', result.data);
  } else {
    console.error('失败:', result.error);
  }
}

/**
 * 示例2: 使用中间件
 */
export async function middlewareExample() {
  console.log('\n=== 中间件使用示例 ===');

  // 创建执行器
  const executor = new CommandExecutor();

  // 添加中间件
  executor.addMiddleware(new LoggingMiddleware());
  executor.addMiddleware(new ValidationMiddleware());

  // 执行命令
  const command = new GreetingCommand('Alice');
  const result = await executor.execute(command);

  if (isSuccess(result)) {
    console.log('结果:', result.data);
  }
}

/**
 * 示例3: 使用缓存中间件
 */
export async function cacheExample() {
  console.log('\n=== 缓存中间件示例 ===');

  // 创建执行器
  const executor = new CommandExecutor();

  // 添加缓存中间件（TTL: 5秒）
  const cacheMiddleware = new CacheMiddleware(5000);
  executor.addMiddleware(cacheMiddleware);

  // 执行相同的命令两次
  const command1 = new CalculateCommand(10, 20, 'add');
  const command2 = new CalculateCommand(10, 20, 'add');

  console.log('第一次执行...');
  const result1 = await executor.execute(command1);
  console.log('第二次执行（应该使用缓存）...');
  const result2 = await executor.execute(command2);

  console.log('结果1:', result1);
  console.log('结果2:', result2);

  // 清空缓存
  cacheMiddleware.clearCache();
}

/**
 * 示例4: 使用指标收集中间件
 */
export async function metricsExample() {
  console.log('\n=== 指标收集中间件示例 ===');

  // 创建执行器
  const executor = new CommandExecutor();

  // 添加指标收集中间件
  const metricsMiddleware = new MetricsMiddleware();
  executor.addMiddleware(metricsMiddleware);

  // 执行多个命令
  await executor.execute(new CalculateCommand(10, 20, 'add'));
  await executor.execute(new CalculateCommand(10, 20, 'subtract'));
  await executor.execute(new CalculateCommand(10, 20, 'multiply'));
  await executor.execute(new CalculateCommand(10, 0, 'divide')); // 会失败

  // 获取指标
  const metrics = metricsMiddleware.getMetrics();
  console.log('执行指标:');
  metrics.forEach((value, key) => {
    console.log(`  ${key}:`, value);
  });
}

/**
 * 示例5: 使用重试中间件
 */
export async function retryExample() {
  console.log('\n=== 重试中间件示例 ===');

  // 创建执行器
  const executor = new CommandExecutor();

  // 添加重试中间件（最多重试3次，延迟1秒）
  const retryMiddleware = new RetryMiddleware(3, 1000);
  executor.addMiddleware(retryMiddleware);

  // 执行会失败的命令
  const command = new CalculateCommand(10, 0, 'divide');
  const result = await executor.execute(command);

  console.log('结果:', result);
}

/**
 * 示例6: 批量执行
 */
export async function batchExecutionExample() {
  console.log('\n=== 批量执行示例 ===');

  // 创建执行器
  const executor = new CommandExecutor();

  // 创建多个命令
  const commands = [
    new GreetingCommand('Alice'),
    new GreetingCommand('Bob'),
    new GreetingCommand('Charlie')
  ];

  // 串行执行
  console.log('串行执行:');
  const serialResults = await executor.executeBatch(commands, false);
  serialResults.forEach((result, index) => {
    console.log(`  命令${index + 1}:`, isSuccess(result) ? result.data : result.error);
  });

  // 并行执行
  console.log('\n并行执行:');
  const parallelResults = await executor.executeBatch(commands, true);
  parallelResults.forEach((result, index) => {
    console.log(`  命令${index + 1}:`, isSuccess(result) ? result.data : result.error);
  });
}

/**
 * 示例7: 工作流执行
 */
export async function workflowExecutionExample() {
  console.log('\n=== 工作流执行示例 ===');

  // 创建执行器
  const executor = new CommandExecutor();

  // 添加中间件
  executor.addMiddleware(new LoggingMiddleware());
  executor.addMiddleware(new ValidationMiddleware());

  // 创建工作流执行命令
  const command = new ExecuteWorkflowCommand({
    workflowId: 'workflow-123',
    input: {
      message: 'Hello, World!',
      timestamp: Date.now()
    }
  });

  // 执行命令
  const result = await executor.execute(command);

  if (isSuccess(result)) {
    console.log('工作流执行成功:');
    console.log('  Thread ID:', result.data.threadId);
    console.log('  Status:', result.data.status);
    console.log('  Output:', result.data.output);
  } else {
    console.error('工作流执行失败:', result.error);
  }
}

/**
 * 示例8: 支持撤销的命令
 */
export async function undoExample() {
  console.log('\n=== 撤销命令示例 ===');

  // 创建执行器
  const executor = new CommandExecutor();

  // 重置计数器
  CounterCommand.resetCounter();
  console.log('初始计数:', CounterCommand.getCounter());

  // 执行命令
  const command = new CounterCommand();
  const result1 = await executor.execute(command);
  console.log('执行后计数:', CounterCommand.getCounter());

  // 撤销命令
  if (command.undo) {
    const undoResult = await command.undo();
    console.log('撤销后计数:', CounterCommand.getCounter());
  }
}

/**
 * 示例9: 同步命令
 */
export async function syncCommandExample() {
  console.log('\n=== 同步命令示例 ===');

  // 创建执行器
  const executor = new CommandExecutor();

  // 创建同步命令
  const command = new SyncAddCommand(10, 20);

  // 执行命令
  const result = await executor.execute(command);

  if (isSuccess(result)) {
    console.log('结果:', result.data);
  }
}

/**
 * 示例10: 组合使用多个中间件
 */
export async function combinedMiddlewareExample() {
  console.log('\n=== 组合中间件示例 ===');

  // 创建执行器
  const executor = new CommandExecutor();

  // 添加多个中间件
  executor.addMiddleware(new LoggingMiddleware());
  executor.addMiddleware(new ValidationMiddleware());
  executor.addMiddleware(new CacheMiddleware(10000));
  executor.addMiddleware(new MetricsMiddleware());

  // 执行命令
  const command = new CalculateCommand(100, 200, 'multiply');
  const result = await executor.execute(command);

  if (isSuccess(result)) {
    console.log('结果:', result.data);
  }

  // 获取指标
  const metricsMiddleware = executor.getMiddlewareCount() > 0
    ? executor['middleware'].find((m: any) => m instanceof MetricsMiddleware)
    : null;

  if (metricsMiddleware) {
    const metrics = metricsMiddleware.getMetrics();
    console.log('指标:', metrics);
  }
}

/**
 * 运行所有示例
 */
export async function runAllExamples() {
  try {
    await basicUsageExample();
    await middlewareExample();
    await cacheExample();
    await metricsExample();
    await retryExample();
    await batchExecutionExample();
    await workflowExecutionExample();
    await undoExample();
    await syncCommandExample();
    await combinedMiddlewareExample();

    console.log('\n=== 所有示例执行完成 ===');
  } catch (error) {
    console.error('示例执行出错:', error);
  }
}

// 如果直接运行此文件，执行所有示例
if (require.main === module) {
  runAllExamples();
}