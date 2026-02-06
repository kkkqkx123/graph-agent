/**
 * Observable - 响应式事件流实现
 * 提供轻量级的 Observable 接口，支持创建和订阅事件流
 */

/**
 * 订阅者接口
 */
export interface Subscription {
  /** 取消订阅 */
  unsubscribe(): void;
  /** 是否已取消订阅 */
  readonly closed: boolean;
}

/**
 * 观察者接口
 */
export interface Observer<T> {
  /** 接收下一个值 */
  next(value: T): void;
  /** 接收错误 */
  error(error: any): void;
  /** 接收完成通知 */
  complete(): void;
}

/**
 * Observable接口
 */
export interface Observable<T> {
  /** 订阅Observable */
  subscribe(observer: Observer<T>): Subscription;
  /** 订阅Observable（简化版） */
  subscribe(
    next?: (value: T) => void,
    error?: (error: any) => void,
    complete?: () => void
  ): Subscription;
  /** 管道操作符（为未来扩展保留） */
  pipe<R>(...operators: OperatorFunction<T, R>[]): Observable<R>;
}

/**
 * 操作符函数类型（为未来扩展保留）
 */
export type OperatorFunction<T, R> = (source: Observable<T>) => Observable<R>;

/**
 * Observable实现类
 */
export class ObservableImpl<T> implements Observable<T> {
  private _subscribe: (observer: Observer<T>) => TeardownLogic;

  constructor(subscribe: (observer: Observer<T>) => TeardownLogic) {
    this._subscribe = subscribe;
  }

  /**
   * 订阅Observable
   */
  subscribe(observer: Observer<T>): Subscription;
  subscribe(
    next?: (value: T) => void,
    error?: (error: any) => void,
    complete?: () => void
  ): Subscription;
  subscribe(
    observerOrNext?: Observer<T> | ((value: T) => void),
    error?: (error: any) => void,
    complete?: () => void
  ): Subscription {
    const observer: Observer<T> =
      typeof observerOrNext === 'function'
        ? {
            next: observerOrNext,
            error: error || ((err) => console.error('Observable error:', err)),
            complete: complete || (() => {})
          }
        : observerOrNext!;

    let unsubscribed = false;
    const teardowns: TeardownLogic[] = [];

    const safeObserver: Observer<T> = {
      next: (value: T) => {
        if (!unsubscribed) {
          try {
            observer.next(value);
          } catch (err) {
            safeObserver.error(err);
          }
        }
      },
      error: (err: any) => {
        if (!unsubscribed) {
          unsubscribed = true;
          try {
            observer.error(err);
          } catch (err) {
            console.error('Error in error handler:', err);
          }
          this.unsubscribeAll(teardowns);
        }
      },
      complete: () => {
        if (!unsubscribed) {
          unsubscribed = true;
          try {
            observer.complete();
          } catch (err) {
            console.error('Error in complete handler:', err);
          }
          this.unsubscribeAll(teardowns);
        }
      }
    };

    try {
      const teardown = this._subscribe(safeObserver);
      if (teardown) {
        teardowns.push(teardown);
      }
    } catch (err) {
      safeObserver.error(err);
    }

    return {
      unsubscribe: () => {
        if (!unsubscribed) {
          unsubscribed = true;
          this.unsubscribeAll(teardowns);
        }
      },
      get closed() {
        return unsubscribed;
      }
    };
  }

  /**
   * 管道操作符（为未来扩展保留）
   */
  pipe<R>(...operators: OperatorFunction<T, R>[]): Observable<R> {
    return operators.reduce((obs, op) => op(obs), this as any);
  }

  /**
   * 取消所有清理函数
   */
  private unsubscribeAll(teardowns: TeardownLogic[]): void {
    for (const teardown of teardowns) {
      try {
        if (typeof teardown === 'function') {
          teardown();
        } else if (teardown && typeof teardown.unsubscribe === 'function') {
          teardown.unsubscribe();
        }
      } catch (err) {
        console.error('Error during teardown:', err);
      }
    }
    teardowns.length = 0;
  }
}

/**
 * 清理逻辑类型
 */
type TeardownLogic = (() => void) | Subscription | undefined;

/**
 * 创建可手动控制的Observable
 */
export function create<T>(subscribe: (observer: Observer<T>) => TeardownLogic): Observable<T> {
  return new ObservableImpl(subscribe);
}