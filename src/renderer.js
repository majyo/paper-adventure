// -*- coding: utf-8 -*-
import { GameEngine } from './engine/GameEngine.js';
import { App } from './ui/App.js';

async function main() {
  try {
    const engine = new GameEngine();
    const app = new App(engine);

    const adventureData = await window.gameAPI.loadAdventure('demo');

    // 检测是否有 AI 故事模板
    if (adventureData.aiStoryTemplate) {
      showModeSelection(engine, app, adventureData);
    } else {
      await engine.startAdventure(adventureData);
    }
  } catch (err) {
    console.error('游戏启动失败:', err);
    document.getElementById('app').innerHTML = `
      <div style="color: #f4e4c1; text-align: center; padding: 40px; font-family: serif;">
        <h2>启动失败</h2>
        <p>${err.message}</p>
      </div>
    `;
  }
}

/**
 * 显示模式选择界面
 */
function showModeSelection(engine, app, adventureData) {
  const overlay = document.createElement('div');
  overlay.classList.add('mode-select-overlay');

  const panel = document.createElement('div');
  panel.classList.add('mode-select-panel');

  const title = document.createElement('div');
  title.classList.add('mode-select-title');
  title.textContent = '选择冒险模式';

  const classicBtn = document.createElement('button');
  classicBtn.classList.add('mode-select-btn');
  classicBtn.innerHTML = '<span class="mode-icon">📜</span><span class="mode-name">经典模式</span><span class="mode-desc">预设剧情，固定分支选项</span>';
  classicBtn.addEventListener('click', async () => {
    overlay.remove();
    await engine.startAdventure(adventureData);
  });

  const aiBtn = document.createElement('button');
  aiBtn.classList.add('mode-select-btn', 'mode-ai');
  aiBtn.innerHTML = '<span class="mode-icon">🤖</span><span class="mode-name">AI 模式</span><span class="mode-desc">AI 动态生成故事，自由探索</span>';
  aiBtn.addEventListener('click', async () => {
    overlay.remove();
    await engine.startAIAdventure(adventureData, adventureData.aiStoryTemplate);
  });

  // API 连接测试按钮
  const testBtn = document.createElement('button');
  testBtn.classList.add('mode-select-test-btn');
  testBtn.textContent = '测试 API 连接';
  testBtn.addEventListener('click', async () => {
    testBtn.disabled = true;
    testBtn.textContent = '测试中...';
    testBtn.className = 'mode-select-test-btn';
    try {
      const result = await window.gameAPI.testAIConnection();
      testBtn.textContent = `连接成功 — 模型: ${result.model}`;
      testBtn.classList.add('test-success');
    } catch (err) {
      testBtn.textContent = `连接失败: ${err.message}`;
      testBtn.classList.add('test-fail');
    } finally {
      testBtn.disabled = false;
    }
  });

  panel.appendChild(title);
  panel.appendChild(classicBtn);
  panel.appendChild(aiBtn);
  panel.appendChild(testBtn);
  overlay.appendChild(panel);

  document.getElementById('app').appendChild(overlay);
}

main();
