import { Graph } from '../../../../domain/workflow/graph/entities/graph';
import { NodeId } from '../../../../domain/workflow/graph/value-objects/node-id';
import { EdgeId } from '../../../../domain/workflow/graph/value-objects/edge-id';
import { IExecutionContext } from '../../../../domain/workflow/graph/interfaces/execution-context.interface';

export class ExecutionContext implements IExecutionContext {
  private readonly graph: Graph;
  private readonly input: any;
  private readonly startTime: number;
  private readonly nodeId: string;
  
  private executedNodes: Set<string> = new Set();
  private nodeResults: Map<string, any> = new Map();
  private edgeResults: Map<string, boolean> = new Map();
  private variables: Map<string, any> = new Map();
  private metadata: Map<string, any> = new Map();

  constructor(graph: Graph, input: any, nodeId?: string) {
    this.graph = graph;
    this.input = input;
    this.startTime = Date.now();
    this.nodeId = nodeId || this.generateExecutionId();
  }

  getGraph(): Graph {
    return this.graph;
  }

  getInput(): any {
    return this.input;
  }

  getExecutionId(): string {
    return this.nodeId;
  }

  getStartTime(): number {
    return this.startTime;
  }

  getElapsedTime(): number {
    return Date.now() - this.startTime;
  }

  // Node execution tracking
  markNodeExecuted(nodeId: NodeId): void {
    this.executedNodes.add(nodeId.value);
  }

  isNodeExecuted(nodeId: NodeId): boolean {
    return this.executedNodes.has(nodeId.value);
  }

  getExecutedNodes(): Set<string> {
    return new Set(this.executedNodes);
  }

  setNodeResult(nodeId: NodeId, result: any): void {
    this.nodeResults.set(nodeId.value, result);
  }

  getNodeResult(nodeId: NodeId): any {
    return this.nodeResults.get(nodeId.value);
  }

  getAllNodeResults(): Map<string, any> {
    return new Map(this.nodeResults);
  }

  // Edge evaluation tracking
  setEdgeResult(edgeId: EdgeId, result: boolean): void {
    this.edgeResults.set(edgeId.value, result);
  }

  getEdgeResult(edgeId: EdgeId): boolean | undefined {
    return this.edgeResults.get(edgeId.value);
  }

  getAllEdgeResults(): Map<string, boolean> {
    return new Map(this.edgeResults);
  }

  // Variable management
  setVariable(name: string, value: any): void {
    this.variables.set(name, value);
  }

  getVariable(name: string): any {
    return this.variables.get(name);
  }

  hasVariable(name: string): boolean {
    return this.variables.has(name);
  }

  deleteVariable(name: string): boolean {
    return this.variables.delete(name);
  }

  getAllVariables(): Map<string, any> {
    return new Map(this.variables);
  }

  // Metadata management
  setMetadata(key: string, value: any): void {
    this.metadata.set(key, value);
  }

  getMetadata(key: string): any {
    return this.metadata.get(key);
  }

  hasMetadata(key: string): boolean {
    return this.metadata.has(key);
  }

  deleteMetadata(key: string): boolean {
    return this.metadata.delete(key);
  }

  getAllMetadata(): Map<string, any> {
    return new Map(this.metadata);
  }

  // Utility methods
  clone(): ExecutionContext {
    const cloned = new ExecutionContext(this.graph, this.input, this.nodeId);
    
    // Copy executed nodes
    for (const nodeId of this.executedNodes) {
      cloned.executedNodes.add(nodeId);
    }
    
    // Copy node results
    for (const [nodeId, result] of this.nodeResults.entries()) {
      cloned.nodeResults.set(nodeId, result);
    }
    
    // Copy edge results
    for (const [edgeId, result] of this.edgeResults.entries()) {
      cloned.edgeResults.set(edgeId, result);
    }
    
    // Copy variables
    for (const [name, value] of this.variables.entries()) {
      cloned.variables.set(name, value);
    }
    
    // Copy metadata
    for (const [key, value] of this.metadata.entries()) {
      cloned.metadata.set(key, value);
    }
    
    return cloned;
  }

