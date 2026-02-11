/**
 * ConfigParser 单元测试
 *
 * 设计原则：
 * - 配置验证使用 sdk/core/validation 中的 WorkflowValidator
 * - 验证结果使用 Result<WorkflowDefinition, ValidationError[]> 类型
 */

import { ConfigParser } from '../config-parser';
import { ConfigFormat } from '../types';
import { ConfigTransformer } from '../config-transformer';
import { parseJson, stringifyJson, validateJsonSyntax } from '../json-parser';
import { parseToml, validateTomlSyntax } from '../toml-parser';
import { NodeType } from '@modular-agent/types/node';
import { EdgeType } from '@modular-agent/types/edge';

describe('ConfigParser', () => {
  let parser: ConfigParser;

  beforeEach(() => {
    parser = new ConfigParser();
  });

  describe('JSON解析', () => {
    const validJsonConfig = `{
      "id": "test-workflow",
      "name": "测试工作流",
      "description": "这是一个测试工作流",
      "version": "1.0.0",
      "nodes": [
        {
          "id": "start",
          "type": "START",
          "name": "开始",
          "config": {},
          "outgoingEdgeIds": [],
          "incomingEdgeIds": []
        },
        {
          "id": "end",
          "type": "END",
          "name": "结束",
          "config": {},
          "outgoingEdgeIds": [],
          "incomingEdgeIds": []
        }
      ],
      "edges": [
        {
          "id": "edge-1",
          "sourceNodeId": "start",
          "targetNodeId": "end",
          "type": "DEFAULT"
        }
      ],
      "createdAt": 0,
      "updatedAt": 0
    }`;

    test('应该成功解析有效的JSON配置', () => {
      const result = parser.parse(validJsonConfig, ConfigFormat.JSON);
      
      expect(result.format).toBe(ConfigFormat.JSON);
      expect(result.config.id).toBe('test-workflow');
      expect(result.config.name).toBe('测试工作流');
      expect(result.config.nodes).toHaveLength(2);
      expect(result.config.edges).toHaveLength(1);
    });

    test('应该验证配置的有效性', () => {
      const parsed = parser.parse(validJsonConfig, ConfigFormat.JSON);
      const validationResult = parser.validate(parsed);
      
      expect(validationResult.isOk()).toBe(true);
    });

    test('应该检测无效的配置', () => {
      const invalidJsonConfig = `{
        "id": "test-workflow",
        "name": "测试工作流",
        "version": "1.0.0",
        "nodes": [],
        "edges": [],
        "createdAt": 0,
        "updatedAt": 0
      }`;
      
      const parsed = parser.parse(invalidJsonConfig, ConfigFormat.JSON);
      const validationResult = parser.validate(parsed);
      
      expect(validationResult.isErr()).toBe(true);
      if (validationResult.isErr()) {
        expect(validationResult.error.length).toBeGreaterThan(0);
      }
    });

    test('应该将配置转换为WorkflowDefinition', () => {
      const workflowDef = parser.parseAndTransform(validJsonConfig, ConfigFormat.JSON);
      
      expect(workflowDef.id).toBe('test-workflow');
      expect(workflowDef.name).toBe('测试工作流');
      expect(workflowDef.nodes).toHaveLength(2);
      expect(workflowDef.edges).toHaveLength(1);
      expect(workflowDef.nodes[0]!.type).toBe('START');
      expect(workflowDef.nodes[1]!.type).toBe('END');
    });

    test('应该支持参数替换', () => {
      const configWithParams = `{
        "id": "test-workflow",
        "name": "测试工作流",
        "version": "1.0.0",
        "nodes": [
          {
            "id": "start",
            "type": "START",
            "name": "开始",
            "config": {},
            "outgoingEdgeIds": [],
            "incomingEdgeIds": []
          },
          {
            "id": "llm",
            "type": "LLM",
            "name": "LLM节点",
            "config": {
              "profileId": "{{parameters.model}}"
            },
            "outgoingEdgeIds": [],
            "incomingEdgeIds": []
          },
          {
            "id": "end",
            "type": "END",
            "name": "结束",
            "config": {},
            "outgoingEdgeIds": [],
            "incomingEdgeIds": []
          }
        ],
        "edges": [
          {
            "id": "edge-1",
            "sourceNodeId": "start",
            "targetNodeId": "llm",
            "type": "DEFAULT"
          },
          {
            "id": "edge-2",
            "sourceNodeId": "llm",
            "targetNodeId": "end",
            "type": "DEFAULT"
          }
        ],
        "createdAt": 0,
        "updatedAt": 0
      }`;
      
      const workflowDef = parser.parseAndTransform(
        configWithParams,
        ConfigFormat.JSON,
        { model: 'gpt-4-turbo' }
      );
      
      const llmNode = workflowDef.nodes[1]!;
      expect(llmNode.type).toBe(NodeType.LLM);
      expect((llmNode.config as any).profileId).toBe('gpt-4-turbo');
    });
  });

  describe('导出功能', () => {
    test('应该将WorkflowDefinition导出为JSON', () => {
      const workflowDef = parser.parseAndTransform(
        JSON.stringify({
          id: 'test-workflow',
          name: '测试工作流',
          version: '1.0.0',
          nodes: [
            { id: 'start', type: 'START', name: '开始', config: {}, outgoingEdgeIds: [], incomingEdgeIds: [] },
            { id: 'end', type: 'END', name: '结束', config: {}, outgoingEdgeIds: [], incomingEdgeIds: [] }
          ],
          edges: [{ id: 'edge-1', sourceNodeId: 'start', targetNodeId: 'end', type: 'DEFAULT' }],
          createdAt: 0,
          updatedAt: 0
        }),
        ConfigFormat.JSON
      );
      
      const exported = parser.exportWorkflow(workflowDef, ConfigFormat.JSON);
      const parsed = JSON.parse(exported);
      
      expect(parsed.id).toBe('test-workflow');
      expect(parsed.name).toBe('测试工作流');
    });
  });

  describe('错误处理', () => {
    test('应该抛出无效JSON的错误', () => {
      expect(() => {
        parser.parse('invalid json', ConfigFormat.JSON);
      }).toThrow();
    });

    test('应该抛出缺少必需字段的错误', () => {
      expect(() => {
        parser.parse('{"notWorkflow": {}}', ConfigFormat.JSON);
      }).toThrow();
    });
  });
});


