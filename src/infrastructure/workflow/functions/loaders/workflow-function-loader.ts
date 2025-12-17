import { injectable, inject } from 'inversify';
import { 
    IWorkflowFunctionLoader,
    IWorkflowFunction,
    WorkflowFunctionType,
    ILogger 
} from '../../../../domain/workflow/interfaces/workflow-functions';
import { FunctionRegistry } from '../registry/function-registry';
import { BaseWorkflowFunction } from '../base/base-workflow-function';

/**
 * 工作流函数加载器实现
 */
@injectable()
export class WorkflowFunctionLoader implements IWorkflowFunctionLoader {
    private _loaded: boolean = false;

    constructor(
        @inject('FunctionRegistry') private readonly registry: FunctionRegistry,
        @inject('Logger') private readonly logger: ILogger
    ) {}

    async loadFunctions(type?: WorkflowFunctionType): Promise<IWorkflowFunction[]> {
        // 确保函数已加载
        if (!this._loaded) {
            await this.loadAllFunctions();
            this._loaded = true;
        }
        
        // 根据类型过滤
        if (type) {
            return this.registry.getFunctionsByType(type);
        }
        
        return this.registry.getAllFunctions();
    }

    async loadFunctionById(functionId: string): Promise<IWorkflowFunction | null> {
        // 确保函数已加载
        if (!this._loaded) {
            await this.loadAllFunctions();
            this._loaded = true;
        }
        
        return this.registry.getFunction(functionId);
    }

    async loadFunctionByName(name: string): Promise<IWorkflowFunction | null> {
        // 确保函数已加载
        if (!this._loaded) {
            await this.loadAllFunctions();
            this._loaded = true;
        }
        
        return this.registry.getFunctionByName(name);
    }

    private async loadAllFunctions(): Promise<void> {
        try {
            // 加载内置函数
            await this.loadBuiltinFunctions();
            
            // 加载自定义函数
            await this.loadCustomFunctions();
            
            this.logger.info('工作流函数加载完成', {
                totalFunctions: this.registry.getAllFunctions().length
            });
        } catch (error) {
            this.logger.error('工作流函数加载失败', { error: error.message });
            throw error;
        }
    }

    private async loadBuiltinFunctions(): Promise<void> {
        // 动态导入并注册所有内置函数
        const conditionFunctions = await import('../builtin/conditions');
        const nodeFunctions = await import('../builtin/nodes');
        const routingFunctions = await import('../builtin/routing');
        const triggerFunctions = await import('../builtin/triggers');

        // 注册条件函数
        this.registerFunctionsFromModule(conditionFunctions, WorkflowFunctionType.CONDITION);

        // 注册节点函数
        this.registerFunctionsFromModule(nodeFunctions, WorkflowFunctionType.NODE);

        // 注册路由函数
        this.registerFunctionsFromModule(routingFunctions, WorkflowFunctionType.ROUTING);

        // 注册触发器函数
        this.registerFunctionsFromModule(triggerFunctions, WorkflowFunctionType.TRIGGER);
    }

    private registerFunctionsFromModule(module: any, expectedType: WorkflowFunctionType): void {
        Object.values(module).forEach(funcClass => {
            if (this.isWorkflowFunctionClass(funcClass)) {
                try {
                    const instance = new funcClass();
                    
                    // 验证函数类型
                    if (instance.type !== expectedType) {
                        this.logger.warn(`函数类型不匹配`, {
                            functionName: instance.name,
                            expectedType,
                            actualType: instance.type
                        });
                        return;
                    }
                    
                    this.registry.registerFunction(instance);
                    this.logger.debug(`注册函数成功`, {
                        id: instance.id,
                        name: instance.name,
                        type: instance.type
                    });
                } catch (error) {
                    this.logger.error(`注册函数失败`, {
                        functionName: funcClass.name,
                        error: error.message
                    });
                }
            }
        });
    }

    private async loadCustomFunctions(): Promise<void> {
        // 从配置文件加载自定义函数
        // 这里可以实现自定义函数的动态加载逻辑
        // 例如从指定目录加载JavaScript/TypeScript文件
        
        // 示例：从环境变量或配置中获取自定义函数目录
        const customFunctionsDir = process.env.CUSTOM_FUNCTIONS_DIR;
        
        if (customFunctionsDir) {
            this.logger.info(`尝试从目录加载自定义函数: ${customFunctionsDir}`);
            // 实现自定义函数加载逻辑
        }
    }

    private isWorkflowFunctionClass(obj: any): obj is typeof BaseWorkflowFunction {
        return obj && 
               typeof obj === 'function' && 
               obj.prototype instanceof BaseWorkflowFunction;
    }

    /**
     * 重新加载所有函数
     */
    async reloadFunctions(): Promise<void> {
        // 清空注册表
        this.registry.clear();
        
        // 重置加载状态
        this._loaded = false;
        
        // 重新加载
        await this.loadAllFunctions();
    }
}