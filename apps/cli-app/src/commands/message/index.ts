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
      } catch (error) {
        logger.error(`获取消息统计失败: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
      }
    });

  // 压缩上下文命令
  messageCmd
    .command('compress <threadId>')
    .description('手动触发上下文压缩')
    .option('-s, --strategy <strategy>', '压缩策略（TRUNCATE/CLEAR 等）', 'TRUNCATE')
    .option('--keep-recent <count>', '保留最近消息的数量', '10')
    .action(async (threadId: string, options: any) => {
      try {
        const { EventAdapter } = await import('../../adapters/event-adapter.js');
        const adapter = new EventAdapter();
        const event = {
          type: 'CONTEXT_COMPRESSION_REQUESTED',
          timestamp: Date.now(),
          threadId,
          data: {
            strategy: options.strategy,
            keepRecent: parseInt(options.keepRecent, 10)
          }
        };
        await adapter.dispatchEvent(event as any);
        console.log(`\n已向线程 ${threadId} 发送上下文压缩请求 (策略: ${options.strategy})`);
        console.log(`注意: 需要在工作流中配置对应的触发器 (触发事件: CONTEXT_COMPRESSION_REQUESTED) 才会执行。`);
      } catch (error) {
        logger.error(`触发上下文压缩失败: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
      }
    });

  return messageCmd;
}