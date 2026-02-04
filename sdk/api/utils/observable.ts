/**
 * Observable - 响应式事件流实现
 * 提供类似RxJS的Observable接口，支持过滤、映射、订阅等操作
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
  /** 管道操作符 */
  pipe<R>(...operators: OperatorFunction<T, R>[]): Observable<R>;
}

/**
 * 操作符函数类型
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
   * 管道操作符
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
 * 创建Observable
 */
export function of<T>(...values: T[]): Observable<T> {
  return new ObservableImpl((observer) => {
    for (const value of values) {
      observer.next(value);
    }
    observer.complete();
    return () => {};
  });
}

/**
 * 从Promise创建Observable
 */
export function fromPromise<T>(promise: Promise<T>): Observable<T> {
  return new ObservableImpl((observer) => {
    promise
      .then((value) => {
        observer.next(value);
        observer.complete();
      })
      .catch((error) => {
        observer.error(error);
      });
    return () => {};
  });
}

/**
 * 从数组创建Observable
 */
export function fromArray<T>(array: T[]): Observable<T> {
  return new ObservableImpl((observer) => {
    for (const value of array) {
      observer.next(value);
    }
    observer.complete();
    return () => {};
  });
}

/**
 * 创建可手动控制的Observable
 */
export function create<T>(subscribe: (observer: Observer<T>) => TeardownLogic): Observable<T> {
  return new ObservableImpl(subscribe);
}

/**
 * 映射操作符
 */
export function map<T, R>(fn: (value: T) => R): OperatorFunction<T, R> {
  return (source) =>
    create((observer) => {
      const subscription = source.subscribe({
        next: (value) => observer.next(fn(value)),
        error: (err) => observer.error(err),
        complete: () => observer.complete()
      });
      return {
        unsubscribe: () => subscription.unsubscribe(),
        get closed() { return subscription.closed; }
      };
    });
}

/**
 * 过滤操作符
 */
export function filter<T>(predicate: (value: T) => boolean): OperatorFunction<T, T> {
  return (source) =>
    create((observer) => {
      return source.subscribe({
        next: (value) => {
          if (predicate(value)) {
            observer.next(value);
          }
        },
        error: (err) => observer.error(err),
        complete: () => observer.complete()
      });
    });
}

/**
 * 扁平映射操作符
 */
export function flatMap<T, R>(fn: (value: T) => Observable<R>): OperatorFunction<T, R> {
  return (source) =>
    create((observer) => {
      let active = 0;
      let completed = false;
      const subscriptions: Subscription[] = [];

      const sourceSubscription = source.subscribe({
        next: (value) => {
          active++;
          const inner = fn(value);
          const innerSubscription = inner.subscribe({
            next: (innerValue) => observer.next(innerValue),
            error: (err) => observer.error(err),
            complete: () => {
              active--;
              if (active === 0 && completed) {
                observer.complete();
              }
            }
          });
          subscriptions.push(innerSubscription);
        },
        error: (err) => observer.error(err),
        complete: () => {
          completed = true;
          if (active === 0) {
            observer.complete();
          }
        }
      });

      return {
        unsubscribe: () => {
          sourceSubscription.unsubscribe();
          subscriptions.forEach((sub) => sub.unsubscribe());
        },
        get closed() {
          return sourceSubscription.closed;
        }
      };
    });
}

/**
 * 去重操作符
 */
export function distinctUntilChanged<T>(compareFn?: (a: T, b: T) => boolean): OperatorFunction<T, T> {
  return (source) =>
    create((observer) => {
      let hasValue = false;
      let lastValue: T;

      const subscription = source.subscribe({
        next: (value) => {
          if (!hasValue || (compareFn ? !compareFn(lastValue, value) : lastValue !== value)) {
            hasValue = true;
            lastValue = value;
            observer.next(value);
          }
        },
        error: (err) => observer.error(err),
        complete: () => observer.complete()
      });
      return {
        unsubscribe: () => subscription.unsubscribe(),
        get closed() { return subscription.closed; }
      };
    });
}

/**
 * 节流操作符
 */
