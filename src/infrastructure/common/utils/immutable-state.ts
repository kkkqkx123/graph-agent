/**
 * 轻量级不可变状态更新工具
 *
 * 专为项目需求定制，避免Immer的复杂性
 * 提供高性能的不可变状态更新，无Proxy开销
 */

/**
 * 更新状态对象（浅拷贝）
 * @param base 基础状态对象
 * @param updater 更新函数
 * @returns 新的不可变状态对象
 */
export function updateState<T extends Record<string, any>>(
	base: T,
	updater: (draft: { -readonly [K in keyof T]: T[K] }) => void
): T {
	// 创建浅拷贝
	const copy = { ...base } as { -readonly [K in keyof T]: T[K] };
	// 允许修改
	updater(copy);
	// 冻结对象
	return deepFreeze(copy as T);
}

/**
 * 更新嵌套状态对象
 * @param base 基础状态对象
 * @param key 要更新的嵌套属性键
 * @param updater 更新函数
 * @returns 新的不可变状态对象
 */
export function updateNestedState<T extends Record<string, any>, K extends keyof T>(
	base: T,
	key: K,
	updater: (draft: { -readonly [P in keyof T[K]]: T[K][P] }) => void
): T {
	// 创建嵌套对象的浅拷贝
	const nestedCopy = { ...base[key] } as { -readonly [P in keyof T[K]]: T[K][P] };
	// 允许修改嵌套对象
	updater(nestedCopy);
	// 返回新的不可变状态对象
	return deepFreeze({
		...base,
		[key]: deepFreeze(nestedCopy as T[K])
	} as T);
}

/**
 * 更新数组
 * @param base 基础数组
 * @param updater 更新函数
 * @returns 新的不可变数组
 */
export function updateArray<T>(base: T[], updater: (draft: T[]) => void): T[] {
	// 创建数组拷贝
	const copy = [...base];
	// 允许修改数组
	updater(copy);
	// 冻结数组及其元素
	return deepFreeze(copy);
}

/**
 * 深度冻结对象
 * @param obj 要冻结的对象
 * @returns 冻结后的对象
 */
function deepFreeze<T>(obj: T): T {
	if (obj === null || typeof obj !== 'object') {
		return obj;
	}

	if (Array.isArray(obj)) {
		obj.forEach(item => deepFreeze(item));
		return Object.freeze(obj) as T;
	}

	Object.keys(obj).forEach(key => {
		deepFreeze((obj as any)[key]);
	});

	return Object.freeze(obj);
}

/**
 * 创建新的状态对象（工厂函数）
 * @param props 状态属性
 * @returns 冻结的状态对象
 */
export function createImmutableState<T extends Record<string, any>>(props: T): T {
	return deepFreeze(props);
}