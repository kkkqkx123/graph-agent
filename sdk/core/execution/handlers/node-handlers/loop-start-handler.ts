/**
 * LoopStart节点处理函数
 * 负责执行LOOP_START节点，初始化循环变量，设置循环条件
 */

import type { Node, LoopStartNodeConfig } from '@modular-agent/types/node';
import type { Thread } from '@modular-agent/types/thread';
import { ExecutionError, ValidationError, RuntimeValidationError } from '@modular-agent/types/errors';
import { now } from '@modular-agent/common-utils';

/**
 * 循环状态
 */
interface LoopState {
  loopId: string;
  iterable: any | null;  // 可以为 null（计数循环时）
  currentIndex: number;
  maxIterations: number;
  iterationCount: number;
  variableName: string | null;  // 可以为 null（计数循环时）
}

/**
 * 检查节点是否可以执行
 */
function canExecute(thread: Thread, node: Node): boolean {
  if (thread.status !== 'RUNNING') {
    return false;
  }

  const config = node.config as LoopStartNodeConfig;
  const loopState = getLoopState(thread, config.loopId);

  // 如果循环状态不存在，可以执行（第一次执行）
  if (!loopState) {
    return true;
  }

  // 如果循环状态存在，总是允许执行
  // 循环是否继续在handler内部判断
  return true;
}

/**
 * 验证iterable是否有效
 */
function isValidIterable(iterable: any): boolean {
  return (
    Array.isArray(iterable) ||
    (typeof iterable === 'object' && iterable !== null) ||
    typeof iterable === 'number' ||
    typeof iterable === 'string'
  );
}

/**
 * 解析iterable：支持直接值或变量表达式
 * 
 * 支持的格式：
 * - 直接值：[1,2,3], {a:1}, 5, "hello"
 * - 变量表达式：{{input.list}}, {{thread.items}}, {{global.data}}
 */
function resolveIterable(iterableConfig: any, thread: Thread): any {
  // 如果没有提供 iterable 配置，返回 null（计数循环模式）
  if (iterableConfig === undefined || iterableConfig === null) {
    return null;
  }

  // 如果是字符串，检查是否为变量表达式
  if (typeof iterableConfig === 'string') {
    const varExprPattern = /^\{\{([\w.]+)\}\}$/;
    const match = iterableConfig.match(varExprPattern);

    if (match && match[1]) {
      // 这是一个变量表达式，需要从thread中解析
      const varPath = match[1];
      const parts = varPath.split('.');
      const scope = parts[0];

      try {
        let value: any;

        // 根据作用域获取变量
        switch (scope) {
          case 'input':
            value = thread.input;
            // 解析嵌套路径
            for (let i = 1; i < parts.length; i++) {
              value = value?.[parts[i]!];
            }
            break;

          case 'output':
            value = thread.output;
            for (let i = 1; i < parts.length; i++) {
              value = value?.[parts[i]!];
            }
            break;

          case 'global':
            value = thread.variableScopes.global;
            for (let i = 1; i < parts.length; i++) {
              value = value?.[parts[i]!];
            }
            break;

          case 'thread':
            value = thread.variableScopes.thread;
            for (let i = 1; i < parts.length; i++) {
              value = value?.[parts[i]!];
            }
            break;

          default:
            throw new RuntimeValidationError(
              `Invalid variable scope '${scope}'. Supported scopes: input, output, global, thread`,
              {
                operation: 'handle',
                field: 'loop.scope',
                value: scope
              }
            );
        }

        if (value === undefined) {
          throw new ExecutionError(
            `Variable '${varPath}' not found in thread context`,
            thread.currentNodeId,
            thread.workflowId,
            { varPath, iterableConfig }
          );
        }

        return value;
      } catch (error) {
        if (error instanceof ExecutionError || error instanceof ValidationError) {
          throw error;
        }
        throw new ExecutionError(
          `Failed to resolve iterable expression '${iterableConfig}': ${error instanceof Error ? error.message : String(error)}`,
          thread.currentNodeId,
          thread.workflowId,
          { iterableConfig }
        );
      }
    }
  }

  // 直接值，验证类型
  if (!isValidIterable(iterableConfig)) {
    throw new RuntimeValidationError(
      `Iterable must be an array, object, number, string, or variable expression like {{input.list}}. Got: ${typeof iterableConfig}`,
      {
        operation: 'handle',
        field: 'loop.iterable',
        value: iterableConfig
      }
    );
  }

  return iterableConfig;
}

/**
 * 获取循环状态
 */
function getLoopState(thread: Thread, loopId: string): LoopState | undefined {
  const currentLoopScope = thread.variableScopes.loop[thread.variableScopes.loop.length - 1];
  if (currentLoopScope) {
    return currentLoopScope[`__loop_state`];
  }
  return undefined;
}

/**
 * 设置循环状态到循环作用域
 */
function setLoopState(thread: Thread, loopState: LoopState): void {
  const currentLoopScope = thread.variableScopes.loop[thread.variableScopes.loop.length - 1];
  if (currentLoopScope) {
    currentLoopScope[`__loop_state`] = loopState;
  }
}

/**
 * 清除循环状态（仅删除状态对象，作用域由退出时删除）
 */
function clearLoopState(thread: Thread, loopId: string): void {
  const currentLoopScope = thread.variableScopes.loop[thread.variableScopes.loop.length - 1];
  if (currentLoopScope) {
    delete currentLoopScope[`__loop_state`];
  }
}



/**
 * 检查循环条件
 */
