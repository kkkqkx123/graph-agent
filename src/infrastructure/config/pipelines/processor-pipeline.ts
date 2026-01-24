/**
 * 处理器管道
 * 
 * 管理配置处理器的链式调用
 * 实现责任链模式
 */

import { IConfigProcessor } from '../../../domain/common/types';
import { ILogger } from '../../../domain/common/types';

/**
 * 处理器管道选项
 */
export interface ProcessorPipelineOptions {
  /**
   * 是否在处理器失败时继续执行
   */
  continueOnError?: boolean;
}

/**
 * 处理器管道
 */
export class ProcessorPipeline {
  private readonly processors: IConfigProcessor[] = [];
  private readonly logger: ILogger;
  private readonly options: ProcessorPipelineOptions;

  constructor(logger: ILogger, options: ProcessorPipelineOptions = {}) {
    this.logger = logger;
    this.options = {
      continueOnError: false,
      ...options,
    };
  }

  /**
   * 添加处理器
   * 
   * @param processor - 配置处理器
   */
  addProcessor(processor: IConfigProcessor): void {
    this.logger.debug('添加处理器', { processor: processor.constructor.name });
    this.processors.push(processor);
  }

  /**
   * 移除处理器
   * 
   * @param processor - 配置处理器
   */
  removeProcessor(processor: IConfigProcessor): void {
    const index = this.processors.indexOf(processor);
    if (index > -1) {
      this.processors.splice(index, 1);
      this.logger.debug('移除处理器', { processor: processor.constructor.name });
    }
  }

  /**
   * 清空所有处理器
   */
  clearProcessors(): void {
    this.processors.length = 0;
    this.logger.debug('清空所有处理器');
  }

  /**
   * 获取处理器数量
   */
  getProcessorCount(): number {
    return this.processors.length;
  }

  /**
   * 获取所有处理器
   */
  getProcessors(): IConfigProcessor[] {
    return [...this.processors];
  }

  /**
   * 处理配置
   * 
   * 按顺序执行所有处理器
   * 
   * @param config - 配置对象
   * @returns 处理后的配置对象
   */
  async process(config: Record<string, any>): Promise<Record<string, any>> {
    this.logger.debug('开始处理配置', { processorCount: this.processors.length });

    let result = config;

    for (const processor of this.processors) {
      try {
        this.logger.debug('执行处理器', { processor: processor.constructor.name });
        result = processor.process(result);
        this.logger.debug('处理器执行完成', { processor: processor.constructor.name });
      } catch (error) {
        this.logger.error('处理器执行失败', error as Error, {
          processor: processor.constructor.name,
        });

        if (!this.options.continueOnError) {
          throw error;
        }
      }
    }

    this.logger.debug('配置处理完成');
    return result;
  }
}