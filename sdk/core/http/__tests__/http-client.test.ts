/**
 * HTTP客户端单元测试
 */

import { HttpClient } from '../http-client';
import { TimeoutError, NetworkError, RateLimitError, CircuitBreakerOpenError, HttpError } from '../../../types/errors';

// Mock fetch
global.fetch = jest.fn();

describe('HttpClient', () => {
  let client: HttpClient;

  beforeEach(() => {
    client = new HttpClient({
      baseURL: 'https://api.example.com',
      timeout: 5000,
      maxRetries: 2,
      retryDelay: 100,
    });
    jest.clearAllMocks();
  });

  describe('构造函数', () => {
    it('应该使用默认配置创建客户端', () => {
      const defaultClient = new HttpClient();
      expect(defaultClient).toBeDefined();
    });

    it('应该使用自定义配置创建客户端', () => {
      const customClient = new HttpClient({
        baseURL: 'https://api.example.com',
        timeout: 10000,
        maxRetries: 5,
        retryDelay: 2000,
        enableCircuitBreaker: true,
        enableRateLimiter: true,
      });
      expect(customClient).toBeDefined();
    });

    it('应该启用熔断器', () => {
      const clientWithBreaker = new HttpClient({
        enableCircuitBreaker: true,
        circuitBreakerFailureThreshold: 3,
      });
      expect(clientWithBreaker).toBeDefined();
    });

    it('应该启用限流器', () => {
      const clientWithLimiter = new HttpClient({
        enableRateLimiter: true,
        rateLimiterCapacity: 10,
        rateLimiterRefillRate: 5,
      });
      expect(clientWithLimiter).toBeDefined();
    });
  });

  describe('GET请求', () => {
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
      
      const result = await client.get('/test');
      
      expect(result.data).toEqual({ data: 'test' });
      expect(result.status).toBe(200);
      expect(result.requestId).toBe('req-123');
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

    it('应该支持查询参数', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: jest.fn().mockResolvedValue({}),
      };
      
      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);
      
      await client.get('/test', { query: { page: 1, limit: 10 } });
      
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('page=1&limit=10'),
        expect.any(Object)
      );
    });

    it('应该支持自定义请求头', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: jest.fn().mockResolvedValue({}),
      };
      
      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);
      
      await client.get('/test', { headers: { 'Authorization': 'Bearer token' } });
      
      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer token',
          }),
        })
      );
    });
  });

  describe('POST请求', () => {
    it('应该成功执行POST请求', async () => {
      const mockResponse = {
        ok: true,
        status: 201,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: jest.fn().mockResolvedValue({ id: 1 }),
      };
      
      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);
      
      const result = await client.post('/users', { name: 'John' });
      
      expect(result.data).toEqual({ id: 1 });
      expect(result.status).toBe(201);
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.example.com/users',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ name: 'John' }),
        })
      );
    });

    it('应该支持字符串请求体', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'text/plain' }),
        text: jest.fn().mockResolvedValue('success'),
      };
      
      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);
      
      await client.post('/test', 'plain text');
      
      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: 'plain text',
        })
      );
    });
  });

  describe('PUT请求', () => {
    it('应该成功执行PUT请求', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: jest.fn().mockResolvedValue({ id: 1, name: 'Updated' }),
      };
      
      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);
      
      const result = await client.put('/users/1', { name: 'Updated' });
      
      expect(result.data).toEqual({ id: 1, name: 'Updated' });
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.example.com/users/1',
        expect.objectContaining({
          method: 'PUT',
        })
      );
    });
  });

  describe('DELETE请求', () => {
    it('应该成功执行DELETE请求', async () => {
      const mockResponse = {
        ok: true,
        status: 204,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: jest.fn().mockResolvedValue({}),
      };
      
      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);
      
      const result = await client.delete('/users/1');
      
      expect(result.status).toBe(204);
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.example.com/users/1',
        expect.objectContaining({
          method: 'DELETE',
        })
      );
    });
  });

  describe('错误处理', () => {
    it('应该处理429状态码并抛出RateLimitError', async () => {
      const mockResponse = {
        ok: false,
        status: 429,
        text: jest.fn().mockResolvedValue('Too Many Requests'),
      };
      
      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);
      
      await expect(client.get('/test')).rejects.toThrow(RateLimitError);
    });

    it('应该处理其他HTTP错误', async () => {
      const mockResponse = {
        ok: false,
        status: 404,
        text: jest.fn().mockResolvedValue('Not Found'),
      };
      
      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);
      
      await expect(client.get('/test')).rejects.toThrow(HttpError);
    });

    it('应该处理超时错误', async () => {
      const mockSignal = {
        aborted: false,
      };
      
      const mockController = {
        abort: jest.fn(),
        signal: mockSignal,
      };
      
      global.AbortController = jest.fn().mockImplementation(() => mockController);
      
      (global.fetch as jest.Mock).mockImplementation(() => {
        return new Promise((resolve, reject) => {
          setTimeout(() => {
            mockSignal.aborted = true;
            reject(new Error('AbortError'));
          }, 100);
        });
      });
      
      await expect(client.get('/test')).rejects.toThrow();
    });

    it('应该重试可重试的错误', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: jest.fn().mockResolvedValue({ data: 'success' }),
      };
      
      (global.fetch as jest.Mock)
        .mockRejectedValueOnce(new TimeoutError('Timeout', 5000))
        .mockRejectedValueOnce(new TimeoutError('Timeout', 5000))
        .mockResolvedValue(mockResponse);
      
      const result = await client.get('/test');
      
      expect(result.data).toEqual({ data: 'success' });
      expect(global.fetch).toHaveBeenCalledTimes(3);
    });
  });

  describe('流式响应', () => {
    it('应该支持流式响应', async () => {
      const mockBody = new ReadableStream();
      const mockResponse = {
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'text/event-stream' }),
        body: mockBody,
      };
      
      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);
      
      const result = await client.get('/stream', { stream: true });
      
      expect(result.data).toBe(mockBody);
      expect(result.status).toBe(200);
    });
  });

  describe('熔断器', () => {
    it('应该在熔断器打开时拒绝请求', async () => {
      const clientWithBreaker = new HttpClient({
        enableCircuitBreaker: true,
        circuitBreakerFailureThreshold: 2,
        maxRetries: 0,
      });
      
      const mockResponse = {
        ok: false,
        status: 500,
        text: jest.fn().mockResolvedValue('Internal Server Error'),
      };
      
      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);
      
      // 触发熔断器打开
      await expect(clientWithBreaker.get('/test')).rejects.toThrow();
      await expect(clientWithBreaker.get('/test')).rejects.toThrow();
      
      // 熔断器打开后应该拒绝请求
      await expect(clientWithBreaker.get('/test')).rejects.toThrow(CircuitBreakerOpenError);
    });

    it('应该在熔断器打开时记录失败', async () => {
      const clientWithBreaker = new HttpClient({
        enableCircuitBreaker: true,
        circuitBreakerFailureThreshold: 2,
        maxRetries: 0,
      });
      
      const mockResponse = {
        ok: false,
        status: 500,
        text: jest.fn().mockResolvedValue('Internal Server Error'),
      };
      
      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);
      
      await expect(clientWithBreaker.get('/test')).rejects.toThrow();
      await expect(clientWithBreaker.get('/test')).rejects.toThrow();
      
      // 熔断器应该打开
      await expect(clientWithBreaker.get('/test')).rejects.toThrow(CircuitBreakerOpenError);
    });
  });

  describe('限流器', () => {
    it('应该限制请求速率', async () => {
      const clientWithLimiter = new HttpClient({
        enableRateLimiter: true,
        rateLimiterCapacity: 2,
        rateLimiterRefillRate: 10,
      });
      
      const mockResponse = {
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: jest.fn().mockResolvedValue({}),
      };
      
      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);
      
      // 快速发送3个请求
      const startTime = Date.now();
      await clientWithLimiter.get('/test');
      await clientWithLimiter.get('/test');
      await clientWithLimiter.get('/test');
      const endTime = Date.now();
      
      // 第三个请求应该等待
      expect(endTime - startTime).toBeGreaterThanOrEqual(50);
    });
  });

  describe('URL构建', () => {
    it('应该正确构建完整URL', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: jest.fn().mockResolvedValue({}),
      };
      
      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);
      
      await client.get('/api/users');
      
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
      
      await client.get('https://other-api.com/test');
      
      expect(global.fetch).toHaveBeenCalledWith(
        'https://other-api.com/test',
        expect.any(Object)
      );
    });

    it('应该正确编码查询参数', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: jest.fn().mockResolvedValue({}),
      };
      
      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);
      
      await client.get('/test', { query: { search: 'hello world', page: 1 } });
      
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('search=hello%20world'),
        expect.any(Object)
      );
    });
  });

  describe('响应处理', () => {
    it('应该解析JSON响应', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: jest.fn().mockResolvedValue({ key: 'value' }),
      };
      
      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);
      
      const result = await client.get('/test');
      
      expect(result.data).toEqual({ key: 'value' });
    });

    it('应该解析文本响应', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'text/plain' }),
        text: jest.fn().mockResolvedValue('plain text'),
      };
      
      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);
      
      const result = await client.get('/test');
      
      expect(result.data).toBe('plain text');
    });

    it('应该提取请求ID', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        headers: new Headers({
          'content-type': 'application/json',
          'x-request-id': 'req-123',
        }),
        json: jest.fn().mockResolvedValue({}),
      };
      
      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);
      
      const result = await client.get('/test');
      
      expect(result.requestId).toBe('req-123');
    });

    it('应该转换响应头为对象', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        headers: new Headers({
          'content-type': 'application/json',
          'x-custom-header': 'custom-value',
        }),
        json: jest.fn().mockResolvedValue({}),
      };
      
      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);
      
      const result = await client.get('/test');
      
      expect(result.headers).toEqual({
        'content-type': 'application/json',
        'x-custom-header': 'custom-value',
      });
    });
  });

  describe('自定义超时', () => {
    it('应该支持请求级别的超时配置', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: jest.fn().mockResolvedValue({}),
      };
      
      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);
      
      await client.get('/test', { timeout: 10000 });
      
      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          signal: expect.any(Object),
        })
      );
    });
  });
});