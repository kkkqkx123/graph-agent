import { ComponentRegistry } from '../component-registry';
import { EventManager } from '../../../services/event-manager';

describe('ComponentRegistry', () => {
  let registry: ComponentRegistry;

  beforeEach(() => {
    registry = new ComponentRegistry();
  });

  afterEach(() => {
    // 清理注册表
    (registry as any).clear();
  });

  describe('register', () => {
    it('should register component successfully', () => {
      const mockEventManager = new EventManager();
      registry.register('eventManager', mockEventManager);
      
      expect(registry.has('eventManager')).toBe(true);
    });

    it('should overwrite existing component when re-registering', () => {
      const mockEventManager1 = new EventManager();
      const mockEventManager2 = new EventManager();
      
      registry.register('eventManager', mockEventManager1);
      registry.register('eventManager', mockEventManager2);
      registry.markAsInitialized();
      
      expect(registry.getAny('eventManager')).toBe(mockEventManager2);
    });
  });

  describe('get', () => {
    it('should get registered component with correct type', () => {
      const mockEventManager = new EventManager();
      registry.register('eventManager', mockEventManager);
      registry.markAsInitialized();
      
      const eventManager = registry.get('eventManager');
      expect(eventManager).toBe(mockEventManager);
    });

    it('should throw error when getting unregistered component', () => {
      registry.markAsInitialized();
      
      expect(() => {
        registry.getAny('nonExistentComponent');
      }).toThrow('Component not found: nonExistentComponent');
    });

    it('should throw error when getting component before initialization', () => {
      const mockEventManager = new EventManager();
      registry.register('eventManager', mockEventManager);
      
      expect(() => {
        registry.getAny('eventManager');
      }).toThrow('ComponentRegistry is not initialized');
    });
  });

  describe('getAny', () => {
    it('should get any registered component', () => {
      const mockComponent = { test: 'value' };
      registry.register('testComponent', mockComponent);
      registry.markAsInitialized();
      
      const component = registry.getAny('testComponent');
      expect(component).toBe(mockComponent);
    });

    it('should throw error when getting unregistered component with getAny', () => {
      registry.markAsInitialized();
      
      expect(() => {
        registry.getAny('nonExistentComponent');
      }).toThrow('Component not found: nonExistentComponent');
    });
  });

  describe('has', () => {
    it('should return true for registered component', () => {
      const mockComponent = { test: 'value' };
      registry.register('testComponent', mockComponent);
      
      expect(registry.has('testComponent')).toBe(true);
    });

    it('should return false for unregistered component', () => {
      expect(registry.has('nonExistentComponent')).toBe(false);
    });
  });

  describe('clear', () => {
    it('should clear all components and reset initialization state', () => {
      const mockComponent = { test: 'value' };
      registry.register('testComponent', mockComponent);
      registry.markAsInitialized();
      
      registry.clear();
      
      expect(registry.has('testComponent')).toBe(false);
      expect(registry.isInitialized()).toBe(false);
    });
  });

  describe('getAllComponents', () => {
    it('should return copy of all registered components', () => {
      const mockComponent1 = { test: 'value1' };
      const mockComponent2 = { test: 'value2' };
      
      registry.register('component1', mockComponent1);
      registry.register('component2', mockComponent2);
      
      const allComponents = registry.getAllComponents();
      
      expect(allComponents.get('component1')).toBe(mockComponent1);
      expect(allComponents.get('component2')).toBe(mockComponent2);
      expect(allComponents.size).toBe(2);
      
      // Verify it's a copy, not the original map
      allComponents.set('newComponent', { test: 'newValue' });
      expect(registry.has('newComponent')).toBe(false);
    });
  });

  describe('markAsInitialized and isInitialized', () => {
    it('should track initialization state correctly', () => {
      expect(registry.isInitialized()).toBe(false);
      
      registry.markAsInitialized();
      
      expect(registry.isInitialized()).toBe(true);
    });
  });
});