/**
 * Immer 精简实现
 * 
 * 只保留项目实际需要的功能：
 * - produceWithPatches
 * - 补丁生成
 * - Map/Set 支持
 * - 自动冻结
 * 
 * 移除的功能：
 * - 复杂的插件系统
 * - 复杂的作用域管理
 * - current() 快照功能
 * - 未使用的配置选项
 */

// ==================== 类型定义 ====================

export interface Patch {
	op: "replace" | "remove" | "add"
	path: (string | number)[]
	value?: any
}

export type PatchListener = (patches: Patch[], inversePatches: Patch[]) => void
export type PatchPath = (string | number)[]

type PrimitiveType = number | string | boolean
type AtomicObject = Function | Promise<any> | Date | RegExp

export type Draft<T> = T extends PrimitiveType
	? T
	: T extends AtomicObject
	? T
	: T extends ReadonlyMap<infer K, infer V>
	? Map<Draft<K>, Draft<V>>
	: T extends ReadonlySet<infer V>
	? Set<Draft<V>>
	: T extends object
	? {-readonly [K in keyof T]: T[K] extends object ? Draft<T[K]> : T[K]}
	: T

export type Objectish = object | any[] | Map<any, any> | Set<any>

export type StrictMode = boolean | "class_only"

// ==================== Immer 类定义（前向声明） ====================

export class Immer {
	autoFreeze_: boolean = true
	useStrictShallowCopy_: StrictMode = false
	useStrictIteration_: boolean = false

	constructor(config?: {
		autoFreeze?: boolean
		useStrictShallowCopy?: StrictMode
		useStrictIteration?: boolean
	}) {
		if (config?.autoFreeze !== undefined) this.setAutoFreeze(config!.autoFreeze)
		if (config?.useStrictShallowCopy !== undefined)
			this.setUseStrictShallowCopy(config!.useStrictShallowCopy)
		if (config?.useStrictIteration !== undefined)
			this.setUseStrictIteration(config!.useStrictIteration)
	}

	produceWithPatches(base: any, recipe?: any): any {
		let patches: Patch[], inversePatches: Patch[]
		const result = this.produce(base, recipe, (p: Patch[], ip: Patch[]) => {
			patches = p
			inversePatches = ip
		})
		return [result, patches!, inversePatches!]
	}

	setAutoFreeze(value: boolean) {
		this.autoFreeze_ = value
	}

	setUseStrictShallowCopy(value: StrictMode) {
		this.useStrictShallowCopy_ = value
	}

	setUseStrictIteration(value: boolean) {
		this.useStrictIteration_ = value
	}

	shouldUseStrictIteration(): boolean {
		return this.useStrictIteration_
	}

	private produce(base: any, recipe: any, patchListener?: any): any {
		if (!isFunction(recipe)) {
			throw new Error("[Immer] The first or second argument to `produce` must be a function")
		}
		if (patchListener !== undefined && !isFunction(patchListener)) {
			throw new Error("[Immer] The third argument to `produce` must be a function or undefined")
		}

		let result

		if (isDraftable(base)) {
			const scope = enterScope(this)
			const proxy = createProxy(scope, base, undefined)
			let hasError = true
			try {
				result = recipe(proxy)
				hasError = false
			} finally {
				if (hasError) revokeScope(scope)
				else leaveScope(scope)
			}
			usePatchesInScope(scope, patchListener)
			return processResult(result, scope)
		} else if (!base || typeof base !== "object") {
			result = recipe(base)
			if (result === undefined) result = base
			if (result === NOTHING) result = undefined
			if (this.autoFreeze_) freeze(result, true)
			if (patchListener) {
				const p: Patch[] = []
				const ip: Patch[] = []
				generateReplacementPatches(base, result, {
					patches_: p,
					inversePatches_: ip
				} as ImmerScope)
				patchListener(p, ip)
			}
			return result
		} else {
			throw new Error(`[Immer] produce can only be called on things that are draftable: plain objects, arrays, Map, Set or classes that are marked with '[immerable]: true'. Got '${base}'`)
		}
	}
}

