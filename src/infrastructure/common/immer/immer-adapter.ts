/**
 * ImmerAdapter - Immer 适配器
 *
 * 职责：
 * - 封装 Immer API，提供统一的接口
 * - 管理配置（自动冻结、Map/Set 支持等）
 * - 提供类型安全的接口
 *
 * 使用方式：
 * Application Layer 应该通过 ImmerAdapter 使用 Immer 功能，
 * 而不是直接导入 Immer 的原始 API。
 */

import {
	produceWithPatches,
	setAutoFreeze,
	enablePatches,
	enableMapSet,
	Draft,
	Patch,
	PatchListener
} from './immer';

/**
 * Immer 适配器接口
 */
export interface IImmerAdapter {
	/**
	 * 使用 produceWithPatches 更新状态并生成补丁
	 * @param base 基础状态
	 * @param recipe 更新函数
	 * @returns [新状态, 补丁数组, 反向补丁数组]
	 */
	produceWithPatches<T>(
		base: T,
		recipe: (draft: Draft<T>) => void
	): [T, Patch[], Patch[]];

	/**
	 * 启用或禁用自动冻结
	 * @param enabled 是否启用
	 */
	enableAutoFreeze(enabled: boolean): void;

	/**
	 * 启用补丁功能
	 */
	enablePatches(): void;

	/**
	 * 启用 Map/Set 支持
	 */
	enableMapSet(): void;
}

/**
 * Immer 适配器实现
 */
export class ImmerAdapter implements IImmerAdapter {
	private autoFreezeEnabled: boolean = true;

	constructor() {
		// 启用补丁功能
		enablePatches();
		// 启用 Map/Set 支持
		enableMapSet();
		// 默认启用自动冻结
		setAutoFreeze(true);
	}

	produceWithPatches<T>(
		base: T,
		recipe: (draft: Draft<T>) => void
	): [T, Patch[], Patch[]] {
		const result = produceWithPatches(base, recipe);
		return [result[0], result[1], result[2]];
	}

	enableAutoFreeze(enabled: boolean): void {
		this.autoFreezeEnabled = enabled;
		setAutoFreeze(enabled);
	}

	enablePatches(): void {
		enablePatches();
	}

	enableMapSet(): void {
		enableMapSet();
	}
}

/**
 * 创建 Immer 适配器实例
 */
export function createImmerAdapter(): ImmerAdapter {
	return new ImmerAdapter();
}

/**
 * 导出类型定义
 */
export type { Draft, Patch, PatchListener };