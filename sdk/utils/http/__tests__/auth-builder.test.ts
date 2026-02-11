/**
 * auth-builder 单元测试
 */

import { describe, it, expect } from '@jest/globals';
import { buildAuthHeaders, mergeAuthHeaders } from '../auth-builder';
import { LLMProvider } from '@modular-agent/types/llm';

describe('auth-builder', () => {
  describe('buildAuthHeaders', () => {
    it('应该为 OpenAI Chat 构建正确的认证头', () => {
      const result = buildAuthHeaders(LLMProvider.OPENAI_CHAT, 'test-api-key');
      expect(result).toEqual({
        'Authorization': 'Bearer test-api-key'
      });
    });

    it('应该为 OpenAI Response 构建正确的认证头', () => {
      const result = buildAuthHeaders(LLMProvider.OPENAI_RESPONSE, 'test-api-key');
      expect(result).toEqual({
        'Authorization': 'Bearer test-api-key'
      });
    });

    it('应该为 Anthropic 构建正确的认证头', () => {
      const result = buildAuthHeaders(LLMProvider.ANTHROPIC, 'test-api-key');
      expect(result).toEqual({
        'x-api-key': 'test-api-key'
      });
    });

    it('应该为 Gemini Native 构建正确的认证头', () => {
      const result = buildAuthHeaders(LLMProvider.GEMINI_NATIVE, 'test-api-key');
      expect(result).toEqual({
        'x-goog-api-key': 'test-api-key'
      });
    });

    it('应该为 Gemini OpenAI 构建正确的认证头', () => {
      const result = buildAuthHeaders(LLMProvider.GEMINI_OPENAI, 'test-api-key');
      expect(result).toEqual({
        'Authorization': 'Bearer test-api-key'
      });
    });

    it('应该为 Human Relay 返回空对象', () => {
      const result = buildAuthHeaders(LLMProvider.HUMAN_RELAY, 'test-api-key');
      expect(result).toEqual({});
    });

    it('应该处理包含特殊字符的 API Key', () => {
      const apiKey = 'sk-test-123!@#$%^&*()';
      const result = buildAuthHeaders(LLMProvider.OPENAI_CHAT, apiKey);
      expect(result).toEqual({
        'Authorization': `Bearer ${apiKey}`
      });
    });

    it('应该处理空字符串 API Key', () => {
      const result = buildAuthHeaders(LLMProvider.OPENAI_CHAT, '');
      expect(result).toEqual({
        'Authorization': 'Bearer '
      });
    });
  });

  describe('mergeAuthHeaders', () => {
    it('应该合并认证头和自定义头', () => {
      const authHeaders = { 'Authorization': 'Bearer test-key' };
      const customHeaders = { 'X-Custom': 'custom-value' };
      const result = mergeAuthHeaders(authHeaders, customHeaders);
      expect(result).toEqual({
        'Authorization': 'Bearer test-key',
        'X-Custom': 'custom-value'
      });
    });

    it('应该只返回认证头当没有自定义头时', () => {
      const authHeaders = { 'Authorization': 'Bearer test-key' };
      const result = mergeAuthHeaders(authHeaders);
      expect(result).toEqual(authHeaders);
    });

    it('应该处理空认证头', () => {
      const authHeaders = {};
      const customHeaders = { 'X-Custom': 'custom-value' };
      const result = mergeAuthHeaders(authHeaders, customHeaders);
      expect(result).toEqual({
        'X-Custom': 'custom-value'
      });
    });

    it('应该处理空自定义头', () => {
      const authHeaders = { 'Authorization': 'Bearer test-key' };
      const customHeaders = {};
      const result = mergeAuthHeaders(authHeaders, customHeaders);
      expect(result).toEqual(authHeaders);
    });

    it('应该处理 undefined 自定义头', () => {
      const authHeaders = { 'Authorization': 'Bearer test-key' };
      const result = mergeAuthHeaders(authHeaders, undefined);
      expect(result).toEqual(authHeaders);
    });

    it('应该允许自定义头覆盖认证头', () => {
      const authHeaders = { 'Authorization': 'Bearer test-key' };
      const customHeaders = { 'Authorization': 'Bearer new-key' };
      const result = mergeAuthHeaders(authHeaders, customHeaders);
      expect(result).toEqual({
        'Authorization': 'Bearer new-key'
      });
    });

    it('应该合并多个自定义头', () => {
      const authHeaders = { 'Authorization': 'Bearer test-key' };
      const customHeaders = {
        'X-Custom-1': 'value1',
        'X-Custom-2': 'value2',
        'X-Custom-3': 'value3'
      };
      const result = mergeAuthHeaders(authHeaders, customHeaders);
      expect(result).toEqual({
        'Authorization': 'Bearer test-key',
        'X-Custom-1': 'value1',
        'X-Custom-2': 'value2',
        'X-Custom-3': 'value3'
      });
    });
  });
});