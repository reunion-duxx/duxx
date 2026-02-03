// 渲染引擎 - 8bit像素风格

class UIRenderer {
    constructor(ctx) {
        this.ctx = ctx;
        this.canvas = ctx.canvas;
        this.cardWidth = 50;
        this.cardHeight = 70;
        this.scale = 1.0; // 缩放比例（用于移动端适配）

        // 初始化Canvas上下文状态
        this.initCanvasContext();
    }

    // 初始化Canvas上下文状态
    initCanvasContext() {
        // 关闭抗锯齿,保持像素块清晰
        this.ctx.imageSmoothingEnabled = false;

        // 设置文字渲染基线
        this.ctx.textBaseline = 'top';

        // 强制重新应用字体(确保字体加载完成后被应用)
        this.ctx.font = '11px "Press Start 2P", monospace';
    }

    // 清空画布
    clear() {
        this.ctx.fillStyle = '#1a5c3c';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // 重新设置字体和渲染属性（fillRect 可能会重置某些状态）
        this.ctx.imageSmoothingEnabled = false;
        this.ctx.font = '11px "Press Start 2P", monospace';
    }

    // 绘制顶部信息栏
    drawTopBar(gameState) {
        const padding = 10 * this.scale;
        const y = 20 * this.scale;
        const fontSize = Math.max(8, Math.floor(11 * this.scale));

        this.ctx.font = `${fontSize}px "Press Start 2P", monospace`;
        this.ctx.fillStyle = '#fff';
        this.ctx.textAlign = 'left';
        this.ctx.textBaseline = 'top';

        // 关卡
        this.ctx.fillText(`关卡: ${gameState.level}`, padding, y);

        // 回合 - 根据maxRounds动态显示
        // Boss关：完美主义者严格限制2回合，不允许B评价的第3回合
        let maxDisplayRounds;
        if (gameState.isBossLevel && gameState.bossRule === 'perfectionist') {
            maxDisplayRounds = gameState.maxRounds; // 完美主义者：严格2回合
        } else {
            maxDisplayRounds = gameState.maxRounds + 1; // 普通关卡：+1允许B评价
        }
        this.ctx.fillText(`回合: ${gameState.round}/${maxDisplayRounds}`, 120 * this.scale, y);

        // 行动点
        this.ctx.fillStyle = gameState.actionPoints > 0 ? '#3498db' : '#e74c3c';
        this.ctx.fillText(`行动点: ${gameState.actionPoints}/${gameState.maxActionPoints}`, 250 * this.scale, y);

        // 弃牌点 (显示当前消耗)
        this.ctx.fillStyle = gameState.discardPoints >= gameState.currentDiscardCost ? '#9b59b6' : '#e74c3c';
        this.ctx.fillText(`弃牌:${gameState.discardPoints}/${gameState.maxDiscardPoints}(消耗${gameState.currentDiscardCost})`, 410 * this.scale, y);

        // 分数
        this.ctx.fillStyle = '#fff';
        this.ctx.fillText(`分数: ${gameState.score}`, 540 * this.scale, y);

        // Combo
        const comboText = `Combo: x${gameState.combo.toFixed(1)}`;
        this.ctx.fillStyle = gameState.combo > 1.0 ? '#f39c12' : '#fff';
        this.ctx.fillText(comboText, 680 * this.scale, y);

        // 牌库剩余 (第二行)
        this.ctx.fillStyle = gameState.deckCards.length > 0 ? '#2ecc71' : '#e74c3c';
        this.ctx.fillText(`牌库: ${gameState.deckCards.length}`, padding, y + 20 * this.scale);

        // 封印状态 (第二行)
        if (gameState.sealedPatterns && gameState.sealedPatterns.length > 0) {
            this.ctx.fillStyle = '#e74c3c';
            const sealedText = `封印: ${gameState.sealedPatterns.join(', ')}`;
            this.ctx.fillText(sealedText, 150 * this.scale, y + 20 * this.scale);
        }

        // Boss关规则提示
        if (gameState.isBossLevel && gameState.bossRule) {
            this.ctx.fillStyle = '#9b59b6';  // 紫色表示Boss关
            this.ctx.font = `${Math.max(8, Math.floor(12 * this.scale))}px "Press Start 2P", monospace`;

            const bossRuleNames = {
                'greedyLandlord': '👑 Boss: 贪婪地主 - 每手牌必须比上一手更大',
                'perfectionist': '💎 Boss: 完美主义者 - 2回合内完成，积分需达1.5倍',
                'orderGuardian': '🛡️ Boss: 秩序守护者 - 按顺序解锁牌型',
                'chaosMage': '🎭 Boss: 混乱法师 - 每回合随机交换牌型消耗',
                'pressureTester': '⚡ Boss: 压力测试者 - 无法弃牌，手牌>15张会惩罚'
            };

            const bossText = bossRuleNames[gameState.bossRule] || 'Boss关卡';
            this.ctx.fillText(bossText, 400 * this.scale, y + 20 * this.scale);
        }
        // 特殊规则提示 (第二行或第三行)
        else if (gameState.specialRule === 'timeLimit') {
            this.ctx.fillStyle = '#e74c3c';
            const remaining = gameState.getRemainingTime();
            const timeText = `限时关卡! 剩余: ${remaining}s`;
            this.ctx.fillText(timeText, 400 * this.scale, y + 20 * this.scale);
        } else if (gameState.specialRule === 'doubleCost') {
            this.ctx.fillStyle = '#e67e22';
            const patternNames = {
                'PAIR': '对子', 'TRIPLE': '三张', 'STRAIGHT': '顺子',
                'DOUBLE_STRAIGHT': '连对', 'AIRPLANE': '飞机'
            };
            const patternName = patternNames[gameState.specialRuleData.pattern] || '未知';
            const costText = `消耗加倍: ${patternName}x2`;
            this.ctx.fillText(costText, 400 * this.scale, y + 20 * this.scale);
        }

        // 豪赌状态提示
        if (gameState.gambleLevelActive) {
            this.ctx.fillStyle = '#e74c3c';
            this.ctx.font = `${Math.max(7, Math.floor(10 * this.scale))}px "Press Start 2P", monospace`;
            this.ctx.textAlign = 'center';
            this.ctx.fillText('🎰 豪赌模式激活! 目标: S评价 (2回合内)', this.canvas.width / 2, 5 * this.scale);
        }
    }

