/**
 * 函数管理应用服务
 * 负责函数的CRUD操作、版本管理、配置管理和部署管理
 */

import { injectable, inject } from 'inversify';
import { ILogger } from '../../../domain/common';

/**
 * 工作流函数类型枚举
 */
export enum WorkflowFunctionType {
  NODE = 'node',
  CONDITION = 'condition',
  ROUTING = 'routing',
  TRIGGER = 'trigger',
  TRANSFORM = 'transform',
}

/**
 * 验证结果接口
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * 函数定义
 */
export interface FunctionDefinition {
  id: string;
  name: string;
  description: string;
  version: string;
  type: WorkflowFunctionType;
  category?: string;
  code: string;
  dependencies?: string[];
  config?: any;
  metadata?: Record<string, any>;
}

/**
 * 函数更新
 */
export interface FunctionUpdate {
  name?: string;
  description?: string;
  code?: string;
  dependencies?: string[];
  config?: any;
  metadata?: Record<string, any>;
}

/**
 * 函数版本信息
 */
export interface FunctionVersionInfo {
  functionId: string;
  version: string;
  isActive: boolean;
  createdAt: Date;
  createdBy: string;
  changelog: string;
}

/**
 * 函数部署配置
 */
export interface FunctionDeploymentConfig {
  environment: 'development' | 'testing' | 'staging' | 'production';
  replicas?: number;
  resources?: {
    memory?: number;
    cpu?: number;
  };
  scaling?: {
    minReplicas?: number;
    maxReplicas?: number;
    targetCpuUtilization?: number;
  };
}

/**
 * 函数部署状态
 */
export interface FunctionDeploymentStatus {
  functionId: string;
  version: string;
  environment: string;
  status: 'pending' | 'deploying' | 'deployed' | 'failed' | 'retired';
  deployedAt?: Date;
  errorMessage?: string;
  endpoints?: string[];
}

/**
 * 函数管理服务
 */
@injectable()
export class FunctionManagementService {
  private readonly functionRegistry = new Map<string, FunctionDefinition>();
  private readonly versionRegistry = new Map<string, FunctionVersionInfo[]>();
  private readonly deploymentRegistry = new Map<string, FunctionDeploymentStatus[]>();

  constructor(@inject('Logger') private readonly logger: ILogger) {}

  /**
   * 部署函数
   */
  async deployFunction(
    functionDefinition: FunctionDefinition,
    deploymentConfig: FunctionDeploymentConfig
  ): Promise<FunctionDeploymentStatus> {
    this.logger.info('开始部署函数', {
      functionId: functionDefinition.id,
      version: functionDefinition.version,
      environment: deploymentConfig.environment,
    });

    try {
      // 1. 验证函数定义
      const validationResult = await this.validateFunctionDefinition(functionDefinition);
      if (!validationResult.valid) {
        throw new Error(`函数定义验证失败: ${validationResult.errors.join(', ')}`);
      }

      // 2. 检查函数是否已存在
      const existingFunction = this.functionRegistry.get(functionDefinition.id);
      if (existingFunction) {
        // 更新现有函数
        await this.updateFunction(functionDefinition.id, {
          name: functionDefinition.name,
          description: functionDefinition.description,
          code: functionDefinition.code,
          dependencies: functionDefinition.dependencies,
          config: functionDefinition.config,
          metadata: functionDefinition.metadata,
        });
      } else {
        // 注册新函数
        this.functionRegistry.set(functionDefinition.id, functionDefinition);
      }

      // 3. 创建版本信息
      const versionInfo: FunctionVersionInfo = {
        functionId: functionDefinition.id,
        version: functionDefinition.version,
        isActive: true,
        createdAt: new Date(),
        createdBy: 'system', // 应该从上下文获取
        changelog: `部署版本 ${functionDefinition.version}`,
      };

      // 4. 更新版本注册表
      if (!this.versionRegistry.has(functionDefinition.id)) {
        this.versionRegistry.set(functionDefinition.id, []);
      }
      this.versionRegistry.get(functionDefinition.id)!.push(versionInfo);

      // 5. 创建部署状态
      const deploymentStatus: FunctionDeploymentStatus = {
        functionId: functionDefinition.id,
        version: functionDefinition.version,
        environment: deploymentConfig.environment,
        status: 'deployed',
        deployedAt: new Date(),
        endpoints: [`/api/functions/${functionDefinition.id}/${functionDefinition.version}`],
      };

      // 6. 更新部署注册表
      if (!this.deploymentRegistry.has(functionDefinition.id)) {
        this.deploymentRegistry.set(functionDefinition.id, []);
      }
      this.deploymentRegistry.get(functionDefinition.id)!.push(deploymentStatus);

      this.logger.info('函数部署成功', {
        functionId: functionDefinition.id,
        version: functionDefinition.version,
        environment: deploymentConfig.environment,
      });

      return deploymentStatus;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      const failedStatus: FunctionDeploymentStatus = {
        functionId: functionDefinition.id,
        version: functionDefinition.version,
        environment: deploymentConfig.environment,
        status: 'failed',
        errorMessage,
      };

      this.logger.error('函数部署失败', error instanceof Error ? error : new Error(errorMessage), {
        functionId: functionDefinition.id,
        version: functionDefinition.version,
        environment: deploymentConfig.environment,
      });

      return failedStatus;
    }
  }

