/* @flow */

import type Watcher from "./watcher";
import { remove } from "../util/index";
import config from "../config";

let uid = 0;

// Dep 作用是主要作为 Observer & Watch 之间关系的保管者（这个类似于 armor-events 例的 _events，你总是需要一个对象来维护 pub & sub 之间的关系）
/**
 * A dep is an observable that can have multiple
 * directives subscribing to it.
 */
export default class Dep {
  static target: ?Watcher;
  id: number;
  subs: Array<Watcher>;

  constructor() {
    this.id = uid++;
    this.subs = [];
  }

  // 添加订阅者
  addSub(sub: Watcher) {
    this.subs.push(sub);
  }

  // 移除订阅者
  removeSub(sub: Watcher) {
    remove(this.subs, sub);
  }

  depend() {
    // 在 Watcher 中添加自己，这样 Subscriber 和 Publisher 都可以通过 Dep 这个中间人来寻找到对象，并在需要的时候，将自己从中间人 Dep 中销毁
    if (Dep.target) {
      Dep.target.addDep(this);
    }
  }

  notify() {
    // 先创建一份当前订阅者队列的副本，相当于做一个快照，避免在 notify 时队列发生变化导致非预期的行为，该通知到的没通知，不该通知到的通知到了
    // stabilize the subscriber list first
    const subs = this.subs.slice();
    // todo:没有理解为什么调试环境需要手动对订阅者进行排序。
    if (process.env.NODE_ENV !== "production" && !config.async) {
      // subs aren't sorted in scheduler if not running async
      // we need to sort them now to make sure they fire in correct
      // order
      subs.sort((a, b) => a.id - b.id);
    }
    for (let i = 0, l = subs.length; i < l; i++) {
      subs[i].update();
    }
  }
}

// todo:代码表示它需要确保同一时间只能触发一个 Watcher，但为什么要这样？
// The current target watcher being evaluated.
// This is globally unique because only one watcher
// can be evaluated at a time.
Dep.target = null;
const targetStack = [];

export function pushTarget(target: ?Watcher) {
  targetStack.push(target);
  Dep.target = target;
}

export function popTarget() {
  targetStack.pop();
  Dep.target = targetStack[targetStack.length - 1];
}
