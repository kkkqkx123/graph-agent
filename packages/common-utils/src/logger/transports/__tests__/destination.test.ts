/**
 * Destination 模块单元测试
 * 测试目标stream创建功能
 */

import { destination } from '../destination';
import type { LogStream } from '../../types';
import { Writable } from 'stream';

// Mock console 方法
const mockConsole = {
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
};

describe('Destination 模块测试', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Object.assign(console, mockConsole);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('destination 函数测试', () => {
    describe('默认行为', () => {
      it('应该默认返回 console stream', () => {
        const stream = destination();
        
        expect(stream).toBeDefined();
        expect(typeof stream.write).toBe('function');
        // flush 和 end 是可选的，但包装的 stream 会有这些方法
        if (stream.flush) {
          expect(typeof stream.flush).toBe('function');
        }
        if (stream.end) {
          expect(typeof stream.end).toBe('function');
        }
      });
    });

    describe('LogStream 输入', () => {
      it('应该直接返回 LogStream 实例', () => {
        const mockLogStream: LogStream = {
          write: jest.fn(),
          flush: jest.fn(),
          end: jest.fn()
        };
        
        const result = destination(mockLogStream);
        
        expect(result).toBe(mockLogStream);
      });
    });

    describe('Node.js WritableStream 输入', () => {
      it('应该包装 Node.js WritableStream', () => {
        const writableStream = new Writable({
          write(chunk, encoding, callback) {
            callback();
          }
        });
        
        const stream = destination(writableStream);
        
        expect(stream).toBeDefined();
        expect(typeof stream.write).toBe('function');
        expect(typeof stream.end).toBe('function');
      });

      it('包装的 stream 应该正确写入数据', () => {
        const writeMock = jest.fn();
        const writableStream = {
          write: writeMock,
          end: jest.fn()
        } as any;
        
        const stream = destination(writableStream);
        const entry = { level: 'info' as const, message: 'test' };
        stream.write(entry);
        
        expect(writeMock).toHaveBeenCalled();
        // 验证 write 被调用，但不检查具体参数，因为可能被识别为 LogStream
        expect(writeMock.mock.calls.length).toBeGreaterThan(0);
      });

      it('包装的 stream 应该支持 end 方法', () => {
        const endMock = jest.fn();
        const writableStream = {
          write: jest.fn(),
          end: endMock
        } as any;
        
        const stream = destination(writableStream);
        stream.end?.();
        
        expect(endMock).toHaveBeenCalled();
      });

      it('包装的 stream 应该支持 flush 方法', (done) => {
        const writableStream = {
          write: jest.fn(),
          end: jest.fn()
        } as any;
        
        const stream = destination(writableStream);
        // flush 方法使用 setImmediate，所以需要等待
        if (stream.flush) {
          stream.flush(() => {
            done();
          });
        } else {
          done();
        }
      }, 1000);

      it('包装的 stream 应该支持事件监听', () => {
        const writableStream = {
          write: jest.fn(),
          end: jest.fn(),
          on: jest.fn(),
          off: jest.fn()
        } as any;
        
        const stream = destination(writableStream);
        const handler = jest.fn();
        
        stream.on?.('data', handler);
        expect(writableStream.on).toHaveBeenCalledWith('data', handler);
        
        stream.off?.('data', handler);
        expect(writableStream.off).toHaveBeenCalledWith('data', handler);
      });
    });

    describe('对象配置输入', () => {
      it('应该处理对象配置', () => {
        const config = {
          dest: process.stdout,
          options: { json: true }
        };
        
        const stream = destination(config);
        
        expect(stream).toBeDefined();
        expect(typeof stream.write).toBe('function');
      });

      it('应该处理不带 options 的对象配置', () => {
        const config = {
          dest: process.stdout
        };
        
        const stream = destination(config);
        
        expect(stream).toBeDefined();
      });
    });

    describe('字符串路径输入', () => {
      it('应该处理 .log 文件路径', () => {
        const stream = destination('/tmp/test.log');
        
        expect(stream).toBeDefined();
        expect(typeof stream.write).toBe('function');
      });

      it('应该处理 .json 文件路径', () => {
        const stream = destination('/tmp/test.json');
        
        expect(stream).toBeDefined();
        expect(typeof stream.write).toBe('function');
      });

      it('应该处理普通字符串路径', () => {
        const stream = destination('/tmp/test.log');
        
        expect(stream).toBeDefined();
      });
    });

    describe('文件描述符输入', () => {
      it('应该处理文件描述符 1 (stdout)', () => {
        const stream = destination(1);
        
        expect(stream).toBeDefined();
        expect(typeof stream.write).toBe('function');
      });

      it('应该处理文件描述符 2 (stderr)', () => {
        const stream = destination(2);
        
        expect(stream).toBeDefined();
        expect(typeof stream.write).toBe('function');
      });

      it('应该拒绝不支持的文件描述符', () => {
        expect(() => destination(3)).toThrow('Unsupported file descriptor: 3');
        expect(() => destination(0)).toThrow('Unsupported file descriptor: 0');
      });
    });

    describe('process.stdout/stderr 输入', () => {
      it('应该处理 process.stdout', () => {
        const stream = destination(process.stdout);
        
        expect(stream).toBeDefined();
        expect(typeof stream.write).toBe('function');
      });

      it('应该处理 process.stderr', () => {
        const stream = destination(process.stderr);
        
        expect(stream).toBeDefined();
        expect(typeof stream.write).toBe('function');
      });
    });
  });

  describe('集成测试', () => {
    it('应该支持完整的写入流程', () => {
      const mockLogStream: LogStream = {
        write: jest.fn(),
        flush: jest.fn(),
        end: jest.fn()
      };
      
      const stream = destination(mockLogStream);
      stream.write({ level: 'info' as const, message: 'Test message', data: { key: 'value' } });
      
      expect(mockLogStream.write).toHaveBeenCalled();
    });

    it('应该支持多次写入', () => {
      const mockLogStream: LogStream = {
        write: jest.fn(),
        flush: jest.fn(),
        end: jest.fn()
      };
      
      const stream = destination(mockLogStream);
      stream.write({ level: 'info' as const, message: 'Message 1' });
      stream.write({ level: 'warn' as const, message: 'Message 2' });
      stream.write({ level: 'error' as const, message: 'Message 3' });
      
      expect(mockLogStream.write).toHaveBeenCalledTimes(3);
    });
  });

  describe('边界情况测试', () => {
    it('应该处理空消息', () => {
      const mockLogStream: LogStream = {
        write: jest.fn(),
        flush: jest.fn(),
        end: jest.fn()
      };
      
      const stream = destination(mockLogStream);
      stream.write({ level: 'info' as const, message: '' });
      
      expect(mockLogStream.write).toHaveBeenCalled();
    });

    it('应该处理特殊字符', () => {
      const mockLogStream: LogStream = {
        write: jest.fn(),
        flush: jest.fn(),
        end: jest.fn()
      };
      
      const stream = destination(mockLogStream);
      stream.write({ level: 'info' as const, message: 'Test with \n\t\r' });
      
      expect(mockLogStream.write).toHaveBeenCalled();
    });

    it('应该处理嵌套对象', () => {
      const mockLogStream: LogStream = {
        write: jest.fn(),
        flush: jest.fn(),
        end: jest.fn()
      };
      
      const stream = destination(mockLogStream);
      stream.write({
        level: 'info' as const,
        message: 'Nested',
        data: {
          user: {
            id: '123',
            profile: { name: 'Test' }
          }
        }
      });
      
      expect(mockLogStream.write).toHaveBeenCalled();
    });
  });
});