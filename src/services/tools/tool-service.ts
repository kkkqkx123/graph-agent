/**
 * 工具服务
 *
 * 直接从 ConfigLoadingModule 获取工具配置，提供工具查找和执行功能
 */

import { injectable, inject } from 'inversify';
import { Tool } from '../../domain/tools/entities/tool';
import { ToolExecution } from '../../domain/tools/entities/tool-execution';
import { ToolResult } from '../../domain/tools/entities/tool-result';
import { ILogger } from '../../domain/common/types/logger-types';
import { ID } from '../../domain/common/value-objects/id';
import { ToolType } from '../../domain/tools/value-objects/tool-type';
import { ToolStatus } from '../../domain/tools/value-objects/tool-status';
import { Metadata } from '../../domain/common/value-objects';
import { Tags } from '../../domain/threads/checkpoints/value-objects/tags';
import { DeletionStatus } from '../../domain/common/value-objects';
import { StateData } from '../../domain/threads/checkpoints/value-objects/state-data';
import { Timestamp } from '../../domain/common/value-objects/timestamp';
import { Version } from '../../domain/common/value-objects/version';
import { ToolExecutorBase } from './executors/tool-executor-base';
import { BuiltinExecutor } from './executors/builtin-executor';
import { NativeExecutor } from './executors/native-executor';
import { RestExecutor } from './executors/rest-executor';
import { McpExecutor } from './executors/mcp-executor';
import { EntityNotFoundError, ValidationError } from '../../common/exceptions';
import { ConfigLoadingModule } from '../../infrastructure/config/loading/config-loading-module';

/**
 * 工具配置接口（从配置文件加载）
 */
interface ToolConfig {
  name: string;
  tool_type: 'builtin' | 'native' | 'rest' | 'mcp';
  description: string;
  function_path?: string;
  enabled?: boolean;
  timeout?: number;
  parameters_schema?: {
    type: 'object';
    properties: Record<string, any>;
    required?: string[];
  };
  state_config?: Record<string, any>;
  metadata?: {
    category?: string;
    tags?: string[];
    documentation_url?: string;
    server_info?: string;
  };
  // REST 工具特定配置
  api_url?: string;
  method?: string;
  auth_method?: string;
  api_key?: string;
  headers?: Record<string, string>;
  retry_count?: number;
  retry_delay?: number;
  // MCP 工具特定配置
  mcp_server_url?: string;
  dynamic_schema?: boolean;
  refresh_interval?: number;
}

/**
 * 工具服务
 */
@injectable()
export class ToolService {
  private readonly executors: Map<string, ToolExecutorBase> = new Map();

  constructor(
    @inject('Logger') private readonly logger: ILogger,
    @inject('ConfigLoadingModule') private readonly configManager: ConfigLoadingModule,
    @inject('BuiltinExecutor') private readonly builtinExecutor: BuiltinExecutor,
    @inject('NativeExecutor') private readonly nativeExecutor: NativeExecutor,
    @inject('RestExecutor') private readonly restExecutor: RestExecutor,
    @inject('McpExecutor') private readonly mcpExecutor: McpExecutor
  ) {
    // 注册执行器
    this.executors.set('builtin', this.builtinExecutor);
    this.executors.set('native', this.nativeExecutor);
    this.executors.set('rest', this.restExecutor);
    this.executors.set('http', this.restExecutor);
    this.executors.set('api', this.restExecutor);
    this.executors.set('mcp', this.mcpExecutor);
  }

  /**
   * 获取工具配置
   */
  private getToolConfig(toolId: string): ToolConfig | undefined {
    const toolsConfig = this.configManager.getRef<Record<string, ToolConfig>>('tools.tools');
    return toolsConfig?.[toolId];
  }

  /**
   * 获取所有工具配置
   */
  private getAllToolConfigs(): Record<string, ToolConfig> {
    return this.configManager.getRef<Record<string, ToolConfig>>('tools.tools') || {};
  }

  /**
   * 将配置转换为 Tool 实体
   */
  private convertConfigToTool(toolId: string, config: ToolConfig): Tool {
    const id = ID.generate();
    const now = Timestamp.now();

    // 构建参数定义
    const parameters = {
      type: 'object' as const,
      properties: config.parameters_schema?.properties || {},
      required: config.parameters_schema?.required || [],
    };

    // 构建工具配置
    const toolConfigData: Record<string, unknown> = {
      functionName: config.function_path,
      apiUrl: config.api_url,
      method: config.method,
      authMethod: config.auth_method,
      apiKey: config.api_key,
      headers: config.headers,
      retryCount: config.retry_count,
      retryDelay: config.retry_delay,
      mcpServerUrl: config.mcp_server_url,
      dynamicSchema: config.dynamic_schema,
      refreshInterval: config.refresh_interval,
      ...config.state_config,
    };

    // 构建元数据
    const metadata: Record<string, unknown> = {
      category: config.metadata?.category || 'general',
      documentationUrl: config.metadata?.documentation_url,
      serverInfo: config.metadata?.server_info,
    };

    const props = {
      id,
      name: config.name,
      description: config.description,
      type: ToolType.fromString(config.tool_type),
      status: config.enabled !== false ? ToolStatus.ACTIVE : ToolStatus.DRAFT,
      config: StateData.create(toolConfigData),
      parameters,
      metadata: Metadata.create(metadata),
      createdAt: now,
      updatedAt: now,
      version: Version.initial(),
      tags: Tags.create(config.metadata?.tags || []),
      category: config.metadata?.category || 'general',
      isBuiltin: config.tool_type === 'builtin',
      isEnabled: config.enabled !== false,
      timeout: config.timeout || 30000,
      maxRetries: 3,
      permissions: [],
      dependencies: [],
      deletionStatus: DeletionStatus.active(),
    };

    return Tool.fromProps(props);
  }

