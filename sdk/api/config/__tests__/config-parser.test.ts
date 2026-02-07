/**
 * ConfigParser 单元测试
 */

import { ConfigParser, ConfigFormat } from '../config-parser';
import { ConfigValidator } from '../config-validator';
import { ConfigTransformer } from '../config-transformer';
import { JsonParser } from '../json-parser';
import { TomlParser } from '../toml-parser';

describe('ConfigParser', () => {
  let parser: ConfigParser;

  beforeEach(() => {
    parser = new ConfigParser();
  });

  describe('JSON解析', () => {
    const validJsonConfig = `{
      "workflow": {
        "id": "test-workflow",
        "name": "测试工作流",
        "description": "这是一个测试工作流",
        "version": "1.0.0",
        "nodes": [
          {
            "id": "start",
            "type": "START",
            "name": "开始",
            "config": {}
          },
          {
            "id": "end",
            "type": "END",
            "name": "结束",
            "config": {}
          }
        ],
        "edges": [
          {
            "from": "start",
            "to": "end"
          }
        ]
      }
    }`;

    test('应该成功解析有效的JSON配置', () => {
      const result = parser.parse(validJsonConfig, ConfigFormat.JSON);
      
      expect(result.format).toBe(ConfigFormat.JSON);
      expect(result.workflowConfig.workflow.id).toBe('test-workflow');
      expect(result.workflowConfig.workflow.name).toBe('测试工作流');
      expect(result.workflowConfig.workflow.nodes).toHaveLength(2);
      expect(result.workflowConfig.workflow.edges).toHaveLength(1);
    });

    test('应该验证配置的有效性', () => {
      const parsed = parser.parse(validJsonConfig, ConfigFormat.JSON);
      const validationResult = parser.validate(parsed);
      
      expect(validationResult.valid).toBe(true);
      expect(validationResult.errors).toHaveLength(0);
    });

    test('应该检测无效的配置', () => {
      const invalidJsonConfig = `{
        "workflow": {
          "id": "test-workflow",
          "name": "测试工作流",
          "version": "1.0.0",
          "nodes": [],
          "edges": []
        }
      }`;
      
      const parsed = parser.parse(invalidJsonConfig, ConfigFormat.JSON);
      const validationResult = parser.validate(parsed);
      
      expect(validationResult.valid).toBe(false);
      expect(validationResult.errors.length).toBeGreaterThan(0);
    });

    test('应该将配置转换为WorkflowDefinition', () => {
      const workflowDef = parser.parseAndTransform(validJsonConfig, ConfigFormat.JSON);
      
      expect(workflowDef.id).toBe('test-workflow');
      expect(workflowDef.name).toBe('测试工作流');
      expect(workflowDef.nodes).toHaveLength(2);
      expect(workflowDef.edges).toHaveLength(1);
      expect(workflowDef.nodes[0].type).toBe('START');
      expect(workflowDef.nodes[1].type).toBe('END');
    });

    test('应该支持参数替换', () => {
      const configWithParams = `{
        "workflow": {
          "id": "test-workflow",
          "name": "测试工作流",
          "version": "1.0.0",
          "parameters": {
            "model": {
              "type": "string",
              "default": "gpt-4"
            }
          },
          "nodes": [
            {
              "id": "start",
              "type": "START",
              "name": "开始",
              "config": {}
            },
            {
              "id": "llm",
              "type": "LLM",
              "name": "LLM节点",
              "config": {
                "profileId": "{{parameters.model}}"
              }
            },
            {
              "id": "end",
              "type": "END",
              "name": "结束",
              "config": {}
            }
          ],
          "edges": [
            {
              "from": "start",
              "to": "llm"
            },
            {
              "from": "llm",
              "to": "end"
            }
          ]
        }
      }`;
      
      const workflowDef = parser.parseAndTransform(
        configWithParams,
        ConfigFormat.JSON,
        { model: 'gpt-4-turbo' }
      );
      
      expect(workflowDef.nodes[1].config.profileId).toBe('gpt-4-turbo');
    });
  });

  describe('导出功能', () => {
    test('应该将WorkflowDefinition导出为JSON', () => {
      const workflowDef = parser.parseAndTransform(
        JSON.stringify({
          workflow: {
            id: 'test-workflow',
            name: '测试工作流',
            version: '1.0.0',
            nodes: [
              { id: 'start', type: 'START', name: '开始', config: {} },
              { id: 'end', type: 'END', name: '结束', config: {} }
            ],
            edges: [{ from: 'start', to: 'end' }]
          }
        }),
        ConfigFormat.JSON
      );
      
      const exported = parser.exportWorkflow(workflowDef, ConfigFormat.JSON);
      const parsed = JSON.parse(exported);
      
      expect(parsed.workflow.id).toBe('test-workflow');
      expect(parsed.workflow.name).toBe('测试工作流');
    });
  });

  describe('错误处理', () => {
    test('应该抛出无效JSON的错误', () => {
      expect(() => {
        parser.parse('invalid json', ConfigFormat.JSON);
      }).toThrow();
    });

    test('应该抛出缺少workflow部分的错误', () => {
      expect(() => {
        parser.parse('{"notWorkflow": {}}', ConfigFormat.JSON);
      }).toThrow();
    });
  });
});

