/**
 * Transport 模块单元测试
 * 测试transport stream创建功能
 */

import { transport } from '../transport';
import type { LogTransportOptions, MultiLogTransportOptions } from '../transport';
import type { LogStream, LogEntry } from '../../types';

// Mock console 方法
const mockConsole = {
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
};

describe('Transport 模块测试', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Object.assign(console, mockConsole);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('transport 函数测试', () => {
    describe('单目标 Transport', () => {
      it('应该创建 console transport', () => {
        const options: LogTransportOptions = {
          target: 'console',
          level: 'info'
        };
        
        const stream = transport(options);
        
        expect(stream).toBeDefined();
        expect(typeof stream.write).toBe('function');
      });

      it('应该创建 stdout transport', () => {
        const options: LogTransportOptions = {
          target: 'stdout',
          level: 'debug'
        };
        
        const stream = transport(options);
        
        expect(stream).toBeDefined();
        expect(typeof stream.write).toBe('function');
      });

      it('应该创建 stderr transport', () => {
        const options: LogTransportOptions = {
          target: 'stderr',
          level: 'error'
        };
        
        const stream = transport(options);
        
        expect(stream).toBeDefined();
        expect(typeof stream.write).toBe('function');
      });

      it('应该创建文件路径 transport (.log)', () => {
        const options: LogTransportOptions = {
          target: '/tmp/test.log',
          level: 'info'
        };
        
        const stream = transport(options);
        
        expect(stream).toBeDefined();
        expect(typeof stream.write).toBe('function');
      });

      it('应该创建文件路径 transport (.json)', () => {
        const options: LogTransportOptions = {
          target: '/tmp/test.json',
          level: 'info'
        };
        
        const stream = transport(options);
        
        expect(stream).toBeDefined();
        expect(typeof stream.write).toBe('function');
      });

      it('应该创建 file:// 协议 transport', () => {
        const options: LogTransportOptions = {
          target: 'file:///tmp/test.log',
          level: 'info'
        };
        
        const stream = transport(options);
        
        expect(stream).toBeDefined();
        expect(typeof stream.write).toBe('function');
      });

      it('应该处理 pino/file transport', () => {
        const options: LogTransportOptions = {
          target: 'pino/file',
          level: 'info',
          options: {
            destination: '/tmp/test.log'
          }
        };
        
        const stream = transport(options);
        
        expect(stream).toBeDefined();
        expect(typeof stream.write).toBe('function');
      });

      it('应该拒绝没有 destination 的 pino/file', () => {
        const options: LogTransportOptions = {
          target: 'pino/file',
          level: 'info'
        };
        
        expect(() => transport(options)).toThrow('pino/file requires destination option');
      });

      it('应该处理 LogStream 目标', () => {
        const mockLogStream: LogStream = {
          write: jest.fn(),
          flush: jest.fn(),
          end: jest.fn()
        };
        
        const options: LogTransportOptions = {
          target: mockLogStream,
          level: 'info'
        };
        
        const stream = transport(options);
        
        expect(stream).toBe(mockLogStream);
      });

      it('应该尝试处理未知目标', () => {
        const options: LogTransportOptions = {
          target: 'invalid://target',
          level: 'info'
        };
        
        // 未知目标会被尝试作为文件路径处理
        const stream = transport(options);
        expect(stream).toBeDefined();
        expect(typeof stream.write).toBe('function');
      });
    });

    describe('多目标 Transport', () => {
      it('应该创建多目标 transport', () => {
        const options: MultiLogTransportOptions = {
          targets: [
            { target: 'console', level: 'info' },
            { target: 'stdout', level: 'debug' }
          ]
        };
        
        const stream = transport(options);
        
        expect(stream).toBeDefined();
        expect(typeof stream.write).toBe('function');
      });

      it('应该创建 pipeline transport', () => {
        const options: MultiLogTransportOptions = {
          pipeline: [
            { target: 'console', level: 'info' },
            { target: 'stdout', level: 'debug' }
          ]
        };
        
        const stream = transport(options);
        
        expect(stream).toBeDefined();
        expect(typeof stream.write).toBe('function');
      });

      it('应该同时处理 targets 和 pipeline', () => {
        const options: MultiLogTransportOptions = {
          targets: [
            { target: 'console', level: 'info' }
          ],
          pipeline: [
            { target: 'stdout', level: 'debug' }
          ]
        };
        
        const stream = transport(options);
        
        expect(stream).toBeDefined();
        expect(typeof stream.write).toBe('function');
      });

      it('应该支持 dedupe 选项', () => {
        const options: MultiLogTransportOptions = {
          targets: [
            { target: 'console', level: 'info' },
            { target: 'stdout', level: 'info' }
          ],
          dedupe: true
        };
        
        const stream = transport(options);
        
        expect(stream).toBeDefined();
      });

      it('应该支持自定义 levels', () => {
        const options: MultiLogTransportOptions = {
          targets: [
            { target: 'console', level: 'info' }
          ],
          levels: {
            info: 10,
            debug: 5,
            warn: 20,
            error: 30
          }
        };
        
        const stream = transport(options);
        
        expect(stream).toBeDefined();
      });

      it('应该支持 sync 选项', () => {
        const options: MultiLogTransportOptions = {
          targets: [
            { target: 'console', level: 'info' }
          ],
          sync: true
        };
        
        const stream = transport(options);
        
        expect(stream).toBeDefined();
      });

      it('应该处理空 targets 数组', () => {
        const options: MultiLogTransportOptions = {
          targets: []
        };
        
        const stream = transport(options);
        
        expect(stream).toBeDefined();
      });

      it('应该处理空 pipeline 数组', () => {
        const options: MultiLogTransportOptions = {
          pipeline: []
        };
        
        const stream = transport(options);
        
        expect(stream).toBeDefined();
      });
    });

    describe('Transport 选项', () => {
      it('应该处理 level 选项', () => {
        const options: LogTransportOptions = {
          target: 'console',
          level: 'error'
        };
        
        const stream = transport(options);
        
        expect(stream).toBeDefined();
      });

      it('应该处理 sync 选项', () => {
        const options: LogTransportOptions = {
          target: 'console',
          level: 'info',
          sync: true
        };
        
        const stream = transport(options);
        
        expect(stream).toBeDefined();
      });

      it('应该处理自定义 options', () => {
        const options: LogTransportOptions = {
          target: 'console',
          level: 'info',
          options: {
            custom: 'value'
          }
        };
        
        const stream = transport(options);
        
        expect(stream).toBeDefined();
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
      
      const options: LogTransportOptions = {
        target: mockLogStream,
        level: 'info'
      };
      
      const stream = transport(options);
      stream.write({ level: 'info' as const, message: 'Test message' });
      
      expect(mockLogStream.write).toHaveBeenCalled();
    });

    it('应该支持多目标写入', () => {
      const mockLogStream1: LogStream = {
        write: jest.fn(),
        flush: jest.fn(),
        end: jest.fn()
      };
      
      const mockLogStream2: LogStream = {
        write: jest.fn(),
        flush: jest.fn(),
        end: jest.fn()
      };
      
      const options: MultiLogTransportOptions = {
        targets: [
          { target: mockLogStream1, level: 'info' },
          { target: mockLogStream2, level: 'info' }
        ]
      };
      
      const stream = transport(options);
      stream.write({ level: 'info' as const, message: 'Test message' });
      
      expect(mockLogStream1.write).toHaveBeenCalled();
      expect(mockLogStream2.write).toHaveBeenCalled();
    });

    it('应该支持不同级别的日志', () => {
      const mockLogStream: LogStream = {
        write: jest.fn(),
        flush: jest.fn(),
        end: jest.fn()
      };
      
      const options: LogTransportOptions = {
        target: mockLogStream,
        level: 'debug'
      };
      
      const stream = transport(options);
      stream.write({ level: 'debug' as const, message: 'Debug' });
      stream.write({ level: 'info' as const, message: 'Info' });
      stream.write({ level: 'warn' as const, message: 'Warn' });
      stream.write({ level: 'error' as const, message: 'Error' });
      
      expect(mockLogStream.write).toHaveBeenCalledTimes(4);
    });
  });

  describe('边界情况测试', () => {
    it('应该处理空日志条目', () => {
      const mockLogStream: LogStream = {
        write: jest.fn(),
        flush: jest.fn(),
        end: jest.fn()
      };
      
      const options: LogTransportOptions = {
        target: mockLogStream,
        level: 'info'
      };
      
      const stream = transport(options);
      stream.write({ level: 'info' as const, message: '' });
      
      expect(mockLogStream.write).toHaveBeenCalled();
    });

    it('应该处理特殊字符', () => {
      const mockLogStream: LogStream = {
        write: jest.fn(),
        flush: jest.fn(),
        end: jest.fn()
      };
      
      const options: LogTransportOptions = {
        target: mockLogStream,
        level: 'info'
      };
      
      const stream = transport(options);
      stream.write({ level: 'info' as const, message: 'Test with \n\t\r' });
      
      expect(mockLogStream.write).toHaveBeenCalled();
    });

    it('应该处理嵌套对象', () => {
      const mockLogStream: LogStream = {
        write: jest.fn(),
        flush: jest.fn(),
        end: jest.fn()
      };
      
      const options: LogTransportOptions = {
        target: mockLogStream,
        level: 'info'
      };
      
      const stream = transport(options);
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

    it('应该处理大量 targets', () => {
      const mockLogStream: LogStream = {
        write: jest.fn(),
        flush: jest.fn(),
        end: jest.fn()
      };
      
      const options: MultiLogTransportOptions = {
        targets: Array(10).fill(null).map(() => ({
          target: mockLogStream,
          level: 'info'
        }))
      };
      
      const stream = transport(options);
      
      expect(stream).toBeDefined();
    });
  });

  describe('类型检查测试', () => {
    it('应该正确识别单目标配置', () => {
      const options: LogTransportOptions = {
        target: 'console',
        level: 'info'
      };
      
      const stream = transport(options);
      
      expect(stream).toBeDefined();
      expect(typeof stream.write).toBe('function');
    });

    it('应该正确识别多目标配置', () => {
      const options: MultiLogTransportOptions = {
        targets: [
          { target: 'console', level: 'info' }
        ]
      };
      
      const stream = transport(options);
      
      expect(stream).toBeDefined();
      expect(typeof stream.write).toBe('function');
    });
  });
});