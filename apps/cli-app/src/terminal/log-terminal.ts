/**
 * 日志终端管理器
 * 负责创建和管理独立的日志输出终端
 */

import { spawn, ChildProcess } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

/**
 * 日志终端配置选项
 */
export interface LogTerminalOptions {
  /**
   * 日志文件路径
   */
  logFile?: string;
  
  /**
   * 是否启用彩色输出
   */
  color?: boolean;
}

/**
 * 日志终端管理器
 * 创建一个独立的终端窗口用于显示日志
 */
export class LogTerminal {
  private process: ChildProcess | null = null;
  private logFile: string;
  private logStream: fs.WriteStream | null = null;
  private isWindows: boolean;

  constructor(options: LogTerminalOptions = {}) {
    this.isWindows = process.platform === 'win32';
    
    // 设置日志文件路径
    const logDir = path.join(process.cwd(), 'logs');
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
    
    const date = new Date().toISOString().split('T')[0];
    this.logFile = options.logFile || path.join(logDir, `cli-app-${date}.log`);
    
    // 创建日志写入流
    this.logStream = fs.createWriteStream(this.logFile, { flags: 'a' });
  }

  /**
   * 启动日志终端
   * 在 Windows 上使用 PowerShell 创建新窗口
   * 在 Unix 上使用 xterm 或 gnome-terminal
   */
  start(): void {
    if (this.process) {
      return; // 已经启动
    }

    try {
      if (this.isWindows) {
        this.startWindowsTerminal();
      } else {
        this.startUnixTerminal();
      }
    } catch (error) {
      // 如果无法启动独立终端，回退到文件日志
      console.error(`无法启动日志终端: ${error instanceof Error ? error.message : String(error)}`);
      console.error(`日志将写入文件: ${this.logFile}`);
    }
  }

  /**
   * 在 Windows 上启动日志终端
   */
  private startWindowsTerminal(): void {
    // 使用 PowerShell 创建新窗口并实时显示日志
    const psScript = `
      $Host.UI.RawUI.WindowTitle = 'Modular Agent - Log Output';
      Get-Content -Path '${this.logFile}' -Wait -Tail 50;
    `;

    this.process = spawn('powershell.exe', [
      '-NoExit',
      '-Command',
      psScript
    ], {
      detached: true,
      stdio: 'ignore',
      windowsHide: false
    });

    this.process.unref();
  }

  /**
   * 在 Unix 系统上启动日志终端
   */
  private startUnixTerminal(): void {
    // 尝试使用可用的终端模拟器
    const terminals = [
      { cmd: 'gnome-terminal', args: ['--title=Modular Agent - Log Output', '--', 'tail', '-f', this.logFile] },
      { cmd: 'xterm', args: ['-T', 'Modular Agent - Log Output', '-e', 'tail', '-f', this.logFile] },
      { cmd: 'konsole', args: ['--title', 'Modular Agent - Log Output', '-e', 'tail', '-f', this.logFile] },
      { cmd: 'terminator', args: ['-T', 'Modular Agent - Log Output', '-x', 'tail', '-f', this.logFile] }
    ];

    for (const terminal of terminals) {
      try {
        this.process = spawn(terminal.cmd, terminal.args, {
          detached: true,
          stdio: 'ignore'
        });
        this.process.unref();
        return; // 成功启动
      } catch {
        // 尝试下一个终端
        continue;
      }
    }

    throw new Error('未找到可用的终端模拟器');
  }

  /**
   * 写入日志
   */
  write(message: string): void {
    if (this.logStream) {
      this.logStream.write(message + '\n');
    }
  }

  /**
   * 关闭日志终端
   */
  close(): void {
    if (this.logStream) {
      this.logStream.end();
      this.logStream = null;
    }

    if (this.process) {
      try {
        this.process.kill();
      } catch {
        // 忽略关闭错误
      }
      this.process = null;
    }
  }

  /**
   * 获取日志文件路径
   */
  getLogFile(): string {
    return this.logFile;
  }
}

// 全局日志终端实例
let globalLogTerminal: LogTerminal | null = null;

/**
 * 获取全局日志终端实例
 */
export function getLogTerminal(): LogTerminal {
  if (!globalLogTerminal) {
    globalLogTerminal = new LogTerminal();
  }
  return globalLogTerminal;
}

/**
 * 初始化日志终端
 */
export function initializeLogTerminal(options: LogTerminalOptions = {}): LogTerminal {
  if (!globalLogTerminal) {
    globalLogTerminal = new LogTerminal(options);
    globalLogTerminal.start();
  }
  return globalLogTerminal;
}
