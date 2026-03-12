/**
 * 消息流
 * 提供事件驱动的流式响应处理
 */

import { ExecutionError } from '@modular-agent/types';
import type { LLMMessage, LLMResult } from '@modular-agent/types';
import { partialParse } from './lib/partial-json-parser.js';
import {
  MessageStreamEvent,
  MessageStreamEventType,
  MessageStreamConnectEvent,
  MessageStreamStreamEvent,
  MessageStreamTextEvent,
  MessageStreamInputJsonEvent,
  MessageStreamMessageEvent,
  MessageStreamFinalMessageEvent,
  MessageStreamErrorEvent,
  MessageStreamAbortEvent,
  MessageStreamEndEvent
} from './message-stream-events.js';

/**
 * 事件监听器
 */
type EventListener<T = any> = (data: T) => void;

/**
 * 带标志的事件监听器
 */
interface FlaggedEventListener<T = any> {
  listener: EventListener<T>;
  once: boolean;
}

/**
 * 流式事件（内部使用）
 */
interface InternalStreamEvent {
  type: string;
  data: any;
}

/**
 * 消息流
 */
export class MessageStream implements AsyncIterable<InternalStreamEvent> {
  private messages: LLMMessage[];
  private receivedMessages: LLMMessage[];
  private currentMessageSnapshot: LLMMessage | null;
  private currentTextSnapshot: string;
  private finalResultValue: LLMResult | null;
  private controller: AbortController;
  private listeners: Map<MessageStreamEventType, FlaggedEventListener[]>;
  private ended: boolean;
  private errored: boolean;
  private aborted: boolean;
  private response: Response | null;
  private requestId: string | null;
  private endPromise: Promise<void>;
  private endPromiseResolve!: (() => void);
  private endPromiseReject!: ((error: Error) => void);
  private catchingPromiseCreated: boolean;
  private pushQueue: InternalStreamEvent[];
  private readQueue: Array<(event: InternalStreamEvent) => void>;

  constructor() {
    this.messages = [];
    this.receivedMessages = [];
    this.currentMessageSnapshot = null;
    this.currentTextSnapshot = '';
    this.finalResultValue = null;
    this.controller = new AbortController();
    this.listeners = new Map();
    this.ended = false;
    this.errored = false;
    this.aborted = false;
    this.response = null;
    this.requestId = null;
    this.catchingPromiseCreated = false;
    this.pushQueue = [];
    this.readQueue = [];

    // 创建 end Promise
    this.endPromise = new Promise((resolve, reject) => {
      this.endPromiseResolve = resolve;
      this.endPromiseReject = reject;
    });
    
    // 避免未处理的 Promise 拒绝错误
    this.endPromise.catch(() => {});
  }

  /**
   * 添加事件监听器
   * @param event 事件类型
   * @param listener 监听器函数
   * @returns this，支持链式调用
   */
  on<T extends MessageStreamEvent>(event: MessageStreamEventType, listener: EventListener<T>): this {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push({ listener, once: false });
    return this;
  }

  /**
   * 移除事件监听器
   * @param event 事件类型
   * @param listener 监听器函数
   * @returns this，支持链式调用
   */
  off<T extends MessageStreamEvent>(event: MessageStreamEventType, listener: EventListener<T>): this {
    const eventListeners = this.listeners.get(event);
    if (!eventListeners) {
      return this;
    }

    const index = eventListeners.findIndex(l => l.listener === listener);
    if (index !== -1) {
      eventListeners.splice(index, 1);
    }
    return this;
  }

  /**
   * 添加一次性事件监听器
   * @param event 事件类型
   * @param listener 监听器函数
   * @returns this，支持链式调用
   */
  once<T extends MessageStreamEvent>(event: MessageStreamEventType, listener: EventListener<T>): this {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push({ listener, once: true });
    return this;
  }

  /**
   * 等待事件触发
   * @param event 事件类型
   * @returns Promise，当事件触发时解析
   */
  emitted<T extends MessageStreamEvent>(event: MessageStreamEventType): Promise<T> {
    return new Promise((resolve, reject) => {
      if (event !== 'error') {
        this.once('error', (error: MessageStreamErrorEvent) => {
          reject(error.error);
        });
      }

      this.once(event, (data: T) => {
        resolve(data);
      });
    });
  }