  merge(other: ExecutionContext): void {
    // Merge executed nodes
    for (const nodeId of other.executedNodes) {
      this.executedNodes.add(nodeId);
    }
    
    // Merge node results
    for (const [nodeId, result] of other.nodeResults.entries()) {
      this.nodeResults.set(nodeId, result);
    }
    
    // Merge edge results
    for (const [edgeId, result] of other.edgeResults.entries()) {
      this.edgeResults.set(edgeId, result);
    }
    
    // Merge variables
    for (const [name, value] of other.variables.entries()) {
      this.variables.set(name, value);
    }
    
    // Merge metadata
    for (const [key, value] of other.metadata.entries()) {
      this.metadata.set(key, value);
    }
  }

  toJSON(): any {
    return {
      executionId: this.nodeId,
      startTime: this.startTime,
      elapsedTime: this.getElapsedTime(),
      graphId: this.graph.id.value,
      input: this.input,
      executedNodes: Array.from(this.executedNodes),
      nodeResults: Object.fromEntries(this.nodeResults),
      edgeResults: Object.fromEntries(this.edgeResults),
      variables: Object.fromEntries(this.variables),
      metadata: Object.fromEntries(this.metadata)
    };
  }

  static fromJSON(data: any, graph: Graph): ExecutionContext {
    const context = new ExecutionContext(graph, data.input, data.executionId);
    
    // Restore executed nodes
    for (const nodeId of data.executedNodes || []) {
      context.executedNodes.add(nodeId);
    }
    
    // Restore node results
    for (const [nodeId, result] of Object.entries(data.nodeResults || {})) {
      context.nodeResults.set(nodeId, result);
    }
    
    // Restore edge results
    for (const [edgeId, result] of Object.entries(data.edgeResults || {})) {
      context.edgeResults.set(edgeId, result as boolean);
    }
    
    // Restore variables
    for (const [name, value] of Object.entries(data.variables || {})) {
      context.variables.set(name, value);
    }
    
    // Restore metadata
    for (const [key, value] of Object.entries(data.metadata || {})) {
      context.metadata.set(key, value);
    }
    
    return context;
  }

  private generateExecutionId(): string {
    return `exec_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  // Debug and monitoring methods
  getExecutionSummary(): any {
    return {
      executionId: this.nodeId,
      graphId: this.graph.id.value,
      graphName: this.graph.name,
      startTime: this.startTime,
      elapsedTime: this.getElapsedTime(),
      totalNodes: this.graph.nodes.size,
      executedNodes: this.executedNodes.size,
      totalEdges: this.graph.edges.size,
      evaluatedEdges: this.edgeResults.size,
      variablesCount: this.variables.size,
      metadataCount: this.metadata.size
    };
  }

  getNodeExecutionSummary(): any[] {
    const summary: any[] = [];
    
    for (const [nodeId, result] of this.nodeResults.entries()) {
      const node = this.graph.nodes.get(nodeId);
      if (node) {
        summary.push({
          nodeId,
          nodeName: node.name,
          nodeType: node.type,
          executed: true,
          result: result
        });
      }
    }
    
    // Add unexecuted nodes
    for (const [nodeId, node] of this.graph.nodes.entries()) {
      if (!this.executedNodes.has(nodeId)) {
        summary.push({
          nodeId,
          nodeName: node.name,
          nodeType: node.type,
          executed: false,
          result: null
        });
      }
    }
    
    return summary;
  }

  getEdgeEvaluationSummary(): any[] {
    const summary: any[] = [];
    
    for (const [edgeId, result] of this.edgeResults.entries()) {
      const edge = this.graph.edges.get(edgeId);
      if (edge) {
        summary.push({
          edgeId,
          sourceNodeId: edge.sourceNodeId.value,
          targetNodeId: edge.targetNodeId.value,
          evaluated: true,
          result: result
        });
      }
    }
    
    return summary;
  }
}