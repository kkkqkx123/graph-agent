/**
 * APIPromise 单元测试
 */

import { APIPromise, APIResponseProps } from '../api-promise';

describe('APIPromise', () => {
  describe('延迟解析', () => {
    it('应该只在调用 then 时才解析响应', async () => {
      let parseCalled = false;
      const mockResponse: APIResponseProps<{ data: string }> = {
        response: new Response(),
        data: { data: 'test' },
        requestId: 'test-id',
      };

      const promise = new APIPromise(
        Promise.resolve(mockResponse),
        () => {
          parseCalled = true;
          return { data: 'test', _requestId: 'test-id' };
        }
      );

      // 此时还没有解析
      expect(parseCalled).toBe(false);

      // 调用 then 触发解析
      await promise.then((data) => data);

      // 现在应该已经解析
      expect(parseCalled).toBe(true);
    });

    it('应该只解析一次', async () => {
      let parseCount = 0;
      const mockResponse: APIResponseProps<{ data: string }> = {
        response: new Response(),
        data: { data: 'test' },
        requestId: 'test-id',
      };

      const promise = new APIPromise(
        Promise.resolve(mockResponse),
        () => {
          parseCount++;
          return { data: 'test', _requestId: 'test-id' };
        }
      );

      // 多次调用 then
      await promise.then((data) => data);
      await promise.then((data) => data);
      await promise.then((data) => data);

      // 应该只解析一次
      expect(parseCount).toBe(1);
    });
  });

  describe('asResponse', () => {
    it('应该返回原始 Response 对象', async () => {
      const mockResponse = new Response('{"data":"test"}', {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });

      const promise = new APIPromise(
        Promise.resolve({
          response: mockResponse,
          data: { data: 'test' },
          requestId: 'test-id',
        })
      );

      const response = await promise.asResponse();

      expect(response).toBe(mockResponse);
      expect(response.status).toBe(200);
    });
  });

  describe('withResponse', () => {
    it('应该同时返回数据和响应', async () => {
      const mockResponse = new Response('{"data":"test"}', {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });

      const promise = new APIPromise(
        Promise.resolve({
          response: mockResponse,
          data: { data: 'test' },
          requestId: 'test-id',
        })
      );

      const result = await promise.withResponse();

      expect(result.data).toEqual({ data: 'test', _requestId: 'test-id' });
      expect(result.response).toBe(mockResponse);
      expect(result.requestId).toBe('test-id');
    });
  });

  describe('_thenUnwrap', () => {
    it('应该支持链式转换', async () => {
      const mockResponse: APIResponseProps<{ data: string }> = {
        response: new Response(),
        data: { data: 'test' },
        requestId: 'test-id',
      };

      const promise = new APIPromise(
        Promise.resolve(mockResponse),
        (props) => ({ data: 'test', _requestId: props.requestId })
      );

      const transformed = promise._thenUnwrap((data, props) => ({
        transformed: data.data,
        original: props.data,
      }));

      const result = await transformed;

      expect(result).toEqual({
        transformed: 'test',
        original: { data: 'test' },
        _requestId: 'test-id',
      });
    });
  });

  describe('Promise 方法', () => {
    it('应该支持 then 方法', async () => {
      const mockResponse: APIResponseProps<{ data: string }> = {
        response: new Response(),
        data: { data: 'test' },
        requestId: 'test-id',
      };

      const promise = new APIPromise(Promise.resolve(mockResponse));

      const result = await promise.then((data) => data.data);

      expect(result).toBe('test');
    });

    it('应该支持 catch 方法', async () => {
      const promise = new APIPromise(Promise.reject(new Error('test error')));

      let caught = false;
      await promise.catch((error) => {
        caught = true;
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toBe('test error');
      });

      expect(caught).toBe(true);
    });

    it('应该支持 finally 方法', async () => {
      const mockResponse: APIResponseProps<{ data: string }> = {
        response: new Response(),
        data: { data: 'test' },
        requestId: 'test-id',
      };

      let finallyCalled = false;
      const promise = new APIPromise(Promise.resolve(mockResponse));

      await promise.finally(() => {
        finallyCalled = true;
      });

      expect(finallyCalled).toBe(true);
    });
  });

  describe('默认解析函数', () => {
    it('应该使用默认解析函数', async () => {
      const mockResponse: APIResponseProps<{ data: string }> = {
        response: new Response(),
        data: { data: 'test' },
        requestId: 'test-id',
      };

      const promise = new APIPromise(Promise.resolve(mockResponse));

      const result = await promise;

      expect(result).toEqual({ data: 'test', _requestId: 'test-id' });
    });

    it('应该在没有 requestId 时不添加 _requestId', async () => {
      const mockResponse: APIResponseProps<{ data: string }> = {
        response: new Response(),
        data: { data: 'test' },
      };

      const promise = new APIPromise(Promise.resolve(mockResponse));

      const result = await promise;

      expect(result).toEqual({ data: 'test' });
      expect(result._requestId).toBeUndefined();
    });
  });
});