// ==================== 常量 ====================

const DRAFT_STATE = Symbol("immer-state")
const DRAFTABLE = Symbol("immerable")
const NOTHING = Symbol("immer-nothing")

const CONSTRUCTOR = "constructor"
const PROTOTYPE = "prototype"
const CONFIGURABLE = "configurable"
const ENUMERABLE = "enumerable"
const WRITABLE = "writable"
const VALUE = "value"

const enum ArchType {
	Object,
	Array,
	Map,
	Set
}

// ==================== 内部状态类型 ====================

interface ImmerScope {
	patches_?: Patch[]
	inversePatches_?: Patch[]
	canAutoFreeze_: boolean
	drafts_: any[]
	parent_?: ImmerScope
	patchListener_?: PatchListener
	immer_: Immer
	unfinalizedDrafts_: number
	handledSet_: Set<any>
	processedForPatches_: Set<any>
}

interface ImmerBaseState {
	parent_?: ImmerState
	scope_: ImmerScope
	modified_: boolean
	finalized_: boolean
	isManual_: boolean
	assigned_: Map<any, boolean> | undefined
	key_?: string | number | symbol
	callbacks_: ((scope: ImmerScope) => void)[]
}

interface ProxyObjectState extends ImmerBaseState {
	type_: ArchType.Object
	base_: any
	copy_: any
	draft_: any
}

interface ProxyArrayState extends ImmerBaseState {
	type_: ArchType.Array
	base_: any[]
	copy_: any[] | null
	draft_: any
	allIndicesReassigned_?: boolean
}

interface MapState extends ImmerBaseState {
	type_: ArchType.Map
	base_: Map<any, any>
	copy_: Map<any, any> | null
	draft_: any
	drafts_: Map<any, any>
}

interface SetState extends ImmerBaseState {
	type_: ArchType.Set
	base_: Set<any>
	copy_: Set<any> | null
	draft_: any
	drafts_: Map<any, any>
}

type ImmerState = ProxyObjectState | ProxyArrayState | MapState | SetState

type Drafted<Base = any, T extends ImmerState = ImmerState> = {
	[DRAFT_STATE]: T
} & Base

// ==================== 工具函数 ====================

const O = Object

const getPrototypeOf = O.getPrototypeOf

function isDraft(value: any): boolean {
	return !!value && !!value[DRAFT_STATE]
}

function isDraftable(value: any): boolean {
	if (!value) return false
	return (
		isPlainObject(value) ||
		Array.isArray(value) ||
		!!value[DRAFTABLE] ||
		!!value[CONSTRUCTOR]?.[DRAFTABLE] ||
		value instanceof Map ||
		value instanceof Set
	)
}

function isPlainObject(value: any): boolean {
	if (!value || typeof value !== "object") return false
	const proto = getPrototypeOf(value)
	if (proto === null || proto === O[PROTOTYPE]) return true

	const Ctor = O.hasOwnProperty.call(proto, CONSTRUCTOR) && proto[CONSTRUCTOR]
	if (Ctor === Object) return true

	if (typeof Ctor !== "function") return false

	const ctorString = Function.toString.call(Ctor)
	const objectCtorString = O[PROTOTYPE][CONSTRUCTOR].toString()
	return ctorString === objectCtorString
}

function isFunction(target: any): target is Function {
	return typeof target === "function"
}

function getArchtype(thing: any): ArchType {
	const state: undefined | ImmerState = thing[DRAFT_STATE]
	return state
		? state.type_
		: Array.isArray(thing)
		? ArchType.Array
		: thing instanceof Map
		? ArchType.Map
		: thing instanceof Set
		? ArchType.Set
		: ArchType.Object
}

