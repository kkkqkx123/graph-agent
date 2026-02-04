/**
 * platform-info 单元测试
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { getPlatformHeaders } from '../platform-info';

describe('platform-info', () => {
  let originalProcess: any;

  beforeEach(() => {
    // 保存原始 process 对象
    originalProcess = global.process;
  });

  afterEach(() => {
    // 恢复原始 process 对象
    global.process = originalProcess;
  });

  describe('getPlatformHeaders', () => {
    it('应该在 Node.js 环境下返回平台诊断头', () => {
      // 模拟 Node.js 环境
      global.process = {
        version: 'v22.14.0',
        arch: 'x64',
        platform: 'win32'
      } as any;

      const result = getPlatformHeaders();
      expect(result).toEqual({
        'X-Runtime': 'node',
        'X-Runtime-Version': 'v22.14.0',
        'X-Node-Arch': 'x64',
        'X-Node-Platform': 'win32'
      });
    });

    it('应该在非 Node.js 环境下返回空对象', () => {
      // 模拟非 Node.js 环境
      delete (global as any).process;

      const result = getPlatformHeaders();
      expect(result).toEqual({});
    });

    it('应该在 process 存在但没有 version 时返回空对象', () => {
      // 模拟 process 存在但没有 version
      global.process = {} as any;

      const result = getPlatformHeaders();
      expect(result).toEqual({});
    });

    it('应该处理不同的 Node.js 版本', () => {
      global.process = {
        version: 'v18.19.0',
        arch: 'arm64',
        platform: 'darwin'
      } as any;

      const result = getPlatformHeaders();
      expect(result).toEqual({
        'X-Runtime': 'node',
        'X-Runtime-Version': 'v18.19.0',
        'X-Node-Arch': 'arm64',
        'X-Node-Platform': 'darwin'
      });
    });

    it('应该处理 Linux 平台', () => {
      global.process = {
        version: 'v20.10.0',
        arch: 'x64',
        platform: 'linux'
      } as any;

      const result = getPlatformHeaders();
      expect(result).toEqual({
        'X-Runtime': 'node',
        'X-Runtime-Version': 'v20.10.0',
        'X-Node-Arch': 'x64',
        'X-Node-Platform': 'linux'
      });
    });

    it('应该处理 Windows 平台', () => {
      global.process = {
        version: 'v22.14.0',
        arch: 'x64',
        platform: 'win32'
      } as any;

      const result = getPlatformHeaders();
      expect(result).toEqual({
        'X-Runtime': 'node',
        'X-Runtime-Version': 'v22.14.0',
        'X-Node-Arch': 'x64',
        'X-Node-Platform': 'win32'
      });
    });

    it('应该处理 macOS 平台', () => {
      global.process = {
        version: 'v22.14.0',
        arch: 'arm64',
        platform: 'darwin'
      } as any;

      const result = getPlatformHeaders();
      expect(result).toEqual({
        'X-Runtime': 'node',
        'X-Runtime-Version': 'v22.14.0',
        'X-Node-Arch': 'arm64',
        'X-Node-Platform': 'darwin'
      });
    });

    it('应该处理不同的架构', () => {
      const architectures = ['x64', 'arm64', 'ia32', 'arm', 'mips', 'mipsel', 'ppc', 'ppc64', 's390', 's390x', 'riscv64'];
      
      architectures.forEach(arch => {
        global.process = {
          version: 'v22.14.0',
          arch: arch,
          platform: 'linux'
        } as any;

        const result = getPlatformHeaders();
        expect(result).toEqual({
          'X-Runtime': 'node',
          'X-Runtime-Version': 'v22.14.0',
          'X-Node-Arch': arch,
          'X-Node-Platform': 'linux'
        });
      });
    });

    it('应该处理带预发布标签的版本号', () => {
      global.process = {
        version: 'v22.14.0-rc.1',
        arch: 'x64',
        platform: 'linux'
      } as any;

      const result = getPlatformHeaders();
      expect(result).toEqual({
        'X-Runtime': 'node',
        'X-Runtime-Version': 'v22.14.0-rc.1',
        'X-Node-Arch': 'x64',
        'X-Node-Platform': 'linux'
      });
    });

    it('应该返回的对象不包含额外属性', () => {
      global.process = {
        version: 'v22.14.0',
        arch: 'x64',
        platform: 'win32',
        env: {},
        cwd: () => '/test'
      } as any;

      const result = getPlatformHeaders();
      const keys = Object.keys(result);
      expect(keys).toEqual(['X-Runtime', 'X-Runtime-Version', 'X-Node-Arch', 'X-Node-Platform']);
      expect(keys.length).toBe(4);
    });

    it('应该在多次调用时返回一致的结果', () => {
      global.process = {
        version: 'v22.14.0',
        arch: 'x64',
        platform: 'win32'
      } as any;

      const result1 = getPlatformHeaders();
      const result2 = getPlatformHeaders();
      expect(result1).toEqual(result2);
    });
  });
});