export function throttleTime<T>(duration: number): OperatorFunction<T, T> {
  return (source) =>
    create((observer) => {
      let lastTime = 0;
      let timeoutId: NodeJS.Timeout | null = null;

      return source.subscribe({
        next: (value) => {
          const now = Date.now();
          if (now - lastTime >= duration) {
            lastTime = now;
            observer.next(value);
          } else {
            if (timeoutId) {
              clearTimeout(timeoutId);
            }
            timeoutId = setTimeout(() => {
              lastTime = Date.now();
              observer.next(value);
            }, duration - (now - lastTime));
          }
        },
        error: (err) => observer.error(err),
        complete: () => {
          if (timeoutId) {
            clearTimeout(timeoutId);
          }
          observer.complete();
        }
      });
    });
}

/**
 * 防抖操作符
 */
export function debounceTime<T>(duration: number): OperatorFunction<T, T> {
  return (source) =>
    create((observer) => {
      let timeoutId: NodeJS.Timeout | null = null;

      return source.subscribe({
        next: (value) => {
          if (timeoutId) {
            clearTimeout(timeoutId);
          }
          timeoutId = setTimeout(() => {
            observer.next(value);
          }, duration);
        },
        error: (err) => observer.error(err),
        complete: () => {
          if (timeoutId) {
            clearTimeout(timeoutId);
          }
          observer.complete();
        }
      });
    });
}

/**
 * 捕获错误操作符
 */
export function catchError<T, R>(fn: (error: any) => Observable<R>): OperatorFunction<T, T | R> {
  return (source) =>
    create((observer) => {
      return source.subscribe({
        next: (value) => observer.next(value),
        error: (err) => {
          const handler = fn(err);
          handler.subscribe({
            next: (value) => observer.next(value),
            error: (err) => observer.error(err),
            complete: () => observer.complete()
          });
        },
        complete: () => observer.complete()
      });
    });
}

/**
 * 重试操作符
 */
export function retry<T>(count: number): OperatorFunction<T, T> {
  return (source) =>
    create((observer) => {
      let attempts = 0;
      let subscription: Subscription | null = null;

      const subscribe = () => {
        subscription = source.subscribe({
          next: (value) => observer.next(value),
          error: (err) => {
            attempts++;
            if (attempts <= count) {
              subscribe();
            } else {
              observer.error(err);
            }
          },
          complete: () => observer.complete()
        });
      };

      subscribe();

      return {
        unsubscribe: () => {
          if (subscription) {
            subscription.unsubscribe();
          }
        },
        get closed() {
          return subscription?.closed ?? false;
        }
      };
    });
}

/**
 * 延迟操作符
 */
export function delay<T>(duration: number): OperatorFunction<T, T> {
  return (source) =>
    create((observer) => {
      return source.subscribe({
        next: (value) => {
          setTimeout(() => observer.next(value), duration);
        },
        error: (err) => observer.error(err),
        complete: () => {
          setTimeout(() => observer.complete(), duration);
        }
      });
    });
}

/**
 * 间隔操作符
 */
export function interval(period: number): Observable<number> {
  return create((observer) => {
    let count = 0;
    let unsubscribed = false;
    const intervalId = setInterval(() => {
      if (!unsubscribed) {
        observer.next(count++);
      }
    }, period);

    return {
      unsubscribe: () => {
        unsubscribed = true;
        clearInterval(intervalId);
      },
      get closed() {
        return unsubscribed;
      }
    };
  });
}

/**
 * 定时器操作符
 */
export function timer(delay: number, period?: number): Observable<number> {
  return create((observer) => {
    let count = 0;
    let intervalId: NodeJS.Timeout | null = null;
    let unsubscribed = false;

    const timeoutId = setTimeout(() => {
      if (!unsubscribed) {
        observer.next(count++);
        if (period) {
          intervalId = setInterval(() => {
            if (!unsubscribed) {
              observer.next(count++);
            }
          }, period);
        } else {
          observer.complete();
        }
      }
    }, delay);

    return {
      unsubscribe: () => {
        unsubscribed = true;
        clearTimeout(timeoutId);
        if (intervalId) {
          clearInterval(intervalId);
        }
      },
      get closed() {
        return unsubscribed;
      }
    };
  });
}

/**
 * 合并操作符
 */
export function merge<T>(...sources: Observable<T>[]): Observable<T> {
  return create((observer) => {
    const subscriptions: Subscription[] = [];
    let completed = 0;

    for (const source of sources) {
      const subscription = source.subscribe({
        next: (value) => observer.next(value),
        error: (err) => observer.error(err),
        complete: () => {
          completed++;
          if (completed === sources.length) {
            observer.complete();
          }
        }
      });
      subscriptions.push(subscription);
    }

    return {
      unsubscribe: () => {
        subscriptions.forEach((sub) => sub.unsubscribe());
      },
      get closed() {
        return subscriptions.every((sub) => sub.closed);
      }
    };
  });
}

