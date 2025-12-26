import { ValueObject } from '../../common/value-objects/value-object';
import { NodeId } from './node-id';
import { NodeType } from './node-type';

/**
 * 节点值对象属性接口
 */
export interface NodeValueObjectProps {
  readonly id: NodeId;
  readonly type: NodeType;
  readonly name?: string;
  readonly description?: string;
  readonly position?: { x: number; y: number };
  readonly properties: Record<string, unknown>;
}

/**
 * 节点值对象
 * 封装节点数据，提供类型安全和验证
 */
export class NodeValueObject extends ValueObject<NodeValueObjectProps> {
  /**
   * 创建节点值对象
   */
  public static create(props: NodeValueObjectProps): NodeValueObject {
    // 验证
    if (!props.id) {
      throw new Error('节点ID不能为空');
    }
    if (!props.type) {
      throw new Error('节点类型不能为空');
    }

    return new NodeValueObject(props);
  }

  /**
   * 获取节点ID
   */
  public get id(): NodeId {
    return this.props.id;
  }

  /**
   * 获取节点类型
   */
  public get type(): NodeType {
    return this.props.type;
  }

  /**
   * 获取节点名称
   */
  public get name(): string | undefined {
    return this.props.name;
  }

  /**
   * 获取节点描述
   */
  public get description(): string | undefined {
    return this.props.description;
  }

  /**
   * 获取节点位置
   */
  public get position(): { x: number; y: number } | undefined {
    return this.props.position;
  }

  /**
   * 获取节点属性
   */
  public get properties(): Record<string, unknown> {
    return this.props.properties;
  }

  /**
   * 获取输入Schema
   */
  public getInputSchema(): Record<string, any> {
    switch (this.props.type.getValue()) {
      case 'llm':
        return {
          type: 'object',
          properties: {
            text: { type: 'string', description: '输入文本' },
            prompt: { type: 'string', description: '提示词模板' }
          },
          required: ['text']
        };
      case 'tool':
        return {
          type: 'object',
          properties: {
            toolName: { type: 'string', description: '工具名称' },
            parameters: { type: 'object', description: '工具参数' }
          },
          required: ['toolName']
        };
      case 'task':
        return {
          type: 'object',
          properties: {
            input: { type: 'any', description: '任务输入' }
          },
          required: ['input']
        };
      case 'decision':
        return {
          type: 'object',
          properties: {
            condition: { type: 'string', description: '决策条件' },
            context: { type: 'object', description: '上下文数据' }
          },
          required: ['condition']
        };
      case 'condition':
        return {
          type: 'object',
          properties: {
            state: { type: 'any', description: '状态数据' },
            context: { type: 'object', description: '上下文数据' }
          },
          required: ['state']
        };
      case 'human-relay':
        return {
          type: 'object',
          properties: {
            message: { type: 'string', description: '传递给用户的消息' },
            context: { type: 'object', description: '上下文数据' }
          },
          required: ['message']
        };
      case 'wait':
        return {
          type: 'object',
          properties: {
            duration: { type: 'number', description: '等待时长（毫秒）' }
          },
          required: ['duration']
        };
      default:
        return { type: 'object', properties: {}, required: [] };
    }
  }

  /**
   * 获取输出Schema
   */
  public getOutputSchema(): Record<string, any> {
    switch (this.props.type.getValue()) {
      case 'llm':
        return {
          type: 'object',
          properties: {
            response: { type: 'string', description: 'LLM响应' },
            model: { type: 'string', description: '使用的模型' }
          }
        };
      case 'tool':
        return {
          type: 'object',
          properties: {
            result: { type: 'any', description: '工具执行结果' },
            success: { type: 'boolean', description: '是否成功' }
          }
        };
      case 'task':
        return {
          type: 'object',
          properties: {
            output: { type: 'any', description: '任务输出' }
          }
        };
      case 'decision':
        return {
          type: 'object',
          properties: {
            decision: { type: 'string', description: '决策结果' },
            branch: { type: 'string', description: '选择的分支' }
          }
        };
      case 'condition':
        return {
          type: 'object',
          properties: {
            result: { type: 'boolean', description: '条件判断结果' },
            nextState: { type: 'string', description: '下一个状态' }
          }
        };
      case 'human-relay':
        return {
          type: 'object',
          properties: {
            userInput: { type: 'any', description: '用户输入' },
            confirmed: { type: 'boolean', description: '是否确认' }
          }
        };
      case 'wait':
        return {
          type: 'object',
          properties: {
            elapsed: { type: 'number', description: '实际等待时长' }
          }
        };
      default:
        return { type: 'object', properties: {}, required: [] };
    }
  }

  /**
   * 检查是否为控制流节点
   */
  public isControlFlow(): boolean {
    return this.props.type.isControlFlow();
  }

  /**
   * 检查是否为执行节点
   */
  public isExecutable(): boolean {
    return this.props.type.isExecutable();
  }

  /**
   * 检查是否可以有多个输入边
   */
  public canHaveMultipleInputs(): boolean {
    return this.props.type.canHaveMultipleInputs();
  }

  /**
   * 检查是否可以有多个输出边
   */
  public canHaveMultipleOutputs(): boolean {
    return this.props.type.canHaveMultipleOutputs();
  }

  /**
   * 验证值对象的有效性
   */
  public override validate(): void {
    if (!this.props.id) {
      throw new Error('节点ID不能为空');
    }
    if (!this.props.type) {
      throw new Error('节点类型不能为空');
    }
    this.props.type.validate();
  }

  /**
   * 获取字符串表示
   */
  public override toString(): string {
    return `NodeValueObject(id=${this.props.id.toString()}, type=${this.props.type.toString()}, name=${this.props.name || 'unnamed'})`;
  }
}