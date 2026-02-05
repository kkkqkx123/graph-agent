import { SingletonRegistry } from '../singleton-registry';

describe('SingletonRegistry', () => {
  beforeEach(() => {
    // Reset the registry before each test
    SingletonRegistry.reset();
  });

  afterEach(() => {
    // Reset the registry after each test
    SingletonRegistry.reset();
  });

  describe('register', () => {
    it('should register a singleton', () => {
      const singleton = { test: 'value' };
      SingletonRegistry.register('test', singleton);

      expect(SingletonRegistry.get('test')).toBe(singleton);
    });

    it('should allow re-registering the same key (no error)', () => {
      const singleton1 = { test: 'value1' };
      const singleton2 = { test: 'value2' };

      SingletonRegistry.register('test', singleton1);
      SingletonRegistry.register('test', singleton2);

      expect(SingletonRegistry.get('test')).toBe(singleton2);
    });
  });

  describe('get', () => {
    it('should get registered singleton', () => {
      const singleton = { test: 'value' };
      SingletonRegistry.register('test', singleton);

      expect(SingletonRegistry.get('test')).toBe(singleton);
    });

    it('should throw error when getting unregistered singleton', () => {
      expect(() => {
        SingletonRegistry.get('nonexistent');
      }).toThrow('Singleton not registered: nonexistent');
    });
  });

  describe('has', () => {
    it('should return true for registered singleton', () => {
      const singleton = { test: 'value' };
      SingletonRegistry.register('test', singleton);

      expect(SingletonRegistry.has('test')).toBe(true);
    });

    it('should return false for unregistered singleton', () => {
      expect(SingletonRegistry.has('nonexistent')).toBe(false);
    });
  });

  describe('reset', () => {
    it('should reset all singletons', () => {
      const singleton = { test: 'value' };
      SingletonRegistry.register('test', singleton);

      expect(SingletonRegistry.has('test')).toBe(true);

      SingletonRegistry.reset();

      expect(SingletonRegistry.has('test')).toBe(false);
      expect(SingletonRegistry.isInitialized()).toBe(false);
    });
  });

  describe('getRegisteredKeys', () => {
    it('should return all registered keys', () => {
      SingletonRegistry.register('test1', { value: 1 });
      SingletonRegistry.register('test2', { value: 2 });

      const keys = SingletonRegistry.getRegisteredKeys();
      expect(keys).toContain('test1');
      expect(keys).toContain('test2');
      expect(keys.length).toBe(2);
    });
  });

  describe('isInitialized', () => {
    it('should return false initially', () => {
      expect(SingletonRegistry.isInitialized()).toBe(false);
    });

    it('should return true after calling initialize', () => {
      // Even though initialize has internal logic, calling it should set initialized to true
      SingletonRegistry.initialize();
      expect(SingletonRegistry.isInitialized()).toBe(true);
    });
  });
});