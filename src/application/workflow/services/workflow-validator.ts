import { injectable, inject } from 'inversify';
import { Workflow } from '../../../domain/workflow/entities/workflow';
import { Graph } from '../../../domain/workflow/graph/entities/graph';
import { WorkflowRepository } from '../../../domain/workflow/repositories/workflow-repository';
import { GraphRepository } from '../../../domain/workflow/graph/repositories/graph-repository';
import { GraphDomainService } from '../../../domain/workflow/graph/services/graph-domain-service';
import { ID } from '../../../domain/common/value-objects/id';
import { DomainError } from '../../../domain/common/errors/domain-error';
import { ILogger } from '@shared/types/logger';

/**
 * 验证结果
 */
export interface ValidationResult {
  /** 是否有效 */
  isValid: boolean;
  /** 错误列表 */
  errors: string[];
  /** 警告列表 */
  warnings: string[];
  /** 建议列表 */
  suggestions: string[];
}

/**
 * 工作流验证请求
 */
export interface WorkflowValidationRequest {
  /** 工作流ID */
  workflowId?: string;
  /** 图ID */
  graphId?: string;
  /** 工作流配置 */
  workflowConfig?: Record<string, unknown>;
  /** 验证级别 */
  validationLevel?: 'basic' | 'standard' | 'strict';
  /** 验证类型 */
  validationTypes?: Array<'structure' | 'semantics' | 'performance' | 'security'>;
}

/**
 * 工作流验证服务
 * 
 * 负责工作流的验证逻辑
 */
@injectable()
export class WorkflowValidator {
  constructor(
    @inject('WorkflowRepository') private readonly workflowRepository: WorkflowRepository,
    @inject('GraphRepository') private readonly graphRepository: GraphRepository,
    @inject('GraphDomainService') private readonly graphDomainService: GraphDomainService,
    @inject('Logger') private readonly logger: ILogger
  ) {}

  /**
   * 验证工作流
   * @param request 验证请求
   * @returns 验证结果
   */
  async validateWorkflow(request: WorkflowValidationRequest): Promise<ValidationResult> {
    try {
      this.logger.info('开始验证工作流', {
        workflowId: request.workflowId,
        graphId: request.graphId,
        validationLevel: request.validationLevel
      });

      const result: ValidationResult = {
        isValid: true,
        errors: [],
        warnings: [],
        suggestions: []
      };

      // 获取工作流和图
      let workflow: Workflow | null = null;
      let graph: Graph | null = null;

      if (request.workflowId) {
        workflow = await this.workflowRepository.findById(ID.fromString(request.workflowId));
        if (!workflow) {
          result.isValid = false;
          result.errors.push(`工作流不存在: ${request.workflowId}`);
          return result;
        }

        if (workflow.graphId) {
          graph = await this.graphRepository.findById(workflow.graphId);
        }
      }

      if (request.graphId) {
        graph = await this.graphRepository.findById(ID.fromString(request.graphId));
        if (!graph) {
          result.isValid = false;
          result.errors.push(`图不存在: ${request.graphId}`);
          return result;
        }
      }

      // 确定验证类型
      const validationTypes = request.validationTypes || ['structure', 'semantics'];
      const validationLevel = request.validationLevel || 'standard';

      // 执行验证
      for (const validationType of validationTypes) {
        const typeResult = await this.validateByType(validationType, workflow, graph, validationLevel);
        this.mergeValidationResults(result, typeResult);
      }

      // 如果有错误，标记为无效
      if (result.errors.length > 0) {
        result.isValid = false;
      }

      this.logger.info('工作流验证完成', {
        workflowId: request.workflowId,
        graphId: request.graphId,
        isValid: result.isValid,
        errorCount: result.errors.length,
        warningCount: result.warnings.length,
        suggestionCount: result.suggestions.length
      });

      return result;
    } catch (error) {
      this.logger.error('验证工作流失败', error as Error);
      throw error;
    }
  }

