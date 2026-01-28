/**
 * StateGraph 示例
 * 展示如何使用新的StateGraph API实现类似LangGraph的功能
 */

import { SDK } from '../sdk/api';
import { StateGraph, END } from '../sdk/api/langgraph-compatible/stategraph-api';

// 1. 定义我们自己的"世界状态"
interface AgentWorldState {
  task: string;
  messages: [string, string][];  // [sender, message]
  nextAgent: 'Researcher' | 'Writer' | 'FINISH';
}

// 2. 定义Agent节点，展示它如何与"世界状态"交互
function researcherAgentNode(state: AgentWorldState): Partial<AgentWorldState> {
  const { task } = state;
  console.log(`--- [Agent: 研究员] 开始工作，任务: ${task} ---`);
  const researchResult = `这是关于'${task}'的研究成果。`;
  return {
    messages: [...state.messages, ['Researcher', researchResult]] as [string, string][],
    nextAgent: 'Writer' as const
  };
}

function writerAgentNode(state: AgentWorldState): Partial<AgentWorldState> {
  const { messages } = state;
  console.log(`--- [Agent: 作家] 开始工作 ---`);
  const lastMessage = messages[messages.length - 1][1];
  const writingResult = `基于以下研究成果：\n${lastMessage}\n\n我完成了最终报告。`;
  return {
    messages: [...state.messages, ['Writer', writingResult]] as [string, string][],
    nextAgent: 'FINISH' as const
  };
}

// 3. 定义我们的核心"调度器"节点
function dispatcherNode(state: AgentWorldState): Partial<AgentWorldState> {
  const lastMessageSender = state.messages.length > 0 ?
    state.messages[state.messages.length - 1][0] : 'START';

  if (lastMessageSender === 'Researcher') {
    return { nextAgent: 'Writer' };
  } else if (lastMessageSender === 'Writer') {
    return { nextAgent: 'FINISH' };
  } else { // START
    return { nextAgent: 'Researcher' };
  }
}

async function runExample() {
  console.log('=== StateGraph 示例 ===');

  // 创建SDK实例
  const sdk = new SDK();

  // 4. 使用StateGraph组装工作流
  const workflow = new StateGraph<AgentWorldState>({} as AgentWorldState);
  workflow.add_node("researcher", researcherAgentNode);
  workflow.add_node("writer", writerAgentNode);
  workflow.add_node("dispatcher", dispatcherNode);

  workflow.set_entry_point("dispatcher");

  workflow.add_conditional_edges(
    "dispatcher",
    (state: AgentWorldState) => state.nextAgent,
    {
      "Researcher": "researcher",
      "Writer": "writer",
      "FINISH": END
    }
  );

  workflow.add_edge("researcher", "dispatcher");
  workflow.add_edge("writer", "dispatcher");

  // 编译
  const app = workflow.compile(sdk);

  // 运行
  const inputs = {
    task: "AI在软件开发中的作用",
    messages: [],
    nextAgent: "Researcher" as const
  };

  console.log('输入:', inputs);
  console.log('--- 开始执行 ---');

  try {
    // 执行工作流
    const result = await app.invoke(inputs);
    console.log('执行结果:', result);

    // 也可以使用流式执行
    console.log('\n--- 流式执行 ---');
    for await (const chunk of app.stream(inputs)) {
      console.log('流式块:', chunk);
    }
  } catch (error) {
    console.error('执行错误:', error);
  }
}

// 运行示例
runExample().catch(console.error);

export { AgentWorldState, researcherAgentNode, writerAgentNode, dispatcherNode };