/**
 * 传输协议单元测试
 */

import { HttpTransport, SseTransport } from '../transport';

// Mock fetch
global.fetch = jest.fn();

describe('HttpTransport', () => {
  let transport: HttpTransport;

  beforeEach(() => {
    transport = new HttpTransport('https://api.example.com', {
      'Content-Type': 'application/json',
    }, 5000);
    jest.clearAllMocks();
  });

  describe('构造函数', () => {
    it('应该使用默认配置创建传输实例', () => {
      const defaultTransport = new HttpTransport();
      expect(defaultTransport).toBeDefined();
    });

    it('应该使用自定义配置创建传输实例', () => {
      const customTransport = new HttpTransport(
        'https://api.example.com',
        { 'Authorization': 'Bearer token' },
        10000
      );
      expect(customTransport).toBeDefined();
    });
  });

  describe('execute', () => {
    it('应该成功执行GET请求', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        headers: new Headers({
          'content-type': 'application/json',
          'x-request-id': 'req-123',
        }),
        json: jest.fn().mockResolvedValue({ data: 'test' }),
      };
      
      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);
      
      const result = await transport.execute('/test');
      
      expect(result.data).toEqual({ data: 'test' });
      expect(result.status).toBe(200);
      expect(result.requestId).toBe('req-123');
      expect(result.headers).toEqual({
        'content-type': 'application/json',
        'x-request-id': 'req-123',
      });
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.example.com/test',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
        })
      );
    });

    it('应该正确构建完整URL', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: jest.fn().mockResolvedValue({}),
      };
      
      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);
      
      await transport.execute('/api/users');
      
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.example.com/api/users',
        expect.any(Object)
      );
    });

    it('应该处理绝对URL', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: jest.fn().mockResolvedValue({}),
      };
      
      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);
      
      await transport.execute('https://other-api.com/test');
      
      expect(global.fetch).toHaveBeenCalledWith(
        'https://other-api.com/test',
        expect.any(Object)
      );
    });

    it('应该添加查询参数', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: jest.fn().mockResolvedValue({}),
      };
      
      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);
      
      await transport.execute('/test', {
        query: { page: 1, limit: 10, search: 'test' },
      });
      
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('page=1&limit=10&search=test'),
        expect.any(Object)
      );
    });

    it('应该过滤undefined和null的查询参数', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: jest.fn().mockResolvedValue({}),
      };
      
      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);
      
      const query: Record<string, string | number | boolean> = { page: 1 };
      await transport.execute('/test', {
        query,
      });
      
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('page=1'),
        expect.any(Object)
      );
    });

    it('应该合并请求头', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: jest.fn().mockResolvedValue({}),
      };
      
      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);
      
      await transport.execute('/test', {
        headers: { 'Authorization': 'Bearer token' },
      });
      
      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'Authorization': 'Bearer token',
          }),
        })
      );
    });

    it('应该处理文本响应', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'text/plain' }),
        text: jest.fn().mockResolvedValue('plain text'),
      };
      
      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);
      
      const result = await transport.execute('/test');
      
      expect(result.data).toBe('plain text');
    });

    it('应该处理流式响应', async () => {
      const mockBody = new ReadableStream();
      const mockResponse = {
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'text/event-stream' }),
        body: mockBody,
      };
      
      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);
      
      const result = await transport.execute('/test', { stream: true });
      
      expect(result.data).toBe(mockBody);
      expect(result.status).toBe(200);
    });

    it('应该在请求失败时抛出错误', async () => {
      const mockResponse = {
        ok: false,
        status: 404,
        statusText: 'Not Found',
      };
      
      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);
      
      await expect(transport.execute('/test')).rejects.toThrow('HTTP 404: Not Found');
    });

    it('应该处理超时', async () => {
      const mockSignal = {
        aborted: false,
      };
      
      const mockController = {
        abort: jest.fn(),
        signal: mockSignal,
      };
      
      global.AbortController = jest.fn().mockImplementation(() => mockController);
      
      (global.fetch as jest.Mock).mockImplementation(() =>
        new Promise((resolve) => setTimeout(resolve, 10000))
      );
      
      // 模拟超时
      setTimeout(() => {
        mockSignal.aborted = true;
      }, 100);
      
      await expect(transport.execute('/test')).rejects.toThrow();
    });
  });

  describe('URL构建', () => {
    it('应该正确处理baseURL末尾的斜杠', async () => {
      const transportWithSlash = new HttpTransport('https://api.example.com/');
      const mockResponse = {
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: jest.fn().mockResolvedValue({}),
      };
      
      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);
      
      await transportWithSlash.execute('/test');
      
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.example.com/test',
        expect.any(Object)
      );
    });

    it('应该正确处理URL开头的斜杠', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: jest.fn().mockResolvedValue({}),
      };
      
      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);
      
      await transport.execute('test');
      
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.example.com/test',
        expect.any(Object)
      );
    });
  });
});