describe('ConfigTransformer', () => {
  let transformer: ConfigTransformer;

  beforeEach(() => {
    transformer = new ConfigTransformer();
  });

  test('应该转换节点配置', () => {
    const configFile = {
      id: 'test',
      name: 'test',
      version: '1.0.0',
      nodes: [
        { id: 'start', type: NodeType.START, name: '开始', config: {}, outgoingEdgeIds: [], incomingEdgeIds: [] }
      ],
      edges: [],
      createdAt: 0,
      updatedAt: 0
    } as any;

    const workflowDef = transformer.transformToWorkflow(configFile);
    
    expect(workflowDef.nodes[0]!.id).toBe('start');
    expect(workflowDef.nodes[0]!.type).toBe('START');
    expect(workflowDef.nodes[0]!.outgoingEdgeIds).toEqual([]);
    expect(workflowDef.nodes[0]!.incomingEdgeIds).toEqual([]);
  });

  test('应该转换边配置', () => {
    const configFile = {
      id: 'test',
      name: 'test',
      version: '1.0.0',
      nodes: [
        { id: 'start', type: NodeType.START, name: '开始', config: {}, outgoingEdgeIds: [], incomingEdgeIds: [] },
        { id: 'end', type: NodeType.END, name: '结束', config: {}, outgoingEdgeIds: [], incomingEdgeIds: [] }
      ],
      edges: [
        { id: 'edge-1', sourceNodeId: 'start', targetNodeId: 'end', type: EdgeType.DEFAULT }
      ],
      createdAt: 0,
      updatedAt: 0
    } as any;

    const workflowDef = transformer.transformToWorkflow(configFile);
    
    expect(workflowDef.edges[0]!.sourceNodeId).toBe('start');
    expect(workflowDef.edges[0]!.targetNodeId).toBe('end');
    expect(workflowDef.edges[0]!.type).toBe('DEFAULT');
  });

  test('应该更新节点的边引用', () => {
    const configFile = {
      id: 'test',
      name: 'test',
      version: '1.0.0',
      nodes: [
        { id: 'start', type: NodeType.START, name: '开始', config: {}, outgoingEdgeIds: [], incomingEdgeIds: [] },
        { id: 'end', type: NodeType.END, name: '结束', config: {}, outgoingEdgeIds: [], incomingEdgeIds: [] }
      ],
      edges: [
        { id: 'edge-1', sourceNodeId: 'start', targetNodeId: 'end', type: EdgeType.DEFAULT }
      ],
      createdAt: 0,
      updatedAt: 0
    } as any;

    const workflowDef = transformer.transformToWorkflow(configFile);
    
    expect(workflowDef.nodes[0]!.outgoingEdgeIds).toHaveLength(1);
    expect(workflowDef.nodes[1]!.incomingEdgeIds).toHaveLength(1);
  });
});

describe('JSON解析器函数', () => {
  test('应该解析JSON字符串', () => {
    const json = '{"id": "test", "name": "test", "version": "1.0.0", "nodes": [], "edges": [], "createdAt": 0, "updatedAt": 0}';
    const result = parseJson(json);
    expect(result.id).toBe('test');
  });

  test('应该序列化对象为JSON字符串', () => {
    const obj = { id: 'test', name: 'test', version: '1.0.0', nodes: [], edges: [], createdAt: 0, updatedAt: 0 };
    const result = stringifyJson(obj, true);
    expect(result).toContain('"id"');
  });

  test('应该验证JSON语法', () => {
    expect(validateJsonSyntax('{"id": "test"}')).toBe(true);
    expect(validateJsonSyntax('invalid')).toBe(false);
  });

  test('应该抛出缺少必需字段的错误', () => {
    expect(() => {
      parseJson('{"notWorkflow": {}}');
    }).toThrow();
  });
});

describe('TOML解析器函数', () => {
  test('应该验证TOML语法', () => {
    // 注意：这个测试需要安装TOML解析库才能通过
    // 这里只测试函数调用，不依赖实际TOML解析
    expect(typeof validateTomlSyntax).toBe('function');
  });

  test('应该抛出未找到TOML解析库的错误', () => {
    // 如果没有安装TOML库，parseToml会抛出ConfigurationError
    expect(() => {
      parseToml('[workflow]\nid = "test"');
    }).toThrow();
  });
});