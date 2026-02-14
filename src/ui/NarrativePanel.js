// -*- coding: utf-8 -*-
/**
 * NarrativePanel — 叙事文本区
 * 显示场景描述，支持逐字打字机效果
 * AI 模式下支持追加式对话（DM / 玩家消息气泡）
 */
export class NarrativePanel {
  constructor(container) {
    this.container = container;
    this.container.classList.add('narrative-panel');
    this._titleEl = document.createElement('div');
    this._titleEl.classList.add('scene-title');
    this._textEl = document.createElement('div');
    this._textEl.classList.add('scene-text');
    this.container.appendChild(this._titleEl);
    this.container.appendChild(this._textEl);
    this._typewriterTimer = null;
    this._onComplete = null;
  }

  /**
   * 显示场景文本（打字机效果）— 经典模式使用，会清空之前内容
   * @param {string} title 场景标题
   * @param {string} text 场景描述
   * @param {Function} [onComplete] 打字完成回调
   */
  showScene(title, text, onComplete) {
    this._stopTypewriter();
    this._titleEl.textContent = title;
    this._textEl.textContent = '';
    this._onComplete = onComplete || null;

    let index = 0;
    const cursor = document.createElement('span');
    cursor.classList.add('cursor');

    this._textEl.appendChild(cursor);

    this._typewriterTimer = setInterval(() => {
      if (index < text.length) {
        this._textEl.insertBefore(
          document.createTextNode(text[index]),
          cursor
        );
        index++;
        this.container.scrollTop = this.container.scrollHeight;
      } else {
        this._stopTypewriter();
        cursor.remove();
        if (this._onComplete) {
          this._onComplete();
        }
      }
    }, 30);
  }

  /**
   * AI 模式：追加一条消息到对话流（打字机效果）
   * @param {string} text 消息文本
   * @param {'dm'|'player'} role 角色
   * @param {Function} [onComplete] 打字完成回调
   */
  appendMessage(text, role, onComplete) {
    this._stopTypewriter();
    this._onComplete = onComplete || null;

    // 隐藏经典模式的标题
    this._titleEl.textContent = '';

    const bubble = document.createElement('div');
    bubble.classList.add('chat-bubble', `chat-${role}`);

    const label = document.createElement('div');
    label.classList.add('chat-label');
    label.textContent = role === 'player' ? '你' : 'DM';
    bubble.appendChild(label);

    const content = document.createElement('div');
    content.classList.add('chat-content');
    bubble.appendChild(content);

    this._textEl.appendChild(bubble);

    // 玩家消息直接显示，DM 消息用打字机
    if (role === 'player') {
      content.textContent = text;
      this.container.scrollTop = this.container.scrollHeight;
      if (this._onComplete) {
        this._onComplete();
      }
    } else {
      let index = 0;
      const cursor = document.createElement('span');
      cursor.classList.add('cursor');
      content.appendChild(cursor);

      this._typewriterTimer = setInterval(() => {
        if (index < text.length) {
          content.insertBefore(
            document.createTextNode(text[index]),
            cursor
          );
          index++;
          this.container.scrollTop = this.container.scrollHeight;
        } else {
          this._stopTypewriter();
          cursor.remove();
          if (this._onComplete) {
            this._onComplete();
          }
        }
      }, 20);
    }
  }

  /**
   * 清空对话内容（重新开始时调用）
   */
  clear() {
    this._stopTypewriter();
    this._titleEl.textContent = '';
    this._textEl.innerHTML = '';
  }

  /**
   * 在叙事流中插入事件卡片（不中断打字机动画）
   * @param {{ type: string, text: string }} data 事件数据
   */
  appendEvent(data) {
    const card = this._buildEventCard(data);
    this._textEl.appendChild(card);
    this.container.scrollTop = this.container.scrollHeight;
  }

  /**
   * 构建事件卡片 DOM
   * @param {{ type: string, text: string }} data
   * @returns {HTMLElement}
   */
  _buildEventCard(data) {
    const iconMap = {
      skill_check: '🎯',
      combat: '⚔️',
      dice: '🎲',
      inventory: '🎒',
      item_use: '✨',
      system: '📜',
    };

    const card = document.createElement('div');
    card.classList.add('event-card', `event-${data.type}`);

    const icon = document.createElement('span');
    icon.classList.add('event-icon');
    icon.textContent = iconMap[data.type] || '📜';
    card.appendChild(icon);

    const body = document.createElement('span');
    body.classList.add('event-body');
    body.textContent = data.text;
    card.appendChild(body);

    return card;
  }

  skipTypewriter() {
    // 由外部调用来跳过
  }

  _stopTypewriter() {
    if (this._typewriterTimer) {
      clearInterval(this._typewriterTimer);
      this._typewriterTimer = null;
    }
  }
}
