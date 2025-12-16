import { Graph } from '@domain/workflow/entities/graph';
import { ID } from '@domain/common/value-objects/id';
import { Timestamp } from '@domain/common/value-objects/timestamp';
import { Version } from '@domain/common/value-objects/version';
import { NodeType } from '@/domain/workflow/value-objects/node-type';
import { EdgeType } from '@/domain/workflow/value-objects/edge-type';
import { Node } from '@domain/workflow/entities/nodes/base/node';
import { Edge } from '@domain/workflow/entities/edges/base/edge';
import { GraphModel } from '../../models/graph.model';
import { NodeModel } from '../../models/node.model';
import { EdgeModel } from '../../models/edge.model';

export class GraphMapper {
  toEntity(model: GraphModel): Graph {
    const nodes = new Map<string, Node>();
    const edges = new Map<string, Edge>();

    // Convert nodes
    if (model.nodes) {
      for (const nodeModel of model.nodes) {
        const node = this.nodeToEntity(nodeModel);
        nodes.set(node.nodeId.value, node);
      }
    }

    // Convert edges
    if (model.edges) {
      for (const edgeModel of model.edges) {
        const edge = this.edgeToEntity(edgeModel);
        edges.set(edge.edgeId.value, edge);
      }
    }

    const props = {
      id: ID.fromString(model.id),
      name: model.name,
      description: model.description,
      nodes,
      edges,
      metadata: model.metadata || {},
      createdAt: Timestamp.create(model.createdAt),
      updatedAt: Timestamp.create(model.updatedAt),
      version: Version.fromString(model.version.toString()),
      isDeleted: false
    };

    return Graph.fromProps(props);
  }

  toModel(entity: Graph): GraphModel {
    const model = new GraphModel();
    model.id = entity.graphId.value;
    model.name = entity.name;
    model.description = entity.description;
    model.metadata = entity.metadata;
    model.createdAt = entity.createdAt.getDate();
    model.updatedAt = entity.updatedAt.getDate();
    model.version = parseInt(entity.version.getValue());

    return model;
  }

  nodeToEntity(model: NodeModel): Node {
    const props = {
      id: ID.fromString(model.id),
      graphId: ID.fromString(model.graphId),
      type: NodeType.fromString(model.type),
      name: model.name,
      description: model.configuration?.description,
      position: model.position,
      properties: model.configuration?.properties || {},
      createdAt: Timestamp.create(model.createdAt),
      updatedAt: Timestamp.create(model.updatedAt),
      version: Version.fromString(model.version.toString()),
      isDeleted: false
    };

    return Node.fromProps(props);
  }

  nodeToModel(entity: Node, graphId: string): NodeModel {
    const model = new NodeModel();
    model.id = entity.nodeId.value;
    model.graphId = graphId;
    model.type = entity.type.getValue();
    model.name = entity.name || '';
    model.configuration = {
      description: entity.description,
      properties: entity.properties
    };
    model.position = entity.position || { x: 0, y: 0 };
    model.metadata = entity.properties;
    model.createdAt = entity.createdAt.getDate();
    model.updatedAt = entity.updatedAt.getDate();
    model.version = parseInt(entity.version.getValue());

    return model;
  }

  edgeToEntity(model: EdgeModel): Edge {
    const props = {
      id: ID.fromString(model.id),
      graphId: ID.fromString(model.graphId),
      type: EdgeType.fromString(model.type),
      fromNodeId: ID.fromString(model.sourceNodeId),
      toNodeId: ID.fromString(model.targetNodeId),
      condition: model.condition?.expression,
      weight: model.condition?.weight,
      properties: model.metadata || {},
      createdAt: Timestamp.create(model.createdAt),
      updatedAt: Timestamp.create(model.updatedAt),
      version: Version.fromString(model.version.toString()),
      isDeleted: false
    };

    return Edge.fromProps(props);
  }

  edgeToModel(entity: Edge, graphId: string): EdgeModel {
    const model = new EdgeModel();
    model.id = entity.edgeId.value;
    model.graphId = graphId;
    model.sourceNodeId = entity.fromNodeId.value;
    model.targetNodeId = entity.toNodeId.value;
    model.type = entity.type.getValue();
    model.condition = {
      expression: entity.condition,
      weight: entity.weight
    };
    model.metadata = entity.properties;
    model.createdAt = entity.createdAt.getDate();
    model.updatedAt = entity.updatedAt.getDate();
    model.version = parseInt(entity.version.getValue());

    return model;
  }
}