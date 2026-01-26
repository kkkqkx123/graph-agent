# Conversation实例管理机制设计

## 设计原则
- Conversation实例与Thread生命周期绑定
- Thread执行器持有并管理Conversation实例
- Fork/Copy操作需要深拷贝Conversation确保独立性
- 提供统一的Conversation访问接口

## 核心职责

### 1. Conversation创建与初始化
ThreadBuilder负责在Thread创建时初始化Conversation：
- 接收LLMWrapper和ToolService实例
- 配置tokenLimit和事件回调
- 将Conversation存储到Thread.contextData['conversation']

### 2. Conversation持有策略
ThreadExecutor持有Conversation实例：
- 通过getConversation(thread)方法从Thread.contextData获取
- 在Thread执行期间保持Conversation引用
- 提供统一的Conversation访问接口给节点执行器

### 3. Fork/Copy操作的Conversation处理

**Fork操作：**
- 父Thread的Conversation保持不变
- 每个子Thread获得独立的Conversation副本
- 深拷贝Conversation的消息历史和配置
- 子Thread的Conversation从父Thread当前状态开始

**Copy操作：**
- 完整复制源Thread的Conversation
- 深拷贝所有消息和状态
- 新Thread拥有完全独立的Conversation实例

**Join操作：**
- 不合并子Thread的Conversation
- 父Thread继续使用自己的Conversation
- 子Thread的Conversation在Join后可以被清理

### 4. Conversation生命周期

**创建阶段：**
- ThreadBuilder在build()时创建Conversation
- 配置LLM和Tool服务
- 设置token限制和回调

**执行阶段：**
- ThreadExecutor持有并使用Conversation
- 节点执行器通过ThreadExecutor访问Conversation
- 消息累积和token管理

**结束阶段：**
- Thread完成后Conversation可选保留或清理
- 支持序列化Conversation状态用于恢复
- 提供清理接口释放资源

## 与ThreadExecutor协作

ThreadExecutor提供Conversation管理接口：
- `getConversation(thread)`: 获取Thread的Conversation实例
- `setConversation(thread, conversation)`: 设置Conversation
- `cloneConversation(sourceThread, targetThread)`: 深拷贝Conversation

节点执行器通过ThreadExecutor访问Conversation，不直接操作Thread.contextData。

## 资源管理

- Conversation实例存储在Thread.contextData中，随Thread序列化
- Thread执行时，ThreadExecutor持有Conversation引用提高效率
- Fork/Copy时执行深拷贝，避免状态共享
- Thread完成后，Conversation可选择性清理以释放内存