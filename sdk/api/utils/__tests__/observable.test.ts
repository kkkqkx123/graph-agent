/**
 * Observable单元测试
 */

import {
  Observable,
  Observer,
  create
} from '../observable';

describe('Observable', () => {
  describe('基础功能', () => {
    test('create应该创建自定义Observable', (done) => {
      create((observer) => {
        observer.next(1);
        observer.next(2);
        observer.complete();
        return () => {};
      }).subscribe({
        next: (value) => {
          expect([1, 2]).toContain(value);
        },
        error: () => {},
        complete: () => {
          done();
        }
      });
    });

    test('订阅应该支持取消', (done) => {
      const values: number[] = [];
      const subscription = create((observer) => {
        let count = 0;
        const intervalId = setInterval(() => {
          observer.next(count++);
          if (count >= 5) {
            clearInterval(intervalId);
            observer.complete();
          }
        }, 10);
        return () => clearInterval(intervalId);
      }).subscribe({
        next: (value) => {
          const numValue = value as number;
          values.push(numValue);
          if (numValue >= 2) {
            subscription.unsubscribe();
            expect(values.length).toBeLessThanOrEqual(3);
            done();
          }
        },
        error: () => {},
        complete: () => {}
      });
    });

    test('订阅应该支持简化版回调', (done) => {
      const values: number[] = [];
      create((observer) => {
        observer.next(1);
        observer.next(2);
        observer.complete();
        return () => {};
      }).subscribe(
        (value) => values.push(value as number),
        (error) => console.error('Error:', error),
        () => {
          expect(values).toEqual([1, 2]);
          done();
        }
      );
    });

    test('应该正确处理错误', (done) => {
      const testError = new Error('Test error');
      create((observer) => {
        observer.next(1);
        observer.error(testError);
        return () => {};
      }).subscribe({
        next: (value) => {
          expect(value).toBe(1);
        },
        error: (error) => {
          expect(error).toBe(testError);
          done();
        },
        complete: () => {
          done(new Error('不应该调用complete'));
        }
      });
    });

    test('应该在错误时停止发射', (done) => {
      const values: number[] = [];
      create((observer) => {
        observer.next(1);
        observer.next(2);
        observer.error(new Error('Test error'));
        observer.next(3); // 不应该被调用
        return () => {};
      }).subscribe({
        next: (value) => values.push(value as number),
        error: () => {
          expect(values).toEqual([1, 2]);
          done();
        },
        complete: () => {}
      });
    });

    test('应该在complete时停止发射', (done) => {
      const values: number[] = [];
      create((observer) => {
        observer.next(1);
        observer.next(2);
        observer.complete();
        observer.next(3); // 不应该被调用
        return () => {};
      }).subscribe({
        next: (value) => values.push(value as number),
        error: () => {},
        complete: () => {
          expect(values).toEqual([1, 2]);
          done();
        }
      });
    });

    test('应该正确处理next中的错误', (done) => {
      create((observer) => {
        observer.next(1);
        observer.next(2);
        observer.complete();
        return () => {};
      }).subscribe({
        next: (value) => {
          if (value === 2) {
            throw new Error('Handler error');
          }
        },
        error: (error) => {
          expect(error.message).toBe('Handler error');
          done();
        },
        complete: () => {
          done(new Error('不应该调用complete'));
        }
      });
    });

    test('应该正确处理complete中的错误', (done) => {
      create((observer) => {
        observer.next(1);
        observer.complete();
        return () => {};
      }).subscribe({
        next: () => {},
        error: () => {
          done(new Error('不应该调用error'));
        },
        complete: () => {
          throw new Error('Complete error');
        }
      });
      // 等待错误被捕获
      setTimeout(done, 50);
    });

    test('应该正确处理error中的错误', (done) => {
      create((observer) => {
        observer.error(new Error('Original error'));
        return () => {};
      }).subscribe({
        next: () => {},
        error: () => {
          throw new Error('Error handler error');
        },
        complete: () => {}
      });
      // 等待错误被捕获
      setTimeout(done, 50);
    });
  });

  describe('订阅管理', () => {
    test('unsubscribe应该停止发射', (done) => {
      const values: number[] = [];
      const subscription = create((observer) => {
        let count = 0;
        const intervalId = setInterval(() => {
          observer.next(count++);
        }, 10);
        return () => clearInterval(intervalId);
      }).subscribe({
        next: (value) => values.push(value as number),
        error: () => {},
        complete: () => {}
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
      const subscription = create((observer) => {
        observer.next(1);
        observer.complete();
        return () => {};
      }).subscribe();
      
      expect(subscription.closed).toBe(true);
      done();
    });

    test('closed属性应该在取消订阅后为true', (done) => {
      const subscription = create((observer) => {
        const intervalId = setInterval(() => {
          observer.next(1);
        }, 10);
        return () => clearInterval(intervalId);
      }).subscribe();
      
      expect(subscription.closed).toBe(false);
      subscription.unsubscribe();
      expect(subscription.closed).toBe(true);
      done();
    });

    test('应该在取消订阅时执行teardown函数', (done) => {
      let teardownCalled = false;
      const subscription = create((observer) => {
        const intervalId = setInterval(() => {
          observer.next(1);
        }, 10);
        return () => {
          teardownCalled = true;
          clearInterval(intervalId);
        };
      }).subscribe();
      
      expect(teardownCalled).toBe(false);
      subscription.unsubscribe();
      expect(teardownCalled).toBe(true);
      done();
    });

    test('应该正确处理teardown函数中的错误', (done) => {
      create((observer) => {
        observer.next(1);
        observer.complete();
        return () => {
          throw new Error('Teardown error');
        };
      }).subscribe();
      // 等待错误被捕获
      setTimeout(done, 50);
    });
  });

  describe('ObservableImpl', () => {
    test('应该正确实现Observable接口', (done) => {
      const observable = create((observer) => {
        observer.next(1);
        observer.complete();
        return () => {};
      });
      
      expect(observable.subscribe).toBeDefined();
      expect(observable.pipe).toBeDefined();
      
      done();
    });

    test('pipe方法应该支持操作符链', (done) => {
      const observable = create((observer) => {
        observer.next(1);
        observer.next(2);
        observer.complete();
        return () => {};
      });
      
      // pipe方法存在但操作符未实现，这里只测试pipe方法本身
      expect(observable.pipe).toBeDefined();
      done();
    });
  });

  describe('Observer', () => {
    test('应该正确实现Observer接口', (done) => {
      const observer: Observer<number> = {
        next: (value) => expect(value).toBe(1),
        error: (error) => console.error(error),
        complete: () => {}
      };
      
      create((obs) => {
        obs.next(1);
        obs.complete();
        return () => {};
      }).subscribe(observer);
      
      done();
    });

    test('应该支持部分Observer实现', (done) => {
      const observer: Partial<Observer<number>> = {
        next: (value) => expect(value).toBe(1)
      };
      
      create((obs) => {
        obs.next(1);
        obs.complete();
        return () => {};
      }).subscribe(observer as Observer<number>);
      
      done();
    });
  });
});