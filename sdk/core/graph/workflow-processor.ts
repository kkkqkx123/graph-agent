/**
 * 工作流预处理器
 * 负责工作流的预处理，包括节点展开、图构建、验证等
 * 基于现有 GraphBuilder 和 GraphValidator
 */

import type {
  WorkflowDefinition,
  ProcessedWorkflowDefinition,
  GraphBuildOptions,
  SubgraphMergeLog,
  PreprocessValidationResult,
  ID,
  Graph
} from '../../types';
import type { Node } from '../../types/node';
import type { WorkflowTrigger } from '../../types/trigger';
import type { TriggerReference } from '../../types/trigger-template';
import { GraphBuilder } from './graph-builder';
import { GraphValidator } from '../validation/graph-validator';
import { nodeTemplateRegistry } from '../services/node-template-registry';
import { triggerTemplateRegistry } from '../services/trigger-template-registry';
import { WorkflowValidator } from '../validation/workflow-validator';
import { now } from '../../utils';
import { ValidationError } from '../../types/errors';

export interface ProcessOptions extends GraphBuildOptions {
  workflowRegistry?: any;
  maxRecursionDepth?: number;
}

/**
 * 预处理工作流
 */
export function processWorkflow(
  workflow: WorkflowDefinition,
  options: ProcessOptions = {}
): ProcessedWorkflowDefinition {
  const validator = new WorkflowValidator();

  // 1. 验证工作流定义
  const validationResult = validator.validate(workflow);
  if (validationResult.isErr()) {
    throw new ValidationError(
      `Workflow validation failed: ${validationResult.error.map(e => e.message).join(', ')}`,
      'workflow'
    );
  }

  // 2. 展开节点引用
  const expandedNodes = expandNodeReferences(workflow.nodes);

  // 3. 展开触发器引用
  const expandedTriggers = expandTriggerReferences(workflow.triggers || []);

  // 4. 创建展开后的工作流定义
  const expandedWorkflow: WorkflowDefinition = {
    ...workflow,
    nodes: expandedNodes,
    triggers: expandedTriggers
  };

  // 5. 构建图
  const buildOptions: GraphBuildOptions = {
    validate: true,
    computeTopologicalOrder: true,
    detectCycles: true,
    analyzeReachability: true,
    maxRecursionDepth: options.maxRecursionDepth ?? 10,
    workflowRegistry: options.workflowRegistry,
  };

  const buildResult = GraphBuilder.buildAndValidate(expandedWorkflow, buildOptions);
  if (!buildResult.isValid) {
    throw new ValidationError(
      `Graph build failed: ${buildResult.errors.join(', ')}`,
      'workflow.graph'
    );
  }

  // 6. 处理子工作流
  const subgraphMergeLogs: SubgraphMergeLog[] = [];
  let hasSubgraphs = false;
  const subworkflowIds = new Set<ID>();

  if (options.workflowRegistry) {
    const subgraphResult = GraphBuilder.processSubgraphs(
      buildResult.graph,
      options.workflowRegistry,
      options.maxRecursionDepth ?? 10
    );

    if (!subgraphResult.success) {
      throw new ValidationError(
        `Subgraph processing failed: ${subgraphResult.errors.join(', ')}`,
        'workflow.subgraphs'
      );
    }

    // 记录子工作流信息
    if (subgraphResult.subworkflowIds.length > 0) {
      hasSubgraphs = true;
      subgraphResult.subworkflowIds.forEach(id => subworkflowIds.add(id));

      // 为每个子工作流创建合并日志
      for (const subworkflowId of subgraphResult.subworkflowIds) {
        const subworkflow = options.workflowRegistry.get(subworkflowId);
        if (subworkflow) {
          // 查找对应的SUBGRAPH节点
          const subgraphNode = workflow.nodes.find(
            node => node.type === 'SUBGRAPH' &&
              (node.config as any)?.subgraphId === subworkflowId
          );

          if (subgraphNode) {
            const mergeLog: SubgraphMergeLog = {
              subworkflowId,
              subworkflowName: subworkflow.name,
              subgraphNodeId: subgraphNode.id,
              nodeIdMapping: subgraphResult.nodeIdMapping,
              edgeIdMapping: subgraphResult.edgeIdMapping,
              inputMapping: new Map(Object.entries((subgraphNode.config as any)?.inputMapping || {})),
              outputMapping: new Map(Object.entries((subgraphNode.config as any)?.outputMapping || {})),
              mergedAt: now(),
            };
            subgraphMergeLogs.push(mergeLog);
          }
        }
      }
    }
  }

  // 7. 验证图
  const graphValidationResult = GraphValidator.validate(buildResult.graph);
  if (graphValidationResult.isErr()) {
    const errors = graphValidationResult.error.map((e: { message: string }) => e.message).join(', ');
    throw new ValidationError(
      `Graph validation failed: ${errors}`,
      'workflow.graph'
    );
  }

  // 8. 分析图
  const graphAnalysis = GraphValidator.analyze(buildResult.graph);

  // 9. 创建预处理验证结果
  const preprocessValidation: PreprocessValidationResult = {
    isValid: true,
    errors: [],
    warnings: [],
    validatedAt: now(),
  };

  // 10. 创建处理后的工作流定义
  // 注意：buildResult.graph 是 GraphData 类型，实现了 Graph 接口
  return {
    ...expandedWorkflow,
    triggers: expandedTriggers,
    graph: buildResult.graph as Graph,
    graphAnalysis,
    validationResult: preprocessValidation,
    subgraphMergeLogs,
    processedAt: now(),
    hasSubgraphs,
    subworkflowIds,
    topologicalOrder: graphAnalysis.topologicalSort.sortedNodes,
  };
}