  /**
   * 验证工作流是否可以执行
   * @param workflowId 工作流ID
   * @returns 验证结果
   */
  async validateWorkflowForExecution(workflowId: string): Promise<ValidationResult> {
    try {
      this.logger.info('验证工作流是否可以执行', { workflowId });

      const result: ValidationResult = {
        isValid: true,
        errors: [],
        warnings: [],
        suggestions: []
      };

      // 获取工作流
      const workflow = await this.workflowRepository.findById(ID.fromString(workflowId));
      if (!workflow) {
        result.isValid = false;
        result.errors.push(`工作流不存在: ${workflowId}`);
        return result;
      }

      // 验证工作流状态
      if (!workflow.status.isActive()) {
        result.isValid = false;
        result.errors.push(`工作流状态不是活跃状态: ${workflow.status.toString()}`);
      }

      // 验证工作流是否有关联的图
      if (!workflow.graphId) {
        result.isValid = false;
        result.errors.push('工作流没有关联的图');
        return result;
      }

      // 获取并验证图
      const graph = await this.graphRepository.findById(workflow.graphId);
      if (!graph) {
        result.isValid = false;
        result.errors.push(`工作流关联的图不存在: ${workflow.graphId.toString()}`);
        return result;
      }

      // 验证图结构
      const graphValidationResult = await this.graphDomainService.validateGraphStructure(workflow.graphId);
      this.mergeValidationResults(result, {
        isValid: graphValidationResult.isValid,
        errors: graphValidationResult.errors,
        warnings: graphValidationResult.warnings,
        suggestions: []
      });

      // 验证工作流配置
      if (workflow.config) {
        const configValidationResult = await this.validateWorkflowConfig(workflow.config.value);
        this.mergeValidationResults(result, configValidationResult);
      }

      // 如果有错误，标记为无效
      if (result.errors.length > 0) {
        result.isValid = false;
      }

      this.logger.info('工作流执行验证完成', {
        workflowId,
        isValid: result.isValid,
        errorCount: result.errors.length,
        warningCount: result.warnings.length
      });

      return result;
    } catch (error) {
      this.logger.error('验证工作流执行失败', error as Error);
      throw error;
    }
  }

  /**
   * 验证工作流配置
   * @param config 工作流配置
   * @returns 验证结果
   */
  async validateWorkflowConfig(config: Record<string, unknown>): Promise<ValidationResult> {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      suggestions: []
    };