  /**
   * 获取最终消息
   * @returns Promise，当流结束时解析为最终消息
   */
  async finalMessage(): Promise<LLMMessage> {
    await this.done();

    if (this.receivedMessages.length === 0) {
      throw new ExecutionError('No messages received');
    }

    const lastMessage = this.receivedMessages[this.receivedMessages.length - 1];
    if (!lastMessage) {
      throw new ExecutionError('No final message available');
    }

    return lastMessage;
  }

  /**
   * 获取最终文本
   * @returns Promise，当流结束时解析为最终文本
   */
  async finalText(): Promise<string> {
    const message = await this.finalMessage();

    if (typeof message.content === 'string') {
      return message.content;
    }

    if (Array.isArray(message.content)) {
      return message.content
        .filter(item => item.type === 'text')
        .map(item => item.text)
        .join('');
    }

    return '';
  }

  /**
   * 获取最终结果
   * @returns Promise，当流结束时解析为最终结果
   */
  async getFinalResult(): Promise<LLMResult> {
    await this.done();

    if (!this.finalResultValue) {
      throw new ExecutionError('No final result available');
    }

    return this.finalResultValue;
  }

  /**
   * 等待流结束
   * @returns Promise，当流结束时解析
   */
  done(): Promise<void> {
    this.catchingPromiseCreated = true;
    return this.endPromise;
  }

  /**
   * 推送文本增量
   * @param delta 文本增量
   */
  pushText(delta: string): void {
    if (this.ended || this.errored || this.aborted) {
      return;
    }
    
    this.currentTextSnapshot += delta;
    this.emit('text', {
      type: 'text',
      delta,
      snapshot: this.currentTextSnapshot
    } as MessageStreamTextEvent);
  }

  /**
   * 结束流（正常完成）
   */
  end(): void {
    if (this.ended || this.errored || this.aborted) {
      return;
    }
    
    // 触发 finalMessage 事件（仅在正常结束时）
    if (this.receivedMessages.length > 0) {
      const lastMessage = this.receivedMessages[this.receivedMessages.length - 1];
      this.emit('finalMessage', {
        type: 'finalMessage',
        message: lastMessage
      } as MessageStreamFinalMessageEvent);
    }
    
    this.emit('end', {} as MessageStreamEndEvent);
  }

  /**
   * 中止流
   */
  abort(): void {
    if (this.aborted || this.ended) {
      return;
    }
    
    this.controller.abort();
    
    // 触发中止事件
    this.emit('abort', {
      type: 'abort',
      reason: 'Stream aborted by user'
    } as MessageStreamAbortEvent);
  }

  /**
   * 拆分流为两个独立流
   * @returns 两个独立的流
   */
  tee(): [MessageStream, MessageStream] {
    const leftQueue: InternalStreamEvent[] = [];
    const rightQueue: InternalStreamEvent[] = [];

    const iterator = this[Symbol.asyncIterator]();

    const createTeeStream = (queue: InternalStreamEvent[]): MessageStream => {
      const stream = new MessageStream();
      stream.controller = this.controller;
      stream.requestId = this.requestId;

      const teeIterator: AsyncIterator<InternalStreamEvent> = {
        async next(): Promise<IteratorResult<InternalStreamEvent>> {
          if (queue.length > 0) {
            return { value: queue.shift()!, done: false };
          }

          const result = await iterator.next();
          if (result.done) {
            return { value: undefined, done: true };
          }

          leftQueue.push(result.value);
          rightQueue.push(result.value);
          return { value: queue.shift()!, done: false };
        },

        async return(): Promise<IteratorResult<InternalStreamEvent>> {
          return { value: undefined, done: true };
        }
      };

      // 将迭代器添加到流中
      (stream as any)[Symbol.asyncIterator] = () => teeIterator;

      return stream;
    };

    return [createTeeStream(leftQueue), createTeeStream(rightQueue)];
  }

