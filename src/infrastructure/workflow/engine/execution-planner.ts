import { injectable } from 'inversify';
import { Graph } from '../../../../domain/workflow/graph/entities/graph';
import { Node } from '../../../../domain/workflow/graph/entities/node';
import { Edge } from '../../../../domain/workflow/graph/entities/edge';
import { NodeId } from '../../../../domain/workflow/graph/value-objects/node-id';

export interface ExecutionPlan {
  steps: ExecutionStep[];
  parallelGroups: ParallelGroup[];
  estimatedDuration: number;
  criticalPath: NodeId[];
}

export interface ExecutionStep {
  nodeId: NodeId;
  dependencies: NodeId[];
  parallelGroup?: number;
  estimatedDuration: number;
}

export interface ParallelGroup {
  id: number;
  nodeIds: NodeId[];
  canStartAfter: number; // Step index after which this group can start
}

@injectable()
export class ExecutionPlanner {
  createExecutionPlan(graph: Graph): ExecutionPlan {
    // Validate graph
    const validation = this.validateGraph(graph);
    if (!validation.valid) {
      throw new Error(`Invalid graph: ${validation.errors.join(', ')}`);
    }

    // Calculate node dependencies
    const dependencies = this.calculateDependencies(graph);
    
    // Identify parallel groups
    const parallelGroups = this.identifyParallelGroups(graph, dependencies);
    
    // Create execution steps
    const steps = this.createExecutionSteps(graph, dependencies, parallelGroups);
    
    // Calculate critical path
    const criticalPath = this.calculateCriticalPath(graph, dependencies);
    
    // Estimate total duration
    const estimatedDuration = this.estimateTotalDuration(steps);

    return {
      steps,
      parallelGroups,
      estimatedDuration,
      criticalPath
    };
  }

  private validateGraph(graph: Graph): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check if graph has nodes
    if (graph.nodes.size === 0) {
      errors.push('Graph must have at least one node');
    }

    // Check if all edges reference valid nodes
    for (const edge of graph.edges.values()) {
      if (!graph.nodes.has(edge.sourceNodeId.value)) {
        errors.push(`Edge references non-existent source node: ${edge.sourceNodeId.value}`);
      }

      if (!graph.nodes.has(edge.targetNodeId.value)) {
        errors.push(`Edge references non-existent target node: ${edge.targetNodeId.value}`);
      }
    }