function has(thing: any, prop: PropertyKey, type = getArchtype(thing)): boolean {
	return type === ArchType.Map
		? thing.has(prop)
		: O[PROTOTYPE].hasOwnProperty.call(thing, prop)
}

function get(thing: any, prop: PropertyKey, type = getArchtype(thing)): any {
	return type === ArchType.Map ? thing.get(prop) : thing[prop]
}

function set(thing: any, propOrOldValue: PropertyKey, value: any, type = getArchtype(thing)) {
	if (type === ArchType.Map) thing.set(propOrOldValue, value)
	else if (type === ArchType.Set) {
		thing.add(value)
	} else thing[propOrOldValue] = value
}

function is(x: any, y: any): boolean {
	if (x === y) {
		return x !== 0 || 1 / x === 1 / y
	} else {
		return x !== x && y !== y
	}
}

function latest(state: ImmerState): any {
	return state.copy_ || state.base_
}

function getFinalValue(state: ImmerState): any {
	return state.modified_ ? state.copy_ : state.base_
}

function shallowCopy(base: any, strict: StrictMode) {
	if (base instanceof Map) {
		return new Map(base)
	}
	if (base instanceof Set) {
		return new Set(base)
	}
	if (Array.isArray(base)) return Array[PROTOTYPE].slice.call(base)

	const isPlain = isPlainObject(base)

	if (strict === true || (strict === "class_only" && !isPlain)) {
		const descriptors = O.getOwnPropertyDescriptors(base)
		delete descriptors[DRAFT_STATE as any]
		let keys = Reflect.ownKeys(descriptors)
		for (let i = 0; i < keys.length; i++) {
			const key: any = keys[i]
			const desc = descriptors[key]
			if (!desc) continue
			
			if (desc[WRITABLE] === false) {
				desc[WRITABLE] = true
				desc[CONFIGURABLE] = true
			}
			if (desc.get || desc.set)
				descriptors[key] = {
					[CONFIGURABLE]: true,
					[WRITABLE]: true,
					[ENUMERABLE]: desc[ENUMERABLE],
					[VALUE]: base[key]
				}
		}
		return O.create(getPrototypeOf(base), descriptors)
	} else {
		const proto = getPrototypeOf(base)
		if (proto !== null && isPlain) {
			return {...base}
		}
		const obj = O.create(proto)
		return O.assign(obj, base)
	}
}

function freeze<T>(obj: T, deep: boolean = false): T {
	if (O.isFrozen(obj) || isDraft(obj) || !isDraftable(obj)) return obj
	if (getArchtype(obj) > 1) {
		O.defineProperties(obj, {
			set: dontMutateMethodOverride,
			add: dontMutateMethodOverride,
			clear: dontMutateMethodOverride,
			delete: dontMutateMethodOverride
		})
	}
	O.freeze(obj)
	if (deep) {
		const keys = O.keys(obj as object)
		for (let i = 0; i < keys.length; i++) {
			const key = keys[i]
			if (key !== undefined) {
				freeze((obj as any)[key], true)
			}
		}
	}
	return obj
}

function dontMutateFrozenCollections() {
	throw new Error("[Immer] This object has been frozen and should not be mutated")
}

const dontMutateMethodOverride = {
	[VALUE]: dontMutateFrozenCollections
}

function each(obj: any, iter: (key: string | number, value: any, source: any) => void) {
	if (getArchtype(obj) === ArchType.Object) {
		const keys = O.keys(obj)
		keys.forEach(key => {
			iter(key, obj[key], obj)
		})
	} else {
		obj.forEach((entry: any, index: any) => iter(index, entry, obj))
	}
}

// ==================== 补丁生成 ====================

