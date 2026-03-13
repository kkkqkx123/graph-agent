/**
 * 变量命令组
 */

import { Command } from 'commander';
import { VariableAdapter } from '../../adapters/variable-adapter.js';
import { getLogger } from '../../utils/logger.js';
import { formatVariable, formatVariableList } from '../../utils/formatter.js';
import type { CommandOptions } from '../../types/cli-types.js';
import { handleError } from '../../utils/error-handler.js';
import { ValidationError } from '../../types/cli-types.js';

const logger = getLogger();

/**
 * 创建变量命令组
 */
export function createVariableCommands(): Command {
  const variableCmd = new Command('variable')
    .description('管理变量');

  // 列出变量命令
  variableCmd
    .command('list <thread-id>')
    .description('列出线程的所有变量')
    .option('-t, --table', '以表格格式输出')
    .option('-v, --verbose', '详细输出')
    .action(async (threadId, options: CommandOptions) => {
      try {
        const adapter = new VariableAdapter();
        const variables = await adapter.listVariables(threadId);

        console.log(formatVariableList(variables, { table: options.table }));
      } catch (error) {
        handleError(error, {
          operation: 'listVariables',
          additionalInfo: { threadId }
        });
      }
    });

  // 查看变量值命令
  variableCmd
    .command('show <thread-id> <variable-name>')
    .description('查看变量值')
    .option('-v, --verbose', '详细输出')
    .action(async (threadId, variableName, options: CommandOptions) => {
      try {
        const adapter = new VariableAdapter();
        const value = await adapter.getVariable(threadId, variableName);

        console.log(formatVariable(variableName, value, { verbose: options.verbose }));
      } catch (error) {
        handleError(error, {
          operation: 'getVariable',
          additionalInfo: { threadId, variableName }
        });
      }
    });

  // 设置变量值命令
  variableCmd
    .command('set <thread-id> <variable-name> <value>')
    .description('设置变量值')
    .option('-j, --json', '值是JSON格式')
    .action(async (threadId, variableName, value, options: { json?: boolean }) => {
      try {
        logger.info(`正在设置变量: ${variableName}`);

        // 解析值
        let parsedValue: any = value;
        if (options.json) {
          try {
            parsedValue = JSON.parse(value);
          } catch (error) {
            handleError(new ValidationError('值必须是有效的JSON格式'), {
              operation: 'setVariable',
              additionalInfo: { threadId, variableName, value }
            });
            return;
          }
        }

        const adapter = new VariableAdapter();
        await adapter.setVariable(threadId, variableName, parsedValue);
      } catch (error) {
        handleError(error, {
          operation: 'setVariable',
          additionalInfo: { threadId, variableName }
        });
      }
    });

  // 删除变量命令
  variableCmd
    .command('delete <thread-id> <variable-name>')
    .description('删除变量')
    .option('-f, --force', '强制删除，不提示确认')
    .action(async (threadId, variableName, options: { force?: boolean }) => {
      try {
        if (!options.force) {
          logger.warn(`即将删除变量: ${variableName}`);
          // 在实际应用中，这里可以添加交互式确认
          logger.info('使用 --force 选项跳过确认');
          return;
        }

        const adapter = new VariableAdapter();
        await adapter.deleteVariable(threadId, variableName);
      } catch (error) {
        handleError(error, {
          operation: 'deleteVariable',
          additionalInfo: { threadId, variableName }
        });
      }
    });

  // 获取变量定义命令
  variableCmd
    .command('definition <thread-id> <variable-name>')
    .description('获取变量定义信息')
    .action(async (threadId, variableName) => {
      try {
        const adapter = new VariableAdapter();
        const definition = await adapter.getVariableDefinition(threadId, variableName);

        if (definition) {
          console.log(`\n变量定义:`);
          console.log(`  名称: ${definition.name}`);
          console.log(`  类型: ${definition.type}`);
          if (definition.description) {
            console.log(`  描述: ${definition.description}`);
          }
          if (definition.defaultValue !== undefined) {
            console.log(`  默认值: ${JSON.stringify(definition.defaultValue)}`);
          }
          if (definition.required !== undefined) {
            console.log(`  必需: ${definition.required ? '是' : '否'}`);
          }
        } else {
          console.log('未找到变量定义');
        }
      } catch (error) {
        handleError(error, {
          operation: 'getVariableDefinition',
          additionalInfo: { threadId, variableName }
        });
      }
    });

  return variableCmd;
}