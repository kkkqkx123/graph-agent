import { injectable, inject } from 'inversify';
import { EdgeValueObject } from '../../../domain/workflow/value-objects/edge/edge-value-object';
import { FunctionRegistry } from '../functions/function-registry';
import { WorkflowExecutionContext } from '../functions/types';
import { ILogger } from '../../../domain/common/types/logger-types';

/**
 * 边执行器
 * 直接调用边函数执行边值对象
 */
@injectable()
export class EdgeExecutor {
  constructor(
    @inject('FunctionRegistry') private readonly functionRegistry: FunctionRegistry,
    @inject('Logger') private readonly logger: ILogger
  ) {}

  /**
   * 执行边
   * @param edge 边值对象
   * @param context 执行上下文
   * @returns 执行结果
   */
  async execute(edge: EdgeValueObject, context: WorkflowExecutionContext): Promise<any> {
    this.logger.debug('开始执行边', {
      edgeId: edge.id.toString(),
      edgeType: edge.type.toString(),
      fromNodeId: edge.fromNodeId.toString(),
      toNodeId: edge.toNodeId.toString(),
    });

    try {
      // 直接调用边函数
      const edgeFunction = this.functionRegistry.getRoutingFunction(edge.type.toString());
      if (!edgeFunction) {
        throw new Error(`未找到边函数: ${edge.type.toString()}`);
      }

      // 构建配置
      const config = {
        edgeId: edge.id.toString(),
        fromNodeId: edge.fromNodeId.toString(),
        toNodeId: edge.toNodeId.toString(),
        condition: edge.condition,
        weight: edge.weight,
        ...edge.properties,
      };

      const result = await edgeFunction.execute(context, config);

      this.logger.info('边执行完成', {
        edgeId: edge.id.toString(),
        edgeType: edge.type.toString(),
        success: true,
      });

      return {
        success: true,
        output: result,
        metadata: {
          edgeId: edge.id.toString(),
          edgeType: edge.type.toString(),
          fromNodeId: edge.fromNodeId.toString(),
          toNodeId: edge.toNodeId.toString(),
        },
      };
    } catch (error) {
      this.logger.error('边执行失败', error instanceof Error ? error : new Error(String(error)), {
        edgeId: edge.id.toString(),
        edgeType: edge.type.toString(),
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        metadata: {
          edgeId: edge.id.toString(),
          edgeType: edge.type.toString(),
          errorType: error instanceof Error ? error.constructor.name : 'Unknown',
        },
      };
    }
  }

  /**
   * 验证边是否可以执行
   * @param edge 边值对象
   * @param context 执行上下文
   * @returns 是否可以执行
   */
  async canExecute(edge: EdgeValueObject, context: WorkflowExecutionContext): Promise<boolean> {
    try {
      // 1. 检查边函数是否存在
      const edgeFunction = this.functionRegistry.getRoutingFunction(edge.type.toString());
      if (!edgeFunction) {
        this.logger.warn('边函数不存在', {
          edgeId: edge.id.toString(),
          edgeType: edge.type.toString(),
        });
        return false;
      }

      // 2. 如果边需要条件评估，则评估条件
      if (edge.requiresConditionEvaluation()) {
        const condition = edge.getConditionExpression();
        if (condition) {
          // 简单的条件评估逻辑
          const variables = this.extractVariables(context);
          const satisfied = this.evaluateCondition(condition, variables);

          if (!satisfied) {
            this.logger.debug('边条件不满足', {
              edgeId: edge.id.toString(),
              condition,
            });
            return false;
          }
        }
      }

      // 3. 检查边的配置是否有效
      const config = {
        edgeId: edge.id.toString(),
        fromNodeId: edge.fromNodeId.toString(),
        toNodeId: edge.toNodeId.toString(),
        condition: edge.condition,
        weight: edge.weight,
        ...edge.properties,
      };

      // 验证配置（使用IWorkflowFunction的validateConfig方法）
      const validationResult = edgeFunction.validateConfig(config);
      if (!validationResult.valid) {
        this.logger.warn('边配置验证失败', {
          edgeId: edge.id.toString(),
          errors: validationResult.errors,
        });
        return false;
      }

      return true;
    } catch (error) {
      this.logger.error('边验证失败', error instanceof Error ? error : new Error(String(error)), {
        edgeId: edge.id.toString(),
        edgeType: edge.type.toString(),
      });
      return false;
    }
  }

  /**
   * 从上下文中提取变量
   * @param context 执行上下文
   * @returns 变量映射
   */
  private extractVariables(context: WorkflowExecutionContext): Record<string, unknown> {
    const variables: Record<string, unknown> = {};

    // 尝试获取常见的变量
    try {
      variables['executionId'] = context.getExecutionId();
      variables['workflowId'] = context.getWorkflowId();

      // 尝试获取一些常见的上下文变量
      const commonKeys = ['messages', 'errors', 'tool_calls', 'condition_results'];
      for (const key of commonKeys) {
        try {
          const value = context.getVariable(key);
          if (value !== undefined) {
            variables[key] = value;
          }
        } catch {
          // 忽略获取变量时的错误
        }
      }
    } catch {
      // 忽略提取变量时的错误
    }

    return variables;
  }

  /**
   * 简单的条件评估
   * @param condition 条件表达式
   * @param variables 变量映射
   * @returns 评估结果
   */
  private evaluateCondition(condition: string, variables: Record<string, unknown>): boolean {
    try {
      // 替换变量引用
      let expression = condition;

      // 简单的变量替换，格式为 ${variableName}
      expression = expression.replace(/\$\{([^}]+)\}/g, (match, varName) => {
        const value = variables[varName];
        if (typeof value === 'string') {
          return `'${value}'`;
        }
        return String(value);
      });

      // 安全检查，只允许基本的比较操作
      const allowedOperators = ['===', '!==', '==', '!=', '>', '<', '>=', '<=', '&&', '||', '!'];
      const hasUnsafeContent = /eval|function|new|delete|typeof|void|in|instanceof/.test(
        expression
      );

      if (hasUnsafeContent) {
        this.logger.warn('条件表达式包含不安全的内容', { condition });
        return false;
      }

      // 使用Function构造函数而不是eval，相对更安全
      const func = new Function('return ' + expression);
      return Boolean(func());
    } catch (error) {
      this.logger.warn('条件表达式解析失败', { condition, error });
      return false;
    }
  }

  /**
   * 获取执行器支持的边类型
   * @returns 支持的边类型列表
   */
  getSupportedEdgeTypes(): string[] {
    // 从函数注册表获取所有已注册的路由函数类型
    const allFunctions = this.functionRegistry.getAllFunctions();
    const routingFunctions = allFunctions.filter(
      func => func.id.startsWith('route:') || func.name.includes('routing')
    );

    return routingFunctions.map(func => func.id);
  }
}
