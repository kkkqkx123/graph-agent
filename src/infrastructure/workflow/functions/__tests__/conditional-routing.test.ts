import { ConditionalRoutingFunction } from '../builtin/routing/conditional-routing.function';
import { ExpressionEvaluator } from '../common/expression-evaluator';

describe('ConditionalRoutingFunction', () => {
  let routingFunction: ConditionalRoutingFunction;
  let mockContext: any;

  beforeEach(() => {
    routingFunction = new ConditionalRoutingFunction();
    routingFunction.initialize();

    mockContext = {
      getVariable: jest.fn((name: string) => {
        switch (name) {
          case 'messages':
            return [
              { role: 'user', content: 'test' },
              { role: 'assistant', tool_calls: [{ name: 'test_tool' }] }
            ];
          case 'tool_results':
            return [
              { success: true, result: 'success' },
              { success: false, error: 'error' }
            ];
          case 'iteration':
            return 5;
          case 'maxIterations':
            return 10;
          default:
            return undefined;
        }
      })
    };
  });

  afterEach(() => {
    routingFunction.cleanup();
  });

  describe('基本路由功能', () => {
    it('应该返回第一个匹配条件的targetNodeId', async () => {
      const config = {
        conditions: [
          { name: 'has_errors', value: '${has_errors()}', targetNodeId: 'error_handler' },
          { name: 'has_tool_calls', value: '${has_tool_calls()}', targetNodeId: 'tool_executor' }
        ],
        defaultNodeId: 'continue',
        matchMode: 'first'
      };

      const result = await routingFunction.route(mockContext, config);
      expect(result).toBe('error_handler');
    });

    it('应该返回默认节点ID当没有条件匹配时', async () => {
      const config = {
        conditions: [
          { name: 'max_iterations', value: '${max_iterations_reached()}', targetNodeId: 'timeout' }
        ],
        defaultNodeId: 'continue'
      };

      const result = await routingFunction.route(mockContext, config);
      expect(result).toBe('continue');
    });
  });

  describe('匹配模式', () => {
    it('any模式应该返回所有匹配的目标节点', async () => {
      const config = {
        conditions: [
          { name: 'has_errors', value: '${has_errors()}', targetNodeId: 'error_handler' },
          { name: 'has_tool_calls', value: '${has_tool_calls()}', targetNodeId: 'tool_executor' }
        ],
        matchMode: 'any'
      };

      const result = await routingFunction.route(mockContext, config);
      expect(Array.isArray(result)).toBe(true);
      expect(result).toContain('error_handler');
      expect(result).toContain('tool_executor');
    });

    it('all模式应该只在所有条件都匹配时返回所有目标节点', async () => {
      const config = {
        conditions: [
          { name: 'has_errors', value: '${has_errors()}', targetNodeId: 'error_handler' },
          { name: 'no_tool_calls', value: '${no_tool_calls()}', targetNodeId: 'continue' }
        ],
        matchMode: 'all'
      };

      const result = await routingFunction.route(mockContext, config);
      expect(result).toBe('default'); // 因为no_tool_calls不匹配
    });
  });

  describe('条件评估', () => {
    it('应该正确评估否定条件', async () => {
      const config = {
        conditions: [
          { name: 'no_errors', value: '${has_errors()}', negate: true, targetNodeId: 'success' }
        ],
        defaultNodeId: 'error'
      };

      const result = await routingFunction.route(mockContext, config);
      expect(result).toBe('error'); // 因为has_errors为true，否定后为false
    });

    it('应该支持不同的操作符', async () => {
      const config = {
        conditions: [
          { name: 'iteration_check', value: '${iteration}', operator: 'less_than', targetNodeId: 'early' },
          { name: 'iteration_check2', value: '${iteration}', operator: 'greater_than', targetNodeId: 'late' }
        ],
        matchMode: 'first'
      };

      const result = await routingFunction.route(mockContext, config);
      expect(result).toBe('early'); // iteration=5，less_than为true
    });
  });

  describe('配置验证', () => {
    it('应该验证conditions数组', () => {
      const config = { conditions: 'invalid' };
      const errors = routingFunction.validateConfig(config);
      expect(errors).toContain('conditions必须是数组类型');
    });

    it('应该验证每个条件的必需字段', () => {
      const config = {
        conditions: [
          { name: 'test' }, // 缺少targetNodeId
          { targetNodeId: 'node' } // 缺少name
        ]
      };
      const errors = routingFunction.validateConfig(config);
      expect(errors).toContain('条件[0]缺少targetNodeId字段');
      expect(errors).toContain('条件[1]缺少name字段');
    });

    it('应该验证matchMode的有效性', () => {
      const config = {
        conditions: [{ name: 'test', targetNodeId: 'node' }],
        matchMode: 'invalid'
      };
      const errors = routingFunction.validateConfig(config);
      expect(errors).toContain('matchMode必须是first、all或any之一');
    });
  });
});

describe('ExpressionEvaluator', () => {
  const mockContext = {
    getVariable: jest.fn((name: string) => {
      switch (name) {
        case 'messages':
          return [{ tool_calls: [{ name: 'test' }] }];
        case 'tool_results':
          return [{ success: false }];
        case 'iteration':
          return 5;
        case 'maxIterations':
          return 10;
        default:
          return undefined;
      }
    })
  };

  describe('变量引用', () => {
    it('应该正确解析变量引用', () => {
      const result = ExpressionEvaluator.evaluate('${has_tool_calls()}', mockContext);
      expect(result).toBe(true);
    });

    it('应该正确解析嵌套变量', () => {
      const context = {
        getVariable: jest.fn((name: string) => {
          if (name === 'user.profile.name') return 'test_user';
          return undefined;
        })
      };
      
      const result = ExpressionEvaluator.evaluate('${user.profile.name}', context);
      expect(result).toBe('test_user');
    });
  });

  describe('布尔表达式', () => {
    it('应该正确评估比较表达式', () => {
      const result = ExpressionEvaluator.evaluate('${iteration >= 10}', mockContext);
      expect(result).toBe(false); // iteration=5
    });

    it('应该正确评估等于表达式', () => {
      const result = ExpressionEvaluator.evaluate('${iteration == 5}', mockContext);
      expect(result).toBe(true);
    });
  });

  describe('函数调用', () => {
    it('应该正确调用内置函数', () => {
      const result = ExpressionEvaluator.evaluate('${has_errors()}', mockContext);
      expect(result).toBe(true);
    });

    it('应该正确调用计数函数', () => {
      const result = ExpressionEvaluator.evaluate('${count_errors()}', mockContext);
      expect(result).toBe(1);
    });
  });

  describe('直接值', () => {
    it('应该正确解析字符串', () => {
      const result = ExpressionEvaluator.evaluate('"hello world"', mockContext);
      expect(result).toBe('hello world');
    });

    it('应该正确解析数字', () => {
      const result = ExpressionEvaluator.evaluate('42', mockContext);
      expect(result).toBe(42);
    });

    it('应该正确解析布尔值', () => {
      expect(ExpressionEvaluator.evaluate('true', mockContext)).toBe(true);
      expect(ExpressionEvaluator.evaluate('false', mockContext)).toBe(false);
    });
  });
});