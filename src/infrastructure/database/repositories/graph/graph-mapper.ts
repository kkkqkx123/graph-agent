import { Graph } from '../../../../domain/workflow/submodules/graph/entities/graph';
import { GraphId } from '../../../../domain/workflow/submodules/graph/value-objects/graph-id';
import { Node } from '../../../../domain/workflow/submodules/graph/entities/node';
import { NodeId } from '../../../../domain/workflow/submodules/graph/value-objects/node-id';
import { Edge } from '../../../../domain/workflow/submodules/graph/entities/edge';
import { EdgeId } from '../../../../domain/workflow/submodules/graph/value-objects/edge-id';
import { GraphModel } from '../../models/graph.model';
import { NodeModel } from '../../models/node.model';
import { EdgeModel } from '../../models/edge.model';

export class GraphMapper {
  toEntity(model: GraphModel): Graph {
    const nodes = new Map<NodeId, Node>();
    const edges = new Map<EdgeId, Edge>();

    // Convert nodes
    if (model.nodes) {
      for (const nodeModel of model.nodes) {
        const node = this.nodeToEntity(nodeModel);
        nodes.set(node.id, node);
      }
    }

    // Convert edges
    if (model.edges) {
      for (const edgeModel of model.edges) {
        const edge = this.edgeToEntity(edgeModel);
        edges.set(edge.id, edge);
      }
    }

    return new Graph(
      new GraphId(model.id),
      model.name,
      model.description,
      nodes,
      edges,
      model.metadata,
      new Date(model.createdAt),
      new Date(model.updatedAt)
    );
  }

  toModel(entity: Graph): GraphModel {
    const model = new GraphModel();
    model.id = entity.id.value;
    model.name = entity.name;
    model.description = entity.description;
    model.metadata = entity.metadata;
    model.createdAt = entity.createdAt;
    model.updatedAt = entity.updatedAt;
    
    return model;
  }

  nodeToEntity(model: NodeModel): Node {
    return new Node(
      new NodeId(model.id),
      model.type,
      model.name,
      model.description,
      model.config,
      model.metadata,
      model.position ? {
        x: model.position.x,
        y: model.position.y
      } : undefined
    );
  }

  nodeToModel(entity: Node, graphId: string): NodeModel {
    const model = new NodeModel();
    model.id = entity.id.value;
    model.graphId = graphId;
    model.type = entity.type;
    model.name = entity.name;
    model.description = entity.description;
    model.config = entity.config;
    model.metadata = entity.metadata;
    model.position = entity.position;
    
    return model;
  }

  edgeToEntity(model: EdgeModel): Edge {
    return new Edge(
      new EdgeId(model.id),
      new NodeId(model.sourceNodeId),
      new NodeId(model.targetNodeId),
      model.condition,
      model.metadata
    );
  }

  edgeToModel(entity: Edge, graphId: string): EdgeModel {
    const model = new EdgeModel();
    model.id = entity.id.value;
    model.graphId = graphId;
    model.sourceNodeId = entity.sourceNodeId.value;
    model.targetNodeId = entity.targetNodeId.value;
    model.condition = entity.condition;
    model.metadata = entity.metadata;
    
    return model;
  }
}