function generatePatches(
	state: ImmerState,
	basePath: PatchPath,
	patches: Patch[],
	inversePatches: Patch[]
) {
	if (state.scope_.processedForPatches_.has(state)) {
		return
	}

	state.scope_.processedForPatches_.add(state)

	switch (state.type_) {
		case ArchType.Object:
			generatePatchesFromAssigned(state, basePath, patches, inversePatches)
			break
		case ArchType.Array:
			generateArrayPatches(state, basePath, patches, inversePatches)
			break
		case ArchType.Set:
			generateSetPatches(state, basePath, patches, inversePatches)
			break
		case ArchType.Map:
			generatePatchesFromAssigned(state, basePath, patches, inversePatches)
			break
	}
}

function generateArrayPatches(
	state: ProxyArrayState,
	basePath: PatchPath,
	patches: Patch[],
	inversePatches: Patch[]
) {
	let {base_, assigned_} = state
	let copy_ = state.copy_!

	if (copy_.length < base_.length) {
		;[base_, copy_] = [copy_, base_]
		;[patches, inversePatches] = [inversePatches, patches]
	}

	const allReassigned = state.allIndicesReassigned_ === true

	for (let i = 0; i < base_.length; i++) {
		const copiedItem = copy_[i]
		const baseItem = base_[i]

		const isAssigned = allReassigned || assigned_?.get(i.toString())
		if (isAssigned && copiedItem !== baseItem) {
			const path = basePath.concat([i])
			patches.push({
				op: "replace",
				path,
				value: clonePatchValueIfNeeded(copiedItem)
			})
			inversePatches.push({
				op: "replace",
				path,
				value: clonePatchValueIfNeeded(baseItem)
			})
		}
	}

	for (let i = base_.length; i < copy_.length; i++) {
		const path = basePath.concat([i])
		patches.push({
			op: "add",
			path,
			value: clonePatchValueIfNeeded(copy_[i])
		})
	}
	for (let i = copy_.length - 1; base_.length <= i; --i) {
		const path = basePath.concat([i])
		inversePatches.push({
			op: "remove",
			path
		})
	}
}

function generatePatchesFromAssigned(
	state: MapState | ProxyObjectState,
	basePath: PatchPath,
	patches: Patch[],
	inversePatches: Patch[]
) {
	const {base_, copy_, type_} = state
	each(state.assigned_!, (key, assignedValue) => {
		const origValue = get(base_, key, type_)
		const value = get(copy_!, key, type_)
		const op = !assignedValue ? "remove" : has(base_, key) ? "replace" : "add"
		if (origValue === value && op === "replace") return
		const path = basePath.concat(key as any)
		patches.push(
			op === "remove"
				? {op, path}
				: {op, path, value: clonePatchValueIfNeeded(value)}
		)
		inversePatches.push(
			op === "add"
				? {op: "remove", path}
				: op === "remove"
				? {op: "add", path, value: clonePatchValueIfNeeded(origValue)}
				: {op: "replace", path, value: clonePatchValueIfNeeded(origValue)}
		)
	})
}

function generateSetPatches(
	state: SetState,
	basePath: PatchPath,
	patches: Patch[],
	inversePatches: Patch[]
) {
	let {base_, copy_} = state

	let i = 0
	base_.forEach((value: any) => {
		if (!copy_!.has(value)) {
			const path = basePath.concat([i])
			patches.push({
				op: "remove",
				path,
				value
			})
			inversePatches.unshift({
				op: "add",
				path,
				value
			})
		}
		i++
	})
	i = 0
	copy_!.forEach((value: any) => {
		if (!base_.has(value)) {
			const path = basePath.concat([i])
			patches.push({
				op: "add",
				path,
				value
			})
			inversePatches.unshift({
				op: "remove",
				path,
				value
			})
		}
		i++
	})
}

function clonePatchValueIfNeeded<T>(obj: T): T {
	if (isDraft(obj)) {
		return deepClonePatchValue(obj)
	} else return obj
}