    // 绘制手牌区
    drawHandCards(cards, selectedIndices, level = 1) {
        const startX = 50 * this.scale;
        const rowSpacing = 90 * this.scale; // 行间距

        // 判断是否需要两行显示
        if (level >= 5) {
            // 两行显示逻辑
            const midPoint = Math.ceil(cards.length / 2);
            const topRowCards = cards.slice(0, midPoint);
            const bottomRowCards = cards.slice(midPoint);

            // 计算每行的间距
            const topGap = Math.min(60 * this.scale, (this.canvas.width - 100 * this.scale) / topRowCards.length);
            const bottomGap = Math.min(60 * this.scale, (this.canvas.width - 100 * this.scale) / bottomRowCards.length);

            // 绘制上行
            const topY = this.canvas.height - this.cardHeight - 80 * this.scale - rowSpacing;
            topRowCards.forEach((card, i) => {
                const x = startX + i * topGap;
                const y = selectedIndices.includes(i) ? topY - 15 * this.scale : topY;
                this.drawCard(card, x, y, selectedIndices.includes(i));
            });

            // 绘制下行
            const bottomY = this.canvas.height - this.cardHeight - 80 * this.scale;
            bottomRowCards.forEach((card, i) => {
                const index = midPoint + i;
                const x = startX + i * bottomGap;
                const y = selectedIndices.includes(index) ? bottomY - 15 * this.scale : bottomY;
                this.drawCard(card, x, y, selectedIndices.includes(index));
            });
        } else {
            // 单行显示逻辑（保持原有逻辑）
            const startY = this.canvas.height - this.cardHeight - 80 * this.scale;
            const gap = Math.min(60 * this.scale, (this.canvas.width - 100 * this.scale) / cards.length);

            cards.forEach((card, index) => {
                const x = startX + index * gap;
                const y = selectedIndices.includes(index) ? startY - 15 * this.scale : startY;
                this.drawCard(card, x, y, selectedIndices.includes(index));
            });
        }

        // 显示手牌数量
        this.ctx.font = `${Math.max(7, Math.floor(10 * this.scale))}px "Press Start 2P", monospace`;
        this.ctx.fillStyle = '#ecf0f1';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'top';
        this.ctx.fillText(`剩余手牌: ${cards.length}`, this.canvas.width / 2, this.canvas.height - 10 * this.scale);
    }

