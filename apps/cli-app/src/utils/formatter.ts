/**
 * 输出格式化工具
 * 提供统一的输出格式化接口
 */

import chalk from 'chalk';

/**
 * 格式化工作流信息
 */
export function formatWorkflow(workflow: any, options: { verbose?: boolean } = {}): string {
  if (options.verbose) {
    return JSON.stringify(workflow, null, 2);
  }
  
  return `${chalk.blue(workflow.name || '未命名')} (${chalk.gray(workflow.id || 'N/A')}) - ${formatStatus(workflow.status)}`;
}

/**
 * 格式化工作流列表
 */
export function formatWorkflowList(workflows: any[], options: { table?: boolean } = {}): string {
  if (workflows.length === 0) {
    return chalk.yellow('没有找到工作流');
  }

  if (options.table) {
    const headers = ['ID', '名称', '状态', '创建时间'];
    const rows = workflows.map(w => [
      chalk.gray(w.id?.substring(0, 8) || 'N/A'),
      w.name || '未命名',
      formatStatus(w.status),
      w.createdAt || 'N/A'
    ]);
    
    return formatTable(headers, rows);
  }

  return workflows.map(w => formatWorkflow(w)).join('\n');
}

/**
 * 格式化线程信息
 */
export function formatThread(thread: any, options: { verbose?: boolean } = {}): string {
  if (options.verbose) {
    return JSON.stringify(thread, null, 2);
  }
  
  return `${chalk.blue(thread.id || 'N/A')} - ${formatStatus(thread.status)} - ${chalk.gray(thread.workflowId || 'N/A')}`;
}

/**
 * 格式化线程列表
 */
export function formatThreadList(threads: any[], options: { table?: boolean } = {}): string {
  if (threads.length === 0) {
    return chalk.yellow('没有找到线程');
  }

  if (options.table) {
    const headers = ['线程ID', '工作流ID', '状态', '创建时间'];
    const rows = threads.map(t => [
      chalk.gray(t.id?.substring(0, 8) || 'N/A'),
      chalk.gray(t.workflowId?.substring(0, 8) || 'N/A'),
      formatStatus(t.status),
      t.createdAt || 'N/A'
    ]);
    
    return formatTable(headers, rows);
  }

  return threads.map(t => formatThread(t)).join('\n');
}

/**
 * 格式化检查点信息
 */
export function formatCheckpoint(checkpoint: any, options: { verbose?: boolean } = {}): string {
  if (options.verbose) {
    return JSON.stringify(checkpoint, null, 2);
  }
  
  return `${chalk.blue(checkpoint.id || 'N/A')} - ${chalk.gray(checkpoint.threadId || 'N/A')} - ${checkpoint.createdAt || 'N/A'}`;
}

/**
 * 格式化检查点列表
 */
export function formatCheckpointList(checkpoints: any[], options: { table?: boolean } = {}): string {
  if (checkpoints.length === 0) {
    return chalk.yellow('没有找到检查点');
  }

  if (options.table) {
    const headers = ['检查点ID', '线程ID', '创建时间'];
    const rows = checkpoints.map(c => [
      chalk.gray(c.id?.substring(0, 8) || 'N/A'),
      chalk.gray(c.threadId?.substring(0, 8) || 'N/A'),
      c.createdAt || 'N/A'
    ]);
    
    return formatTable(headers, rows);
  }

  return checkpoints.map(c => formatCheckpoint(c)).join('\n');
}

/**
 * 格式化状态
 */
function formatStatus(status: string): string {
  switch (status?.toLowerCase()) {
    case 'running':
    case 'active':
      return chalk.green(status);
    case 'paused':
    case 'suspended':
      return chalk.yellow(status);
    case 'stopped':
    case 'cancelled':
    case 'failed':
      return chalk.red(status);
    case 'completed':
    case 'success':
      return chalk.green.bold(status);
    default:
      return chalk.gray(status || 'unknown');
  }
}

/**
 * 格式化表格
 */
