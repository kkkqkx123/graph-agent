/**
 * 事件命令组
 */

import { Command } from 'commander';
import { EventAdapter } from '../../adapters/event-adapter.js';
import { createLogger } from '../../utils/logger.js';
import { formatEvent, formatEventList } from '../../utils/formatter.js';
import type { CommandOptions } from '../../types/cli-types.js';

const logger = createLogger();

/**
 * 创建事件命令组
 */
export function createEventCommands(): Command {
  const eventCmd = new Command('event')
    .description('管理事件');

  // 列出事件命令
  eventCmd
    .command('list')
    .description('列出所有事件')
    .option('-t, --table', '以表格格式输出')
    .option('-v, --verbose', '详细输出')
    .option('--type <type>', '按事件类型过滤')
    .option('--thread-id <threadId>', '按线程ID过滤')
    .option('--workflow-id <workflowId>', '按工作流ID过滤')
    .option('--limit <limit>', '限制返回数量')
    .action(async (options: CommandOptions & {
      type?: string;
      threadId?: string;
      workflowId?: string;
      limit?: string;
    }) => {
      try {
        const adapter = new EventAdapter();
        const filter: any = {};
        if (options.type) filter.type = options.type;
        if (options.threadId) filter.threadId = options.threadId;
        if (options.workflowId) filter.workflowId = options.workflowId;
        if (options.limit) filter.limit = parseInt(options.limit, 10);
        
        const events = await adapter.listEvents(filter);

        console.log(formatEventList(events, { table: options.table }));
      } catch (error) {
        logger.error(`列出事件失败: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
      }
    });

  // 查看事件详情命令
  eventCmd
    .command('show <id>')
    .description('查看事件详情')
    .option('-v, --verbose', '详细输出')
    .action(async (id, options: CommandOptions) => {
      try {
        const adapter = new EventAdapter();
        const event = await adapter.getEvent(id);

        console.log(formatEvent(event, { verbose: options.verbose }));
      } catch (error) {
        logger.error(`获取事件详情失败: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
      }
    });

  // 获取事件统计命令
  eventCmd
    .command('stats')
    .description('获取事件统计信息')
    .option('--type <type>', '按事件类型过滤')
    .option('--thread-id <threadId>', '按线程ID过滤')
    .option('--workflow-id <workflowId>', '按工作流ID过滤')
    .action(async (options: {
      type?: string;
      threadId?: string;
      workflowId?: string;
    }) => {
      try {
        const adapter = new EventAdapter();
        const filter: any = {};
        if (options.type) filter.type = options.type;
        if (options.threadId) filter.threadId = options.threadId;
        if (options.workflowId) filter.workflowId = options.workflowId;
        
        const stats = await adapter.getEventStats(filter);

        console.log(`\n事件统计:`);
        console.log(`  总数: ${stats.total}`);
        console.log(`\n  按类型:`);
        Object.entries(stats.byType).forEach(([type, count]) => {
          console.log(`    ${type}: ${count}`);
        });
        console.log(`\n  按线程:`);
        Object.entries(stats.byThread).forEach(([threadId, count]) => {
          console.log(`    ${threadId.substring(0, 8)}: ${count}`);
        });
        console.log(`\n  按工作流:`);
        Object.entries(stats.byWorkflow).forEach(([workflowId, count]) => {
          console.log(`    ${workflowId.substring(0, 8)}: ${count}`);
        });
      } catch (error) {
        logger.error(`获取事件统计失败: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
      }
    });

  // 清除事件命令
  eventCmd
    .command('clear')
    .description('清除事件历史')
    .option('--type <type>', '按事件类型过滤')
    .option('--thread-id <threadId>', '按线程ID过滤')
    .option('--workflow-id <workflowId>', '按工作流ID过滤')
    .option('-f, --force', '强制清除，不提示确认')
    .action(async (options: {
      type?: string;
      threadId?: string;
      workflowId?: string;
      force?: boolean;
    }) => {
      try {
        if (!options.force) {
          logger.warn('即将清除事件历史');
          // 在实际应用中，这里可以添加交互式确认
          logger.info('使用 --force 选项跳过确认');
          return;
        }

        const filter: any = {};
        if (options.type) filter.type = options.type;
        if (options.threadId) filter.threadId = options.threadId;
        if (options.workflowId) filter.workflowId = options.workflowId;

        const adapter = new EventAdapter();
        await adapter.clearEvents(filter);
      } catch (error) {
        logger.error(`清除事件失败: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
      }
    });

  return eventCmd;
}