function checkLoopCondition(loopState: LoopState): boolean {
  // 检查maxIterations是否有效（必须为正数）
  if (loopState.maxIterations <= 0) {
    return false;
  }

  // 检查迭代次数
  if (loopState.iterationCount >= loopState.maxIterations) {
    return false;
  }

  // 如果提供了 iterable，还需要检查当前索引是否超出范围
  if (loopState.iterable !== null && loopState.iterable !== undefined) {
    const iterableLength = getIterableLength(loopState.iterable);
    if (loopState.currentIndex >= iterableLength) {
      return false;
    }
  }

  return true;
}

/**
 * 获取iterable的长度
 */
function getIterableLength(iterable: any): number {
  if (Array.isArray(iterable)) {
    return iterable.length;
  } else if (typeof iterable === 'object' && iterable !== null) {
    return Object.keys(iterable).length;
  } else if (typeof iterable === 'number') {
    return iterable;
  } else if (typeof iterable === 'string') {
    return iterable.length;
  }
  return 0;
}

/**
 * 获取当前迭代值
 */
function getCurrentValue(loopState: LoopState): any {
  const { iterable, currentIndex } = loopState;

  // 如果没有 iterable（计数循环），返回当前索引
  if (iterable === null || iterable === undefined) {
    return currentIndex;
  }

  if (Array.isArray(iterable)) {
    return iterable[currentIndex];
  } else if (typeof iterable === 'object' && iterable !== null) {
    const keys = Object.keys(iterable);
    const key = keys[currentIndex];
    if (key !== undefined) {
      return { key, value: iterable[key] };
    }
    return undefined;
  } else if (typeof iterable === 'number') {
    return currentIndex;
  } else if (typeof iterable === 'string') {
    return iterable[currentIndex];
  }

  return undefined;
}

/**
 * 设置循环变量到循环作用域
 */
function setLoopVariable(thread: Thread, variableName: string, value: any): void {
  // 循环作用域应该在 loopStartHandler 中通过 enterLoopScope() 创建
  const currentLoopScope = thread.variableScopes.loop[thread.variableScopes.loop.length - 1];
  if (currentLoopScope) {
    currentLoopScope[variableName] = value;
  }
}

/**
 * 更新循环状态
 */
function updateLoopState(loopState: LoopState): void {
  loopState.iterationCount++;
  loopState.currentIndex++;
}

/**
 * LoopStart节点处理函数
 * @param thread Thread实例
 * @param node 节点定义
 * @param context 处理器上下文（可选）
 * @returns 执行结果
 */
export async function loopStartHandler(thread: Thread, node: Node, context?: any): Promise<any> {
  // 检查是否可以执行
  if (!canExecute(thread, node)) {
    return {
      nodeId: node.id,
      nodeType: node.type,
      status: 'SKIPPED',
      step: thread.nodeResults.length + 1,
      executionTime: 0
    };
  }

  const config = node.config as LoopStartNodeConfig;

  // 获取或初始化循环状态
  let loopState = getLoopState(thread, config.loopId);

  if (!loopState) {
    // 第一次执行，解析并初始化循环状态
    let resolvedIterable: any = null;
    let variableName: string | null = null;

    // 如果提供了 dataSource，则解析 iterable 和 variableName
    if (config.dataSource) {
      // 解析 iterable（支持直接值或变量表达式）
      resolvedIterable = resolveIterable(config.dataSource.iterable, thread);
      variableName = config.dataSource.variableName;
    }

    // 创建包含已解析 iterable 的循环状态
    loopState = {
      loopId: config.loopId,
      iterable: resolvedIterable,
      currentIndex: 0,
      maxIterations: config.maxIterations,
      iterationCount: 0,
      variableName: variableName
    };

    setLoopState(thread, loopState);

    // 进入新的循环作用域
    if (!thread.variableScopes) {
      thread.variableScopes = {
        global: {},
        thread: {},
        local: [],
        loop: []
      };
    }

    // 创建新的循环作用域并初始化该作用域的变量
    const newLoopScope: Record<string, any> = {};
    for (const variable of thread.variables) {
      if (variable.scope === 'loop') {
        newLoopScope[variable.name] = variable.value;
      }
    }
    thread.variableScopes.loop.push(newLoopScope);
  }

  // 检查循环条件
  const shouldContinue = checkLoopCondition(loopState);

  if (!shouldContinue) {
    // 循环结束，清理循环状态
    clearLoopState(thread, config.loopId);

    // 退出循环作用域
    if (thread.variableScopes && thread.variableScopes.loop.length > 0) {
      thread.variableScopes.loop.pop();
    }

    return {
      loopId: config.loopId,
      shouldContinue: false,
      iterationCount: loopState.iterationCount,
      message: 'Loop completed'
    };
  }

  // 获取当前迭代值
  const currentValue = getCurrentValue(loopState);

  // 设置循环变量到循环作用域（仅在数据驱动循环时）
  // 注意：如果提供了dataSource，variableName是必须的
  if (loopState.variableName !== null) {
    setLoopVariable(thread, loopState.variableName, currentValue);
  }

  // 更新循环状态
  updateLoopState(loopState);

  // 保存更新后的循环状态到作用域
  setLoopState(thread, loopState);

  // 记录执行历史
  thread.nodeResults.push({
    step: thread.nodeResults.length + 1,
    nodeId: node.id,
    nodeType: node.type,
    status: 'COMPLETED',
    timestamp: now(),
  });

  // 返回执行结果
  return {
    loopId: config.loopId,
    variableName: loopState.variableName,
    currentValue,
    iterationCount: loopState.iterationCount,
    shouldContinue: true
  };
}