function deepClonePatchValue<T>(obj: T): T {
	if (!isDraftable(obj)) return obj
	if (Array.isArray(obj)) return obj.map(deepClonePatchValue) as any
	if (obj instanceof Map)
		return new Map(
			Array.from(obj.entries()).map(([k, v]) => [k, deepClonePatchValue(v)])
		) as any
	if (obj instanceof Set) return new Set(Array.from(obj).map(deepClonePatchValue)) as any
	const cloned = O.create(getPrototypeOf(obj))
	for (const key in obj) cloned[key] = deepClonePatchValue(obj[key])
	if (has(obj as any, DRAFTABLE)) (cloned as any)[DRAFTABLE] = (obj as any)[DRAFTABLE]
	return cloned
}

// ==================== Proxy 实现 ====================

function createProxyProxy<T extends Objectish>(
	base: T,
	parent?: ImmerState
): [Drafted<T, ImmerState>, ImmerState] {
	const baseIsArray = Array.isArray(base)
	const state: ImmerState = {
		type_: baseIsArray ? ArchType.Array : ArchType.Object,
		scope_: parent ? parent.scope_ : getCurrentScope(),
		modified_: false,
		finalized_: false,
		assigned_: undefined,
		parent_: parent,
		base_: base,
		draft_: null as any,
		copy_: null,
		isManual_: false,
		callbacks_: undefined as any
	} as any

	let target: T = state as any
	let traps: ProxyHandler<object | Array<any>> = objectTraps
	if (baseIsArray) {
		target = [state] as any
		traps = arrayTraps
	}

	const {revoke, proxy} = Proxy.revocable(target, traps)
	state.draft_ = proxy as any
	;(state as any).revoke_ = revoke
	return [proxy as any, state]
}

const objectTraps: ProxyHandler<ImmerState> = {
	get(state, prop) {
		if (prop === DRAFT_STATE) return state

		const source = latest(state)
		if (!has(source, prop, state.type_)) {
			return readPropFromProto(state, source, prop)
		}
		const value = source[prop]
		if (state.finalized_ || !isDraftable(value)) {
			return value
		}

		if (value === peek(state.base_, prop)) {
			prepareCopy(state)
			const childKey = state.type_ === ArchType.Array ? +(prop as string) : prop
			const childDraft = createProxy(state.scope_, value, state, childKey)
			return (state.copy_![childKey] = childDraft)
		}
		return value
	},
	has(state, prop) {
		return prop in latest(state)
	},
	ownKeys(state) {
		return Reflect.ownKeys(latest(state))
	},
	set(state: ProxyObjectState, prop: string, value) {
		const desc = getDescriptorFromProto(latest(state), prop)
		if (desc?.set) {
			desc.set.call(state.draft_, value)
			return true
		}
		if (!state.modified_) {
			const current = peek(latest(state), prop)
			const currentState: ProxyObjectState = current?.[DRAFT_STATE]
			if (currentState && currentState.base_ === value) {
				state.copy_![prop] = value
				state.assigned_!.set(prop, false)
				return true
			}
			if (is(value, current) && (value !== undefined || has(state.base_, prop, state.type_)))
				return true
			prepareCopy(state)
			markChanged(state)
		}

		if (
			(state.copy_![prop] === value &&
				(value !== undefined || prop in state.copy_)) ||
			(Number.isNaN(value) && Number.isNaN(state.copy_![prop]))
		)
			return true

		state.copy_![prop] = value
		state.assigned_!.set(prop, true)

		return true
	},
	deleteProperty(state, prop: string) {
		prepareCopy(state)
		if (peek(state.base_, prop) !== undefined || prop in state.base_) {
			state.assigned_!.set(prop, false)
			markChanged(state)
		} else {
			state.assigned_!.delete(prop)
		}
		if (state.copy_) {
			delete state.copy_[prop]
		}
		return true
	},
	getOwnPropertyDescriptor(state, prop) {
		const owner = latest(state)
		const desc = Reflect.getOwnPropertyDescriptor(owner, prop)
		if (!desc) return desc
		return {
			[WRITABLE]: true,
			[CONFIGURABLE]: state.type_ !== ArchType.Array || prop !== "length",
			[ENUMERABLE]: desc[ENUMERABLE],
			[VALUE]: owner[prop]
		}
	},
	defineProperty() {
		throw new Error("[Immer] Object.defineProperty() cannot be used on an Immer draft")
	},
	getPrototypeOf(state) {
		return getPrototypeOf(state.base_)
	},
	setPrototypeOf() {
		throw new Error("[Immer] Object.setPrototypeOf() cannot be used on an Immer draft")
	}
}

