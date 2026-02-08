/**
 * GraphRegistry 单元测试
 */

import { GraphRegistry } from '../graph-registry';
import { GraphData } from '../../entities/graph-data';
import { ConfigurationError } from '../../../types/errors';
import { NodeType } from '../../../types/node';

describe('GraphRegistry', () => {
  let graphRegistry: GraphRegistry;

  beforeEach(() => {
    // 创建新的 GraphRegistry 实例以避免测试间干扰
    graphRegistry = new GraphRegistry();
  });

  afterEach(() => {
    // 清理所有图缓存
    graphRegistry.clear();
  });

  describe('register - 注册图结构', () => {
    it('应该成功注册图结构', () => {
      const workflowId = 'workflow-1';
      const graph = new GraphData();

      graphRegistry.register(workflowId, graph);

      expect(graphRegistry.has(workflowId)).toBe(true);
      expect(graphRegistry.get(workflowId)).toBe(graph);
    });

    it('应该标记图为只读状态', () => {
      const workflowId = 'workflow-1';
      const graph = new GraphData();

      graphRegistry.register(workflowId, graph);

      expect(graph.isReadOnly()).toBe(true);
    });

    it('应该覆盖已存在的图结构', () => {
      const workflowId = 'workflow-1';
      const graph1 = new GraphData();
      const graph2 = new GraphData();

      graphRegistry.register(workflowId, graph1);
      graphRegistry.register(workflowId, graph2);

      expect(graphRegistry.get(workflowId)).toBe(graph2);
      expect(graph2.isReadOnly()).toBe(true);
    });

    it('应该处理空工作流ID', () => {
      const workflowId = '';
      const graph = new GraphData();

      graphRegistry.register(workflowId, graph);

      expect(graphRegistry.has('')).toBe(true);
      expect(graphRegistry.get('')).toBe(graph);
    });
  });

  describe('get - 获取图结构', () => {
    it('应该成功获取已注册的图结构', () => {
      const workflowId = 'workflow-1';
      const graph = new GraphData();

      graphRegistry.register(workflowId, graph);
      const result = graphRegistry.get(workflowId);

      expect(result).toBe(graph);
    });

    it('应该返回 undefined 当图结构不存在', () => {
      expect(graphRegistry.get('non-existent')).toBeUndefined();
    });

    it('应该返回只读的图结构', () => {
      const workflowId = 'workflow-1';
      const graph = new GraphData();

      graphRegistry.register(workflowId, graph);
      const result = graphRegistry.get(workflowId);

      expect(result!.isReadOnly()).toBe(true);
    });
  });

  describe('has - 检查图是否存在', () => {
    it('应该返回 true 当图存在时', () => {
      const workflowId = 'workflow-1';
      const graph = new GraphData();

      graphRegistry.register(workflowId, graph);
      expect(graphRegistry.has(workflowId)).toBe(true);
    });

    it('应该返回 false 当图不存在时', () => {
      expect(graphRegistry.has('non-existent')).toBe(false);
    });

    it('应该返回 false 当工作流ID为空时', () => {
      expect(graphRegistry.has('')).toBe(false);
    });
  });

  describe('clear - 清空图缓存', () => {
    it('应该清空所有图缓存', () => {
      const workflowId1 = 'workflow-1';
      const workflowId2 = 'workflow-2';
      const graph1 = new GraphData();
      const graph2 = new GraphData();

      graphRegistry.register(workflowId1, graph1);
      graphRegistry.register(workflowId2, graph2);

      expect(graphRegistry.has(workflowId1)).toBe(true);
      expect(graphRegistry.has(workflowId2)).toBe(true);

      graphRegistry.clear();

      expect(graphRegistry.has(workflowId1)).toBe(false);
      expect(graphRegistry.has(workflowId2)).toBe(false);
    });

    it('应该不抛出错误当缓存为空时', () => {
      expect(() => {
        graphRegistry.clear();
      }).not.toThrow();
    });
  });

  describe('集成测试 - 图操作', () => {
    it('应该正确处理图的只读状态', () => {
      const workflowId = 'workflow-1';
      const graph = new GraphData();

      // 注册前可以修改图
      expect(graph.isReadOnly()).toBe(false);

      graphRegistry.register(workflowId, graph);

      // 注册后图变为只读
      expect(graph.isReadOnly()).toBe(true);

      // 尝试修改只读图应该抛出错误
      expect(() => {
        graph.addNode({ id: 'node-1', type: NodeType.START, name: 'Start Node', workflowId: 'workflow-1' });
      }).toThrow(ConfigurationError);
    });

    it('应该支持多个工作流的图管理', () => {
      const workflowId1 = 'workflow-1';
      const workflowId2 = 'workflow-2';
      const graph1 = new GraphData();
      const graph2 = new GraphData();

      graphRegistry.register(workflowId1, graph1);
      graphRegistry.register(workflowId2, graph2);

      expect(graphRegistry.get(workflowId1)).toBe(graph1);
      expect(graphRegistry.get(workflowId2)).toBe(graph2);
      expect(graph1.isReadOnly()).toBe(true);
      expect(graph2.isReadOnly()).toBe(true);
    });

    it('应该正确处理图的查询操作', () => {
      const workflowId = 'workflow-1';
      const graph = new GraphData();

      graphRegistry.register(workflowId, graph);

      // 获取的图应该仍然是只读的
      const retrievedGraph = graphRegistry.get(workflowId);
      expect(retrievedGraph!.isReadOnly()).toBe(true);

      // 再次获取应该返回同一个实例
      const sameGraph = graphRegistry.get(workflowId);
      expect(sameGraph).toBe(retrievedGraph);
    });
  });

  describe('边界情况测试', () => {
    it('应该处理特殊字符的工作流ID', () => {
      const specialIds = [
        'workflow-with-dash',
        'workflow_with_underscore',
        'workflow.with.dots',
        'workflow@special',
        '工作流中文',
        '12345',
        'workflow-with-very-long-name-that-exceeds-normal-length-limits'
      ];

      specialIds.forEach(workflowId => {
        const graph = new GraphData();
        graphRegistry.register(workflowId, graph);

        expect(graphRegistry.has(workflowId)).toBe(true);
        expect(graphRegistry.get(workflowId)).toBe(graph);
      });
    });

    it('应该正确处理大量图的注册', () => {
      const count = 100;
      
      for (let i = 0; i < count; i++) {
        const workflowId = `workflow-${i}`;
        const graph = new GraphData();
        graphRegistry.register(workflowId, graph);
      }

      // 验证所有图都被正确注册
      for (let i = 0; i < count; i++) {
        const workflowId = `workflow-${i}`;
        expect(graphRegistry.has(workflowId)).toBe(true);
        const graph = graphRegistry.get(workflowId);
        expect(graph).toBeDefined();
        expect(graph!.isReadOnly()).toBe(true);
      }

      // 清理后应该都没有了
      graphRegistry.clear();
      
      for (let i = 0; i < count; i++) {
        const workflowId = `workflow-${i}`;
        expect(graphRegistry.has(workflowId)).toBe(false);
      }
    });
  });

  describe('性能测试', () => {
    it('应该快速处理图的注册和查询', () => {
      const startTime = Date.now();
      const operations = 1000;

      for (let i = 0; i < operations; i++) {
        const workflowId = `workflow-${i}`;
        const graph = new GraphData();
        graphRegistry.register(workflowId, graph);
        
        // 立即查询
        const retrieved = graphRegistry.get(workflowId);
        expect(retrieved).toBe(graph);
      }

      const endTime = Date.now();
      const duration = endTime - startTime;

      // 1000次操作应该在合理时间内完成（例如1秒内）
      expect(duration).toBeLessThan(1000);
    });

    it('应该快速处理大量图的清理', () => {
      // 先注册大量图
      const count = 1000;
      for (let i = 0; i < count; i++) {
        const workflowId = `workflow-${i}`;
        const graph = new GraphData();
        graphRegistry.register(workflowId, graph);
      }

      const startTime = Date.now();
      graphRegistry.clear();
      const endTime = Date.now();
      const duration = endTime - startTime;

      // 清理操作应该在合理时间内完成
      expect(duration).toBeLessThan(100);

      // 验证所有图都被清理
      expect(graphRegistry.has('workflow-0')).toBe(false);
      expect(graphRegistry.has('workflow-999')).toBe(false);
    });
  });

  describe('错误处理', () => {
    it('应该正确处理无效的图对象', () => {
      const workflowId = 'workflow-1';
      
      // 测试 null 和 undefined
      expect(() => {
        graphRegistry.register(workflowId, null as any);
      }).toThrow();

      expect(() => {
        graphRegistry.register(workflowId, undefined as any);
      }).toThrow();
    });

    it('应该正确处理重复注册', () => {
      const workflowId = 'workflow-1';
      const graph1 = new GraphData();
      const graph2 = new GraphData();

      graphRegistry.register(workflowId, graph1);
      
      // 重复注册应该不抛出错误，而是覆盖
      expect(() => {
        graphRegistry.register(workflowId, graph2);
      }).not.toThrow();

      expect(graphRegistry.get(workflowId)).toBe(graph2);
    });
  });

  describe('内存管理', () => {
    it('应该正确释放图对象的引用', () => {
      const workflowId = 'workflow-1';
      let graph: GraphData | null = new GraphData();

      graphRegistry.register(workflowId, graph);
      
      // 保存图的引用
      const savedGraph = graphRegistry.get(workflowId);
      
      // 释放原始引用
      graph = null;

      // 注册表中的图应该仍然可用
      expect(graphRegistry.get(workflowId)).toBe(savedGraph);
      expect(savedGraph!.isReadOnly()).toBe(true);

      // 清理后应该释放所有引用
      graphRegistry.clear();
      expect(graphRegistry.get(workflowId)).toBeUndefined();
    });
  });
});