function formatTable(headers: string[], rows: string[][]): string {
  // 计算每列的最大宽度
  const columnWidths = headers.map((header, index) => {
    const maxRowWidth = Math.max(...rows.map(row => (row[index] || '').length));
    return Math.max(header.length, maxRowWidth);
  });

  // 格式化表头
  const headerRow = headers.map((header, index) =>
    header.padEnd(columnWidths[index] || 0)
  ).join(' | ');

  // 格式化分隔线
  const separator = columnWidths.map(width => '-'.repeat(width || 0)).join('-+-');

  // 格式化数据行
  const dataRows = rows.map(row =>
    row.map((cell, index) =>
      (cell || '').padEnd(columnWidths[index] || 0)
    ).join(' | ')
  );

  return [headerRow, separator, ...dataRows].join('\n');
}

/**
 * 格式化错误信息
 */
export function formatError(error: Error | string): string {
  const message = error instanceof Error ? error.message : error;
  return chalk.red.bold('错误: ') + message;
}

/**
 * 格式化成功信息
 */
export function formatSuccess(message: string): string {
  return chalk.green.bold('✓ ') + message;
}

/**
 * 格式化警告信息
 */
export function formatWarning(message: string): string {
  return chalk.yellow.bold('⚠ ') + message;
}

/**
 * 格式化信息
 */
export function formatInfo(message: string): string {
  return chalk.blue.bold('ℹ ') + message;
}

/**
 * 格式化 LLM Profile 信息
 */
export function formatLLMProfile(profile: any, options: { verbose?: boolean } = {}): string {
  if (options.verbose) {
    return JSON.stringify(profile, null, 2);
  }
  
  const provider = profile.provider || 'N/A';
  const model = profile.model || 'N/A';
  const baseUrl = profile.baseUrl || 'default';
  
  return `${chalk.blue(profile.name || '未命名')} (${chalk.gray(profile.id || 'N/A')}) - ${chalk.cyan(provider)} - ${chalk.yellow(model)} - ${chalk.gray(baseUrl)}`;
}

/**
 * 格式化 LLM Profile 列表
 */
export function formatLLMProfileList(profiles: any[], options: { table?: boolean } = {}): string {
  if (profiles.length === 0) {
    return chalk.yellow('没有找到 LLM Profile');
  }

  if (options.table) {
    const headers = ['ID', '名称', '提供商', '模型', '基础 URL'];
    const rows = profiles.map(p => [
      chalk.gray(p.id?.substring(0, 8) || 'N/A'),
      p.name || '未命名',
      chalk.cyan(p.provider || 'N/A'),
      chalk.yellow(p.model || 'N/A'),
      p.baseUrl || 'default'
    ]);
    
    return formatTable(headers, rows);
  }

  return profiles.map(p => formatLLMProfile(p)).join('\n');
}

/**
 * 格式化脚本信息
 */
export function formatScript(script: any, options: { verbose?: boolean } = {}): string {
  if (options.verbose) {
    return JSON.stringify(script, null, 2);
  }
  
  const type = script.type || 'N/A';
  const language = script.language || 'N/A';
  
  return `${chalk.blue(script.name || '未命名')} (${chalk.gray(script.id || 'N/A')}) - ${chalk.cyan(type)} - ${chalk.yellow(language)}`;
}

/**
 * 格式化脚本列表
 */
export function formatScriptList(scripts: any[], options: { table?: boolean } = {}): string {
  if (scripts.length === 0) {
    return chalk.yellow('没有找到脚本');
  }

  if (options.table) {
    const headers = ['ID', '名称', '类型', '语言', '描述'];
    const rows = scripts.map(s => [
      chalk.gray(s.id?.substring(0, 8) || 'N/A'),
      s.name || '未命名',
      chalk.cyan(s.type || 'N/A'),
      chalk.yellow(s.language || 'N/A'),
      s.description || '-'
    ]);
    
    return formatTable(headers, rows);
  }

  return scripts.map(s => formatScript(s)).join('\n');
}

/**
 * 格式化工具信息
 */
export function formatTool(tool: any, options: { verbose?: boolean } = {}): string {
  if (options.verbose) {
    return JSON.stringify(tool, null, 2);
  }
  
  const type = tool.type || 'N/A';
  
  return `${chalk.blue(tool.name || '未命名')} (${chalk.gray(tool.id || 'N/A')}) - ${chalk.cyan(type)}`;
}

/**
 * 格式化工具列表
 */
