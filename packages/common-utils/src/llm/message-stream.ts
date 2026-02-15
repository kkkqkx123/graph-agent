/**
 * 消息流
 * 提供事件驱动的流式响应处理
 */

import { ExecutionError } from '@modular-agent/types';
import type { LLMMessage, LLMResult } from '@modular-agent/types';
import {
  MessageStreamEvent,
  MessageStreamEventType,
  MessageStreamConnectEvent,
  MessageStreamStreamEvent,
  MessageStreamTextEvent,
  MessageStreamToolCallEvent,
  MessageStreamMessageEvent,
  MessageStreamFinalMessageEvent,
  MessageStreamErrorEvent,
  MessageStreamAbortEvent,
  MessageStreamEndEvent,
  MessageStreamCitationEvent,
  MessageStreamThinkingEvent,
  MessageStreamSignatureEvent,
  MessageStreamInputJsonEvent,
  MessageStreamContentBlockStartEvent,
  MessageStreamContentBlockStopEvent
} from './message-stream-events';

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
      if (event !== MessageStreamEventType.ERROR) {
        this.once(MessageStreamEventType.ERROR, (error: MessageStreamErrorEvent) => {
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
   * 中止流
   */
  abort(): void {
    if (this.aborted || this.ended) {
      return;
    }
    
    this.controller.abort();
    
    // 触发中止事件
    this.emit(MessageStreamEventType.ABORT, {
      type: MessageStreamEventType.ABORT,
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
    if (event === MessageStreamEventType.END) {
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
        listener.listener(data);
        if (!listener.once) {
          persistentListeners.push(listener);
        }
      } catch (error) {
        // 监听器抛出异常不影响其他监听器
        console.error(`Error in event listener for ${event}:`, error);
      }
    }
    this.listeners.set(event, persistentListeners);

    // 处理 abort 事件
    if (event === MessageStreamEventType.ABORT) {
      this.aborted = true;
      if (!this.catchingPromiseCreated && eventListeners.length === 0) {
        // 触发未处理的 Promise 错误
        setTimeout(() => {
          throw new ExecutionError('Stream aborted without error handler');
        }, 0);
      }
      this.endPromiseReject(new Error('Stream aborted'));
      this.emit(MessageStreamEventType.END, {} as MessageStreamEndEvent);
      return;
    }

    // 处理 error 事件
    if (event === MessageStreamEventType.ERROR) {
      this.errored = true;
      if (!this.catchingPromiseCreated && eventListeners.length === 0) {
        // 触发未处理的 Promise 错误
        setTimeout(() => {
          throw (data as MessageStreamErrorEvent).error;
        }, 0);
      }
      this.endPromiseReject((data as MessageStreamErrorEvent).error);
      this.emit(MessageStreamEventType.END, {} as MessageStreamEndEvent);
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
        if (this.currentMessageSnapshot) {
          throw new ExecutionError('Message already started');
        }
        this.currentMessageSnapshot = {
          role: 'assistant',
          content: '',
          ...event.data.message
        };
        this.currentTextSnapshot = '';
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
          (this.currentMessageSnapshot as any).usage = event.data.usage;
        }
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
        
        // 触发内容块开始事件
        this.emit(MessageStreamEventType.CONTENT_BLOCK_START, {
          type: MessageStreamEventType.CONTENT_BLOCK_START,
          index: this.currentMessageSnapshot.content.length - 1,
          contentBlock: event.data.content_block
        } as MessageStreamContentBlockStartEvent);
        break;

      case 'content_block_delta':
        if (!this.currentMessageSnapshot) {
          throw new ExecutionError('No message in progress');
        }
        if (!Array.isArray(this.currentMessageSnapshot.content)) {
          break;
        }
        const lastBlock = this.currentMessageSnapshot.content[this.currentMessageSnapshot.content.length - 1];
        if (!lastBlock) break;
        
        if (event.data.delta.type === 'text_delta') {
          if (lastBlock.type === 'text') {
            lastBlock.text += event.data.delta.text;
            this.currentTextSnapshot += event.data.delta.text;
            // 触发文本增量事件
            this.emit(MessageStreamEventType.TEXT, {
              type: MessageStreamEventType.TEXT,
              delta: event.data.delta.text,
              snapshot: this.currentTextSnapshot
            } as MessageStreamTextEvent);
          }
        } else if (event.data.delta.type === 'citations_delta') {
          // 处理引用增量
          if (lastBlock.type === 'text') {
            const textBlock = lastBlock as any;
            if (!textBlock.citations) {
              textBlock.citations = [];
            }
            textBlock.citations.push(event.data.delta.citation);
            
            // 触发引用事件
            this.emit(MessageStreamEventType.CITATION, {
              type: MessageStreamEventType.CITATION,
              citation: event.data.delta.citation,
              citationsSnapshot: textBlock.citations
            } as MessageStreamCitationEvent);
          }
        } else if (event.data.delta.type === 'input_json_delta') {
          if (lastBlock.type === 'tool_use') {
            // 如果 input 已经是对象，说明 API 已经提供了完整的 input，不需要追加
            // 只有当 input 是字符串或 undefined 时才追加 JSON 片段
            if (typeof (lastBlock as any).input !== 'object') {
              const currentInput = typeof (lastBlock as any).input === 'string'
                ? (lastBlock as any).input
                : '';
              (lastBlock as any).input = currentInput + event.data.delta.partial_json;
            }
            
            // 触发输入 JSON 事件
            this.emit(MessageStreamEventType.INPUT_JSON, {
              type: MessageStreamEventType.INPUT_JSON,
              partialJson: event.data.delta.partial_json,
              jsonSnapshot: (lastBlock as any).input
            } as MessageStreamInputJsonEvent);
          }
        } else if (event.data.delta.type === 'thinking_delta') {
          // 处理思考增量
          if ((lastBlock as any).type === 'thinking') {
            const thinkingBlock = lastBlock as any;
            thinkingBlock.thinking += event.data.delta.thinking;
            
            // 触发思考事件
            this.emit(MessageStreamEventType.THINKING, {
              type: MessageStreamEventType.THINKING,
              thinkingDelta: event.data.delta.thinking,
              thinkingSnapshot: thinkingBlock.thinking
            } as MessageStreamThinkingEvent);
          }
        } else if (event.data.delta.type === 'signature_delta') {
          // 处理签名
          if ((lastBlock as any).type === 'thinking') {
            const thinkingBlock = lastBlock as any;
            thinkingBlock.signature = event.data.delta.signature;
            
            // 触发签名事件
            this.emit(MessageStreamEventType.SIGNATURE, {
              type: MessageStreamEventType.SIGNATURE,
              signature: event.data.delta.signature
            } as MessageStreamSignatureEvent);
          }
        }
        break;

      case 'content_block_stop':
        // 尝试将 tool_use 的 input 从字符串解析为对象
        if (this.currentMessageSnapshot && Array.isArray(this.currentMessageSnapshot.content)) {
          const lastBlock = this.currentMessageSnapshot.content[this.currentMessageSnapshot.content.length - 1];
          if (lastBlock && lastBlock.type === 'tool_use') {
            if (typeof (lastBlock as any).input === 'string') {
              try {
                (lastBlock as any).input = JSON.parse((lastBlock as any).input);
              } catch (e) {
                // 如果解析失败，保持为字符串
                console.warn('Failed to parse tool_use.input as JSON:', e);
              }
            }
          }
        }
        
        // 触发内容块停止事件
        if (this.currentMessageSnapshot && Array.isArray(this.currentMessageSnapshot.content)) {
          const lastBlock = this.currentMessageSnapshot.content[this.currentMessageSnapshot.content.length - 1];
          
          this.emit(MessageStreamEventType.CONTENT_BLOCK_STOP, {
            type: MessageStreamEventType.CONTENT_BLOCK_STOP,
            index: this.currentMessageSnapshot.content.length - 1
          } as MessageStreamContentBlockStopEvent);
          
          // 如果是工具调用块，触发工具调用事件
          if (lastBlock && lastBlock.type === 'tool_use') {
            this.emit(MessageStreamEventType.TOOL_CALL, {
              type: MessageStreamEventType.TOOL_CALL,
              toolCall: lastBlock,
              snapshot: this.currentMessageSnapshot
            } as MessageStreamToolCallEvent);
          }
        }
        break;

      case 'message_stop':
        const message = this.currentMessageSnapshot;
        if (message) {
          this.receivedMessages.push(message);
          this.currentMessageSnapshot = null;
          this.currentTextSnapshot = '';
          
          // 触发消息事件
          this.emit(MessageStreamEventType.MESSAGE, {
            type: MessageStreamEventType.MESSAGE,
            message
          } as MessageStreamMessageEvent);
        }
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
    // 触发最终消息事件
    this.emit(MessageStreamEventType.FINAL_MESSAGE, {
      type: MessageStreamEventType.FINAL_MESSAGE,
      message: result.message,
      result
    } as MessageStreamFinalMessageEvent);
  }

  /**
   * AsyncIterable 接口实现
   */
  [Symbol.asyncIterator](): AsyncIterator<InternalStreamEvent> {
    // 添加事件监听器
    this.on(MessageStreamEventType.STREAM_EVENT, (event: MessageStreamStreamEvent) => {
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

    this.once(MessageStreamEventType.END, () => {
      while (this.readQueue.length > 0) {
        const reader = this.readQueue.shift()!;
        reader({ type: 'end', data: undefined });
      }
    });

    this.once(MessageStreamEventType.ABORT, () => {
      while (this.readQueue.length > 0) {
        const reader = this.readQueue.shift()!;
        reader({ type: 'abort', data: undefined });
      }
    });

    this.once(MessageStreamEventType.ERROR, (error: MessageStreamErrorEvent) => {
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
    // 触发连接建立事件
    this.emit(MessageStreamEventType.CONNECT, {
      type: MessageStreamEventType.CONNECT,
      requestId
    } as MessageStreamConnectEvent);
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