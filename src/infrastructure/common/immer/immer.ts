import {
	IProduce,
	IProduceWithPatches,
	Immer,
	Draft,
	Immutable
} from "./internal"

export {
	Draft,
	WritableDraft,
	Immutable,
	Patch,
	PatchListener,
	Producer,
	original,
	current,
	isDraft,
	isDraftable,
	NOTHING as nothing,
	DRAFTABLE as immerable,
	freeze
} from "./internal"

const immer = new Immer()

/**
 * The `produce` function takes a value and a "recipe function" (whose
 * return value often depends on the base state). The recipe function is
 * free to mutate its first argument however it wants. All mutations are
 * only ever applied to a __copy__ of the base state.
 *
 * Pass only a function to create a "curried producer" which relieves you
 * from passing the recipe function every time.
 *
 * Only plain objects and arrays are made mutable. All other objects are
 * considered uncopyable.
 *
 * Note: This function is __bound__ to its `Immer` instance.
 *
 * @param {any} base - the initial state
 * @param {Function} producer - function that receives a proxy of the base state as first argument and which can be freely modified
 * @param {Function} patchListener - optional function that will be called with all the patches produced here
 * @returns {any} a new state, or the initial state if nothing was modified
 */
export const produce: IProduce = /* @__PURE__ */ immer.produce

/**
 * Like `produce`, but `produceWithPatches` always returns a tuple
 * [nextState, patches, inversePatches] (instead of just the next state)
 */
export const produceWithPatches: IProduceWithPatches = /* @__PURE__ */ immer.produceWithPatches.bind(
	immer
)

/**
 * Pass true to automatically freeze all copies created by Immer.
 *
 * Always freeze by default, even in production mode
 */
export const setAutoFreeze = /* @__PURE__ */ immer.setAutoFreeze.bind(immer)

/**
 * Apply an array of Immer patches to the first argument.
 *
 * This function is a producer, which means copy-on-write is in effect.
 */
export const applyPatches = /* @__PURE__ */ immer.applyPatches.bind(immer)

export {Immer}

export {enablePatches} from "./plugins/patches"
export {enableMapSet} from "./plugins/mapset"
