import { NodeId } from '../../../domain/workflow/value-objects/node/node-id';

/**
 * 变量映射接口
 */
export interface VariableMapping {
  /** 源变量路径 */
  source: string;
  /** 目标变量路径 */
  target: string;
  /** 转换函数表达式（可选） */
  transform?: string;
}

/**
 * 子工作流配置接口
 */
export interface SubgraphConfig {
  /** 输入参数映射 */
  inputMappings?: VariableMapping[];
  /** 输出参数映射 */
  outputMappings?: VariableMapping[];
  /** 错误处理配置 */
  errorHandling?: {
    strategy: 'propagate' | 'catch' | 'ignore';
    fallbackValue?: any;
    retryConfig?: {
      maxRetries: number;
      delay: number;
    };
  };
  /** 超时配置（毫秒） */
  timeout?: number;
  /** 其他扩展配置 */
  [key: string]: any;
}

/**
 * 验证结果接口
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * 子工作流节点元数据接口
 */
export interface SubgraphNodeMetadata {
  id: string;
  type: string;
  name?: string;
  description?: string;
  referenceId: string;
  parameters: Array<{
    name: string;
    type: string;
    required: boolean;
    description: string;
    defaultValue?: any;
  }>;
}

/**
 * 子工作流节点配置
 * 
 * 纯配置类，不继承 Node 实体
 * 仅用于定义子工作流节点的配置信息
 * 执行逻辑由 NodeExecutor 和 ThreadService 处理
 */
export class SubgraphNode {
  constructor(
    public readonly id: NodeId,
    public readonly referenceId: string,
    public readonly config: SubgraphConfig,
    public readonly name?: string,
    public readonly description?: string,
    public readonly position?: { x: number; y: number }
  ) { }

  /**
   * 获取引用ID
   */
  getReferenceId(): string {
    return this.referenceId;
  }

  /**
   * 获取配置
   */
  getConfig(): SubgraphConfig {
    return this.config;
  }

  /**
   * 验证配置有效性
   */
  validate(): ValidationResult {
    const errors: string[] = [];

    // 验证 referenceId
    if (!this.referenceId || typeof this.referenceId !== 'string') {
      errors.push('referenceId 必须是有效的字符串');
    }

    // 验证 config
    if (!this.config) {
      errors.push('config 是必需的');
    } else {
      // 验证输入映射
      if (this.config.inputMappings) {
        if (!Array.isArray(this.config.inputMappings)) {
          errors.push('config.inputMappings 必须是数组');
        } else {
          this.config.inputMappings.forEach((mapping: VariableMapping, index: number) => {
            if (!mapping.source || typeof mapping.source !== 'string') {
              errors.push(`config.inputMappings[${index}] 缺少 source`);
            }
            if (!mapping.target || typeof mapping.target !== 'string') {
              errors.push(`config.inputMappings[${index}] 缺少 target`);
            }
          });
        }
      }

      // 验证输出映射
      if (this.config.outputMappings) {
        if (!Array.isArray(this.config.outputMappings)) {
          errors.push('config.outputMappings 必须是数组');
        } else {
          this.config.outputMappings.forEach((mapping: VariableMapping, index: number) => {
            if (!mapping.source || typeof mapping.source !== 'string') {
              errors.push(`config.outputMappings[${index}] 缺少 source`);
            }
            if (!mapping.target || typeof mapping.target !== 'string') {
              errors.push(`config.outputMappings[${index}] 缺少 target`);
            }
          });
        }
      }

      // 验证错误处理配置
      if (this.config.errorHandling) {
        if (!this.config.errorHandling.strategy) {
          errors.push('config.errorHandling.strategy 是必需的');
        } else if (
          !['propagate', 'catch', 'ignore'].includes(this.config.errorHandling.strategy)
        ) {
          errors.push(
            'config.errorHandling.strategy 必须是 propagate、catch 或 ignore'
          );
        }
      }

      // 验证超时配置
      if (this.config.timeout !== undefined) {
        if (typeof this.config.timeout !== 'number' || this.config.timeout <= 0) {
          errors.push('config.timeout 必须是正数');
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * 获取元数据
   */
  getMetadata(): SubgraphNodeMetadata {
    return {
      id: this.id.toString(),
      type: 'subworkflow',
      name: this.name,
      description: this.description,
      referenceId: this.referenceId,
      parameters: [
        {
          name: 'referenceId',
          type: 'string',
          required: true,
          description: '子工作流引用ID',
        },
        {
          name: 'config',
          type: 'object',
          required: true,
          description: '子工作流配置',
          defaultValue: {
            inputMappings: [],
            outputMappings: [],
            errorHandling: { strategy: 'propagate' },
            timeout: 300000,
          },
        },
      ],
    };
  }

  /**
   * 从属性创建实例
   */
  static fromProps(props: any): SubgraphNode {
    return new SubgraphNode(
      props.id,
      props.referenceId,
      props.config || {},
      props.name,
      props.description,
      props.position
    );
  }
}