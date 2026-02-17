import { describe, it, expect, beforeEach } from 'vitest';
import { ResolutionEngine } from '../resolver.js';
import { Binding, BindingType } from '../binding.js';
import { BindingScope, Request, ServiceIdentifier, Container } from '../types.js';

// 测试用的服务标识符
const IService = Symbol('IService');
const IDependency = Symbol('IDependency');

// 测试用的类
class Dependency {
  value = 'dependency';
}

class Service {
  static $inject = [IDependency] as const;
  constructor(public dep: Dependency) { }
}

class ServiceWithMultipleDeps {
  static $inject = [IDependency, IService] as const;
  constructor(
    public dep: Dependency,
    public service: Service
  ) { }
}

// 创建模拟容器
function createMockContainer(resolveMap: Map<ServiceIdentifier, unknown> = new Map()): Container {
  return {
    get: <T>(id: ServiceIdentifier<T>): T => {
      const value = resolveMap.get(id);
      if (value === undefined) {
        throw new Error(`No binding found for ${String(id)}`);
      }
      return value as T;
    },
    getAll: <T>(id: ServiceIdentifier<T>): T[] => {
      const value = resolveMap.get(id);
      return value ? [value as T] : [];
    },
    tryGet: <T>(id: ServiceIdentifier<T>): T | undefined => {
      return resolveMap.get(id) as T | undefined;
    },
    isBound: (id: ServiceIdentifier): boolean => {
      return resolveMap.has(id);
    },
    getWithRequest: <T>(id: ServiceIdentifier<T>, request: Request): T => {
      const value = resolveMap.get(id);
      if (value === undefined) {
        throw new Error(`No binding found for ${String(id)}`);
      }
      return value as T;
    },
  };
}

