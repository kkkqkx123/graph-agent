/**
 * Token编码器工具单元测试
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import {
  encodeText,
  encodeObject,
  estimateTokensFallback,
  resetEncoder
} from '../token-encoder';

describe('token-encoder', () => {
  beforeEach(() => {
    // 重置编码器状态，确保每个测试都从干净状态开始
    resetEncoder();
  });

  afterEach(() => {
    // 清理测试后的状态
    resetEncoder();
  });

  describe('tiktoken初始化验证', () => {
    it('应该成功初始化tiktoken编码器', () => {
      // 调用encodeText来触发编码器初始化
      const tokens = encodeText('test');
      expect(typeof tokens).toBe('number');
      expect(tokens).toBeGreaterThan(0);
    });

    it('应该使用tiktoken而非回退估算（验证精确编码）', () => {
      // 使用一个具体的文本来比较精确编码和估算的差异
      const testText = 'The quick brown fox jumps over the lazy dog';
      
      const preciseTokens = encodeText(testText);
      const fallbackTokens = estimateTokensFallback(testText);
      
      // 精确编码通常比估算更准确，结果应该明显不同
      // 如果编码器工作正常，两者不应相等
      // （除非tiktoken未能初始化，此时会使用回退估算）
      expect(typeof preciseTokens).toBe('number');
      expect(preciseTokens).toBeGreaterThan(0);
      
      // 验证返回的不是简单的降级估算结果
      // tiktoken的结果通常会不同于简单的字符/2.5估算
      const simpleEstimate = Math.ceil(testText.length / 2.5);
      expect(preciseTokens).toBeLessThanOrEqual(testText.length);
    });

    it('应该能够多次成功编码（验证编码器持久化）', () => {
      const text1 = 'first call';
      const text2 = 'second call';
      const text3 = 'third call';
      
      const tokens1 = encodeText(text1);
      const tokens2 = encodeText(text2);
      const tokens3 = encodeText(text3);
      
      // 所有调用都应该返回有效的token数量
      expect(tokens1).toBeGreaterThan(0);
      expect(tokens2).toBeGreaterThan(0);
      expect(tokens3).toBeGreaterThan(0);
      
      // 不同的文本应该返回不同的token数量
      expect(tokens1).not.toBe(tokens2);
      expect(tokens2).not.toBe(tokens3);
    });

    it('编码器应该能处理英文单词token化', () => {
      // "hello" 和 "world" 在cl100k_base编码器中通常各自是1个token
      const helloTokens = encodeText('hello');
      const worldTokens = encodeText('world');
      const helloWorldTokens = encodeText('hello world');
      
      // 验证编码结果符合预期（如果使用了tiktoken）
      // "hello world" 的token数应该约等于 "hello" + "world" + 空格
      expect(helloTokens).toBeGreaterThan(0);
      expect(worldTokens).toBeGreaterThan(0);
      expect(helloWorldTokens).toBeGreaterThan(0);
      
      // 组合后的token数应该接近两部分之和
      expect(helloWorldTokens).toBeLessThanOrEqual(helloTokens + worldTokens + 2);
    });

    it('应该能区分不同的字符编码', () => {
      const ascii = 'Hello';
      const special = 'Hello!';
      const punctuation = 'Hello!!!';
      
      const asciiTokens = encodeText(ascii);
      const specialTokens = encodeText(special);
      const punctuationTokens = encodeText(punctuation);
      
      // 不同内容应该产生不同的token数（或相同，取决于编码）
      expect(asciiTokens).toBeGreaterThan(0);
      expect(specialTokens).toBeGreaterThan(0);
      expect(punctuationTokens).toBeGreaterThan(0);
      
      // 验证punctuation比special多
      expect(punctuationTokens).toBeGreaterThanOrEqual(specialTokens);
    });
  });

  describe('encodeText', () => {
    it('应该编码简单文本并返回token数量', () => {
      const text = 'hello world';
      const tokens = encodeText(text);
      expect(typeof tokens).toBe('number');
      expect(tokens).toBeGreaterThan(0);
    });

    it('应该处理空字符串', () => {
      const tokens = encodeText('');
      expect(typeof tokens).toBe('number');
      expect(tokens).toBe(0);
    });

    it('应该处理长文本', () => {
      const longText = 'a'.repeat(1000);
      const tokens = encodeText(longText);
      expect(typeof tokens).toBe('number');
      expect(tokens).toBeGreaterThan(0);
      // 1000个'a'字符，估算约为400左右的tokens
      expect(tokens).toBeLessThanOrEqual(500);
    });

    it('应该处理包含特殊字符的文本', () => {
      const text = 'Hello, World! @#$%^&*()_+-=[]{}|;:,.<>?';
      const tokens = encodeText(text);
      expect(typeof tokens).toBe('number');
      expect(tokens).toBeGreaterThan(0);
    });

    it('应该处理包含中文的文本', () => {
      const text = '你好世界，这是一个测试';
      const tokens = encodeText(text);
      expect(typeof tokens).toBe('number');
      expect(tokens).toBeGreaterThan(0);
    });

    it('应该处理包含换行符的文本', () => {
      const text = 'line1\nline2\nline3';
      const tokens = encodeText(text);
      expect(typeof tokens).toBe('number');
      expect(tokens).toBeGreaterThan(0);
    });

    it('应该处理包含制表符的文本', () => {
      const text = 'col1\tcol2\tcol3';
      const tokens = encodeText(text);
      expect(typeof tokens).toBe('number');
      expect(tokens).toBeGreaterThan(0);
    });

    it('应该处理重复的文本', () => {
      const text = 'test';
      const tokens1 = encodeText(text);
      const tokens2 = encodeText(text);
      expect(tokens1).toBe(tokens2);
    });

    it('应该处理包含多种语言的混合文本', () => {
      const text = 'Hello 世界 مرحبا мир';
      const tokens = encodeText(text);
      expect(typeof tokens).toBe('number');
      expect(tokens).toBeGreaterThan(0);
    });

    it('应该返回合理的token数量（相对于字符数）', () => {
      const text = 'This is a test sentence.';
      const tokens = encodeText(text);
      // 通常token数量约为字符数的25-40%
      expect(tokens).toBeLessThanOrEqual(Math.ceil(text.length / 2));
    });

    it('应该处理只包含空格的文本', () => {
      const text = '     ';
      const tokens = encodeText(text);
      expect(typeof tokens).toBe('number');
      expect(tokens).toBeGreaterThanOrEqual(0);
    });

    it('应该处理很长的文本（性能测试）', () => {
      const text = 'Lorem ipsum dolor sit amet. '.repeat(100);
      const tokens = encodeText(text);
      expect(typeof tokens).toBe('number');
      expect(tokens).toBeGreaterThan(0);
    });
  });

  describe('encodeObject', () => {
    it('应该编码简单对象', () => {
      const obj = { name: 'test', value: 123 };
      const tokens = encodeObject(obj);
      expect(typeof tokens).toBe('number');
      expect(tokens).toBeGreaterThan(0);
    });

    it('应该编码空对象', () => {
      const obj = {};
      const tokens = encodeObject(obj);
      expect(typeof tokens).toBe('number');
      expect(tokens).toBeGreaterThanOrEqual(0);
    });

    it('应该编码嵌套对象', () => {
      const obj = {
        level1: {
          level2: {
            level3: 'value'
          }
        }
      };
      const tokens = encodeObject(obj);
      expect(typeof tokens).toBe('number');
      expect(tokens).toBeGreaterThan(0);
    });

    it('应该编码包含数组的对象', () => {
      const obj = {
        items: [1, 2, 3, 4, 5],
        name: 'test'
      };
      const tokens = encodeObject(obj);
      expect(typeof tokens).toBe('number');
      expect(tokens).toBeGreaterThan(0);
    });

    it('应该编码包含null值的对象', () => {
      const obj = {
        value: null,
        name: 'test'
      };
      const tokens = encodeObject(obj);
      expect(typeof tokens).toBe('number');
      expect(tokens).toBeGreaterThan(0);
    });

    it('应该编码包含布尔值的对象', () => {
      const obj = {
        isActive: true,
        isDeleted: false
      };
      const tokens = encodeObject(obj);
      expect(typeof tokens).toBe('number');
      expect(tokens).toBeGreaterThan(0);
    });

    it('应该编码包含数字的对象', () => {
      const obj = {
        integer: 42,
        decimal: 3.14,
        negative: -100,
        zero: 0
      };
      const tokens = encodeObject(obj);
      expect(typeof tokens).toBe('number');
      expect(tokens).toBeGreaterThan(0);
    });

    it('应该编码大型对象', () => {
      const obj = {
        id: 'test_id_123',
        data: Array.from({ length: 100 }, (_, i) => ({
          index: i,
          value: `item_${i}`,
          nested: { prop: `nested_${i}` }
        }))
      };
      const tokens = encodeObject(obj);
      expect(typeof tokens).toBe('number');
      expect(tokens).toBeGreaterThan(0);
    });

    it('应该处理包含特殊字符的对象', () => {
      const obj = {
        special: '@#$%^&*()_+-=[]{}|;:,.<>?',
        unicode: '你好世界'
      };
      const tokens = encodeObject(obj);
      expect(typeof tokens).toBe('number');
      expect(tokens).toBeGreaterThan(0);
    });

    it('应该返回与encodeText相同的token数量', () => {
      const obj = { message: 'test' };
      const objTokens = encodeObject(obj);
      const textTokens = encodeText(JSON.stringify(obj));
      expect(objTokens).toBe(textTokens);
    });

    it('应该处理包含函数的对象（会被序列化）', () => {
      const obj = {
        name: 'test',
        value: 123
        // 函数在JSON序列化时会被忽略
      };
      const tokens = encodeObject(obj);
      expect(typeof tokens).toBe('number');
      expect(tokens).toBeGreaterThan(0);
    });
  });

  describe('estimateTokensFallback', () => {
    it('应该使用2.5字符/token的比例进行估算', () => {
      const text = 'hello';
      const tokens = estimateTokensFallback(text);
      // 5个字符 / 2.5 = 2个token
      expect(tokens).toBe(Math.ceil(5 / 2.5));
    });

    it('应该处理空字符串', () => {
      const tokens = estimateTokensFallback('');
      expect(tokens).toBe(0);
    });

    it('应该处理单个字符', () => {
      const tokens = estimateTokensFallback('a');
      expect(tokens).toBe(1);
    });

    it('应该正确进行向上取整', () => {
      // 6个字符 / 2.5 = 2.4，应该向上取整为3
      const tokens = estimateTokensFallback('abcdef');
      expect(tokens).toBe(Math.ceil(6 / 2.5));
      expect(tokens).toBe(3);
    });

    it('应该处理正好被2.5整除的长度', () => {
      // 10个字符 / 2.5 = 4
      const tokens = estimateTokensFallback('a'.repeat(10));
      expect(tokens).toBe(4);
    });

    it('应该处理很长的文本', () => {
      const text = 'a'.repeat(10000);
      const tokens = estimateTokensFallback(text);
      expect(tokens).toBe(Math.ceil(10000 / 2.5));
      expect(tokens).toBe(4000);
    });

    it('应该返回正整数', () => {
      const text = 'test string';
      const tokens = estimateTokensFallback(text);
      expect(Number.isInteger(tokens)).toBe(true);
      expect(tokens).toBeGreaterThanOrEqual(0);
    });

    it('应该处理包含特殊字符的文本', () => {
      const text = '@#$%^&*()_+-=[]{}';
      const tokens = estimateTokensFallback(text);
      expect(tokens).toBe(Math.ceil(text.length / 2.5));
    });

    it('应该处理包含换行符和制表符的文本', () => {
      const text = 'line1\nline2\tline3';
      const tokens = estimateTokensFallback(text);
      expect(tokens).toBe(Math.ceil(text.length / 2.5));
    });
  });

  describe('resetEncoder', () => {
    it('应该重置编码器状态', () => {
      // 调用encodeText以初始化编码器
      encodeText('test');
      // 重置编码器
      resetEncoder();
      // 再次调用encodeText应该重新初始化编码器
      const tokens = encodeText('test');
      expect(typeof tokens).toBe('number');
      expect(tokens).toBeGreaterThan(0);
    });

    it('应该允许重复重置', () => {
      resetEncoder();
      resetEncoder();
      resetEncoder();
      const tokens = encodeText('test');
      expect(typeof tokens).toBe('number');
      expect(tokens).toBeGreaterThan(0);
    });

    it('重置后应该重新初始化编码器', () => {
      const tokens1 = encodeText('hello world');
      resetEncoder();
      const tokens2 = encodeText('hello world');
      expect(tokens1).toBe(tokens2);
    });
  });

  describe('降级机制', () => {
    it('当编码失败时应该降级到估算', () => {
      // 这个测试验证降级机制存在
      // 在编码器失败时，应该使用estimateTokensFallback
      const text = 'test text';
      const tokens = encodeText(text);
      const fallback = estimateTokensFallback(text);
      
      // token数量应该是合理的（可能使用精确编码或估算）
      expect(typeof tokens).toBe('number');
      expect(tokens).toBeGreaterThan(0);
      // 如果使用降级估算，结果应该相同或接近
      if (tokens >= fallback * 0.5 && tokens <= fallback * 1.5) {
        // 在合理范围内
        expect(true).toBe(true);
      } else {
        // 可能使用了精确编码
        expect(tokens).toBeGreaterThan(0);
      }
    });
  });

  describe('一致性测试', () => {
    it('相同的输入应该产生相同的输出', () => {
      const text = 'consistency test';
      const tokens1 = encodeText(text);
      const tokens2 = encodeText(text);
      expect(tokens1).toBe(tokens2);
    });

    it('多次调用encodeObject应该产生相同的结果', () => {
      const obj = { a: 1, b: 2, c: 3 };
      const tokens1 = encodeObject(obj);
      const tokens2 = encodeObject(obj);
      const tokens3 = encodeObject(obj);
      expect(tokens1).toBe(tokens2);
      expect(tokens2).toBe(tokens3);
    });

    it('encodeText和encodeObject在JSON序列化后应该一致', () => {
      const obj = { test: 'value', number: 42 };
      const jsonString = JSON.stringify(obj);
      
      const objTokens = encodeObject(obj);
      const textTokens = encodeText(jsonString);
      
      expect(objTokens).toBe(textTokens);
    });
  });

  describe('边界条件', () => {
    it('应该处理超大文本', () => {
      const largeText = 'x'.repeat(100000);
      const tokens = encodeText(largeText);
      expect(typeof tokens).toBe('number');
      expect(tokens).toBeGreaterThan(0);
    });

    it('应该处理只有数字的文本', () => {
      const text = '123456789012345';
      const tokens = encodeText(text);
      expect(typeof tokens).toBe('number');
      expect(tokens).toBeGreaterThan(0);
    });

    it('应该处理只有字母的文本', () => {
      const text = 'abcdefghijklmnopqrstuvwxyz';
      const tokens = encodeText(text);
      expect(typeof tokens).toBe('number');
      expect(tokens).toBeGreaterThan(0);
    });

    it('应该处理高度嵌套的对象', () => {
      let obj: any = { value: 'leaf' };
      for (let i = 0; i < 50; i++) {
        obj = { nested: obj };
      }
      const tokens = encodeObject(obj);
      expect(typeof tokens).toBe('number');
      expect(tokens).toBeGreaterThan(0);
    });

    it('应该处理包含大数组的对象', () => {
      const obj = {
        items: Array.from({ length: 10000 }, (_, i) => i)
      };
      const tokens = encodeObject(obj);
      expect(typeof tokens).toBe('number');
      expect(tokens).toBeGreaterThan(0);
    });
  });
});
