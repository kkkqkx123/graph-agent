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