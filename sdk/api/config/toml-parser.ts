/**
 * TOML解析器
 * 负责解析TOML格式的配置文件
 */

import type { WorkflowConfigFile } from './types';

/**
 * TOML解析器类
 */
export class TomlParser {
  /**
   * 解析TOML内容
   * @param content TOML内容字符串
   * @returns 解析后的配置对象
   */
  parse(content: string): WorkflowConfigFile {
    try {
      // 使用动态导入来支持TOML解析
      // 如果项目中没有安装TOML解析库，这里会抛出错误
      const toml = this.getTomlParser();
      const parsed = toml.parse(content);

      // 验证解析结果
      if (!parsed.workflow) {
        throw new Error('TOML配置文件必须包含 [workflow] 部分');
      }

      return parsed as WorkflowConfigFile;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`TOML解析失败: ${error.message}`);
      }
      throw new Error('TOML解析失败: 未知错误');
    }
  }

  /**
   * 获取TOML解析器实例
   * @returns TOML解析器
   */
  private getTomlParser(): any {
    try {
      // 尝试使用 @iarna/toml
      const toml = require('@iarna/toml');
      return toml;
    } catch (error) {
      try {
        // 尝试使用 toml
        const toml = require('toml');
        return toml;
      } catch (error2) {
        throw new Error(
          '未找到TOML解析库。请安装 @iarna/toml 或 toml: pnpm add @iarna/toml'
        );
      }
    }
  }

  /**
   * 将配置对象转换为TOML字符串
   * @param config 配置对象
   * @returns TOML字符串
   */
  stringify(config: WorkflowConfigFile): string {
    try {
      // 注意：大多数TOML库只支持解析，不支持序列化
      // 这里提供一个简单的实现，实际使用时可能需要更复杂的逻辑
      throw new Error('TOML序列化功能暂未实现，请使用JSON格式进行导出');
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`TOML序列化失败: ${error.message}`);
      }
      throw new Error('TOML序列化失败: 未知错误');
    }
  }

  /**
   * 验证TOML内容的基本格式
   * @param content TOML内容字符串
   * @returns 是否有效
   */
  validateSyntax(content: string): boolean {
    try {
      this.parse(content);
      return true;
    } catch (error) {
      return false;
    }
  }
}