/**
 * 通信桥接
 * 负责主进程与终端进程之间的通信
 */

import { Subject, Observable, Subscription } from 'rxjs';
import { createLogger } from '../utils/logger.js';
import type { BridgeMessage, TerminalSession } from './types.js';

const logger = createLogger();

/**
 * 通信桥接
 * 负责主进程与终端进程之间的通信
 */
export class CommunicationBridge {
  /** 消息队列映射表 */
  private messageQueues: Map<string, Subject<BridgeMessage>> = new Map();
  /** 订阅映射表 */
  private subscriptions: Map<string, Subscription[]> = new Map();
  /** 全局消息广播器 */
  private globalBroadcaster: Subject<BridgeMessage> = new Subject();

  /**
   * 发送消息到指定终端
   * @param sessionId 终端会话 ID
   * @param message 消息对象
   */
  sendToTerminal(sessionId: string, message: BridgeMessage): void {
    const queue = this.messageQueues.get(sessionId);
    if (queue) {
      queue.next(message);
      logger.debug(`消息已发送到终端 ${sessionId}: ${message.type}`);
    } else {
      logger.warn(`终端 ${sessionId} 的消息队列不存在`);
    }
  }

  /**
   * 广播消息到所有终端
   * @param message 消息对象
   */
  broadcast(message: BridgeMessage): void {
    this.globalBroadcaster.next(message);
    this.messageQueues.forEach((queue, sessionId) => {
      queue.next(message);
      logger.debug(`消息已广播到终端 ${sessionId}: ${message.type}`);
    });
  }

  /**
   * 从终端接收消息
   * @param sessionId 终端会话 ID
   * @returns 消息流
   */
  receiveFromTerminal(sessionId: string): Observable<BridgeMessage> {
    if (!this.messageQueues.has(sessionId)) {
      this.messageQueues.set(sessionId, new Subject<BridgeMessage>());
    }
    return this.messageQueues.get(sessionId)!.asObservable();
  }

  /**
   * 订阅全局消息
   * @returns 全局消息流
   */
  subscribeGlobal(): Observable<BridgeMessage> {
    return this.globalBroadcaster.asObservable();
  }

  /**
   * 同步任务状态
   * @param taskId 任务 ID
   * @param status 任务状态
   */
  syncTaskStatus(taskId: string, status: any): void {
    const message: BridgeMessage = {
      type: 'status',
      payload: { taskId, status },
      timestamp: new Date()
    };

    this.broadcast(message);
  }

  /**
   * 发送输出消息
   * @param sessionId 终端会话 ID
   * @param output 输出内容
   */
  sendOutput(sessionId: string, output: string): void {
    const message: BridgeMessage = {
      type: 'output',
      payload: { output },
      timestamp: new Date()
    };

    this.sendToTerminal(sessionId, message);
  }

  /**
   * 发送错误消息
   * @param sessionId 终端会话 ID
   * @param error 错误信息
   */
  sendError(sessionId: string, error: string): void {
    const message: BridgeMessage = {
      type: 'error',
      payload: { error },
      timestamp: new Date()
    };

    this.sendToTerminal(sessionId, message);
  }

  /**
   * 发送命令消息
   * @param sessionId 终端会话 ID
   * @param command 命令对象
   */
  sendCommand(sessionId: string, command: any): void {
    const message: BridgeMessage = {
      type: 'command',
      payload: command,
      timestamp: new Date()
    };

    this.sendToTerminal(sessionId, message);
  }

  /**
   * 订阅指定终端的消息
   * @param sessionId 终端会话 ID
   * @param callback 回调函数
   * @returns 订阅对象
   */
  subscribe(
    sessionId: string,
    callback: (message: BridgeMessage) => void
  ): Subscription {
    const observable = this.receiveFromTerminal(sessionId);
    const subscription = observable.subscribe(callback);

    // 保存订阅以便后续清理
    if (!this.subscriptions.has(sessionId)) {
      this.subscriptions.set(sessionId, []);
    }
    this.subscriptions.get(sessionId)!.push(subscription);

    return subscription;
  }

  /**
   * 取消指定终端的所有订阅
   * @param sessionId 终端会话 ID
   */
  unsubscribe(sessionId: string): void {
    const subs = this.subscriptions.get(sessionId);
    if (subs) {
      subs.forEach(sub => sub.unsubscribe());
      this.subscriptions.delete(sessionId);
      logger.debug(`终端 ${sessionId} 的所有订阅已取消`);
    }
  }

  /**
   * 清理指定终端的消息队列
   * @param sessionId 终端会话 ID
   */
  cleanup(sessionId: string): void {
    // 取消所有订阅
    this.unsubscribe(sessionId);

    // 完成消息队列
    const queue = this.messageQueues.get(sessionId);
    if (queue) {
      queue.complete();
      this.messageQueues.delete(sessionId);
      logger.debug(`终端 ${sessionId} 的消息队列已清理`);
    }
  }

  /**
   * 清理所有消息队列和订阅
   */
  cleanupAll(): void {
    // 清理所有消息队列
    this.messageQueues.forEach((queue) => queue.complete());
    this.messageQueues.clear();

    // 取消所有订阅
    this.subscriptions.forEach((subs) => {
      subs.forEach(sub => sub.unsubscribe());
    });
    this.subscriptions.clear();

    // 完成全局广播器
    this.globalBroadcaster.complete();

    logger.info('所有消息队列和订阅已清理');
  }

  /**
   * 获取活跃终端数量
   * @returns 活跃终端数量
   */
  getActiveTerminalCount(): number {
    return this.messageQueues.size;
  }

  /**
   * 检查终端是否存在
   * @param sessionId 终端会话 ID
   * @returns 是否存在
   */
  hasTerminal(sessionId: string): boolean {
    return this.messageQueues.has(sessionId);
  }

  /**
   * 获取所有活跃终端 ID
   * @returns 终端 ID 列表
   */
  getActiveTerminalIds(): string[] {
    return Array.from(this.messageQueues.keys());
  }
}