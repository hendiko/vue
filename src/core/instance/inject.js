/* @flow */

import { hasOwn } from "shared/util";
import { warn, hasSymbol } from "../util/index";
import { defineReactive, toggleObserving } from "../observer/index";

export function initProvide(vm: Component) {
  const provide = vm.$options.provide;
  if (provide) {
    // xavier: 只是将 provide 对象或返回值直接挂载到 vm 实例的 _provided 属性，并未做任何响应式处理。
    vm._provided = typeof provide === "function" ? provide.call(vm) : provide;
  }
}

export function initInjections(vm: Component) {
  const result = resolveInject(vm.$options.inject, vm);
  if (result) {
    // 暂时关闭 vue 的响应观测
    toggleObserving(false);
    Object.keys(result).forEach((key) => {
      // 非生产环境下，注册响应式属性的 setter 时，额外在控制台输出一些警告信息。
      /* istanbul ignore else */
      if (process.env.NODE_ENV !== "production") {
        defineReactive(vm, key, result[key], () => {
          warn(
            `Avoid mutating an injected value directly since the changes will be ` +
              `overwritten whenever the provided component re-renders. ` +
              `injection being mutated: "${key}"`,
            vm
          );
        });
      } else {
        defineReactive(vm, key, result[key]);
      }
    });
    // 恢复 vue 的响应观测
    toggleObserving(true);
  }
}

export function resolveInject(inject: any, vm: Component): ?Object {
  if (inject) {
    // inject is :any because flow is not smart enough to figure out cached
    // xavier: 创建一个干净无原型链的空对象
    const result = Object.create(null);
    // xavier: 是否支持 symbol 选择不同的 key 枚举方法
    const keys = hasSymbol ? Reflect.ownKeys(inject) : Object.keys(inject);

    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      // todo:xavier 为什么要防止注入可观察对象
      // #6574 in case the inject object is observed...
      if (key === "__ob__") continue;
      const provideKey = inject[key].from;
      let source = vm;
      // xavier: 递归向上遍历所有父组件，挂载所有 _provided 对象
      while (source) {
        if (source._provided && hasOwn(source._provided, provideKey)) {
          result[key] = source._provided[provideKey];
          break;
        }
        source = source.$parent;
      }
      // 如果没有父组件来提供 _provided 则使用 inject 默认值
      if (!source) {
        if ("default" in inject[key]) {
          const provideDefault = inject[key].default;
          result[key] =
            typeof provideDefault === "function"
              ? provideDefault.call(vm)
              : provideDefault;
        } else if (process.env.NODE_ENV !== "production") {
          warn(`Injection "${key}" not found`, vm);
        }
      }
    }
    return result;
  }
}
