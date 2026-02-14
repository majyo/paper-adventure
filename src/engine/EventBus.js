// -*- coding: utf-8 -*-
/**
 * EventBus — 引擎与 UI 之间的事件通信桥梁
 * 支持 on / off / emit，实现单向数据流
 */
export class EventBus {
  constructor() {
    this._listeners = new Map();
  }

  /**
   * 订阅事件
   * @param {string} event 事件名
   * @param {Function} callback 回调函数
   */
  on(event, callback) {
    if (!this._listeners.has(event)) {
      this._listeners.set(event, []);
    }
    this._listeners.get(event).push(callback);
  }

  /**
   * 取消订阅
   * @param {string} event 事件名
   * @param {Function} callback 回调函数
   */
  off(event, callback) {
    const cbs = this._listeners.get(event);
    if (cbs) {
      const idx = cbs.indexOf(callback);
      if (idx !== -1) {
        cbs.splice(idx, 1);
      }
    }
  }

  /**
   * 发布事件
   * @param {string} event 事件名
   * @param {*} data 事件数据
   */
  emit(event, data) {
    const cbs = this._listeners.get(event);
    if (cbs) {
      for (const cb of cbs) {
        cb(data);
      }
    }
  }
}