    // 绘制单张扑克牌 (像素风格)
    drawCard(card, x, y, selected) {
        const w = this.cardWidth;
        const h = this.cardHeight;

        // 卡牌背景（升级牌使用金色背景）
        if (card.isUpgraded) {
            this.ctx.fillStyle = selected ? '#f9e79f' : '#fef5e7';
        } else {
            this.ctx.fillStyle = selected ? '#ecf0f1' : '#fff';
        }
        this.ctx.fillRect(x, y, w, h);

        // 卡牌边框（升级牌使用金色边框）
        if (card.isUpgraded) {
            this.ctx.strokeStyle = selected ? '#f39c12' : '#f1c40f';
            this.ctx.lineWidth = Math.max(2, 3 * this.scale);
        } else {
            this.ctx.strokeStyle = selected ? '#f39c12' : '#000';
            this.ctx.lineWidth = selected ? Math.max(2, 3 * this.scale) : Math.max(1, 2 * this.scale);
        }
        this.ctx.strokeRect(x, y, w, h);

        // 点数和花色颜色
        const color = card.isRed() ? '#e74c3c' : '#000';
        this.ctx.fillStyle = color;
        this.ctx.font = `${Math.max(8, Math.floor(12 * this.scale))}px "Press Start 2P", monospace`;
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'top';

        // 绘制点数
        const rankText = card.rank === '10' ? '10' : card.rank;
        this.ctx.fillText(rankText, x + w / 2, y + 8 * this.scale);

        // 绘制花色符号
        if (card.suit !== 'joker') {
            const suitSymbols = {
                'hearts': '♥',
                'spades': '♠',
                'diamonds': '♦',
                'clubs': '♣'
            };
            this.ctx.font = `${Math.max(12, Math.floor(20 * this.scale))}px Arial, sans-serif`;
            this.ctx.textBaseline = 'alphabetic';
            this.ctx.fillText(suitSymbols[card.suit], x + w / 2, y + h - 15 * this.scale);
        }

        // 升级牌标记
        if (card.isUpgraded) {
            this.ctx.font = `${Math.max(6, Math.floor(8 * this.scale))}px "Press Start 2P", monospace`;
            this.ctx.fillStyle = '#e67e22';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText('+20', x + w / 2, y + h / 2 + 5 * this.scale);
        }
    }

    // 绘制出牌区域
    drawPlayArea(lastPlayed, lastScore) {
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2 - 50 * this.scale;

        if (lastPlayed && lastPlayed.cards) {
            // 显示牌型名称
            this.ctx.font = `${Math.max(10, Math.floor(16 * this.scale))}px "Press Start 2P", monospace`;
            this.ctx.fillStyle = '#f39c12';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'top';
            this.ctx.fillText(lastPlayed.name, centerX, centerY - 60 * this.scale);

            // 显示得分
            this.ctx.font = `${Math.max(12, Math.floor(20 * this.scale))}px "Press Start 2P", monospace`;
            this.ctx.fillStyle = '#2ecc71';
            this.ctx.textBaseline = 'top';
            this.ctx.fillText(`+${lastScore}分`, centerX, centerY - 30 * this.scale);

            // 绘制出的牌
            const startX = centerX - (lastPlayed.cards.length * 60 * this.scale) / 2;
            lastPlayed.cards.forEach((card, index) => {
                this.drawCard(card, startX + index * 60 * this.scale, centerY, false);
            });
        } else {
            // 提示文字
            this.ctx.font = `${Math.max(8, Math.floor(12 * this.scale))}px "Press Start 2P", monospace`;
            this.ctx.fillStyle = '#95a5a6';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'top';
            this.ctx.fillText('选择手牌后点击"出牌"', centerX, centerY);
        }
    }

    // 绘制提示信息
    drawHint(message, color = '#fff') {
        this.ctx.font = `${Math.max(7, Math.floor(10 * this.scale))}px "Press Start 2P", monospace`;
        this.ctx.fillStyle = color;
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'top';
        this.ctx.fillText(message, this.canvas.width / 2, 50 * this.scale);
    }