/**
 * 展开节点引用
 */
function expandNodeReferences(nodes: Node[]): Node[] {
  const expandedNodes: Node[] = [];

  for (const node of nodes) {
    // 检查是否为节点引用
    if (isNodeReference(node)) {
      const config = node.config as any;
      const templateName = config.templateName;
      const nodeId = config.nodeId;
      const nodeName = config.nodeName;
      const configOverride = config.configOverride;

      // 获取节点模板
      const template = nodeTemplateRegistry.get(templateName);
      if (!template) {
        throw new ValidationError(
          `Node template not found: ${templateName}`,
          `node.${node.id}.config.templateName`
        );
      }

      // 合并配置覆盖
      const mergedConfig = configOverride
        ? { ...template.config, ...configOverride }
        : template.config;

      // 创建展开后的节点
      const expandedNode: Node = {
        id: nodeId,
        type: template.type,
        name: nodeName || template.name,
        config: mergedConfig,
        description: template.description,
        metadata: template.metadata,
        outgoingEdgeIds: node.outgoingEdgeIds,
        incomingEdgeIds: node.incomingEdgeIds
      };

      expandedNodes.push(expandedNode);
    } else {
      // 普通节点，直接添加
      expandedNodes.push(node);
    }
  }

  return expandedNodes;
}

/**
 * 检查节点是否为节点引用
 */
function isNodeReference(node: Node): boolean {
  const config = node.config as any;
  return config && typeof config === 'object' && 'templateName' in config;
}

/**
 * 展开触发器引用
 */
function expandTriggerReferences(triggers: (WorkflowTrigger | TriggerReference)[]): WorkflowTrigger[] {
  const expandedTriggers: WorkflowTrigger[] = [];

  for (const trigger of triggers) {
    // 检查是否为触发器引用
    if (isTriggerReference(trigger)) {
      const reference = trigger as TriggerReference;

      // 使用 TriggerTemplateRegistry 的转换方法
      const workflowTrigger = triggerTemplateRegistry.convertToWorkflowTrigger(
        reference.templateName,
        reference.triggerId,
        reference.triggerName,
        reference.configOverride
      );

      expandedTriggers.push(workflowTrigger);
    } else {
      // 普通触发器，直接添加
      expandedTriggers.push(trigger as WorkflowTrigger);
    }
  }

  return expandedTriggers;
}

/**
 * 检查触发器是否为触发器引用
 */
function isTriggerReference(trigger: WorkflowTrigger | TriggerReference): boolean {
  const triggerObj = trigger as any;
  return triggerObj && typeof triggerObj === 'object' && 'templateName' in triggerObj;
}