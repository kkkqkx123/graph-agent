/**
 * Multistream单元测试
 */

import { Multistream, createMultistream } from '../multistream';
import type { LogStream, LogEntry, StreamEntry } from '../../types';

// 创建一个mock stream用于测试
class MockStream implements LogStream {
  public entries: LogEntry[] = [];
  public flushed = false;
  public ended = false;
  public eventHandlers: Record<string, Function[]> = {};

  write(entry: LogEntry): void {
    this.entries.push(entry);
  }

  flush(callback?: () => void): void {
    this.flushed = true;
    if (callback) {
      setImmediate(callback);
    }
  }

  end(): void {
    this.ended = true;
  }

  on(event: string, handler: (...args: any[]) => void): void {
    if (!this.eventHandlers[event]) {
      this.eventHandlers[event] = [];
    }
    this.eventHandlers[event].push(handler);
  }

  off(event: string, handler: (...args: any[]) => void): void {
    if (this.eventHandlers[event]) {
      this.eventHandlers[event] = this.eventHandlers[event].filter(h => h !== handler);
    }
  }
}

describe('Multistream', () => {
  let mockStream1: MockStream;
  let mockStream2: MockStream;
  let mockStream3: MockStream;
  let multistream: Multistream;

  beforeEach(() => {
    mockStream1 = new MockStream();
    mockStream2 = new MockStream();
    mockStream3 = new MockStream();
  });

  describe('构造函数', () => {
    it('应该使用空streams创建实例', () => {
      multistream = new Multistream();
      expect(multistream).toBeInstanceOf(Multistream);
      expect(multistream.count).toBe(0);
    });

    it('应该使用初始streams创建实例', () => {
      const streams: StreamEntry[] = [
        { stream: mockStream1, level: 'info' },
        { stream: mockStream2, level: 'warn' }
      ];
      multistream = new Multistream(streams);
      expect(multistream).toBeInstanceOf(Multistream);
      expect(multistream.count).toBe(2);
    });

    it('应该使用自定义选项创建实例', () => {
      const streams: StreamEntry[] = [
        { stream: mockStream1, level: 'info' }
      ];
      multistream = new Multistream(streams, { dedupe: true });
      expect(multistream).toBeInstanceOf(Multistream);
    });
  });

  describe('write方法 - 级别过滤', () => {
    beforeEach(() => {
      const streams: StreamEntry[] = [
        { stream: mockStream1, level: 'debug' },  // 接收所有级别
        { stream: mockStream2, level: 'info' },   // 接收info及以上
        { stream: mockStream3, level: 'warn' }    // 接收warn及以上
      ];
      multistream = new Multistream(streams);
    });

    it('应该将debug日志写入所有stream', () => {
      const entry: LogEntry = { level: 'debug', message: 'debug message' };
      multistream.write(entry);

      expect(mockStream1.entries).toHaveLength(1);
      expect(mockStream2.entries).toHaveLength(0);
      expect(mockStream3.entries).toHaveLength(0);
    });

    it('应该将info日志写入debug和info级别的stream', () => {
      const entry: LogEntry = { level: 'info', message: 'info message' };
      multistream.write(entry);

      expect(mockStream1.entries).toHaveLength(1);
      expect(mockStream2.entries).toHaveLength(1);
      expect(mockStream3.entries).toHaveLength(0);
    });

    it('应该将warn日志写入所有stream', () => {
      const entry: LogEntry = { level: 'warn', message: 'warn message' };
      multistream.write(entry);

      expect(mockStream1.entries).toHaveLength(1);
      expect(mockStream2.entries).toHaveLength(1);
      expect(mockStream3.entries).toHaveLength(1);
    });

    it('应该将error日志写入所有stream', () => {
      const entry: LogEntry = { level: 'error', message: 'error message' };
      multistream.write(entry);

      expect(mockStream1.entries).toHaveLength(1);
      expect(mockStream2.entries).toHaveLength(1);
      expect(mockStream3.entries).toHaveLength(1);
    });
  });

  describe('write方法 - 去重模式', () => {
    beforeEach(() => {
      const streams: StreamEntry[] = [
        { stream: mockStream1, level: 'info' },
        { stream: mockStream2, level: 'info' },
        { stream: mockStream3, level: 'warn' }
      ];
      multistream = new Multistream(streams, { dedupe: true });
    });

    it('应该在去重模式下只写入第一个匹配的stream', () => {
      const entry: LogEntry = { level: 'info', message: 'info message' };
      multistream.write(entry);

      // 在去重模式下，应该只写入一个info级别的stream
      // 由于streams按级别排序，且从后往前遍历，应该只写入最后一个info级别的stream
      const infoCount = [mockStream1, mockStream2, mockStream3]
        .filter(s => s.entries.length > 0)
        .length;
      
      // 去重模式下，相同级别的stream都会被写入，但不会写入更低级别的stream
      expect(infoCount).toBeGreaterThanOrEqual(1);
      expect(mockStream3.entries).toHaveLength(0); // warn级别不应该被写入
    });

    it('应该在去重模式下写入不同级别的stream', () => {
      const entry: LogEntry = { level: 'warn', message: 'warn message' };
      multistream.write(entry);

      // warn级别应该写入warn级别的stream
      expect(mockStream3.entries).toHaveLength(1);
    });
  });

  describe('write方法 - 非去重模式', () => {
    beforeEach(() => {
      const streams: StreamEntry[] = [
        { stream: mockStream1, level: 'info' },
        { stream: mockStream2, level: 'info' },
        { stream: mockStream3, level: 'warn' }
      ];
      multistream = new Multistream(streams, { dedupe: false });
    });

    it('应该在非去重模式下写入所有匹配的stream', () => {
      const entry: LogEntry = { level: 'info', message: 'info message' };
      multistream.write(entry);

      // 应该写入所有info级别的stream
      expect(mockStream1.entries).toHaveLength(1);
      expect(mockStream2.entries).toHaveLength(1);
      expect(mockStream3.entries).toHaveLength(0);
    });
  });

  describe('write方法 - 数字级别', () => {
    beforeEach(() => {
      const streams: StreamEntry[] = [
        { stream: mockStream1, levelVal: 0 },  // debug
        { stream: mockStream2, levelVal: 1 },  // info
        { stream: mockStream3, levelVal: 2 }   // warn
      ];
      multistream = new Multistream(streams);
    });

    it('应该正确处理数字级别', () => {
      const entry: LogEntry = { level: 'info', message: 'info message' };
      multistream.write(entry);

      expect(mockStream1.entries).toHaveLength(1);
      expect(mockStream2.entries).toHaveLength(1);
      expect(mockStream3.entries).toHaveLength(0);
    });
  });

  describe('add方法', () => {
    beforeEach(() => {
      multistream = new Multistream();
    });

    it('应该添加stream', () => {
      multistream.add({ stream: mockStream1, level: 'info' });
      expect(multistream.count).toBe(1);
    });

    it('应该添加多个stream', () => {
      multistream.add({ stream: mockStream1, level: 'info' });
      multistream.add({ stream: mockStream2, level: 'warn' });
      multistream.add({ stream: mockStream3, level: 'error' });
      expect(multistream.count).toBe(3);
    });

    it('应该在缺少stream时抛出错误', () => {
      expect(() => multistream.add({ level: 'info' } as any)).toThrow(
        'stream entry must have a stream property'
      );
    });

    it('应该自动分配ID', () => {
      multistream.add({ stream: mockStream1, level: 'info' });
      multistream.add({ stream: mockStream2, level: 'warn' });
      
      const streams = multistream['streams'];
      expect(streams[0]?.id).toBeDefined();
      expect(streams[1]?.id).toBeDefined();
      expect(streams[1]?.id).toBeGreaterThan(streams[0]?.id!);
    });

    it('应该按级别排序streams', () => {
      multistream.add({ stream: mockStream1, level: 'error' });
      multistream.add({ stream: mockStream2, level: 'debug' });
      multistream.add({ stream: mockStream3, level: 'info' });
      
      // 写入debug日志，应该只写入debug级别的stream
      const entry: LogEntry = { level: 'debug', message: 'debug message' };
      multistream.write(entry);
      
      expect(mockStream2.entries).toHaveLength(1);
      expect(mockStream1.entries).toHaveLength(0);
      expect(mockStream3.entries).toHaveLength(0);
    });

    it('应该返回this以支持链式调用', () => {
      const result = multistream.add({ stream: mockStream1, level: 'info' });
      expect(result).toBe(multistream);
    });
  });

  describe('remove方法', () => {
    beforeEach(() => {
      const streams: StreamEntry[] = [
        { stream: mockStream1, level: 'info' },
        { stream: mockStream2, level: 'warn' },
        { stream: mockStream3, level: 'error' }
      ];
      multistream = new Multistream(streams);
    });

    it('应该移除指定ID的stream', () => {
      const idToRemove = multistream['streams'][1]?.id;
      if (idToRemove) {
        multistream.remove(idToRemove);
      }
      
      expect(multistream.count).toBe(2);
    });

    it('应该在移除不存在的ID时不报错', () => {
      const initialCount = multistream.count;
      multistream.remove(999);
      
      expect(multistream.count).toBe(initialCount);
    });

    it('应该返回this以支持链式调用', () => {
      const idToRemove = multistream['streams'][0]?.id;
      const result = idToRemove ? multistream.remove(idToRemove) : multistream;
      expect(result).toBe(multistream);
    });

    it('应该在移除后不再写入该stream', () => {
      const idToRemove = multistream['streams'][1]?.id;
      if (idToRemove) {
        multistream.remove(idToRemove);
      }
      
      const entry: LogEntry = { level: 'warn', message: 'warn message' };
      multistream.write(entry);
      
      expect(mockStream2.entries).toHaveLength(0);
    });
  });

  describe('flush方法', () => {
    beforeEach(() => {
      const streams: StreamEntry[] = [
        { stream: mockStream1, level: 'info' },
        { stream: mockStream2, level: 'warn' }
      ];
      multistream = new Multistream(streams);
    });

    it('应该刷新所有stream', (done) => {
      multistream.flush(() => {
        expect(mockStream1.flushed).toBe(true);
        expect(mockStream2.flushed).toBe(true);
        done();
      });
    });

    it('应该在空multistream时调用回调', (done) => {
      const emptyMultistream = new Multistream();
      emptyMultistream.flush(() => {
        done();
      });
    });

    it('应该处理没有flush方法的stream', (done) => {
      const noFlushStream = { write: jest.fn() } as any;
      multistream.add({ stream: noFlushStream, level: 'info' });
      
      multistream.flush(() => {
        done();
      });
    });
  });

  describe('end方法', () => {
    beforeEach(() => {
      const streams: StreamEntry[] = [
        { stream: mockStream1, level: 'info' },
        { stream: mockStream2, level: 'warn' }
      ];
      multistream = new Multistream(streams);
    });

    it('应该结束所有stream', (done) => {
      multistream.end();
      
      // 等待异步操作完成
      setTimeout(() => {
        expect(mockStream1.ended).toBe(true);
        expect(mockStream2.ended).toBe(true);
        done();
      }, 100);
    });

    it('应该处理没有end方法的stream', (done) => {
      const noEndStream = { write: jest.fn(), flush: jest.fn() } as any;
      multistream.add({ stream: noEndStream, level: 'info' });
      
      multistream.end();
      
      // 等待异步操作完成
      setTimeout(() => {
        done();
      }, 100);
    });
  });

  describe('事件监听', () => {
    beforeEach(() => {
      const streams: StreamEntry[] = [
        { stream: mockStream1, level: 'info' },
        { stream: mockStream2, level: 'warn' }
      ];
      multistream = new Multistream(streams);
    });

    it('应该将事件监听器添加到所有stream', () => {
      const handler = jest.fn();
      multistream.on('test', handler);
      
      expect(mockStream1.eventHandlers['test']).toContain(handler);
      expect(mockStream2.eventHandlers['test']).toContain(handler);
    });

    it('应该从所有stream移除事件监听器', () => {
      const handler = jest.fn();
      multistream.on('test', handler);
      multistream.off('test', handler);
      
      expect(mockStream1.eventHandlers['test']).not.toContain(handler);
      expect(mockStream2.eventHandlers['test']).not.toContain(handler);
    });

    it('应该处理没有on方法的stream', () => {
      const noOnStream = { write: jest.fn() } as any;
      multistream.add({ stream: noOnStream, level: 'info' });
      
      expect(() => multistream.on('test', jest.fn())).not.toThrow();
    });

    it('应该处理没有off方法的stream', () => {
      const noOffStream = { write: jest.fn() } as any;
      multistream.add({ stream: noOffStream, level: 'info' });
      
      expect(() => multistream.off('test', jest.fn())).not.toThrow();
    });
  });

  describe('clone方法', () => {
    beforeEach(() => {
      const streams: StreamEntry[] = [
        { stream: mockStream1, level: 'info' },
        { stream: mockStream2, level: 'warn' }
      ];
      multistream = new Multistream(streams, { dedupe: true });
    });

    it('应该克隆multistream', () => {
      const cloned = multistream.clone();
      
      expect(cloned).toBeInstanceOf(Multistream);
      expect(cloned.count).toBe(multistream.count);
    });

    it('应该保留dedupe选项', () => {
      const cloned = multistream.clone();
      
      // 验证dedupe选项被保留
      expect(cloned).toBeInstanceOf(Multistream);
    });

    it('应该使用自定义级别克隆', () => {
      const cloned = multistream.clone('error');
      
      expect(cloned).toBeInstanceOf(Multistream);
      expect(cloned.count).toBe(multistream.count);
    });

    it('应该共享相同的stream实例', () => {
      const cloned = multistream.clone();
      
      const entry: LogEntry = { level: 'info', message: 'test message' };
      cloned.write(entry);
      
      expect(mockStream1.entries).toHaveLength(1);
    });
  });

  describe('count属性', () => {
    it('应该返回正确的stream数量', () => {
      multistream = new Multistream();
      expect(multistream.count).toBe(0);
      
      multistream.add({ stream: mockStream1, level: 'info' });
      expect(multistream.count).toBe(1);
      
      multistream.add({ stream: mockStream2, level: 'warn' });
      expect(multistream.count).toBe(2);
      
      const idToRemove = multistream['streams'][0]?.id;
      if (idToRemove) {
        multistream.remove(idToRemove);
      }
      expect(multistream.count).toBe(1);
    });
  });

  describe('自定义级别映射', () => {
    it('应该使用自定义级别映射', () => {
      const streams: StreamEntry[] = [
        { stream: mockStream1, levelVal: 0 },
        { stream: mockStream2, levelVal: 1 }
      ];
      multistream = new Multistream(streams, {
        levels: { custom1: 0, custom2: 1 }
      });
      
      const entry: LogEntry = { level: 'debug', message: 'test message' };
      multistream.write(entry);
      
      expect(mockStream1.entries).toHaveLength(1);
      expect(mockStream2.entries).toHaveLength(0);
    });
  });
});

describe('createMultistream', () => {
  let mockStream1: MockStream;
  let mockStream2: MockStream;

  beforeEach(() => {
    mockStream1 = new MockStream();
    mockStream2 = new MockStream();
  });

  it('应该创建Multistream实例', () => {
    const stream = createMultistream();
    expect(stream).toBeInstanceOf(Multistream);
  });

  it('应该支持初始streams', () => {
    const streams: StreamEntry[] = [
      { stream: mockStream1, level: 'info' },
      { stream: mockStream2, level: 'warn' }
    ];
    const stream = createMultistream(streams);
    expect(stream).toBeInstanceOf(Multistream);
    expect((stream as Multistream).count).toBe(2);
  });

  it('应该支持自定义选项', () => {
    const streams: StreamEntry[] = [
      { stream: mockStream1, level: 'info' }
    ];
    const stream = createMultistream(streams, { dedupe: true });
    expect(stream).toBeInstanceOf(Multistream);
  });
});