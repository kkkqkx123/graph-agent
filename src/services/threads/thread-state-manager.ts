import { injectable, inject } from 'inversify';
import { ID, Timestamp } from '../../domain/common/value-objects';
import { ThreadWorkflowState } from '../../domain/threads/value-objects/thread-workflow-state';
import { IImmerAdapter, Patch } from '../../infrastructure/common/immer/immer-adapter';
import { TYPES } from '../../di/service-keys';

/**
 * 补丁历史记录
 */
export interface PatchHistory {
	/** 版本号 */
	version: number;
	/** 时间戳 */
	timestamp: number;
	/** 补丁数组 */
	patches: Patch[];
	/** 反向补丁数组 */
	inversePatches: Patch[];
}

/**
 * 状态变更接口
 */
export interface StateChange {
	/** 变更类型 */
	type: 'initialize' | 'update' | 'set_current_node';
	/** 时间戳 */
	timestamp: number;
	/** 变更前的数据 */
	before: Record<string, any>;
	/** 变更后的数据 */
	after: Record<string, any>;
	/** 更新数据（仅 update 类型） */
	updates?: Record<string, any>;
	/** 数据差异 */
	diff: Record<string, { before: any; after: any }>;
}

/**
 * 状态验证结果接口
 */
export interface StateValidationResult {
	/** 是否有效 */
	valid: boolean;
	/** 错误信息 */
	errors: string[];
	/** 警告信息 */
	warnings: string[];
}

/**
 * 状态更新选项接口
 */
export interface StateUpdateOptions {
	/** 是否验证状态 */
	validate?: boolean;
	/** 是否记录变更历史 */
	recordHistory?: boolean;
}

/**
 * 线程状态管理器
 *
 * 职责：
 * - 管理线程执行状态
 * - 提供状态的初始化、获取、更新、清除操作
 * - 记录状态变更历史
 * - 验证状态数据
 *
 * 特性：
 * - 不可变的状态更新
 * - 线程级别的状态隔离
 * - 状态变更历史记录
 * - 状态数据验证
 *
 * 不负责：
 * - 状态快照和恢复（由 CheckpointManager 负责）
 * - 执行历史记录（由 ThreadHistoryManager 负责）
 * - 状态缓存管理（由基础设施层负责）
 *
 * 属于基础设施层，提供技术性的状态管理支持
 */
@injectable()
export class ThreadStateManager {
	private states: Map<string, ThreadWorkflowState>;
	private stateHistory: Map<string, StateChange[]>;
	private patchHistories: Map<string, PatchHistory[]>;
	private stateVersions: Map<string, number>;
	private readonly immerAdapter: IImmerAdapter;

	constructor(@inject(TYPES.ImmerAdapter) immerAdapter: IImmerAdapter) {
		this.states = new Map();
		this.stateHistory = new Map();
		this.patchHistories = new Map();
		this.stateVersions = new Map();
		this.immerAdapter = immerAdapter;
	}

	/**
	 * 初始化状态
	 * @param threadId 线程ID
	 * @param workflowId 工作流ID
	 * @param initialState 初始状态数据
	 * @param options 更新选项
	 */
	initialize(
		threadId: string,
		workflowId: ID,
		initialState: Record<string, any> = {},
		options: StateUpdateOptions = {}
	): void {
		const state = ThreadWorkflowState.initial(workflowId);

		// 使用 Immer 更新初始状态
		const [updatedStateProps, patches, inversePatches] = this.immerAdapter.produceWithPatches(
			state.toProps(),
			(draft: any) => {
				Object.assign(draft.data, initialState);
			}
		);

		const updatedState = ThreadWorkflowState.fromProps(updatedStateProps);
		this.states.set(threadId, updatedState);
		this.stateVersions.set(threadId, 0);

		// 记录初始化历史
		if (options.recordHistory !== false) {
			this.recordStateChange(threadId, 'initialize', {}, updatedState.data);
			this.recordPatches(threadId, 0, patches, inversePatches);
		}
	}

	/**
	 * 获取状态
	 * @param threadId 线程ID
	 * @returns 线程状态，如果不存在则返回 null
	 */
	getState(threadId: string): ThreadWorkflowState | null {
		return this.states.get(threadId) || null;
	}