  /**
   * 发射事件
   * @param event 事件类型
   * @param data 事件数据
   */
  private emit<T = any>(event: MessageStreamEventType, data: T): void {
    if (this.ended) {
      return;
    }

    // 处理 end 事件
    if (event === 'end') {
      this.ended = true;
      this.endPromiseResolve();
    }

    const eventListeners = this.listeners.get(event);
    if (!eventListeners || eventListeners.length === 0) {
      return;
    }

    // 过滤一次性监听器
    const persistentListeners: FlaggedEventListener<T>[] = [];
    for (const listener of eventListeners) {
      try {
        // 根据事件类型展开参数
        switch (event) {
          case 'connect':
            (listener.listener as () => void)();
            break;
          case 'streamEvent':
            const streamEventData = data as MessageStreamStreamEvent;
            (listener.listener as (event: { type: string; data: any }, snapshot: LLMMessage) => void)(
              streamEventData.event,
              streamEventData.snapshot
            );
            break;
          case 'text':
            const textData = data as MessageStreamTextEvent;
            (listener.listener as (delta: string, snapshot: string) => void)(
              textData.delta,
              textData.snapshot
            );
            break;
          case 'inputJson':
            const inputJsonData = data as MessageStreamInputJsonEvent;
            (listener.listener as (partialJson: string, parsedSnapshot: unknown, snapshot: LLMMessage) => void)(
              inputJsonData.partialJson,
              inputJsonData.parsedSnapshot,
              inputJsonData.snapshot
            );
            break;
          case 'message':
            const messageData = data as MessageStreamMessageEvent;
            (listener.listener as (message: LLMMessage) => void)(messageData.message);
            break;
          case 'finalMessage':
            const finalMessageData = data as MessageStreamFinalMessageEvent;
            (listener.listener as (message: LLMMessage) => void)(finalMessageData.message);
            break;
          case 'error':
            const errorData = data as MessageStreamErrorEvent;
            (listener.listener as (error: Error) => void)(errorData.error);
            break;
          case 'abort':
            const abortData = data as MessageStreamAbortEvent;
            (listener.listener as (reason?: string) => void)(abortData.reason);
            break;
          case 'end':
            (listener.listener as () => void)();
            break;
          default:
            listener.listener(data);
        }
        
        if (!listener.once) {
          persistentListeners.push(listener);
        }
      } catch (error) {
        // 监听器抛出异常不影响其他监听器
        logger.error(`Error in event listener for ${event}`, { event, error: getErrorOrNew(error) });
      }
    }
    this.listeners.set(event, persistentListeners);

    // 处理 abort 事件
    if (event === 'abort') {
      this.aborted = true;
      if (!this.catchingPromiseCreated && eventListeners.length === 0) {
        // 触发未处理的 Promise 错误
        setTimeout(() => {
          throw new ExecutionError('Stream aborted without error handler');
        }, 0);
      }
      this.endPromiseReject(new Error('Stream aborted'));
      this.emit('end', {} as MessageStreamEndEvent);
      return;
    }

    // 处理 error 事件
    if (event === 'error') {
      this.errored = true;
      if (!this.catchingPromiseCreated && eventListeners.length === 0) {
        // 触发未处理的 Promise 错误
        setTimeout(() => {
          throw (data as MessageStreamErrorEvent).error;
        }, 0);
      }
      this.endPromiseReject((data as MessageStreamErrorEvent).error);
      this.emit('end', {} as MessageStreamEndEvent);
    }
  }