    // 绘制加载动画
    drawLoading() {
        this.clear();
        this.ctx.font = `${Math.max(10, Math.floor(16 * this.scale))}px "Press Start 2P", monospace`;
        this.ctx.fillStyle = '#f39c12';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'top';
        this.ctx.fillText('加载中...', this.canvas.width / 2, this.canvas.height / 2);
    }

    // 获取鼠标点击的牌索引
    getCardIndexAt(mouseX, mouseY, cards, level = 1) {
        const startX = 50 * this.scale;
        const rowSpacing = 90 * this.scale;

        if (level >= 5) {
            // 两行点击检测
            const midPoint = Math.ceil(cards.length / 2);
            const topRowCards = cards.slice(0, midPoint);
            const bottomRowCards = cards.slice(midPoint);

            const topGap = Math.min(60 * this.scale, (this.canvas.width - 100 * this.scale) / topRowCards.length);
            const bottomGap = Math.min(60 * this.scale, (this.canvas.width - 100 * this.scale) / bottomRowCards.length);

            // 先检测下行（在前景）
            const bottomY = this.canvas.height - this.cardHeight - 80 * this.scale;
            for (let i = 0; i < bottomRowCards.length; i++) {
                const x = startX + i * bottomGap;
                if (mouseX >= x && mouseX <= x + this.cardWidth &&
                    mouseY >= bottomY - 15 * this.scale && mouseY <= bottomY + this.cardHeight) {
                    return midPoint + i;
                }
            }

            // 再检测上行
            const topY = this.canvas.height - this.cardHeight - 80 * this.scale - rowSpacing;
            for (let i = 0; i < topRowCards.length; i++) {
                const x = startX + i * topGap;
                if (mouseX >= x && mouseX <= x + this.cardWidth &&
                    mouseY >= topY - 15 * this.scale && mouseY <= topY + this.cardHeight) {
                    return i;
                }
            }
        } else {
            // 单行点击检测（保持原有逻辑）
            const startY = this.canvas.height - this.cardHeight - 80 * this.scale;
            const gap = Math.min(60 * this.scale, (this.canvas.width - 100 * this.scale) / cards.length);

            for (let i = 0; i < cards.length; i++) {
                const x = startX + i * gap;
                if (mouseX >= x && mouseX <= x + this.cardWidth &&
                    mouseY >= startY - 15 * this.scale && mouseY <= startY + this.cardHeight) {
                    return i;
                }
            }
        }

        return -1;
    }

