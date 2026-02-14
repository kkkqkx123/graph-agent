/**
 * 检查点命令组
 */

import { Command } from 'commander';
import { CheckpointAdapter } from '../../adapters/checkpoint-adapter';
import { createLogger } from '../../utils/logger';
import { formatCheckpoint, formatCheckpointList } from '../../utils/formatter';
import type { CommandOptions } from '../../types/cli-types';

const logger = createLogger();

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

        const adapter = new CheckpointAdapter();
        const checkpoint = await adapter.createCheckpoint(threadId, options.name);

        console.log(formatCheckpoint(checkpoint, { verbose: options.verbose }));
      } catch (error) {
        logger.error(`创建检查点失败: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
      }
    });

  // 载入检查点命令
  checkpointCmd
    .command('load <checkpoint-id>')
    .description('载入检查点')
    .action(async (checkpointId) => {
      try {
        logger.info(`正在载入检查点: ${checkpointId}`);

        const adapter = new CheckpointAdapter();
        await adapter.loadCheckpoint(checkpointId);
      } catch (error) {
        logger.error(`载入检查点失败: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
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
        const adapter = new CheckpointAdapter();
        const checkpoints = await adapter.listCheckpoints();

        console.log(formatCheckpointList(checkpoints, { table: options.table }));
      } catch (error) {
        logger.error(`列出检查点失败: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
      }
    });

  // 查看检查点详情命令
  checkpointCmd
    .command('show <checkpoint-id>')
    .description('查看检查点详情')
    .option('-v, --verbose', '详细输出')
    .action(async (checkpointId, options: CommandOptions) => {
      try {
        const adapter = new CheckpointAdapter();
        const checkpoint = await adapter.getCheckpoint(checkpointId);

        console.log(formatCheckpoint(checkpoint, { verbose: options.verbose }));
      } catch (error) {
        logger.error(`获取检查点详情失败: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
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

        const adapter = new CheckpointAdapter();
        await adapter.deleteCheckpoint(checkpointId);
      } catch (error) {
        logger.error(`删除检查点失败: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
      }
    });

  return checkpointCmd;
}