const arrayTraps: ProxyHandler<[ProxyArrayState]> = {} as any
for (let key in objectTraps) {
	let fn = objectTraps[key as keyof typeof objectTraps] as Function
	;(arrayTraps as any)[key] = function() {
		const args = arguments
		args[0] = args[0][0]
		return fn.apply(this, args)
	}
}
;(arrayTraps as any).deleteProperty = function(state: any, prop: any) {
	if (isNaN(parseInt(prop as any)))
		throw new Error("[Immer] Immer only supports deleting array indices")
	return (arrayTraps as any).set!.call(this, state, prop, undefined)
}
;(arrayTraps as any).set = function(state: any, prop: any, value: any) {
	if (
		prop !== "length" &&
		isNaN(parseInt(prop as any))
	)
		throw new Error("[Immer] Immer only supports setting array indices and the 'length' property")
	return objectTraps.set!.call(this, state[0], prop, value, state[0])
}

function peek(draft: Drafted, prop: PropertyKey) {
	const state = draft[DRAFT_STATE]
	const source = state ? latest(state) : draft
	return source[prop]
}

function readPropFromProto(state: ImmerState, source: any, prop: PropertyKey) {
	const desc = getDescriptorFromProto(source, prop)
	return desc
		? VALUE in desc
			? desc[VALUE]
			: desc.get?.call(state.draft_)
		: undefined
}

function getDescriptorFromProto(source: any, prop: PropertyKey): PropertyDescriptor | undefined {
	if (!(prop in source)) return undefined
	let proto = getPrototypeOf(source)
	while (proto) {
		const desc = Object.getOwnPropertyDescriptor(proto, prop)
		if (desc) return desc
		proto = getPrototypeOf(proto)
	}
	return undefined
}

function markChanged(state: ImmerState) {
	if (!state.modified_) {
		state.modified_ = true
		if (state.parent_) {
			markChanged(state.parent_)
		}
	}
}

function prepareCopy(state: ImmerState) {
	if (!state.copy_) {
		state.assigned_ = new Map()
		state.copy_ = shallowCopy(
			state.base_,
			state.scope_.immer_.useStrictShallowCopy_
		)
	}
}

// ==================== Map/Set 支持 ====================

function createMapProxy(value: Map<any, any>, parent?: ImmerState): [any, MapState] {
	const state: MapState = {
		type_: ArchType.Map,
		scope_: parent ? parent.scope_ : getCurrentScope(),
		modified_: false,
		finalized_: false,
		assigned_: new Map(),
		parent_: parent,
		base_: value,
		draft_: null as any,
		copy_: null,
		isManual_: false,
		callbacks_: [],
		drafts_: new Map()
	}

	const proxy = new Proxy(value, mapTraps)
	state.draft_ = proxy
	return [proxy, state]
}

function createSetProxy(value: Set<any>, parent?: ImmerState): [any, SetState] {
	const state: SetState = {
		type_: ArchType.Set,
		scope_: parent ? parent.scope_ : getCurrentScope(),
		modified_: false,
		finalized_: false,
		assigned_: new Map(),
		parent_: parent,
		base_: value,
		draft_: null as any,
		copy_: null,
		isManual_: false,
		callbacks_: [],
		drafts_: new Map()
	}

	const proxy = new Proxy(value, setTraps)
	state.draft_ = proxy
	return [proxy, state]
}

