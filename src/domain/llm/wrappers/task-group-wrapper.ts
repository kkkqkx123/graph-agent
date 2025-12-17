import { BaseLLMWrapper } from './base-llm-wrapper';
import { 
  ModelInfo, 
  WrapperConfiguration, 
  HealthStatus 
} from '../interfaces/llm-wrapper.interface';
import { LLMRequest } from '../entities/llm-request';
import { LLMResponse } from '../entities/llm-response';
import { ITaskGroupService } from '../../application/llm/services/task-group.service';
import { FallbackContext } from '../value-objects/fallback-strategy';
import { 
  TaskGroupNotFoundException, 
  NoAvailableModelException,
  WrapperExecutionException 
} from '../exceptions';

/**
 * 任务组包装器
 * 
 * 使用任务组管理模型层级，提供降级和熔断功能
 */
export class TaskGroupWrapper extends BaseLLMWrapper {
  private readonly taskGroupService: ITaskGroupService;
  private readonly groupName: string;
  private readonly echelon?: string;

  constructor(
    name: string,
    groupName: string,
    taskGroupService: ITaskGroupService,
    configuration: WrapperConfiguration,
    echelon?: string
  ) {
    super(name, 'task_group', configuration);
    this.groupName = groupName;
    this.taskGroupService = taskGroupService;
    this.echelon = echelon;
  }

  /**
   * 生成响应
   */
  public async generateResponse(request: LLMRequest): Promise<LLMResponse> {
    return this.executeRequest(async () => {
      this.validateRequest(request);
      
      // 获取任务组
      const taskGroup = await this.taskGroupService.getTaskGroup(this.groupName);
      if (!taskGroup) {
        throw new TaskGroupNotFoundException(this.groupName);
      }

      // 创建降级上下文
      const context: FallbackContext = {
        requestId: request.getId(),
        echelons: taskGroup.getEchelons(),
        failedEchelons: new Set(),
        failedGroups: new Set(),
        metadata: {
          wrapperName: this.name,
          groupName: this.groupName,
          echelon: this.echelon
        }
      };

      try {
        // 如果指定了层级，尝试使用指定层级
        if (this.echelon) {
          return await this.executeWithEchelon(request, taskGroup, this.echelon, context);
        } else {
          // 使用任务组的降级策略
          return await taskGroup.executeWithFallback(request);
        }
      } catch (error) {
        // 记录失败的层级或组
        if (this.echelon) {
          context.failedEchelons.add(this.echelon);
        }
        context.failedGroups.add(this.groupName);
        
        throw error;
      }
    }, 'generateResponse');
  }

  /**
   * 流式生成响应
   */
  public async generateResponseStream(request: LLMRequest): Promise<AsyncIterable<LLMResponse>> {
    return this.executeRequest(async () => {
      this.validateRequest(request);
      
      // 获取任务组
      const taskGroup = await this.taskGroupService.getTaskGroup(this.groupName);
      if (!taskGroup) {
        throw new TaskGroupNotFoundException(this.groupName);
      }

      // 对于流式响应，暂时使用非流式实现并分块
      const response = await this.generateResponse(request);
      const content = response.getContent();
      
      // 简单的分块输出
      const chunkSize = 10;
      const chunks: LLMResponse[] = [];
      
      for (let i = 0; i < content.length; i += chunkSize) {
        const chunk = content.slice(i, i + chunkSize);
        chunks.push(LLMResponse.create(
          response.getId(),
          chunk,
          response.getTokenUsage(),
          response.getFinishReason(),
          {
            ...response.getMetadata(),
            stream: true,
            chunkIndex: Math.floor(i / chunkSize),
            totalChunks: Math.ceil(content.length / chunkSize)
          }
        ));
      }
      
      return this.createAsyncIterable(chunks);
    }, 'generateResponseStream');
  }

  /**
   * 获取模型信息
   */
  public async getModelInfo(): Promise<ModelInfo> {
    return this.executeRequest(async () => {
      const taskGroup = await this.taskGroupService.getTaskGroup(this.groupName);
      if (!taskGroup) {
        throw new TaskGroupNotFoundException(this.groupName);
      }

      // 获取可用的模型列表
      const availableModels = taskGroup.getAvailableModels();
      if (availableModels.length === 0) {
        throw new NoAvailableModelException(this.groupName);
      }

      // 使用第一个可用模型的信息作为代表
      const primaryModel = availableModels[0];
      
      // 解析模型信息
      const [provider, modelName] = primaryModel.split(':');
      
      return {
        name: `${this.groupName}-${primaryModel}`,
        type: 'task_group',
        provider: provider || 'unknown',
        version: '1.0.0',
        maxTokens: 4096,
        contextWindow: 8192,
        supportsStreaming: true,
        supportsTools: true,
        supportsImages: false,
        supportsAudio: false,
        supportsVideo: false,
        description: `任务组 ${this.groupName} 中的模型 ${primaryModel}`,
        capabilities: [
          'fallback',
          'circuit_breaker',
          'echelon_management',
          'rate_limiting'
        ]
      };
    }, 'getModelInfo');
  }