  /**
   * 更新函数
   */
  async updateFunction(functionId: string, updates: FunctionUpdate): Promise<boolean> {
    this.logger.info('更新函数', { functionId });

    try {
      const existingFunction = this.functionRegistry.get(functionId);
      if (!existingFunction) {
        throw new Error(`函数不存在: ${functionId}`);
      }

      // 应用更新
      const updatedFunction: FunctionDefinition = {
        ...existingFunction,
        ...updates,
        id: functionId, // 确保ID不被更改
      };

      // 验证更新后的函数
      const validationResult = await this.validateFunctionDefinition(updatedFunction);
      if (!validationResult.valid) {
        throw new Error(`更新后的函数验证失败: ${validationResult.errors.join(', ')}`);
      }

      // 更新注册表
      this.functionRegistry.set(functionId, updatedFunction);

      this.logger.info('函数更新成功', { functionId });
      return true;
    } catch (error) {
      this.logger.error('函数更新失败', error instanceof Error ? error : new Error(String(error)), {
        functionId,
      });
      return false;
    }
  }

  /**
   * 退役函数
   */
  async retireFunction(functionId: string, version?: string): Promise<boolean> {
    this.logger.info('退役函数', { functionId, version });

    try {
      if (version) {
        // 退役特定版本
        const versions = this.versionRegistry.get(functionId);
        if (versions) {
          const targetVersion = versions.find(v => v.version === version);
          if (targetVersion) {
            targetVersion.isActive = false;
          }
        }

        // 更新部署状态
        const deployments = this.deploymentRegistry.get(functionId);
        if (deployments) {
          const targetDeployment = deployments.find(d => d.version === version);
          if (targetDeployment) {
            targetDeployment.status = 'retired';
          }
        }
      } else {
        // 退役整个函数
        this.functionRegistry.delete(functionId);
        this.versionRegistry.delete(functionId);
        this.deploymentRegistry.delete(functionId);
      }

      this.logger.info('函数退役成功', { functionId, version });
      return true;
    } catch (error) {
      this.logger.error('函数退役失败', error instanceof Error ? error : new Error(String(error)), {
        functionId,
        version,
      });
      return false;
    }
  }

