/**
 * 终端相关类型定义
 */

/**
 * 终端配置选项
 */
export interface TerminalOptions {
  /** Shell 路径，默认根据平台自动选择 */
  shell?: string;
  /** 工作目录 */
  cwd?: string;
  /** 环境变量 */
  env?: Record<string, string>;
  /** 终端列数 */
  cols?: number;
  /** 终端行数 */
  rows?: number;
  /** 是否后台运行（不显示终端窗口） */
  background?: boolean;
  /** 输出日志文件路径（后台运行时使用） */
  logFile?: string;
}

/**
 * 终端会话
 */
export interface TerminalSession {
  /** 会话唯一标识 */
  id: string;
  /** 伪终端实例 */
  pty: any;
  /** 进程 ID */
  pid: number;
  /** 创建时间 */
  createdAt: Date;
  /** 会话状态 */
  status: 'active' | 'inactive' | 'closed';
}

/**
 * 任务执行结果
 */
export interface TaskExecutionResult {
  /** 任务唯一标识 */
  taskId: string;
  /** 终端会话 ID */
  sessionId: string;
  /** 任务状态 */
  status: 'started' | 'running' | 'completed' | 'failed';
  /** 开始时间 */
  startTime: Date;
  /** 结束时间 */
  endTime?: Date;
  /** 输出内容 */
  output?: string;
  /** 错误信息 */
  error?: string;
}

/**
 * 任务状态
 */
export interface TaskStatus {
  /** 任务唯一标识 */
  taskId: string;
  /** 状态 */
  status: 'running' | 'completed' | 'failed' | 'cancelled';
  /** 进度百分比 (0-100) */
  progress?: number;
  /** 状态消息 */
  message?: string;
  /** 最后更新时间 */
  lastUpdate: Date;
}

/**
 * 桥接消息类型
 */
export interface BridgeMessage {
  /** 消息类型 */
  type: 'status' | 'output' | 'error' | 'command';
  /** 消息负载 */
  payload: any;
  /** 时间戳 */
  timestamp: Date;
}

/**
 * 终端事件
 */
export interface TerminalEvent {
  /** 事件类型 */
  type: 'data' | 'exit' | 'error';
  /** 事件数据 */
  data?: string;
  /** 退出码 */
  exitCode?: number;
  /** 退出信号 */
  signal?: number;
  /** 错误对象 */
  error?: Error;
}