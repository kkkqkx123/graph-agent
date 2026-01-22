import { injectable } from 'inversify';
import { ID, Timestamp } from '../../domain/common/value-objects';
import { ThreadWorkflowState } from '../../domain/threads/value-objects/thread-workflow-state';
import { ExecutionHistory } from '../../domain/workflow/value-objects/execution';
import { updateState, updateNestedState, updateArray } from '../../infrastructure/common/utils/immutable-state';

/**
 * 状态变更接口
 */
export interface StateChange {
	/** 变更类型 */
	type: 'initialize' | 'update' | 'set_current_node' | 'add_history' | 'set_metadata';
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
 */
@injectable()
export class ThreadStateManager {
	private states: Map<string, ThreadWorkflowState>;
	private stateHistory: Map<string, StateChange[]>;
	private stateVersions: Map<string, number>;

	constructor() {
		this.states = new Map();
		this.stateHistory = new Map();
		this.stateVersions = new Map();
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

		// 使用轻量级工具更新初始状态
		const updatedStateProps = updateNestedState(state.toProps(), 'data', (draft) => {
			Object.assign(draft, initialState);
		});

		const updatedState = ThreadWorkflowState.fromProps(updatedStateProps);
		this.states.set(threadId, updatedState);
		this.stateVersions.set(threadId, 0);

		// 记录初始化历史
		if (options.recordHistory !== false) {
			this.recordStateChange(threadId, 'initialize', {}, updatedState.data);
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

		// 使用轻量级工具更新状态
		const updatedData = updateNestedState(currentState.toProps(), 'data', (draft) => {
			Object.assign(draft, updates);
		});
		const nextStateProps = updateState(updatedData, (draft) => {
			draft.updatedAt = Timestamp.now();
		});

		// 创建新的状态实例
		const nextState = ThreadWorkflowState.fromProps(nextStateProps);

		// 保存更新后的状态
		this.states.set(threadId, nextState);
		this.stateVersions.set(threadId, currentVersion + 1);

		// 记录变更历史
		if (options.recordHistory !== false) {
			this.recordStateChange(threadId, 'update', currentState.data, nextState.data, updates);
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

		// 使用轻量级工具更新状态
		const nextStateProps = updateState(currentState.toProps(), (draft) => {
			draft.currentNodeId = nodeId;
			draft.updatedAt = Timestamp.now();
		});

		// 创建新的状态实例
		const nextState = ThreadWorkflowState.fromProps(nextStateProps);

		// 保存更新后的状态
		this.states.set(threadId, nextState);
		this.stateVersions.set(threadId, currentVersion + 1);

		// 记录变更历史
		if (options.recordHistory !== false) {
			this.recordStateChange(threadId, 'set_current_node', currentState.data, nextState.data);
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
	 * 设置单个数据项
	 * @param threadId 线程ID
	 * @param key 键名
	 * @param value 键值
	 * @param options 更新选项
	 * @returns 更新后的状态
	 */
	setData(threadId: string, key: string, value: any, options: StateUpdateOptions = {}): ThreadWorkflowState {
		const currentState = this.states.get(threadId);

		if (!currentState) {
			throw new Error(`线程 ${threadId} 的状态不存在`);
		}

		const currentVersion = this.stateVersions.get(threadId) || 0;

		// 使用轻量级工具更新状态
		const updatedData = updateNestedState(currentState.toProps(), 'data', (draft) => {
			draft[key] = value;
		});
		const nextStateProps = updateState(updatedData, (draft) => {
			draft.updatedAt = Timestamp.now();
		});

		// 创建新的状态实例
		const nextState = ThreadWorkflowState.fromProps(nextStateProps);

		// 保存更新后的状态
		this.states.set(threadId, nextState);
		this.stateVersions.set(threadId, currentVersion + 1);

		// 记录变更历史
		if (options.recordHistory !== false) {
			this.recordStateChange(threadId, 'update', currentState.data, nextState.data, { [key]: value });
		}

		return nextState;
	}

	/**
	 * 批量设置数据
	 * @param threadId 线程ID
	 * @param data 数据对象
	 * @param options 更新选项
	 * @returns 更新后的状态
	 */
	setDataBatch(threadId: string, data: Record<string, any>, options: StateUpdateOptions = {}): ThreadWorkflowState {
		const currentState = this.states.get(threadId);

		if (!currentState) {
			throw new Error(`线程 ${threadId} 的状态不存在`);
		}

		const currentVersion = this.stateVersions.get(threadId) || 0;

		// 使用轻量级工具更新状态
		const updatedData = updateNestedState(currentState.toProps(), 'data', (draft) => {
			Object.assign(draft, data);
		});
		const nextStateProps = updateState(updatedData, (draft) => {
			draft.updatedAt = Timestamp.now();
		});

		// 创建新的状态实例
		const nextState = ThreadWorkflowState.fromProps(nextStateProps);

		// 保存更新后的状态
		this.states.set(threadId, nextState);
		this.stateVersions.set(threadId, currentVersion + 1);

		// 记录变更历史
		if (options.recordHistory !== false) {
			this.recordStateChange(threadId, 'update', currentState.data, nextState.data, data);
		}

		return nextState;
	}

	/**
	 * 删除数据项
	 * @param threadId 线程ID
	 * @param key 键名
	 * @param options 更新选项
	 * @returns 更新后的状态
	 */
	deleteData(threadId: string, key: string, options: StateUpdateOptions = {}): ThreadWorkflowState {
		const currentState = this.states.get(threadId);

		if (!currentState) {
			throw new Error(`线程 ${threadId} 的状态不存在`);
		}

		const currentVersion = this.stateVersions.get(threadId) || 0;

		// 使用轻量级工具更新状态
		const updatedData = updateNestedState(currentState.toProps(), 'data', (draft) => {
			delete draft[key];
		});
		const nextStateProps = updateState(updatedData, (draft) => {
			draft.updatedAt = Timestamp.now();
		});

		// 创建新的状态实例
		const nextState = ThreadWorkflowState.fromProps(nextStateProps);

		// 保存更新后的状态
		this.states.set(threadId, nextState);
		this.stateVersions.set(threadId, currentVersion + 1);

		// 记录变更历史
		if (options.recordHistory !== false) {
			this.recordStateChange(threadId, 'update', currentState.data, nextState.data);
		}

		return nextState;
	}

	/**
	 * 添加执行历史记录
	 * @param threadId 线程ID
	 * @param history 执行历史
	 * @param options 更新选项
	 * @returns 更新后的状态
	 */
	addHistory(threadId: string, history: ExecutionHistory, options: StateUpdateOptions = {}): ThreadWorkflowState {
		const currentState = this.states.get(threadId);

		if (!currentState) {
			throw new Error(`线程 ${threadId} 的状态不存在`);
		}

		const currentVersion = this.stateVersions.get(threadId) || 0;

		// 使用轻量级工具更新状态
		const updatedHistory = updateNestedState(currentState.toProps(), 'history', (draft) => {
			draft.push(history);
		});
		const nextStateProps = updateState(updatedHistory, (draft) => {
			draft.updatedAt = Timestamp.now();
		});

		// 创建新的状态实例
		const nextState = ThreadWorkflowState.fromProps(nextStateProps);

		// 保存更新后的状态
		this.states.set(threadId, nextState);
		this.stateVersions.set(threadId, currentVersion + 1);

		// 记录变更历史
		if (options.recordHistory !== false) {
			this.recordStateChange(threadId, 'add_history', currentState.data, nextState.data);
		}

		return nextState;
	}

	/**
	 * 批量添加执行历史记录
	 * @param threadId 线程ID
	 * @param histories 执行历史数组
	 * @param options 更新选项
	 * @returns 更新后的状态
	 */
	addHistoryBatch(threadId: string, histories: ExecutionHistory[], options: StateUpdateOptions = {}): ThreadWorkflowState {
		const currentState = this.states.get(threadId);

		if (!currentState) {
			throw new Error(`线程 ${threadId} 的状态不存在`);
		}

		const currentVersion = this.stateVersions.get(threadId) || 0;

		// 使用轻量级工具更新状态
		const updatedHistory = updateNestedState(currentState.toProps(), 'history', (draft) => {
			draft.push(...histories);
		});
		const nextStateProps = updateState(updatedHistory, (draft) => {
			draft.updatedAt = Timestamp.now();
		});

		// 创建新的状态实例
		const nextState = ThreadWorkflowState.fromProps(nextStateProps);

		// 保存更新后的状态
		this.states.set(threadId, nextState);
		this.stateVersions.set(threadId, currentVersion + 1);

		// 记录变更历史
		if (options.recordHistory !== false) {
			this.recordStateChange(threadId, 'add_history', currentState.data, nextState.data);
		}

		return nextState;
	}

	/**
	 * 设置元数据
	 * @param threadId 线程ID
	 * @param key 键名
	 * @param value 键值
	 * @param options 更新选项
	 * @returns 更新后的状态
	 */
	setMetadata(threadId: string, key: string, value: any, options: StateUpdateOptions = {}): ThreadWorkflowState {
		const currentState = this.states.get(threadId);

		if (!currentState) {
			throw new Error(`线程 ${threadId} 的状态不存在`);
		}

		const currentVersion = this.stateVersions.get(threadId) || 0;

		// 使用轻量级工具更新状态
		const updatedMetadata = updateNestedState(currentState.toProps(), 'metadata', (draft) => {
			draft[key] = value;
		});
		const nextStateProps = updateState(updatedMetadata, (draft) => {
			draft.updatedAt = Timestamp.now();
		});

		// 创建新的状态实例
		const nextState = ThreadWorkflowState.fromProps(nextStateProps);

		// 保存更新后的状态
		this.states.set(threadId, nextState);
		this.stateVersions.set(threadId, currentVersion + 1);

		// 记录变更历史
		if (options.recordHistory !== false) {
			this.recordStateChange(threadId, 'set_metadata', currentState.data, nextState.data);
		}

		return nextState;
	}

	/**
	 * 批量设置元数据
	 * @param threadId 线程ID
	 * @param metadata 元数据对象
	 * @param options 更新选项
	 * @returns 更新后的状态
	 */
	setMetadataBatch(threadId: string, metadata: Record<string, any>, options: StateUpdateOptions = {}): ThreadWorkflowState {
		const currentState = this.states.get(threadId);

		if (!currentState) {
			throw new Error(`线程 ${threadId} 的状态不存在`);
		}

		const currentVersion = this.stateVersions.get(threadId) || 0;

		// 使用轻量级工具更新状态
		const updatedMetadata = updateNestedState(currentState.toProps(), 'metadata', (draft) => {
			Object.assign(draft, metadata);
		});
		const nextStateProps = updateState(updatedMetadata, (draft) => {
			draft.updatedAt = Timestamp.now();
		});

		// 创建新的状态实例
		const nextState = ThreadWorkflowState.fromProps(nextStateProps);

		// 保存更新后的状态
		this.states.set(threadId, nextState);
		this.stateVersions.set(threadId, currentVersion + 1);

		// 记录变更历史
		if (options.recordHistory !== false) {
			this.recordStateChange(threadId, 'set_metadata', currentState.data, nextState.data);
		}

		return nextState;
	}

	/**
	 * 清除状态
	 * @param threadId 线程ID
	 */
	clearState(threadId: string): void {
		this.states.delete(threadId);
		this.stateVersions.delete(threadId);
		this.stateHistory.delete(threadId);
	}

	/**
	 * 清除所有状态
	 */
	clearAllStates(): void {
		this.states.clear();
		this.stateVersions.clear();
		this.stateHistory.clear();
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