  /**
   * 获取函数定义
   */
  async getFunctionDefinition(
    functionId: string,
    version?: string
  ): Promise<FunctionDefinition | null> {
    const functionDef = this.functionRegistry.get(functionId);
    if (!functionDef) {
      return null;
    }

    if (version && version !== functionDef.version) {
      // 如果指定了版本且不是当前版本，需要从历史版本中查找
      const versions = this.versionRegistry.get(functionId);
      if (versions) {
        const targetVersion = versions.find(v => v.version === version);
        if (targetVersion) {
          // 这里应该从持久化存储中获取历史版本
          // 简化实现，返回当前版本
          return functionDef;
        }
      }
      return null;
    }

    return functionDef;
  }

  /**
   * 列出所有函数
   */
  async listFunctions(filter?: {
    type?: WorkflowFunctionType;
    category?: string;
    activeOnly?: boolean;
  }): Promise<FunctionDefinition[]> {
    let functions = Array.from(this.functionRegistry.values());

    if (filter) {
      if (filter.type) {
        functions = functions.filter(f => f.type === filter.type);
      }
      if (filter.category) {
        functions = functions.filter(f => f.category === filter.category);
      }
      if (filter.activeOnly) {
        const activeFunctionIds = new Set<string>();
        for (const [functionId, versions] of this.versionRegistry.entries()) {
          const activeVersions = versions.filter(v => v.isActive);
          if (activeVersions.length > 0) {
            activeFunctionIds.add(functionId);
          }
        }
        functions = functions.filter(f => activeFunctionIds.has(f.id));
      }
    }

    return functions;
  }

  /**
   * 获取函数版本历史
   */
  async getFunctionVersionHistory(functionId: string): Promise<FunctionVersionInfo[]> {
    return this.versionRegistry.get(functionId) || [];
  }

  /**
   * 获取函数部署状态
   */
  async getFunctionDeploymentStatus(
    functionId: string,
    environment?: string
  ): Promise<FunctionDeploymentStatus[]> {
    const deployments = this.deploymentRegistry.get(functionId) || [];

    if (environment) {
      return deployments.filter(d => d.environment === environment);
    }

    return deployments;
  }

  /**
   * 验证函数定义
   */
  private async validateFunctionDefinition(
    definition: FunctionDefinition
  ): Promise<ValidationResult> {
    const errors: string[] = [];

    // 基础验证
    if (!definition.id || definition.id.trim().length === 0) {
      errors.push('函数ID不能为空');
    }

    if (!definition.name || definition.name.trim().length === 0) {
      errors.push('函数名称不能为空');
    }

    if (!definition.description || definition.description.trim().length === 0) {
      errors.push('函数描述不能为空');
    }

    if (!definition.version || definition.version.trim().length === 0) {
      errors.push('函数版本不能为空');
    }

    if (!definition.code || definition.code.trim().length === 0) {
      errors.push('函数代码不能为空');
    }

    // 版本格式验证
    if (definition.version && !/^\d+\.\d+\.\d+$/.test(definition.version)) {
      errors.push('函数版本格式应为 x.y.z');
    }

    // 简化的验证逻辑，不依赖已删除的领域服务
    try {
      // 基础配置验证
      if (definition.config) {
        if (typeof definition.config !== 'object') {
          errors.push('函数配置必须是一个对象');
        }
      }
    } catch (error) {
      errors.push(
        `函数验证过程中发生错误: ${error instanceof Error ? error.message : String(error)}`
      );
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * 检查函数依赖
   */
  private async checkFunctionDependencies(dependencies: string[]): Promise<boolean> {
    for (const depId of dependencies) {
      if (!this.functionRegistry.has(depId)) {
        return false;
      }
    }
    return true;
  }

  /**
   * 生成函数端点
   */
  private generateFunctionEndpoint(functionId: string, version: string): string {
    return `/api/functions/${functionId}/${version}`;
  }

  /**
   * 清理资源
   */
  async cleanup(): Promise<void> {
    this.functionRegistry.clear();
    this.versionRegistry.clear();
    this.deploymentRegistry.clear();

    this.logger.info('函数管理服务资源清理完成');
  }
}
