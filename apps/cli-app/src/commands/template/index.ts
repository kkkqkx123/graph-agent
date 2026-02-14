/**
 * 模板命令组
 */

import { Command } from 'commander';
import { TemplateAdapter } from '../../adapters/template-adapter';
import { createLogger } from '../../utils/logger';
import { formatWorkflow, formatWorkflowList } from '../../utils/formatter';
import type { CommandOptions } from '../../types/cli-types';

const logger = createLogger();

/**
 * 创建模板命令组
 */
export function createTemplateCommands(): Command {
  const templateCmd = new Command('template')
    .description('管理模板');

  // 注册节点模板命令
  templateCmd
    .command('register-node <file>')
    .description('从文件注册节点模板')
    .option('-v, --verbose', '详细输出')
    .action(async (file, options: CommandOptions) => {
      try {
        logger.info(`正在注册节点模板: ${file}`);

        const adapter = new TemplateAdapter();
        const template = await adapter.registerNodeTemplateFromFile(file);

        console.log(formatWorkflow(template, { verbose: options.verbose }));
      } catch (error) {
        logger.error(`注册节点模板失败: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
      }
    });

  // 注册触发器模板命令
  templateCmd
    .command('register-trigger <file>')
    .description('从文件注册触发器模板')
    .option('-v, --verbose', '详细输出')
    .action(async (file, options: CommandOptions) => {
      try {
        logger.info(`正在注册触发器模板: ${file}`);

        const adapter = new TemplateAdapter();
        const template = await adapter.registerTriggerTemplateFromFile(file);

        console.log(formatWorkflow(template, { verbose: options.verbose }));
      } catch (error) {
        logger.error(`注册触发器模板失败: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
      }
    });

  // 列出节点模板命令
  templateCmd
    .command('list-nodes')
    .description('列出所有节点模板')
    .option('-t, --table', '以表格格式输出')
    .option('-v, --verbose', '详细输出')
    .action(async (options: CommandOptions) => {
      try {
        const adapter = new TemplateAdapter();
        const templates = await adapter.listNodeTemplates();

        console.log(formatWorkflowList(templates, { table: options.table }));
      } catch (error) {
        logger.error(`列出节点模板失败: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
      }
    });

  // 列出触发器模板命令
  templateCmd
    .command('list-triggers')
    .description('列出所有触发器模板')
    .option('-t, --table', '以表格格式输出')
    .option('-v, --verbose', '详细输出')
    .action(async (options: CommandOptions) => {
      try {
        const adapter = new TemplateAdapter();
        const templates = await adapter.listTriggerTemplates();

        console.log(formatWorkflowList(templates, { table: options.table }));
      } catch (error) {
        logger.error(`列出触发器模板失败: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
      }
    });

  // 查看节点模板详情命令
  templateCmd
    .command('show-node <id>')
    .description('查看节点模板详情')
    .option('-v, --verbose', '详细输出')
    .action(async (id, options: CommandOptions) => {
      try {
        const adapter = new TemplateAdapter();
        const template = await adapter.getNodeTemplate(id);

        console.log(formatWorkflow(template, { verbose: options.verbose }));
      } catch (error) {
        logger.error(`获取节点模板详情失败: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
      }
    });

  // 查看触发器模板详情命令
  templateCmd
    .command('show-trigger <id>')
    .description('查看触发器模板详情')
    .option('-v, --verbose', '详细输出')
    .action(async (id, options: CommandOptions) => {
      try {
        const adapter = new TemplateAdapter();
        const template = await adapter.getTriggerTemplate(id);

        console.log(formatWorkflow(template, { verbose: options.verbose }));
      } catch (error) {
        logger.error(`获取触发器模板详情失败: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
      }
    });

  // 删除节点模板命令
  templateCmd
    .command('delete-node <id>')
    .description('删除节点模板')
    .option('-f, --force', '强制删除，不提示确认')
    .action(async (id, options: { force?: boolean }) => {
      try {
        if (!options.force) {
          logger.warn(`即将删除节点模板: ${id}`);
          // 在实际应用中，这里可以添加交互式确认
          logger.info('使用 --force 选项跳过确认');
          return;
        }

        const adapter = new TemplateAdapter();
        await adapter.deleteNodeTemplate(id);
      } catch (error) {
        logger.error(`删除节点模板失败: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
      }
    });

  // 删除触发器模板命令
  templateCmd
    .command('delete-trigger <id>')
    .description('删除触发器模板')
    .option('-f, --force', '强制删除，不提示确认')
    .action(async (id, options: { force?: boolean }) => {
      try {
        if (!options.force) {
          logger.warn(`即将删除触发器模板: ${id}`);
          // 在实际应用中，这里可以添加交互式确认
          logger.info('使用 --force 选项跳过确认');
          return;
        }

        const adapter = new TemplateAdapter();
        await adapter.deleteTriggerTemplate(id);
      } catch (error) {
        logger.error(`删除触发器模板失败: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
      }
    });

  return templateCmd;
}