describe('ConfigValidator', () => {
  let validator: ConfigValidator;

  beforeEach(() => {
    validator = new ConfigValidator();
  });

  test('应该验证必需字段', () => {
    const invalidConfig = {
      workflow: {
        id: '',
        name: '',
        version: '',
        nodes: [],
        edges: []
      }
    };

    const result = validator.validate({
      format: ConfigFormat.JSON,
      workflowConfig: invalidConfig as any,
      rawContent: ''
    });

    expect(result.valid).toBe(false);
    expect(result.errors).toContain('工作流ID不能为空');
    expect(result.errors).toContain('工作流名称不能为空');
    expect(result.errors).toContain('工作流版本不能为空');
  });

  test('应该验证START和END节点', () => {
    const invalidConfig = {
      workflow: {
        id: 'test',
        name: 'test',
        version: '1.0.0',
        nodes: [
          { id: 'node1', type: 'LLM', name: 'LLM', config: {} }
        ],
        edges: []
      }
    };

    const result = validator.validate({
      format: ConfigFormat.JSON,
      workflowConfig: invalidConfig as any,
      rawContent: ''
    });

    expect(result.valid).toBe(false);
    expect(result.errors).toContain('工作流必须包含一个START节点');
    expect(result.errors).toContain('工作流必须包含一个END节点');
  });

  test('应该验证边的引用', () => {
    const invalidConfig = {
      workflow: {
        id: 'test',
        name: 'test',
        version: '1.0.0',
        nodes: [
          { id: 'start', type: 'START', name: '开始', config: {} },
          { id: 'end', type: 'END', name: '结束', config: {} }
        ],
        edges: [
          { from: 'start', to: 'nonexistent' }
        ]
      }
    };

    const result = validator.validate({
      format: ConfigFormat.JSON,
      workflowConfig: invalidConfig as any,
      rawContent: ''
    });

    expect(result.valid).toBe(false);
    expect(result.errors).toContain('边的目标节点不存在: nonexistent');
  });
});

describe('ConfigTransformer', () => {
  let transformer: ConfigTransformer;

  beforeEach(() => {
    transformer = new ConfigTransformer();
  });

  test('应该转换节点配置', () => {
    const configFile = {
      workflow: {
        id: 'test',
        name: 'test',
        version: '1.0.0',
        nodes: [
          { id: 'start', type: 'START', name: '开始', config: {} }
        ],
        edges: []
      }
    };

    const workflowDef = transformer.transformToWorkflow(configFile);
    
    expect(workflowDef.nodes[0].id).toBe('start');
    expect(workflowDef.nodes[0].type).toBe('START');
    expect(workflowDef.nodes[0].outgoingEdgeIds).toEqual([]);
    expect(workflowDef.nodes[0].incomingEdgeIds).toEqual([]);
  });

  test('应该转换边配置', () => {
    const configFile = {
      workflow: {
        id: 'test',
        name: 'test',
        version: '1.0.0',
        nodes: [
          { id: 'start', type: 'START', name: '开始', config: {} },
          { id: 'end', type: 'END', name: '结束', config: {} }
        ],
        edges: [
          { from: 'start', to: 'end' }
        ]
      }
    };

    const workflowDef = transformer.transformToWorkflow(configFile);
    
    expect(workflowDef.edges[0].sourceNodeId).toBe('start');
    expect(workflowDef.edges[0].targetNodeId).toBe('end');
    expect(workflowDef.edges[0].type).toBe('DEFAULT');
  });

  test('应该更新节点的边引用', () => {
    const configFile = {
      workflow: {
        id: 'test',
        name: 'test',
        version: '1.0.0',
        nodes: [
          { id: 'start', type: 'START', name: '开始', config: {} },
          { id: 'end', type: 'END', name: '结束', config: {} }
        ],
        edges: [
          { from: 'start', to: 'end' }
        ]
      }
    };

    const workflowDef = transformer.transformToWorkflow(configFile);
    
    expect(workflowDef.nodes[0].outgoingEdgeIds).toHaveLength(1);
    expect(workflowDef.nodes[1].incomingEdgeIds).toHaveLength(1);
  });
});

describe('JsonParser', () => {
  let jsonParser: JsonParser;

  beforeEach(() => {
    jsonParser = new JsonParser();
  });

  test('应该解析JSON字符串', () => {
    const json = '{"key": "value"}';
    const result = jsonParser.parse(json);
    expect(result.key).toBe('value');
  });

  test('应该序列化对象为JSON字符串', () => {
    const obj = { key: 'value' };
    const result = jsonParser.stringify(obj, true);
    expect(result).toBe('{\n  "key": "value"\n}');
  });

  test('应该验证JSON语法', () => {
    expect(jsonParser.validateSyntax('{"valid": true}')).toBe(true);
    expect(jsonParser.validateSyntax('invalid')).toBe(false);
  });
});