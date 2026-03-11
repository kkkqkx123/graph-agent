/**
 * 脚本命令组
 */

import { Command } from 'commander';
import { ScriptAdapter } from '../../adapters/script-adapter.js';
import { getLogger } from '../../utils/logger.js';
import { formatScript, formatScriptList } from '../../utils/formatter.js';
import type { CommandOptions } from '../../types/cli-types.js';

const logger = getLogger();

/**
 * 创建脚本命令组
 */
export function createScriptCommands(): Command {
  const scriptCmd = new Command('script')
    .description('管理脚本');

  // 注册脚本命令
  scriptCmd
    .command('register <file>')
    .description('从文件注册脚本')
    .option('-v, --verbose', '详细输出')
    .action(async (file, options: CommandOptions) => {
      try {
        logger.info(`正在注册脚本: ${file}`);

        const adapter = new ScriptAdapter();
        const script = await adapter.registerFromFile(file);

        console.log(formatScript(script, { verbose: options.verbose }));
      } catch (error) {
        logger.error(`注册脚本失败: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
      }
    });

  // 批量注册脚本命令
  scriptCmd
    .command('register-batch <directory>')
    .description('从目录批量注册脚本')
    .option('-r, --recursive', '递归加载子目录')
    .option('-p, --pattern <pattern>', '文件模式 (正则表达式)')
    .action(async (directory, options: {
      recursive?: boolean;
      pattern?: string;
    }) => {
      try {
        logger.info(`正在批量注册脚本: ${directory}`);
        
        // 解析文件模式
        const filePattern = options.pattern
          ? new RegExp(options.pattern)
          : undefined;
        
        const adapter = new ScriptAdapter();
        const result = await adapter.registerFromDirectory({
          configDir: directory,
          recursive: options.recursive,
          filePattern
        });
        
        // 显示结果
        console.log(`\n成功注册 ${result.success.length} 个脚本`);
        if (result.failures.length > 0) {
          console.log(`\n失败 ${result.failures.length} 个文件:`);
          result.failures.forEach(failure => {
            console.log(`  - ${failure.filePath}: ${failure.error}`);
          });
        }
      } catch (error) {
        logger.error(`批量注册脚本失败: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
      }
    });

  // 列出脚本命令
  scriptCmd
    .command('list')
    .description('列出所有脚本')
    .option('-t, --table', '以表格格式输出')
    .option('-v, --verbose', '详细输出')
    .action(async (options: CommandOptions) => {
      try {
        const adapter = new ScriptAdapter();
        const scripts = await adapter.listScripts();

        console.log(formatScriptList(scripts, { table: options.table }));
      } catch (error) {
        logger.error(`列出脚本失败: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
      }
    });

  // 查看脚本详情命令
  scriptCmd
    .command('show <id>')
    .description('查看脚本详情')
    .option('-v, --verbose', '详细输出')
    .action(async (id, options: CommandOptions) => {
      try {
        const adapter = new ScriptAdapter();
        const script = await adapter.getScript(id);

        console.log(formatScript(script, { verbose: options.verbose }));
      } catch (error) {
        logger.error(`获取脚本详情失败: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
      }
    });

  // 删除脚本命令
  scriptCmd
    .command('delete <id>')
    .description('删除脚本')
    .option('-f, --force', '强制删除，不提示确认')
    .action(async (id, options: { force?: boolean }) => {
      try {
        if (!options.force) {
          logger.warn(`即将删除脚本: ${id}`);
          // 在实际应用中，这里可以添加交互式确认
          logger.info('使用 --force 选项跳过确认');
          return;
        }

        const adapter = new ScriptAdapter();
        await adapter.deleteScript(id);
      } catch (error) {
        logger.error(`删除脚本失败: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
      }
    });

  // 更新脚本命令
  scriptCmd
    .command('update <id>')
    .description('更新脚本')
    .option('-n, --name <name>', '脚本名称')
    .option('-d, --description <description>', '脚本描述')
    .option('-v, --verbose', '详细输出')
    .action(async (id, options: CommandOptions & {
      name?: string;
      description?: string;
    }) => {
      try {
        const adapter = new ScriptAdapter();
        const updates: any = {};

        if (options.name) updates.name = options.name;
        if (options.description) updates.description = options.description;

        const script = await adapter.updateScript(id, updates);
        console.log(formatScript(script, { verbose: options.verbose }));
      } catch (error) {
        logger.error(`更新脚本失败: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
      }
    });

  // 验证脚本配置命令
  scriptCmd
    .command('validate <file>')
    .description('验证脚本配置文件')
    .action(async (file) => {
      try {
        logger.info(`正在验证脚本配置: ${file}`);

        const adapter = new ScriptAdapter();
        const result = await adapter.validateScript(file);

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
        logger.error(`验证脚本配置失败: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
      }
    });

  // 执行脚本命令
  scriptCmd
    .command('execute <name>')
    .description('执行脚本')
    .option('-i, --input <json>', '输入数据(JSON格式)')
    .option('-t, --timeout <timeout>', '超时时间（毫秒）')
    .option('-r, --retries <retries>', '重试次数')
    .option('-d, --retry-delay <retryDelay>', '重试延迟（毫秒）')
    .option('-w, --working-dir <workingDir>', '工作目录')
    .option('-e, --env <env>', '环境变量(JSON格式)')
    .option('-s, --sandbox', '启用沙箱模式')
    .option('-v, --verbose', '详细输出')
    .action(async (name, options: CommandOptions & {
      input?: string;
      timeout?: string;
      retries?: string;
      retryDelay?: string;
      workingDir?: string;
      env?: string;
      sandbox?: boolean;
    }) => {
      try {
        logger.info(`正在执行脚本: ${name}`);

        // 解析输入数据
        let inputData: Record<string, any> | undefined;
        if (options.input) {
          try {
            inputData = JSON.parse(options.input);
          } catch (error) {
            logger.error('输入数据必须是有效的JSON格式');
            process.exit(1);
          }
        }

        // 解析环境变量
        let environment: Record<string, string> | undefined;
        if (options.env) {
          try {
            environment = JSON.parse(options.env);
          } catch (error) {
            logger.error('环境变量必须是有效的JSON格式');
            process.exit(1);
          }
        }

        // 构建执行选项
        const scriptOptions: any = {};
        if (options.timeout) scriptOptions.timeout = parseInt(options.timeout, 10);
        if (options.retries) scriptOptions.retries = parseInt(options.retries, 10);
        if (options.retryDelay) scriptOptions.retryDelay = parseInt(options.retryDelay, 10);
        if (options.workingDir) scriptOptions.workingDirectory = options.workingDir;
        if (environment) scriptOptions.environment = environment;
        if (options.sandbox) scriptOptions.sandbox = true;

        const adapter = new ScriptAdapter();
        const result = await adapter.executeScript(name, scriptOptions);

        if (options.verbose) {
          console.log(JSON.stringify(result, null, 2));
        } else {
          console.log('✓ 脚本执行成功');
          if (result.output !== undefined) {
            console.log(`输出: ${JSON.stringify(result.output)}`);
          }
        }
      } catch (error) {
        logger.error(`执行脚本失败: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
      }
    });

  return scriptCmd;
}