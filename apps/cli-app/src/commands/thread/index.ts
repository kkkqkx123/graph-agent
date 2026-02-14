/**
 * 线程命令组
 */

import { Command } from 'commander';
import { ThreadAdapter } from '../../adapters/thread-adapter';
import { createLogger } from '../../utils/logger';
import { formatThread, formatThreadList } from '../../utils/formatter';
import type { CommandOptions } from '../../types/cli-types';

const logger = createLogger();

/**
 * 创建线程命令组
 */
export function createThreadCommands(): Command {
  const threadCmd = new Command('thread')
    .description('管理线程');

  // 执行线程命令
  threadCmd
    .command('run <workflow-id>')
    .description('执行工作流线程')
    .option('-i, --input <json>', '输入数据(JSON格式)')
    .option('-v, --verbose', '详细输出')
    .action(async (workflowId, options: CommandOptions & { input?: string }) => {
      try {
        logger.info(`正在启动线程: ${workflowId}`);

        let inputData: Record<string, unknown> = {};
        if (options.input) {
          try {
            inputData = JSON.parse(options.input);
          } catch (error) {
            logger.error('输入数据必须是有效的JSON格式');
            process.exit(1);
          }
        }

        const adapter = new ThreadAdapter();
        const thread = await adapter.executeThread(workflowId, inputData);

        console.log(formatThread(thread, { verbose: options.verbose }));
      } catch (error) {
        logger.error(`执行线程失败: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
      }
    });

  // 暂停线程命令
  threadCmd
    .command('pause <thread-id>')
    .description('暂停线程')
    .action(async (threadId) => {
      try {
        logger.info(`正在暂停线程: ${threadId}`);

        const adapter = new ThreadAdapter();
        await adapter.pauseThread(threadId);
      } catch (error) {
        logger.error(`暂停线程失败: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
      }
    });

  // 恢复线程命令
  threadCmd
    .command('resume <thread-id>')
    .description('恢复线程')
    .action(async (threadId) => {
      try {
        logger.info(`正在恢复线程: ${threadId}`);

        const adapter = new ThreadAdapter();
        await adapter.resumeThread(threadId);
      } catch (error) {
        logger.error(`恢复线程失败: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
      }
    });

  // 停止线程命令
  threadCmd
    .command('stop <thread-id>')
    .description('停止线程')
    .action(async (threadId) => {
      try {
        logger.info(`正在停止线程: ${threadId}`);

        const adapter = new ThreadAdapter();
        await adapter.stopThread(threadId);
      } catch (error) {
        logger.error(`停止线程失败: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
      }
    });

  // 列出线程命令
  threadCmd
    .command('list')
    .description('列出所有线程')
    .option('-t, --table', '以表格格式输出')
    .option('-v, --verbose', '详细输出')
    .action(async (options: CommandOptions) => {
      try {
        const adapter = new ThreadAdapter();
        const threads = await adapter.listThreads();

        console.log(formatThreadList(threads, { table: options.table }));
      } catch (error) {
        logger.error(`列出线程失败: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
      }
    });

  // 查看线程详情命令
  threadCmd
    .command('show <thread-id>')
    .description('查看线程详情')
    .option('-v, --verbose', '详细输出')
    .action(async (threadId, options: CommandOptions) => {
      try {
        const adapter = new ThreadAdapter();
        const thread = await adapter.getThread(threadId);

        console.log(formatThread(thread, { verbose: options.verbose }));
      } catch (error) {
        logger.error(`获取线程详情失败: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
      }
    });

  // 删除线程命令
  threadCmd
    .command('delete <thread-id>')
    .description('删除线程')
    .option('-f, --force', '强制删除，不提示确认')
    .action(async (threadId, options: { force?: boolean }) => {
      try {
        if (!options.force) {
          logger.warn(`即将删除线程: ${threadId}`);
          // 在实际应用中，这里可以添加交互式确认
          logger.info('使用 --force 选项跳过确认');
          return;
        }

        const adapter = new ThreadAdapter();
        await adapter.deleteThread(threadId);
      } catch (error) {
        logger.error(`删除线程失败: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
      }
    });

  return threadCmd;
}