/**
 * 触发器命令组
 */

import { Command } from 'commander';
import { TriggerAdapter } from '../../adapters/trigger-adapter.js';
import { getLogger } from '../../utils/logger.js';
import { formatTrigger, formatTriggerList } from '../../utils/formatter.js';
import { handleError } from '../../utils/error-handler.js';
import type { CommandOptions } from '../../types/cli-types.js';

const logger = getLogger();

/**
 * 创建触发器命令组
 */
export function createTriggerCommands(): Command {
  const triggerCmd = new Command('trigger')
    .description('管理触发器');

  // 列出触发器命令
  triggerCmd
    .command('list')
    .description('列出所有触发器')
    .option('-t, --table', '以表格格式输出')
    .option('-v, --verbose', '详细输出')
    .action(async (options: CommandOptions) => {
      try {
        const adapter = new TriggerAdapter();
        const triggers = await adapter.listTriggers();

        console.log(formatTriggerList(triggers, { table: options.table }));
      } catch (error) {
        handleError(error, {
          operation: 'list-triggers'
        });
      }
    });

  // 查看触发器详情命令
  triggerCmd
    .command('show <id>')
    .description('查看触发器详情')
    .option('-v, --verbose', '详细输出')
    .action(async (id, options: CommandOptions) => {
      try {
        const adapter = new TriggerAdapter();
        const trigger = await adapter.getTrigger(id);

        console.log(formatTrigger(trigger, { verbose: options.verbose }));
      } catch (error) {
        handleError(error, {
          operation: 'show-trigger',
          additionalInfo: { id }
        });
      }
    });

  // 启用触发器命令
  triggerCmd
    .command('enable <threadId> <triggerId>')
    .description('启用触发器')
    .action(async (threadId, triggerId) => {
      try {
        logger.info(`正在启用触发器: ${triggerId}`);

        const adapter = new TriggerAdapter();
        await adapter.enableTrigger(threadId, triggerId);
      } catch (error) {
        handleError(error, {
          operation: 'enable-trigger',
          additionalInfo: { threadId, triggerId }
        });
      }
    });

  // 禁用触发器命令
  triggerCmd
    .command('disable <threadId> <triggerId>')
    .description('禁用触发器')
    .action(async (threadId, triggerId) => {
      try {
        logger.info(`正在禁用触发器: ${triggerId}`);

        const adapter = new TriggerAdapter();
        await adapter.disableTrigger(threadId, triggerId);
      } catch (error) {
        handleError(error, {
          operation: 'disable-trigger',
          additionalInfo: { threadId, triggerId }
        });
      }
    });

  // 按线程列出触发器命令
  triggerCmd
    .command('list-by-thread <thread-id>')
    .description('按线程ID列出触发器')
    .option('-t, --table', '以表格格式输出')
    .option('-v, --verbose', '详细输出')
    .action(async (threadId, options: CommandOptions) => {
      try {
        const adapter = new TriggerAdapter();
        const triggers = await adapter.listTriggersByThread(threadId);

        console.log(formatTriggerList(triggers, { table: options.table }));
      } catch (error) {
        handleError(error, {
          operation: 'list-triggers-by-thread',
          additionalInfo: { threadId }
        });
      }
    });

  return triggerCmd;
}