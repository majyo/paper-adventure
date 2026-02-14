// -*- coding: utf-8 -*-
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const https = require('https');
const http = require('http');

function createWindow() {
  const win = new BrowserWindow({
    width: 1024,
    height: 768,
    minWidth: 800,
    minHeight: 600,
    title: 'Paper Adventure',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  win.loadFile('index.html');
}

// IPC: 加载冒险数据
ipcMain.handle('load-adventure', async (_event, adventureId) => {
  const basePath = path.join(__dirname, 'data', 'adventures', adventureId);

  const readJSON = (filename) => {
    const filePath = path.join(basePath, filename);
    const content = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(content);
  };

  try {
    const result = {
      manifest: readJSON('manifest.json'),
      scenes: readJSON('scenes.json'),
      enemies: readJSON('enemies.json'),
      items: readJSON('items.json'),
      player: readJSON('player.json'),
    };

    // 尝试加载 AI 故事模板（可选）
    const aiTemplatePath = path.join(basePath, 'ai_story_template.json');
    if (fs.existsSync(aiTemplatePath)) {
      result.aiStoryTemplate = JSON.parse(fs.readFileSync(aiTemplatePath, 'utf-8'));
    }

    return result;
  } catch (err) {
    console.error('加载冒险数据失败:', err);
    throw err;
  }
});

// IPC: AI 聊天请求
ipcMain.handle('ai-chat', async (_event, messages, tools) => {
  const config = _loadAIConfig();
  if (!config.apiKey) {
    throw new Error('未配置 AI API Key。请在 data/ai-config.json 中设置 apiKey。');
  }

  const url = new URL(config.apiEndpoint);
  const body = JSON.stringify({
    model: config.model,
    messages,
    tools,
    temperature: config.temperature,
    max_tokens: config.maxTokens,
  });

  return new Promise((resolve, reject) => {
    const transport = url.protocol === 'https:' ? https : http;
    const req = transport.request(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`,
      },
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.error) {
            reject(new Error(parsed.error.message || 'AI API 错误'));
          } else {
            resolve(parsed);
          }
        } catch (e) {
          reject(new Error('AI 响应解析失败'));
        }
      });
    });

    req.on('error', (err) => { reject(err); });
    req.setTimeout(60000, () => {
      req.destroy();
      reject(new Error('AI 请求超时'));
    });
    req.write(body);
    req.end();
  });
});

// IPC: AI 连接测试
ipcMain.handle('ai-test-connection', async () => {
  const config = _loadAIConfig();
  if (!config.apiKey) {
    throw new Error('未配置 API Key');
  }

  const url = new URL(config.apiEndpoint);
  const body = JSON.stringify({
    model: config.model,
    messages: [{ role: 'user', content: '你好，请回复"连接成功"四个字。' }],
    max_tokens: 32,
  });

  return new Promise((resolve, reject) => {
    const transport = url.protocol === 'https:' ? https : http;
    const req = transport.request(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`,
      },
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.error) {
            reject(new Error(parsed.error.message || 'API 错误'));
          } else {
            const reply = parsed.choices?.[0]?.message?.content || '';
            resolve({ success: true, model: parsed.model || config.model, reply });
          }
        } catch (e) {
          reject(new Error('响应解析失败'));
        }
      });
    });

    req.on('error', (err) => { reject(err); });
    req.setTimeout(15000, () => {
      req.destroy();
      reject(new Error('请求超时'));
    });
    req.write(body);
    req.end();
  });
});

// IPC: 加载 AI 配置
ipcMain.handle('ai-load-config', async () => {
  return _loadAIConfig();
});

// IPC: 保存 AI 配置
ipcMain.handle('ai-save-config', async (_event, config) => {
  const configPath = path.join(__dirname, 'data', 'ai-config.json');
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');
  return { success: true };
});

/**
 * 读取 AI 配置文件
 */
function _loadAIConfig() {
  const configPath = path.join(__dirname, 'data', 'ai-config.json');
  try {
    return JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  } catch (e) {
    return {
      apiEndpoint: 'https://api.deepseek.com/v1/chat/completions',
      model: 'deepseek-chat',
      temperature: 0.8,
      maxTokens: 1024,
      apiKey: '',
    };
  }
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
