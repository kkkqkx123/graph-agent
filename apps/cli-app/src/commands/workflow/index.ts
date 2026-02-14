/**
 * 工作流命令组
 */

import { Command } from 'commander';
import { WorkflowAdapter } from '../../adapters/workflow-adapter';
import { createLogger } from '../../utils/logger';
import { formatWorkflow, formatWorkflowList } from '../../utils/formatter';
import type { CommandOptions } from '../../types/cli-types';

const logger = createLogger();

/**
 * 创建工作流命令组
 */
export function createWorkflowCommands(): Command {
  const workflowCmd = new Command('workflow')
    .description('管理工作流')
    .alias('wf');

  // 注册工作流命令
  workflowCmd
    .command('register <file>')
    .description('从文件注册工作流')
    .option('-v, --verbose', '详细输出')
    .action(async (file, options: CommandOptions) => {
      try {
        logger.info(`正在注册工作流: ${file}`);

        const adapter = new WorkflowAdapter();
        const workflow = await adapter.registerFromFile(file);

        console.log(formatWorkflow(workflow, { verbose: options.verbose }));
      } catch (error) {
        logger.error(`注册失败: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
      }
    });

  // 列出工作流命令
  workflowCmd
    .command('list')
    .description('列出所有工作流')
    .option('-t, --table', '以表格格式输出')
    .option('-v, --verbose', '详细输出')
    .action(async (options: CommandOptions) => {
      try {
        const adapter = new WorkflowAdapter();
        const workflows = await adapter.listWorkflows();

        console.log(formatWorkflowList(workflows, { table: options.table }));
      } catch (error) {
        logger.error(`列出工作流失败: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
      }
    });

  // 查看工作流详情命令
  workflowCmd
    .command('show <id>')
    .description('查看工作流详情')
    .option('-v, --verbose', '详细输出')
    .action(async (id, options: CommandOptions) => {
      try {
        const adapter = new WorkflowAdapter();
        const workflow = await adapter.getWorkflow(id);

        console.log(formatWorkflow(workflow, { verbose: options.verbose }));
      } catch (error) {
        logger.error(`获取工作流详情失败: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
      }
    });

  // 删除工作流命令
  workflowCmd
    .command('delete <id>')
    .description('删除工作流')
    .option('-f, --force', '强制删除，不提示确认')
    .action(async (id, options: { force?: boolean }) => {
      try {
        if (!options.force) {
          logger.warn(`即将删除工作流: ${id}`);
          // 在实际应用中，这里可以添加交互式确认
          logger.info('使用 --force 选项跳过确认');
          return;
        }

        const adapter = new WorkflowAdapter();
        await adapter.deleteWorkflow(id);
      } catch (error) {
        logger.error(`删除工作流失败: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
      }
    });

  return workflowCmd;
}