    // 更新左侧状态栏
    updateLeftSidebar(gameState) {
        // 更新关卡积分
        const levelScoreDiv = document.getElementById('levelScoreInfo');
        if (levelScoreDiv) {
            // Boss关：完美主义者使用特殊积分要求
            let targetScore = gameState.levelScoreRequirement;
            if (gameState.isBossLevel && gameState.bossRule === 'perfectionist' && gameState.bossRuleData.requiredScore) {
                targetScore = gameState.bossRuleData.requiredScore;
            }

            const progressPercent = Math.min(100, Math.floor((gameState.levelScore / targetScore) * 100));
            const color = gameState.levelScore >= targetScore ? '#2ecc71' : '#e74c3c';
            let levelScoreInfo = `
                <div style="color: ${color}; margin-bottom: 5px;">
                    当前: ${gameState.levelScore} / ${targetScore}
                </div>
                <div style="color: #ecf0f1;">
                    进度: ${progressPercent}%
                </div>
            `;

            // Boss关：完美主义者特殊提示
            if (gameState.isBossLevel && gameState.bossRule === 'perfectionist') {
                levelScoreInfo += `
                    <div style="color: #f39c12; margin-top: 10px; font-size: 10px;">
                        💎 Boss要求:<br/>
                        积分×1.5<br/>
                        限2回合
                    </div>
                `;
            }

            // 豪赌模式提示
            if (gameState.gambleLevelActive) {
                levelScoreInfo += `
                    <div style="color: #e74c3c; margin-top: 10px; font-size: 10px;">
                        🎲 豪赌模式:<br/>
                        S评价→×2.0<br/>
                        其他→×0.5
                    </div>
                `;
            }

            levelScoreDiv.innerHTML = levelScoreInfo;
        }

        // 更新牌型消耗
        const patternCostsDiv = document.getElementById('patternCosts');
        if (patternCostsDiv) {
            const patternNames = {
                'SINGLE': '单牌',
                'PAIR': '对子',
                'TRIPLE': '三张',
                'TRIPLE_SINGLE': '三带一',
                'TRIPLE_PAIR': '三带二',
                'STRAIGHT': '顺子',
                'DOUBLE_STRAIGHT': '连对',
                'AIRPLANE': '飞机',
                'AIRPLANE_SINGLE_WINGS': '飞机带单',
                'AIRPLANE_PAIR_WINGS': '飞机带对',
                'FOUR_PAIR': '四带二',
                'BOMB': '炸弹',
                'ROCKET': '火箭'
            };

            let html = '';
            for (const [key, name] of Object.entries(patternNames)) {
                const cost = gameState.actionPointCosts[key];
                if (cost !== undefined) {
                    let costText = cost.toString();
                    if (key === 'SINGLE') costText = '2-1.5';  // 单牌特殊显示
                    if (key === 'BOMB') costText += ' (+1)';
                    if (key === 'ROCKET') costText += ' (+3)';
                    html += `<div style="color: #ecf0f1;">${name}: ${costText}点</div>`;
                }
            }
            patternCostsDiv.innerHTML = html;
        }

        // 更新生效道具
        const activeEffectsDiv = document.getElementById('activeEffects');
        if (activeEffectsDiv) {
            let effectsHtml = '';

            // 当前特质
            if (gameState.currentTrait) {
                effectsHtml += `<div style="color: #9b59b6;">🌟 ${gameState.currentTrait.name}</div>`;
            }

            // 节能模式
            if (gameState.energySaverActive) {
                effectsHtml += '<div style="color: #2ecc71;">✓ 节能模式: 消耗减半</div>';
            }

            // 弃牌抽奖
            if (gameState.discardDrawBonus > 0) {
                effectsHtml += `<div style="color: #9b59b6;">✓ 弃牌抽奖: +${gameState.discardDrawBonus}张</div>`;
            }

            // 弃旧图新
            if (gameState.permanentDiscardDrawBonus > 0) {
                effectsHtml += `<div style="color: #3498db;">✓ 弃旧图新: +${gameState.permanentDiscardDrawBonus}张</div>`;
            }

            // 去粗取精
            if (gameState.discardScorePerCard > 0) {
                effectsHtml += `<div style="color: #f39c12;">✓ 去粗取精: ${gameState.discardScorePerCard}分/张</div>`;
            }

            // 超级弃牌
            if (gameState.extraDiscardAvailable) {
                effectsHtml += '<div style="color: #e74c3c;">✓ 超级弃牌: 可额外弃牌</div>';
            }

            // 行动点核心
            if (gameState.permanentActionBonus > 0) {
                effectsHtml += `<div style="color: #3498db;">✓ 行动点核心: +${gameState.permanentActionBonus}点</div>`;
            }

            // 存钱罐系列
            const piggyItems = gameState.permanentItems.filter(i =>
                ['piggy_gold', 'piggy_diamond', 'piggy_king'].includes(i.id)
            );
            if (piggyItems.length > 0) {
                const bonuses = piggyItems.map(i => {
                    if (i.id === 'piggy_gold') return 20;
                    if (i.id === 'piggy_diamond') return 50;
                    if (i.id === 'piggy_king') return 100;
                    return 0;
                });
                const total = bonuses.reduce((a, b) => a + b, 0);
                effectsHtml += `<div style="color: #f1c40f;">✓ 存钱罐: 每局+${total}分</div>`;
            }

            // 幸运四叶草
            if (gameState.permanentItems.find(i => i.id === 'lucky_clover')) {
                effectsHtml += `<div style="color: #2ecc71;">✓ 幸运四叶草: 20%王牌</div>`;
            }

            // Boss奖励效果
            if (gameState.bossRuleData.permanentDiscardBonus) {
                effectsHtml += `<div style="color: #9b59b6;">✓ Boss奖励: 每回合+1弃牌点</div>`;
            }
            if (gameState.bossRuleData.permanentScoreBonus) {
                effectsHtml += `<div style="color: #9b59b6;">✓ Boss奖励: 积分+20%</div>`;
            }
            if (gameState.bossRuleData.permanentActionBonus) {
                effectsHtml += `<div style="color: #9b59b6;">✓ Boss奖励: 每回合+${gameState.bossRuleData.permanentActionBonus}行动点</div>`;
            }

            // Boss规则特殊状态
            if (gameState.isBossLevel && gameState.bossRule) {
                if (gameState.bossRule === 'orderGuardian') {
                    const patternNames = {
                        'SINGLE': '单牌', 'PAIR': '对子', 'TRIPLE': '三张',
                        'TRIPLE_SINGLE': '三带一', 'TRIPLE_PAIR': '三带二',
                        'STRAIGHT': '顺子', 'DOUBLE_STRAIGHT': '连对',
                        'AIRPLANE': '飞机', 'AIRPLANE_SINGLE_WINGS': '飞机带单翅膀',
                        'AIRPLANE_PAIR_WINGS': '飞机带对翅膀',
                        'BOMB': '炸弹', 'FOUR_PAIR': '四带二'
                    };
                    const currentGroup = gameState.bossRuleData.patternGroups[gameState.bossRuleData.currentGroupIndex];
                    const groupNames = currentGroup.map(p => patternNames[p]).join('/');
                    effectsHtml += `<div style="color: #e67e22;">⚠ 当前可用: ${groupNames}</div>`;
                }
                if (gameState.bossRule === 'chaosMage' && gameState.bossRuleData.swappedPatterns) {
                    const patternNames = {
                        'SINGLE': '单牌', 'PAIR': '对子', 'TRIPLE': '三张',
                        'STRAIGHT': '顺子', 'BOMB': '炸弹'
                    };
                    const p1 = patternNames[gameState.bossRuleData.swappedPatterns[0]];
                    const p2 = patternNames[gameState.bossRuleData.swappedPatterns[1]];
                    effectsHtml += `<div style="color: #e67e22;">⚠ 消耗互换: ${p1}↔${p2}</div>`;
                }
            }

            if (effectsHtml === '') {
                effectsHtml = '<div style="color: #95a5a6;">暂无生效道具</div>';
            }

            activeEffectsDiv.innerHTML = effectsHtml;
        }
    }

