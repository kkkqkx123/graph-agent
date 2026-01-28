from typing import TypedDict, List, Literal
from langgraph.graph import StateGraph, END
from operator import itemgetter
 
# 1. 定义我们自己的“世界状态”
class AgentWorldState(TypedDict):
    task: str
    messages: List[tuple[str, str]] 
    next_agent: Literal["Researcher", "Writer", "FINISH"]
 
# 2. 定义Agent节点，展示它如何与“世界状态”交互
def researcher_agent_node(state: AgentWorldState):
    task = state['task']
    print(f"--- [Agent: 研究员] 开始工作，任务: {task} ---")
    research_result = f"这是关于'{task}'的研究成果。"
    # 注意：这里返回的是一个包含元组的列表，以支持状态的累加
    return {"messages": [("Researcher", research_result)]}
 
def writer_agent_node(state: AgentWorldState):
    messages = state['messages']
    print(f"--- [Agent: 作家] 开始工作 ---")
    writing_result = f"基于以下研究成果：\n{messages[-1][1]}\n\n我完成了最终报告。"
    return {"messages": [("Writer", writing_result)]}
 
# 3. 定义我们的核心“调度器”节点
def dispatcher_node(state: AgentWorldState):
    last_message_sender = state['messages'][-1][0] if state['messages'] else "START"
    
    if last_message_sender == "Researcher":
        return {"next_agent": "Writer"}
    elif last_message_sender == "Writer":
        return {"next_agent": "FINISH"}
    else: # START
        return {"next_agent": "Researcher"}
 
# 4. 在LangGraph中组装
workflow = StateGraph(AgentWorldState)
workflow.add_node("researcher", researcher_agent_node)
workflow.add_node("writer", writer_agent_node)
workflow.add_node("dispatcher", dispatcher_node) 
 
workflow.set_entry_point("dispatcher")
 
workflow.add_conditional_edges(
    "dispatcher",
    itemgetter('next_agent'),
    {
        "Researcher": "researcher",
        "Writer": "writer",
        "FINISH": END
    }
)
 
workflow.add_edge("researcher", "dispatcher")
workflow.add_edge("writer", "dispatcher")
 
# 编译
app = workflow.compile()
 
# 运行
inputs = {"task": "AI在软件开发中的作用", "messages": []}
for s in app.stream(inputs, {"recursion_limit": 10}):
    print(s)
    print("----")