/**
 * 串联操作符
 */
export function concat<T>(...sources: Observable<T>[]): Observable<T> {
  return create((observer) => {
    let index = 0;
    let currentSubscription: Subscription | null = null;

    const subscribeNext = () => {
      if (index >= sources.length) {
        observer.complete();
        return;
      }

      currentSubscription = sources[index]!.subscribe({
        next: (value) => observer.next(value),
        error: (err) => observer.error(err),
        complete: () => {
          index++;
          subscribeNext();
        }
      });
    };

    subscribeNext();

    return {
      unsubscribe: () => {
        if (currentSubscription) {
          currentSubscription.unsubscribe();
        }
      },
      get closed() {
        return currentSubscription?.closed ?? false;
      }
    };
  });
}

/**
 * 组合操作符
 */
export function combineLatest<T>(...sources: Observable<T>[]): Observable<T[]> {
  return create((observer) => {
    const values: T[] = new Array(sources.length);
    const hasValue: boolean[] = new Array(sources.length).fill(false);
    const subscriptions: Subscription[] = [];

    for (let i = 0; i < sources.length; i++) {
      const subscription = sources[i]!.subscribe({
        next: (value) => {
          values[i] = value;
          hasValue[i] = true;
          if (hasValue.every((v) => v)) {
            observer.next([...values]);
          }
        },
        error: (err) => observer.error(err),
        complete: () => {}
      });
      subscriptions.push(subscription);
    }

    return {
      unsubscribe: () => {
        subscriptions.forEach((sub) => sub.unsubscribe());
      },
      get closed() {
        return subscriptions.every((sub) => sub.closed);
      }
    };
  });
}

/**
 * 取操作符
 */
export function take<T>(count: number): OperatorFunction<T, T> {
  return (source) =>
    create((observer) => {
      let taken = 0;

      return source.subscribe({
        next: (value) => {
          if (taken < count) {
            taken++;
            observer.next(value);
            if (taken === count) {
              observer.complete();
            }
          }
        },
        error: (err) => observer.error(err),
        complete: () => observer.complete()
      });
    });
}

/**
 * 跳过操作符
 */
export function skip<T>(count: number): OperatorFunction<T, T> {
  return (source) =>
    create((observer) => {
      let skipped = 0;

      return source.subscribe({
        next: (value) => {
          if (skipped >= count) {
            observer.next(value);
          } else {
            skipped++;
          }
        },
        error: (err) => observer.error(err),
        complete: () => observer.complete()
      });
    });
}

/**
 * 扫描操作符
 */
export function scan<T, R>(accumulator: (acc: R, value: T) => R, seed: R): OperatorFunction<T, R> {
  return (source) =>
    create((observer) => {
      let acc = seed;

      return source.subscribe({
        next: (value) => {
          acc = accumulator(acc, value);
          observer.next(acc);
        },
        error: (err) => observer.error(err),
        complete: () => observer.complete()
      });
    });
}

/**
 * 归约操作符
 */
export function reduce<T, R>(accumulator: (acc: R, value: T) => R, seed: R): OperatorFunction<T, R> {
  return (source) =>
    create((observer) => {
      let acc = seed;

      return source.subscribe({
        next: (value) => {
          acc = accumulator(acc, value);
        },
        error: (err) => observer.error(err),
        complete: () => {
          observer.next(acc);
          observer.complete();
        }
      });
    });
}

/**
 * 最后操作符
 */
export function last<T>(): OperatorFunction<T, T> {
  return (source) =>
    create((observer) => {
      let lastValue: T | undefined;

      return source.subscribe({
        next: (value) => {
          lastValue = value;
        },
        error: (err) => observer.error(err),
        complete: () => {
          if (lastValue !== undefined) {
            observer.next(lastValue);
            observer.complete();
          } else {
            observer.error(new Error('No values emitted'));
          }
        }
      });
    });
}

/**
 * 首个操作符
 */
export function first<T>(): OperatorFunction<T, T> {
  return (source) =>
    create((observer) => {
      return source.subscribe({
        next: (value) => {
          observer.next(value);
          observer.complete();
        },
        error: (err) => observer.error(err),
        complete: () => {
          observer.error(new Error('No values emitted'));
        }
      });
    });
}