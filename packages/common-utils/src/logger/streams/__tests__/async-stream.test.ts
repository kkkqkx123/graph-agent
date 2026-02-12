/**
 * AsyncStream单元测试
 */

import { AsyncStream, createAsyncStream } from '../async-stream';
import type { LogStream, LogEntry } from '../../types';

// 创建一个mock stream用于测试
class MockStream implements LogStream {
  public entries: LogEntry[] = [];
  public flushed = false;
  public ended = false;
  public flushCallback?: () => void;

  write(entry: LogEntry): void {
    this.entries.push(entry);
  }

  flush(callback?: () => void): void {
    this.flushed = true;
    this.flushCallback = callback;
    if (callback) {
      setImmediate(callback);
    }
  }

  end(): void {
    this.ended = true;
  }
}

describe('AsyncStream', () => {
  let mockStream: MockStream;
  let asyncStream: AsyncStream;

  beforeEach(() => {
    jest.useFakeTimers({ legacyFakeTimers: true });
    mockStream = new MockStream();
    asyncStream = new AsyncStream(mockStream);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('构造函数', () => {
    it('应该使用默认batchSize创建实例', () => {
      expect(asyncStream).toBeInstanceOf(AsyncStream);
    });

    it('应该使用自定义batchSize创建实例', () => {
      const customAsyncStream = new AsyncStream(mockStream, { batchSize: 5 });
      expect(customAsyncStream).toBeInstanceOf(AsyncStream);
    });
  });

  describe('write方法', () => {
    it('应该将日志条目加入队列', () => {
      const entry: LogEntry = { level: 'info', message: 'test message' };
      asyncStream.write(entry);
      
      // 等待异步处理
      jest.advanceTimersByTime(100);
      jest.runAllImmediates();
      
      expect(mockStream.entries).toHaveLength(1);
      expect(mockStream.entries[0]).toEqual(entry);
    });

    it('应该在队列达到batchSize时立即处理', () => {
      const asyncStreamWithBatch5 = new AsyncStream(mockStream, { batchSize: 5 });
      
      // 写入5个条目
      for (let i = 0; i < 5; i++) {
        asyncStreamWithBatch5.write({ level: 'info', message: `message ${i}` });
      }
      
      // 等待setImmediate执行
      jest.runAllImmediates();
      
      expect(mockStream.entries).toHaveLength(5);
    });

    it('应该在队列未达到batchSize时延迟处理', () => {
      const entry: LogEntry = { level: 'info', message: 'test message' };
      asyncStream.write(entry);
      
      // 立即检查，应该还没有处理
      expect(mockStream.entries).toHaveLength(0);
      
      // 等待100ms
      jest.advanceTimersByTime(100);
      
      // 等待setImmediate执行
      jest.runAllImmediates();
      
      expect(mockStream.entries).toHaveLength(1);
    });

    it('应该处理多个批次', () => {
      const asyncStreamWithBatch3 = new AsyncStream(mockStream, { batchSize: 3 });
      
      // 写入7个条目
      for (let i = 0; i < 7; i++) {
        asyncStreamWithBatch3.write({ level: 'info', message: `message ${i}` });
      }
      
      // 等待所有异步操作完成
      jest.runAllTimers();
      jest.runAllImmediates();
      
      expect(mockStream.entries).toHaveLength(7);
    });
  });

  describe('flush方法', () => {
    it('应该刷新所有剩余日志', () => {
      const entry: LogEntry = { level: 'info', message: 'test message' };
      asyncStream.write(entry);
      
      // 立即刷新
      asyncStream.flush();
      
      // 等待setImmediate执行
      jest.runAllImmediates();
      
      expect(mockStream.entries).toHaveLength(1);
    });

    it('应该调用目标stream的flush方法', (done) => {
      asyncStream.flush(() => {
        expect(mockStream.flushed).toBe(true);
        done();
      });
      
      jest.runAllImmediates();
    });

    it('应该在flush时清除定时器', () => {
      const entry: LogEntry = { level: 'info', message: 'test message' };
      asyncStream.write(entry);
      
      // 立即flush
      asyncStream.flush();
      
      // 等待setImmediate执行
      jest.runAllImmediates();
      
      // 确保日志已写入
      expect(mockStream.entries).toHaveLength(1);
    });

    it('应该处理空队列', (done) => {
      asyncStream.flush(() => {
        expect(mockStream.entries).toHaveLength(0);
        done();
      });
      
      jest.runAllImmediates();
    });
  });

  describe('end方法', () => {
    it('应该刷新并结束stream', () => {
      const entry: LogEntry = { level: 'info', message: 'test message' };
      asyncStream.write(entry);
      
      asyncStream.end();
      
      // 等待所有异步操作完成
      jest.runAllTimers();
      jest.runAllImmediates();
      
      expect(mockStream.entries).toHaveLength(1);
      expect(mockStream.ended).toBe(true);
    });
  });

  describe('事件监听', () => {
    it('应该转发事件到目标stream', () => {
      const handler = jest.fn();
      asyncStream.on('test', handler);
      
      // 由于mockStream没有实现on方法，这个测试主要验证不会报错
      expect(() => asyncStream.on('test', handler)).not.toThrow();
    });

    it('应该转发事件移除到目标stream', () => {
      const handler = jest.fn();
      asyncStream.off('test', handler);
      
      // 由于mockStream没有实现off方法，这个测试主要验证不会报错
      expect(() => asyncStream.off('test', handler)).not.toThrow();
    });
  });
});

describe('createAsyncStream', () => {
  it('应该创建AsyncStream实例', () => {
    const mockStream = new MockStream();
    const stream = createAsyncStream(mockStream);
    
    expect(stream).toBeInstanceOf(AsyncStream);
  });

  it('应该支持自定义选项', () => {
    const mockStream = new MockStream();
    const stream = createAsyncStream(mockStream, { batchSize: 20 });
    
    expect(stream).toBeInstanceOf(AsyncStream);
  });
});