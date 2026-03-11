#!/usr/bin/env node

/**
 * Modular Agent CLI Application
 * 模块化智能体框架命令行应用
 */

import { Command } from 'commander';
import { initializeLogger, getLogger, type CLILogger } from './utils/logger.js';
import { createWorkflowCommands } from './commands/workflow/index.js';
import { createThreadCommands } from './commands/thread/index.js';
import { createCheckpointCommands } from './commands/checkpoint/index.js';
import { createTemplateCommands } from './commands/template/index.js';
import { createLLMProfileCommands } from './commands/llm-profile/index.js';
import { createScriptCommands } from './commands/script/index.js';
import { createToolCommands } from './commands/tool/index.js';
import { createTriggerCommands } from './commands/trigger/index.js';
import { createMessageCommands } from './commands/message/index.js';
import { createVariableCommands } from './commands/variable/index.js';
import { createEventCommands } from './commands/event/index.js';
import { createHumanRelayCommands } from './commands/human-relay/index.js';
import { createAgentCommands } from './commands/agent/index.js';
import { createMcpCommands } from './commands/mcp/index.js';
import { createSkillCommands } from './commands/skill/index.js';

// 创建主程序实例
const program = new Command();

// 配置程序基本信息
program
  .name('modular-agent')
  .description('Modular Agent Framework - 模块化智能体框架命令行工具')
  .version('1.0.0')
  .option('-v, --verbose', '启用详细输出模式')
  .option('-d, --debug', '启用调试模式')
  .option('-l, --log-file <path>', '指定日志文件路径')
  .hook('preAction', (thisCommand) => {
    // 在执行任何命令前初始化日志记录器
    const options = thisCommand.opts() as { verbose?: boolean; debug?: boolean; logFile?: string };
    initializeLogger({
      verbose: options.verbose,
      debug: options.debug,
      logFile: options.logFile
    });
  });

// 添加工作流命令组
program.addCommand(createWorkflowCommands());

// 添加线程命令组
program.addCommand(createThreadCommands());

// 添加检查点命令组
program.addCommand(createCheckpointCommands());

// 添加模板命令组
program.addCommand(createTemplateCommands());

// 添加 LLM Profile 命令组
program.addCommand(createLLMProfileCommands());

// 添加脚本命令组
program.addCommand(createScriptCommands());

// 添加工具命令组
program.addCommand(createToolCommands());

// 添加触发器命令组
program.addCommand(createTriggerCommands());

// 添加消息命令组
program.addCommand(createMessageCommands());

// 添加变量命令组
program.addCommand(createVariableCommands());

// 添加事件命令组
program.addCommand(createEventCommands());

// 添加 Human Relay 命令组
program.addCommand(createHumanRelayCommands());

// 添加 Agent Loop 命令组
program.addCommand(createAgentCommands());

// 添加 MCP 命令组
program.addCommand(createMcpCommands());

// 添加 Skill 命令组
program.addCommand(createSkillCommands());

// 全局错误处理
program.hook('postAction', (thisCommand) => {
  const options = thisCommand.opts() as { verbose?: boolean; debug?: boolean };
  const logger = getLogger();
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

// 添加进程退出清理逻辑
const cleanup = async () => {
  const logger = getLogger();
  logger.info('正在清理资源...');
  
  try {
    // 动态导入终端模块（避免循环依赖）
    const { TerminalManager } = await import('./terminal/terminal-manager.js');
    const { CommunicationBridge } = await import('./terminal/communication-bridge.js');
    
    const terminalManager = new TerminalManager();
    const communicationBridge = new CommunicationBridge();
    
    // 清理所有终端会话
    await terminalManager.cleanupAll();
    
    // 清理所有通信桥接
    communicationBridge.cleanupAll();
    
    logger.info('资源清理完成');
    // 刷新并关闭日志流
    logger.flush(() => {
      logger.end();
    });
  } catch (error) {
    logger.error(`清理资源时出错: ${error instanceof Error ? error.message : String(error)}`);
    logger.flush(() => {
      logger.end();
    });
  }
  
  process.exit(0);
};

// 监听退出信号
process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);