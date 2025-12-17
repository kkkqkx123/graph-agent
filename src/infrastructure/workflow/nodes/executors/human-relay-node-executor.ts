/**
 * HumanRelay节点执行器
 * 
 * 负责执行HumanRelay节点的工作流逻辑
 */

import { injectable, inject } from 'inversify';
import { INodeExecutor } from '../../../../domain/workflow/interfaces/node-executor.interface';
import { IExecutionContext } from '../../../../domain/workflow/execution/execution-context.interface';
import { HumanRelayNode } from '../../../../domain/workflow/entities/nodes/specialized/human-relay-node';
import { Node } from '../../../../domain/workflow/entities/nodes/base/node';
import { ILLMWrapper } from '../../../../domain/llm/interfaces/llm-wrapper.interface';
import { LLMRequest } from '../../../../domain/llm/entities/llm-request';
import { LLMMessageRole } from '../../../../shared/types/llm';
import { HumanRelayMode } from '../../../../domain/llm/value-objects/human-relay-mode';
import { LLM_DI_IDENTIFIERS } from '../../../external/llm/di-identifiers';

/**
 * HumanRelay节点执行器
 */
@injectable()
export class HumanRelayNodeExecutor implements INodeExecutor {
  constructor(
    @inject('ILLMWrapperFactory') 
    private llmWrapperFactory: any,
    @inject(LLM_DI_IDENTIFIERS.ConfigManager) 
    private configManager: any
  ) {}