export function formatToolList(tools: any[], options: { table?: boolean } = {}): string {
  if (tools.length === 0) {
    return chalk.yellow('没有找到工具');
  }

  if (options.table) {
    const headers = ['ID', '名称', '类型', '描述'];
    const rows = tools.map(t => [
      chalk.gray(t.id?.substring(0, 8) || 'N/A'),
      t.name || '未命名',
      chalk.cyan(t.type || 'N/A'),
      t.description || '-'
    ]);
    
    return formatTable(headers, rows);
  }

  return tools.map(t => formatTool(t)).join('\n');
}

/**
 * 格式化触发器信息
 */
export function formatTrigger(trigger: any, options: { verbose?: boolean } = {}): string {
  if (options.verbose) {
    return JSON.stringify(trigger, null, 2);
  }
  
  const status = trigger.status || 'unknown';
  const type = trigger.type || 'N/A';
  
  return `${chalk.blue(trigger.id || 'N/A')} - ${formatStatus(status)} - ${chalk.cyan(type)} - ${chalk.gray(trigger.threadId || 'N/A')}`;
}

/**
 * 格式化触发器列表
 */
export function formatTriggerList(triggers: any[], options: { table?: boolean } = {}): string {
  if (triggers.length === 0) {
    return chalk.yellow('没有找到触发器');
  }

  if (options.table) {
    const headers = ['触发器ID', '类型', '状态', '线程ID'];
    const rows = triggers.map(t => [
      chalk.gray(t.id?.substring(0, 8) || 'N/A'),
      chalk.cyan(t.type || 'N/A'),
      formatStatus(t.status),
      chalk.gray(t.threadId?.substring(0, 8) || 'N/A')
    ]);
    
    return formatTable(headers, rows);
  }

  return triggers.map(t => formatTrigger(t)).join('\n');
}

/**
 * 格式化消息信息
 */
export function formatMessage(message: any, options: { verbose?: boolean } = {}): string {
  if (options.verbose) {
    return JSON.stringify(message, null, 2);
  }
  
  const role = message.role || 'N/A';
  const content = message.content || '';
  const preview = content.length > 50 ? content.substring(0, 50) + '...' : content;
  
  return `${chalk.cyan(role)}: ${chalk.gray(preview)}`;
}

/**
 * 格式化消息列表
 */
export function formatMessageList(messages: any[], options: { table?: boolean } = {}): string {
  if (messages.length === 0) {
    return chalk.yellow('没有找到消息');
  }

  if (options.table) {
    const headers = ['角色', '内容预览', '时间'];
    const rows = messages.map(m => {
      const content = m.content || '';
      const preview = content.length > 30 ? content.substring(0, 30) + '...' : content;
      return [
        chalk.cyan(m.role || 'N/A'),
        preview,
        m.timestamp || 'N/A'
      ];
    });
    
    return formatTable(headers, rows);
  }

  return messages.map(m => formatMessage(m)).join('\n');
}

/**
 * 格式化变量信息
 */
export function formatVariable(name: string, value: any, options: { verbose?: boolean } = {}): string {
  if (options.verbose) {
    return JSON.stringify({ name, value }, null, 2);
  }
  
  const valueStr = typeof value === 'object'
    ? JSON.stringify(value, null, 2)
    : String(value);
  
  return `${chalk.blue(name)} = ${chalk.yellow(valueStr)}`;
}

/**
 * 格式化变量列表
 */
export function formatVariableList(variables: Record<string, any>, options: { table?: boolean } = {}): string {
  const entries = Object.entries(variables);
  
  if (entries.length === 0) {
    return chalk.yellow('没有找到变量');
  }

  if (options.table) {
    const headers = ['变量名', '值', '类型'];
    const rows = entries.map(([name, value]) => [
      chalk.blue(name),
      typeof value === 'object' ? JSON.stringify(value).substring(0, 30) + '...' : String(value),
      chalk.cyan(typeof value)
    ]);
    
    return formatTable(headers, rows);
  }

  return entries.map(([name, value]) => formatVariable(name, value)).join('\n');
}

/**
 * 格式化事件信息
 */
