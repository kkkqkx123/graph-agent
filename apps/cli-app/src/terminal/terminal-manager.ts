/**
 * 终端管理器
 * 负责创建和管理伪终端会话
 */

import * as pty from 'node-pty';
import { spawn } from 'child_process';
import { randomUUID } from 'crypto';
import { getLogger } from '../utils/logger.js';
import type { TerminalOptions, TerminalSession, TerminalEvent } from './types.js';

const logger = getLogger();

/**
 * 终端管理器
 * 负责创建和管理伪终端会话
 */
export class TerminalManager {
  /** 终端会话映射表 */
  private sessions: Map<string, TerminalSession> = new Map();
  /** 事件监听器映射表 */
  private eventListeners: Map<string, Set<(event: TerminalEvent) => void>> = new Map();

  /**
   * 创建新的终端会话
   * @param options 终端配置选项
   * @returns 终端会话对象
   */
  createTerminal(options: TerminalOptions = {}): TerminalSession {
    const sessionId = randomUUID();
    const shell = options.shell || this.getDefaultShell();
    
    try {
      if (options.background) {
        // 后台运行模式：使用 child_process.spawn
        return this.createBackgroundTerminal(sessionId, shell, options);
      } else {
        // 前台运行模式：使用 node-pty
        return this.createForegroundTerminal(sessionId, shell, options);
      }
    } catch (error) {
      logger.error(`创建终端会话失败: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * 创建前台终端（使用 node-pty）
   */
  private createForegroundTerminal(
    sessionId: string,
    shell: string,
    options: TerminalOptions
  ): TerminalSession {
    // 创建伪终端
    const ptyProcess = pty.spawn(shell, [], {
      name: 'xterm-color',
      cols: options.cols || 80,
      rows: options.rows || 24,
      cwd: options.cwd || process.cwd(),
      env: { ...process.env, ...options.env }
    });

    const session: TerminalSession = {
      id: sessionId,
      pty: ptyProcess,
      pid: ptyProcess.pid,
      createdAt: new Date(),
      status: 'active'
    };

    this.sessions.set(sessionId, session);
    logger.info(`前台终端会话已创建: ${sessionId} (PID: ${ptyProcess.pid})`);

    // 监听终端数据输出
    ptyProcess.onData((data: string) => {
      this.emitEvent(sessionId, {
        type: 'data',
        data
      });
    });

    // 监听终端退出事件
    ptyProcess.onExit(({ exitCode, signal }) => {
      logger.info(`前台终端会话已退出: ${sessionId} (退出码: ${exitCode}, 信号: ${signal})`);
      session.status = 'closed';
      this.emitEvent(sessionId, {
        type: 'exit',
        exitCode,
        signal
      });
    });

    return session;
  }

  /**
   * 创建后台终端（使用 child_process.spawn）
   */
  private createBackgroundTerminal(
    sessionId: string,
    shell: string,
    options: TerminalOptions
  ): TerminalSession {
    const logFile = options.logFile || `logs/task-${sessionId}.log`;
    
    // 创建后台进程
    const childProcess = spawn(shell, [], {
      cwd: options.cwd || process.cwd(),
      env: { ...process.env, ...options.env },
      detached: true,
      stdio: ['ignore', 'pipe', 'pipe']
    });

    const session: TerminalSession = {
      id: sessionId,
      pty: childProcess,
      pid: childProcess.pid || 0,
      createdAt: new Date(),
      status: 'active'
    };

    this.sessions.set(sessionId, session);
    logger.info(`后台终端会话已创建: ${sessionId} (PID: ${childProcess.pid}, 日志: ${logFile})`);

    // 重定向输出到日志文件
    const fs = require('fs');
    const path = require('path');
    const logDir = path.dirname(logFile);
    
    // 确保日志目录存在
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }

    const logStream = fs.createWriteStream(logFile, { flags: 'a' });

    // 监听标准输出
    childProcess.stdout?.on('data', (data: Buffer) => {
      const output = data.toString();
      logStream.write(output);
      this.emitEvent(sessionId, {
        type: 'data',
        data: output
      });
    });

    // 监听标准错误
    childProcess.stderr?.on('data', (data: Buffer) => {
      const error = data.toString();
      logStream.write(`[ERROR] ${error}`);
      this.emitEvent(sessionId, {
        type: 'error',
        error: new Error(error)
      });
    });

    // 监听进程退出事件
    childProcess.on('exit', (code: number | null, signal: number | null) => {
      logger.info(`后台终端会话已退出: ${sessionId} (退出码: ${code}, 信号: ${signal})`);
      session.status = 'closed';
      logStream.end();
      this.emitEvent(sessionId, {
        type: 'exit',
        exitCode: code || undefined,
        signal: signal || undefined
      });
    });

    // 监听进程错误
    childProcess.on('error', (error: Error) => {
      logger.error(`后台终端进程错误: ${sessionId} - ${error.message}`);
      session.status = 'closed';
      logStream.write(`[ERROR] ${error.message}\n`);
      logStream.end();
      this.emitEvent(sessionId, {
        type: 'error',
        error
      });
    });

    // 分离进程，使其在后台运行
    childProcess.unref();

    return session;
  }

  /**
   * 关闭指定终端
   * @param sessionId 终端会话 ID
   */
  async closeTerminal(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`终端会话不存在: ${sessionId}`);
    }

    if (session.status !== 'closed') {
      try {
        session.pty.kill();
        session.status = 'closed';
        logger.info(`终端会话已关闭: ${sessionId}`);
      } catch (error) {
        logger.error(`关闭终端会话失败: ${error instanceof Error ? error.message : String(error)}`);
        throw error;
      }
    }

    this.sessions.delete(sessionId);
    this.eventListeners.delete(sessionId);
  }

  /**
   * 获取所有活跃终端
   * @returns 活跃终端列表
   */
  getActiveTerminals(): TerminalSession[] {
    return Array.from(this.sessions.values()).filter(
      session => session.status === 'active'
    );
  }

  /**
   * 获取指定终端
   * @param sessionId 终端会话 ID
   * @returns 终端会话对象
   */
  getTerminal(sessionId: string): TerminalSession | undefined {
    return this.sessions.get(sessionId);
  }

  /**
   * 向终端写入数据
   * @param sessionId 终端会话 ID
   * @param data 要写入的数据
   */
  writeToTerminal(sessionId: string, data: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`终端会话不存在: ${sessionId}`);
    }

    if (session.status !== 'active') {
      throw new Error(`终端会话未激活: ${sessionId}`);
    }

    session.pty.write(data);
  }

  /**
   * 调整终端大小
   * @param sessionId 终端会话 ID
   * @param cols 列数
   * @param rows 行数
   */
  resizeTerminal(sessionId: string, cols: number, rows: number): void {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`终端会话不存在: ${sessionId}`);
    }

    if (session.status !== 'active') {
      throw new Error(`终端会话未激活: ${sessionId}`);
    }

    session.pty.resize(cols, rows);
    logger.debug(`终端大小已调整: ${sessionId} (${cols}x${rows})`);
  }

  /**
   * 添加事件监听器
   * @param sessionId 终端会话 ID
   * @param listener 事件监听器
   */
  addEventListener(sessionId: string, listener: (event: TerminalEvent) => void): void {
    if (!this.eventListeners.has(sessionId)) {
      this.eventListeners.set(sessionId, new Set());
    }
    this.eventListeners.get(sessionId)!.add(listener);
  }

  /**
   * 移除事件监听器
   * @param sessionId 终端会话 ID
   * @param listener 事件监听器
   */
  removeEventListener(sessionId: string, listener: (event: TerminalEvent) => void): void {
    const listeners = this.eventListeners.get(sessionId);
    if (listeners) {
      listeners.delete(listener);
      if (listeners.size === 0) {
        this.eventListeners.delete(sessionId);
      }
    }
  }

  /**
   * 清理所有终端
   */
  async cleanupAll(): Promise<void> {
    const sessionIds = Array.from(this.sessions.keys());
    const promises = sessionIds.map(sessionId => this.closeTerminal(sessionId));
    await Promise.all(promises);
    logger.info('所有终端会话已清理');
  }

  /**
   * 获取默认 Shell
   * @returns Shell 路径
   */
  private getDefaultShell(): string {
    if (process.platform === 'win32') {
      return 'powershell.exe';
    }
    return process.env['SHELL'] || 'bash';
  }

  /**
   * 触发事件
   * @param sessionId 终端会话 ID
   * @param event 终端事件
   */
  private emitEvent(sessionId: string, event: TerminalEvent): void {
    const listeners = this.eventListeners.get(sessionId);
    if (listeners) {
      listeners.forEach(listener => {
        try {
          listener(event);
        } catch (error) {
          logger.error(`事件监听器执行失败: ${error instanceof Error ? error.message : String(error)}`);
        }
      });
    }
  }
}