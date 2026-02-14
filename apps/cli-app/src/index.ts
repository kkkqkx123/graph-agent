#!/usr/bin/env node

/**
 * Modular Agent CLI Application
 * 模块化智能体框架命令行应用
 */

import { Command } from 'commander';
import { createLogger } from './utils/logger.js';
import { createWorkflowCommands } from './commands/workflow/index.js';
import { createThreadCommands } from './commands/thread/index.js';
import { createCheckpointCommands } from './commands/checkpoint/index.js';
import { createTemplateCommands } from './commands/template/index.js';

// 创建日志记录器
const logger = createLogger();

// 创建主程序实例
const program = new Command();

// 配置程序基本信息
program
  .name('modular-agent')
  .description('Modular Agent Framework - 模块化智能体框架命令行工具')
  .version('1.0.0')
  .option('-v, --verbose', '启用详细输出模式')
  .option('-d, --debug', '启用调试模式');

// 添加工作流命令组
program.addCommand(createWorkflowCommands());

// 添加线程命令组
program.addCommand(createThreadCommands());

// 添加检查点命令组
program.addCommand(createCheckpointCommands());

// 添加模板命令组
program.addCommand(createTemplateCommands());

// 全局错误处理
program.hook('postAction', (thisCommand) => {
  const options = thisCommand.opts() as { verbose?: boolean; debug?: boolean };
  if (options.verbose || options.debug) {
    logger.info('详细模式已启用');
  }
});

// 解析命令行参数
program.parse(process.argv);

// 如果没有提供任何命令，显示帮助信息
if (!process.argv.slice(2).length) {
  program.outputHelp();
}