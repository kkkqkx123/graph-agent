/**
 * 消息命令组
 */

import { Command } from 'commander';
import { MessageAdapter } from '../../adapters/message-adapter.js';
import { getLogger } from '../../utils/logger.js';
import { formatMessage, formatMessageList } from '../../utils/formatter.js';
import type { CommandOptions } from '../../types/cli-types.js';

const logger = getLogger();

/**
 * 创建消息命令组
 */
export function createMessageCommands(): Command {
  const messageCmd = new Command('message')
    .description('管理消息');

  // 列出消息命令
  messageCmd
    .command('list')
    .description('列出所有消息')
    .option('-t, --table', '以表格格式输出')
    .option('-v, --verbose', '详细输出')
    .option('--thread-id <threadId>', '按线程ID过滤')
    .option('--role <role>', '按角色过滤')
    .option('--content <content>', '按内容关键词过滤')
    .action(async (options: CommandOptions & {
      threadId?: string;
      role?: string;
      content?: string;
    }) => {
      try {
        const adapter = new MessageAdapter();
        const filter: any = {};
        if (options.threadId) filter.threadId = options.threadId;
        if (options.role) filter.role = options.role;
        if (options.content) filter.content = options.content;
        
        const messages = await adapter.listMessages(filter);

        console.log(formatMessageList(messages, { table: options.table }));
      } catch (error) {
        logger.error(`列出消息失败: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
      }
    });

  // 查看消息详情命令
  messageCmd
    .command('show <id>')
    .description('查看消息详情')
    .option('-v, --verbose', '详细输出')
    .action(async (id, options: CommandOptions) => {
      try {
        const adapter = new MessageAdapter();
        const message = await adapter.getMessage(id);

        console.log(formatMessage(message, { verbose: options.verbose }));
      } catch (error) {
        logger.error(`获取消息详情失败: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
      }
    });

  // 按线程列出消息命令
  messageCmd
    .command('list-by-thread <thread-id>')
    .description('按线程ID列出消息')
    .option('-t, --table', '以表格格式输出')
    .option('-v, --verbose', '详细输出')
    .action(async (threadId, options: CommandOptions) => {
      try {
        const adapter = new MessageAdapter();
        const messages = await adapter.listMessagesByThread(threadId);

        console.log(formatMessageList(messages, { table: options.table }));
      } catch (error) {
        logger.error(`列出线程消息失败: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
      }
    });

  // 获取消息统计命令
  messageCmd
    .command('stats')
    .description('获取消息统计信息')
    .option('--thread-id <threadId>', '按线程ID统计')
    .action(async (options: { threadId?: string }) => {
      try {
        const adapter = new MessageAdapter();
        const stats = await adapter.getMessageStats(options.threadId);

        console.log(`\n消息统计:`);
        console.log(`  总数: ${stats.total}`);
        console.log(`\n  按角色:`);
        Object.entries(stats.byRole).forEach(([role, count]) => {
          console.log(`    ${role}: ${count}`);
        });
        console.log(`\n  按类型:`);
        Object.entries(stats.byType).forEach(([type, count]) => {
          console.log(`    ${type}: ${count}`);
        });
      } catch (error) {
        logger.error(`获取消息统计失败: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
      }
    });

  return messageCmd;
}