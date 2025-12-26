/**
 * 节点函数实现
 * 
 * 本文件实现了图工作流中的各种节点函数
 */

import {
  NodeFunction,
  NodeInput,
  NodeConfig,
  NodeOutput,
  ExecutionContext
} from '../../types/workflow-types';

// ============================================================================
// LLM节点函数
// ============================================================================

/**
 * LLM节点函数
 * 模拟LLM调用，实际应用中应该调用真实的LLM服务
 * 
 * @param input 节点输入
 * @param config 节点配置
 * @param context 执行上下文
 * @returns 节点输出
 */
export const llmNodeFunction: NodeFunction = async (
  input: NodeInput,
  config: NodeConfig,
  context: ExecutionContext
): Promise<NodeOutput> => {
  const startTime = Date.now();

  try {
     // 提取配置参数
     const prompt = config['prompt'] || '';
     const model = config['model'] || 'gpt-3.5-turbo';
     const temperature = config['temperature'] ?? 0.7;
     const maxTokens = config['maxTokens'] ?? 1000;

    // 替换提示词中的变量占位符
    const processedPrompt = replacePlaceholders(prompt, context.getAllData());

    // 模拟LLM调用
    const response = await simulateLLMCall(processedPrompt, model, temperature);

    // 估算token数（简化版本）
    const tokens = estimateTokens(response);

    return {
      success: true,
      data: {
        response,
        model,
        tokens,
        temperature
      },
      metadata: {
        executionTime: Date.now() - startTime,
        prompt: processedPrompt
      }
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      metadata: {
        executionTime: Date.now() - startTime
      }
    };
  }
};

/**
 * 模拟LLM调用
 * 
 * @param prompt 提示词
 * @param model 模型名称
 * @param temperature 温度参数
 * @returns LLM响应
 */
async function simulateLLMCall(
  prompt: string,
  model: string,
  temperature: number
): Promise<string> {
  // 模拟网络延迟
  await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 200));

  // 根据提示词内容生成模拟响应
  if (prompt.includes('分类') || prompt.includes('类型')) {
    const types: string[] = ['news', 'review', 'qa'];
    const randomType = types[Math.floor(Math.random() * types.length)] || 'news';
    return randomType;
  }

  if (prompt.includes('提取') && prompt.includes('新闻')) {
    return JSON.stringify({
      title: '示例新闻标题',
      time: '2024-01-01',
      location: '北京'
    });
  }

  if (prompt.includes('情感')) {
    const sentiments: string[] = ['positive', 'negative', 'neutral'];
    return sentiments[Math.floor(Math.random() * sentiments.length)] || 'neutral';
  }

  if (prompt.includes('问答')) {
    return JSON.stringify({
      question: '示例问题',
      answer: '示例答案'
    });
  }

  // 默认响应
  return `LLM处理完成 (模型: ${model}, 温度: ${temperature})`;
}

/**
 * 估算token数
 * 
 * @param text 文本
 * @returns 估算的token数
 */
function estimateTokens(text: string): number {
  // 简化版本：假设每个字符约等于0.5个token
  return Math.ceil(text.length * 0.5);
}

// ============================================================================
// 工具调用节点函数
// ============================================================================

/**
 * 工具调用节点函数
 * 模拟工具调用，实际应用中应该调用真实的工具
 * 
 * @param input 节点输入
 * @param config 节点配置
 * @param context 执行上下文
 * @returns 节点输出
 */
export const toolNodeFunction: NodeFunction = async (
  input: NodeInput,
  config: NodeConfig,
  context: ExecutionContext
): Promise<NodeOutput> => {
  const startTime = Date.now();

  try {
     // 提取配置参数
     const toolName = config['toolName'] || '';
     const parameters = config['parameters'] || {};

    // 模拟工具调用
    const result = await simulateToolCall(toolName, parameters);

    return {
      success: true,
      data: {
        result,
        toolName
      },
      metadata: {
        executionTime: Date.now() - startTime
      }
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      metadata: {
        executionTime: Date.now() - startTime
      }
    };
  }
};

/**
 * 模拟工具调用
 * 
 * @param toolName 工具名称
 * @param parameters 工具参数
 * @returns 工具执行结果
 */
async function simulateToolCall(
  toolName: string,
  parameters: Record<string, any>
): Promise<any> {
  // 模拟网络延迟
  await new Promise(resolve => setTimeout(resolve, 50 + Math.random() * 100));

  // 根据工具名称返回模拟结果
  switch (toolName) {
    case 'calculator':
      return calculate(parameters);
    case 'search':
      return search(parameters);
    case 'weather':
      return getWeather(parameters);
    default:
      return { message: `工具 ${toolName} 执行成功`, parameters };
  }
}

