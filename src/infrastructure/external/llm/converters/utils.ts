/**
 * 通用工具函数
 * 
 * 提供转换器系统使用的通用工具函数
 */

/**
 * 验证图像数据
 */
export function validateImageData(imageData: string, maxSize: number = 5 * 1024 * 1024): string[] {
  const errors: string[] = [];
  
  if (typeof imageData !== 'string') {
    errors.push('图像数据必须是字符串');
    return errors;
  }
  
  try {
    const decodedData = atob(imageData);
    if (decodedData.length > maxSize) {
      errors.push(`图像大小超过限制: ${decodedData.length} > ${maxSize}`);
    }
  } catch (e) {
    errors.push(`图像数据解码失败: ${e}`);
  }
  
  return errors;
}

/**
 * 验证媒体类型
 */
export function validateMediaType(mediaType: string, supportedTypes: string[]): string[] {
  const errors: string[] = [];
  
  if (typeof mediaType !== 'string') {
    errors.push('媒体类型必须是字符串');
    return errors;
  }
  
  if (!supportedTypes.includes(mediaType)) {
    errors.push(`不支持的媒体类型: ${mediaType}`);
  }
  
  return errors;
}

/**
 * 从内容列表中提取文本
 */
export function extractTextFromContent(content: Array<Record<string, any>>): string {
  const textParts: string[] = [];
  
  for (const item of content) {
    if (item['type'] === 'text') {
      textParts.push(item['text'] || '');
    } else if (item['type'] === 'image') {
      textParts.push('[图像内容]');
    }
  }
  
  return textParts.join(' ');
}

/**
 * 将内容转换为统一列表格式
 */
export function processContentToList(content: string | Array<string | Record<string, any>>): Array<Record<string, any>> {
  if (typeof content === 'string') {
    return [{ type: 'text', text: content }];
  } else if (Array.isArray(content)) {
    const processed: Array<Record<string, any>> = [];
    for (const item of content) {
      if (typeof item === 'string') {
        processed.push({ type: 'text', text: item });
      } else if (typeof item === 'object') {
        processed.push(item);
      }
    }
    return processed;
  } else {
    return [{ type: 'text', text: String(content) }];
  }
}

/**
 * 验证工具定义
 */
export function validateTools(tools: Array<Record<string, any>>): string[] {
  const errors: string[] = [];
  
  if (!Array.isArray(tools)) {
    errors.push('工具必须是列表格式');
    return errors;
  }
  
  for (let i = 0; i < tools.length; i++) {
    const tool = tools[i];
    if (typeof tool !== 'object') {
      errors.push(`工具 ${i} 必须是字典`);
      continue;
    }
    
    if (!('type' in tool)) {
      errors.push(`工具 ${i} 缺少type字段`);
    }
    
    if (!('function' in tool)) {
      errors.push(`工具 ${i} 缺少function字段`);
    } else if (typeof tool['function'] !== 'object') {
      errors.push(`工具 ${i} 的function字段必须是字典`);
    } else {
      const func = tool['function'];
      if (!('name' in func)) {
        errors.push(`工具 ${i} 的function缺少name字段`);
      }
      if (!('description' in func)) {
        errors.push(`工具 ${i} 的function缺少description字段`);
      }
      if (!('parameters' in func)) {
        errors.push(`工具 ${i} 的function缺少parameters字段`);
      }
    }
  }
  
  return errors;
}

/**
 * 将工具转换为OpenAI格式
 */
export function convertToolsToOpenAIFormat(tools: Array<Record<string, any>>): Array<Record<string, any>> {
  return tools; // 假设输入已经是OpenAI格式
}

/**
 * 从响应中提取工具调用
 */
export function extractToolCallsFromResponse(response: Record<string, any>): Array<Record<string, any>> {
  const choices = response['choices'] || [];
  if (!choices.length) {
    return [];
  }
  
  const message = choices[0]['message'] || {};
  return message['tool_calls'] || [];
}

/**
 * 验证流式事件
 */
export function validateStreamEvents(events: Array<Record<string, any>>): string[] {
  const errors: string[] = [];
  
  if (!Array.isArray(events)) {
    errors.push('流式事件必须是列表格式');
    return errors;
  }
  
  for (let i = 0; i < events.length; i++) {
    const event = events[i];
    if (typeof event !== 'object') {
      errors.push(`事件 ${i} 必须是字典`);
    }
  }
  
  return errors;
}

/**
 * 处理流式事件为响应格式
 */
export function processStreamEvents(events: Array<Record<string, any>>): Record<string, any> {
  const contentParts: string[] = [];
  const toolCalls: Array<Record<string, any>> = [];
  
  for (const event of events) {
    if ('content' in event) {
      contentParts.push(String(event['content']));
    }
    
    if ('tool_calls' in event) {
      toolCalls.push(...(event['tool_calls'] || []));
    }
  }
  
  // 构建响应格式
  const response = {
    choices: [{
      message: {
        content: contentParts.join(''),
        role: 'assistant'
      }
    }]
  };
  
  if (toolCalls.length && response.choices && response.choices[0] && response.choices[0].message) {
    (response.choices[0].message as any)['tool_calls'] = toolCalls;
  }
  
  return response;
}

/**
 * 创建当前时间戳
 */
export function createTimestamp(): Date {
  return new Date();
}

/**
 * 安全获取字典值
 */
export function safeGet(data: Record<string, any> | null | undefined, key: string, defaultValue: any = null): any {
  try {
    if (data && typeof data === 'object') {
      return data[key] !== undefined ? data[key] : defaultValue;
    }
    return defaultValue;
  } catch {
    return defaultValue;
  }
}

/**
 * 合并多个字典
 */
export function mergeDicts(...dicts: Array<Record<string, any>>): Record<string, any> {
  const result: Record<string, any> = {};
  for (const d of dicts) {
    if (d && typeof d === 'object' && d !== null) {
      Object.assign(result, d);
    }
  }
  return result;
}