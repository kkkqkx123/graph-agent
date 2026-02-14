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