export function formatEvent(event: any, options: { verbose?: boolean } = {}): string {
  if (options.verbose) {
    return JSON.stringify(event, null, 2);
  }
  
  const type = event.type || 'N/A';
  const timestamp = event.timestamp || 'N/A';
  const threadId = event.threadId || 'N/A';
  
  return `${chalk.cyan(type)} - ${chalk.gray(timestamp)} - ${chalk.blue(threadId.substring(0, 8))}`;
}

/**
 * 格式化事件列表
 */
export function formatEventList(events: any[], options: { table?: boolean } = {}): string {
  if (events.length === 0) {
    return chalk.yellow('没有找到事件');
  }

  if (options.table) {
    const headers = ['类型', '时间', '线程ID', '工作流ID'];
    const rows = events.map(e => [
      chalk.cyan(e.type || 'N/A'),
      e.timestamp || 'N/A',
      chalk.gray(e.threadId?.substring(0, 8) || 'N/A'),
      chalk.gray(e.workflowId?.substring(0, 8) || 'N/A')
    ]);
    
    return formatTable(headers, rows);
  }

  return events.map(e => formatEvent(e)).join('\n');
}

/**
 * 格式化 Human Relay 配置信息
 */
export function formatHumanRelay(config: any, options: { verbose?: boolean } = {}): string {
  if (options.verbose) {
    return JSON.stringify(config, null, 2);
  }
  
  const enabled = config.enabled ? '已启用' : '已禁用';
  const statusColor = config.enabled ? chalk.green : chalk.red;
  
  return `${chalk.blue(config.name || '未命名')} (${chalk.gray(config.id || 'N/A')}) - ${statusColor(enabled)}`;
}

/**
 * 格式化 Human Relay 配置列表
 */
export function formatHumanRelayList(configs: any[], options: { table?: boolean } = {}): string {
  if (configs.length === 0) {
    return chalk.yellow('没有找到 Human Relay 配置');
  }

  if (options.table) {
    const headers = ['ID', '名称', '状态', '描述'];
    const rows = configs.map(c => {
      const enabled = c.enabled ? '已启用' : '已禁用';
      const statusColor = c.enabled ? chalk.green : chalk.red;
      return [
        chalk.gray(c.id?.substring(0, 8) || 'N/A'),
        c.name || '未命名',
        statusColor(enabled),
        c.description || '-'
      ];
    });
    
    return formatTable(headers, rows);
  }

  return configs.map(c => formatHumanRelay(c)).join('\n');
}

/**
 * 格式化 Agent Loop 信息
 */
export function formatAgentLoop(agentLoop: any, options: { verbose?: boolean } = {}): string {
  if (options.verbose) {
    return JSON.stringify(agentLoop, null, 2);
  }

  const id = agentLoop.id || 'N/A';
  const status = agentLoop.status || agentLoop.success ? 'completed' : 'failed';
  const iterations = agentLoop.iterations ?? agentLoop.currentIteration ?? 0;
  const toolCallCount = agentLoop.toolCallCount ?? 0;

  let content = '';
  if (agentLoop.content) {
    content = agentLoop.content.length > 50
      ? agentLoop.content.substring(0, 50) + '...'
      : agentLoop.content;
  }

  return `${chalk.blue(id)} - ${formatStatus(status)} - 迭代: ${chalk.cyan(iterations)} - 工具调用: ${chalk.yellow(toolCallCount)}${content ? `\n  结果: ${chalk.gray(content)}` : ''}`;
}

/**
 * 格式化 Agent Loop 列表
 */
export function formatAgentLoopList(agentLoops: any[], options: { table?: boolean } = {}): string {
  if (agentLoops.length === 0) {
    return chalk.yellow('没有找到 Agent Loop');
  }

  if (options.table) {
    const headers = ['ID', '状态', '迭代次数', '工具调用'];
    const rows = agentLoops.map(al => [
      chalk.gray(al.id?.substring(0, 8) || 'N/A'),
      formatStatus(al.status || 'unknown'),
      chalk.cyan(al.iterations ?? al.currentIteration ?? 0),
      chalk.yellow(al.toolCallCount ?? 0)
    ]);

    return formatTable(headers, rows);
  }

  return agentLoops.map(al => formatAgentLoop(al)).join('\n');
}