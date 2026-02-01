/**
 * 时间戳工具函数单元测试
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import {
  now,
  timestampFromDate,
  timestampToDate,
  timestampToISOString,
  nowWithTimezone,
  diffTimestamp,
  formatDuration
} from '../timestamp-utils';

describe('timestamp-utils', () => {
  describe('now', () => {
    it('应该返回当前时间戳', () => {
      const timestamp = now();
      expect(typeof timestamp).toBe('number');
      expect(timestamp).toBeGreaterThan(0);
    });

    it('应该返回接近Date.now()的值', () => {
      const timestamp = now();
      const dateNow = Date.now();
      const diff = Math.abs(timestamp - dateNow);
      expect(diff).toBeLessThan(100); // 差异应该小于100毫秒
    });

    it('多次调用应该返回递增的值', () => {
      const timestamp1 = now();
      const timestamp2 = now();
      expect(timestamp2).toBeGreaterThanOrEqual(timestamp1);
    });
  });

  describe('timestampFromDate', () => {
    it('应该从Date对象创建时间戳', () => {
      const date = new Date('2024-01-01T00:00:00.000Z');
      const timestamp = timestampFromDate(date);
      expect(timestamp).toBe(date.getTime());
    });

    it('应该处理当前日期', () => {
      const date = new Date();
      const timestamp = timestampFromDate(date);
      expect(timestamp).toBe(date.getTime());
    });

    it('应该处理过去日期', () => {
      const date = new Date('2000-01-01T00:00:00.000Z');
      const timestamp = timestampFromDate(date);
      expect(timestamp).toBe(date.getTime());
    });

    it('应该处理未来日期', () => {
      const date = new Date('2030-01-01T00:00:00.000Z');
      const timestamp = timestampFromDate(date);
      expect(timestamp).toBe(date.getTime());
    });
  });

  describe('timestampToDate', () => {
    it('应该将时间戳转换为Date对象', () => {
      const timestamp = 1704067200000; // 2024-01-01T00:00:00.000Z
      const date = timestampToDate(timestamp);
      expect(date).toBeInstanceOf(Date);
      expect(date.getTime()).toBe(timestamp);
    });

    it('应该转换当前时间戳', () => {
      const timestamp = now();
      const date = timestampToDate(timestamp);
      expect(date.getTime()).toBe(timestamp);
    });

    it('应该转换过去时间戳', () => {
      const timestamp = 946684800000; // 2000-01-01T00:00:00.000Z
      const date = timestampToDate(timestamp);
      expect(date.getTime()).toBe(timestamp);
    });

    it('应该转换未来时间戳', () => {
      const timestamp = 1893456000000; // 2030-01-01T00:00:00.000Z
      const date = timestampToDate(timestamp);
      expect(date.getTime()).toBe(timestamp);
    });
  });

  describe('timestampToISOString', () => {
    it('应该将时间戳转换为ISO字符串', () => {
      const timestamp = 1704067200000; // 2024-01-01T00:00:00.000Z
      const isoString = timestampToISOString(timestamp);
      expect(isoString).toBe('2024-01-01T00:00:00.000Z');
    });

    it('应该返回有效的ISO格式字符串', () => {
      const timestamp = now();
      const isoString = timestampToISOString(timestamp);
      expect(typeof isoString).toBe('string');
      expect(isoString).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });

    it('应该与Date.toISOString()返回相同的结果', () => {
      const timestamp = now();
      const isoString = timestampToISOString(timestamp);
      const dateIsoString = new Date(timestamp).toISOString();
      expect(isoString).toBe(dateIsoString);
    });
  });

  describe('nowWithTimezone', () => {
    it('应该返回包含时间戳和时区的对象', () => {
      const result = nowWithTimezone();
      expect(result).toHaveProperty('timestamp');
      expect(result).toHaveProperty('timezone');
      expect(typeof result.timestamp).toBe('number');
      expect(typeof result.timezone).toBe('string');
    });

    it('时间戳应该是有效的', () => {
      const result = nowWithTimezone();
      expect(result.timestamp).toBeGreaterThan(0);
      expect(result.timestamp).toBeLessThanOrEqual(Date.now());
    });

    it('时区应该是有效的时区字符串', () => {
      const result = nowWithTimezone();
      expect(result.timezone.length).toBeGreaterThan(0);
      // 常见时区格式示例
      expect(result.timezone).toMatch(/^[A-Za-z\/]+$/);
    });

    it('多次调用应该返回不同的时间戳', () => {
      const result1 = nowWithTimezone();
      const result2 = nowWithTimezone();
      expect(result2.timestamp).toBeGreaterThanOrEqual(result1.timestamp);
    });
  });

  describe('diffTimestamp', () => {
    it('应该计算两个时间戳之间的差值', () => {
      const start = 1000;
      const end = 2000;
      const diff = diffTimestamp(start, end);
      expect(diff).toBe(1000);
    });

    it('应该处理end小于start的情况', () => {
      const start = 2000;
      const end = 1000;
      const diff = diffTimestamp(start, end);
      expect(diff).toBe(-1000);
    });

    it('应该处理相同的时间戳', () => {
      const timestamp = 1000;
      const diff = diffTimestamp(timestamp, timestamp);
      expect(diff).toBe(0);
    });

    it('应该处理实际时间戳', () => {
      const start = now();
      // 等待10毫秒
      const end = start + 10;
      const diff = diffTimestamp(start, end);
      expect(diff).toBe(10);
    });

    it('应该处理大时间差', () => {
      const start = 0;
      const end = 86400000; // 一天的毫秒数
      const diff = diffTimestamp(start, end);
      expect(diff).toBe(86400000);
    });
  });

  describe('formatDuration', () => {
    it('应该格式化毫秒级持续时间', () => {
      expect(formatDuration(500)).toBe('500ms');
      expect(formatDuration(999)).toBe('999ms');
    });

    it('应该格式化秒级持续时间', () => {
      expect(formatDuration(1000)).toBe('1.00s');
      expect(formatDuration(1500)).toBe('1.50s');
      expect(formatDuration(59900)).toBe('59.90s');
    });

    it('应该格式化分钟级持续时间', () => {
      expect(formatDuration(60000)).toBe('1.00min');
      expect(formatDuration(90000)).toBe('1.50min');
      expect(formatDuration(3599000)).toBe('59.98min');
    });

    it('应该格式化小时级持续时间', () => {
      expect(formatDuration(3600000)).toBe('1.00h');
      expect(formatDuration(5400000)).toBe('1.50h');
      expect(formatDuration(7200000)).toBe('2.00h');
    });

    it('应该处理0毫秒', () => {
      expect(formatDuration(0)).toBe('0ms');
    });

    it('应该处理边界值', () => {
      expect(formatDuration(999)).toBe('999ms');
      expect(formatDuration(1000)).toBe('1.00s');
      expect(formatDuration(59900)).toBe('59.90s');
      expect(formatDuration(60000)).toBe('1.00min');
      expect(formatDuration(3599000)).toBe('59.98min');
      expect(formatDuration(3600000)).toBe('1.00h');
    });

    it('应该处理非常大的持续时间', () => {
      expect(formatDuration(86400000)).toBe('24.00h'); // 一天
      expect(formatDuration(172800000)).toBe('48.00h'); // 两天
    });

    it('应该保留两位小数', () => {
      expect(formatDuration(1234)).toBe('1.23s');
      expect(formatDuration(123456)).toBe('2.06min');
      expect(formatDuration(3600000)).toBe('1.00h');
      expect(formatDuration(5400000)).toBe('1.50h');
    });
  });
});