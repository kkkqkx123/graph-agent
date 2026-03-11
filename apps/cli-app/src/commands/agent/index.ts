/**
 * Agent Loop 命令组
 */

import { Command } from 'commander';
import { AgentLoopAdapter } from '../../adapters/agent-loop-adapter.js';
import { getLogger } from '../../utils/logger.js';
import { formatAgentLoop, formatAgentLoopList } from '../../utils/formatter.js';
import type { CommandOptions } from '../../types/cli-types.js';
import type { AgentLoopConfig } from '@modular-agent/types';

const logger = getLogger();

/**
 * 创建 Agent Loop 命令组
 */
export function createAgentCommands(): Command {
  const agentCmd = new Command('agent')
    .description('管理 Agent Loop');

  // 执行 Agent Loop 命令
  agentCmd
    .command('run')
    .description('执行 Agent Loop')
    .option('-p, --profile <profileId>', 'LLM Profile ID')
    .option('-s, --system-prompt <prompt>', '系统提示词')
    .option('-m, --max-iterations <number>', '最大迭代次数', '10')
    .option('-t, --tools <tools>', '工具列表（逗号分隔）')
    .option('-i, --input <json>', '初始输入数据(JSON格式)')
    .option('--stream', '流式执行')
    .option('-v, --verbose', '详细输出')
    .action(async (options: CommandOptions & {
      profile?: string;
      systemPrompt?: string;
      maxIterations?: string;
      tools?: string;
      input?: string;
      stream?: boolean;
    }) => {
      try {
        logger.info('正在执行 Agent Loop...');

        // Parse config
        const config: AgentLoopConfig = {
          profileId: options.profile || 'DEFAULT',
          systemPrompt: options.systemPrompt,
          maxIterations: parseInt(options.maxIterations || '10', 10),
          tools: options.tools ? options.tools.split(',').map(t => t.trim()) : []
        };

        // Parse initial input
        let initialMessages: any[] = [];
        if (options.input) {
          try {
            const inputData = JSON.parse(options.input);
            if (Array.isArray(inputData)) {
              initialMessages = inputData;
            } else if (inputData.message) {
              initialMessages = [{ role: 'user', content: inputData.message }];
            }
          } catch (error) {
            logger.error('输入数据必须是有效的JSON格式');
            process.exit(1);
          }
        }

        const adapter = new AgentLoopAdapter();

        if (options.stream) {
          // Stream execution
          const result = await adapter.executeAgentLoopStream(
            config,
            { initialMessages },
            (event) => {
              // Print stream events
              if (event.type === 'text') {
                process.stdout.write(event.delta);
              } else if (event.type === 'tool_call_start') {
                console.log(`\n[工具调用] ${event.data?.toolCall?.function?.name || 'unknown'}`);
              } else if (event.type === 'tool_call_end') {
                if (event.data?.success) {
                  console.log(`[工具完成] ${event.data?.toolCallId}`);
                } else {
                  console.log(`[工具失败] ${event.data?.toolCallId}: ${event.data?.error}`);
                }
              } else if (event.type === 'iteration_complete') {
                console.log(`\n[迭代 ${event.data?.iteration} 完成]`);
              }
            }
          );

          console.log('\n');
          console.log(formatAgentLoop(result, { verbose: options.verbose }));
        } else {
          // Sync execution
          const result = await adapter.executeAgentLoop(config, { initialMessages });
          console.log(formatAgentLoop(result, { verbose: options.verbose }));
        }
      } catch (error) {
        logger.error(`执行 Agent Loop 失败: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
      }
    });

  // 异步启动 Agent Loop 命令
  agentCmd
    .command('start')
    .description('异步启动 Agent Loop')
    .option('-p, --profile <profileId>', 'LLM Profile ID')
    .option('-s, --system-prompt <prompt>', '系统提示词')
    .option('-m, --max-iterations <number>', '最大迭代次数', '10')
    .option('-t, --tools <tools>', '工具列表（逗号分隔）')
    .option('-i, --input <json>', '初始输入数据(JSON格式)')
    .action(async (options: CommandOptions & {
      profile?: string;
      systemPrompt?: string;
      maxIterations?: string;
      tools?: string;
      input?: string;
    }) => {
      try {
        logger.info('正在启动 Agent Loop...');

        const config: AgentLoopConfig = {
          profileId: options.profile || 'DEFAULT',
          systemPrompt: options.systemPrompt,
          maxIterations: parseInt(options.maxIterations || '10', 10),
          tools: options.tools ? options.tools.split(',').map(t => t.trim()) : []
        };

        let initialMessages: any[] = [];
        if (options.input) {
          try {
            const inputData = JSON.parse(options.input);
            if (Array.isArray(inputData)) {
              initialMessages = inputData;
            } else if (inputData.message) {
              initialMessages = [{ role: 'user', content: inputData.message }];
            }
          } catch (error) {
            logger.error('输入数据必须是有效的JSON格式');
            process.exit(1);
          }
        }

        const adapter = new AgentLoopAdapter();
        const id = await adapter.startAgentLoop(config, { initialMessages });

        console.log(`\n✓ Agent Loop 已启动`);
        console.log(`  ID: ${id}`);
        console.log(`\n提示: 使用 'modular-agent agent status ${id}' 查看状态`);
      } catch (error) {
        logger.error(`启动 Agent Loop 失败: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
      }
    });

  // 暂停 Agent Loop 命令
  agentCmd
    .command('pause <id>')
    .description('暂停 Agent Loop')
    .action(async (id) => {
      try {
        logger.info(`正在暂停 Agent Loop: ${id}`);

        const adapter = new AgentLoopAdapter();
        await adapter.pauseAgentLoop(id);
      } catch (error) {
        logger.error(`暂停 Agent Loop 失败: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
      }
    });

  // 恢复 Agent Loop 命令
  agentCmd
    .command('resume <id>')
    .description('恢复 Agent Loop')
    .action(async (id) => {
      try {
        logger.info(`正在恢复 Agent Loop: ${id}`);

        const adapter = new AgentLoopAdapter();
        const result = await adapter.resumeAgentLoop(id);

        console.log(formatAgentLoop(result));
      } catch (error) {
        logger.error(`恢复 Agent Loop 失败: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
      }
    });

  // 停止 Agent Loop 命令
  agentCmd
    .command('stop <id>')
    .description('停止 Agent Loop')
    .action(async (id) => {
      try {
        logger.info(`正在停止 Agent Loop: ${id}`);

        const adapter = new AgentLoopAdapter();
        await adapter.stopAgentLoop(id);
      } catch (error) {
        logger.error(`停止 Agent Loop 失败: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
      }
    });

  // 查看状态命令
  agentCmd
    .command('status <id>')
    .description('查看 Agent Loop 状态')
    .action(async (id) => {
      try {
        const adapter = new AgentLoopAdapter();
        const status = adapter.getAgentLoopStatus(id);

        if (!status) {
          logger.error(`Agent Loop 不存在: ${id}`);
          process.exit(1);
        }

        console.log(`\nAgent Loop 状态:`);
        console.log(`  ID: ${id}`);
        console.log(`  状态: ${status}`);
      } catch (error) {
        logger.error(`获取状态失败: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
      }
    });

  // 查看详情命令
  agentCmd
    .command('show <id>')
    .description('查看 Agent Loop 详情')
    .option('-v, --verbose', '详细输出')
    .action(async (id, options: CommandOptions) => {
      try {
        const adapter = new AgentLoopAdapter();
        const agentLoop = adapter.getAgentLoop(id);

        if (!agentLoop) {
          logger.error(`Agent Loop 不存在: ${id}`);
          process.exit(1);
        }

        console.log(formatAgentLoop(agentLoop, { verbose: options.verbose }));
      } catch (error) {
        logger.error(`获取详情失败: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
      }
    });

  // 列出 Agent Loop 命令
  agentCmd
    .command('list')
    .description('列出所有 Agent Loop')
    .option('--running', '仅显示运行中的')
    .option('--paused', '仅显示暂停的')
    .option('-t, --table', '以表格格式输出')
    .action(async (options: CommandOptions & { running?: boolean; paused?: boolean }) => {
      try {
        const adapter = new AgentLoopAdapter();

        let agentLoops: any[];
        if (options.running) {
          agentLoops = adapter.listRunningAgentLoops();
        } else if (options.paused) {
          agentLoops = adapter.listPausedAgentLoops();
        } else {
          agentLoops = adapter.listAgentLoops();
        }

        console.log(formatAgentLoopList(agentLoops, { table: options.table }));
      } catch (error) {
        logger.error(`列出 Agent Loop 失败: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
      }
    });

  // 创建检查点命令
  agentCmd
    .command('checkpoint <id>')
    .description('创建 Agent Loop 检查点')
    .option('-n, --name <name>', '检查点名称')
    .action(async (id, options: CommandOptions & { name?: string }) => {
      try {
        logger.info(`正在创建检查点: ${id}`);

        const adapter = new AgentLoopAdapter();

        // Note: In real implementation, dependencies should be provided by the SDK
        const dependencies = {
          saveCheckpoint: async (checkpoint: any) => {
            logger.info(`保存检查点: ${JSON.stringify(checkpoint)}`);
            return `checkpoint-${Date.now()}`;
          },
          getCheckpoint: async (checkpointId: string) => {
            return { id: checkpointId };
          },
          listCheckpoints: async (agentLoopId: string) => {
            return [];
          }
        };

        const checkpointId = await adapter.createCheckpoint(id, dependencies, { name: options.name });
        console.log(`\n✓ 检查点已创建: ${checkpointId}`);
      } catch (error) {
        logger.error(`创建检查点失败: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
      }
    });

  // 从检查点恢复命令
  agentCmd
    .command('restore <checkpoint-id>')
    .description('从检查点恢复 Agent Loop')
    .action(async (checkpointId) => {
      try {
        logger.info(`正在从检查点恢复: ${checkpointId}`);

        const adapter = new AgentLoopAdapter();

        // Note: In real implementation, dependencies should be provided by the SDK
        const dependencies = {
          saveCheckpoint: async (checkpoint: any) => {
            return `checkpoint-${Date.now()}`;
          },
          getCheckpoint: async (id: string) => {
            return { id };
          },
          listCheckpoints: async (agentLoopId: string) => {
            return [];
          }
        };

        const result = await adapter.restoreFromCheckpoint(checkpointId, dependencies);
        console.log(`\n✓ Agent Loop 已恢复: ${result.id}`);
      } catch (error) {
        logger.error(`从检查点恢复失败: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
      }
    });

  // 克隆 Agent Loop 命令
  agentCmd
    .command('clone <id>')
    .description('克隆 Agent Loop')
    .action(async (id) => {
      try {
        logger.info(`正在克隆 Agent Loop: ${id}`);

        const adapter = new AgentLoopAdapter();
        const result = await adapter.cloneAgentLoop(id);

        console.log(`\n✓ Agent Loop 已克隆`);
        console.log(`  新 ID: ${result.id}`);
      } catch (error) {
        logger.error(`克隆 Agent Loop 失败: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
      }
    });

  // 清理已完成实例命令
  agentCmd
    .command('cleanup')
    .description('清理已完成的 Agent Loop')
    .action(async () => {
      try {
        const adapter = new AgentLoopAdapter();
        const count = adapter.cleanupAgentLoops();

        console.log(`\n✓ 已清理 ${count} 个完成的 Agent Loop`);
      } catch (error) {
        logger.error(`清理失败: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
      }
    });

  // 查看消息历史命令
  agentCmd
    .command('messages <id>')
    .description('查看 Agent Loop 消息历史')
    .option('-v, --verbose', '详细输出')
    .action(async (id, options: CommandOptions) => {
      try {
        const adapter = new AgentLoopAdapter();
        const messages = adapter.getAgentLoopMessages(id);

        if (options.verbose) {
          console.log(JSON.stringify(messages, null, 2));
        } else {
          messages.forEach((msg: any, index: number) => {
            const role = msg.role || 'unknown';
            const content = msg.content || '';
            const preview = content.length > 100 ? content.substring(0, 100) + '...' : content;
            console.log(`${index + 1}. [${role}] ${preview}`);
          });
        }
      } catch (error) {
        logger.error(`获取消息历史失败: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
      }
    });

  // 查看变量命令
  agentCmd
    .command('variables <id>')
    .description('查看 Agent Loop 变量')
    .option('-t, --table', '以表格格式输出')
    .action(async (id, options: CommandOptions) => {
      try {
        const adapter = new AgentLoopAdapter();
        const variables = adapter.getAgentLoopVariables(id);

        const entries = Object.entries(variables);
        if (entries.length === 0) {
          console.log('没有变量');
          return;
        }

        if (options.table) {
          console.log('变量名 | 值 | 类型');
          console.log('-'.repeat(40));
          entries.forEach(([name, value]) => {
            const valueStr = typeof value === 'object' ? JSON.stringify(value) : String(value);
            console.log(`${name} | ${valueStr} | ${typeof value}`);
          });
        } else {
          entries.forEach(([name, value]) => {
            const valueStr = typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value);
            console.log(`${name} = ${valueStr}`);
          });
        }
      } catch (error) {
        logger.error(`获取变量失败: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
      }
    });

  // 设置变量命令
  agentCmd
    .command('set-var <id> <name> <value>')
    .description('设置 Agent Loop 变量')
    .action(async (id, name, value) => {
      try {
        const adapter = new AgentLoopAdapter();

        // Try to parse as JSON, otherwise use as string
        let parsedValue: any;
        try {
          parsedValue = JSON.parse(value);
        } catch {
          parsedValue = value;
        }

        adapter.setAgentLoopVariable(id, name, parsedValue);
        console.log(`\n✓ 变量已设置: ${name}`);
      } catch (error) {
        logger.error(`设置变量失败: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
      }
    });

  // 删除 Agent Loop 命令
  agentCmd
    .command('delete <id>')
    .description('删除 Agent Loop')
    .option('-f, --force', '强制删除，不提示确认')
    .action(async (id, options: { force?: boolean }) => {
      try {
        if (!options.force) {
          logger.warn(`即将删除 Agent Loop: ${id}`);
          logger.info('使用 --force 选项跳过确认');
          return;
        }

        const adapter = new AgentLoopAdapter();
        adapter.cleanupAgentLoop(id);
      } catch (error) {
        logger.error(`删除 Agent Loop 失败: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
      }
    });

  return agentCmd;
}