describe('ResolutionEngine', () => {
  let engine: ResolutionEngine;

  beforeEach(() => {
    engine = new ResolutionEngine();
  });

  describe('activateBinding() - 常量绑定', () => {
    it('应该返回常量值', () => {
      const constantValue = { name: 'test' };
      const binding: Binding<typeof constantValue> = {
        id: Symbol('binding'),
        serviceId: IService,
        type: BindingType.CONSTANT,
        scope: BindingScope.SINGLETON,
        constantValue,
      };
      const request: Request = { serviceId: IService, depth: 0 };
      const container = createMockContainer();

      const result = engine.activateBinding(binding, request, container);

      expect(result).toBe(constantValue);
    });
  });

  describe('activateBinding() - 工厂绑定', () => {
    it('应该调用工厂函数并返回结果', () => {
      const factoryValue = { created: true };
      const binding: Binding<typeof factoryValue> = {
        id: Symbol('binding'),
        serviceId: IService,
        type: BindingType.FACTORY,
        scope: BindingScope.TRANSIENT,
        factory: () => factoryValue,
      };
      const request: Request = { serviceId: IService, depth: 0 };
      const container = createMockContainer();

      const result = engine.activateBinding(binding, request, container);

      expect(result).toBe(factoryValue);
    });

    it('应该传递容器上下文给工厂函数', () => {
      const dep = new Dependency();
      let receivedContainer: Container | null = null;

      const binding: Binding<{ dep: Dependency }> = {
        id: Symbol('binding'),
        serviceId: IService,
        type: BindingType.FACTORY,
        scope: BindingScope.TRANSIENT,
        factory: (container) => {
          receivedContainer = container;
          return { dep: container.get(IDependency) as Dependency };
        },
      };
      const request: Request = { serviceId: IService, depth: 0 };
      const container = createMockContainer(new Map([[IDependency, dep]]));

      const result = engine.activateBinding(binding, request, container);

      expect(receivedContainer).toBeDefined();
      expect(result.dep).toBe(dep);
    });

    it('工厂函数缺失时应该抛出错误', () => {
      const binding: Binding<{}> = {
        id: Symbol('binding'),
        serviceId: IService,
        type: BindingType.FACTORY,
        scope: BindingScope.TRANSIENT,
      };
      const request: Request = { serviceId: IService, depth: 0 };
      const container = createMockContainer();

      expect(() => {
        engine.activateBinding(binding, request, container);
      }).toThrow(/Factory binding missing factory function/);
    });
  });

  describe('activateBinding() - 动态值绑定', () => {
    it('应该调用动态值函数并返回结果', () => {
      const dynamicValue = { dynamic: true };
      const binding: Binding<typeof dynamicValue> = {
        id: Symbol('binding'),
        serviceId: IService,
        type: BindingType.DYNAMIC,
        scope: BindingScope.TRANSIENT,
        dynamicValue: () => dynamicValue,
      };
      const request: Request = { serviceId: IService, depth: 0 };
      const container = createMockContainer();

      const result = engine.activateBinding(binding, request, container);

      expect(result).toBe(dynamicValue);
    });

    it('应该传递容器上下文给动态值函数', () => {
      const dep = new Dependency();
      let receivedContainer: Container | null = null;

      const binding: Binding<{ dep: Dependency }> = {
        id: Symbol('binding'),
        serviceId: IService,
        type: BindingType.DYNAMIC,
        scope: BindingScope.TRANSIENT,
        dynamicValue: (container) => {
          receivedContainer = container;
          return { dep: container.get(IDependency) as Dependency };
        },
      };
      const request: Request = { serviceId: IService, depth: 0 };
      const container = createMockContainer(new Map([[IDependency, dep]]));

      const result = engine.activateBinding(binding, request, container);

      expect(receivedContainer).toBeDefined();
      expect(result.dep).toBe(dep);
    });

    it('动态值函数缺失时应该抛出错误', () => {
      const binding: Binding<{}> = {
        id: Symbol('binding'),
        serviceId: IService,
        type: BindingType.DYNAMIC,
        scope: BindingScope.TRANSIENT,
      };
      const request: Request = { serviceId: IService, depth: 0 };
      const container = createMockContainer();

      expect(() => {
        engine.activateBinding(binding, request, container);
      }).toThrow(/Dynamic binding missing dynamic value function/);
    });
  });

  describe('activateBinding() - 实例绑定', () => {
    it('应该创建类实例', () => {
      const binding: Binding<Dependency> = {
        id: Symbol('binding'),
        serviceId: IDependency,
        type: BindingType.INSTANCE,
        scope: BindingScope.TRANSIENT,
        implementation: Dependency,
      };
      const request: Request = { serviceId: IDependency, depth: 0 };
      const container = createMockContainer();

      const result = engine.activateBinding(binding, request, container);

      expect(result).toBeInstanceOf(Dependency);
    });

    it('应该自动注入构造函数依赖', () => {
      const dep = new Dependency();
      const binding: Binding<Service> = {
        id: Symbol('binding'),
        serviceId: IService,
        type: BindingType.INSTANCE,
        scope: BindingScope.TRANSIENT,
        implementation: Service,
      };

      // 创建请求，IService 依赖 IDependency
      const request: Request = { serviceId: IService, depth: 0 };
      const container = createMockContainer(new Map([[IDependency, dep]]));

      const result = engine.activateBinding(binding, request, container);

      expect(result).toBeInstanceOf(Service);
      expect(result.dep).toBe(dep);
    });

    it('实现类缺失时应该抛出错误', () => {
      const binding: Binding<{}> = {
        id: Symbol('binding'),
        serviceId: IService,
        type: BindingType.INSTANCE,
        scope: BindingScope.TRANSIENT,
      };
      const request: Request = { serviceId: IService, depth: 0 };
      const container = createMockContainer();

      expect(() => {
        engine.activateBinding(binding, request, container);
      }).toThrow(/Instance binding missing implementation class/);
    });
  });

  describe('单例作用域', () => {
    it('应该缓存单例实例', () => {
      const bindingId = Symbol('binding');
      const binding: Binding<Dependency> = {
        id: bindingId,
        serviceId: IDependency,
        type: BindingType.INSTANCE,
        scope: BindingScope.SINGLETON,
        implementation: Dependency,
      };
      const request: Request = { serviceId: IDependency, depth: 0 };
      const container = createMockContainer();

      const result1 = engine.activateBinding(binding, request, container);
      const result2 = engine.activateBinding(binding, request, container);

      expect(result1).toBe(result2);
    });

    it('单例实例应该只创建一次', () => {
      let callCount = 0;
      const bindingId = Symbol('binding');

      class CountedService {
        id = ++callCount;
      }

      const binding: Binding<CountedService> = {
        id: bindingId,
        serviceId: IService,
        type: BindingType.INSTANCE,
        scope: BindingScope.SINGLETON,
        implementation: CountedService,
      };
      const request: Request = { serviceId: IService, depth: 0 };
      const container = createMockContainer();

      engine.activateBinding(binding, request, container);
      engine.activateBinding(binding, request, container);
      engine.activateBinding(binding, request, container);

      expect(callCount).toBe(1);
    });
  });

  describe('作用域内单例', () => {
    it('应该缓存作用域实例', () => {
      const bindingId = Symbol('binding');
      const binding: Binding<Dependency> = {
        id: bindingId,
        serviceId: IDependency,
        type: BindingType.INSTANCE,
        scope: BindingScope.SCOPED,
        implementation: Dependency,
      };
      const request: Request = { serviceId: IDependency, depth: 0 };
      const container = createMockContainer();

      const result1 = engine.activateBinding(binding, request, container);
      const result2 = engine.activateBinding(binding, request, container);

      expect(result1).toBe(result2);
    });

    it('清除作用域缓存后应该创建新实例', () => {
      const bindingId = Symbol('binding');
      const binding: Binding<Dependency> = {
        id: bindingId,
        serviceId: IDependency,
        type: BindingType.INSTANCE,
        scope: BindingScope.SCOPED,
        implementation: Dependency,
      };
      const request: Request = { serviceId: IDependency, depth: 0 };
      const container = createMockContainer();

      const result1 = engine.activateBinding(binding, request, container);
      engine.clearScopedCache();
      const result2 = engine.activateBinding(binding, request, container);

      expect(result1).not.toBe(result2);
    });
  });

  describe('瞬态作用域', () => {
    it('应该每次创建新实例', () => {
      const bindingId = Symbol('binding');
      const binding: Binding<Dependency> = {
        id: bindingId,
        serviceId: IDependency,
        type: BindingType.INSTANCE,
        scope: BindingScope.TRANSIENT,
        implementation: Dependency,
      };
      const request: Request = { serviceId: IDependency, depth: 0 };
      const container = createMockContainer();

      const result1 = engine.activateBinding(binding, request, container);
      const result2 = engine.activateBinding(binding, request, container);

      expect(result1).not.toBe(result2);
    });
  });

  describe('循环依赖检测', () => {
    it('应该检测循环依赖并抛出错误', () => {
      const ServiceBId = Symbol('ServiceB');

      class ServiceA {
        static $inject = [ServiceBId] as const;
        constructor(public b: unknown) { }
      }

      const binding: Binding<ServiceA> = {
        id: Symbol('binding'),
        serviceId: IService,
        type: BindingType.INSTANCE,
        scope: BindingScope.TRANSIENT,
        implementation: ServiceA,
      };

      // 创建一个会导致循环依赖的请求链
      // 模拟场景：正在解析 ServiceB，而 ServiceB 需要解析 IService（ServiceA）
      // ServiceA 又依赖 ServiceB，形成循环：ServiceB -> ServiceA -> ServiceB
      const parentRequest: Request = {
        serviceId: ServiceBId,
        depth: 0
      };
      const childRequest: Request = {
        serviceId: IService,
        parentContext: parentRequest,
        depth: 1
      };

      // 使用 mock container，当请求 ServiceBId 时返回一个对象
      // 循环依赖检测应该在 createInstance 中触发
      const container = createMockContainer(new Map([
        [ServiceBId, { value: 'serviceB' }]
      ]));

      // 当解析 ServiceA 的依赖 ServiceBId 时，
      // 会发现 ServiceBId 已经在父请求链中，抛出循环依赖错误
      expect(() => {
        engine.activateBinding(binding, childRequest, container);
      }).toThrow(/Circular dependency detected/);
    });
  });

  describe('未知绑定类型', () => {
    it('应该对未知绑定类型抛出错误', () => {
      const binding: Binding<{}> = {
        id: Symbol('binding'),
        serviceId: IService,
        type: 'unknown' as BindingType,
        scope: BindingScope.TRANSIENT,
      };
      const request: Request = { serviceId: IService, depth: 0 };
      const container = createMockContainer();

      expect(() => {
        engine.activateBinding(binding, request, container);
      }).toThrow(/Unknown binding type/);
    });
  });

  describe('clearAllCaches()', () => {
    it('应该清除所有缓存', () => {
      const singletonBindingId = Symbol('singleton-binding');
      const scopedBindingId = Symbol('scoped-binding');

      const singletonBinding: Binding<Dependency> = {
        id: singletonBindingId,
        serviceId: Symbol('SingletonService'),
        type: BindingType.INSTANCE,
        scope: BindingScope.SINGLETON,
        implementation: Dependency,
      };

      const scopedBinding: Binding<Dependency> = {
        id: scopedBindingId,
        serviceId: Symbol('ScopedService'),
        type: BindingType.INSTANCE,
        scope: BindingScope.SCOPED,
        implementation: Dependency,
      };

      const request1: Request = { serviceId: singletonBinding.serviceId, depth: 0 };
      const request2: Request = { serviceId: scopedBinding.serviceId, depth: 0 };
      const container = createMockContainer();

      const singleton1 = engine.activateBinding(singletonBinding, request1, container);
      const scoped1 = engine.activateBinding(scopedBinding, request2, container);

      engine.clearAllCaches();

      const singleton2 = engine.activateBinding(singletonBinding, request1, container);
      const scoped2 = engine.activateBinding(scopedBinding, request2, container);

      expect(singleton1).not.toBe(singleton2);
      expect(scoped1).not.toBe(scoped2);
    });
  });
});