	/**
	 * 更新状态
	 * @param threadId 线程ID
	 * @param updates 状态更新数据
	 * @param options 更新选项
	 * @returns 更新后的状态
	 */
	updateState(
		threadId: string,
		updates: Record<string, any>,
		options: StateUpdateOptions = {}
	): ThreadWorkflowState {
		const currentState = this.states.get(threadId);

		if (!currentState) {
			throw new Error(`线程 ${threadId} 的状态不存在`);
		}

		const currentVersion = this.stateVersions.get(threadId) || 0;

		// 使用 Immer 更新状态
		const [nextStateProps, patches, inversePatches] = this.immerAdapter.produceWithPatches(
			currentState.toProps(),
			(draft: any) => {
				Object.assign(draft.data, updates);
				draft.updatedAt = Timestamp.now();
			}
		);

		// 创建新的状态实例
		const nextState = ThreadWorkflowState.fromProps(nextStateProps);

		// 保存更新后的状态
		this.states.set(threadId, nextState);
		this.stateVersions.set(threadId, currentVersion + 1);

		// 记录变更历史
		if (options.recordHistory !== false) {
			this.recordStateChange(threadId, 'update', currentState.data, nextState.data, updates);
			this.recordPatches(threadId, currentVersion + 1, patches, inversePatches);
		}

		return nextState;
	}

	/**
	 * 设置当前节点ID
	 * @param threadId 线程ID
	 * @param nodeId 节点ID
	 * @param options 更新选项
	 * @returns 更新后的状态
	 */
	setCurrentNodeId(threadId: string, nodeId: ID, options: StateUpdateOptions = {}): ThreadWorkflowState {
		const currentState = this.states.get(threadId);

		if (!currentState) {
			throw new Error(`线程 ${threadId} 的状态不存在`);
		}

		const currentVersion = this.stateVersions.get(threadId) || 0;

		// 使用 Immer 更新状态
		const [nextStateProps, patches, inversePatches] = this.immerAdapter.produceWithPatches(
			currentState.toProps(),
			(draft: any) => {
				draft.currentNodeId = nodeId;
				draft.updatedAt = Timestamp.now();
			}
		);

		// 创建新的状态实例
		const nextState = ThreadWorkflowState.fromProps(nextStateProps);

		// 保存更新后的状态
		this.states.set(threadId, nextState);
		this.stateVersions.set(threadId, currentVersion + 1);

		// 记录变更历史
		if (options.recordHistory !== false) {
			this.recordStateChange(threadId, 'set_current_node', currentState.data, nextState.data);
			this.recordPatches(threadId, currentVersion + 1, patches, inversePatches);
		}

		return nextState;
	}

	/**
	 * 获取状态数据
	 * @param threadId 线程ID
	 * @param key 数据键（可选）
	 * @returns 数据值或所有数据
	 */
	getData(threadId: string, key?: string): any {
		const state = this.states.get(threadId);

		if (!state) {
			throw new Error(`线程 ${threadId} 的状态不存在`);
		}

		return state.getData(key);
	}

	/**
	 * 清除状态
	 * @param threadId 线程ID
	 */
	clearState(threadId: string): void {
		this.states.delete(threadId);
		this.stateVersions.delete(threadId);
		this.stateHistory.delete(threadId);
		this.patchHistories.delete(threadId);
	}

	/**
	 * 清除所有状态
	 */
	clearAllStates(): void {
		this.states.clear();
		this.stateVersions.clear();
		this.stateHistory.clear();
		this.patchHistories.clear();
	}

	/**
	 * 检查状态是否存在
	 * @param threadId 线程ID
	 * @returns 是否存在
	 */
	hasState(threadId: string): boolean {
		return this.states.has(threadId);
	}

	/**
	 * 获取所有线程ID
	 * @returns 线程ID数组
	 */
	getAllThreadIds(): string[] {
		return Array.from(this.states.keys());
	}

	/**
	 * 获取状态数量
	 * @returns 状态数量
	 */
	getStateCount(): number {
		return this.states.size;
	}

