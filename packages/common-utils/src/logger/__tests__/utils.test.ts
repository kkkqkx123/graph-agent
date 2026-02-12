/**
 * Logger工具函数单元测试
 */

import {
  shouldLog,
  formatTimestamp,
  mergeContext,
  createLogEntry
} from '../utils';
import { LOG_LEVEL_PRIORITY } from '../types';

describe('shouldLog', () => {
  it('应该在当前级别为debug时输出所有级别', () => {
    expect(shouldLog('debug', 'debug')).toBe(true);
    expect(shouldLog('debug', 'info')).toBe(true);
    expect(shouldLog('debug', 'warn')).toBe(true);
    expect(shouldLog('debug', 'error')).toBe(true);
  });

  it('应该在当前级别为info时输出info及以上级别', () => {
    expect(shouldLog('info', 'debug')).toBe(false);
    expect(shouldLog('info', 'info')).toBe(true);
    expect(shouldLog('info', 'warn')).toBe(true);
    expect(shouldLog('info', 'error')).toBe(true);
  });

  it('应该在当前级别为warn时输出warn及以上级别', () => {
    expect(shouldLog('warn', 'debug')).toBe(false);
    expect(shouldLog('warn', 'info')).toBe(false);
    expect(shouldLog('warn', 'warn')).toBe(true);
    expect(shouldLog('warn', 'error')).toBe(true);
  });

  it('应该在当前级别为error时只输出error级别', () => {
    expect(shouldLog('error', 'debug')).toBe(false);
    expect(shouldLog('error', 'info')).toBe(false);
    expect(shouldLog('error', 'warn')).toBe(false);
    expect(shouldLog('error', 'error')).toBe(true);
  });

  it('应该在当前级别为off时不输出任何级别', () => {
    expect(shouldLog('off', 'debug')).toBe(false);
    expect(shouldLog('off', 'info')).toBe(false);
    expect(shouldLog('off', 'warn')).toBe(false);
    expect(shouldLog('off', 'error')).toBe(false);
  });

  it('应该基于LOG_LEVEL_PRIORITY正确比较', () => {
    // 验证优先级顺序
    expect(LOG_LEVEL_PRIORITY.debug).toBe(0);
    expect(LOG_LEVEL_PRIORITY.info).toBe(1);
    expect(LOG_LEVEL_PRIORITY.warn).toBe(2);
    expect(LOG_LEVEL_PRIORITY.error).toBe(3);
    expect(LOG_LEVEL_PRIORITY.off).toBe(4);

    // 验证比较逻辑
    expect(LOG_LEVEL_PRIORITY.debug >= LOG_LEVEL_PRIORITY.debug).toBe(true);
    expect(LOG_LEVEL_PRIORITY.info >= LOG_LEVEL_PRIORITY.debug).toBe(true);
    expect(LOG_LEVEL_PRIORITY.warn >= LOG_LEVEL_PRIORITY.info).toBe(true);
    expect(LOG_LEVEL_PRIORITY.error >= LOG_LEVEL_PRIORITY.warn).toBe(true);
  });
});

