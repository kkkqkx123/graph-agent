/**
 * 版本工具函数单元测试
 */

import { describe, it, expect } from '@jest/globals';
import {
  initialVersion,
  parseVersion,
  nextMajorVersion,
  nextMinorVersion,
  nextPatchVersion,
  compareVersion,
  autoIncrementVersion,
  parseFullVersion
} from '../version-utils';

describe('version-utils', () => {
  describe('initialVersion', () => {
    it('应该返回初始版本号', () => {
      const version = initialVersion();
      expect(version).toBe('1.0.0');
    });

    it('多次调用应该返回相同的值', () => {
      const version1 = initialVersion();
      const version2 = initialVersion();
      expect(version1).toBe(version2);
    });
  });

  describe('parseVersion', () => {
    it('应该解析标准版本号', () => {
      const parsed = parseVersion('1.2.3');
      expect(parsed).toEqual({ major: 1, minor: 2, patch: 3 });
    });

    it('应该解析初始版本号', () => {
      const parsed = parseVersion('1.0.0');
      expect(parsed).toEqual({ major: 1, minor: 0, patch: 0 });
    });

    it('应该解析大版本号', () => {
      const parsed = parseVersion('10.20.30');
      expect(parsed).toEqual({ major: 10, minor: 20, patch: 30 });
    });

    it('应该处理缺少部分的情况', () => {
      expect(parseVersion('1.2')).toEqual({ major: 1, minor: 2, patch: 0 });
      expect(parseVersion('1')).toEqual({ major: 1, minor: 0, patch: 0 });
    });

    it('应该处理零值', () => {
      expect(parseVersion('0.0.0')).toEqual({ major: 0, minor: 0, patch: 0 });
    });

    it('应该处理包含前导零的版本号', () => {
      expect(parseVersion('01.02.03')).toEqual({ major: 1, minor: 2, patch: 3 });
    });
  });

  describe('nextMajorVersion', () => {
    it('应该递增主版本号', () => {
      expect(nextMajorVersion('1.0.0')).toBe('2.0.0');
      expect(nextMajorVersion('2.5.3')).toBe('3.0.0');
    });

    it('应该重置次版本和补丁版本', () => {
      expect(nextMajorVersion('1.5.10')).toBe('2.0.0');
    });

    it('应该处理大版本号', () => {
      expect(nextMajorVersion('10.20.30')).toBe('11.0.0');
    });

    it('应该处理零版本号', () => {
      expect(nextMajorVersion('0.0.0')).toBe('1.0.0');
    });
  });

  describe('nextMinorVersion', () => {
    it('应该递增次版本号', () => {
      expect(nextMinorVersion('1.0.0')).toBe('1.1.0');
      expect(nextMinorVersion('1.5.3')).toBe('1.6.0');
    });

    it('应该保持主版本号不变', () => {
      expect(nextMinorVersion('2.0.0')).toBe('2.1.0');
    });

    it('应该重置补丁版本', () => {
      expect(nextMinorVersion('1.5.10')).toBe('1.6.0');
    });

    it('应该处理大版本号', () => {
      expect(nextMinorVersion('10.20.30')).toBe('10.21.0');
    });

    it('应该处理零版本号', () => {
      expect(nextMinorVersion('0.0.0')).toBe('0.1.0');
    });
  });

  describe('nextPatchVersion', () => {
    it('应该递增补丁版本号', () => {
      expect(nextPatchVersion('1.0.0')).toBe('1.0.1');
      expect(nextPatchVersion('1.5.3')).toBe('1.5.4');
    });

    it('应该保持主版本和次版本号不变', () => {
      expect(nextPatchVersion('2.5.0')).toBe('2.5.1');
    });

    it('应该处理大版本号', () => {
      expect(nextPatchVersion('10.20.30')).toBe('10.20.31');
    });

    it('应该处理零版本号', () => {
      expect(nextPatchVersion('0.0.0')).toBe('0.0.1');
    });

    it('应该处理大补丁号', () => {
      expect(nextPatchVersion('1.0.99')).toBe('1.0.100');
    });
  });

  describe('compareVersion', () => {
    it('应该返回0当版本相同时', () => {
      expect(compareVersion('1.0.0', '1.0.0')).toBe(0);
      expect(compareVersion('2.5.3', '2.5.3')).toBe(0);
    });

    it('应该返回-1当v1小于v2时', () => {
      expect(compareVersion('1.0.0', '2.0.0')).toBe(-1);
      expect(compareVersion('1.0.0', '1.1.0')).toBe(-1);
      expect(compareVersion('1.0.0', '1.0.1')).toBe(-1);
      expect(compareVersion('1.2.3', '1.2.4')).toBe(-1);
    });

    it('应该返回1当v1大于v2时', () => {
      expect(compareVersion('2.0.0', '1.0.0')).toBe(1);
      expect(compareVersion('1.1.0', '1.0.0')).toBe(1);
      expect(compareVersion('1.0.1', '1.0.0')).toBe(1);
      expect(compareVersion('1.2.4', '1.2.3')).toBe(1);
    });

    it('应该正确比较主版本号', () => {
      expect(compareVersion('2.0.0', '1.9.9')).toBe(1);
      expect(compareVersion('1.0.0', '2.0.0')).toBe(-1);
    });

    it('应该正确比较次版本号', () => {
      expect(compareVersion('1.2.0', '1.1.9')).toBe(1);
      expect(compareVersion('1.1.0', '1.2.0')).toBe(-1);
    });

    it('应该正确比较补丁版本号', () => {
      expect(compareVersion('1.1.2', '1.1.1')).toBe(1);
      expect(compareVersion('1.1.1', '1.1.2')).toBe(-1);
    });

    it('应该处理大版本号', () => {
      expect(compareVersion('10.0.0', '9.9.9')).toBe(1);
      expect(compareVersion('9.9.9', '10.0.0')).toBe(-1);
    });

    it('应该处理零版本号', () => {
      expect(compareVersion('0.0.1', '0.0.0')).toBe(1);
      expect(compareVersion('0.0.0', '0.0.1')).toBe(-1);
    });
  });

  describe('autoIncrementVersion', () => {
    it('应该根据major类型递增主版本', () => {
      expect(autoIncrementVersion('1.0.0', 'major')).toBe('2.0.0');
      expect(autoIncrementVersion('1.5.3', 'major')).toBe('2.0.0');
    });

    it('应该根据minor类型递增次版本', () => {
      expect(autoIncrementVersion('1.0.0', 'minor')).toBe('1.1.0');
      expect(autoIncrementVersion('1.5.3', 'minor')).toBe('1.6.0');
    });

    it('应该根据patch类型递增补丁版本', () => {
      expect(autoIncrementVersion('1.0.0', 'patch')).toBe('1.0.1');
      expect(autoIncrementVersion('1.5.3', 'patch')).toBe('1.5.4');
    });

    it('应该处理大版本号', () => {
      expect(autoIncrementVersion('10.20.30', 'major')).toBe('11.0.0');
      expect(autoIncrementVersion('10.20.30', 'minor')).toBe('10.21.0');
      expect(autoIncrementVersion('10.20.30', 'patch')).toBe('10.20.31');
    });

    it('应该处理零版本号', () => {
      expect(autoIncrementVersion('0.0.0', 'major')).toBe('1.0.0');
      expect(autoIncrementVersion('0.0.0', 'minor')).toBe('0.1.0');
      expect(autoIncrementVersion('0.0.0', 'patch')).toBe('0.0.1');
    });
  });

  describe('parseFullVersion', () => {
    it('应该解析标准版本号', () => {
      const parsed = parseFullVersion('1.2.3');
      expect(parsed).toEqual({
        major: 1,
        minor: 2,
        patch: 3,
        prerelease: undefined,
        build: ''
      });
    });

    it('应该解析带预发布标识的版本号', () => {
      const parsed = parseFullVersion('1.2.3-alpha.1');
      expect(parsed).toEqual({
        major: 1,
        minor: 2,
        patch: 3,
        prerelease: 'alpha.1',
        build: ''
      });
    });

    it('应该解析带构建元数据的版本号', () => {
      const parsed = parseFullVersion('1.2.3+build.123');
      expect(parsed).toEqual({
        major: 1,
        minor: 2,
        patch: 3,
        prerelease: undefined,
        build: 'build.123'
      });
    });

    it('应该解析带预发布和构建元数据的版本号', () => {
      const parsed = parseFullVersion('1.2.3-alpha.1+build.123');
      expect(parsed).toEqual({
        major: 1,
        minor: 2,
        patch: 3,
        prerelease: 'alpha.1',
        build: 'build.123'
      });
    });

    it('应该解析复杂的预发布标识', () => {
      const parsed = parseFullVersion('1.2.3-beta.2.rc.1');
      expect(parsed).toEqual({
        major: 1,
        minor: 2,
        patch: 3,
        prerelease: 'beta.2.rc.1',
        build: ''
      });
    });

    it('应该解析多个构建元数据', () => {
      const parsed = parseFullVersion('1.2.3+build.123.metadata.456');
      expect(parsed).toEqual({
        major: 1,
        minor: 2,
        patch: 3,
        prerelease: undefined,
        build: 'build.123.metadata.456'
      });
    });

    it('应该处理缺少部分的情况', () => {
      expect(parseFullVersion('1.2')).toEqual({
        major: 1,
        minor: 2,
        patch: 0,
        prerelease: undefined,
        build: ''
      });
      expect(parseFullVersion('1')).toEqual({
        major: 1,
        minor: 0,
        patch: 0,
        prerelease: undefined,
        build: ''
      });
    });

    it('应该处理零版本号', () => {
      const parsed = parseFullVersion('0.0.0');
      expect(parsed).toEqual({
        major: 0,
        minor: 0,
        patch: 0,
        prerelease: undefined,
        build: ''
      });
    });

    it('应该处理只有预发布标识的版本号', () => {
      const parsed = parseFullVersion('1.2.3-alpha');
      expect(parsed).toEqual({
        major: 1,
        minor: 2,
        patch: 3,
        prerelease: 'alpha',
        build: ''
      });
    });

    it('应该处理只有构建元数据的版本号', () => {
      const parsed = parseFullVersion('1.2.3+build');
      expect(parsed).toEqual({
        major: 1,
        minor: 2,
        patch: 3,
        prerelease: undefined,
        build: 'build'
      });
    });
  });
});