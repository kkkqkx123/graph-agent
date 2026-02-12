/**
 * ConsoleStream单元测试
 */

import { ConsoleStream, createConsoleStream } from '../console-stream';
import type { LogEntry } from '../../types';

describe('ConsoleStream', () => {
  let consoleStream: ConsoleStream;
  let consoleLogSpy: jest.SpyInstance;
  let consoleDebugSpy: jest.SpyInstance;
  let consoleWarnSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
    consoleDebugSpy = jest.spyOn(console, 'debug').mockImplementation();
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleDebugSpy.mockRestore();
    consoleWarnSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  describe('构造函数', () => {
    it('应该使用默认选项创建实例', () => {
      consoleStream = new ConsoleStream();
      expect(consoleStream).toBeInstanceOf(ConsoleStream);
    });

    it('应该使用自定义选项创建实例', () => {
      consoleStream = new ConsoleStream({ json: true, timestamp: false, pretty: true });
      expect(consoleStream).toBeInstanceOf(ConsoleStream);
    });
  });

  describe('write方法 - JSON格式', () => {
    beforeEach(() => {
      consoleStream = new ConsoleStream({ json: true });
    });

    it('应该以JSON格式输出info级别日志', () => {
      const entry: LogEntry = { level: 'info', message: 'test message' };
      consoleStream.write(entry);

      expect(consoleLogSpy).toHaveBeenCalledTimes(1);
      const output = JSON.parse(consoleLogSpy.mock.calls[0][0]);
      expect(output).toEqual(entry);
    });

    it('应该以JSON格式输出debug级别日志', () => {
      const entry: LogEntry = { level: 'debug', message: 'debug message' };
      consoleStream.write(entry);

      expect(consoleLogSpy).toHaveBeenCalledTimes(1);
      const output = JSON.parse(consoleLogSpy.mock.calls[0][0]);
      expect(output).toEqual(entry);
    });

    it('应该以JSON格式输出warn级别日志', () => {
      const entry: LogEntry = { level: 'warn', message: 'warn message' };
      consoleStream.write(entry);

      expect(consoleLogSpy).toHaveBeenCalledTimes(1);
      const output = JSON.parse(consoleLogSpy.mock.calls[0][0]);
      expect(output).toEqual(entry);
    });

    it('应该以JSON格式输出error级别日志', () => {
      const entry: LogEntry = { level: 'error', message: 'error message' };
      consoleStream.write(entry);

      expect(consoleLogSpy).toHaveBeenCalledTimes(1);
      const output = JSON.parse(consoleLogSpy.mock.calls[0][0]);
      expect(output).toEqual(entry);
    });

    it('应该正确序列化包含context的日志', () => {
      const entry: LogEntry = {
        level: 'info',
        message: 'test message',
        context: { pkg: 'test-pkg', module: 'test-module' }
      };
      consoleStream.write(entry);

      expect(consoleLogSpy).toHaveBeenCalledTimes(1);
      const output = JSON.parse(consoleLogSpy.mock.calls[0][0]);
      expect(output).toEqual(entry);
    });

    it('应该正确序列化包含额外字段的日志', () => {
      const entry: LogEntry = {
        level: 'info',
        message: 'test message',
        userId: '123',
        requestId: 'abc'
      };
      consoleStream.write(entry);

      expect(consoleLogSpy).toHaveBeenCalledTimes(1);
      const output = JSON.parse(consoleLogSpy.mock.calls[0][0]);
      expect(output).toEqual(entry);
    });
  });

  describe('write方法 - 普通格式', () => {
    beforeEach(() => {
      consoleStream = new ConsoleStream({ json: false });
    });

    it('应该使用console.log输出info级别日志', () => {
      const entry: LogEntry = { level: 'info', message: 'test message' };
      consoleStream.write(entry);

      expect(consoleLogSpy).toHaveBeenCalledTimes(1);
      expect(consoleDebugSpy).not.toHaveBeenCalled();
      expect(consoleWarnSpy).not.toHaveBeenCalled();
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });

    it('应该使用console.debug输出debug级别日志', () => {
      const entry: LogEntry = { level: 'debug', message: 'debug message' };
      consoleStream.write(entry);

      expect(consoleDebugSpy).toHaveBeenCalledTimes(1);
      expect(consoleLogSpy).not.toHaveBeenCalled();
      expect(consoleWarnSpy).not.toHaveBeenCalled();
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });

    it('应该使用console.warn输出warn级别日志', () => {
      const entry: LogEntry = { level: 'warn', message: 'warn message' };
      consoleStream.write(entry);

      expect(consoleWarnSpy).toHaveBeenCalledTimes(1);
      expect(consoleLogSpy).not.toHaveBeenCalled();
      expect(consoleDebugSpy).not.toHaveBeenCalled();
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });

    it('应该使用console.error输出error级别日志', () => {
      const entry: LogEntry = { level: 'error', message: 'error message' };
      consoleStream.write(entry);

      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
      expect(consoleLogSpy).not.toHaveBeenCalled();
      expect(consoleDebugSpy).not.toHaveBeenCalled();
      expect(consoleWarnSpy).not.toHaveBeenCalled();
    });

    it('应该正确格式化包含时间戳的日志', () => {
      const entry: LogEntry = {
        level: 'info',
        message: 'test message',
        timestamp: '2024-01-01T00:00:00.000Z'
      };
      consoleStream.write(entry);

      expect(consoleLogSpy).toHaveBeenCalledTimes(1);
      const output = consoleLogSpy.mock.calls[0][0];
      expect(output).toContain('[2024-01-01T00:00:00.000Z]');
      expect(output).toContain('[INFO]');
      expect(output).toContain('test message');
    });

    it('应该正确格式化包含context的日志', () => {
      const entry: LogEntry = {
        level: 'info',
        message: 'test message',
        context: { pkg: 'test-pkg' }
      };
      consoleStream.write(entry);

      expect(consoleLogSpy).toHaveBeenCalledTimes(1);
      const output = consoleLogSpy.mock.calls[0][0];
      expect(output).toContain('test message');
      expect(output).toContain('test-pkg');
    });

    it('应该正确格式化包含额外字段的日志', () => {
      const entry: LogEntry = {
        level: 'info',
        message: 'test message',
        userId: '123'
      };
      consoleStream.write(entry);

      expect(consoleLogSpy).toHaveBeenCalledTimes(1);
      const output = consoleLogSpy.mock.calls[0][0];
      expect(output).toContain('test message');
      expect(output).toContain('123');
    });
  });

  describe('write方法 - 彩色输出', () => {
    beforeEach(() => {
      consoleStream = new ConsoleStream({ json: false, pretty: true });
    });

    it('应该为info级别添加绿色', () => {
      const entry: LogEntry = { level: 'info', message: 'test message' };
      consoleStream.write(entry);

      expect(consoleLogSpy).toHaveBeenCalledTimes(1);
      const output = consoleLogSpy.mock.calls[0][0];
      expect(output).toContain('\x1b[32m'); // 绿色ANSI代码
      expect(output).toContain('\x1b[0m'); // 重置ANSI代码
    });

    it('应该为debug级别添加蓝色', () => {
      const entry: LogEntry = { level: 'debug', message: 'debug message' };
      consoleStream.write(entry);

      expect(consoleDebugSpy).toHaveBeenCalledTimes(1);
      const output = consoleDebugSpy.mock.calls[0][0];
      expect(output).toContain('\x1b[34m'); // 蓝色ANSI代码
      expect(output).toContain('\x1b[0m'); // 重置ANSI代码
    });

    it('应该为warn级别添加黄色', () => {
      const entry: LogEntry = { level: 'warn', message: 'warn message' };
      consoleStream.write(entry);

      expect(consoleWarnSpy).toHaveBeenCalledTimes(1);
      const output = consoleWarnSpy.mock.calls[0][0];
      expect(output).toContain('\x1b[33m'); // 黄色ANSI代码
      expect(output).toContain('\x1b[0m'); // 重置ANSI代码
    });

    it('应该为error级别添加红色', () => {
      const entry: LogEntry = { level: 'error', message: 'error message' };
      consoleStream.write(entry);

      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
      const output = consoleErrorSpy.mock.calls[0][0];
      expect(output).toContain('\x1b[31m'); // 红色ANSI代码
      expect(output).toContain('\x1b[0m'); // 重置ANSI代码
    });
  });

  describe('flush方法', () => {
    it('应该调用回调函数', (done) => {
      consoleStream = new ConsoleStream();
      consoleStream.flush(() => {
        done();
      });
    });

    it('应该在没有回调时不报错', () => {
      consoleStream = new ConsoleStream();
      expect(() => consoleStream.flush()).not.toThrow();
    });
  });

  describe('end方法', () => {
    it('应该正常结束', () => {
      consoleStream = new ConsoleStream();
      expect(() => consoleStream.end()).not.toThrow();
    });
  });
});

describe('createConsoleStream', () => {
  it('应该创建ConsoleStream实例', () => {
    const stream = createConsoleStream();
    expect(stream).toBeInstanceOf(ConsoleStream);
  });

  it('应该支持自定义选项', () => {
    const stream = createConsoleStream({ json: true, pretty: true });
    expect(stream).toBeInstanceOf(ConsoleStream);
  });
});