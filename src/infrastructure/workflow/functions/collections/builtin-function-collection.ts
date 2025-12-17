import { injectable, inject } from 'inversify';
import { 
    IWorkflowFunctionCollection,
    IConditionFunction,
    INodeFunction,
    IRoutingFunction,
    ITriggerFunction,
    IWorkflowFunction,
    WorkflowFunctionType
} from '../../../../domain/workflow/interfaces/workflow-functions';
import { FunctionRegistry } from '../registry/function-registry';

/**
 * 内置函数集合实现
 */
@injectable()
export class BuiltinFunctionCollection implements IWorkflowFunctionCollection {
    constructor(
        @inject('FunctionRegistry') private readonly registry: FunctionRegistry
    ) {}

    getConditionFunctions(): IConditionFunction[] {
        return this.registry.getFunctionsByType(WorkflowFunctionType.CONDITION) as IConditionFunction[];
    }

    getNodeFunctions(): INodeFunction[] {
        return this.registry.getFunctionsByType(WorkflowFunctionType.NODE) as INodeFunction[];
    }

    getRoutingFunctions(): IRoutingFunction[] {
        return this.registry.getFunctionsByType(WorkflowFunctionType.ROUTING) as IRoutingFunction[];
    }

    getTriggerFunctions(): ITriggerFunction[] {
        return this.registry.getFunctionsByType(WorkflowFunctionType.TRIGGER) as ITriggerFunction[];
    }

    getFunctionByName(name: string): IWorkflowFunction | null {
        return this.registry.getFunctionByName(name);
    }

    // 便捷方法，类似Python实现
    getAllConditionFunctions(): IConditionFunction[] {
        return this.getConditionFunctions();
    }

    getAllNodeFunctions(): INodeFunction[] {
        return this.getNodeFunctions();
    }

    getAllRoutingFunctions(): IRoutingFunction[] {
        return this.getRoutingFunctions();
    }

    getAllTriggerFunctions(): ITriggerFunction[] {
        return this.getTriggerFunctions();
    }

    /**
     * 获取所有函数
     */
    getAllFunctions(): IWorkflowFunction[] {
        return this.registry.getAllFunctions();
    }

    /**
     * 按类别获取函数
     */
    getFunctionsByCategory(category: string): IWorkflowFunction[] {
        return this.registry.getAllFunctions().filter(func => func.getMetadata().category === category);
    }

    /**
     * 搜索函数
     */
    searchFunctions(query: string): IWorkflowFunction[] {
        const lowerQuery = query.toLowerCase();
        return this.registry.getAllFunctions().filter(func => 
            func.name.toLowerCase().includes(lowerQuery) ||
            func.description.toLowerCase().includes(lowerQuery) ||
            func.id.toLowerCase().includes(lowerQuery)
        );
    }

    /**
     * 获取函数统计信息
     */
    getStats(): { 
        total: number; 
        byType: Record<string, number>; 
        byCategory: Record<string, number>;
    } {
        const functions = this.registry.getAllFunctions();
        const stats = {
            total: functions.length,
            byType: {} as Record<string, number>,
            byCategory: {} as Record<string, number>
        };

        for (const func of functions) {
            const type = func.type;
            const category = func.getMetadata().category || 'unknown';
            
            stats.byType[type] = (stats.byType[type] || 0) + 1;
            stats.byCategory[category] = (stats.byCategory[category] || 0) + 1;
        }

        return stats;
    }
}