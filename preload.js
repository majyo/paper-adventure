// -*- coding: utf-8 -*-
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('gameAPI', {
  /**
   * 加载冒险数据
   * @param {string} adventureId 冒险 ID (对应 data/adventures/ 下的文件夹名)
   * @returns {Promise<object>} 冒险数据
   */
  loadAdventure: (adventureId) => ipcRenderer.invoke('load-adventure', adventureId),

  /**
   * 调用 AI 聊天 API
   * @param {Array} messages 对话历史
   * @param {Array} tools 工具定义
   * @returns {Promise<object>} AI 响应
   */
  aiChat: (messages, tools) => ipcRenderer.invoke('ai-chat', messages, tools),

  /**
   * 测试 AI API 连接
   * @returns {Promise<object>} { success, model, reply }
   */
  testAIConnection: () => ipcRenderer.invoke('ai-test-connection'),

  /**
   * 加载 AI 配置
   * @returns {Promise<object>} AI 配置
   */
  loadAIConfig: () => ipcRenderer.invoke('ai-load-config'),

  /**
   * 保存 AI 配置
   * @param {object} config AI 配置
   * @returns {Promise<object>}
   */
  saveAIConfig: (config) => ipcRenderer.invoke('ai-save-config', config),
});
