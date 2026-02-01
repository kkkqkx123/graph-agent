/**
 * 节点验证器
 * 负责节点配置的验证
 * 使用zod进行声明式验证
 */

import { z } from 'zod';
import type { Node } from '../../types/node';
import { NodeType } from '../../types/node';
import { ValidationError, type ValidationResult } from '../../types/errors';

/**
 * 变量节点配置schema
 */
const variableNodeConfigSchema = z.object({
  variableName: z.string().min(1, 'Variable name is required'),
  variableType: z.enum(['number', 'string', 'boolean', 'array', 'object']),
  expression: z.string().min(1, 'Expression is required'),
  scope: z.enum(['local', 'global']).optional(),
  readonly: z.boolean().optional()
});

/**
 * 分叉节点配置schema
 */
const forkNodeConfigSchema = z.object({
  forkId: z.string().min(1, 'Fork ID is required'),
  forkStrategy: z.enum(['serial', 'parallel']),
  childNodeIds: z.array(z.string()).optional()
});

/**
 * 连接节点配置schema
 */
const joinNodeConfigSchema = z.object({
  joinId: z.string().min(1, 'Join ID is required'),
  joinStrategy: z.enum(['ALL_COMPLETED', 'ANY_COMPLETED', 'ALL_FAILED', 'ANY_FAILED', 'SUCCESS_COUNT_THRESHOLD']),
  threshold: z.number().optional(),
  timeout: z.number().optional(),
  childThreadIds: z.array(z.string()).optional()
}).refine(
  (data) => {
    if (data.joinStrategy === 'SUCCESS_COUNT_THRESHOLD' && data.threshold === undefined) {
      return false;
    }
    return true;
  },
  { message: 'JOIN node with SUCCESS_COUNT_THRESHOLD strategy must have threshold', path: ['threshold'] }
);

/**
 * 代码节点配置schema
 */
const codeNodeConfigSchema = z.object({
  scriptName: z.string().min(1, 'Script name is required'),
  scriptType: z.enum(['shell', 'cmd', 'powershell', 'python', 'javascript']),
  risk: z.enum(['none', 'low', 'medium', 'high']),
  timeout: z.number().min(0, 'Timeout must be non-negative').optional(),
  retries: z.number().min(0, 'Retries must be non-negative').optional(),
  retryDelay: z.number().min(0, 'Retry delay must be non-negative').optional(),
  inline: z.boolean().optional()
});

/**
 * LLM节点配置schema
 */
const llmNodeConfigSchema = z.object({
  profileId: z.string().min(1, 'Profile ID is required'),
  parameters: z.record(z.string(), z.any()).optional()
});

/**
 * 工具节点配置schema
 */
const toolNodeConfigSchema = z.object({
  toolName: z.string().min(1, 'Tool name is required'),
  parameters: z.record(z.string(), z.any()),
  timeout: z.number().min(0, 'Timeout must be non-negative').optional(),
  retries: z.number().min(0, 'Retries must be non-negative').optional(),
  retryDelay: z.number().min(0, 'Retry delay must be non-negative').optional()
});

/**
 * 用户交互节点配置schema
 */
const userInteractionNodeConfigSchema = z.object({
  userInteractionType: z.enum(['ask_for_approval', 'ask_for_input', 'ask_for_selection', 'show_message']),
  showMessage: z.string().optional(),
  userInput: z.any().optional()
});

/**
 * 路由节点配置schema
 */
const routeNodeConfigSchema = z.object({
  routes: z.array(z.object({
    condition: z.string().min(1, 'Route condition is required'),
    targetNodeId: z.string().min(1, 'Target node ID is required'),
    priority: z.number().optional()
  })).min(1, 'Routes array cannot be empty'),
  defaultTargetNodeId: z.string().optional()
});

/**
 * 上下文处理器节点配置schema
 */
const contextProcessorNodeConfigSchema = z.object({
  processorType: z.enum(['transform', 'filter', 'merge', 'split']),
  rules: z.array(z.object({
    sourcePath: z.string().min(1, 'Source path is required'),
    targetPath: z.string().min(1, 'Target path is required'),
    transform: z.string().optional()
  })).min(1, 'Rules array cannot be empty')
});

/**
 * 循环开始节点配置schema
 */
const loopStartNodeConfigSchema = z.object({
  loopId: z.string().min(1, 'Loop ID is required'),
  iterable: z.any().refine((val) => val !== undefined, 'Iterable is required'),
  maxIterations: z.number().min(0, 'Max iterations must be non-negative'),
  variableName: z.string().optional()
});

/**
 * 循环结束节点配置schema
 */
const loopEndNodeConfigSchema = z.object({
  loopId: z.string().min(1, 'Loop ID is required'),
  iterable: z.any().refine((val) => val !== undefined, 'Iterable is required'),
  breakCondition: z.any().optional(),
  loopStartNodeId: z.string().optional()
});

/**
 * 子图节点配置schema（用于 SUBGRAPH 和 START_FROM_TRIGGER 节点）
 */
