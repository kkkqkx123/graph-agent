/**
 * 检查点命令组
 */

import { Command } from 'commander';
import { ThreadCheckpointAdapter } from '../../adapters/thread-checkpoint-adapter.js';
import { getLogger } from '../../utils/logger.js';
import { formatCheckpoint, formatCheckpointList } from '../../utils/formatter.js';
import { handleError } from '../../utils/error-handler.js';
import type { CommandOptions } from '../../types/cli-types.js';

const logger = getLogger();

/**
 * 创建检查点命令组
 */
export function createCheckpointCommands(): Command {
  const checkpointCmd = new Command('checkpoint')
    .description('管理检查点');

  // 创建检查点命令
  checkpointCmd
    .command('create <thread-id>')
    .description('创建检查点')
    .option('-n, --name <name>', '检查点名称')
    .option('-v, --verbose', '详细输出')
    .action(async (threadId, options: CommandOptions & { name?: string }) => {
      try {
        logger.info(`正在创建检查点: ${threadId}`);

        const adapter = new ThreadCheckpointAdapter();
        const checkpoint = await adapter.createCheckpoint(threadId, options.name);

        console.log(formatCheckpoint(checkpoint, { verbose: options.verbose }));
      } catch (error) {
        handleError(error, {
          operation: 'create-checkpoint',
          additionalInfo: { threadId, name: options.name }
        });
      }
    });

  // 载入检查点命令
  checkpointCmd
    .command('load <checkpoint-id>')
    .description('载入检查点')
    .action(async (checkpointId) => {
      try {
        logger.info(`正在载入检查点: ${checkpointId}`);

        const adapter = new ThreadCheckpointAdapter();
        await adapter.loadCheckpoint(checkpointId);
      } catch (error) {
        handleError(error, {
          operation: 'load-checkpoint',
          additionalInfo: { checkpointId }
        });
      }
    });

  // 列出检查点命令
  checkpointCmd
    .command('list')
    .description('列出所有检查点')
    .option('-t, --table', '以表格格式输出')
    .option('-v, --verbose', '详细输出')
    .action(async (options: CommandOptions) => {
      try {
        const adapter = new ThreadCheckpointAdapter();
        const checkpoints = await adapter.listCheckpoints();

        console.log(formatCheckpointList(checkpoints, { table: options.table }));
      } catch (error) {
        handleError(error, {
          operation: 'list-checkpoints'
        });
      }
    });

  // 查看检查点详情命令
  checkpointCmd
    .command('show <checkpoint-id>')
    .description('查看检查点详情')
    .option('-v, --verbose', '详细输出')
    .action(async (checkpointId, options: CommandOptions) => {
      try {
        const adapter = new ThreadCheckpointAdapter();
        const checkpoint = await adapter.getCheckpoint(checkpointId);

        console.log(formatCheckpoint(checkpoint, { verbose: options.verbose }));
      } catch (error) {
        handleError(error, {
          operation: 'show-checkpoint',
          additionalInfo: { checkpointId }
        });
      }
    });

  // 删除检查点命令
  checkpointCmd
    .command('delete <checkpoint-id>')
    .description('删除检查点')
    .option('-f, --force', '强制删除，不提示确认')
    .action(async (checkpointId, options: { force?: boolean }) => {
      try {
        if (!options.force) {
          logger.warn(`即将删除检查点: ${checkpointId}`);
          // 在实际应用中，这里可以添加交互式确认
          logger.info('使用 --force 选项跳过确认');
          return;
        }

        const adapter = new ThreadCheckpointAdapter();
        await adapter.deleteCheckpoint(checkpointId);
      } catch (error) {
        handleError(error, {
          operation: 'delete-checkpoint',
          additionalInfo: { checkpointId }
        });
      }
    });

  return checkpointCmd;
}