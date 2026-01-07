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
	produce,
	produceWithPatches,
	applyPatches,
	setAutoFreeze,
	enablePatches,
	enableMapSet,
	original,
	current,
	isDraft,
	isDraftable,
	Draft,
	Patch,
	PatchListener,
	IProduce,
	IProduceWithPatches
} from './immer';

/**
 * Immer 适配器接口
 */
export interface IImmerAdapter {
	/**
	 * 使用 produce 更新状态
	 * @param base 基础状态
	 * @param recipe 更新函数
	 * @returns 新状态
	 */
	produce<T>(base: T, recipe: (draft: Draft<T>) => void): T;

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
	 * 应用补丁到状态
	 * @param base 基础状态
	 * @param patches 补丁数组
	 * @returns 新状态
	 */
	applyPatches<T>(base: T, patches: Patch[]): T;

	/**
	 * 获取原始对象（非草稿）
	 * @param value 草稿对象
	 * @returns 原始对象
	 */
	original<T>(value: T): T | undefined;

	/**
	 * 获取当前状态的快照
	 * @param value 草稿对象
	 * @returns 当前状态快照
	 */
	current<T>(value: T): T;

	/**
	 * 检查是否为草稿对象
	 * @param value 待检查对象
	 * @returns 是否为草稿
	 */
	isDraft<T>(value: T): boolean;

	/**
	 * 检查对象是否可草稿化
	 * @param value 待检查对象
	 * @returns 是否可草稿化
	 */
	isDraftable(value: unknown): boolean;

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

	produce<T>(base: T, recipe: (draft: Draft<T>) => void): T {
		return produce(base, recipe);
	}

	produceWithPatches<T>(
		base: T,
		recipe: (draft: Draft<T>) => void
	): [T, Patch[], Patch[]] {
		return produceWithPatches(base, recipe);
	}

	applyPatches<T>(base: T, patches: Patch[]): T {
		return applyPatches(base, patches);
	}

	original<T>(value: T): T | undefined {
		return original(value);
	}

	current<T>(value: T): T {
		return current(value);
	}

	isDraft<T>(value: T): boolean {
		return isDraft(value);
	}

	isDraftable(value: unknown): boolean {
		return isDraftable(value);
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
export type { Draft, Patch, PatchListener, IProduce, IProduceWithPatches };