/**
 * 计算器工具
 */
function calculate(params: Record<string, any>): any {
  const { expression } = params;
  try {
    // 简单的计算器，仅支持基本运算
    const sanitized = expression.replace(/[^0-9+\-*/().]/g, '');
    const result = Function(`"use strict"; return (${sanitized})`)();
    return { expression, result };
  } catch (error) {
    throw new Error(`计算表达式失败: ${expression}`);
  }
}

/**
 * 搜索工具
 */
function search(params: Record<string, any>): any {
  const { query } = params;
  return {
    query,
    results: [
      { title: `搜索结果1: ${query}`, url: 'https://example.com/1' },
      { title: `搜索结果2: ${query}`, url: 'https://example.com/2' }
    ]
  };
}

/**
 * 天气工具
 */
function getWeather(params: Record<string, any>): any {
  const { city } = params;
  return {
    city,
    temperature: 20 + Math.floor(Math.random() * 15),
    condition: ['晴', '多云', '阴', '雨'][Math.floor(Math.random() * 4)]
  };
}

// ============================================================================
// 条件检查节点函数
// ============================================================================

/**
 * 条件检查节点函数
 * 评估条件表达式并返回布尔结果
 * 
 * @param input 节点输入
 * @param config 节点配置
 * @param context 执行上下文
 * @returns 节点输出
 */
export const conditionNodeFunction: NodeFunction = async (
  input: NodeInput,
  config: NodeConfig,
  context: ExecutionContext
): Promise<NodeOutput> => {
  const startTime = Date.now();

  try {
    // 提取配置参数
    const condition = config['condition'] || '';
    const data = config['data'] || {};

    // 评估条件
    const result = evaluateCondition(condition, data, context);

    return {
      success: true,
      data: {
        result,
        condition,
        evaluatedData: data
      },
      metadata: {
        executionTime: Date.now() - startTime
      }
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      metadata: {
        executionTime: Date.now() - startTime
      }
    };
  }
};

/**
 * 评估条件
 * 
 * @param condition 条件表达式
 * @param data 数据
 * @param context 执行上下文
 * @returns 评估结果
 */
function evaluateCondition(
  condition: string,
  data: Record<string, any>,
  context: ExecutionContext
): boolean {
  // 替换变量占位符
  const processedCondition = replacePlaceholders(condition, context.getAllData());

  // 简单的条件评估
  const trimmed = processedCondition.trim();

  // 布尔值
  if (trimmed === 'true') return true;
  if (trimmed === 'false') return false;

  // 比较表达式
   const comparisonRegex = /^(.+?)\s*(==|!=|>=|<=|>|<)\s*(.+)$/;
   const match = trimmed.match(comparisonRegex);

   if (match && match.length >= 4 && match[1] && match[2] && match[3]) {
     const left = match[1];
     const operator = match[2];
     const right = match[3];
     const leftValue = parseValue(left);
     const rightValue = parseValue(right);

    switch (operator) {
      case '==':
        return leftValue == rightValue;
      case '!=':
        return leftValue != rightValue;
      case '>=':
        return leftValue >= rightValue;
      case '<=':
        return leftValue <= rightValue;
      case '>':
        return leftValue > rightValue;
      case '<':
        return leftValue < rightValue;
      default:
        return false;
    }
  }

  // 默认返回false
  return false;
}

/**
 * 解析值
 */
function parseValue(str: string): any {
  const trimmed = str.trim();

  if (trimmed === 'true') return true;
  if (trimmed === 'false') return false;
  if (trimmed === 'null') return null;

  if (/^-?\d+\.?\d*$/.test(trimmed)) {
    return Number(trimmed);
  }

  if ((trimmed.startsWith("'") && trimmed.endsWith("'")) ||
      (trimmed.startsWith('"') && trimmed.endsWith('"'))) {
    return trimmed.slice(1, -1);
  }

  return trimmed;
}

// ============================================================================
// 数据转换节点函数
// ============================================================================

/**
 * 数据转换节点函数
 * 根据转换规则转换输入数据
 * 
 * @param input 节点输入
 * @param config 节点配置
 * @param context 执行上下文
 * @returns 节点输出
 */
export const transformNodeFunction: NodeFunction = async (
  input: NodeInput,
  config: NodeConfig,
  context: ExecutionContext
): Promise<NodeOutput> => {
  const startTime = Date.now();

  try {
    // 提取配置参数
    const transformRules = config['transformRules'] || {};
    const inputData = config['input'] || input;

    // 应用转换规则
    const output = applyTransformRules(inputData, transformRules, context);

    return {
      success: true,
      data: {
        output
      },
      metadata: {
        executionTime: Date.now() - startTime,
        transformRules
      }
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      metadata: {
        executionTime: Date.now() - startTime
      }
    };
  }
};

