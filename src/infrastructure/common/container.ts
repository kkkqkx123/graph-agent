/**
 * 简单的依赖注入容器实现
 */

export interface Container {
  register<T>(key: string, implementation: new (...args: any[]) => T): void;
  registerInstance<T>(key: string, instance: T): void;
  registerFactory<T>(key: string, factory: () => T): void;
  get<T>(key: string): T;
  has(key: string): boolean;
  dispose(): void;
}

export class SimpleContainer implements Container {
  private services: Map<string, any> = new Map();
  private factories: Map<string, () => any> = new Map();
  private singletons: Map<string, any> = new Map();

  register<T>(key: string, implementation: new (...args: any[]) => T): void {
    this.factories.set(key, () => new implementation());
  }

  registerInstance<T>(key: string, instance: T): void {
    this.singletons.set(key, instance);
  }

  registerFactory<T>(key: string, factory: () => T): void {
    this.factories.set(key, factory);
  }

  get<T>(key: string): T {
    // 检查单例
    if (this.singletons.has(key)) {
      return this.singletons.get(key) as T;
    }

    // 检查工厂
    if (this.factories.has(key)) {
      const factory = this.factories.get(key);
      if (factory) {
        const instance = factory();
        this.singletons.set(key, instance);
        return instance as T;
      }
    }

    throw new Error(`服务未注册: ${key}`);
  }

  has(key: string): boolean {
    return this.singletons.has(key) || this.factories.has(key);
  }

  dispose(): void {
    // 清理所有服务
    for (const instance of this.singletons.values()) {
      if (instance && typeof instance.dispose === 'function') {
        instance.dispose();
      }
    }
    
    this.services.clear();
    this.factories.clear();
    this.singletons.clear();
  }
}