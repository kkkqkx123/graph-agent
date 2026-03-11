/**
 * 工具命令组
 */

import { Command } from 'commander';
import { ToolAdapter } from '../../adapters/tool-adapter.js';
import { getLogger } from '../../utils/logger.js';
import { formatTool, formatToolList } from '../../utils/formatter.js';
import type { CommandOptions } from '../../types/cli-types.js';

const logger = getLogger();

/**
 * 创建工具命令组
 */
export function createToolCommands(): Command {
  const toolCmd = new Command('tool')
    .description('管理工具');

  // 注册工具命令
  toolCmd
    .command('register <file>')
    .description('从文件注册工具')
    .option('-v, --verbose', '详细输出')
    .action(async (file, options: CommandOptions) => {
      try {
        logger.info(`正在注册工具: ${file}`);

        const adapter = new ToolAdapter();
        const tool = await adapter.registerFromFile(file);

        console.log(formatTool(tool, { verbose: options.verbose }));
      } catch (error) {
        logger.error(`注册工具失败: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
      }
    });

  // 批量注册工具命令
  toolCmd
    .command('register-batch <directory>')
    .description('从目录批量注册工具')
    .option('-r, --recursive', '递归加载子目录')
    .option('-p, --pattern <pattern>', '文件模式 (正则表达式)')
    .action(async (directory, options: {
      recursive?: boolean;
      pattern?: string;
    }) => {
      try {
        logger.info(`正在批量注册工具: ${directory}`);
        
        // 解析文件模式
        const filePattern = options.pattern
          ? new RegExp(options.pattern)
          : undefined;
        
        const adapter = new ToolAdapter();
        const result = await adapter.registerFromDirectory({
          configDir: directory,
          recursive: options.recursive,
          filePattern
        });
        
        // 显示结果
        console.log(`\n成功注册 ${result.success.length} 个工具`);
        if (result.failures.length > 0) {
          console.log(`\n失败 ${result.failures.length} 个文件:`);
          result.failures.forEach(failure => {
            console.log(`  - ${failure.filePath}: ${failure.error}`);
          });
        }
      } catch (error) {
        logger.error(`批量注册工具失败: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
      }
    });

  // 列出工具命令
  toolCmd
    .command('list')
    .description('列出所有工具')
    .option('-t, --table', '以表格格式输出')
    .option('-v, --verbose', '详细输出')
    .action(async (options: CommandOptions) => {
      try {
        const adapter = new ToolAdapter();
        const tools = await adapter.listTools();

        console.log(formatToolList(tools, { table: options.table }));
      } catch (error) {
        logger.error(`列出工具失败: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
      }
    });

  // 查看工具详情命令
  toolCmd
    .command('show <id>')
    .description('查看工具详情')
    .option('-v, --verbose', '详细输出')
    .action(async (id, options: CommandOptions) => {
      try {
        const adapter = new ToolAdapter();
        const tool = await adapter.getTool(id);

        console.log(formatTool(tool, { verbose: options.verbose }));
      } catch (error) {
        logger.error(`获取工具详情失败: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
      }
    });

  // 删除工具命令
  toolCmd
    .command('delete <id>')
    .description('删除工具')
    .option('-f, --force', '强制删除，不提示确认')
    .action(async (id, options: { force?: boolean }) => {
      try {
        if (!options.force) {
          logger.warn(`即将删除工具: ${id}`);
          // 在实际应用中，这里可以添加交互式确认
          logger.info('使用 --force 选项跳过确认');
          return;
        }

        const adapter = new ToolAdapter();
        await adapter.deleteTool(id);
      } catch (error) {
        logger.error(`删除工具失败: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
      }
    });

  // 更新工具命令
  toolCmd
    .command('update <id>')
    .description('更新工具')
    .option('-n, --name <name>', '工具名称')
    .option('-d, --description <description>', '工具描述')
    .option('-v, --verbose', '详细输出')
    .action(async (id, options: CommandOptions & {
      name?: string;
      description?: string;
    }) => {
      try {
        const adapter = new ToolAdapter();
        const updates: any = {};

        if (options.name) updates.name = options.name;
        if (options.description) updates.description = options.description;

        const tool = await adapter.updateTool(id, updates);
        console.log(formatTool(tool, { verbose: options.verbose }));
      } catch (error) {
        logger.error(`更新工具失败: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
      }
    });

  // 验证工具配置命令
  toolCmd
    .command('validate <file>')
    .description('验证工具配置文件')
    .action(async (file) => {
      try {
        logger.info(`正在验证工具配置: ${file}`);

        const adapter = new ToolAdapter();
        const result = await adapter.validateTool(file);

        if (result.valid) {
          console.log('✓ 配置验证通过');
        } else {
          console.log('✗ 配置验证失败:');
          result.errors.forEach(error => {
            console.log(`  - ${error}`);
          });
          process.exit(1);
        }
      } catch (error) {
        logger.error(`验证工具配置失败: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
      }
    });

  // 执行工具命令
  toolCmd
    .command('execute <id>')
    .description('执行工具')
    .option('-p, --params <json>', '参数(JSON格式)')
    .option('-t, --timeout <timeout>', '超时时间（毫秒）')
    .option('-r, --max-retries <maxRetries>', '最大重试次数')
    .option('-d, --retry-delay <retryDelay>', '重试延迟（毫秒）')
    .option('-l, --no-logging', '禁用日志')
    .option('-v, --verbose', '详细输出')
    .action(async (id, options: CommandOptions & {
      params?: string;
      timeout?: string;
      maxRetries?: string;
      retryDelay?: string;
      logging?: boolean;
    }) => {
      try {
        logger.info(`正在执行工具: ${id}`);

        // 解析参数
        let parameters: Record<string, any> = {};
        if (options.params) {
          try {
            parameters = JSON.parse(options.params);
          } catch (error) {
            logger.error('参数必须是有效的JSON格式');
            process.exit(1);
          }
        }

        // 构建执行选项
        const toolOptions: any = {};
        if (options.timeout) toolOptions.timeout = parseInt(options.timeout, 10);
        if (options.maxRetries) toolOptions.maxRetries = parseInt(options.maxRetries, 10);
        if (options.retryDelay) toolOptions.retryDelay = parseInt(options.retryDelay, 10);
        if (options.logging !== undefined) toolOptions.enableLogging = options.logging;

        const adapter = new ToolAdapter();
        const result = await adapter.executeTool(id, parameters, toolOptions);

        if (options.verbose) {
          console.log(JSON.stringify(result, null, 2));
        } else {
          console.log('✓ 工具执行成功');
          if (result.result !== undefined) {
            console.log(`结果: ${JSON.stringify(result.result)}`);
          }
        }
      } catch (error) {
        logger.error(`执行工具失败: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
      }
    });

  // 验证工具参数命令
  toolCmd
    .command('validate-params <id>')
    .description('验证工具参数')
    .option('-p, --params <json>', '参数(JSON格式)')
    .action(async (id, options: { params?: string }) => {
      try {
        logger.info(`正在验证工具参数: ${id}`);

        // 解析参数
        let parameters: Record<string, any> = {};
        if (options.params) {
          try {
            parameters = JSON.parse(options.params);
          } catch (error) {
            logger.error('参数必须是有效的JSON格式');
            process.exit(1);
          }
        }

        const adapter = new ToolAdapter();
        const result = await adapter.validateParameters(id, parameters);

        if (result.valid) {
          console.log('✓ 参数验证通过');
        } else {
          console.log('✗ 参数验证失败:');
          result.errors.forEach(error => {
            console.log(`  - ${error}`);
          });
          process.exit(1);
        }
      } catch (error) {
        logger.error(`验证工具参数失败: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
      }
    });

  return toolCmd;
}