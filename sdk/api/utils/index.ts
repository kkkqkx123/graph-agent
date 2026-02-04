/**
 * 工具函数入口文件
 * 导出所有工具函数和类型
 */

// Result类型
export { ok, err, tryCatch, tryCatchAsync, all, any } from './result';
export type { Result, Ok, Err } from './result';

// Observable类型
export {
  Observable,
  Observer,
  Subscription,
  ObservableImpl,
  of,
  fromPromise,
  fromArray,
  create,
  map,
  filter,
  flatMap,
  distinctUntilChanged,
  throttleTime,
  debounceTime,
  catchError,
  retry,
  delay,
  interval,
  timer,
  merge,
  concat,
  combineLatest,
  take,
  skip,
  scan,
  reduce,
  last,
  first
} from './observable';
export type { OperatorFunction } from './observable';