  /**
   * 累积消息
   * @param event 流式事件
   * @returns 消息快照
   */
  accumulateMessage(event: InternalStreamEvent): LLMMessage | null {
    switch (event.type) {
      case 'message_start':
        // 触发 connect 事件（仅在第一次 message_start 时）
        if (!this.currentMessageSnapshot && this.receivedMessages.length === 0) {
          this.emit('connect', {
            type: 'connect'
          } as MessageStreamConnectEvent);
        }
        
        if (this.currentMessageSnapshot) {
          throw new ExecutionError('Message already started');
        }
        this.currentMessageSnapshot = {
          role: 'assistant',
          content: '',
          ...event.data.message
        };
        this.currentTextSnapshot = '';
        // 触发 streamEvent 事件
        this.emit('streamEvent', {
          type: 'streamEvent',
          event: { type: event.type, data: event.data },
          snapshot: this.currentMessageSnapshot
        } as MessageStreamStreamEvent);
        break;

      case 'message_delta':
        if (!this.currentMessageSnapshot) {
          throw new ExecutionError('No message in progress');
        }
        if (event.data.delta.stop_reason) {
          (this.currentMessageSnapshot as any).stop_reason = event.data.delta.stop_reason;
        }
        if (event.data.delta.stop_sequence) {
          (this.currentMessageSnapshot as any).stop_sequence = event.data.delta.stop_sequence;
        }
        if (event.data.usage) {
          // 合并 usage 字段，而不是直接覆盖
          const currentUsage = (this.currentMessageSnapshot as any).usage || {};
          (this.currentMessageSnapshot as any).usage = {
            ...currentUsage,
            ...event.data.usage
          };
        }
        // 触发 streamEvent 事件
        this.emit('streamEvent', {
          type: 'streamEvent',
          event: { type: event.type, data: event.data },
          snapshot: this.currentMessageSnapshot
        } as MessageStreamStreamEvent);
        break;

      case 'content_block_start':
        if (!this.currentMessageSnapshot) {
          throw new ExecutionError('No message in progress');
        }
        if (!Array.isArray(this.currentMessageSnapshot.content)) {
          this.currentMessageSnapshot.content = [];
        }
        this.currentMessageSnapshot.content.push({
          type: event.data.content_block.type,
          ...event.data.content_block
        });
        // 触发 streamEvent 事件
        this.emit('streamEvent', {
          type: 'streamEvent',
          event: { type: event.type, data: event.data },
          snapshot: this.currentMessageSnapshot
        } as MessageStreamStreamEvent);
        break;

      case 'content_block_delta':
        if (!this.currentMessageSnapshot) {
          throw new ExecutionError('No message in progress');
        }
        if (!Array.isArray(this.currentMessageSnapshot.content)) {
          break;
        }
        // 使用 event.index 定位内容块（如果存在）
        const blockIndex = event.data.index !== undefined ? event.data.index : this.currentMessageSnapshot.content.length - 1;
        const targetBlock = this.currentMessageSnapshot.content.at(blockIndex);
        if (!targetBlock) break;
        
        if (event.data.delta.type === 'text_delta') {
          if (targetBlock.type === 'text') {
            targetBlock.text += event.data.delta.text;
            this.currentTextSnapshot += event.data.delta.text;
            // 触发文本增量事件
            this.emit('text', {
              type: 'text',
              delta: event.data.delta.text,
              snapshot: this.currentTextSnapshot
            } as MessageStreamTextEvent);
          }
        } else if (event.data.delta.type === 'citations_delta') {
          // 处理引用增量
          if (targetBlock.type === 'text') {
            const textBlock = targetBlock as any;
            if (!textBlock.citations) {
              textBlock.citations = [];
            }
            textBlock.citations.push(event.data.delta.citation);
          }
        } else if (event.data.delta.type === 'input_json_delta') {
          if (targetBlock.type === 'tool_use') {
            // 使用非枚举属性存储原始 JSON 字符串（借鉴 Anthropic SDK 设计）
            const JSON_BUF_PROPERTY = '__json_buf';
            let jsonBuf = (targetBlock as any)[JSON_BUF_PROPERTY] || '';
            jsonBuf += event.data.delta.partial_json;

            // 更新非枚举属性
            Object.defineProperty(targetBlock, JSON_BUF_PROPERTY, {
              value: jsonBuf,
              enumerable: false,
              writable: true,
              configurable: true
            });

            // 使用 partialParse 解析不完整 JSON
            const parsedInput = partialParse(jsonBuf);
            if (parsedInput !== undefined) {
              (targetBlock as any).input = parsedInput;
            }

            // 触发 inputJson 事件，提供实时解析结果
            this.emit('inputJson', {
              type: 'inputJson',
              partialJson: jsonBuf,
              parsedSnapshot: parsedInput ?? jsonBuf,
              snapshot: this.currentMessageSnapshot
            } as MessageStreamInputJsonEvent);
          }
        } else if (event.data.delta.type === 'thinking_delta') {
          // 处理思考增量
          if ((targetBlock as any).type === 'thinking') {
            const thinkingBlock = targetBlock as any;
            thinkingBlock.thinking += event.data.delta.thinking;
          }
        } else if (event.data.delta.type === 'signature_delta') {
          // 处理签名
          if ((targetBlock as any).type === 'thinking') {
            const thinkingBlock = targetBlock as any;
            thinkingBlock.signature = event.data.delta.signature;
          }
        }
        // 触发 streamEvent 事件
        this.emit('streamEvent', {
          type: 'streamEvent',
          event: { type: event.type, data: event.data },
          snapshot: this.currentMessageSnapshot
        } as MessageStreamStreamEvent);
        break;

      case 'content_block_stop':
        // 清理 tool_use 的非枚举属性（原始 JSON 缓冲区）
        if (this.currentMessageSnapshot && Array.isArray(this.currentMessageSnapshot.content)) {
          const blockIndex = event.data.index !== undefined ? event.data.index : this.currentMessageSnapshot.content.length - 1;
          const targetBlock = this.currentMessageSnapshot.content.at(blockIndex);
          if (targetBlock && targetBlock.type === 'tool_use') {
            const JSON_BUF_PROPERTY = '__json_buf';
            // 删除非枚举属性，释放内存
            if (JSON_BUF_PROPERTY in targetBlock) {
              delete (targetBlock as any)[JSON_BUF_PROPERTY];
            }
          }
        }
        // 触发 streamEvent 事件
        this.emit('streamEvent', {
          type: 'streamEvent',
          event: { type: event.type, data: event.data },
          snapshot: this.currentMessageSnapshot
        } as MessageStreamStreamEvent);
        break;

      case 'message_stop':
        const message = this.currentMessageSnapshot;
        if (message) {
          this.receivedMessages.push(message);
          this.currentMessageSnapshot = null;
          this.currentTextSnapshot = '';
          
          // 触发 message 事件
          this.emit('message', {
            type: 'message',
            message
          } as MessageStreamMessageEvent);
        }
        // 触发 streamEvent 事件
        this.emit('streamEvent', {
          type: 'streamEvent',
          event: { type: event.type, data: event.data },
          snapshot: message || { role: 'assistant', content: '' }
        } as MessageStreamStreamEvent);
        return message;

      default:
        break;
    }

    return this.currentMessageSnapshot;
  }

