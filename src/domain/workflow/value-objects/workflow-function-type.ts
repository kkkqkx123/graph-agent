/**
 * 工作流函数类型枚举
 * 定义工作流中所有函数的类型
 */
export enum WorkflowFunctionType {
  NODE = 'node',           // 节点函数：执行具体业务逻辑
  CONDITION = 'condition', // 条件函数：判断条件是否满足
  ROUTING = 'routing',     // 路由函数：决定执行路径
  TRIGGER = 'trigger',     // 触发器函数：触发特定事件
  HOOK = 'hook',           // 钩子函数：在特定时机执行的回调
  CONTEXT_PROCESSOR = 'context_processor', // 上下文处理器函数：处理上下文变量
  TRANSFORM = 'transform'  // 转换函数：数据转换（预留）
}