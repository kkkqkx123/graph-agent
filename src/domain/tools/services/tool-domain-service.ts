/**
 * 工具领域服务
 * 
 * 实现工具的核心业务逻辑
 */

import { ID } from '../../common/value-objects/id';
import { DomainError } from '../../common/errors/domain-error';
import { Tool } from '../entities/tool';
import { ToolExecution } from '../entities/tool-execution';
import { ToolResult } from '../entities/tool-result';
import { ToolType } from '../value-objects/tool-type';
import { ToolStatus } from '../value-objects/tool-status';
import { ToolExecutionStatus } from '../value-objects/tool-execution-status';

/**
 * 工具参数定义
 */
export interface ToolParameterDefinition {
  type: 'object';
  properties: Record<string, {
    type: string;
    description?: string;
    enum?: string[];
    items?: any;
    properties?: Record<string, any>;
    required?: string[];
  }>;
  required: string[];
}

/**
 * 工具返回值定义
 */
export interface ToolReturnDefinition {
  type: string;
  description?: string;
  properties?: Record<string, any>;
  items?: any;
}

/**
 * 工具领域服务
 */
export class ToolDomainService {

  /**
   * 创建工具
   */
  async createTool(
    name: string,
    description: string,
    type: ToolType,
    config: Record<string, unknown>,
    parameters: ToolParameterDefinition,
    returns?: ToolReturnDefinition,
    createdBy?: ID
  ): Promise<Tool> {
    // 验证必填字段
    if (!name || name.trim().length === 0) {
      throw new DomainError('工具名称不能为空');
    }

    if (!description || description.trim().length === 0) {
      throw new DomainError('工具描述不能为空');
    }

    // 验证参数定义
    if (!parameters || !parameters.properties || parameters.required.length === 0) {
      throw new DomainError('工具参数定义不能为空');
    }

    // 验证配置
    this.validateToolConfigInternal(type, config);

    return Tool.create(
      name.trim(),
      description.trim(),
      type,
      config,
      parameters,
      returns,
      createdBy
    );
  }

  /**
   * 更新工具
   */
  async updateTool(
    tool: Tool,
    name?: string,
    description?: string,
    config?: Record<string, unknown>,
    parameters?: ToolParameterDefinition,
    returns?: ToolReturnDefinition,
    metadata?: Record<string, unknown>
  ): Promise<Tool> {
    // 验证工具状态
    if (tool.status === ToolStatus.DEPRECATED) {
      throw new DomainError('不能更新已弃用的工具');
    }

    if (tool.status === ToolStatus.ARCHIVED) {
      throw new DomainError('不能更新已归档的工具');
    }

    // 验证配置
    if (config !== undefined) {
      this.validateToolConfigInternal(tool.type, config);
    }

    // 使用update方法返回新的Tool实例
    return tool.update(
      name,
      description,
      config,
      parameters,
      returns,
      metadata
    );
  }

  /**
   * 激活工具
   */
  async activateTool(tool: Tool): Promise<Tool> {
    if (tool.status === ToolStatus.ACTIVE) {
      throw new DomainError('工具已经是激活状态');
    }

    if (tool.status === ToolStatus.DEPRECATED) {
      throw new DomainError('不能激活已弃用的工具');
    }

    if (tool.status === ToolStatus.ARCHIVED) {
      throw new DomainError('不能激活已归档的工具');
    }

    // 验证工具配置
    const validation = await this.validateTool(tool);
    if (!validation.isValid) {
      throw new DomainError(`工具验证失败: ${validation.errors.join(', ')}`);
    }

    return tool.changeStatus(ToolStatus.ACTIVE);
  }

  /**
   * 停用工具
   */
  async deactivateTool(tool: Tool): Promise<Tool> {
    if (tool.status === ToolStatus.INACTIVE) {
      throw new DomainError('工具已经是停用状态');
    }

    if (tool.status === ToolStatus.DEPRECATED) {
      throw new DomainError('不能停用已弃用的工具');
    }

    if (tool.status === ToolStatus.ARCHIVED) {
      throw new DomainError('不能停用已归档的工具');
    }

    return tool.changeStatus(ToolStatus.INACTIVE);
  }

  /**
   * 弃用工具
   */
  async deprecateTool(tool: Tool): Promise<Tool> {
    if (tool.status === ToolStatus.DEPRECATED) {
      throw new DomainError('工具已经是弃用状态');
    }

    return tool.changeStatus(ToolStatus.DEPRECATED);
  }

  /**
   * 归档工具
   */
  async archiveTool(tool: Tool): Promise<Tool> {
    if (tool.status === ToolStatus.ARCHIVED) {
      throw new DomainError('工具已经是归档状态');
    }

    return tool.changeStatus(ToolStatus.ARCHIVED);
  }

  /**
   * 删除工具
   */
  async deleteTool(tool: Tool): Promise<boolean> {
    if (tool.isBuiltin) {
      throw new DomainError('不能删除内置工具');
    }

    // 检查是否有依赖关系
    if (tool.dependencies.length > 0) {
      throw new DomainError('不能删除有依赖关系的工具');
    }

    // 工具删除由应用层处理（通过仓储）
    return true;
  }

  /**
   * 复制工具
   */
  async duplicateTool(tool: Tool, newName: string, createdBy?: ID): Promise<Tool> {
    if (!newName || newName.trim().length === 0) {
      throw new DomainError('新工具名称不能为空');
    }

    return Tool.create(
      newName.trim(),
      `${tool.description} (副本)`,
      tool.type,
      { ...tool.config },
      { ...tool.parameters },
      tool.returns ? { ...tool.returns } : undefined,
      createdBy
    );
  }