  /**
   * 获取工具
   */
  get(toolId: string): Tool | undefined {
    const toolConfig = this.getToolConfig(toolId);
    if (!toolConfig) {
      return undefined;
    }
    return this.convertConfigToTool(toolId, toolConfig);
  }

  /**
   * 根据名称获取工具
   */
  getByName(name: string): Tool | undefined {
    const toolsConfig = this.getAllToolConfigs();
    for (const [toolId, config] of Object.entries(toolsConfig)) {
      if (config.name === name) {
        return this.convertConfigToTool(toolId, config);
      }
    }
    return undefined;
  }

  /**
   * 获取所有工具
   */
  getAll(): Tool[] {
    const toolsConfig = this.getAllToolConfigs();
    return Object.entries(toolsConfig).map(([toolId, config]) =>
      this.convertConfigToTool(toolId, config)
    );
  }

  /**
   * 获取启用的工具
   */
  getEnabled(): Tool[] {
    return this.getAll().filter(tool => tool.isEnabled);
  }

  /**
   * 获取工具 Schema（用于 LLM）
   */
  getSchema(toolId: string): Record<string, any> | undefined {
    const tool = this.get(toolId);
    if (!tool) {
      return undefined;
    }

    return {
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters,
    };
  }

  /**
   * 批量获取工具 Schema
   */
  getSchemas(toolIds: string[]): Record<string, any>[] {
    const schemas: Record<string, any>[] = [];

    for (const toolId of toolIds) {
      const schema = this.getSchema(toolId);
      if (schema) {
        schemas.push(schema);
      }
    }

    return schemas;
  }

  /**
   * 获取所有工具的 Schema
   */
  getAllSchemas(): Record<string, any>[] {
    const tools = this.getEnabled();
    return this.getSchemas(tools.map(tool => tool.toolId.toString()));
  }

  /**
   * 检查工具是否存在
   */
  has(toolId: string): boolean {
    return this.get(toolId) !== undefined;
  }

  /**
   * 获取工具名称列表
   */
  getToolNames(): string[] {
    return this.getAll().map(tool => tool.name);
  }

  /**
   * 获取工具数量
   */
  size(): number {
    return this.getAll().length;
  }

  /**
   * 执行工具
   */
  async execute(
    toolId: string,
    parameters: Record<string, unknown>,
    context?: Record<string, unknown>
  ): Promise<ToolResult> {
    // 获取工具
    const tool = this.get(toolId);
    if (!tool) {
      throw new EntityNotFoundError('Tool', toolId);
    }

    // 检查工具是否启用
    if (!tool.isEnabled) {
      throw new ValidationError(`工具 ${tool.name} 未启用`);
    }

    // 获取执行器
    const executor = this.getExecutor(toolId);

    // 创建执行记录
    const sessionId = context?.['sessionId'] ? ID.fromString(context['sessionId'] as string) : undefined;
    const threadId = context?.['threadId'] ? ID.fromString(context['threadId'] as string) : undefined;
    const workflowId = context?.['workflowId'] ? ID.fromString(context['workflowId'] as string) : undefined;
    const nodeId = context?.['nodeId'] ? ID.fromString(context['nodeId'] as string) : undefined;

    const execution = ToolExecution.create(
      tool.toolId,
      parameters,
      undefined, // executorId
      sessionId,
      threadId,
      workflowId,
      nodeId
    );

    // 执行工具
    const result = await executor.execute(tool, execution);

    this.logger.debug(`工具 ${tool.name} 执行完成`, {
      success: result.success,
      duration: result.duration,
    });

    return result;
  }

  /**
   * 验证工具配置
   */
  async validateTool(toolId: string): Promise<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    const tool = this.get(toolId);
    if (!tool) {
      return {
        isValid: false,
        errors: [`工具 ${toolId} 不存在`],
        warnings: [],
      };
    }

    const executor = this.getExecutor(toolId);
    return await executor.validateTool(tool);
  }

  /**
   * 验证工具参数
   */
  async validateParameters(
    toolId: string,
    parameters: Record<string, unknown>
  ): Promise<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    const tool = this.get(toolId);
    if (!tool) {
      return {
        isValid: false,
        errors: [`工具 ${toolId} 不存在`],
        warnings: [],
      };
    }

    const executor = this.getExecutor(toolId);
    return await executor.validateParameters(tool, parameters);
  }

  /**
   * 获取工具执行器
   */
  private getExecutor(toolId: string): ToolExecutorBase {
    const tool = this.get(toolId);
    if (!tool) {
      throw new EntityNotFoundError('Tool', toolId);
    }

    const executor = this.executors.get(tool.type.value);
    if (!executor) {
      throw new ValidationError(`不支持的工具类型: ${tool.type.value}`);
    }

    return executor;
  }
}