/**
 * 应用转换规则
 * 
 * @param input 输入数据
 * @param rules 转换规则
 * @param context 执行上下文
 * @returns 转换后的数据
 */
function applyTransformRules(
  input: any,
  rules: Record<string, any>,
  context: ExecutionContext
): any {
  const output: Record<string, any> = {};

  for (const key in rules) {
    const rule = rules[key];

    if (typeof rule === 'string') {
      // 如果规则是字符串，可能是变量引用
      if (rule.startsWith('{{') && rule.endsWith('}}')) {
        const path = rule.slice(2, -2).trim();
        output[key] = getValueByPath(context.getAllData(), path);
      } else {
        output[key] = rule;
      }
    } else if (typeof rule === 'object' && rule !== null) {
      // 如果规则是对象，递归处理
      output[key] = applyTransformRules(input, rule, context);
    } else {
      output[key] = rule;
    }
  }

  return output;
}

/**
 * 根据路径获取值
 */
function getValueByPath(data: Record<string, any>, path: string): any {
  const parts = path.split('.');
  let current: any = data;

  for (const part of parts) {
    if (current === null || current === undefined) {
      return undefined;
    }
    current = current[part];
  }

  return current;
}

// ============================================================================
// 开始节点函数
// ============================================================================

/**
 * 开始节点函数
 * 接收工作流输入并传递给后续节点
 * 
 * @param input 节点输入
 * @param config 节点配置
 * @param context 执行上下文
 * @returns 节点输出
 */
export const startNodeFunction: NodeFunction = async (
  input: NodeInput,
  config: NodeConfig,
  context: ExecutionContext
): Promise<NodeOutput> => {
  const startTime = Date.now();

  try {
    // 存储输入到上下文
    context.setVariable('input', input);

    return {
      success: true,
      data: input,
      metadata: {
        executionTime: Date.now() - startTime
      }
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      metadata: {
        executionTime: Date.now() - startTime
      }
    };
  }
};

// ============================================================================
// 结束节点函数
// ============================================================================

/**
 * 结束节点函数
 * 返回工作流最终结果
 * 
 * @param input 节点输入
 * @param config 节点配置
 * @param context 执行上下文
 * @returns 节点输出
 */
export const endNodeFunction: NodeFunction = async (
  input: NodeInput,
  config: NodeConfig,
  context: ExecutionContext
): Promise<NodeOutput> => {
  const startTime = Date.now();

  try {
     const result = config['result'] || input;

    return {
      success: true,
      data: result,
      metadata: {
        executionTime: Date.now() - startTime
      }
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      metadata: {
        executionTime: Date.now() - startTime
      }
    };
  }
};

// ============================================================================
// 工具函数
// ============================================================================

/**
 * 替换变量占位符
 * 
 * @param text 文本
 * @param data 数据
 * @returns 替换后的文本
 */
function replacePlaceholders(text: string, data: Record<string, any>): string {
  const placeholderRegex = /\{\{([^}]+)\}\}/g;

  return text.replace(placeholderRegex, (match, path) => {
    const value = getValueByPath(data, path.trim());
    return valueToString(value);
  });
}

/**
 * 将值转换为字符串
 */
function valueToString(value: any): string {
  if (value === null || value === undefined) {
    return 'null';
  }
  if (typeof value === 'string') {
    return value;
  }
  if (typeof value === 'boolean') {
    return value ? 'true' : 'false';
  }
  if (typeof value === 'number') {
    return String(value);
  }
  if (typeof value === 'object') {
    return JSON.stringify(value);
  }
  return String(value);
}

// ============================================================================
// 节点函数注册表
// ============================================================================

/**
 * 节点函数注册表
 */
export const nodeFunctionRegistry: Record<string, NodeFunction> = {
  llm: llmNodeFunction,
  tool: toolNodeFunction,
  condition: conditionNodeFunction,
  transform: transformNodeFunction,
  start: startNodeFunction,
  end: endNodeFunction
};

/**
 * 获取节点函数
 * 
 * @param nodeType 节点类型
 * @returns 节点函数
 */
export function getNodeFunction(nodeType: string): NodeFunction | undefined {
  return nodeFunctionRegistry[nodeType];
}

/**
 * 注册节点函数
 * 
 * @param nodeType 节点类型
 * @param func 节点函数
 */
export function registerNodeFunction(nodeType: string, func: NodeFunction): void {
  nodeFunctionRegistry[nodeType] = func;
}