const mapTraps: ProxyHandler<Map<any, any>> = {
	get(target, prop) {
		if (prop === DRAFT_STATE) return (target as any)[DRAFT_STATE]
		return Map.prototype[prop as keyof Map<any, any>]
	},
	set(target, prop, value) {
		if (prop === DRAFT_STATE) {
			;(target as any)[DRAFT_STATE] = value
			return true
		}
		return false
	}
}

const setTraps: ProxyHandler<Set<any>> = {
	get(target, prop) {
		if (prop === DRAFT_STATE) return (target as any)[DRAFT_STATE]
		return Set.prototype[prop as keyof Set<any>]
	},
	set(target, prop, value) {
		if (prop === DRAFT_STATE) {
			;(target as any)[DRAFT_STATE] = value
			return true
		}
		return false
	}
}

// ==================== 作用域管理 ====================

let currentScope: ImmerScope | undefined

function getCurrentScope(): ImmerScope {
	return currentScope!
}

function createScope(
	parent_: ImmerScope | undefined,
	immer_: Immer
): ImmerScope {
	return {
		drafts_: [],
		parent_,
		immer_,
		canAutoFreeze_: true,
		unfinalizedDrafts_: 0,
		handledSet_: new Set(),
		processedForPatches_: new Set()
	}
}

function enterScope(immer: Immer): ImmerScope {
	currentScope = createScope(currentScope, immer)
	return currentScope
}

function leaveScope(scope: ImmerScope) {
	if (scope === currentScope) {
		currentScope = scope.parent_
	}
}

function revokeScope(scope: ImmerScope) {
	leaveScope(scope)
	scope.drafts_.forEach(revokeDraft)
	scope.drafts_ = null as any
}

function revokeDraft(draft: Drafted) {
	const state: ImmerState = draft[DRAFT_STATE]
	if (state.type_ === ArchType.Object || state.type_ === ArchType.Array) {
		;(state as any).revoke_()
	}
	// Map/Set don't need revoke in this simplified version
}

function usePatchesInScope(scope: ImmerScope, patchListener?: PatchListener) {
	if (patchListener) {
		scope.patches_ = []
		scope.inversePatches_ = []
		scope.patchListener_ = patchListener
	}
}

// ==================== 最终化 ====================

function processResult(result: any, scope: ImmerScope) {
	scope.unfinalizedDrafts_ = scope.drafts_.length
	const baseDraft = scope.drafts_![0]
	const isReplaced = result !== undefined && result !== baseDraft

	if (isReplaced) {
		if (baseDraft[DRAFT_STATE].modified_) {
			revokeScope(scope)
			throw new Error("[Immer] An immer producer returned a new value *and* modified its draft")
		}
		if (isDraftable(result)) {
			result = finalize(scope, result)
		}
		if (scope.patches_) {
			generateReplacementPatches(
				baseDraft[DRAFT_STATE].base_,
				result,
				scope
			)
		}
	} else {
		result = finalize(scope, baseDraft)
	}

	maybeFreeze(scope, result, true)

	revokeScope(scope)
	if (scope.patches_) {
		scope.patchListener_!(scope.patches_, scope.inversePatches_!)
	}
	return result !== NOTHING ? result : undefined
}

function finalize(rootScope: ImmerScope, value: any) {
	if (O.isFrozen(value)) return value

	const state: ImmerState = value[DRAFT_STATE]
	if (!state) {
		return handleValue(value, rootScope.handledSet_, rootScope)
	}

	if (state.scope_ !== rootScope) {
		return value
	}

	if (!state.modified_) {
		return state.base_
	}

	if (!state.finalized_) {
		const {callbacks_} = state
		if (callbacks_) {
			while (callbacks_.length > 0) {
				const callback = callbacks_.pop()!
				callback(rootScope)
			}
		}

		generatePatchesAndFinalize(state, rootScope)
	}

	return state.copy_
}

