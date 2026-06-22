/**
 * Workflow API - Programmatic workflow definition
 */

import { WorkflowBuilder } from '../builders/workflow.builder.js';
import type { WorkflowTemplate } from '../types/workflow.types.js';

/**
 * Workflow API interface
 */
export interface WorkflowAPI {
  create(id: string): WorkflowBuilder;
  fromTemplate(template: WorkflowTemplate): WorkflowBuilder;
}

/**
 * Workflow API implementation
 */
export class WorkflowAPIImpl implements WorkflowAPI {
  create(id: string): WorkflowBuilder {
    return new WorkflowBuilder(id);
  }

  fromTemplate(template: WorkflowTemplate): WorkflowBuilder {
    const builder = new WorkflowBuilder(template.id);

    // Validate and populate builder with template data
    if (!Array.isArray(template.nodes)) {
      throw new Error('Template must contain a nodes array');
    }

    if (!Array.isArray(template.edges)) {
      throw new Error('Template must contain an edges array');
    }

    for (const node of template.nodes) {
      builder.node(node.id, {
        type: node.type,
        config: node.config,
        name: node.name,
        description: node.description,
      });
    }

    for (const edge of template.edges) {
      builder.edge(edge.from, edge.to, edge.condition);
    }

    if (template.metadata) {
      builder.metadata(template.metadata);
    }

    if (template.name) {
      builder.name(template.name);
    }

    if (template.description) {
      builder.description(template.description);
    }

    return builder;
  }
}
