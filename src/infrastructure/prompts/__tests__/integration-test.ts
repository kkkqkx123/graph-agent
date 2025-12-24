/**
 * 提示词模块集成测试
 */

import { ConfigLoadingModule } from '../../config/loading/config-loading-module';
import { ILogger } from '../../../domain/common/types/logger-types';
import { createPromptModuleRule } from '../module-rule';

// 创建一个简单的日志记录器用于测试
class TestLogger implements ILogger {
  trace(message: string, context?: any): void {
    console.log(`[TRACE] ${message}`, context);
  }
  
  debug(message: string, context?: any): void {
    console.log(`[DEBUG] ${message}`, context);
  }
  
  info(message: string, context?: any): void {
    console.log(`[INFO] ${message}`, context);
  }
  
  warn(message: string, context?: any): void {
    console.log(`[WARN] ${message}`, context);
  }
  
  error(message: string, error?: Error, context?: any): void {
    console.log(`[ERROR] ${message}`, error, context);
  }
  
  fatal(message: string, error?: Error, context?: any): void {
    console.log(`[FATAL] ${message}`, error, context);
  }
  
  child(fields: Record<string, any>): ILogger {
    return this;
  }
}

async function runIntegrationTest() {
  console.log('开始提示词模块集成测试...');
  
  try {
    // 创建配置加载模块
    const logger = new TestLogger();
    const configLoadingModule = new ConfigLoadingModule(logger);
    
    // 注册提示词模块规则
    const promptModuleRule = createPromptModuleRule(logger);
    configLoadingModule.registerModuleRule(promptModuleRule);
    
    console.log('已注册提示词模块规则');
    
    // 加载所有配置
    const configs = await configLoadingModule.loadAllConfigs('./configs');
    
    console.log('配置加载完成');
    console.log('加载的配置模块:', Object.keys(configs));
    
    // 检查是否加载了提示词配置
    if (configs['prompts']) {
      console.log('成功加载提示词配置:');
      console.log('提示词类别:', Object.keys(configs['prompts']));
      
      // 输出一些示例配置
      for (const [category, categoryPrompts] of Object.entries(configs['prompts'] as Record<string, any>)) {
        console.log(`类别 ${category} 包含 ${Object.keys(categoryPrompts).length} 个提示词`);
        // 输出前几个提示词的名称
        const promptNames = Object.keys(categoryPrompts).slice(0, 3);
        console.log(`  示例提示词: ${promptNames.join(', ')}`);
      }
    } else {
      console.log('未找到提示词配置');
    }
    
    console.log('集成测试完成');
  } catch (error) {
    console.error('集成测试失败:', error);
  }
}

// 运行测试
if (require.main === module) {
  runIntegrationTest();
}