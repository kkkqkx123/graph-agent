/**
 * 智能文本分析工作流示例
 * 
 * 本文件演示如何使用图工作流框架构建一个完整的文本分析工作流
 * 工作流流程：
 * 1. 输入文本
 * 2. LLM分类（新闻/评论/问答）
 * 3. 根据分类结果走不同分支
 * 4. 提取关键信息
 * 5. 数据转换
 * 6. 输出结果
 */

import {
  createWorkflowGraph,
  createWorkflowEngine,
  ExecutionStrategy
} from '../engine/workflow-engine';

import {
  createStartNode,
  createLLMNode,
  createConditionNode,
  createTransformNode,
  createEndNode
} from '../entities/node';

import {
  createDirectEdge,
  createConditionalEdge
} from '../entities/edge';

import {
  createTimeoutTrigger,
  createErrorTrigger
} from '../entities/trigger';

import {
  ConditionOperator
} from '../types/workflow-types';

/**
 * 创建智能文本分析工作流
 * 
 * @returns 工作流图实例
 */
export function createTextAnalysisWorkflow() {
  // 创建工作流图
  const workflow = createWorkflowGraph('text-analysis-workflow');

  // ============================================================================
  // 创建节点
  // ============================================================================

  // 1. 开始节点 - 接收输入文本
  const inputNode = createStartNode(
    'InputNode',
    '输入节点',
    {},
    '接收用户输入的文本'
  );

  // 2. LLM分类节点 - 使用LLM对文本进行分类
  const classifyNode = createLLMNode(
    'ClassifyNode',
    'LLM分类节点',
    {
      prompt: '请判断以下文本的类型：新闻、评论、问答。只返回类型名称（news/review/qa）。文本：{{input.text}}',
      model: 'gpt-3.5-turbo',
      temperature: 0.3,
      maxTokens: 50
    },
    '使用LLM对输入文本进行分类'
  );

  // 3. 条件判断节点 - 判断是否为新闻
  const isNewsNode = createConditionNode(
    'IsNewsNode',
    '是否为新闻',
    {
      condition: '{{ClassifyNode.data.response}} == "news"',
      data: {
        classification: '{{ClassifyNode.data.response}}'
      }
    },
    '判断分类结果是否为新闻'
  );

  // 4. 条件判断节点 - 判断是否为评论
  const isReviewNode = createConditionNode(
    'IsReviewNode',
    '是否为评论',
    {
      condition: '{{ClassifyNode.data.response}} == "review"',
      data: {
        classification: '{{ClassifyNode.data.response}}'
      }
    },
    '判断分类结果是否为评论'
  );

  // 5. 条件判断节点 - 判断是否为问答
  const isQANode = createConditionNode(
    'IsQANode',
    '是否为问答',
    {
      condition: '{{ClassifyNode.data.response}} == "qa"',
      data: {
        classification: '{{ClassifyNode.data.response}}'
      }
    },
    '判断分类结果是否为问答'
  );

  // 6. 新闻信息提取节点 - 提取新闻关键信息
  const extractNewsNode = createLLMNode(
    'ExtractNewsNode',
    '新闻信息提取',
    {
      prompt: '从以下新闻文本中提取标题、时间、地点，以JSON格式返回：{"title": "...", "time": "...", "location": "..."}。文本：{{input.text}}',
      model: 'gpt-3.5-turbo',
      temperature: 0.5,
      maxTokens: 200
    },
    '提取新闻的关键信息'
  );

  // 7. 情感分析节点 - 分析评论情感
  const sentimentNode = createLLMNode(
    'SentimentNode',
    '情感分析',
    {
      prompt: '分析以下评论的情感（positive/negative/neutral），只返回情感类型。文本：{{input.text}}',
      model: 'gpt-3.5-turbo',
      temperature: 0.3,
      maxTokens: 50
    },
    '分析评论的情感倾向'
  );

  // 8. 问答提取节点 - 提取问答内容
  const extractQANode = createLLMNode(
    'ExtractQANode',
    '问答提取',
    {
      prompt: '从以下文本中提取问题和答案，以JSON格式返回：{"question": "...", "answer": "..."}。文本：{{input.text}}',
      model: 'gpt-3.5-turbo',
      temperature: 0.5,
      maxTokens: 200
    },
    '提取问答内容'
  );

  // 9. 数据转换节点 - 统一输出格式
  const transformNode = createTransformNode(
    'TransformNode',
    '数据转换',
    {
      transformRules: {
        type: '{{ClassifyNode.data.response}}',
        result: '{{node.result}}',
        timestamp: '{{workflow.startTime}}',
        originalText: '{{input.text}}'
      }
    },
    '将不同分支的结果转换为统一格式'
  );

  // 10. 结束节点 - 返回最终结果
  const outputNode = createEndNode(
    'OutputNode',
    '输出节点',
    {},
    '返回工作流执行结果'
  );

  // 添加所有节点到工作流
  workflow.addNode(inputNode);
  workflow.addNode(classifyNode);
  workflow.addNode(isNewsNode);
  workflow.addNode(isReviewNode);
  workflow.addNode(isQANode);
  workflow.addNode(extractNewsNode);
  workflow.addNode(sentimentNode);
  workflow.addNode(extractQANode);
  workflow.addNode(transformNode);
  workflow.addNode(outputNode);

  // ============================================================================
  // 创建边
  // ============================================================================

  // 输入节点 -> 分类节点
  workflow.addEdge(createDirectEdge('edge_input_classify', 'InputNode', 'ClassifyNode', 1));

  // 分类节点 -> 条件判断节点
  workflow.addEdge(createDirectEdge('edge_classify_isnews', 'ClassifyNode', 'IsNewsNode', 1));
  workflow.addEdge(createDirectEdge('edge_classify_isreview', 'ClassifyNode', 'IsReviewNode', 1));
  workflow.addEdge(createDirectEdge('edge_classify_isqa', 'ClassifyNode', 'IsQANode', 1));

  // 条件判断节点 -> 提取节点（条件边）
  workflow.addEdge(createConditionalEdge(
    'edge_isnews_extract',
    'IsNewsNode',
    'ExtractNewsNode',
    {
      expression: '{{IsNewsNode.data.result}} == true',
      operator: ConditionOperator.EQUALS,
      expectedValue: true
    },
    1
  ));

  workflow.addEdge(createConditionalEdge(
    'edge_isreview_sentiment',
    'IsReviewNode',
    'SentimentNode',
    {
      expression: '{{IsReviewNode.data.result}} == true',
      operator: ConditionOperator.EQUALS,
      expectedValue: true
    },
    1
  ));

  workflow.addEdge(createConditionalEdge(
    'edge_isqa_extractqa',
    'IsQANode',
    'ExtractQANode',
    {
      expression: '{{IsQANode.data.result}} == true',
      operator: ConditionOperator.EQUALS,
      expectedValue: true
    },
    1
  ));

  // 提取节点 -> 转换节点
  workflow.addEdge(createDirectEdge('edge_extractnews_transform', 'ExtractNewsNode', 'TransformNode', 1));
  workflow.addEdge(createDirectEdge('edge_sentiment_transform', 'SentimentNode', 'TransformNode', 1));
  workflow.addEdge(createDirectEdge('edge_extractqa_transform', 'ExtractQANode', 'TransformNode', 1));

  // 转换节点 -> 输出节点
  workflow.addEdge(createDirectEdge('edge_transform_output', 'TransformNode', 'OutputNode', 1));

  // ============================================================================
  // 创建触发器
  // ============================================================================

  // 超时触发器 - 防止LLM调用超时
  const timeoutTrigger = createTimeoutTrigger(
    'timeout_trigger',
    30000, // 30秒超时
    'ClassifyNode'
  );
  workflow.addTrigger(timeoutTrigger);

  // 错误触发器 - 捕获分类节点错误
  const errorTrigger = createErrorTrigger(
    'error_trigger',
    'ClassifyNode'
  );
  workflow.addTrigger(errorTrigger);

  return workflow;
}

