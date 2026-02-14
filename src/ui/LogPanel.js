// -*- coding: utf-8 -*-
/**
 * LogPanel — 游戏日志面板
 * 显示骰子结果、战斗记录等
 */
export class LogPanel {
  constructor(container) {
    this.container = container;
    this.container.classList.add('log-panel');

    const header = document.createElement('div');
    header.classList.add('log-header');
    header.textContent = '📜 日志';
    this.container.appendChild(header);

    this._logList = document.createElement('div');
    this._logList.classList.add('log-list');
    this.container.appendChild(this._logList);
  }

  /**
   * 添加日志消息
   * @param {object} data { type, text }
   */
  addMessage(data) {
    const entry = document.createElement('div');
    entry.classList.add('log-entry', `log-${data.type || 'system'}`);
    entry.textContent = data.text;
    this._logList.appendChild(entry);

    // 自动滚动到最新
    this._logList.scrollTop = this._logList.scrollHeight;
  }

  /**
   * 清空日志
   */
  clear() {
    this._logList.innerHTML = '';
  }
}
