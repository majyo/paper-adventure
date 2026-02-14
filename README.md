# Paper Adventure

基于 Electron 的桌面端文字冒险游戏引擎，集成 AI 驱动的动态叙事系统。

## 特性

- AI 驱动的动态剧情生成（支持 DeepSeek 等 OpenAI 兼容 API）
- TRPG 风格的游戏机制：骰子系统、技能检定、战斗系统
- 物品背包与状态管理
- 可扩展的冒险模组（JSON 数据驱动）
- 自由文本输入，与 AI 进行开放式互动

## 快速开始

```bash
# 安装依赖
npm install

# 配置 AI API 密钥
cp data/ai-config.example.json data/ai-config.json
# 编辑 data/ai-config.json，填入你的 API Key

# 启动游戏
npm start
```

## 项目结构

```
paper-adventure/
├── main.js                  # Electron 主进程
├── preload.js               # 预加载脚本
├── index.html               # 入口页面
├── src/
│   ├── renderer.js          # 渲染进程入口
│   ├── engine/              # 游戏引擎
│   │   ├── GameEngine.js    # 引擎核心
│   │   ├── AIStoryManager.js# AI 叙事管理
│   │   ├── SceneManager.js  # 场景管理
│   │   ├── CombatSystem.js  # 战斗系统
│   │   ├── DiceSystem.js    # 骰子系统
│   │   ├── SkillCheck.js    # 技能检定
│   │   └── InventorySystem.js# 背包系统
│   ├── ui/                  # UI 组件
│   └── styles/              # 样式
└── data/
    ├── ai-config.example.json # AI 配置示例
    └── adventures/           # 冒险模组数据
```

## 许可证

[MIT](LICENSE)