    // 渲染特质选择界面
    renderTraitSelection(traits, onSelect) {
        const traitModal = document.getElementById('traitModal');
        const traitOptions = document.getElementById('traitOptions');

        if (!traitModal || !traitOptions) {
            console.error('特质选择界面元素未找到');
            return;
        }

        traitOptions.innerHTML = '';

        traits.forEach(trait => {
            const traitDiv = document.createElement('div');
            traitDiv.className = 'trait-option';

            const nameDiv = document.createElement('div');
            nameDiv.className = 'trait-name';
            nameDiv.textContent = trait.name;

            const descDiv = document.createElement('div');
            descDiv.className = 'trait-desc';
            descDiv.textContent = trait.description;

            traitDiv.appendChild(nameDiv);
            traitDiv.appendChild(descDiv);

            traitDiv.addEventListener('click', () => {
                onSelect(trait);
                traitModal.style.display = 'none';
            });

            traitOptions.appendChild(traitDiv);
        });

        traitModal.style.display = 'flex';
    }
}

// 动画系统
class AnimationManager {
    constructor() {
        this.animations = [];
        this.screenShake = null; // 屏幕震动效果
    }

    // 添加动画
    add(animation) {
        this.animations.push(animation);
    }

    // 触发屏幕震动
    triggerScreenShake(intensity = 3, duration = 400) {
        this.screenShake = {
            intensity: intensity,
            duration: duration,
            elapsed: 0
        };
    }

    // 更新所有动画
    update(deltaTime) {
        this.animations = this.animations.filter(anim => {
            anim.update(deltaTime);
            return !anim.finished;
        });

        // 更新屏幕震动
        if (this.screenShake) {
            this.screenShake.elapsed += deltaTime;
            if (this.screenShake.elapsed >= this.screenShake.duration) {
                this.screenShake = null;
            }
        }
    }

    // 获取当前屏幕震动偏移
    getShakeOffset() {
        if (!this.screenShake) {
            return { x: 0, y: 0 };
        }

        // 震动强度随时间衰减
        const progress = this.screenShake.elapsed / this.screenShake.duration;
        const currentIntensity = this.screenShake.intensity * (1 - progress);

        return {
            x: (Math.random() - 0.5) * 2 * currentIntensity,
            y: (Math.random() - 0.5) * 2 * currentIntensity
        };
    }

