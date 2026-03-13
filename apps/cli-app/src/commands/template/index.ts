/**
 * 模板命令组
 */

import { Command } from 'commander';
import { TemplateAdapter } from '../../adapters/template-adapter.js';
import { getLogger } from '../../utils/logger.js';
import { formatWorkflow, formatWorkflowList } from '../../utils/formatter.js';
import type { CommandOptions } from '../../types/cli-types.js';
import { handleError } from '../../utils/error-handler.js';

const logger = getLogger();

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
        handleError(error, {
          operation: 'registerNodeTemplateFromFile',
          additionalInfo: { file }
        });
      }
    });

  // 批量注册节点模板命令
  templateCmd
    .command('register-nodes-batch <directory>')
    .description('从目录批量注册节点模板')
    .option('-r, --recursive', '递归加载子目录')
    .option('-p, --pattern <pattern>', '文件模式 (正则表达式)')
    .action(async (directory, options: {
      recursive?: boolean;
      pattern?: string;
    }) => {
      try {
        logger.info(`正在批量注册节点模板: ${directory}`);

        // 解析文件模式
        const filePattern = options.pattern
          ? new RegExp(options.pattern)
          : undefined;

        const adapter = new TemplateAdapter();
        const result = await adapter.registerNodeTemplatesFromDirectory({
          configDir: directory,
          recursive: options.recursive,
          filePattern
        });

        // 显示结果
        console.log(`\n成功注册 ${result.success.length} 个节点模板`);
        if (result.failures.length > 0) {
          console.log(`\n失败 ${result.failures.length} 个文件:`);
          result.failures.forEach(failure => {
            console.log(`  - ${failure.filePath}: ${failure.error}`);
          });
        }
      } catch (error) {
        handleError(error, {
          operation: 'registerNodeTemplatesFromDirectory',
          additionalInfo: { directory, recursive: options.recursive, pattern: options.pattern }
        });
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
        handleError(error, {
          operation: 'registerTriggerTemplateFromFile',
          additionalInfo: { file }
        });
      }
    });

  // 批量注册触发器模板命令
  templateCmd
    .command('register-triggers-batch <directory>')
    .description('从目录批量注册触发器模板')
    .option('-r, --recursive', '递归加载子目录')
    .option('-p, --pattern <pattern>', '文件模式 (正则表达式)')
    .action(async (directory, options: {
      recursive?: boolean;
      pattern?: string;
    }) => {
      try {
        logger.info(`正在批量注册触发器模板: ${directory}`);

        // 解析文件模式
        const filePattern = options.pattern
          ? new RegExp(options.pattern)
          : undefined;

        const adapter = new TemplateAdapter();
        const result = await adapter.registerTriggerTemplatesFromDirectory({
          configDir: directory,
          recursive: options.recursive,
          filePattern
        });

        // 显示结果
        console.log(`\n成功注册 ${result.success.length} 个触发器模板`);
        if (result.failures.length > 0) {
          console.log(`\n失败 ${result.failures.length} 个文件:`);
          result.failures.forEach(failure => {
            console.log(`  - ${failure.filePath}: ${failure.error}`);
          });
        }
      } catch (error) {
        handleError(error, {
          operation: 'registerTriggerTemplatesFromDirectory',
          additionalInfo: { directory, recursive: options.recursive, pattern: options.pattern }
        });
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
        handleError(error, {
          operation: 'listNodeTemplates'
        });
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
        handleError(error, {
          operation: 'listTriggerTemplates'
        });
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
        handleError(error, {
          operation: 'getNodeTemplate',
          additionalInfo: { id }
        });
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
        handleError(error, {
          operation: 'getTriggerTemplate',
          additionalInfo: { id }
        });
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
        handleError(error, {
          operation: 'deleteNodeTemplate',
          additionalInfo: { id }
        });
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
        handleError(error, {
          operation: 'deleteTriggerTemplate',
          additionalInfo: { id }
        });
      }
    });

  return templateCmd;
}