function maybeFreeze(scope: ImmerScope, value: any, deep = false) {
	if (!scope.parent_ && scope.immer_.autoFreeze_ && scope.canAutoFreeze_) {
		freeze(value, deep)
	}
}

function generatePatchesAndFinalize(state: ImmerState, rootScope: ImmerScope) {
	const shouldFinalize =
		state.modified_ &&
		!state.finalized_ &&
		(state.type_ === ArchType.Set ||
			(state.type_ === ArchType.Array &&
				(state as ProxyArrayState).allIndicesReassigned_) ||
			(state.assigned_?.size ?? 0) > 0)

	if (shouldFinalize) {
		if (rootScope.patches_) {
			generatePatches(state, [], rootScope.patches_!, rootScope.inversePatches_!)
		}
		state.finalized_ = true
		rootScope.unfinalizedDrafts_--
	}
}

function handleValue(
	target: any,
	handledSet: Set<any>,
	rootScope: ImmerScope
) {
	if (!rootScope.immer_.autoFreeze_ && rootScope.unfinalizedDrafts_ < 1) {
		return target
	}

	if (
		isDraft(target) ||
		handledSet.has(target) ||
		!isDraftable(target) ||
		O.isFrozen(target)
	) {
		return target
	}

	handledSet.add(target)

	each(target, (key, value) => {
		if (isDraft(value)) {
			const state: ImmerState = value[DRAFT_STATE]
			if (state.scope_ === rootScope) {
				const updatedValue = getFinalValue(state)
				set(target, key, updatedValue, target.type_)
				state.finalized_ = true
				rootScope.unfinalizedDrafts_--
			}
		} else if (isDraftable(value)) {
			handleValue(value, handledSet, rootScope)
		}
	})

	return target
}

function generateReplacementPatches(
	baseValue: any,
	replacement: any,
	scope: ImmerScope
) {
	scope.patches_!.push({
		op: "replace",
		path: [],
		value: replacement === NOTHING ? undefined : replacement
	})
	scope.inversePatches_!.push({
		op: "replace",
		path: [],
		value: baseValue
	})
}

// ==================== 创建 Proxy ====================

function createProxy<T extends object | any[] | Map<any, any> | Set<any>>(
	rootScope: ImmerScope,
	value: T,
	parent?: ImmerState,
	key?: string | number | symbol
): Drafted<T, ImmerState> {
	const [draft, state] = value instanceof Map
		? createMapProxy(value, parent)
		: value instanceof Set
		? createSetProxy(value, parent)
		: createProxyProxy(value, parent)

	const scope = parent?.scope_ ?? getCurrentScope()
	scope.drafts_.push(draft)

	state.callbacks_ = parent?.callbacks_ ?? []
	state.key_ = key

	if (parent && key !== undefined) {
		parent.callbacks_.push(function childCleanup(rootScope) {
			const childState: ImmerState = state

			if (childState.scope_ !== rootScope) {
				return
			}

			const finalizedValue = getFinalValue(childState)
			const parentCopy = latest(parent)
			set(parentCopy, key, finalizedValue, parent.type_)

			generatePatchesAndFinalize(childState, rootScope)
		})
	} else {
		state.callbacks_.push(function rootDraftCleanup(rootScope) {
			const {patches_, inversePatches_} = rootScope

			if (state.modified_ && patches_) {
				generatePatches(state, [], patches_, inversePatches_!)
			}
		})
	}

	return draft as any
}

// ==================== Immer 类 ====================

// ==================== 导出 ====================

const immer = new Immer()

export const produceWithPatches = immer.produceWithPatches.bind(immer)

export const setAutoFreeze = immer.setAutoFreeze.bind(immer)

export function enablePatches() {
	// Patches are always enabled in this simplified version
}

export function enableMapSet() {
	// Map/Set are always enabled in this simplified version
}

// Immer 类已在前面定义并导出