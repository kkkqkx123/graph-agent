import { injectable } from 'inversify';

/**
 * 表达式评估器
 * 支持变量引用、布尔表达式和函数调用
 */
@injectable()
export class ExpressionEvaluator {
  /**
   * 评估表达式
   * @param expression 表达式字符串
   * @param context 执行上下文
   * @returns 评估结果
   */
  static evaluate(expression: string, context: any): any {
    // 1. 处理变量引用: ${variable_name}
    if (expression.startsWith('${') && expression.endsWith('}')) {
      const variablePath = expression.slice(2, -1).trim();
      return this.getVariableValue(variablePath, context);
    }

    // 2. 处理布尔表达式: ${iteration >= 10}
    if (expression.includes('${') && expression.includes('}')) {
      return this.evaluateBooleanExpression(expression, context);
    }

    // 3. 处理函数调用: ${has_tool_calls()}
    if (expression.includes('()')) {
      return this.evaluateFunctionCall(expression, context);
    }

    // 4. 处理直接值
    return this.evaluateDirectValue(expression, context);
  }

  /**
   * 获取变量值
   * @param path 变量路径，支持嵌套访问如 "user.profile.name"
   * @param context 执行上下文
   * @returns 变量值
   */
  private static getVariableValue(path: string, context: any): any {
    // 如果context是函数，调用它获取变量值
    if (typeof context === 'function') {
      return context(path);
    }

    const parts = path.split('.');
    let value = context;

    for (const part of parts) {
      if (value === null || value === undefined) {
        return undefined;
      }

      // 处理数组索引，如 "messages[0].content"
      const arrayMatch = part.match(/^(\w+)\[(\d+)\]$/);
      if (arrayMatch) {
        const [, arrayName, indexStr] = arrayMatch;
        value = value[arrayName as keyof typeof value];
        if (Array.isArray(value)) {
          const index = parseInt(indexStr!, 10);
          value = value[index];
        } else {
          return undefined;
        }
      } else {
        value = value[part as keyof typeof value];
      }
    }

    return value;
  }

  /**
   * 评估布尔表达式
   * @param expression 布尔表达式
   * @param context 执行上下文
   * @returns 布尔值
   */
  private static evaluateBooleanExpression(expression: string, context: any): boolean {
    // 简单的布尔表达式解析，支持基本的比较操作
    // 例如: ${iteration >= 10}, ${has_errors == true}

    // 提取变量部分和操作符部分
    const variableMatch = expression.match(/\$\{([^}]+)\}/);
    if (!variableMatch) {
      return false;
    }

    const variableExpression = variableMatch[1];
    if (!variableExpression) {
      return false;
    }
    const operatorMatch = variableExpression.match(/(.+)\s*(>=|<=|==|!=|>|<)\s*(.+)/);
    
    if (operatorMatch) {
      const [, leftOperand, operator, rightOperand] = operatorMatch;
      if (leftOperand && operator && rightOperand) {
        const leftValue = this.getVariableValue(leftOperand.trim(), context);
        const rightValue = this.evaluateDirectValue(rightOperand.trim(), context);
        return this.compareValues(leftValue, operator, rightValue);
      }
    }

