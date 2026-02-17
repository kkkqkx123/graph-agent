/**
 * 工作流预处理器
 * 负责工作流的预处理，包括节点展开、图构建、验证等
 * 基于现有 GraphBuilder 和 GraphValidator
 * 集成预处理ID映射方案
 * 返回 PreprocessedGraph 而不是 ProcessedWorkflowDefinition
 */

import type {
  WorkflowDefinition,
  GraphBuildOptions,
  SubgraphMergeLog,
  PreprocessValidationResult,
  ID,
  PreprocessedGraph
} from '@modular-agent/types';
import type { Node } from '@modular-agent/types';
import type { WorkflowTrigger } from '@modular-agent/types';
import type { TriggerReference } from '@modular-agent/types';
import { GraphBuilder } from './graph-builder.js';
import { GraphValidator } from '../validation/graph-validator.js';
import { WorkflowValidator } from '../validation/workflow-validator.js';
import { IdMappingBuilder } from './id-mapping-builder.js';
import { PreprocessedGraphData } from '../entities/preprocessed-graph-data.js';
import { now } from '@modular-agent/common-utils';
import { ConfigurationValidationError, NodeTemplateNotFoundError, WorkflowNotFoundError } from '@modular-agent/types';
import { getContainer } from '../di/index.js';
import * as Identifiers from '../di/service-identifiers.js';

export interface ProcessOptions extends GraphBuildOptions {
  workflowRegistry?: any;
  maxRecursionDepth?: number;
}

/**
 * 预处理工作流
 * 返回 PreprocessedGraph 而不是 ProcessedWorkflowDefinition
 */
