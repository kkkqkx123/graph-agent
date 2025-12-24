import { injectable, inject } from 'inversify';
import {
    IWorkflowFunctionFactory,
    IWorkflowFunction,
    IConditionFunction,
    INodeFunction,
    IRoutingFunction,
    ITriggerFunction,
    WorkflowFunctionType
} from '../../../../domain/workflow/interfaces/workflow-functions';
import { ILogger } from '../../../../domain/common/types/logger-types';
import { FunctionRegistry } from '../registry/function-registry';
import { BaseWorkflowFunction } from '../base/base-workflow-function';

/**
 * 工作流函数工厂实现
 */
@injectable()
export class WorkflowFunctionFactory implements IWorkflowFunctionFactory {
    constructor(
        @inject('FunctionRegistry') private readonly registry: FunctionRegistry,
        @inject('Logger') private readonly logger: ILogger
    ) {}

    createFunction(functionId: string, config?: any): IWorkflowFunction {
        const func = this.registry.getFunction(functionId);
        if (!func) {
            throw new Error(`函数不存在: ${functionId}`);
        }
        
        // 创建新实例
        const instance = this.createInstance(func.constructor);
        if (config) {
            instance.initialize(config);
        }
        
        this.logger.debug(`创建函数实例`, {
            functionId,
            functionName: instance.name,
            hasConfig: !!config
        });
        
        return instance;
    }

    createConditionFunction(name: string, config?: any): IConditionFunction {
        const func = this.registry.getConditionFunction(name);
        if (!func) {
            throw new Error(`条件函数不存在: ${name}`);
        }
        
        const instance = this.createInstance(func.constructor) as IConditionFunction;
        if (config) {
            instance.initialize(config);
        }
        
        this.logger.debug(`创建条件函数实例`, {
            functionName: name,
            hasConfig: !!config
        });
        
        return instance;
    }

    createNodeFunction(name: string, config?: any): INodeFunction {
        const func = this.registry.getNodeFunction(name);
        if (!func) {
            throw new Error(`节点函数不存在: ${name}`);
        }
        
        const instance = this.createInstance(func.constructor) as INodeFunction;
        if (config) {
            instance.initialize(config);
        }
        
        this.logger.debug(`创建节点函数实例`, {
            functionName: name,
            hasConfig: !!config
        });
        
        return instance;
    }

    createRoutingFunction(name: string, config?: any): IRoutingFunction {
        const func = this.registry.getRoutingFunction(name);
        if (!func) {
            throw new Error(`路由函数不存在: ${name}`);
        }
        
        const instance = this.createInstance(func.constructor) as IRoutingFunction;
        if (config) {
            instance.initialize(config);
        }
        
        this.logger.debug(`创建路由函数实例`, {
            functionName: name,
            hasConfig: !!config
        });
        
        return instance;
    }

    createTriggerFunction(name: string, config?: any): ITriggerFunction {
        const func = this.registry.getTriggerFunction(name);
        if (!func) {
            throw new Error(`触发器函数不存在: ${name}`);
        }
        
        const instance = this.createInstance(func.constructor) as ITriggerFunction;
        if (config) {
            instance.initialize(config);
        }
        
        this.logger.debug(`创建触发器函数实例`, {
            functionName: name,
            hasConfig: !!config
        });
        
        return instance;
    }

    /**
     * 根据类型创建函数
     */
    createFunctionByType(type: WorkflowFunctionType, name: string, config?: any): IWorkflowFunction {
        switch (type) {
            case WorkflowFunctionType.CONDITION:
                return this.createConditionFunction(name, config);
            case WorkflowFunctionType.NODE:
                return this.createNodeFunction(name, config);
            case WorkflowFunctionType.ROUTING:
                return this.createRoutingFunction(name, config);
            case WorkflowFunctionType.TRIGGER:
                return this.createTriggerFunction(name, config);
            default:
                throw new Error(`不支持的函数类型: ${type}`);
        }
    }

    /**
     * 批量创建函数
     */
    createFunctions(functionConfigs: Array<{ id: string; config?: any }>): IWorkflowFunction[] {
        return functionConfigs.map(({ id, config }) => this.createFunction(id, config));
    }

    /**
     * 创建函数实例
     */
    private createInstance(constructor: any): IWorkflowFunction {
        try {
            return new constructor();
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.logger.error(`创建函数实例失败`, new Error(errorMessage), {
                constructorName: constructor.name
            });
            throw new Error(`创建函数实例失败: ${errorMessage}`);
        }
    }

    /**
     * 验证函数配置
     */
    validateFunctionConfig(functionId: string, config: any): { valid: boolean; errors: string[] } {
        const func = this.registry.getFunction(functionId);
        if (!func) {
            return {
                valid: false,
                errors: [`函数不存在: ${functionId}`]
            };
        }

        return func.validateConfig(config);
    }

    /**
     * 获取函数元数据
     */
    getFunctionMetadata(functionId: string): any {
        const func = this.registry.getFunction(functionId);
        if (!func) {
            throw new Error(`函数不存在: ${functionId}`);
        }

        return func.getMetadata();
    }

    /**
     * 列出所有可用函数
     */
    listAvailableFunctions(): Array<{ id: string; name: string; type: string; description: string }> {
        return this.registry.getAllFunctions().map(func => ({
            id: func.id,
            name: func.name,
            type: func.type,
            description: func.description
        }));
    }
}