const subgraphNodeConfigSchema = z.object({
  subgraphId: z.string().min(1, 'Subgraph ID is required'),
  inputMapping: z.record(z.string().min(1), z.string().min(1)),
  outputMapping: z.record(z.string().min(1), z.string().min(1)),
  async: z.boolean()
});

/**
 * StartFromTrigger节点配置schema（与子图节点配置相同）
 */
const startFromTriggerNodeConfigSchema = subgraphNodeConfigSchema;

/**
 * ContinueFromTrigger节点配置schema（必须为空对象或undefined）
 */
const continueFromTriggerNodeConfigSchema = z.object({}).strict();

/**
 * 节点配置schema（基于节点类型的联合类型）
 */
const nodeConfigSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal(NodeType.START), config: z.object({}) }),
  z.object({ type: z.literal(NodeType.END), config: z.object({}) }),
  z.object({ type: z.literal(NodeType.VARIABLE), config: variableNodeConfigSchema }),
  z.object({ type: z.literal(NodeType.FORK), config: forkNodeConfigSchema }),
  z.object({ type: z.literal(NodeType.JOIN), config: joinNodeConfigSchema }),
  z.object({ type: z.literal(NodeType.CODE), config: codeNodeConfigSchema }),
  z.object({ type: z.literal(NodeType.LLM), config: llmNodeConfigSchema }),
  z.object({ type: z.literal(NodeType.TOOL), config: toolNodeConfigSchema }),
  z.object({ type: z.literal(NodeType.USER_INTERACTION), config: userInteractionNodeConfigSchema }),
  z.object({ type: z.literal(NodeType.ROUTE), config: routeNodeConfigSchema }),
  z.object({ type: z.literal(NodeType.CONTEXT_PROCESSOR), config: contextProcessorNodeConfigSchema }),
  z.object({ type: z.literal(NodeType.LOOP_START), config: loopStartNodeConfigSchema }),
  z.object({ type: z.literal(NodeType.LOOP_END), config: loopEndNodeConfigSchema }),
  z.object({ type: z.literal(NodeType.SUBGRAPH), config: subgraphNodeConfigSchema }),
  z.object({ type: z.literal(NodeType.START_FROM_TRIGGER), config: startFromTriggerNodeConfigSchema }),
  z.object({ type: z.literal(NodeType.CONTINUE_FROM_TRIGGER), config: continueFromTriggerNodeConfigSchema })
]);

/**
 * 节点schema
 */
const nodeSchema: z.ZodType<Node> = z.object({
  id: z.string().min(1, 'Node ID is required'),
  type: z.nativeEnum(NodeType),
  name: z.string().min(1, 'Node name is required'),
  description: z.string().optional(),
  config: z.any(), // config将在后续验证中根据type进行验证
  metadata: z.record(z.string(), z.any()).optional(),
  outgoingEdgeIds: z.array(z.string()).default([]),
  incomingEdgeIds: z.array(z.string()).default([]),
  properties: z.array(z.any()).optional(),
  hooks: z.array(z.any()).optional()
});

/**
 * 节点验证器类
 */
export class NodeValidator {
  /**
   * 验证节点
   * @param node 节点
   * @returns 验证结果
   */
  validateNode(node: Node): ValidationResult {
    // 首先验证基本信息
    const basicResult = nodeSchema.safeParse(node);
    if (!basicResult.success) {
      return this.convertZodError(basicResult.error, 'node');
    }

    // 然后验证节点配置
    const configResult = this.validateNodeConfig(node);
    if (!configResult.valid) {
      return configResult;
    }

    return { valid: true, errors: [], warnings: [] };
  }

  /**
   * 验证节点配置
   * @param node 节点
   * @returns 验证结果
   */
  private validateNodeConfig(node: Node): ValidationResult {
    // 创建包含type的临时对象用于验证
    const nodeWithType = {
      type: node.type,
      config: node.config
    };

    const result = nodeConfigSchema.safeParse(nodeWithType);
    if (result.success) {
      return { valid: true, errors: [], warnings: [] };
    }
    
    // 检查是否是未知节点类型
    const error = result.error.issues[0];
    if (error && error.code === z.ZodIssueCode.invalid_union) {
      return {
        valid: false,
        errors: [new ValidationError(`Unknown node type: ${node.type}`, 'node.type')],
        warnings: []
      };
    }
    
    return this.convertZodError(result.error, 'node.config');
  }

  /**
   * 批量验证节点
   * @param nodes 节点数组
   * @returns 验证结果数组
   */
  validateNodes(nodes: Node[]): ValidationResult[] {
    return nodes.map((node) => this.validateNode(node));
  }

  /**
   * 将zod错误转换为ValidationResult
   * @param error zod错误
   * @param prefix 字段路径前缀
   * @returns ValidationResult
   */
  private convertZodError(error: z.ZodError, prefix?: string): ValidationResult {
    const errors: ValidationError[] = error.issues.map((issue) => {
      const field = issue.path.length > 0
        ? (prefix ? `${prefix}.${issue.path.join('.')}` : issue.path.join('.'))
        : prefix;
      return new ValidationError(issue.message, field);
    });
    return {
      valid: false,
      errors,
      warnings: []
    };
  }
}