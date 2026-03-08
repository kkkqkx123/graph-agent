/**
 * TomlParserManager - 管理 TOML 解析器的生命周期
 *
 * 提供功能：
 * - 延迟初始化（懒加载）
 * - 单例模式确保线程安全
 * - 测试友好的重置能力
 * - 清晰的错误处理
 *
 * 使用示例：
 *   const parser = TomlParserManager.getInstance()
 *   const config = parser.parse(tomlContent)
 *   // ... 使用完毕后 ...
 *   TomlParserManager.dispose()
 */

import { ConfigurationError } from '@modular-agent/types';

/**
 * TomlParserManager - 管理 TOML 解析器的生命周期
 */
export class TomlParserManager {
	private static instance: any = null;

	/**
	 * 获取单例 TOML 解析器实例
	 * 首次访问时延迟创建
	 * @returns TOML 解析器实例
	 * @throws {ConfigurationError} 当未找到 TOML 解析库时抛出
	 */
	static getInstance(): any {
		if (!TomlParserManager.instance) {
			try {
				TomlParserManager.instance = require('@iarna/toml');
			} catch (error) {
				throw new ConfigurationError(
					'未找到TOML解析库。请确保已安装 @iarna/toml: pnpm install',
					undefined,
					{ suggestion: 'pnpm install' }
				);
			}
		}
		return TomlParserManager.instance;
	}

	/**
	 * 检查解析器实例是否存在
	 * @returns 如果解析器已初始化返回 true
	 */
	static hasInstance(): boolean {
		return TomlParserManager.instance !== null;
	}

	/**
	 * 释放解析器实例
	 * 调用后，getInstance() 将创建新实例
	 */
	static dispose(): void {
		TomlParserManager.instance = null;
	}

	/**
	 * 重置解析器实例（主要用于测试）
	 * 强制在下次调用 getInstance() 时创建新实例
	 */
	static reset(): void {
		TomlParserManager.dispose();
	}

	/**
	 * 解析 TOML 内容
	 * 便捷方法，一次性获取解析器并解析
	 * @param content - TOML 内容字符串
	 * @returns 解析后的对象
	 */
	static parse(content: string): any {
		const parser = TomlParserManager.getInstance();
		return parser.parse(content);
	}
}