  /**
   * 执行HumanRelay节点
   */
  public async execute(
    node: Node,
    context: IExecutionContext
  ): Promise<any> {
    if (!(node instanceof HumanRelayNode)) {
      throw new Error('节点必须是HumanRelayNode实例');
    }
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

       // 2. 获取LLM包装器
       const wrapper = await this.getLLMWrapper(node);
       
       // 3. 构建LLM请求
       const request = this.buildLLMRequest(node, context);
       
       // 4. 执行请求
       const response = await wrapper.generateResponse(request);
       
       // 5. 处理响应
       const result = this.processResponse(response, context, node);
       
       // 6. 应用输出映射
       const mappedResult = this.applyOutputMapping(result, node);
       
       return {
         success: true,
         output: mappedResult,
         metadata: {
           executionTime: Date.now() - startTime,
           nodeId: node.nodeId.toString(),
           mode: node.getMode(),
           responseTime: response.metadata?.responseTime,
           userInteractionTime: response.metadata?.userInteractionTime,
           responseType: response.metadata?.responseType,
           efficiencyScore: response.metadata?.efficiencyScore,
           engagementScore: response.metadata?.engagementScore
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
  public async canExecute(node: Node, context: IExecutionContext): Promise<boolean> {
    if (!(node instanceof HumanRelayNode)) {
      return false;
    }
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
   * 验证节点
   */
  public async validate(node: HumanRelayNode): Promise<{
    isValid: boolean;
    errors: string[];
  }> {
    const validation = node.validateConfig();
    return {
      isValid: validation.isValid,
      errors: validation.errors
    };
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

  // 私有方法

  /**
   * 获取LLM包装器
   */
  private async getLLMWrapper(node: HumanRelayNode): Promise<ILLMWrapper> {
    const modelName = node.getMode() === HumanRelayMode.MULTI ? 'human-relay-m' : 'human-relay-s';
    
    try {
      return await this.llmWrapperFactory.createDirectLLMWrapper(
        { getClientName: () => modelName },
        { 
          mode: node.getMode(), 
          timeout: node.getTimeout(),
          frontendType: node.getFrontendType(),
          enableSessionPersistence: node.isSessionPersistenceEnabled(),
          maxHistoryLength: node.getMaxHistoryLength()
        }
      );
    } catch (error) {
      throw new Error(`创建LLM包装器失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
    * 构建LLM请求
    */
  private buildLLMRequest(node: HumanRelayNode, context: IExecutionContext): LLMRequest {
    // 从上下文获取输入数据
    const inputData = context.getInput();
    
    // 应用输入映射
    const mappedInput = this.applyInputMapping(inputData, node);
    
    // 构建消息
    const messages = this.buildMessages(mappedInput, node);
    
    // 创建请求
    const modelName = node.getMode() === HumanRelayMode.MULTI ? 'human-relay-m' : 'human-relay-s';
    return LLMRequest.create(
      modelName,
      messages,
      {
        metadata: {
          timeout: node.getTimeout(),
          frontendType: node.getFrontendType(),
          enableSessionPersistence: node.isSessionPersistenceEnabled(),
          maxHistoryLength: node.getMaxHistoryLength(),
          nodeId: node.nodeId.toString(),
          workflowId: (context as any).workflowId?.toString()
        }
      }
    );
  }

  /**
   * 应用输入映射
   */
  private applyInputMapping(inputData: any, node: HumanRelayNode): any {
    const inputMapping = node.getInputMapping();
    
    if (!inputMapping || Object.keys(inputMapping).length === 0) {
      return inputData;
    }
    
    const mapped: any = {};
    
    for (const [sourceKey, targetKey] of Object.entries(inputMapping)) {
      if (inputData[sourceKey] !== undefined) {
        mapped[targetKey] = inputData[sourceKey];
      }
    }
    
    // 保留未映射的字段
    for (const [key, value] of Object.entries(inputData)) {
      if (!inputMapping[key]) {
        mapped[key] = value;
      }
    }
    
    return mapped;
  }

  /**
   * 构建消息
   */
  private buildMessages(inputData: any, node: HumanRelayNode): any[] {
    const messages: any[] = [];
    
    // 构建提示内容
    let promptContent = '';
    
    if (typeof inputData === 'string') {
      promptContent = inputData;
    } else if (typeof inputData === 'object') {
      promptContent = JSON.stringify(inputData, null, 2);
    } else {
      promptContent = String(inputData);
    }
    
    // 添加自定义指令
    const customInstructions = node.getCustomInstructions();
    if (customInstructions) {
      promptContent = `${customInstructions}\n\n${promptContent}`;
    }
    
    // 应用提示词模板
    const promptTemplate = node.getPromptTemplate();
    if (promptTemplate) {
      promptContent = promptTemplate.replace('{input}', promptContent);
    }
    
    // 创建用户消息
     messages.push({
       role: LLMMessageRole.USER,
       content: promptContent,
       metadata: {
         nodeId: node.nodeId.toString(),
         mode: node.getMode(),
         timestamp: new Date()
       }
     });
    
    return messages;
  }

  /**
    * 处理响应
    */
   private processResponse(response: any, context: IExecutionContext, node: HumanRelayNode): any {
     // 解析响应内容
     let content: any;
     
     try {
       // 尝试解析为JSON
       content = JSON.parse(response.message.content);
     } catch {
       // 如果不是JSON，直接使用文本内容
       content = {
         text: response.message.content,
         analysis: response.message.content
       };
     }
     
     // 添加元数据
     return {
       ...content,
       metadata: {
         responseId: response.id,
         modelId: response.modelId,
         usage: response.usage,
         timestamp: new Date(),
         nodeId: node.nodeId.toString(),
         mode: node.getMode(),
         responseTime: response.metadata?.responseTime,
         userInteractionTime: response.metadata?.userInteractionTime,
         responseType: response.metadata?.responseType,
         efficiencyScore: response.metadata?.efficiencyScore,
         engagementScore: response.metadata?.engagementScore
       }
     };
   }

  /**
   * 应用输出映射
   */
  private applyOutputMapping(result: any, node: HumanRelayNode): any {
    const outputMapping = node.getOutputMapping();
    
    if (!outputMapping || Object.keys(outputMapping).length === 0) {
      return result;
    }
    
    const mapped: any = {};
    
    for (const [sourceKey, targetKey] of Object.entries(outputMapping)) {
      if (result[sourceKey] !== undefined) {
        mapped[targetKey] = result[sourceKey];
      }
    }
    
    // 保留未映射的字段
    for (const [key, value] of Object.entries(result)) {
      if (!outputMapping[key]) {
        mapped[key] = value;
      }
    }
    
    return mapped;
  }

  /**
   * 生成ID（临时实现）
   */
  private generateId(): any {
    // 这里应该使用实际的ID生成逻辑
    // 临时实现
    return {
      getValue: () => `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };
  }

  /**
   * 获取执行统计信息
   */
  public async getExecutionStatistics(node: HumanRelayNode): Promise<{
    totalExecutions: number;
    successfulExecutions: number;
    failedExecutions: number;
    averageExecutionTime: number;
    averageResponseTime: number;
    averageUserInteractionTime: number;
  }> {
    // 这里应该从实际的统计存储中获取数据
    // 临时返回默认值
    return {
      totalExecutions: 0,
      successfulExecutions: 0,
      failedExecutions: 0,
      averageExecutionTime: 0,
      averageResponseTime: 0,
      averageUserInteractionTime: 0
    };
  }

  /**
   * 重置统计信息
   */
  public async resetStatistics(node: HumanRelayNode): Promise<boolean> {
    // 这里应该重置实际的统计存储
    return true;
  }
}