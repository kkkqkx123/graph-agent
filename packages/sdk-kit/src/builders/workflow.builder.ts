/**
 * Workflow Builder - Programmatic workflow definition
 */

import { KitError, KitErrorCode } from '../converters/error.converter.js';
import type { WorkflowTemplate, Node, Edge, NodeConfig, EdgeCondition } from '../types/workflow.types.js';

/**
 * Workflow Builder implementation
 */
export class WorkflowBuilder {
  private template: WorkflowTemplate;
  private nodes: Map<string, Node> = new Map();
  private edges: Edge[] = [];

  constructor(id: string) {
    this.template = {
      id,
      version: '1.0',
      nodes: [],
      edges: [],
    };
  }

  /**
   * Add a node to the workflow
   */
  node(id: string, config: NodeConfig): this {
    // Validate node ID uniqueness
    if (this.nodes.has(id)) {
      throw new KitError(
        `Node with ID "${id}" already exists`,
        KitErrorCode.DUPLICATE_NODE_ID
      );
    }

    // Validate node type
    if (!config.type) {
      throw new KitError(
        'Node type is required',
        KitErrorCode.VALIDATION_ERROR
      );
    }

    const node: Node = {
      id,
      type: config.type,
      config: config.config || {},
      name: config.name,
      description: config.description,
    };

    this.nodes.set(id, node);
    return this;
  }

  /**
   * Add an edge between two nodes
   */
  edge(from: string, to: string, condition?: EdgeCondition): this {
    // Validate nodes exist
    if (!this.nodes.has(from)) {
      throw new KitError(
        `Node "${from}" not found in workflow`,
        KitErrorCode.NODE_NOT_FOUND
      );
    }

    if (!this.nodes.has(to)) {
      throw new KitError(
        `Node "${to}" not found in workflow`,
        KitErrorCode.NODE_NOT_FOUND
      );
    }

    // Validate no duplicate edges
    const edgeExists = this.edges.some(
      (e) => e.from === from && e.to === to
    );
    if (edgeExists) {
      throw new KitError(
        `Edge from "${from}" to "${to}" already exists`,
        KitErrorCode.VALIDATION_ERROR
      );
    }

    const edge: Edge = {
      from,
      to,
      condition: condition || {},
    };

    this.edges.push(edge);
    return this;
  }

  /**
   * Set workflow metadata
   */
  metadata(data: Record<string, unknown>): this {
    this.template.metadata = data;
    return this;
  }

  /**
   * Set workflow name
   */
  name(name: string): this {
    this.template.name = name;
    return this;
  }

  /**
   * Set workflow description
   */
  description(description: string): this {
    this.template.description = description;
    return this;
  }

  /**
   * Build and validate the workflow template
   */
  build(): WorkflowTemplate {
    // Validate workflow has nodes
    if (this.nodes.size === 0) {
      throw new KitError(
        'Workflow must have at least one node',
        KitErrorCode.INVALID_WORKFLOW
      );
    }

    // Validate workflow has edges if more than one node
    if (this.nodes.size > 1 && this.edges.length === 0) {
      throw new KitError(
        'Workflow with multiple nodes must have at least one edge',
        KitErrorCode.INVALID_WORKFLOW
      );
    }

    // Populate template
    this.template.nodes = Array.from(this.nodes.values());
    this.template.edges = this.edges;

    // Return a copy of the template
    return this.getTemplate();
  }

  /**
   * Get a copy of the current template
   */
  private getTemplate(): WorkflowTemplate {
    return {
      id: this.template.id,
      version: this.template.version,
      name: this.template.name,
      description: this.template.description,
      nodes: [...this.template.nodes],
      edges: [...this.template.edges],
      metadata: this.template.metadata ? { ...this.template.metadata } : undefined,
    };
  }
}