  /**
   * 验证工具
   */
  async validateTool(tool: Tool): Promise<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // 验证基本字段
    if (!tool.name || tool.name.trim().length === 0) {
      errors.push('工具名称不能为空');
    }

    if (!tool.description || tool.description.trim().length === 0) {
      errors.push('工具描述不能为空');
    }

    // 验证参数定义
    if (!tool.parameters || !tool.parameters.properties || tool.parameters.required.length === 0) {
      errors.push('工具参数定义不能为空');
    }

    // 验证配置
    const configValidation = this.validateToolConfig(tool);
    if (!configValidation.isValid) {
      errors.push(...configValidation.errors);
      warnings.push(...configValidation.warnings);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * 验证工具配置
   */
  validateToolConfig(tool: Tool): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  } {
    return this.validateToolConfigInternal(tool.type, tool.config);
  }

  /**
   * 验证工具参数
   */
  async validateToolParameters(tool: Tool, parameters: Record<string, unknown>): Promise<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // 验证必需参数
    for (const requiredParam of tool.parameters.required) {
      if (!(requiredParam in parameters) || parameters[requiredParam] === undefined) {
        errors.push(`缺少必需参数: ${requiredParam}`);
      }
    }

    // 验证参数类型和格式
    for (const [paramName, paramDef] of Object.entries(tool.parameters.properties)) {
      if (paramName in parameters && parameters[paramName] !== undefined) {
        const value = parameters[paramName];

        // 基本类型验证
        if (paramDef.type === 'string' && typeof value !== 'string') {
          errors.push(`参数 ${paramName} 必须是字符串类型`);
        } else if (paramDef.type === 'number' && typeof value !== 'number') {
          errors.push(`参数 ${paramName} 必须是数字类型`);
        } else if (paramDef.type === 'boolean' && typeof value !== 'boolean') {
          errors.push(`参数 ${paramName} 必须是布尔类型`);
        } else if (paramDef.type === 'array' && !Array.isArray(value)) {
          errors.push(`参数 ${paramName} 必须是数组类型`);
        } else if (paramDef.type === 'object' && typeof value !== 'object') {
          errors.push(`参数 ${paramName} 必须是对象类型`);
        }

        // 枚举验证
        if (paramDef.enum && !paramDef.enum.includes(value as string)) {
          errors.push(`参数 ${paramName} 的值必须是以下之一: ${paramDef.enum.join(', ')}`);
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * 执行工具
   */
  async executeTool(
    tool: Tool,
    parameters: Record<string, unknown>,
    executorId?: ID,
    sessionId?: ID,
    threadId?: ID,
    workflowId?: ID,
    nodeId?: ID,
    context?: Record<string, unknown>,
    metadata?: Record<string, unknown>
  ): Promise<ToolResult> {
    // 验证工具状态
    if (tool.status !== ToolStatus.ACTIVE) {
      throw new DomainError(`工具 ${tool.name} 不是激活状态`);
    }

    // 验证参数
    const paramValidation = await this.validateToolParameters(tool, parameters);
    if (!paramValidation.isValid) {
      throw new DomainError(`参数验证失败: ${paramValidation.errors.join(', ')}`);
    }

    // 创建执行记录
    const execution = ToolExecution.create(
      tool.id,
      parameters,
      executorId,
      sessionId,
      threadId,
      workflowId,
      nodeId,
      context,
      metadata
    );

    // 这里应该调用工具执行器，但为了简化，直接创建结果
    const result = ToolResult.createSuccess(
      execution.id,
      { message: `工具 ${tool.name} 执行成功`, parameters },
      100,
      metadata
    );

    return result;
  }

  /**
   * 查找工具
   */
  async findTools(criteria: {
    type?: ToolType;
    status?: ToolStatus;
    category?: string;
    tags?: string[];
    createdBy?: ID;
    isEnabled?: boolean;
    isBuiltin?: boolean;
    searchText?: string;
  }): Promise<Tool[]> {
    // 这里应该调用仓储，但为了简化，返回空数组
    return [];
  }

  /**
   * 搜索工具
   */
  async searchTools(query: string, limit?: number): Promise<Tool[]> {
    // 这里应该调用仓储，但为了简化，返回空数组
    return [];
  }

  /**
   * 健康检查
   */
  async healthCheck(): Promise<{
    status: 'healthy' | 'unhealthy' | 'degraded';
    message?: string;
    details?: Record<string, unknown>;
    lastChecked: Date;
  }> {
    return {
      status: 'healthy',
      message: '工具领域服务运行正常',
      lastChecked: new Date()
    };
  }

  /**
   * 私有方法：验证工具配置
   */
  private validateToolConfigInternal(type: ToolType, config: Record<string, unknown>): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // 根据工具类型验证配置
    if (type.isBuiltin()) {
      // 内置工具不需要额外配置验证
    } else if (type.isNative()) {
      if (!config['functionName'] || typeof config['functionName'] !== 'string') {
        errors.push('原生工具必须指定函数名称');
      }
    } else if (type.isRest()) {
      if (!config['endpoint'] || typeof config['endpoint'] !== 'string') {
        errors.push('REST工具必须指定端点');
      }
      if (!config['method'] || typeof config['method'] !== 'string') {
        errors.push('REST工具必须指定请求方法');
      }
    } else if (type.isMcp()) {
      if (!config['protocol'] || typeof config['protocol'] !== 'string') {
        errors.push('MCP工具必须指定协议版本');
      }
    } else if (type.isCustom()) {
      // 自定义工具的配置验证留给具体实现
      warnings.push('自定义工具的配置验证需要手动处理');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }
}
