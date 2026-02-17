import { describe, it, expect } from 'vitest';
import { BindingBuilder, BindingType } from '../binding.js';
import { BindingScope } from '../types.js';

// 测试用的服务标识符
const IService = Symbol.for('IService');
const IDatabase = Symbol.for('IDatabase');

// 测试用的类
class TestService {
  static $inject = [IDatabase] as const;
  constructor(private db: unknown) { }
}

class DatabaseService { }

describe('BindingBuilder', () => {
  describe('constructor', () => {
    it('应该创建默认绑定', () => {
      const bindingId = Symbol('binding');
      const builder = new BindingBuilder(bindingId, IService);
      const binding = builder.getBinding();

      expect(binding.id).toBe(bindingId);
      expect(binding.serviceId).toBe(IService);
      expect(binding.type).toBe(BindingType.INSTANCE);
      expect(binding.scope).toBe(BindingScope.TRANSIENT);
    });
  });

  describe('to()', () => {
    it('应该绑定到类实现', () => {
      const bindingId = Symbol('binding');
      const builder = new BindingBuilder(bindingId, IService);

      builder.to(TestService);
      const binding = builder.getBinding();

      expect(binding.type).toBe(BindingType.INSTANCE);
      expect(binding.implementation).toBe(TestService);
    });

    it('应该支持链式调用到作用域配置', () => {
      const bindingId = Symbol('binding');
      const builder = new BindingBuilder(bindingId, IService);

      const result = builder.to(TestService);

      expect(result).toBeDefined();
      expect(typeof result.inSingletonScope).toBe('function');
      expect(typeof result.inTransientScope).toBe('function');
      expect(typeof result.inScopedScope).toBe('function');
      expect(typeof result.inScope).toBe('function');
    });
  });

  describe('toConstantValue()', () => {
    it('应该绑定到常量值', () => {
      const bindingId = Symbol('binding');
      const builder = new BindingBuilder(bindingId, IService);
      const constantValue = { name: 'test' };

      builder.toConstantValue(constantValue);
      const binding = builder.getBinding();

      expect(binding.type).toBe(BindingType.CONSTANT);
      expect(binding.constantValue).toBe(constantValue);
      expect(binding.scope).toBe(BindingScope.SINGLETON);
    });
  });

  describe('toFactory()', () => {
    it('应该绑定到工厂函数', () => {
      const bindingId = Symbol('binding');
      const builder = new BindingBuilder(bindingId, IService);
      const factory = ({ get }: { get: (id: symbol) => unknown }) => new TestService(get(IDatabase));

      builder.toFactory(factory);
      const binding = builder.getBinding();

      expect(binding.type).toBe(BindingType.FACTORY);
      expect(binding.factory).toBe(factory);
    });
  });

  describe('toDynamicValue()', () => {
    it('应该绑定到动态值函数', () => {
      const bindingId = Symbol('binding');
      const builder = new BindingBuilder(bindingId, IService);
      const dynamicValue = ({ get }: { get: (id: symbol) => unknown }) => new TestService(get(IDatabase));

      builder.toDynamicValue(dynamicValue);
      const binding = builder.getBinding();

      expect(binding.type).toBe(BindingType.DYNAMIC);
      expect(binding.dynamicValue).toBe(dynamicValue);
    });

    it('应该支持链式调用到作用域配置', () => {
      const bindingId = Symbol('binding');
      const builder = new BindingBuilder(bindingId, IService);
      const dynamicValue = () => new TestService({});

      const result = builder.toDynamicValue(dynamicValue);

      expect(result).toBeDefined();
      expect(typeof result.inSingletonScope).toBe('function');
    });
  });

  describe('作用域配置', () => {
    it('inSingletonScope() 应该设置为单例作用域', () => {
      const bindingId = Symbol('binding');
      const builder = new BindingBuilder(bindingId, IService);

      builder.to(TestService).inSingletonScope();
      const binding = builder.getBinding();

      expect(binding.scope).toBe(BindingScope.SINGLETON);
    });

    it('inTransientScope() 应该设置为瞬态作用域', () => {
      const bindingId = Symbol('binding');
      const builder = new BindingBuilder(bindingId, IService);

      builder.to(TestService).inTransientScope();
      const binding = builder.getBinding();

      expect(binding.scope).toBe(BindingScope.TRANSIENT);
    });

    it('inScopedScope() 应该设置为作用域内单例', () => {
      const bindingId = Symbol('binding');
      const builder = new BindingBuilder(bindingId, IService);

      builder.to(TestService).inScopedScope();
      const binding = builder.getBinding();

      expect(binding.scope).toBe(BindingScope.SCOPED);
    });

    it('inScope() 应该接受自定义作用域', () => {
      const bindingId = Symbol('binding');
      const builder = new BindingBuilder(bindingId, IService);

      builder.to(TestService).inScope(BindingScope.SINGLETON);
      const binding = builder.getBinding();

      expect(binding.scope).toBe(BindingScope.SINGLETON);
    });
  });

  describe('when()', () => {
    it('应该添加条件约束', () => {
      const bindingId = Symbol('binding');
      const builder = new BindingBuilder(bindingId, IService);
      const constraint = () => true;

      builder.to(TestService).inSingletonScope().when(constraint);
      const binding = builder.getBinding();

      expect(binding.when).toBe(constraint);
    });
  });

  describe('复杂链式调用', () => {
    it('应该支持完整的绑定链式调用', () => {
      const bindingId = Symbol('binding');
      const builder = new BindingBuilder(bindingId, IService);
      const constraint = () => true;

      builder
        .to(TestService)
        .inSingletonScope()
        .when(constraint);

      const binding = builder.getBinding();

      expect(binding.type).toBe(BindingType.INSTANCE);
      expect(binding.implementation).toBe(TestService);
      expect(binding.scope).toBe(BindingScope.SINGLETON);
      expect(binding.when).toBe(constraint);
    });

    it('应该支持动态值的完整链式调用', () => {
      const bindingId = Symbol('binding');
      const builder = new BindingBuilder(bindingId, IService);
      const dynamicValue = () => new DatabaseService();
      const constraint = () => false;

      builder
        .toDynamicValue(dynamicValue)
        .inScopedScope()
        .when(constraint);

      const binding = builder.getBinding();

      expect(binding.type).toBe(BindingType.DYNAMIC);
      expect(binding.dynamicValue).toBe(dynamicValue);
      expect(binding.scope).toBe(BindingScope.SCOPED);
      expect(binding.when).toBe(constraint);
    });
  });
});
