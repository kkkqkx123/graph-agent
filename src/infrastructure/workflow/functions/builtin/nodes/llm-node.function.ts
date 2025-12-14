import { injectable } from 'inversify';
import { INodeFunction, WorkflowFunctionType } from '../../../../domain/workflow/functions/interfaces';
import { IExecutionContext } from '../../../../domain/workflow/graph/interfaces/execution-context.interface';
import { BaseWorkflowFunction } from '../../base/base-workflow-function';

/**
 * LLM节点函数
 */
@injectable()
export class LLMNodeFunction extends BaseWorkflowFunction implements INodeFunction {
  constructor() {
    super(
      'node:llm',
      'llm_node',
      '执行LLM推理的节点函数',
      '1.0.0',
      WorkflowFunctionType.NODE,
      true
    );
  }

  getParameters() {
    return [
      ...super.getParameters(),
      {
        name: 'prompt',
        type: 'string',
        required: true,
        description: 'LLM提示词'
      },
      {
        name: 'model',
        type: 'string',
        required: false,
        description: 'LLM模型名称',
        defaultValue: 'gpt-3.5-turbo'
      },
      {
        name: 'temperature',
        type: 'number',
        required: false,
        description: '生成温度',
        defaultValue: 0.7
      },
      {
        name: 'maxTokens',
        type: 'number',
        required: false,
        description: '最大令牌数',
        defaultValue: 1000
      }
    ];
  }

  protected validateCustomConfig(config: any): string[] {
    const errors: string[] = [];
    
    if (!config.prompt || typeof config.prompt !== 'string') {
      errors.push('prompt是必需的字符串参数');
    }
    
    if (config.temperature !== undefined && 
        (typeof config.temperature !== 'number' || 
         config.temperature < 0 || 
         config.temperature > 2)) {
      errors.push('temperature必须是0-2之间的数字');
    }
    
    if (config.maxTokens !== undefined && 
        (typeof config.maxTokens !== 'number' || 
         config.maxTokens <= 0)) {
      errors.push('maxTokens必须是正数');
    }
    
    return errors;
  }

  async canExecute(context: IExecutionContext, config: any): Promise<boolean> {
    this.checkInitialized();
    
    // 检查必需的配置
    if (!config.prompt) {
      return false;
    }
    
    // 可以添加其他执行条件检查
    return true;
  }

  async execute(context: IExecutionContext, config: any): Promise<any> {
    this.checkInitialized();
    
    const prompt = config.prompt;
    const model = config.model || 'gpt-3.5-turbo';
    const temperature = config.temperature || 0.7;
    const maxTokens = config.maxTokens || 1000;
    
    // 这里应该调用实际的LLM服务
    // 为了演示，返回模拟结果
    const result = {
      content: `LLM响应：基于prompt '${prompt}' 使用模型 ${model}`,
      model: model,
      temperature: temperature,
      maxTokens: maxTokens,
      tokensUsed: Math.floor(Math.random() * 500) + 100,
      executionTime: Math.random() * 2 + 0.5
    };
    
    // 更新上下文
    const messages = context.getVariable('messages') || [];
    messages.push({
      role: 'assistant',
      content: result.content,
      model: model,
      tokensUsed: result.tokensUsed,
      timestamp: new Date().toISOString()
    });
    context.setVariable('messages', messages);
    
    // 存储LLM响应
    context.setVariable(`llm_response_${context.getExecutionId()}`, result);
    
    return result;
  }
}