  /**
   * 检查是否支持函数调用
   */
  public supportsFunctionCalling(): boolean {
    // 任务组包装器支持函数调用，如果组中的模型支持的话
    return true;
  }

  /**
   * 执行健康检查
   */
  protected async performHealthCheck(): Promise<boolean> {
    try {
      const healthStatus = await this.taskGroupService.globalHealthCheck();
      const groupStatus = healthStatus[this.groupName];
      
      return groupStatus ? groupStatus.healthy : false;
    } catch (error) {
      return false;
    }
  }

  /**
   * 执行初始化
   */
  protected async performInitialization(): Promise<void> {
    // 检查任务组是否存在
    const taskGroup = await this.taskGroupService.getTaskGroup(this.groupName);
    if (!taskGroup) {
      throw new TaskGroupNotFoundException(this.groupName);
    }

    // 如果指定了层级，检查层级是否存在
    if (this.echelon) {
      const echelon = taskGroup.getEchelon(this.echelon);
      if (!echelon) {
        throw new WrapperExecutionException(
          this.name, 
          `任务组 ${this.groupName} 中不存在层级: ${this.echelon}`
        );
      }
    }

    // 检查是否有可用的模型
    const availableModels = taskGroup.getAvailableModels();
    if (availableModels.length === 0) {
      throw new NoAvailableModelException(this.groupName);
    }
  }

  /**
   * 使用指定层级执行请求
   */
  private async executeWithEchelon(
    request: LLMRequest,
    taskGroup: any,
    echelonName: string,
    context: FallbackContext
  ): Promise<LLMResponse> {
    const echelon = taskGroup.getEchelon(echelonName);
    if (!echelon) {
      throw new WrapperExecutionException(
        this.name, 
        `层级不存在: ${echelonName}`
      );
    }

    if (!echelon.isAvailable()) {
      throw new WrapperExecutionException(
        this.name, 
        `层级不可用: ${echelonName}`
      );
    }

    try {
      echelon.incrementConcurrency();
      
      // 这里应该调用实际的LLM客户端
      // 暂时返回模拟响应
      const response = LLMResponse.create(
        request.getId(),
        `任务组响应来自 ${this.groupName}.${echelonName}`,
        {
          promptTokens: 100,
          completionTokens: 50,
          totalTokens: 150
        },
        'stop',
        {
          groupName: this.groupName,
          echelon: echelonName,
          models: echelon.getModels(),
          wrapper: this.name
        }
      );
      
      echelon.incrementSuccess();
      return response;
    } catch (error) {
      echelon.incrementFailure();
      throw error;
    } finally {
      echelon.decrementConcurrency();
    }
  }

  /**
   * 获取任务组统计信息
   */
  public async getTaskGroupStatistics(): Promise<any> {
    return this.taskGroupService.getTaskGroupStatistics(this.groupName);
  }

  /**
   * 获取组名称
   */
  public getGroupName(): string {
    return this.groupName;
  }

  /**
   * 获取层级名称
   */
  public getEchelon(): string | undefined {
    return this.echelon;
  }

  /**
   * 创建任务组包装器
   */
  public static create(
    name: string,
    groupName: string,
    taskGroupService: ITaskGroupService,
    configuration: Partial<WrapperConfiguration> = {},
    echelon?: string
  ): TaskGroupWrapper {
    const defaultConfig: WrapperConfiguration = {
      name,
      type: 'task_group',
      enabled: true,
      timeout: 30000,
      maxRetries: 3,
      retryDelay: 1000,
      enableMetrics: true,
      metricsInterval: 60000,
      logLevel: 'info',
      customSettings: {
        groupName,
        echelon
      }
    };

    const finalConfig = { ...defaultConfig, ...configuration };
    return new TaskGroupWrapper(name, groupName, taskGroupService, finalConfig, echelon);
  }
}