/**
 * 运行文本分析工作流示例
 * 
 * @param inputText 输入文本
 * @param strategy 执行策略
 */
export async function runTextAnalysisWorkflow(
  inputText: string,
  strategy: ExecutionStrategy = ExecutionStrategy.SEQUENTIAL
) {
  console.log('========================================');
  console.log('智能文本分析工作流示例');
  console.log('========================================');
  console.log(`输入文本: ${inputText}`);
  console.log(`执行策略: ${strategy}`);
  console.log('========================================\n');

  // 创建工作流
  const workflow = createTextAnalysisWorkflow();

  // 创建执行引擎
  const engine = createWorkflowEngine(strategy);

  // 执行工作流
  const result = await engine.execute(workflow, { text: inputText });

  // 输出结果
  console.log('\n========================================');
  console.log('执行结果');
  console.log('========================================');
  console.log(`成功: ${result.success}`);
  console.log(`执行时间: ${result.metadata?.executionTime}ms`);
  console.log(`执行节点数: ${result.metadata?.executedNodes.length}`);
  console.log(`跳过节点数: ${result.metadata?.skippedNodes.length}`);
  console.log(`失败节点数: ${result.metadata?.failedNodes.length}`);

  if (result.success && result.data) {
    console.log('\n最终结果:');
    console.log(JSON.stringify(result.data, null, 2));
  }

  if (result.error) {
    console.log(`\n错误: ${result.error}`);
  }

  console.log('\n执行历史:');
  const history = engine.getExecutionHistory();
  for (const record of history) {
    console.log(`  - ${record.nodeId}: ${record.status} (${record.endTime! - record.startTime}ms)`);
  }

  console.log('========================================\n');

  return result;
}

/**
 * 示例1：新闻文本分析
 */
export async function example1_NewsAnalysis() {
  const newsText = '北京时间2024年1月1日，新年庆祝活动在北京天安门广场举行。数万名市民聚集在一起，共同迎接新年的到来。';
  return runTextAnalysisWorkflow(newsText, ExecutionStrategy.SEQUENTIAL);
}

/**
 * 示例2：评论情感分析
 */
export async function example2_ReviewAnalysis() {
  const reviewText = '这个产品真的太棒了！质量很好，物流也很快，非常满意！';
  return runTextAnalysisWorkflow(reviewText, ExecutionStrategy.SEQUENTIAL);
}

/**
 * 示例3：问答提取
 */
export async function example3_QAExtraction() {
  const qaText = '问：什么是人工智能？答：人工智能是计算机科学的一个分支，致力于创建能够执行通常需要人类智能的任务的系统。';
  return runTextAnalysisWorkflow(qaText, ExecutionStrategy.SEQUENTIAL);
}

/**
 * 运行所有示例
 */
export async function runAllExamples() {
  console.log('\n\n');
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║           智能文本分析工作流 - 完整示例演示                ║');
  console.log('╚════════════════════════════════════════════════════════════╝');

  await example1_NewsAnalysis();
  await new Promise(resolve => setTimeout(resolve, 1000));

  await example2_ReviewAnalysis();
  await new Promise(resolve => setTimeout(resolve, 1000));

  await example3_QAExtraction();

  console.log('\n\n');
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║                    所有示例执行完成                         ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
}

// 如果直接运行此文件，执行所有示例
if (require.main === module) {
  runAllExamples().catch(console.error);
}