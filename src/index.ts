/**
 * Modular Agent Framework - TypeScript版本
 * 主入口文件
 */

import { SimpleContainer } from './infrastructure/common/container';
import { Application } from './application/common/application';

// 声明全局变量
declare const console: {
  log: (...args: any[]) => void;
  error: (...args: any[]) => void;
};

declare const process: {
  env: Record<string, string | undefined>;
  exit: (code?: number) => never;
  on: (event: string, listener: () => void) => void;
};

/**
 * 应用程序启动函数
 */
async function bootstrap(): Promise<void> {
  try {
    // 创建依赖注入容器
    const container = new SimpleContainer();
    
    // 注册Application类
    container.register('Application', Application);
    
    // TODO: 注册基础设施服务
    // await registerInfrastructureServices(container);
    
    // TODO: 注册应用服务
    // await registerApplicationServices(container);
    
    // 创建并启动应用
    const app = container.get<Application>('Application');
    await app.start();
    
    if (console && console.log) {
      console.log('Modular Agent Framework 启动成功');
    }
  } catch (error) {
    if (console && console.error) {
      console.error('应用程序启动失败:', error);
    }
    if (process && process.exit) {
      process.exit(1);
    }
  }
}

// 优雅关闭处理
if (process && process.on) {
  process.on('SIGINT', () => {
    if (console && console.log) {
      console.log('收到 SIGINT 信号，正在关闭应用程序...');
    }
    if (process && process.exit) {
      process.exit(0);
    }
  });

  process.on('SIGTERM', () => {
    if (console && console.log) {
      console.log('收到 SIGTERM 信号，正在关闭应用程序...');
    }
    if (process && process.exit) {
      process.exit(0);
    }
  });
}

// 启动应用程序
bootstrap().catch((error) => {
  if (console && console.error) {
    console.error('启动过程中发生未处理的错误:', error);
  }
  if (process && process.exit) {
    process.exit(1);
  }
});