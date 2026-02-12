/**
 * 日志类型定义测试
 */

import { LOG_LEVEL_PRIORITY, shouldLog, LogLevel } from '../types';

describe('日志类型定义', () => {
  describe('LOG_LEVEL_PRIORITY', () => {
    it('应该定义正确的日志级别优先级', () => {
      expect(LOG_LEVEL_PRIORITY).toEqual({
        debug: 0,
        info: 1,
        warn: 2,
        error: 3,
        off: 4
      });
    });

    it('debug级别应该有最低优先级', () => {
      expect(LOG_LEVEL_PRIORITY.debug).toBeLessThan(LOG_LEVEL_PRIORITY.info);
      expect(LOG_LEVEL_PRIORITY.debug).toBeLessThan(LOG_LEVEL_PRIORITY.warn);
      expect(LOG_LEVEL_PRIORITY.debug).toBeLessThan(LOG_LEVEL_PRIORITY.error);
    });

    it('error级别应该有较高优先级', () => {
      expect(LOG_LEVEL_PRIORITY.error).toBeGreaterThan(LOG_LEVEL_PRIORITY.warn);
      expect(LOG_LEVEL_PRIORITY.error).toBeGreaterThan(LOG_LEVEL_PRIORITY.info);
      expect(LOG_LEVEL_PRIORITY.error).toBeGreaterThan(LOG_LEVEL_PRIORITY.debug);
    });

    it('off级别应该有最高优先级', () => {
      expect(LOG_LEVEL_PRIORITY.off).toBeGreaterThan(LOG_LEVEL_PRIORITY.error);
      expect(LOG_LEVEL_PRIORITY.off).toBeGreaterThan(LOG_LEVEL_PRIORITY.warn);
      expect(LOG_LEVEL_PRIORITY.off).toBeGreaterThan(LOG_LEVEL_PRIORITY.info);
      expect(LOG_LEVEL_PRIORITY.off).toBeGreaterThan(LOG_LEVEL_PRIORITY.debug);
    });
  });

  describe('shouldLog', () => {
    const testCases: Array<{
      currentLevel: LogLevel;
      messageLevel: LogLevel;
      expected: boolean;
    }> = [
      // debug级别
      { currentLevel: 'debug', messageLevel: 'debug', expected: true },
      { currentLevel: 'debug', messageLevel: 'info', expected: true },
      { currentLevel: 'debug', messageLevel: 'warn', expected: true },
      { currentLevel: 'debug', messageLevel: 'error', expected: true },
      { currentLevel: 'debug', messageLevel: 'off', expected: true },

      // info级别
      { currentLevel: 'info', messageLevel: 'debug', expected: false },
      { currentLevel: 'info', messageLevel: 'info', expected: true },
      { currentLevel: 'info', messageLevel: 'warn', expected: true },
      { currentLevel: 'info', messageLevel: 'error', expected: true },
      { currentLevel: 'info', messageLevel: 'off', expected: true },

      // warn级别
      { currentLevel: 'warn', messageLevel: 'debug', expected: false },
      { currentLevel: 'warn', messageLevel: 'info', expected: false },
      { currentLevel: 'warn', messageLevel: 'warn', expected: true },
      { currentLevel: 'warn', messageLevel: 'error', expected: true },
      { currentLevel: 'warn', messageLevel: 'off', expected: true },

      // error级别
      { currentLevel: 'error', messageLevel: 'debug', expected: false },
      { currentLevel: 'error', messageLevel: 'info', expected: false },
      { currentLevel: 'error', messageLevel: 'warn', expected: false },
      { currentLevel: 'error', messageLevel: 'error', expected: true },
      { currentLevel: 'error', messageLevel: 'off', expected: true },

      // off级别
      { currentLevel: 'off', messageLevel: 'debug', expected: false },
      { currentLevel: 'off', messageLevel: 'info', expected: false },
      { currentLevel: 'off', messageLevel: 'warn', expected: false },
      { currentLevel: 'off', messageLevel: 'error', expected: false },
      { currentLevel: 'off', messageLevel: 'off', expected: true },
    ];

    testCases.forEach(({ currentLevel, messageLevel, expected }) => {
      it(`shouldLog('${currentLevel}', '${messageLevel}') 应该返回 ${expected}`, () => {
        expect(shouldLog(currentLevel, messageLevel)).toBe(expected);
      });
    });

    it('应该正确处理所有日志级别的组合', () => {
      const levels: LogLevel[] = ['debug', 'info', 'warn', 'error', 'off'];
      
      levels.forEach(currentLevel => {
        levels.forEach(messageLevel => {
          const result = shouldLog(currentLevel, messageLevel);
          const currentPriority = LOG_LEVEL_PRIORITY[currentLevel];
          const messagePriority = LOG_LEVEL_PRIORITY[messageLevel];
          
          expect(result).toBe(messagePriority >= currentPriority);
        });
      });
    });
  });
});