    try {
      // 验证基本配置项
      if (!config) {
        result.isValid = false;
        result.errors.push('工作流配置不能为空');
        return result;
      }

      // 验证超时配置
      if (config['timeout'] !== undefined) {
        const timeout = Number(config['timeout']);
        if (isNaN(timeout) || timeout <= 0) {
          result.errors.push('超时配置必须是正数');
        } else if (timeout > 3600) {
          result.warnings.push('超时时间超过1小时，可能影响系统性能');
        }
      }

      // 验证重试配置
      if (config['retryConfig']) {
        const retryConfig = config['retryConfig'] as Record<string, unknown>;
        if (retryConfig['maxRetries'] !== undefined) {
          const maxRetries = Number(retryConfig['maxRetries']);
          if (isNaN(maxRetries) || maxRetries < 0) {
            result.errors.push('最大重试次数必须是非负数');
          } else if (maxRetries > 10) {
            result.warnings.push('最大重试次数超过10次，可能导致资源浪费');
          }
        }

        if (retryConfig['retryInterval'] !== undefined) {
          const retryInterval = Number(retryConfig['retryInterval']);
          if (isNaN(retryInterval) || retryInterval <= 0) {
            result.errors.push('重试间隔必须是正数');
          } else if (retryInterval > 300) {
            result.warnings.push('重试间隔超过5分钟，可能影响用户体验');
          }
        }
      }

      // 验证并发配置
      if (config['maxConcurrentExecutions'] !== undefined) {
        const maxConcurrent = Number(config['maxConcurrentExecutions']);
        if (isNaN(maxConcurrent) || maxConcurrent <= 0) {
          result.errors.push('最大并发执行数必须是正数');
        } else if (maxConcurrent > 100) {
          result.warnings.push('最大并发执行数超过100，可能导致系统负载过高');
        }
      }

      // 验证通知配置
      if (config['notificationConfig']) {
        const notificationConfig = config['notificationConfig'] as Record<string, unknown>;
        if (notificationConfig['enabled'] && !notificationConfig['webhook']) {
          result.warnings.push('通知已启用但未配置Webhook，通知可能无法发送');
        }
      }

      // 添加建议
      if (result.errors.length === 0 && result.warnings.length === 0) {
        result.suggestions.push('考虑添加监控和日志配置以便更好地跟踪工作流执行');
        result.suggestions.push('考虑设置合理的超时时间以防止工作流无限执行');
      }

      // 如果有错误，标记为无效
      if (result.errors.length > 0) {
        result.isValid = false;
      }

      return result;
    } catch (error) {
      result.isValid = false;
      result.errors.push(`验证工作流配置时发生错误: ${error instanceof Error ? error.message : '未知错误'}`);
      return result;
    }
  }

  /**
   * 按类型验证
   * @param validationType 验证类型
   * @param workflow 工作流
   * @param graph 图
   * @param validationLevel 验证级别
   * @returns 验证结果
   */
  private async validateByType(
    validationType: 'structure' | 'semantics' | 'performance' | 'security',
    workflow: Workflow | null,
    graph: Graph | null,
    validationLevel: 'basic' | 'standard' | 'strict'
  ): Promise<ValidationResult> {
    switch (validationType) {
      case 'structure':
        return this.validateStructure(workflow, graph, validationLevel);
      case 'semantics':
        return this.validateSemantics(workflow, graph, validationLevel);
      case 'performance':
        return this.validatePerformance(workflow, graph, validationLevel);
      case 'security':
        return this.validateSecurity(workflow, graph, validationLevel);
      default:
        return {
          isValid: true,
          errors: [],
          warnings: [],
          suggestions: []
        };
    }
  }

  /**
   * 验证结构
   * @param workflow 工作流
   * @param graph 图
   * @param validationLevel 验证级别
   * @returns 验证结果
   */
  private async validateStructure(
    workflow: Workflow | null,
    graph: Graph | null,
    validationLevel: 'basic' | 'standard' | 'strict'
  ): Promise<ValidationResult> {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      suggestions: []
    };

    // 验证工作流基本结构
    if (workflow) {
      if (!workflow.name || workflow.name.trim().length === 0) {
        result.isValid = false;
        result.errors.push('工作流名称不能为空');
      }

      if (!workflow.type) {
        result.isValid = false;
        result.errors.push('工作流类型不能为空');
      }

      if (!workflow.graphId) {
        result.isValid = false;
        result.errors.push('工作流必须关联一个图');
      }
    }

    // 验证图结构
    if (graph) {
      try {
        const graphValidationResult = await this.graphDomainService.validateGraphStructure(graph.graphId);
        this.mergeValidationResults(result, {
          isValid: graphValidationResult.isValid,
          errors: graphValidationResult.errors,
          warnings: graphValidationResult.warnings,
          suggestions: []
        });
      } catch (error) {
        result.isValid = false;
        result.errors.push(`验证图结构时发生错误: ${error instanceof Error ? error.message : '未知错误'}`);
      }
    }

    // 严格模式下进行额外验证
    if (validationLevel === 'strict' && graph) {
      // 验证节点数量
      if (graph.getNodeCount() > 100) {
        result.warnings.push('图节点数量超过100个，可能影响执行性能');
      }

      // 验证边数量
      if (graph.getEdgeCount() > 200) {
        result.warnings.push('图边数量超过200个，可能影响执行性能');
      }

      // 验证图的复杂度
      const complexity = this.calculateGraphComplexity(graph);
      if (complexity > 1000) {
        result.warnings.push('图复杂度过高，建议简化工作流结构');
      }
    }

    return result;
  }

  /**
   * 验证语义
   * @param workflow 工作流
   * @param graph 图
   * @param validationLevel 验证级别
   * @returns 验证结果
   */
  private async validateSemantics(
    workflow: Workflow | null,
    graph: Graph | null,
    validationLevel: 'basic' | 'standard' | 'strict'
  ): Promise<ValidationResult> {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      suggestions: []
    };

    if (!graph) {
      return result;
    }

    // 验证图的语义正确性
    try {
      // 检查是否有未连接的节点
      const isolatedNodes = this.findIsolatedNodes(graph);
      if (isolatedNodes.length > 0) {
        result.warnings.push(`发现 ${isolatedNodes.length} 个未连接的节点`);
      }

      // 检查是否有死循环
      const cycles = this.findCycles(graph);
      if (cycles.length > 0) {
        if (validationLevel === 'strict') {
          result.isValid = false;
          result.errors.push(`发现 ${cycles.length} 个死循环，严格模式下不允许死循环`);
        } else {
          result.warnings.push(`发现 ${cycles.length} 个潜在死循环，请确认是否为预期行为`);
        }
      }

      // 检查决策节点是否有默认路径
      const decisionNodesWithoutDefault = this.findDecisionNodesWithoutDefault(graph);
      if (decisionNodesWithoutDefault.length > 0) {
        result.warnings.push(`发现 ${decisionNodesWithoutDefault.length} 个没有默认路径的决策节点`);
      }

      // 检查是否有不可达的结束节点
      const unreachableEndNodes = this.findUnreachableEndNodes(graph);
      if (unreachableEndNodes.length > 0) {
        result.errors.push(`发现 ${unreachableEndNodes.length} 个不可达的结束节点`);
      }
    } catch (error) {
      result.isValid = false;
      result.errors.push(`验证图语义时发生错误: ${error instanceof Error ? error.message : '未知错误'}`);
    }

    return result;
  }

  /**
   * 验证性能
   * @param workflow 工作流
   * @param graph 图
   * @param validationLevel 验证级别
   * @returns 验证结果
   */
  private async validatePerformance(
    workflow: Workflow | null,
    graph: Graph | null,
    validationLevel: 'basic' | 'standard' | 'strict'
  ): Promise<ValidationResult> {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      suggestions: []
    };

    if (!graph) {
      return result;
    }

    // 计算图的性能指标
    const nodeCount = graph.getNodeCount();
    const edgeCount = graph.getEdgeCount();
    const complexity = this.calculateGraphComplexity(graph);

    // 性能警告
    if (nodeCount > 50) {
      result.warnings.push('节点数量较多，可能影响执行性能');
    }

    if (edgeCount > 100) {
      result.warnings.push('边数量较多，可能影响执行性能');
    }

    if (complexity > 500) {
      result.warnings.push('图复杂度较高，建议优化工作流结构');
    }

    // 性能建议
    if (nodeCount < 5) {
      result.suggestions.push('工作流较为简单，可以考虑合并一些节点以提高效率');
    }

    if (edgeCount / nodeCount > 3) {
      result.suggestions.push('平均每个节点的出边较多，考虑简化工作流逻辑');
    }

    return result;
  }

  /**
   * 验证安全性
   * @param workflow 工作流
   * @param graph 图
   * @param validationLevel 验证级别
   * @returns 验证结果
   */
  private async validateSecurity(
    workflow: Workflow | null,
    graph: Graph | null,
    validationLevel: 'basic' | 'standard' | 'strict'
  ): Promise<ValidationResult> {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      suggestions: []
    };

    if (!workflow) {
      return result;
    }

    // 验证工作流配置中的安全设置
    if (workflow.config) {
      const config = workflow.config.value;

      // 检查是否有敏感信息
      if (this.containsSensitiveInfo(config)) {
        result.warnings.push('工作流配置中可能包含敏感信息，建议使用环境变量或密钥管理服务');
      }

      // 检查权限配置
      if (config['permissions'] && typeof config['permissions'] === 'object') {
        const permissions = config['permissions'] as Record<string, unknown>;
        if (Object.keys(permissions).length === 0) {
          result.suggestions.push('建议配置适当的权限以增强安全性');
        }
      }
    }

    return result;
  }

  /**
   * 合并验证结果
   * @param target 目标结果
   * @param source 源结果
   */
  private mergeValidationResults(target: ValidationResult, source: ValidationResult): void {
    target.errors.push(...source.errors);
    target.warnings.push(...source.warnings);
    target.suggestions.push(...source.suggestions);
    
    if (!source.isValid) {
      target.isValid = false;
    }
  }

  /**
   * 计算图复杂度
   * @param graph 图
   * @returns 复杂度值
   */
  private calculateGraphComplexity(graph: Graph): number {
    const nodeCount = graph.getNodeCount();
    const edgeCount = graph.getEdgeCount();
    
    // 简单的复杂度计算：节点数 + 边数 * 2
    return nodeCount + edgeCount * 2;
  }

  /**
   * 查找孤立节点
   * @param graph 图
   * @returns 孤立节点列表
   */
  private findIsolatedNodes(graph: Graph): any[] {
    const isolatedNodes: any[] = [];
    
    for (const node of graph.nodes.values()) {
      const incomingEdges = graph.getIncomingEdges(node.nodeId);
      const outgoingEdges = graph.getOutgoingEdges(node.nodeId);
      
      if (incomingEdges.length === 0 && outgoingEdges.length === 0) {
        isolatedNodes.push(node);
      }
    }
    
    return isolatedNodes;
  }

  /**
   * 查找循环
   * @param graph 图
   * @returns 循环列表
   */
  private findCycles(graph: Graph): string[][] {
    // 简化实现，实际应该使用深度优先搜索
    return [];
  }

  /**
   * 查找没有默认路径的决策节点
   * @param graph 图
   * @returns 决策节点列表
   */
  private findDecisionNodesWithoutDefault(graph: Graph): any[] {
    const decisionNodesWithoutDefault: any[] = [];
    
    for (const node of graph.nodes.values()) {
      if (node.type.toString() === 'decision') {
        const outgoingEdges = graph.getOutgoingEdges(node.nodeId);
        const hasDefaultEdge = outgoingEdges.some(edge => edge.type.toString() === 'default');
        
        if (!hasDefaultEdge) {
          decisionNodesWithoutDefault.push(node);
        }
      }
    }
    
    return decisionNodesWithoutDefault;
  }

  /**
   * 查找不可达的结束节点
   * @param graph 图
   * @returns 结束节点列表
   */
  private findUnreachableEndNodes(graph: Graph): any[] {
    // 简化实现，实际应该使用广度优先搜索
    return [];
  }

  /**
   * 检查是否包含敏感信息
   * @param config 配置对象
   * @returns 是否包含敏感信息
   */
  private containsSensitiveInfo(config: Record<string, unknown>): boolean {
    const sensitiveKeywords = ['password', 'secret', 'key', 'token', 'credential'];
    const configStr = JSON.stringify(config).toLowerCase();
    
    return sensitiveKeywords.some(keyword => configStr.includes(keyword));
  }
}