  /**
   * 设置最终结果
   * @param result 最终结果
   */
  setFinalResult(result: LLMResult): void {
    this.finalResultValue = result;
  }

  /**
   * AsyncIterable 接口实现
   */
  [Symbol.asyncIterator](): AsyncIterator<InternalStreamEvent> {
    // 添加事件监听器
    this.on('streamEvent', (event: MessageStreamStreamEvent) => {
      const internalEvent: InternalStreamEvent = {
        type: event.event.type,
        data: event.event.data
      };
      if (this.readQueue.length > 0) {
        const reader = this.readQueue.shift()!;
        reader(internalEvent);
      } else {
        this.pushQueue.push(internalEvent);
      }
    });

    this.once('end', () => {
      while (this.readQueue.length > 0) {
        const reader = this.readQueue.shift()!;
        reader({ type: 'end', data: undefined });
      }
    });

    this.once('abort', () => {
      while (this.readQueue.length > 0) {
        const reader = this.readQueue.shift()!;
        reader({ type: 'abort', data: undefined });
      }
    });

    this.once('error', (error: MessageStreamErrorEvent) => {
      while (this.readQueue.length > 0) {
        const reader = this.readQueue.shift()!;
        reader({ type: 'error', data: error });
      }
    });

    return {
      next: async (): Promise<IteratorResult<InternalStreamEvent>> => {
        if (this.pushQueue.length > 0) {
          return { value: this.pushQueue.shift()!, done: false };
        }

        if (this.ended || this.errored || this.aborted) {
          return { value: undefined, done: true };
        }

        return new Promise(resolve => {
          this.readQueue.push((event: InternalStreamEvent) => {
            resolve({ value: event, done: false });
          });
        });
      },

      return: async (): Promise<IteratorResult<InternalStreamEvent>> => {
        this.abort();
        return { value: undefined, done: true };
      }
    };
  }

  /**
   * 设置响应对象
   * @param response Response 对象
   */
  setResponse(response: Response): void {
    this.response = response;
  }

  /**
   * 设置请求 ID
   * @param requestId 请求 ID
   */
  setRequestId(requestId: string): void {
    this.requestId = requestId;
  }

  /**
   * 获取请求 ID
   * @returns 请求 ID
   */
  getRequestId(): string | null {
    return this.requestId;
  }

  /**
   * 获取响应对象
   * @returns Response 对象
   */
  getResponse(): Response | null {
    return this.response;
  }

  /**
   * 检查是否已结束
   * @returns 是否已结束
   */
  isEnded(): boolean {
    return this.ended;
  }

  /**
   * 检查是否出错
   * @returns 是否出错
   */
  isErrored(): boolean {
    return this.errored;
  }

  /**
   * 检查是否已中止
   * @returns 是否已中止
   */
  isAborted(): boolean {
    return this.aborted;
  }

  /**
   * 获取接收的消息
   * @returns 接收的消息数组
   */
  getReceivedMessages(): LLMMessage[] {
    return [...this.receivedMessages];
  }

  /**
   * 获取 AbortController
   * @returns AbortController
   */
  getController(): AbortController {
    return this.controller;
  }
}
