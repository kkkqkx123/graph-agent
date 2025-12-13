/**
 * 依赖解析器实现
 */

import { IDependencyResolver, ModuleConfig, LoadingOrder, DependencyError } from './types';
import { ILogger } from '@shared/types/logger';

/**
 * 依赖解析器实现
 */
export class DependencyResolver implements IDependencyResolver {
  private readonly logger: ILogger;

  constructor(logger: ILogger) {
    this.logger = logger.child({ module: 'DependencyResolver' });
  }

  /**
   * 解析模块依赖关系并生成加载顺序
   */
  async resolveDependencies(modules: Map<string, ModuleConfig>): Promise<LoadingOrder> {
    this.logger.debug('开始解析模块依赖关系', { 
      moduleCount: modules.size,
      modules: Array.from(modules.keys())
    });

    try {
      // 1. 检查循环依赖
      const circularErrors = this.checkCircularDependency(modules);
      if (circularErrors.length > 0) {
        throw new Error(`检测到循环依赖: ${circularErrors.map(e => e.message).join(', ')}`);
      }

      // 2. 构建依赖图
      const dependencyGraph = this.buildDependencyGraph(modules);
      
      // 3. 拓扑排序生成加载顺序
      const orderedModules = this.topologicalSort(dependencyGraph);
      
      // 4. 识别可并行加载的模块组
      const parallelGroups = this.identifyParallelGroups(dependencyGraph, orderedModules);
      
      const loadingOrder: LoadingOrder = {
        orderedModules,
        parallelGroups
      };

      this.logger.debug('依赖关系解析完成', { 
        orderedModules,
        parallelGroupCount: parallelGroups.length
      });

      return loadingOrder;
    } catch (error) {
      this.logger.error('依赖关系解析失败', error as Error);
      throw error;
    }
  }

  /**
   * 检查循环依赖
   */
  checkCircularDependency(modules: Map<string, ModuleConfig>): DependencyError[] {
    this.logger.debug('检查循环依赖');
    
    const errors: DependencyError[] = [];
    const visiting = new Set<string>();
    const visited = new Set<string>();

    for (const [moduleName, module] of modules) {
      if (!visited.has(moduleName)) {
        const cycleErrors = this.detectCycle(
          moduleName, 
          module, 
          modules, 
          visiting, 
          visited, 
          []
        );
        errors.push(...cycleErrors);
      }
    }

    if (errors.length > 0) {
      this.logger.warn('检测到循环依赖', { errorCount: errors.length });
    }

    return errors;
  }

  /**
   * 构建依赖图
   */
  private buildDependencyGraph(modules: Map<string, ModuleConfig>): Map<string, string[]> {
    const graph = new Map<string, string[]>();

    for (const [moduleName, module] of modules) {
      const dependencies = module.dependencies || [];
      const validDependencies = dependencies.filter(dep => modules.has(dep));
      graph.set(moduleName, validDependencies);
    }

    return graph;
  }

  /**
   * 拓扑排序
   */
  private topologicalSort(graph: Map<string, string[]>): string[] {
    const inDegree = new Map<string, number>();
    const queue: string[] = [];
    const result: string[] = [];

    // 初始化入度
    for (const [module] of graph) {
      inDegree.set(module, 0);
    }

    // 计算入度
    for (const [module, dependencies] of graph) {
      for (const dep of dependencies) {
        if (inDegree.has(dep)) {
          inDegree.set(dep, (inDegree.get(dep) || 0) + 1);
        }
      }
    }

    // 找到入度为0的节点
    for (const [module, degree] of inDegree) {
      if (degree === 0) {
        queue.push(module);
      }
    }

    // 拓扑排序
    while (queue.length > 0) {
      const current = queue.shift()!;
      result.push(current);

      // 更新依赖当前模块的模块的入度
      for (const [module, dependencies] of graph) {
        if (dependencies.includes(current)) {
          const newDegree = (inDegree.get(module) || 0) - 1;
          inDegree.set(module, newDegree);
          
          if (newDegree === 0) {
            queue.push(module);
          }
        }
      }
    }

    // 检查是否所有模块都被处理（应该没有，因为前面已经检查了循环依赖）
    if (result.length !== graph.size) {
      throw new Error('拓扑排序失败，可能存在未检测到的循环依赖');
    }

    return result;
  }

  /**
   * 识别可并行加载的模块组
   */
  private identifyParallelGroups(
    graph: Map<string, string[]>, 
    orderedModules: string[]
  ): string[][] {
    const groups: string[][] = [];
    const processed = new Set<string>();
    let currentGroup: string[] = [];

    for (const module of orderedModules) {
      if (processed.has(module)) {
        continue;
      }

      // 获取当前模块的所有依赖
      const dependencies = graph.get(module) || [];
      
      // 检查依赖是否都已处理
      const allDependenciesProcessed = dependencies.every(dep => processed.has(dep));
      
      if (allDependenciesProcessed) {
        currentGroup.push(module);
        processed.add(module);
      } else {
        // 如果依赖未处理完，结束当前组
        if (currentGroup.length > 0) {
          groups.push([...currentGroup]);
          currentGroup = [];
        }
        // 将当前模块加入新组（它的依赖肯定在前面已经处理）
        currentGroup.push(module);
        processed.add(module);
      }
    }

    // 添加最后一组
    if (currentGroup.length > 0) {
      groups.push(currentGroup);
    }

    return groups;
  }

  /**
   * 检测循环依赖
   */
  private detectCycle(
    moduleName: string,
    module: ModuleConfig,
    modules: Map<string, ModuleConfig>,
    visiting: Set<string>,
    visited: Set<string>,
    path: string[]
  ): DependencyError[] {
    visiting.add(moduleName);
    path.push(moduleName);

    const errors: DependencyError[] = [];

    for (const dependency of module.dependencies || []) {
      if (!modules.has(dependency)) {
        // 忽略不存在的依赖
        continue;
      }

      if (visiting.has(dependency)) {
        // 发现循环依赖
        const cycleStart = path.indexOf(dependency);
        const cyclePath = path.slice(cycleStart).concat(dependency);
        errors.push({
          module: moduleName,
          dependency,
          message: `循环依赖: ${cyclePath.join(' -> ')}`
        });
      } else if (!visited.has(dependency)) {
        const depModule = modules.get(dependency)!;
        const depErrors = this.detectCycle(
          dependency,
          depModule,
          modules,
          visiting,
          visited,
          [...path]
        );
        errors.push(...depErrors);
      }
    }

    visiting.delete(moduleName);
    visited.add(moduleName);

    return errors;
  }
}