    // 如果没有操作符，直接返回变量的布尔值
    const value = this.getVariableValue(variableExpression!, context);
    return Boolean(value);
  }

  /**
   * 评估函数调用
   * @param expression 函数调用表达式
   * @param context 执行上下文
   * @returns 函数调用结果
   */
  private static evaluateFunctionCall(expression: string, context: any): any {
    // 简单的函数调用解析
    // 例如: ${has_tool_calls()}, ${count_errors()}

    const functionMatch = expression.match(/\$\{(\w+)\(\)\}/);
    if (!functionMatch) {
      return false;
    }

    const functionName = functionMatch[1];
    if (!functionName) {
      return false;
    }

    // 内置函数映射
    const builtInFunctions: Record<string, (context: any) => any> = {
      'has_tool_calls': (ctx) => this.hasToolCalls(ctx),
      'has_tool_results': (ctx) => this.hasToolResults(ctx),
      'has_errors': (ctx) => this.hasErrors(ctx),
      'max_iterations_reached': (ctx) => this.maxIterationsReached(ctx),
      'no_tool_calls': (ctx) => this.noToolCalls(ctx),
      'count_errors': (ctx) => this.countErrors(ctx),
      'count_tool_calls': (ctx) => this.countToolCalls(ctx)
    };

    const func = builtInFunctions[functionName];
    if (func) {
      return func(context);
    }

    // 如果不是内置函数，尝试从上下文中获取
    if (typeof context[functionName as keyof typeof context] === 'function') {
      return context[functionName as keyof typeof context](context);
    }

    return false;
  }

  /**
   * 评估直接值
   * @param value 值字符串
   * @param context 执行上下文
   * @returns 评估后的值
   */
  private static evaluateDirectValue(value: string, context: any): any {
    // 处理字符串值
    if (value.startsWith('"') && value.endsWith('"')) {
      return value.slice(1, -1);
    }

    // 处理数字值
    if (/^\d+$/.test(value)) {
      return parseInt(value, 10);
    }

    if (/^\d+\.\d+$/.test(value)) {
      return parseFloat(value);
    }

    // 处理布尔值
    if (value === 'true') return true;
    if (value === 'false') return false;

    // 处理null和undefined
    if (value === 'null') return null;
    if (value === 'undefined') return undefined;

    // 默认作为字符串处理
    return value;
  }

  /**
   * 比较两个值
   * @param leftValue 左值
   * @param operator 操作符
   * @param rightValue 右值
   * @returns 比较结果
   */
  private static compareValues(leftValue: any, operator: string, rightValue: any): boolean {
    switch (operator) {
      case '==':
        return leftValue == rightValue;
      case '!=':
        return leftValue != rightValue;
      case '>=':
        return leftValue >= rightValue;
      case '<=':
        return leftValue <= rightValue;
      case '>':
        return leftValue > rightValue;
      case '<':
        return leftValue < rightValue;
      default:
        return false;
    }
  }

  // 内置条件函数
  private static hasToolCalls(context: any): boolean {
    const messages = context.getVariable('messages') || [];
    for (const message of messages) {
      if (message.tool_calls && message.tool_calls.length > 0) {
        return true;
      }
    }
    return false;
  }

  private static hasToolResults(context: any): boolean {
    const messages = context.getVariable('messages') || [];
    for (const message of messages) {
      if (message.role === 'tool' && message.content) {
        return true;
      }
    }
    return false;
  }

  private static hasErrors(context: any): boolean {
    // 检查工具结果中的错误
    const toolResults = context.getVariable('tool_results') || [];
    for (const result of toolResults) {
      if (result.success === false) {
        return true;
      }
    }

    // 检查消息中的错误
    const messages = context.getVariable('messages') || [];
    for (const message of messages) {
      if (message.type === 'error') {
        return true;
      }
    }

    return false;
  }

  private static maxIterationsReached(context: any): boolean {
    const maxIterations = context.getVariable('maxIterations') || 10;
    const currentIteration = context.getVariable('iteration') || 0;
    return currentIteration >= maxIterations;
  }

  private static noToolCalls(context: any): boolean {
    return !this.hasToolCalls(context);
  }

  private static countErrors(context: any): number {
    let count = 0;

    // 计算工具结果中的错误
    const toolResults = context.getVariable('tool_results') || [];
    for (const result of toolResults) {
      if (result.success === false) {
        count++;
      }
    }

    // 计算消息中的错误
    const messages = context.getVariable('messages') || [];
    for (const message of messages) {
      if (message.type === 'error') {
        count++;
      }
    }

    return count;
  }

  private static countToolCalls(context: any): number {
    const messages = context.getVariable('messages') || [];
    let count = 0;
    
    for (const message of messages) {
      if (message.tool_calls && message.tool_calls.length > 0) {
        count += message.tool_calls.length;
      }
    }
    
    return count;
  }
}