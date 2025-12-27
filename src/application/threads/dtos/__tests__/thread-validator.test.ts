import { ThreadValidator } from '../thread-validator';
import { NodeExecution } from '../../../../domain/threads/value-objects/node-execution';
import { NodeId } from '../../../../domain/workflow/value-objects/node-id';
import { NodeStatus } from '../../../../domain/workflow/value-objects/node-status';
import { Timestamp } from '../../../../domain/common/value-objects/timestamp';
import { ID } from '../../../../domain/common/value-objects/id';

describe('ThreadValidator', () => {
  describe('validateNodeExecutionTimeConsistency', () => {
    it('应该通过时间一致性验证', () => {
      const nodeExecution = NodeExecution.create(NodeId.fromString(ID.generate().value));
      
      // 没有时间信息时应该通过
      expect(() => {
        ThreadValidator.validateNodeExecutionTimeConsistency(nodeExecution);
      }).not.toThrow();
    });

    it('应该通过正常的时间顺序验证', () => {
      const startTime = Timestamp.now();
      const endTime = Timestamp.fromMilliseconds(startTime.getMilliseconds() + 1000); // 1秒后
      
      const nodeExecution = NodeExecution.create(NodeId.fromString(ID.generate().value))
        .start()
        .complete({ result: 'test' });
      
      // 模拟设置时间
      const executionWithTime = {
        ...nodeExecution,
        startTime,
        endTime
      };
      
      expect(() => {
        ThreadValidator.validateNodeExecutionTimeConsistency(executionWithTime as NodeExecution);
      }).not.toThrow();
    });

    it('应该抛出错误当开始时间晚于结束时间', () => {
      const startTime = Timestamp.now();
      const endTime = Timestamp.fromMilliseconds(startTime.getMilliseconds() - 1000); // 1秒前
      
      const nodeExecution = NodeExecution.create(NodeId.fromString(ID.generate().value))
        .start()
        .complete({ result: 'test' });
      
      // 模拟设置时间
      const executionWithTime = {
        ...nodeExecution,
        startTime,
        endTime
      };
      
      expect(() => {
        ThreadValidator.validateNodeExecutionTimeConsistency(executionWithTime as NodeExecution);
      }).toThrow('开始时间不能晚于结束时间');
    });
  });

  describe('validateNodeExecutionStatusTimeMatch', () => {
    it('应该通过状态与时间匹配验证', () => {
      const nodeExecution = NodeExecution.create(NodeId.fromString(ID.generate().value));
      
      // 待执行状态不需要时间信息
      expect(() => {
        ThreadValidator.validateNodeExecutionStatusTimeMatch(nodeExecution);
      }).not.toThrow();
    });

    it('应该通过运行中状态的时间验证', () => {
      const nodeExecution = NodeExecution.create(NodeId.fromString(ID.generate().value)).start();
      
      // 模拟设置开始时间
      const executionWithTime = {
        ...nodeExecution,
        startTime: Timestamp.now(),
        status: NodeStatus.running()
      };
      
      expect(() => {
        ThreadValidator.validateNodeExecutionStatusTimeMatch(executionWithTime as NodeExecution);
      }).not.toThrow();
    });

    it('应该抛出错误当运行中状态没有开始时间', () => {
      // 创建一个运行中状态但没有开始时间的模拟对象
      const nodeExecution = {
        status: NodeStatus.running(),
        startTime: undefined,
        endTime: undefined
      };
      
      expect(() => {
        ThreadValidator.validateNodeExecutionStatusTimeMatch(nodeExecution as NodeExecution);
      }).toThrow('运行中的节点必须有开始时间');
    });

    it('应该通过已完成状态的时间验证', () => {
      const nodeExecution = NodeExecution.create(NodeId.fromString(ID.generate().value))
        .start()
        .complete({ result: 'test' });
      
      // 模拟设置时间
      const executionWithTime = {
        ...nodeExecution,
        startTime: Timestamp.now(),
        endTime: Timestamp.fromMilliseconds(Timestamp.now().getMilliseconds() + 1000),
        status: NodeStatus.completed()
      };
      
      expect(() => {
        ThreadValidator.validateNodeExecutionStatusTimeMatch(executionWithTime as NodeExecution);
      }).not.toThrow();
    });

    it('应该抛出错误当已完成状态没有结束时间', () => {
      // 创建一个已完成状态但没有结束时间的模拟对象
      const nodeExecution = {
        status: NodeStatus.completed(),
        startTime: Timestamp.now(),
        endTime: undefined
      };
      
      expect(() => {
        ThreadValidator.validateNodeExecutionStatusTimeMatch(nodeExecution as NodeExecution);
      }).toThrow('已终止的节点必须有结束时间');
    });
  });

  describe('validateNodeStateTransition', () => {
    it('应该通过有效的状态转换', () => {
      const currentStatus = NodeStatus.pending();
      const targetStatus = NodeStatus.running();
      
      expect(() => {
        ThreadValidator.validateNodeStateTransition(currentStatus, targetStatus);
      }).not.toThrow();
    });

    it('应该抛出错误当无效的状态转换', () => {
      const currentStatus = NodeStatus.pending();
      const targetStatus = NodeStatus.completed(); // 不能直接从pending到completed
      
      expect(() => {
        ThreadValidator.validateNodeStateTransition(currentStatus, targetStatus);
      }).toThrow('不允许的状态转换');
    });

    it('应该通过失败状态的重试转换', () => {
      const currentStatus = NodeStatus.failed();
      const targetStatus = NodeStatus.pending(); // 重试
      
      expect(() => {
        ThreadValidator.validateNodeStateTransition(currentStatus, targetStatus);
      }).not.toThrow();
    });
  });

  describe('现有验证方法', () => {
    it('应该验证线程信息', () => {
      const validThreadInfo = {
        threadId: 'test-thread',
        sessionId: 'test-session',
        workflowId: 'test-workflow',
        status: 'pending',
        priority: 1,
        createdAt: '2023-01-01T00:00:00Z'
      };
      
      expect(() => {
        ThreadValidator.validateThreadInfo(validThreadInfo);
      }).not.toThrow();
    });

    it('应该验证创建线程请求', () => {
      const validRequest = {
        sessionId: 'test-session',
        workflowId: 'test-workflow'
      };
      
      expect(() => {
        ThreadValidator.validateCreateThreadRequest(validRequest);
      }).not.toThrow();
    });
  });
});