/**
 * Human Relay 命令组
 */

import { Command } from 'commander';
import { HumanRelayAdapter } from '../../adapters/human-relay-adapter.js';
import { createLogger } from '../../utils/logger.js';
import { formatHumanRelay, formatHumanRelayList } from '../../utils/formatter.js';
import type { CommandOptions } from '../../types/cli-types.js';

const logger = createLogger();

/**
 * 创建 Human Relay 命令组
 */
export function createHumanRelayCommands(): Command {
  const humanRelayCmd = new Command('human-relay')
    .description('管理 Human Relay 配置')
    .alias('hr');

  // 注册 Human Relay 配置命令
  humanRelayCmd
    .command('register <file>')
    .description('从文件注册 Human Relay 配置')
    .option('-v, --verbose', '详细输出')
    .action(async (file, options: CommandOptions) => {
      try {
        logger.info(`正在注册 Human Relay 配置: ${file}`);

        // 读取配置文件
        const fs = await import('fs/promises');
        const content = await fs.readFile(file, 'utf-8');
        const config = JSON.parse(content);

        const adapter = new HumanRelayAdapter();
        const result = await adapter.createConfig(config);

        console.log(formatHumanRelay(result, { verbose: options.verbose }));
      } catch (error) {
        logger.error(`注册 Human Relay 配置失败: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
      }
    });

  // 列出 Human Relay 配置命令
  humanRelayCmd
    .command('list')
    .description('列出所有 Human Relay 配置')
    .option('-t, --table', '以表格格式输出')
    .option('-v, --verbose', '详细输出')
    .option('--enabled', '只显示已启用的配置')
    .action(async (options: CommandOptions & { enabled?: boolean }) => {
      try {
        const adapter = new HumanRelayAdapter();
        const filter = options.enabled !== undefined ? { enabled: options.enabled } : undefined;
        const configs = await adapter.listConfigs(filter);

        console.log(formatHumanRelayList(configs, { table: options.table }));
      } catch (error) {
        logger.error(`列出 Human Relay 配置失败: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
      }
    });

  // 查看 Human Relay 配置详情命令
  humanRelayCmd
    .command('show <id>')
    .description('查看 Human Relay 配置详情')
    .option('-v, --verbose', '详细输出')
    .action(async (id, options: CommandOptions) => {
      try {
        const adapter = new HumanRelayAdapter();
        const config = await adapter.getConfig(id);

        console.log(formatHumanRelay(config, { verbose: options.verbose }));
      } catch (error) {
        logger.error(`获取 Human Relay 配置详情失败: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
      }
    });

  // 删除 Human Relay 配置命令
  humanRelayCmd
    .command('delete <id>')
    .description('删除 Human Relay 配置')
    .option('-f, --force', '强制删除，不提示确认')
    .action(async (id, options: { force?: boolean }) => {
      try {
        if (!options.force) {
          logger.warn(`即将删除 Human Relay 配置: ${id}`);
          // 在实际应用中，这里可以添加交互式确认
          logger.info('使用 --force 选项跳过确认');
          return;
        }

        const adapter = new HumanRelayAdapter();
        await adapter.deleteConfig(id);
      } catch (error) {
        logger.error(`删除 Human Relay 配置失败: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
      }
    });

  // 更新 Human Relay 配置命令
  humanRelayCmd
    .command('update <id>')
    .description('更新 Human Relay 配置')
    .option('-n, --name <name>', '配置名称')
    .option('-d, --description <description>', '配置描述')
    .option('-t, --timeout <timeout>', '默认超时时间（毫秒）')
    .option('-v, --verbose', '详细输出')
    .action(async (id, options: CommandOptions & {
      name?: string;
      description?: string;
      timeout?: string;
    }) => {
      try {
        const adapter = new HumanRelayAdapter();
        const updates: any = {};

        if (options.name) updates.name = options.name;
        if (options.description) updates.description = options.description;
        if (options.timeout) updates.defaultTimeout = parseInt(options.timeout, 10);

        const config = await adapter.updateConfig(id, updates);
        console.log(formatHumanRelay(config, { verbose: options.verbose }));
      } catch (error) {
        logger.error(`更新 Human Relay 配置失败: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
      }
    });

  // 启用 Human Relay 配置命令
  humanRelayCmd
    .command('enable <id>')
    .description('启用 Human Relay 配置')
    .action(async (id) => {
      try {
        logger.info(`正在启用 Human Relay 配置: ${id}`);

        const adapter = new HumanRelayAdapter();
        await adapter.enableConfig(id);
      } catch (error) {
        logger.error(`启用 Human Relay 配置失败: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
      }
    });

  // 禁用 Human Relay 配置命令
  humanRelayCmd
    .command('disable <id>')
    .description('禁用 Human Relay 配置')
    .action(async (id) => {
      try {
        logger.info(`正在禁用 Human Relay 配置: ${id}`);

        const adapter = new HumanRelayAdapter();
        await adapter.disableConfig(id);
      } catch (error) {
        logger.error(`禁用 Human Relay 配置失败: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
      }
    });

  return humanRelayCmd;
}