	/**
	 * 获取状态变更历史
	 * @param threadId 线程ID
	 * @param limit 限制数量（可选）
	 * @returns 状态变更历史
	 */
	getStateHistory(threadId: string, limit?: number): StateChange[] {
		const history = this.stateHistory.get(threadId) || [];
		return limit ? history.slice(-limit) : history;
	}

	/**
	 * 获取补丁历史
	 * @param threadId 线程ID
	 * @returns 补丁历史数组
	 */
	getPatchHistory(threadId: string): PatchHistory[] {
		return this.patchHistories.get(threadId) || [];
	}

	/**
	 * 获取当前版本号
	 * @param threadId 线程ID
	 * @returns 当前版本号
	 */
	getCurrentVersion(threadId: string): number {
		return this.stateVersions.get(threadId) || 0;
	}

	/**
	 * 清除状态历史
	 * @param threadId 线程ID（可选，如果不提供则清除所有历史）
	 */
	clearStateHistory(threadId?: string): void {
		if (threadId) {
			this.stateHistory.delete(threadId);
		} else {
			this.stateHistory.clear();
		}
	}

	/**
	 * 验证状态数据
	 * @param threadId 线程ID
	 * @returns 验证结果
	 */
	validateState(threadId: string): StateValidationResult {
		const state = this.states.get(threadId);

		if (!state) {
			return {
				valid: false,
				errors: [`线程 ${threadId} 的状态不存在`],
				warnings: [],
			};
		}

		const errors: string[] = [];
		const warnings: string[] = [];

		// 验证状态数据
		if (!state.data) {
			errors.push('状态数据不能为空');
		}

		// 验证时间戳
		if (!state.createdAt) {
			errors.push('创建时间不能为空');
		}

		if (!state.updatedAt) {
			errors.push('更新时间不能为空');
		}

		if (state.updatedAt.isBefore(state.createdAt)) {
			errors.push('更新时间不能早于创建时间');
		}

		return {
			valid: errors.length === 0,
			errors,
			warnings,
		};
	}

	/**
	 * 记录状态变更（私有方法）
	 * @param threadId 线程ID
	 * @param type 变更类型
	 * @param before 变更前数据
	 * @param after 变更后数据
	 * @param updates 更新数据（可选）
	 */
	private recordStateChange(
		threadId: string,
		type: StateChange['type'],
		before: Record<string, any>,
		after: Record<string, any>,
		updates?: Record<string, any>
	): void {
		if (!this.stateHistory.has(threadId)) {
			this.stateHistory.set(threadId, []);
		}

		const history = this.stateHistory.get(threadId)!;
		const change: StateChange = {
			type,
			timestamp: Date.now(),
			before,
			after,
			updates,
			diff: this.calculateDiff(before, after),
		};

		history.push(change);

		// 限制历史记录数量
		if (history.length > 1000) {
			history.shift();
		}
	}

	/**
	 * 记录补丁（私有方法）
	 * @param threadId 线程ID
	 * @param version 版本号
	 * @param patches 补丁数组
	 * @param inversePatches 反向补丁数组
	 */
	private recordPatches(
		threadId: string,
		version: number,
		patches: Patch[],
		inversePatches: Patch[]
	): void {
		if (!this.patchHistories.has(threadId)) {
			this.patchHistories.set(threadId, []);
		}

		const history = this.patchHistories.get(threadId)!;
		history.push({
			version,
			timestamp: Date.now(),
			patches,
			inversePatches,
		});

		// 限制补丁历史数量
		if (history.length > 1000) {
			history.shift();
		}
	}

	/**
	 * 计算状态差异（私有方法）
	 * @param before 变更前数据
	 * @param after 变更后数据
	 * @returns 差异对象
	 */
	private calculateDiff(
		before: Record<string, any>,
		after: Record<string, any>
	): Record<string, { before: any; after: any }> {
		const diff: Record<string, { before: any; after: any }> = {};

		// 检查所有键
		const allKeys = new Set([...Object.keys(before), ...Object.keys(after)]);

		for (const key of allKeys) {
			const beforeValue = before[key];
			const afterValue = after[key];

			if (JSON.stringify(beforeValue) !== JSON.stringify(afterValue)) {
				diff[key] = { before: beforeValue, after: afterValue };
			}
		}

		return diff;
	}
}