export async function processWorkflow(
  workflow: WorkflowDefinition,
  options: ProcessOptions = {}
): Promise<PreprocessedGraph> {
  const validator = new WorkflowValidator();

  // 1. 验证工作流定义
  const validationResult = validator.validate(workflow);
  if (validationResult.isErr()) {
    throw new ConfigurationValidationError(
      `Workflow validation failed: ${validationResult.error.map(e => e.message).join(', ')}`,
      {
        configType: 'workflow',
        configPath: 'workflow'
      }
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
    throw new ConfigurationValidationError(
      `Graph build failed: ${buildResult.errors.join(', ')}`,
      {
        configType: 'workflow',
        configPath: 'workflow.graph'
      }
    );
  }

  // 6. 处理子工作流
  const subgraphMergeLogs: SubgraphMergeLog[] = [];
  let hasSubgraphs = false;
  const subworkflowIds = new Set<ID>();

  if (options.workflowRegistry) {
    const subgraphResult = await GraphBuilder.processSubgraphs(
      buildResult.graph,
      options.workflowRegistry,
      options.maxRecursionDepth ?? 10
    );

    if (!subgraphResult.success) {
      throw new ConfigurationValidationError(
        `Subgraph processing failed: ${subgraphResult.errors.join(', ')}`,
        {
          configType: 'workflow',
          configPath: 'workflow.subgraphs'
        }
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
              mergedAt: now(),
            };
            subgraphMergeLogs.push(mergeLog);
          }
        }
      }
    }
  }

  // 7. 处理触发器引用的工作流
  if (options.workflowRegistry) {
    const triggeredWorkflowIds = extractTriggeredWorkflowIds(expandedTriggers);
    const container = getContainer();
    const graphRegistry = container.get(Identifiers.GraphRegistry);

    for (const triggeredWorkflowId of triggeredWorkflowIds) {
      // 从 graph-registry 获取已预处理的图
      // 预处理逻辑已移到 workflow-registry，注册时自动处理
      const processedTriggeredWorkflow = graphRegistry.get(triggeredWorkflowId);

      if (!processedTriggeredWorkflow) {
        throw new WorkflowNotFoundError(
          `Triggered workflow '${triggeredWorkflowId}' referenced in triggers not found or not preprocessed`,
          triggeredWorkflowId
        );
      }

      // 记录触发器引用的工作流ID
      subworkflowIds.add(triggeredWorkflowId);
    }
  }

  // 8. 验证图
  const graphValidationResult = GraphValidator.validate(buildResult.graph);
  if (graphValidationResult.isErr()) {
    const errors = graphValidationResult.error.map((e: { message: string }) => e.message).join(', ');
    throw new ConfigurationValidationError(
      `Graph validation failed: ${errors}`,
      {
        configType: 'workflow',
        configPath: 'workflow.graph'
      }
    );
  }

  // 9. 分析图
  const graphAnalysis = GraphValidator.analyze(buildResult.graph);

  // 10. 创建预处理验证结果
  const preprocessValidation: PreprocessValidationResult = {
    isValid: true,
    errors: [],
    warnings: [],
    validatedAt: now(),
  };

  // 11. 使用IdMappingBuilder生成ID映射和更新配置
  const idMappingBuilder = new IdMappingBuilder();
  const idMappingResult = await idMappingBuilder.build(
    buildResult.graph,
    expandedWorkflow,
    options.workflowRegistry
  );
  
  // 12. 创建PreprocessedGraphData
  const preprocessedGraph = new PreprocessedGraphData();
  
  // 复制图结构（使用GraphBuilder构建的图）
  preprocessedGraph.nodes = buildResult.graph.nodes;
  preprocessedGraph.edges = buildResult.graph.edges;
  preprocessedGraph.adjacencyList = buildResult.graph.adjacencyList;
  preprocessedGraph.reverseAdjacencyList = buildResult.graph.reverseAdjacencyList;
  preprocessedGraph.startNodeId = buildResult.graph.startNodeId;
  preprocessedGraph.endNodeIds = buildResult.graph.endNodeIds;
  
  // 设置ID映射相关字段（使用IdMappingBuilder的结果）
  preprocessedGraph.idMapping = idMappingResult.idMapping;
  preprocessedGraph.nodeConfigs = idMappingResult.nodeConfigs;
  preprocessedGraph.triggerConfigs = idMappingResult.triggerConfigs;
  preprocessedGraph.subgraphRelationships = idMappingResult.subgraphRelationships;
  
  // 设置预处理元数据
  preprocessedGraph.graphAnalysis = graphAnalysis;
  preprocessedGraph.validationResult = preprocessValidation;
  preprocessedGraph.topologicalOrder = graphAnalysis.topologicalSort.sortedNodes;
  preprocessedGraph.subgraphMergeLogs = subgraphMergeLogs;
  preprocessedGraph.processedAt = now();
  
  // 设置工作流元数据
  preprocessedGraph.workflowId = expandedWorkflow.id;
  preprocessedGraph.workflowVersion = expandedWorkflow.version;
  preprocessedGraph.triggers = expandedTriggers;
  preprocessedGraph.variables = expandedWorkflow.variables;
  preprocessedGraph.hasSubgraphs = hasSubgraphs;
  preprocessedGraph.subworkflowIds = subworkflowIds;
  
  return preprocessedGraph;
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
      const container = getContainer();
      const nodeTemplateRegistry = container.get(Identifiers.NodeTemplateRegistry) as any;
      const template = nodeTemplateRegistry.get(templateName);
      if (!template) {
        throw new NodeTemplateNotFoundError(
          `Node template not found: ${templateName}`,
          templateName
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
      const container = getContainer();
      const triggerTemplateRegistry = container.get(Identifiers.TriggerTemplateRegistry) as any;
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

/**
 * 从触发器列表中提取所有 EXECUTE_TRIGGERED_SUBGRAPH 动作引用的工作流ID
 * @param triggers 触发器列表
 * @returns 触发的工作流ID集合
 */
function extractTriggeredWorkflowIds(triggers: WorkflowTrigger[]): Set<string> {
  const triggeredWorkflowIds = new Set<string>();

  for (const trigger of triggers) {
    const triggerObj = trigger as any;

    // 检查 action 类型是否为 EXECUTE_TRIGGERED_SUBGRAPH
    if (triggerObj?.action?.type === 'execute_triggered_subgraph') {
      const triggeredWorkflowId = triggerObj.action.parameters?.triggeredWorkflowId;
      if (triggeredWorkflowId) {
        triggeredWorkflowIds.add(triggeredWorkflowId);
      }
    }
  }

  return triggeredWorkflowIds;
}