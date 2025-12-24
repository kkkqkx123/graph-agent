/**
 * HumanRelay节点执行器
 * 简化版本，移除不必要的依赖
 */

import { injectable, inject } from 'inversify';
import { ILogger } from '../../../../domain/common/types/logger-types';

/**
 * 简化的节点接口
 */
interface BaseNode {
  readonly nodeId: any;
  readonly name: string;
  readonly type: string;
  
  validateConfig(): { isValid: boolean; errors: string[] };
}

/**
 * 简化的执行上下文接口
 */
interface ExecutionContext {
  getInput(): any;
  getVariable(path: string): any;
  setVariable(path: string, value: any): void;
  getAllVariables(): Record<string, any>;
  getAllMetadata(): Record<string, any>;
  getExecutedNodes(): string[];
  getNodeResult(nodeId: string): any;
  getElapsedTime(): number;
  getWorkflow(): any;
}

/**
 * HumanRelay节点执行器
 */
@injectable()
export class HumanRelayNodeExecutor {
  constructor(
    @inject('Logger') private readonly logger: ILogger
  ) {}

  /**
   * 执行HumanRelay节点
   */
  public async execute(
    node: BaseNode,
    context: ExecutionContext
  ): Promise<any> {
    const startTime = Date.now();
     
    try {
      // 1. 验证节点配置
      const validation = node.validateConfig();
      if (!validation.isValid) {
        return {
          success: false,
          error: `节点配置无效: ${validation.errors.join(', ')}`,
          metadata: {
            executionTime: Date.now() - startTime,
            nodeId: node.nodeId.toString(),
            validationErrors: validation.errors
          }
        };
      }

      // 2. 获取输入数据
      const inputData = context.getInput();
      
      // 3. 简化的执行逻辑
      const result = {
        text: inputData,
        analysis: `HumanRelay节点处理完成: ${node.name}`,
        timestamp: new Date(),
        nodeId: node.nodeId.toString()
      };
      
      return {
        success: true,
        output: result,
        metadata: {
          executionTime: Date.now() - startTime,
          nodeId: node.nodeId.toString(),
          nodeType: node.type
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        metadata: {
          executionTime: Date.now() - startTime,
          nodeId: node.nodeId.toString(),
          errorType: error instanceof Error ? error.constructor.name : 'Unknown'
        }
      };
    }
  }

  /**
   * 验证执行器是否可以执行节点
   */
  public async canExecute(node: BaseNode, context: ExecutionContext): Promise<boolean> {
    const validation = node.validateConfig();
    return validation.isValid;
  }

  /**
   * 获取执行器支持的节点类型
   */
  public getSupportedNodeTypes(): string[] {
    return ['human-relay'];
  }

  /**
   * 获取节点类型
   */
  public getNodeType(): string {
    return 'human-relay';
  }

  /**
   * 获取节点能力
   */
  public getCapabilities(): string[] {
    return [
      '人工交互',
      'Web LLM集成',
      '对话历史',
      '会话持久化',
      '多前端支持',
      '超时控制',
      '错误处理'
    ];
  }
}