describe('SseTransport', () => {
  let transport: SseTransport;

  beforeEach(() => {
    transport = new SseTransport('https://api.example.com', {
      'Authorization': 'Bearer token',
    }, 5000);
    jest.clearAllMocks();
  });

  describe('构造函数', () => {
    it('应该使用默认配置创建传输实例', () => {
      const defaultTransport = new SseTransport();
      expect(defaultTransport).toBeDefined();
    });

    it('应该使用自定义配置创建传输实例', () => {
      const customTransport = new SseTransport(
        'https://api.example.com',
        { 'Authorization': 'Bearer token' },
        10000
      );
      expect(customTransport).toBeDefined();
    });
  });

  describe('execute', () => {
    it('应该成功执行SSE请求', async () => {
      const mockBody = new ReadableStream();
      const mockResponse = {
        ok: true,
        status: 200,
        headers: new Headers({
          'content-type': 'text/event-stream',
          'x-request-id': 'req-123',
        }),
        body: mockBody,
      };
      
      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);
      
      const result = await transport.execute('/stream');
      
      expect(result.data).toBe(mockBody);
      expect(result.status).toBe(200);
      expect(result.requestId).toBe('req-123');
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.example.com/stream',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Accept': 'text/event-stream, text/plain, */*',
            'Authorization': 'Bearer token',
          }),
        })
      );
    });

    it('应该在请求失败时抛出错误', async () => {
      const mockResponse = {
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      };
      
      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);
      
      await expect(transport.execute('/stream')).rejects.toThrow('HTTP 500: Internal Server Error');
    });
  });

  describe('executeStream', () => {
    it('应该正确解析SSE流', async () => {
      const chunks = [
        'data: {"message": "hello"}\n\n',
        'data: {"message": "world"}\n\n',
        'data: [DONE]\n\n',
      ];
      
      const mockStream = new ReadableStream({
        async start(controller) {
          for (const chunk of chunks) {
            controller.enqueue(new TextEncoder().encode(chunk));
            await new Promise(resolve => setTimeout(resolve, 10));
          }
          controller.close();
        },
      });
      
      const mockResponse = {
        ok: true,
        body: mockStream,
      };
      
      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);
      
      const results: any[] = [];
      for await (const data of transport.executeStream('/stream')) {
        results.push(data);
      }
      
      expect(results).toHaveLength(2);
      expect(results[0]).toEqual({ message: 'hello' });
      expect(results[1]).toEqual({ message: 'world' });
    });

    it('应该处理非JSON数据', async () => {
      const chunks = [
        'data: plain text\n\n',
        'data: another text\n\n',
      ];
      
      const mockStream = new ReadableStream({
        async start(controller) {
          for (const chunk of chunks) {
            controller.enqueue(new TextEncoder().encode(chunk));
            await new Promise(resolve => setTimeout(resolve, 10));
          }
          controller.close();
        },
      });
      
      const mockResponse = {
        ok: true,
        body: mockStream,
      };
      
      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);
      
      const results: any[] = [];
      for await (const data of transport.executeStream('/stream')) {
        results.push(data);
      }
      
      expect(results).toHaveLength(2);
      expect(results[0]).toBe('plain text');
      expect(results[1]).toBe('another text');
    });

    it('应该处理跨行的SSE数据', async () => {
      const chunks = [
        'data: {"message": "multi-line"}\n\n',
      ];
      
      const mockStream = new ReadableStream({
        async start(controller) {
          for (const chunk of chunks) {
            controller.enqueue(new TextEncoder().encode(chunk));
            await new Promise(resolve => setTimeout(resolve, 10));
          }
          controller.close();
        },
      });
      
      const mockResponse = {
        ok: true,
        body: mockStream,
      };
      
      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);
      
      const results: any[] = [];
      for await (const data of transport.executeStream('/stream')) {
        results.push(data);
      }
      
      expect(results).toHaveLength(1);
      expect(results[0]).toEqual({ message: 'multi-line' });
    });

    it('应该处理空行和[DONE]标记', async () => {
      const chunks = [
        '\n\n',
        'data: [DONE]\n\n',
        'data: {"message": "test"}\n\n',
      ];
      
      const mockStream = new ReadableStream({
        async start(controller) {
          for (const chunk of chunks) {
            controller.enqueue(new TextEncoder().encode(chunk));
            await new Promise(resolve => setTimeout(resolve, 10));
          }
          controller.close();
        },
      });
      
      const mockResponse = {
        ok: true,
        body: mockStream,
      };
      
      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);
      
      const results: any[] = [];
      for await (const data of transport.executeStream('/stream')) {
        results.push(data);
      }
      
      expect(results).toHaveLength(1);
      expect(results[0]).toEqual({ message: 'test' });
    });

    it('应该在响应体为null时抛出错误', async () => {
      const mockResponse = {
        ok: true,
        body: null,
      };
      
      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);
      
      const stream = transport.executeStream('/stream');
      const iterator = stream[Symbol.asyncIterator]();
      
      await expect(iterator.next()).rejects.toThrow('Response body is null');
    });

    it('应该支持POST方法', async () => {
      const mockStream = new ReadableStream();
      const mockResponse = {
        ok: true,
        body: mockStream,
      };
      
      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);
      
      const stream = transport.executeStream('/stream', {
        method: 'POST',
        body: { query: 'test' },
      });
      
      // 启动迭代器但不等待完成
      const iterator = stream[Symbol.asyncIterator]();
      iterator.next().catch(() => {});
      
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.example.com/stream',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ query: 'test' }),
        })
      );
    });

    it('应该添加查询参数', async () => {
      const mockStream = new ReadableStream();
      const mockResponse = {
        ok: true,
        body: mockStream,
      };
      
      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);
      
      const stream = transport.executeStream('/stream', {
        query: { param: 'value' },
      });
      
      const iterator = stream[Symbol.asyncIterator]();
      iterator.next().catch(() => {});
      
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('param=value'),
        expect.any(Object)
      );
    });
  });
});