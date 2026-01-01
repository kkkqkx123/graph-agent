import { injectable } from 'inversify';
import { IWorkflowFunction } from '../../types';
import { MapTransformFunction } from './map-transform.function';
import { FilterTransformFunction } from './filter-transform.function';
import { ReduceTransformFunction } from './reduce-transform.function';
import { SortTransformFunction } from './sort-transform.function';
import { GroupTransformFunction } from './group-transform.function';

/**
 * 转换函数注册表
 * 管理所有数据转换函数
 */
@injectable()
export class TransformFunctionRegistry {
  private functions: Map<string, IWorkflowFunction> = new Map();
  private functionsByName: Map<string, IWorkflowFunction> = new Map();

  constructor() {
    this.registerBuiltinTransforms();
  }

  /**
   * 注册内置转换函数
   */
  private registerBuiltinTransforms(): void {
    const transforms: IWorkflowFunction[] = [
      new MapTransformFunction(),
      new FilterTransformFunction(),
      new ReduceTransformFunction(),
      new SortTransformFunction(),
      new GroupTransformFunction()
    ];

    transforms.forEach(transform => {
      this.registerFunction(transform);
    });
  }

  /**
   * 注册函数
   */
  registerFunction(func: IWorkflowFunction): void {
    if (this.functions.has(func.id)) {
      throw new Error(`函数ID ${func.id} 已存在`);
    }

    if (this.functionsByName.has(func.name)) {
      throw new Error(`函数名称 ${func.name} 已存在`);
    }

    this.functions.set(func.id, func);
    this.functionsByName.set(func.name, func);
  }

  /**
   * 获取转换函数
   */
  getTransformFunction(transformType: string): IWorkflowFunction | null {
    const functionId = `transform:${transformType}`;
    return this.functions.get(functionId) || null;
  }

  /**
   * 根据名称获取转换函数
   */
  getTransformFunctionByName(name: string): IWorkflowFunction | null {
    return this.functionsByName.get(name) || null;
  }

  /**
   * 注册自定义转换函数
   */
  registerTransformFunction(transform: IWorkflowFunction): void {
    this.registerFunction(transform);
  }

  /**
   * 获取所有转换函数
   */
  getAllTransformFunctions(): IWorkflowFunction[] {
    return Array.from(this.functions.values());
  }

  /**
   * 检查转换函数是否存在
   */
  hasTransformFunction(transformType: string): boolean {
    const functionId = `transform:${transformType}`;
    return this.functions.has(functionId);
  }

  /**
   * 注销转换函数
   */
  unregisterTransformFunction(transformType: string): boolean {
    const functionId = `transform:${transformType}`;
    const func = this.functions.get(functionId);
    if (!func) {
      return false;
    }

    this.functions.delete(functionId);
    this.functionsByName.delete(func.name);
    return true;
  }
}