describe('formatTimestamp', () => {
  it('应该返回ISO格式的时间戳', () => {
    const timestamp = formatTimestamp();
    expect(timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
  });

  it('应该返回当前时间', () => {
    const before = new Date();
    const timestamp = formatTimestamp();
    const after = new Date();

    const timestampDate = new Date(timestamp);
    expect(timestampDate.getTime()).toBeGreaterThanOrEqual(before.getTime());
    expect(timestampDate.getTime()).toBeLessThanOrEqual(after.getTime());
  });

  it('应该每次调用返回不同的时间戳', (done) => {
    const timestamp1 = formatTimestamp();
    // 等待10毫秒确保时间戳不同
    setTimeout(() => {
      const timestamp2 = formatTimestamp();
      expect(timestamp1).not.toBe(timestamp2);
      done();
    }, 10);
  });
});

describe('mergeContext', () => {
  it('应该合并两个上下文对象', () => {
    const base = { pkg: 'test-pkg', module: 'test-module' };
    const additional = { userId: '123', requestId: 'abc' };
    const merged = mergeContext(base, additional);

    expect(merged).toEqual({
      pkg: 'test-pkg',
      module: 'test-module',
      userId: '123',
      requestId: 'abc'
    });
  });

  it('应该只返回base当additional为空', () => {
    const base = { pkg: 'test-pkg' };
    const merged = mergeContext(base);

    expect(merged).toEqual({ pkg: 'test-pkg' });
  });

  it('应该只返回additional当base为空', () => {
    const additional = { userId: '123' };
    const merged = mergeContext({}, additional);

    expect(merged).toEqual({ userId: '123' });
  });

  it('应该处理两个空对象', () => {
    const merged = mergeContext({}, {});
    expect(merged).toEqual({});
  });

  it('应该用additional覆盖base中的相同字段', () => {
    const base = { pkg: 'old-pkg', module: 'test-module' };
    const additional = { pkg: 'new-pkg', userId: '123' };
    const merged = mergeContext(base, additional);

    expect(merged).toEqual({
      pkg: 'new-pkg',
      module: 'test-module',
      userId: '123'
    });
  });

  it('应该不修改原始对象', () => {
    const base = { pkg: 'test-pkg' };
    const additional = { userId: '123' };
    const baseCopy = { ...base };
    const additionalCopy = { ...additional };

    mergeContext(base, additional);

    expect(base).toEqual(baseCopy);
    expect(additional).toEqual(additionalCopy);
  });

  it('应该支持嵌套对象', () => {
    const base = { metadata: { version: '1.0.0' } };
    const additional = { metadata: { version: '2.0.0' } };
    const merged = mergeContext(base, additional);

    // 注意：这里使用的是浅拷贝，所以会完全覆盖
    expect(merged).toEqual({
      metadata: { version: '2.0.0' }
    });
  });

  it('应该支持多种类型的值', () => {
    const base = {
      string: 'test',
      number: 123,
      boolean: true,
      array: [1, 2, 3],
      object: { key: 'value' }
    };
    const additional = {
      null: null,
      undefined: undefined
    };
    const merged = mergeContext(base, additional);

    expect(merged).toEqual({
      string: 'test',
      number: 123,
      boolean: true,
      array: [1, 2, 3],
      object: { key: 'value' },
      null: null,
      undefined: undefined
    });
  });
});

describe('createLogEntry', () => {
  it('应该创建基本的日志条目', () => {
    const entry = createLogEntry('info', 'test message');

    expect(entry).toEqual({
      level: 'info',
      message: 'test message',
      timestamp: expect.any(String)
    });
  });

  it('应该包含时间戳当timestamp为true', () => {
    const entry = createLogEntry('info', 'test message', {}, true);

    expect(entry.timestamp).toBeDefined();
    expect(entry.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
  });

  it('应该不包含时间戳当timestamp为false', () => {
    const entry = createLogEntry('info', 'test message', {}, false);

    expect(entry.timestamp).toBeUndefined();
  });

  it('应该默认包含时间戳', () => {
    const entry = createLogEntry('info', 'test message');

    expect(entry.timestamp).toBeDefined();
  });

  it('应该包含context当context不为空', () => {
    const context = { pkg: 'test-pkg', module: 'test-module' };
    const entry = createLogEntry('info', 'test message', context);

    expect(entry.context).toEqual(context);
  });

  it('应该不包含context当context为空', () => {
    const entry = createLogEntry('info', 'test message', {});

    expect(entry.context).toBeUndefined();
  });

  it('应该不包含context当context为undefined', () => {
    const entry = createLogEntry('info', 'test message', undefined);

    expect(entry.context).toBeUndefined();
  });

  it('应该支持所有日志级别', () => {
    const levels = ['debug', 'info', 'warn', 'error'] as const;

    levels.forEach(level => {
      const entry = createLogEntry(level, 'test message');
      expect(entry.level).toBe(level);
      expect(entry.message).toBe('test message');
    });
  });

  it('应该支持复杂的context对象', () => {
    const context = {
      pkg: 'test-pkg',
      module: 'test-module',
      userId: '123',
      requestId: 'abc',
      metadata: {
        version: '1.0.0',
        environment: 'production'
      }
    };
    const entry = createLogEntry('info', 'test message', context);

    expect(entry.context).toEqual(context);
  });

  it('应该生成不同的时间戳', (done) => {
    const entry1 = createLogEntry('info', 'message 1');
    // 等待10毫秒
    setTimeout(() => {
      const entry2 = createLogEntry('info', 'message 2');
      expect(entry1.timestamp).not.toBe(entry2.timestamp);
      done();
    }, 10);
  });

  it('应该正确处理特殊字符', () => {
    const message = 'Test message with special chars: \n\t\r';
    const entry = createLogEntry('info', message);

    expect(entry.message).toBe(message);
  });

  it('应该支持空消息', () => {
    const entry = createLogEntry('info', '');

    expect(entry.message).toBe('');
  });

  it('应该支持长消息', () => {
    const longMessage = 'a'.repeat(1000);
    const entry = createLogEntry('info', longMessage);

    expect(entry.message).toBe(longMessage);
  });
});