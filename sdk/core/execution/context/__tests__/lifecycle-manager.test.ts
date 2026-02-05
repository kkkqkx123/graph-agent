import { LifecycleManager } from '../lifecycle-manager';
import type { LifecycleCapable } from '../../managers/lifecycle-capable';

// Mock LifecycleCapable component
class MockLifecycleComponent implements LifecycleCapable {
  cleanupCalled = false;
  createSnapshotCalled = false;
  restoreFromSnapshotCalled = false;
  
  async cleanup(): Promise<void> {
    this.cleanupCalled = true;
  }
  
  createSnapshot(): any {
    this.createSnapshotCalled = true;
    return { state: 'snapshot' };
  }
  
  restoreFromSnapshot(snapshot: any): void {
    this.restoreFromSnapshotCalled = true;
  }
}

// Mock non-LifecycleCapable component
class MockNonLifecycleComponent {
  someMethod(): void {
    // Do nothing
  }
}

describe('LifecycleManager', () => {
  let lifecycleManager: LifecycleManager;

  beforeEach(() => {
    lifecycleManager = new LifecycleManager();
  });

  describe('cleanupComponents', () => {
    it('should cleanup LifecycleCapable components in correct order', async () => {
      const component1 = new MockLifecycleComponent();
      const component2 = new MockLifecycleComponent();
      const nonLifecycleComponent = new MockNonLifecycleComponent();
      
      const components = new Map<string, any>([
        ['component1', component1],
        ['component2', component2],
        ['nonLifecycle', nonLifecycleComponent]
      ]);
      
      const cleanupOrder = ['component2', 'component1', 'nonLifecycle'];
      
      await lifecycleManager.cleanupComponents(components, cleanupOrder);
      
      // component2 should be cleaned up first (according to cleanupOrder)
      expect(component2.cleanupCalled).toBe(true);
      expect(component1.cleanupCalled).toBe(true);
      // nonLifecycleComponent should not be cleaned up (doesn't implement LifecycleCapable)
      expect((nonLifecycleComponent as any).cleanupCalled).toBeUndefined();
    });

    it('should handle missing components gracefully', async () => {
      const component1 = new MockLifecycleComponent();
      
      const components = new Map<string, any>([
        ['component1', component1]
      ]);
      
      // cleanupOrder includes a non-existent component
      const cleanupOrder = ['nonExistent', 'component1'];
      
      await expect(
        lifecycleManager.cleanupComponents(components, cleanupOrder)
      ).resolves.not.toThrow();
      
      expect(component1.cleanupCalled).toBe(true);
    });

    it('should handle errors during cleanup without stopping other cleanups', async () => {
      const component1 = new MockLifecycleComponent();
      const component2 = new MockLifecycleComponent();
      
      // Mock component2.cleanup to throw an error but still set cleanupCalled
      jest.spyOn(component2, 'cleanup').mockImplementation(async () => {
        component2.cleanupCalled = true;
        throw new Error('Cleanup failed');
      });
      
      const components = new Map<string, any>([
        ['component1', component1],
        ['component2', component2]
      ]);
      
      const cleanupOrder = ['component2', 'component1'];
      
      // Should not throw, and component1 should still be cleaned up
      await expect(
        lifecycleManager.cleanupComponents(components, cleanupOrder)
      ).resolves.not.toThrow();
      
      expect(component1.cleanupCalled).toBe(true);
      expect(component2.cleanupCalled).toBe(true);
    });

    it('should handle synchronous cleanup methods', async () => {
      const syncComponent = {
        cleanup() {
          // Synchronous cleanup
        },
        createSnapshot() {
          return {};
        },
        restoreFromSnapshot() {
          // Do nothing
        }
      };
      
      jest.spyOn(syncComponent, 'cleanup');
      
      const components = new Map<string, any>([
        ['syncComponent', syncComponent]
      ]);
      
      const cleanupOrder = ['syncComponent'];
      
      await lifecycleManager.cleanupComponents(components, cleanupOrder);
      
      expect(syncComponent.cleanup).toHaveBeenCalled();
    });
  });

  describe('getLifecycleCapableComponents', () => {
    it('should return only LifecycleCapable components from managed list', () => {
      const lifecycleComponent = new MockLifecycleComponent();
      const nonLifecycleComponent = new MockNonLifecycleComponent();
      const unmanagedComponent = new MockLifecycleComponent();
      
      const components = new Map<string, any>([
        ['lifecycle', lifecycleComponent],
        ['nonLifecycle', nonLifecycleComponent],
        ['unmanaged', unmanagedComponent]
      ]);
      
      const managedComponents = ['lifecycle', 'nonLifecycle'];
      
      const result = lifecycleManager.getLifecycleCapableComponents(components, managedComponents);
      
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        name: 'lifecycle',
        manager: lifecycleComponent
      });
      // unmanagedComponent should not be included even though it's LifecycleCapable
      expect(result.some(item => item.name === 'unmanaged')).toBe(false);
    });

    it('should return empty array when no LifecycleCapable components in managed list', () => {
      const nonLifecycleComponent1 = new MockNonLifecycleComponent();
      const nonLifecycleComponent2 = new MockNonLifecycleComponent();
      
      const components = new Map<string, any>([
        ['component1', nonLifecycleComponent1],
        ['component2', nonLifecycleComponent2]
      ]);
      
      const managedComponents = ['component1', 'component2'];
      
      const result = lifecycleManager.getLifecycleCapableComponents(components, managedComponents);
      
      expect(result).toHaveLength(0);
    });

    it('should handle missing components in managed list', () => {
      const lifecycleComponent = new MockLifecycleComponent();
      
      const components = new Map<string, any>([
        ['lifecycle', lifecycleComponent]
      ]);
      
      const managedComponents = ['lifecycle', 'missing'];
      
      const result = lifecycleManager.getLifecycleCapableComponents(components, managedComponents);
      
      expect(result).toHaveLength(1);
      expect(result[0]!.name).toBe('lifecycle');
    });
  });

  describe('isLifecycleCapable', () => {
    it('should return true for objects implementing LifecycleCapable interface', () => {
      const lifecycleComponent = new MockLifecycleComponent();
      
      // @ts-ignore - private method access for testing
      const result = lifecycleManager.isLifecycleCapable(lifecycleComponent);
      
      expect(result).toBe(true);
    });

    it('should return false for objects missing required methods', () => {
      const incompleteComponent = {
        cleanup() {},
        createSnapshot() {}
        // Missing restoreFromSnapshot
      };
      
      // @ts-ignore - private method access for testing
      const result = lifecycleManager.isLifecycleCapable(incompleteComponent);
      
      expect(result).toBe(false);
    });

    it('should return false for null/undefined values', () => {
      // @ts-ignore - private method access for testing
      expect(lifecycleManager.isLifecycleCapable(null)).toBe(false);
      // @ts-ignore - private method access for testing
      expect(lifecycleManager.isLifecycleCapable(undefined)).toBe(false);
    });

    it('should return false for non-object values', () => {
      // @ts-ignore - private method access for testing
      expect(lifecycleManager.isLifecycleCapable('string')).toBe(false);
      // @ts-ignore - private method access for testing
      expect(lifecycleManager.isLifecycleCapable(123)).toBe(false);
      // @ts-ignore - private method access for testing
      expect(lifecycleManager.isLifecycleCapable(true)).toBe(false);
    });
  });
});