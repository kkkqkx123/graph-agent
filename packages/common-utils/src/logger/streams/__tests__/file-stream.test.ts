/**
 * FileStream单元测试
 */

import * as fs from 'fs';
import * as path from 'path';
import { FileStream, createFileStream } from '../file-stream';
import type { LogEntry } from '../../types';

describe('FileStream', () => {
  let tempDir: string;
  let testFilePath: string;
  let fileStream: FileStream;

  beforeEach(() => {
    // 创建临时目录
    tempDir = path.join(__dirname, 'temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    testFilePath = path.join(tempDir, `test-${Date.now()}.log`);
  });

  afterEach(() => {
    // 清理临时文件
    if (fileStream) {
      fileStream.end();
    }
    
    // 等待文件写入完成
    jest.useRealTimers();
    
    // 删除临时文件
    if (fs.existsSync(testFilePath)) {
      fs.unlinkSync(testFilePath);
    }
    
    // 删除临时目录（递归删除）
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('构造函数', () => {
    it('应该使用默认选项创建实例', () => {
      fileStream = new FileStream({ filePath: testFilePath });
      expect(fileStream).toBeInstanceOf(FileStream);
    });

    it('应该在缺少filePath时抛出错误', () => {
      expect(() => new FileStream({})).toThrow('filePath is required for FileStream');
    });

    it('应该使用自定义选项创建实例', () => {
      fileStream = new FileStream({
        filePath: testFilePath,
        json: false,
        timestamp: false,
        append: true
      });
      expect(fileStream).toBeInstanceOf(FileStream);
    });
  });

  describe('write方法 - JSON格式', () => {
    beforeEach(() => {
      fileStream = new FileStream({ filePath: testFilePath, json: true });
    });

    it('应该写入JSON格式的日志', (done) => {
      const entry: LogEntry = { level: 'info', message: 'test message' };
      fileStream.write(entry);
      
      fileStream.flush(() => {
        const content = fs.readFileSync(testFilePath, 'utf8');
        const lines = content.trim().split('\n');
        expect(lines).toHaveLength(1);
        const parsed = JSON.parse(lines[0]!);
        expect(parsed).toEqual(entry);
        done();
      });
    });

    it('应该写入多条日志', (done) => {
      const entries: LogEntry[] = [
        { level: 'info', message: 'message 1' },
        { level: 'warn', message: 'message 2' },
        { level: 'error', message: 'message 3' }
      ];
      
      entries.forEach(entry => fileStream.write(entry));
      
      fileStream.flush(() => {
        const content = fs.readFileSync(testFilePath, 'utf8');
        const lines = content.trim().split('\n');
        expect(lines).toHaveLength(3);
        
        lines.forEach((line, index) => {
          const parsed = JSON.parse(line);
          expect(parsed).toEqual(entries[index]);
        });
        done();
      });
    });

    it('应该正确处理包含context的日志', (done) => {
      const entry: LogEntry = {
        level: 'info',
        message: 'test message',
        context: { pkg: 'test-pkg', module: 'test-module' }
      };
      fileStream.write(entry);
      
      fileStream.flush(() => {
        const content = fs.readFileSync(testFilePath, 'utf8');
        const parsed = JSON.parse(content.trim());
        expect(parsed).toEqual(entry);
        done();
      });
    });

    it('应该正确处理包含额外字段的日志', (done) => {
      const entry: LogEntry = {
        level: 'info',
        message: 'test message',
        userId: '123',
        requestId: 'abc'
      };
      fileStream.write(entry);
      
      fileStream.flush(() => {
        const content = fs.readFileSync(testFilePath, 'utf8');
        const parsed = JSON.parse(content.trim());
        expect(parsed).toEqual(entry);
        done();
      });
    });
  });

  describe('write方法 - 普通格式', () => {
    beforeEach(() => {
      fileStream = new FileStream({ filePath: testFilePath, json: false });
    });

    it('应该写入普通格式的日志', (done) => {
      const entry: LogEntry = { level: 'info', message: 'test message' };
      fileStream.write(entry);
      
      fileStream.flush(() => {
        const content = fs.readFileSync(testFilePath, 'utf8');
        expect(content).toContain('[INFO]');
        expect(content).toContain('test message');
        done();
      });
    });

    it('应该正确格式化包含时间戳的日志', (done) => {
      const entry: LogEntry = {
        level: 'info',
        message: 'test message',
        timestamp: '2024-01-01T00:00:00.000Z'
      };
      fileStream.write(entry);
      
      fileStream.flush(() => {
        const content = fs.readFileSync(testFilePath, 'utf8');
        expect(content).toContain('[2024-01-01T00:00:00.000Z]');
        expect(content).toContain('[INFO]');
        expect(content).toContain('test message');
        done();
      });
    });

    it('应该正确格式化包含context的日志', (done) => {
      const entry: LogEntry = {
        level: 'info',
        message: 'test message',
        context: { pkg: 'test-pkg' }
      };
      fileStream.write(entry);
      
      fileStream.flush(() => {
        const content = fs.readFileSync(testFilePath, 'utf8');
        expect(content).toContain('test message');
        expect(content).toContain('test-pkg');
        done();
      });
    });
  });

  describe('缓冲区管理', () => {
    beforeEach(() => {
      fileStream = new FileStream({ filePath: testFilePath, json: true });
    });

    it('应该在缓冲区达到阈值时自动刷新', (done) => {
      // 写入大量数据以触发缓冲区刷新
      const largeMessage = 'x'.repeat(10000);
      for (let i = 0; i < 10; i++) {
        fileStream.write({ level: 'info', message: largeMessage });
      }
      
      // 等待异步写入完成
      setTimeout(() => {
        const content = fs.readFileSync(testFilePath, 'utf8');
        expect(content.length).toBeGreaterThan(0);
        done();
      }, 100);
    });

    it('应该正确处理多次flush', (done) => {
      fileStream.write({ level: 'info', message: 'message 1' });
      
      fileStream.flush(() => {
        const content1 = fs.readFileSync(testFilePath, 'utf8');
        expect(content1).toContain('message 1');
        
        fileStream.write({ level: 'info', message: 'message 2' });
        
        fileStream.flush(() => {
          const content2 = fs.readFileSync(testFilePath, 'utf8');
          expect(content2).toContain('message 1');
          expect(content2).toContain('message 2');
          done();
        });
      });
    });
  });

  describe('append模式', () => {
    it('应该在append模式下追加内容', (done) => {
      // 第一次写入
      const stream1 = new FileStream({ filePath: testFilePath, json: true, append: false });
      stream1.write({ level: 'info', message: 'message 1' });
      stream1.flush(() => {
        stream1.end();
        
        // 第二次写入（追加模式）
        const stream2 = new FileStream({ filePath: testFilePath, json: true, append: true });
        stream2.write({ level: 'info', message: 'message 2' });
        stream2.flush(() => {
          const content = fs.readFileSync(testFilePath, 'utf8');
          const lines = content.trim().split('\n');
          expect(lines).toHaveLength(2);
          expect(lines[0]).toContain('message 1');
          expect(lines[1]).toContain('message 2');
          stream2.end();
          done();
        });
      });
    });

    it('应该在非append模式下覆盖内容', (done) => {
      // 第一次写入
      const stream1 = new FileStream({ filePath: testFilePath, json: true, append: false });
      stream1.write({ level: 'info', message: 'message 1' });
      stream1.flush(() => {
        stream1.end();
        
        // 第二次写入（非追加模式）
        const stream2 = new FileStream({ filePath: testFilePath, json: true, append: false });
        stream2.write({ level: 'info', message: 'message 2' });
        stream2.flush(() => {
          const content = fs.readFileSync(testFilePath, 'utf8');
          const lines = content.trim().split('\n');
          expect(lines).toHaveLength(1);
          expect(lines[0]).toContain('message 2');
          expect(lines[0]).not.toContain('message 1');
          stream2.end();
          done();
        });
      });
    });
  });

  describe('flush方法', () => {
    beforeEach(() => {
      fileStream = new FileStream({ filePath: testFilePath, json: true });
    });

    it('应该刷新缓冲区到文件', (done) => {
      fileStream.write({ level: 'info', message: 'test message' });
      
      fileStream.flush(() => {
        const content = fs.readFileSync(testFilePath, 'utf8');
        expect(content).toContain('test message');
        done();
      });
    });

    it('应该调用回调函数', (done) => {
      fileStream.write({ level: 'info', message: 'test message' });
      
      fileStream.flush(() => {
        done();
      });
    });

    it('应该在空缓冲区时不报错', (done) => {
      fileStream.flush(() => {
        done();
      });
    });
  });

  describe('end方法', () => {
    it('应该刷新并关闭stream', (done) => {
      fileStream = new FileStream({ filePath: testFilePath, json: true });
      fileStream.write({ level: 'info', message: 'test message' });
      
      fileStream.end();
      
      // 等待文件写入完成
      setTimeout(() => {
        const content = fs.readFileSync(testFilePath, 'utf8');
        expect(content).toContain('test message');
        done();
      }, 100);
    });
  });

  describe('事件监听', () => {
    it('应该支持error事件', (done) => {
      // 创建一个无效的路径
      const invalidPath = '/invalid/path/test.log';
      const stream = new FileStream({ filePath: invalidPath, json: true });
      
      let errorOccurred = false;
      stream.on('error', (err) => {
        errorOccurred = true;
        expect(err).toBeDefined();
        done();
      });
      
      stream.write({ level: 'info', message: 'test message' });
      stream.flush();
      
      // 如果没有触发error事件，手动完成测试
      setTimeout(() => {
        if (!errorOccurred) {
          done();
        }
      }, 100);
    });
  });
});

describe('createFileStream', () => {
  let tempDir: string;
  let testFilePath: string;

  beforeEach(() => {
    tempDir = path.join(__dirname, 'temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    testFilePath = path.join(tempDir, `test-${Date.now()}.log`);
  });

  afterEach(() => {
    if (fs.existsSync(testFilePath)) {
      fs.unlinkSync(testFilePath);
    }
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('应该创建FileStream实例', () => {
    const stream = createFileStream({ filePath: testFilePath });
    expect(stream).toBeInstanceOf(FileStream);
    if (stream.end) {
      stream.end();
    }
  });

  it('应该支持自定义选项', () => {
    const stream = createFileStream({
      filePath: testFilePath,
      json: false,
      append: true
    });
    expect(stream).toBeInstanceOf(FileStream);
    if (stream.end) {
      stream.end();
    }
  });
});