    // 渲染所有动画
    render(ctx) {
        this.animations.forEach(anim => anim.render(ctx));
    }

    // 清空所有动画
    clear() {
        this.animations = [];
        this.screenShake = null;
    }
}

// Combo弹出动画
class ComboPopupAnimation {
    constructor(combo, x, y) {
        this.combo = combo;
        this.x = x;
        this.y = y;
        this.startY = y;
        this.alpha = 1.0;
        this.time = 0;
        this.duration = 1000; // 1秒
        this.finished = false;
    }

    update(deltaTime) {
        this.time += deltaTime;
        if (this.time >= this.duration) {
            this.finished = true;
            return;
        }

        const progress = this.time / this.duration;
        this.y = this.startY - progress * 50;
        this.alpha = 1.0 - progress;
    }

    render(ctx) {
        ctx.save();
        ctx.globalAlpha = this.alpha;
        ctx.font = '24px "Press Start 2P", monospace';
        ctx.fillStyle = '#f39c12';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText(`COMBO x${this.combo.toFixed(1)}`, this.x, this.y);
        ctx.restore();
    }
}

// 炸弹爆炸特效
class BombExplosionAnimation {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.time = 0;
        this.duration = 600; // 0.6秒
        this.finished = false;
        this.particles = [];

        // 创建8个粒子
        for (let i = 0; i < 8; i++) {
            const angle = (Math.PI * 2 * i) / 8;
            this.particles.push({
                x: 0,
                y: 0,
                vx: Math.cos(angle) * 2,
                vy: Math.sin(angle) * 2,
                size: 8
            });
        }
    }

    update(deltaTime) {
        this.time += deltaTime;
        if (this.time >= this.duration) {
            this.finished = true;
            return;
        }

        // 更新粒子位置
        this.particles.forEach(p => {
            p.x += p.vx;
            p.y += p.vy;
        });
    }

    render(ctx) {
        const progress = this.time / this.duration;
        const alpha = 1.0 - progress;

        ctx.save();
        ctx.globalAlpha = alpha;

        // 绘制中心闪光
        ctx.fillStyle = '#ff6b6b';
        ctx.beginPath();
        ctx.arc(this.x, this.y, 20 * (1 - progress), 0, Math.PI * 2);
        ctx.fill();

        // 绘制粒子
        ctx.fillStyle = '#ff9f43';
        this.particles.forEach(p => {
            ctx.fillRect(
                this.x + p.x - p.size / 2,
                this.y + p.y - p.size / 2,
                p.size,
                p.size
            );
        });

        ctx.restore();
    }
}

// 火箭发射特效
class RocketLaunchAnimation {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.startY = y;
        this.time = 0;
        this.duration = 800; // 0.8秒
        this.finished = false;
        this.trails = [];

        // 创建尾焰粒子
        for (let i = 0; i < 5; i++) {
            this.trails.push({
                offsetY: i * 10,
                alpha: 1.0 - i * 0.15
            });
        }
    }

    update(deltaTime) {
        this.time += deltaTime;
        if (this.time >= this.duration) {
            this.finished = true;
            return;
        }

        // 火箭向上移动
        const progress = this.time / this.duration;
        this.y = this.startY - progress * 150;
    }

    render(ctx) {
        const progress = this.time / this.duration;
        const alpha = 1.0 - progress;

        ctx.save();

        // 绘制尾焰
        this.trails.forEach((trail, i) => {
            ctx.globalAlpha = alpha * trail.alpha;
            ctx.fillStyle = i % 2 === 0 ? '#ff6348' : '#ffa502';
            ctx.fillRect(
                this.x - 6,
                this.y + trail.offsetY,
                12,
                8
            );
        });

        // 绘制火箭主体
        ctx.globalAlpha = alpha;
        ctx.fillStyle = '#ee5a6f';
        ctx.fillRect(this.x - 8, this.y - 15, 16, 20);

        // 绘制火箭头部
        ctx.fillStyle = '#c23616';
        ctx.beginPath();
        ctx.moveTo(this.x, this.y - 25);
        ctx.lineTo(this.x - 8, this.y - 15);
        ctx.lineTo(this.x + 8, this.y - 15);
        ctx.closePath();
        ctx.fill();

        ctx.restore();
    }
}