    // Check for cycles
    if (this.hasCycles(graph)) {
      errors.push('Graph contains cycles');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  private calculateDependencies(graph: Graph): Map<string, string[]> {
    const dependencies = new Map<string, string[]>();

    // Initialize dependencies for all nodes
    for (const nodeId of graph.nodes.keys()) {
      dependencies.set(nodeId, []);
    }

    // Calculate dependencies based on edges
    for (const edge of graph.edges.values()) {
      const targetDeps = dependencies.get(edge.targetNodeId.value) || [];
      targetDeps.push(edge.sourceNodeId.value);
      dependencies.set(edge.targetNodeId.value, targetDeps);
    }

    return dependencies;
  }

  private identifyParallelGroups(
    graph: Graph, 
    dependencies: Map<string, string[]>
  ): ParallelGroup[] {
    const groups: ParallelGroup[] = [];
    const processedNodes = new Set<string>();
    let groupId = 0;

    // Find nodes that can be executed in parallel
    while (processedNodes.size < graph.nodes.size) {
      const currentGroup = this.findParallelGroup(graph, dependencies, processedNodes);
      
      if (currentGroup.length === 0) {
        break; // No more nodes can be processed
      }

      groups.push({
        id: groupId++,
        nodeIds: currentGroup.map(node => node.id),
        canStartAfter: groups.length > 0 ? groups.length - 1 : 0
      });

      currentGroup.forEach(node => processedNodes.add(node.id.value));
    }

    return groups;
  }

  private findParallelGroup(
    graph: Graph,
    dependencies: Map<string, string[]>,
    processedNodes: Set<string>
  ): Node[] {
    const group: Node[] = [];

    for (const node of graph.nodes.values()) {
      // Skip already processed nodes
      if (processedNodes.has(node.id.value)) {
        continue;
      }

      // Check if all dependencies are processed
      const nodeDeps = dependencies.get(node.id.value) || [];
      const allDepsProcessed = nodeDeps.every(dep => processedNodes.has(dep));

      if (allDepsProcessed) {
        group.push(node);
      }
    }

    return group;
  }

  private createExecutionSteps(
    graph: Graph,
    dependencies: Map<string, string[]>,
    parallelGroups: ParallelGroup[]
  ): ExecutionStep[] {
    const steps: ExecutionStep[] = [];
    const nodeToGroup = new Map<string, number>();

    // Map nodes to their parallel groups
    for (const group of parallelGroups) {
      for (const nodeId of group.nodeIds) {
        nodeToGroup.set(nodeId.value, group.id);
      }
    }

    // Create steps for each node
    for (const node of graph.nodes.values()) {
      const nodeDeps = dependencies.get(node.id.value) || [];
      const parallelGroup = nodeToGroup.get(node.id.value);

      steps.push({
        nodeId: node.id,
        dependencies: nodeDeps.map(dep => new NodeId(dep)),
        parallelGroup,
        estimatedDuration: this.estimateNodeDuration(node)
      });
    }

    // Sort steps by dependencies and parallel groups
    return this.sortSteps(steps);
  }

  private sortSteps(steps: ExecutionStep[]): ExecutionStep[] {
    const sorted: ExecutionStep[] = [];
    const processed = new Set<string>();
    let changed = true;

    while (changed && sorted.length < steps.length) {
      changed = false;

      for (const step of steps) {
        if (processed.has(step.nodeId.value)) {
          continue;
        }

        // Check if all dependencies are processed
        const allDepsProcessed = step.dependencies.every(dep => 
          processed.has(dep.value)
        );

        if (allDepsProcessed) {
          sorted.push(step);
          processed.add(step.nodeId.value);
          changed = true;
        }
      }
    }

    return sorted;
  }

  private calculateCriticalPath(
    graph: Graph,
    dependencies: Map<string, string[]>
  ): NodeId[] {
    const nodeDurations = new Map<string, number>();
    const earliestStart = new Map<string, number>();
    const earliestFinish = new Map<string, number>();

    // Calculate node durations
    for (const node of graph.nodes.values()) {
      nodeDurations.set(node.id.value, this.estimateNodeDuration(node));
    }

    // Find start nodes (nodes with no dependencies)
    const startNodes: string[] = [];
    for (const nodeId of graph.nodes.keys()) {
      const deps = dependencies.get(nodeId) || [];
      if (deps.length === 0) {
        startNodes.push(nodeId);
        earliestStart.set(nodeId, 0);
        earliestFinish.set(nodeId, nodeDurations.get(nodeId) || 0);
      }
    }

    // Calculate earliest start and finish times using topological sort
    const processed = new Set<string>();
    const queue = [...startNodes];

    while (queue.length > 0) {
      const nodeId = queue.shift()!;
      processed.add(nodeId);

      // Find nodes that depend on this node
      for (const [targetNodeId, deps] of dependencies.entries()) {
        if (deps.includes(nodeId) && !processed.has(targetNodeId)) {
          const currentEarliestStart = earliestStart.get(targetNodeId) || 0;
          const newEarliestStart = earliestFinish.get(nodeId) || 0;
          
          if (newEarliestStart > currentEarliestStart) {
            earliestStart.set(targetNodeId, newEarliestStart);
            earliestFinish.set(targetNodeId, newEarliestStart + (nodeDurations.get(targetNodeId) || 0));
          }

          // Check if all dependencies are processed
          const allDepsProcessed = deps.every(dep => processed.has(dep));
          if (allDepsProcessed && !queue.includes(targetNodeId)) {
            queue.push(targetNodeId);
          }
        }
      }
    }

    // Find the node with the latest finish time (end of critical path)
    let maxFinishTime = 0;
    let endNodeId: string | null = null;

    for (const [nodeId, finishTime] of earliestFinish.entries()) {
      if (finishTime > maxFinishTime) {
        maxFinishTime = finishTime;
        endNodeId = nodeId;
      }
    }

    // Trace back from end node to find critical path
    const criticalPath: NodeId[] = [];
    let currentNodeId = endNodeId;

    while (currentNodeId) {
      criticalPath.unshift(new NodeId(currentNodeId));
      
      // Find the predecessor that contributed to the earliest start time
      const deps = dependencies.get(currentNodeId) || [];
      let predecessorId: string | null = null;
      let maxPredecessorFinish = -1;

      for (const dep of deps) {
        const depFinishTime = earliestFinish.get(dep) || 0;
        if (depFinishTime > maxPredecessorFinish) {
          maxPredecessorFinish = depFinishTime;
          predecessorId = dep;
        }
      }

      currentNodeId = predecessorId;
    }

    return criticalPath;
  }

  private estimateTotalDuration(steps: ExecutionStep[]): number {
    // This is a simplified estimation
    // In a real implementation, you would consider parallel execution
    return steps.reduce((total, step) => total + step.estimatedDuration, 0);
  }

  private estimateNodeDuration(node: Node): number {
    // Base duration by node type
    const baseDurations: Record<string, number> = {
      'llm': 5000,        // 5 seconds for LLM calls
      'tool': 2000,        // 2 seconds for tool execution
      'condition': 100,    // 100ms for condition evaluation
      'wait': 1000,        // 1 second base for wait nodes
      'transform': 500,    // 500ms for data transformation
      'input': 100,        // 100ms for input nodes
      'output': 100        // 100ms for output nodes
    };

    let duration = baseDurations[node.type] || 1000;

    // Adjust based on node configuration
    if (node.config.timeout) {
      duration = Math.min(duration, node.config.timeout);
    }

    if (node.metadata.estimatedDuration) {
      duration = node.metadata.estimatedDuration;
    }

    return duration;
  }

  private hasCycles(graph: Graph): boolean {
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    for (const node of graph.nodes.values()) {
      if (this.hasCycleDFS(node, graph, visited, recursionStack)) {
        return true;
      }
    }

    return false;
  }

  private hasCycleDFS(
    node: Node,
    graph: Graph,
    visited: Set<string>,
    recursionStack: Set<string>
  ): boolean {
    visited.add(node.id.value);
    recursionStack.add(node.id.value);

    // Find outgoing edges
    for (const edge of graph.edges.values()) {
      if (edge.sourceNodeId.value === node.id.value) {
        const targetNode = graph.nodes.get(edge.targetNodeId.value);
        if (!targetNode) continue;

        if (!visited.has(targetNode.id.value)) {
          if (this.hasCycleDFS(targetNode, graph, visited, recursionStack)) {
            return true;
          }
        } else if (recursionStack.has(targetNode.id.value)) {
          return true;
        }
      }
    }

    recursionStack.delete(node.id.value);
    return false;
  }

  // Utility methods for plan optimization
  optimizePlan(plan: ExecutionPlan): ExecutionPlan {
    // This could implement various optimization strategies
    // For now, return the original plan
    return plan;
  }

  validatePlan(plan: ExecutionPlan): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check if all steps have valid dependencies
    for (const step of plan.steps) {
      for (const dep of step.dependencies) {
        const depStep = plan.steps.find(s => s.nodeId.value === dep.value);
        if (!depStep) {
          errors.push(`Step ${step.nodeId.value} has invalid dependency: ${dep.value}`);
        }
      }
    }

    // Check for circular dependencies
    if (this.hasCircularDependencies(plan.steps)) {
      errors.push('Plan contains circular dependencies');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  private hasCircularDependencies(steps: ExecutionStep[]): boolean {
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    for (const step of steps) {
      if (this.hasCircularDependenciesDFS(step, steps, visited, recursionStack)) {
        return true;
      }
    }

    return false;
  }

  private hasCircularDependenciesDFS(
    step: ExecutionStep,
    steps: ExecutionStep[],
    visited: Set<string>,
    recursionStack: Set<string>
  ): boolean {
    visited.add(step.nodeId.value);
    recursionStack.add(step.nodeId.value);

    for (const dep of step.dependencies) {
      const depStep = steps.find(s => s.nodeId.value === dep.value);
      if (!depStep) continue;

      if (!visited.has(depStep.nodeId.value)) {
        if (this.hasCircularDependenciesDFS(depStep, steps, visited, recursionStack)) {
          return true;
        }
      } else if (recursionStack.has(depStep.nodeId.value)) {
        return true;
      }
    }

    recursionStack.delete(step.nodeId.value);
    return false;
  }
}