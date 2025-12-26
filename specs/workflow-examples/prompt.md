/spec 
当前src\domain\workflow\entities目录和src\infrastructure\workflow目录中，图工作流的主要组件：节点、边、触发器等都没有独立的实体定义，仅在src\domain\workflow\entities\workflow.ts给出了数据接口定义。我目前计划为这些组件创建单独的实体定义，将内部逻辑通过src\infrastructure\workflow\functions目录中的函数来实现，让这些组件以函数式编程的形式实现具体逻辑。现在我打算编写一个简单的、硬编码工作流的示例，请给出设计文档。

之前对完整工作流的规划位于 @/specs/graph-workflow-implementation/requirements.md  @/specs/graph-workflow-implementation/design.md 

示例实现可以适当简化，不需要引入外部配置，不需要分层，仅演示这种图工作流架构