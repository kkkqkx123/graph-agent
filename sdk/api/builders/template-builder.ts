/**
 * TemplateBuilder - 模板构建器抽象基类
 * 继承自 BaseBuilder，添加模板注册功能
 */

import { BaseBuilder } from './base-builder';

/**
 * TemplateBuilder - 模板构建器抽象基类
 */
export abstract class TemplateBuilder<T> extends BaseBuilder<T> {
  /**
   * 注册模板到全局注册表
   * @returns this
   */
  register(): this {
    const template = this.build();
    this.registerTemplate(template);
    return this;
  }

  /**
   * 构建并注册模板
   * @returns 模板对象
   */
  buildAndRegister(): T {
    const template = this.build();
    this.registerTemplate(template);
    return template;
  }

  /**
   * 注册模板到注册表（抽象方法，子类必须实现）
   * @param template 模板对象
   */
  protected abstract registerTemplate(template: T): void;
}