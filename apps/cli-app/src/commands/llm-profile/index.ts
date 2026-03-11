/**
 * LLM Profile 命令组
 */

import { Command } from 'commander';
import { LLMProfileAdapter } from '../../adapters/llm-profile-adapter.js';
import { getLogger } from '../../utils/logger.js';
import { formatLLMProfile, formatLLMProfileList } from '../../utils/formatter.js';
import type { CommandOptions } from '../../types/cli-types.js';

const logger = getLogger();

/**
 * 创建 LLM Profile 命令组
 */
export function createLLMProfileCommands(): Command {
  const llmProfileCmd = new Command('llm-profile')
    .description('管理 LLM Profile 配置')
    .alias('llm');

  // 注册 LLM Profile 命令
  llmProfileCmd
    .command('register <file>')
    .description('从文件注册 LLM Profile')
    .option('-v, --verbose', '详细输出')
    .action(async (file, options: CommandOptions) => {
      try {
        logger.info(`正在注册 LLM Profile: ${file}`);

        const adapter = new LLMProfileAdapter();
        const profile = await adapter.registerFromFile(file);

        console.log(formatLLMProfile(profile, { verbose: options.verbose }));
      } catch (error) {
        logger.error(`注册 LLM Profile 失败: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
      }
    });

  // 批量注册 LLM Profile 命令
  llmProfileCmd
    .command('register-batch <directory>')
    .description('从目录批量注册 LLM Profile')
    .option('-r, --recursive', '递归加载子目录')
    .option('-p, --pattern <pattern>', '文件模式 (正则表达式)')
    .action(async (directory, options: {
      recursive?: boolean;
      pattern?: string;
    }) => {
      try {
        logger.info(`正在批量注册 LLM Profile: ${directory}`);
        
        // 解析文件模式
        const filePattern = options.pattern
          ? new RegExp(options.pattern)
          : undefined;
        
        const adapter = new LLMProfileAdapter();
        const result = await adapter.registerFromDirectory({
          configDir: directory,
          recursive: options.recursive,
          filePattern
        });
        
        // 显示结果
        console.log(`\n成功注册 ${result.success.length} 个 LLM Profile`);
        if (result.failures.length > 0) {
          console.log(`\n失败 ${result.failures.length} 个文件:`);
          result.failures.forEach(failure => {
            console.log(`  - ${failure.filePath}: ${failure.error}`);
          });
        }
      } catch (error) {
        logger.error(`批量注册 LLM Profile 失败: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
      }
    });

  // 列出 LLM Profile 命令
  llmProfileCmd
    .command('list')
    .description('列出所有 LLM Profile')
    .option('-t, --table', '以表格格式输出')
    .option('-v, --verbose', '详细输出')
    .action(async (options: CommandOptions) => {
      try {
        const adapter = new LLMProfileAdapter();
        const profiles = await adapter.listProfiles();

        console.log(formatLLMProfileList(profiles, { table: options.table }));
      } catch (error) {
        logger.error(`列出 LLM Profile 失败: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
      }
    });

  // 查看 LLM Profile 详情命令
  llmProfileCmd
    .command('show <id>')
    .description('查看 LLM Profile 详情')
    .option('-v, --verbose', '详细输出')
    .action(async (id, options: CommandOptions) => {
      try {
        const adapter = new LLMProfileAdapter();
        const profile = await adapter.getProfile(id);

        console.log(formatLLMProfile(profile, { verbose: options.verbose }));
      } catch (error) {
        logger.error(`获取 LLM Profile 详情失败: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
      }
    });

  // 删除 LLM Profile 命令
  llmProfileCmd
    .command('delete <id>')
    .description('删除 LLM Profile')
    .option('-f, --force', '强制删除，不提示确认')
    .action(async (id, options: { force?: boolean }) => {
      try {
        if (!options.force) {
          logger.warn(`即将删除 LLM Profile: ${id}`);
          // 在实际应用中，这里可以添加交互式确认
          logger.info('使用 --force 选项跳过确认');
          return;
        }

        const adapter = new LLMProfileAdapter();
        await adapter.deleteProfile(id);
      } catch (error) {
        logger.error(`删除 LLM Profile 失败: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
      }
    });

  // 更新 LLM Profile 命令
  llmProfileCmd
    .command('update <id>')
    .description('更新 LLM Profile')
    .option('-n, --name <name>', 'Profile 名称')
    .option('-m, --model <model>', '模型名称')
    .option('-k, --api-key <apiKey>', 'API 密钥')
    .option('-b, --base-url <baseUrl>', '基础 URL')
    .option('-t, --timeout <timeout>', '超时时间（毫秒）')
    .option('-r, --max-retries <maxRetries>', '最大重试次数')
    .option('-d, --retry-delay <retryDelay>', '重试延迟（毫秒）')
    .option('-v, --verbose', '详细输出')
    .action(async (id, options: CommandOptions & {
      name?: string;
      model?: string;
      apiKey?: string;
      baseUrl?: string;
      timeout?: string;
      maxRetries?: string;
      retryDelay?: string;
    }) => {
      try {
        const adapter = new LLMProfileAdapter();
        const updates: any = {};

        if (options.name) updates.name = options.name;
        if (options.model) updates.model = options.model;
        if (options.apiKey) updates.apiKey = options.apiKey;
        if (options.baseUrl) updates.baseUrl = options.baseUrl;
        if (options.timeout) updates.timeout = parseInt(options.timeout, 10);
        if (options.maxRetries) updates.maxRetries = parseInt(options.maxRetries, 10);
        if (options.retryDelay) updates.retryDelay = parseInt(options.retryDelay, 10);

        const profile = await adapter.updateProfile(id, updates);
        console.log(formatLLMProfile(profile, { verbose: options.verbose }));
      } catch (error) {
        logger.error(`更新 LLM Profile 失败: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
      }
    });

  // 验证 LLM Profile 配置命令
  llmProfileCmd
    .command('validate <file>')
    .description('验证 LLM Profile 配置文件')
    .action(async (file) => {
      try {
        logger.info(`正在验证 LLM Profile 配置: ${file}`);

        const adapter = new LLMProfileAdapter();
        const result = await adapter.validateProfile(file);

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
        logger.error(`验证 LLM Profile 配置失败: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
      }
    });

  // 设置默认 LLM Profile 命令
  llmProfileCmd
    .command('set-default <id>')
    .description('设置默认 LLM Profile')
    .action(async (id) => {
      try {
        logger.info(`正在设置默认 LLM Profile: ${id}`);

        const adapter = new LLMProfileAdapter();
        await adapter.setDefaultProfile(id);
      } catch (error) {
        logger.error(`设置默认 LLM Profile 失败: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
      }
    });

  // 获取默认 LLM Profile 命令
  llmProfileCmd
    .command('get-default')
    .description('获取默认 LLM Profile')
    .option('-v, --verbose', '详细输出')
    .action(async (options: CommandOptions) => {
      try {
        const adapter = new LLMProfileAdapter();
        const profile = await adapter.getDefaultProfile();

        if (profile) {
          console.log(formatLLMProfile(profile, { verbose: options.verbose }));
        } else {
          console.log('未设置默认 LLM Profile');
        }
      } catch (error) {
        logger.error(`获取默认 LLM Profile 失败: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
      }
    });

  // 导出 LLM Profile 命令
  llmProfileCmd
    .command('export <id>')
    .description('导出 LLM Profile（隐藏敏感信息）')
    .action(async (id) => {
      try {
        const adapter = new LLMProfileAdapter();
        const json = await adapter.exportProfile(id);
        console.log(json);
      } catch (error) {
        logger.error(`导出 LLM Profile 失败: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
      }
    });

  // 导入 LLM Profile 命令
  llmProfileCmd
    .command('import <json>')
    .description('从 JSON 导入 LLM Profile')
    .option('-v, --verbose', '详细输出')
    .action(async (json, options: CommandOptions) => {
      try {
        logger.info('正在导入 LLM Profile');

        const adapter = new LLMProfileAdapter();
        const profile = await adapter.importProfile(json);

        console.log(formatLLMProfile(profile, { verbose: options.verbose }));
      } catch (error) {
        logger.error(`导入 LLM Profile 失败: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
      }
    });

  return llmProfileCmd;
}