/**
 * 线程命令组
 */

import { Command } from 'commander';
import { ThreadAdapter } from '../../adapters/thread-adapter.js';
import { getLogger } from '../../utils/logger.js';
import { formatThread, formatThreadList } from '../../utils/formatter.js';
import type { CommandOptions } from '../../types/cli-types.js';
import { handleError } from '../../utils/error-handler.js';
import { CLIValidationError } from '../../types/cli-types.js';

// 新增导入
import { TerminalManager } from '../../terminal/terminal-manager.js';
import { TaskExecutor } from '../../terminal/task-executor.js';
import { CommunicationBridge } from '../../terminal/communication-bridge.js';

const logger = getLogger();

// 创建全局实例
const terminalManager = new TerminalManager();
const taskExecutor = new TaskExecutor();
const communicationBridge = new CommunicationBridge();

/**
 * 创建线程命令组
 */
export function createThreadCommands(): Command {
  const threadCmd = new Command('thread')
    .description('管理线程');

  // 执行线程命令 - 默认使用前台 detached 模式
  threadCmd
    .command('run <workflow-id>')
    .description('执行工作流线程')
    .option('-i, --input <json>', '输入数据(JSON格式)')
    .option('-v, --verbose', '详细输出')
    .option('-b, --blocking', '在当前终端中运行（阻塞方式）')
    .option('--background', '在后台运行（不显示终端窗口）')
    .option('--log-file <path>', '后台运行时的日志文件路径')
    .action(async (workflowId, options: CommandOptions & {
      input?: string;
      blocking?: boolean;
      background?: boolean;
      logFile?: string;
    }) => {
      try {
        logger.info(`正在启动线程: ${workflowId}`);

        let inputData: Record<string, unknown> = {};
        if (options.input) {
          try {
            inputData = JSON.parse(options.input);
          } catch (error) {
            handleError(new CLIValidationError('输入数据必须是有效的JSON格式'), {
              operation: 'runThread',
              additionalInfo: { workflowId, input: options.input }
            });
            return;
          }
        }

        if (options.blocking) {
          // 在当前终端中运行（阻塞方式）
          const adapter = new ThreadAdapter();
          const thread = await adapter.executeThread(workflowId, inputData);
          console.log(formatThread(thread, { verbose: options.verbose }));
        } else {
          // 在独立终端中运行（默认方式）
          const terminal = terminalManager.createTerminal({
            background: options.background,
            logFile: options.logFile
          });
          const result = await taskExecutor.executeInTerminal(
            workflowId,
            inputData,
            terminal
          );

          if (options.background) {
            console.log(`\n✓ 线程已在后台启动`);
            console.log(`  任务ID: ${result.taskId}`);
            console.log(`  进程ID: ${terminal.pid}`);
            console.log(`  日志文件: ${options.logFile || `logs/task-${result.taskId}.log`}`);
            console.log(`  启动时间: ${result.startTime.toISOString()}`);
            console.log(`\n提示: 使用 'modular-agent thread status ${result.taskId}' 查看任务状态`);
          } else {
            console.log(`\n✓ 线程已在独立终端中启动`);
            console.log(`  任务ID: ${result.taskId}`);
            console.log(`  终端ID: ${result.sessionId}`);
            console.log(`  进程ID: ${terminal.pid}`);
            console.log(`  启动时间: ${result.startTime.toISOString()}`);
            console.log(`\n提示: 使用 'modular-agent thread status ${result.taskId}' 查看任务状态`);
          }
        }
      } catch (error) {
        handleError(error, {
          operation: 'runThread',
          additionalInfo: { workflowId }
        });
      }
    });

  // 新增：查看任务状态命令
  threadCmd
    .command('status <task-id>')
    .description('查看任务状态')
    .action(async (taskId) => {
      try {
        const status = await taskExecutor.monitorTask(taskId);
        console.log(`\n任务状态:`);
        console.log(`  任务ID: ${status.taskId}`);
        console.log(`  状态: ${status.status}`);
        console.log(`  进度: ${status.progress || 0}%`);
        console.log(`  消息: ${status.message || '无'}`);
        console.log(`  最后更新: ${status.lastUpdate.toISOString()}`);
      } catch (error) {
        handleError(error, {
          operation: 'getTaskStatus',
          additionalInfo: { taskId }
        });
      }
    });

  // 新增：停止任务命令
  threadCmd
    .command('cancel <task-id>')
    .description('取消任务执行')
    .action(async (taskId) => {
      try {
        await taskExecutor.stopTask(taskId);
        logger.success(`任务已取消: ${taskId}`);
      } catch (error) {
        handleError(error, {
          operation: 'cancelTask',
          additionalInfo: { taskId }
        });
      }
    });

  // 新增：列出活跃终端命令
  threadCmd
    .command('terminals')
    .description('列出所有活跃终端')
    .action(() => {
      const terminals = terminalManager.getActiveTerminals();
      if (terminals.length === 0) {
        console.log('\n当前没有活跃的终端');
        return;
      }

      console.log('\n活跃终端:');
      terminals.forEach((terminal, index) => {
        console.log(`  ${index + 1}. ID: ${terminal.id}`);
        console.log(`     PID: ${terminal.pid}`);
        console.log(`     状态: ${terminal.status}`);
        console.log(`     创建时间: ${terminal.createdAt.toISOString()}`);
        console.log('');
      });
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
        handleError(error, {
          operation: 'pauseThread',
          additionalInfo: { threadId }
        });
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
        handleError(error, {
          operation: 'resumeThread',
          additionalInfo: { threadId }
        });
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
        handleError(error, {
          operation: 'stopThread',
          additionalInfo: { threadId }
        });
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
        handleError(error, {
          operation: 'listThreads'
        });
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
        handleError(error, {
          operation: 'getThread',
          additionalInfo: { threadId }
        });
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
        handleError(error, {
          operation: 'deleteThread',
          additionalInfo: { threadId }
        });
      }
    });

  return threadCmd;
}