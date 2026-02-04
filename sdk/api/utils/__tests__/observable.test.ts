/**
 * Observable单元测试
 */

import {
  Observable,
  Observer,
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
} from '../observable';

describe('Observable', () => {
  describe('基础功能', () => {
    test('of应该发射所有值', (done) => {
      const values: number[] = [];
      of(1, 2, 3).subscribe({
        next: (value) => values.push(value),
        complete: () => {
          expect(values).toEqual([1, 2, 3]);
          done();
        }
      });
    });

    test('fromArray应该发射数组中的所有值', (done) => {
      const values: number[] = [];
      fromArray([1, 2, 3]).subscribe({
        next: (value) => values.push(value),
        complete: () => {
          expect(values).toEqual([1, 2, 3]);
          done();
        }
      });
    });

    test('fromPromise应该发射Promise的值', (done) => {
      fromPromise(Promise.resolve(42)).subscribe({
        next: (value) => {
          expect(value).toBe(42);
        },
        complete: () => {
          done();
        }
      });
    });

    test('create应该创建自定义Observable', (done) => {
      create((observer) => {
        observer.next(1);
        observer.next(2);
        observer.complete();
      }).subscribe({
        next: (value) => {
          expect([1, 2]).toContain(value);
        },
        complete: () => {
          done();
        }
      });
    });

    test('订阅应该支持取消', (done) => {
      const values: number[] = [];
      const subscription = interval(10).subscribe({
        next: (value) => {
          values.push(value);
          if (value >= 2) {
            subscription.unsubscribe();
            expect(values.length).toBeLessThanOrEqual(3);
            done();
          }
        }
      });
    });
  });

  describe('操作符', () => {
    test('map应该转换值', (done) => {
      of(1, 2, 3)
        .pipe(map((x) => x * 2))
        .subscribe({
          next: (value) => {
            expect([2, 4, 6]).toContain(value);
          },
          complete: () => {
            done();
          }
        });
    });

    test('filter应该过滤值', (done) => {
      const values: number[] = [];
      of(1, 2, 3, 4, 5)
        .pipe(filter((x) => x % 2 === 0))
        .subscribe({
          next: (value) => values.push(value),
          complete: () => {
            expect(values).toEqual([2, 4]);
            done();
          }
        });
    });

    test('flatMap应该展平Observable', (done) => {
      const values: number[] = [];
      of(1, 2, 3)
        .pipe(flatMap((x) => of(x, x * 10)))
        .subscribe({
          next: (value) => values.push(value),
          complete: () => {
            expect(values).toEqual([1, 10, 2, 20, 3, 30]);
            done();
          }
        });
    });

    test('distinctUntilChanged应该去重', (done) => {
      const values: number[] = [];
      of(1, 1, 2, 2, 2, 3, 3)
        .pipe(distinctUntilChanged())
        .subscribe({
          next: (value) => values.push(value),
          complete: () => {
            expect(values).toEqual([1, 2, 3]);
            done();
          }
        });
    });

    test('take应该只取前n个值', (done) => {
      const values: number[] = [];
      of(1, 2, 3, 4, 5)
        .pipe(take(3))
        .subscribe({
          next: (value) => values.push(value),
          complete: () => {
            expect(values).toEqual([1, 2, 3]);
            done();
          }
        });
    });

    test('skip应该跳过前n个值', (done) => {
      const values: number[] = [];
      of(1, 2, 3, 4, 5)
        .pipe(skip(2))
        .subscribe({
          next: (value) => values.push(value),
          complete: () => {
            expect(values).toEqual([3, 4, 5]);
            done();
          }
        });
    });

    test('scan应该累积值', (done) => {
      const values: number[] = [];
      of(1, 2, 3, 4)
        .pipe(scan((acc, x) => acc + x, 0))
        .subscribe({
          next: (value) => values.push(value),
          complete: () => {
            expect(values).toEqual([1, 3, 6, 10]);
            done();
          }
        });
    });

    test('reduce应该归约为单个值', (done) => {
      of(1, 2, 3, 4)
        .pipe(reduce((acc, x) => acc + x, 0))
        .subscribe({
          next: (value) => {
            expect(value).toBe(10);
          },
          complete: () => {
            done();
          }
        });
    });

    test('first应该只取第一个值', (done) => {
      of(1, 2, 3)
        .pipe(first())
        .subscribe({
          next: (value) => {
            expect(value).toBe(1);
          },
          complete: () => {
            done();
          }
        });
    });

    test('last应该只取最后一个值', (done) => {
      of(1, 2, 3)
        .pipe(last())
        .subscribe({
          next: (value) => {
            expect(value).toBe(3);
          },
          complete: () => {
            done();
          }
        });
    });
  });

  describe('组合操作符', () => {
    test('merge应该合并多个Observable', (done) => {
      const values: number[] = [];
      merge(of(1, 2), of(3, 4)).subscribe({
        next: (value) => values.push(value),
        complete: () => {
          expect(values).toEqual(expect.arrayContaining([1, 2, 3, 4]));
          expect(values.length).toBe(4);
          done();
        }
      });
    });

    test('concat应该串联多个Observable', (done) => {
      const values: number[] = [];
      concat(of(1, 2), of(3, 4)).subscribe({
        next: (value) => values.push(value),
        complete: () => {
          expect(values).toEqual([1, 2, 3, 4]);
          done();
        }
      });
    });

    test('combineLatest应该组合最新值', (done) => {
      const values: number[][] = [];
      combineLatest(of(1, 2), of(3, 4)).subscribe({
        next: (value) => values.push(value),
        complete: () => {
          expect(values.length).toBeGreaterThan(0);
          done();
        }
      });
    });
  });

  describe('错误处理', () => {
    test('catchError应该捕获错误', (done) => {
      create((observer) => {
        observer.next(1);
        observer.error(new Error('Test error'));
      })
        .pipe(catchError(() => of(42)))
        .subscribe({
          next: (value) => {
            expect([1, 42]).toContain(value);
          },
          complete: () => {
            done();
          }
        });
    });

    test('retry应该重试', (done) => {
      let attempts = 0;
      create((observer) => {
        attempts++;
        if (attempts < 3) {
          observer.error(new Error('Retry error'));
        } else {
          observer.next(42);
          observer.complete();
        }
      })
        .pipe(retry(3))
        .subscribe({
          next: (value) => {
            expect(value).toBe(42);
          },
          complete: () => {
            expect(attempts).toBe(3);
            done();
          }
        });
    });
  });

  describe('时间操作符', () => {
    test('delay应该延迟发射', (done) => {
      const startTime = Date.now();
      of(1)
        .pipe(delay(100))
        .subscribe({
          next: () => {
            const elapsed = Date.now() - startTime;
            expect(elapsed).toBeGreaterThanOrEqual(100);
            done();
          }
        });
    }, 200);

    test('interval应该定期发射值', (done) => {
      const values: number[] = [];
      const subscription = interval(50).subscribe({
        next: (value) => {
          values.push(value);
          if (value >= 2) {
            subscription.unsubscribe();
            expect(values).toEqual([0, 1, 2]);
            done();
          }
        }
      });
    }, 200);

    test('timer应该在延迟后发射', (done) => {
      const startTime = Date.now();
      timer(100).subscribe({
        next: (value) => {
          expect(value).toBe(0);
          const elapsed = Date.now() - startTime;
          expect(elapsed).toBeGreaterThanOrEqual(100);
          done();
        }
      });
    }, 200);
  });

  describe('订阅管理', () => {
    test('unsubscribe应该停止发射', (done) => {
      const values: number[] = [];
      const subscription = interval(10).subscribe({
        next: (value) => values.push(value)
      });

      setTimeout(() => {
        subscription.unsubscribe();
        const count = values.length;
        setTimeout(() => {
          expect(values.length).toBe(count);
          done();
        }, 50);
      }, 50);
    }, 200);

    test('closed属性应该反映订阅状态', (done) => {
      const subscription = of(1).subscribe();
      expect(subscription.closed).toBe(true);
      done();
    });
  });
});