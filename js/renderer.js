// 渲染引擎 - 8bit像素风格

class UIRenderer {
    constructor(ctx) {
        this.ctx = ctx;
        this.canvas = ctx.canvas;
        this.cardWidth = 70;
        this.cardHeight = 98;
        this.scale = 1.0; // 缩放比例（用于移动端适配）

        // 积分滚动动画
        this.displayedScore = 0; // 当前显示的积分
        this.targetScore = 0; // 目标积分
        this.scoreAnimationSpeed = 5; // 滚动速度（每帧增加的积分）

        // Boss规则悬停区域
        this.bossRuleHoverArea = null;
        this.bossRuleTooltipVisible = false; // 提示框是否可见

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
        this.ctx.font = '11px "Press Start 2P", "Microsoft YaHei", "PingFang SC", sans-serif';
    }

    // 更新积分滚动动画
    updateScoreAnimation(targetScore) {
        this.targetScore = targetScore;

        // 如果差距很大，快速滚动
        const diff = Math.abs(this.targetScore - this.displayedScore);
        if (diff > 100) {
            this.scoreAnimationSpeed = Math.ceil(diff / 20);
        } else if (diff > 50) {
            this.scoreAnimationSpeed = Math.ceil(diff / 15);
        } else {
            this.scoreAnimationSpeed = Math.max(1, Math.ceil(diff / 10));
        }

        // 平滑滚动到目标值
        if (this.displayedScore < this.targetScore) {
            this.displayedScore = Math.min(this.displayedScore + this.scoreAnimationSpeed, this.targetScore);
        } else if (this.displayedScore > this.targetScore) {
            this.displayedScore = Math.max(this.displayedScore - this.scoreAnimationSpeed, this.targetScore);
        }
    }

    // 绘制信息分组背景框
    drawInfoBox(x, y, width, height, color) {
        this.ctx.fillStyle = color;
        this.ctx.fillRect(x, y, width, height);
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        this.ctx.lineWidth = 1;
        this.ctx.strokeRect(x, y, width, height);
    }

    // 绘制资源图标（16x16像素）
    drawResourceIcon(emoji, x, y, color) {
        this.ctx.save();
        this.ctx.font = `${Math.max(12, Math.floor(16 * this.scale))}px Arial`;
        this.ctx.fillStyle = color;
        this.ctx.textAlign = 'left';
        this.ctx.textBaseline = 'top';
        this.ctx.fillText(emoji, x, y - 2 * this.scale);
        this.ctx.restore();
    }

    // 清空画布
    clear() {
        this.ctx.fillStyle = '#1a5c3c';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // 重新设置字体和渲染属性（fillRect 可能会重置某些状态）
        this.ctx.imageSmoothingEnabled = false;
        this.ctx.font = '11px "Press Start 2P", "Microsoft YaHei", "PingFang SC", sans-serif';
    }

    // 获取Boss规则完整描述
    getBossRuleDescription(rule, level) {
        if (rule === 'perfectionist') {
            if (level === 4) {
                return '规则：必须在3回合内出完所有手牌，且总积分必须达到1.1倍要求\n奖励：本局游戏剩余关卡积分获取+20%';
            } else if (level === 10) {
                return '规则：必须在2回合内出完所有手牌，且总积分必须达到1.5倍要求\n奖励：本局游戏剩余关卡积分获取+20%';
            }
        }

        const descriptions = {
            'orderGuardian': '规则：必须按顺序出牌型\n单牌→对子→[三张/三带一/三带二]→顺子→连对→[飞机/飞机带单翅膀/飞机带对翅膀]→炸弹→四带二\n方括号内的牌型打出任意一种即可解锁下一组，火箭可随时打出\n奖励：永久行动点+2（本局游戏）',
            'chaosMage': '规则：每回合开始时随机交换两种牌型的行动点消耗，牌型积分不变\n奖励：随机获得2个商店道具（免费）',
            'pressureTester': '规则：无法主动弃牌，回合结束时若手牌超过15张，超出部分每张使下回合行动点-1\n奖励：本局游戏剩余关卡每回合行动点+1',
            'sacrificer': '规则：每次打出一手牌后，必须立即从手牌中弃掉一张与所出牌型中任意一张牌点数相同的牌\n若手牌中没有可匹配点数的牌，则改为随机弃掉两张手牌\n奖励：永久获得弃牌点上限+2'
        };

        return descriptions[rule] || 'Boss关卡';
    }

    // 检查鼠标是否悬停在Boss规则区域
    isMouseOverBossRule(mouseX, mouseY) {
        if (!this.bossRuleHoverArea) return false;

        const area = this.bossRuleHoverArea;
        return mouseX >= area.x &&
               mouseX <= area.x + area.width &&
               mouseY >= area.y &&
               mouseY <= area.y + area.height + 5;
    }

    // 切换Boss规则提示框显示状态
    toggleBossRuleTooltip() {
        this.bossRuleTooltipVisible = !this.bossRuleTooltipVisible;
    }

    // 隐藏Boss规则提示框
    hideBossRuleTooltip() {
        this.bossRuleTooltipVisible = false;
    }

    // 绘制Boss规则提示框
    drawBossRuleTooltip(mouseX, mouseY) {
        if (!this.bossRuleHoverArea || !this.bossRuleTooltipVisible) return;

        const area = this.bossRuleHoverArea;
        const description = this.getBossRuleDescription(area.rule, area.level);

        // 分割描述为多行
        const lines = description.split('\n');
        const lineHeight = 16 * this.scale;
        const padding = 10 * this.scale;
        const fontSize = Math.max(7, Math.floor(9 * this.scale));

        // 计算提示框尺寸
        this.ctx.font = `${fontSize}px "Press Start 2P", "Microsoft YaHei", "PingFang SC", sans-serif`;
        let maxWidth = 0;
        lines.forEach(line => {
            const width = this.ctx.measureText(line).width;
            if (width > maxWidth) maxWidth = width;
        });

        const tooltipWidth = maxWidth + padding * 2;
        const tooltipHeight = lines.length * lineHeight + padding * 2;

        // 计算提示框位置（固定在Boss规则文字下方）
        let tooltipX = area.x;
        let tooltipY = area.y + area.height + 10 * this.scale;

        // 避免超出屏幕右侧
        if (tooltipX + tooltipWidth > this.canvas.width) {
            tooltipX = this.canvas.width - tooltipWidth - 10 * this.scale;
        }
        // 避免超出屏幕底部
        if (tooltipY + tooltipHeight > this.canvas.height) {
            tooltipY = area.y - tooltipHeight - 10 * this.scale;
        }

        // 绘制提示框背景
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
        this.ctx.fillRect(tooltipX, tooltipY, tooltipWidth, tooltipHeight);

        // 绘制边框
        this.ctx.strokeStyle = '#9b59b6';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(tooltipX, tooltipY, tooltipWidth, tooltipHeight);

        // 绘制文字
        this.ctx.fillStyle = '#ecf0f1';
        this.ctx.textAlign = 'left';
        this.ctx.textBaseline = 'top';

        lines.forEach((line, index) => {
            this.ctx.fillText(line, tooltipX + padding, tooltipY + padding + index * lineHeight);
        });
    }

    // 绘制顶部信息栏
    drawTopBar(gameState) {
        const padding = 10 * this.scale;
        const isMobile = this.canvas.width < 500; // 判断是否为移动端

        // 回合数计算
        let maxDisplayRounds;
        if (gameState.isBossLevel && gameState.bossRule === 'perfectionist') {
            maxDisplayRounds = gameState.maxRounds;
        } else {
            maxDisplayRounds = gameState.maxRounds + 1;
        }

        // 更新积分滚动动画
        this.updateScoreAnimation(gameState.score);

        if (isMobile) {
            // 移动端：垂直堆叠布局
            this.drawTopBarMobile(gameState, padding, maxDisplayRounds);
        } else {
            // 桌面端：原有横向布局
            this.drawTopBarDesktop(gameState, padding, maxDisplayRounds);
        }
    }

    // 桌面端顶部信息栏布局
    drawTopBarDesktop(gameState, padding, maxDisplayRounds) {
        const y = 20 * this.scale;
        const fontSize = Math.max(8, Math.floor(11 * this.scale));

        this.ctx.font = `${fontSize}px "Press Start 2P", "Microsoft YaHei", "PingFang SC", sans-serif`;
        this.ctx.textAlign = 'left';
        this.ctx.textBaseline = 'top';

        // 绘制信息分组背景框 - 左侧（关卡和回合）
        this.drawInfoBox(padding, y - 5 * this.scale, 200 * this.scale, 25 * this.scale, 'rgba(0, 0, 0, 0.5)');

        // 关卡
        this.ctx.fillStyle = '#fff';
        this.ctx.fillText(`关卡: ${gameState.level}`, padding + 5 * this.scale, y);

        // 回合
        this.ctx.fillStyle = '#fff';
        this.ctx.fillText(`回合: ${gameState.round}/${maxDisplayRounds}`, 120 * this.scale, y);

        // 绘制资源信息框 - 中间（行动点和弃牌点）
        this.drawInfoBox(220 * this.scale, y - 5 * this.scale, 320 * this.scale, 25 * this.scale, 'rgba(0, 0, 0, 0.5)');

        // 行动点（带图标）
        this.drawResourceIcon('⚡', 225 * this.scale, y, '#3498db');
        this.ctx.fillStyle = gameState.actionPoints > 0 ? '#3498db' : '#e74c3c';
        this.ctx.fillText(`${gameState.actionPoints}/${gameState.maxActionPoints}`, 250 * this.scale, y);

        // 弃牌点（带图标）
        this.drawResourceIcon('🗑', 350 * this.scale, y, '#9b59b6');
        this.ctx.fillStyle = gameState.discardPoints >= gameState.currentDiscardCost ? '#9b59b6' : '#e74c3c';
        this.ctx.fillText(`${gameState.discardPoints}/${gameState.maxDiscardPoints}(${gameState.currentDiscardCost})`, 375 * this.scale, y);

        // 绘制积分信息框 - 右侧（分数和Combo）
        this.drawInfoBox(550 * this.scale, y - 5 * this.scale, 200 * this.scale, 25 * this.scale, 'rgba(0, 0, 0, 0.5)');

        // 分数（带图标）- 使用滚动动画的显示值
        this.drawResourceIcon('💰', 555 * this.scale, y, '#f39c12');
        this.ctx.fillStyle = '#fff';
        this.ctx.fillText(`${Math.floor(this.displayedScore)}`, 580 * this.scale, y);

        // Combo
        const comboText = `x${gameState.combo.toFixed(1)}`;
        this.ctx.fillStyle = gameState.combo > 1.0 ? '#f39c12' : '#fff';
        this.ctx.fillText(comboText, 680 * this.scale, y);

        // 第二行信息
        const y2 = y + 25 * this.scale;

        // 牌库剩余（带图标）
        this.drawResourceIcon('🎴', padding, y2, '#2ecc71');
        this.ctx.fillStyle = gameState.deckCards.length > 0 ? '#2ecc71' : '#e74c3c';
        this.ctx.fillText(`牌库: ${gameState.deckCards.length}`, padding + 20 * this.scale, y2);

        // 封印状态
        if (gameState.sealedPatterns && gameState.sealedPatterns.length > 0) {
            this.ctx.fillStyle = '#e74c3c';
            const sealedText = `封印: ${gameState.sealedPatterns.join(', ')}`;
            this.ctx.fillText(sealedText, 150 * this.scale, y2);
        }

        // Boss关规则提示（简化版：仅显示图标和名称）
        if (gameState.isBossLevel && gameState.bossRule) {
            this.ctx.fillStyle = '#9b59b6';
            this.ctx.font = `${Math.max(8, Math.floor(12 * this.scale))}px "Press Start 2P", "Microsoft YaHei", "PingFang SC", sans-serif`;

            const bossRuleNames = {
                'perfectionist': '💎 完美主义者',
                'orderGuardian': '🛡️ 秩序守护者',
                'chaosMage': '🎭 混乱法师',
                'pressureTester': '⚡ 压力测试者',
                'sacrificer': '🔥 献祭者'
            };
            const bossText = bossRuleNames[gameState.bossRule] || 'Boss关卡';

            const textX = 400 * this.scale;
            const textY = y2;
            this.ctx.fillText(bossText, textX, textY);

            // 保存悬停区域（用于鼠标悬停检测）
            const textWidth = this.ctx.measureText(bossText).width;
            const textHeight = Math.max(8, Math.floor(12 * this.scale));
            this.bossRuleHoverArea = {
                x: textX,
                y: textY,
                width: textWidth,
                height: textHeight,
                rule: gameState.bossRule,
                level: gameState.level
            };
        }
        // 特殊规则提示
        else if (gameState.specialRule === 'timeLimit') {
            this.ctx.fillStyle = '#e74c3c';
            const remaining = gameState.getRemainingTime();
            const timeText = `限时关卡! 剩余: ${remaining}s`;
            this.ctx.fillText(timeText, 400 * this.scale, y2);
        } else if (gameState.specialRule === 'doubleCost') {
            this.ctx.fillStyle = '#e67e22';
            const patternNames = {
                'PAIR': '对子', 'TRIPLE': '三张', 'STRAIGHT': '顺子',
                'DOUBLE_STRAIGHT': '连对', 'AIRPLANE': '飞机'
            };
            const patternName = patternNames[gameState.specialRuleData.pattern] || '未知';
            const costText = `消耗加倍: ${patternName}x2`;
            this.ctx.fillText(costText, 400 * this.scale, y2);
        }
        // 负面规则提示
        else if (gameState.negativeRule) {
            this.ctx.fillStyle = '#c0392b';
            const negativeRuleNames = {
                'erosion': '侵蚀: 手牌>15时锁定卡牌',
                'costIncrease': '消耗递增: 牌型消耗递增',
                'rankTax': '点数税: 弃牌需额外代价',
                'monotone': '单调牌序: 不能连续出相同牌型'
            };
            const ruleText = negativeRuleNames[gameState.negativeRule] || '负面规则';
            this.ctx.fillText(ruleText, 400 * this.scale, y2);
        }

        // 豪赌状态提示
        if (gameState.gambleLevelActive) {
            this.ctx.fillStyle = '#e74c3c';
            this.ctx.font = `${Math.max(7, Math.floor(10 * this.scale))}px "Press Start 2P", "Microsoft YaHei", "PingFang SC", sans-serif`;
            this.ctx.textAlign = 'center';
            this.ctx.fillText('🎰 豪赌模式激活! 目标: S评价 (2回合内)', this.canvas.width / 2, 5 * this.scale);
        }
    }

    // 移动端顶部信息栏布局（垂直堆叠）
    drawTopBarMobile(gameState, padding, maxDisplayRounds) {
        let currentY = 8 * this.scale;
        const lineHeight = 18 * this.scale;
        const fontSize = Math.max(7, Math.floor(9 * this.scale));
        const iconSize = Math.max(10, Math.floor(12 * this.scale));

        this.ctx.font = `${fontSize}px "Press Start 2P", "Microsoft YaHei", "PingFang SC", sans-serif`;
        this.ctx.textAlign = 'left';
        this.ctx.textBaseline = 'top';

        // 豪赌状态提示（最顶部）
        if (gameState.gambleLevelActive) {
            this.ctx.fillStyle = '#e74c3c';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('🎰 豪赌模式', this.canvas.width / 2, currentY);
            currentY += lineHeight;
            this.ctx.textAlign = 'left';
        }

        // 第一行：关卡、回合、牌库
        this.ctx.fillStyle = '#fff';
        this.ctx.fillText(`关卡:${gameState.level}`, padding, currentY);

        const col2X = this.canvas.width * 0.35;
        this.ctx.fillText(`回合:${gameState.round}/${maxDisplayRounds}`, col2X, currentY);

        const col3X = this.canvas.width * 0.65;
        this.drawResourceIcon('🎴', col3X, currentY, '#2ecc71');
        this.ctx.fillStyle = gameState.deckCards.length > 0 ? '#2ecc71' : '#e74c3c';
        this.ctx.fillText(`${gameState.deckCards.length}`, col3X + iconSize + 2 * this.scale, currentY);

        currentY += lineHeight;

        // 第二行：行动点、弃牌点
        this.drawResourceIcon('⚡', padding, currentY, '#3498db');
        this.ctx.fillStyle = gameState.actionPoints > 0 ? '#3498db' : '#e74c3c';
        this.ctx.fillText(`${gameState.actionPoints}/${gameState.maxActionPoints}`, padding + iconSize + 2 * this.scale, currentY);

        this.drawResourceIcon('🗑', col2X, currentY, '#9b59b6');
        this.ctx.fillStyle = gameState.discardPoints >= gameState.currentDiscardCost ? '#9b59b6' : '#e74c3c';
        this.ctx.fillText(`${gameState.discardPoints}/${gameState.maxDiscardPoints}(${gameState.currentDiscardCost})`, col2X + iconSize + 2 * this.scale, currentY);

        currentY += lineHeight;

        // 第三行：分数、Combo
        this.drawResourceIcon('💰', padding, currentY, '#f39c12');
        this.ctx.fillStyle = '#fff';
        this.ctx.fillText(`${Math.floor(this.displayedScore)}`, padding + iconSize + 2 * this.scale, currentY);

        const comboText = `Combo:x${gameState.combo.toFixed(1)}`;
        this.ctx.fillStyle = gameState.combo > 1.0 ? '#f39c12' : '#fff';
        this.ctx.fillText(comboText, col2X, currentY);

        currentY += lineHeight;

        // 封印状态
        if (gameState.sealedPatterns && gameState.sealedPatterns.length > 0) {
            this.ctx.fillStyle = '#e74c3c';
            this.ctx.font = `${Math.max(6, Math.floor(8 * this.scale))}px "Press Start 2P", "Microsoft YaHei", "PingFang SC", sans-serif`;
            const sealedText = `封印:${gameState.sealedPatterns.join(',')}`;
            this.ctx.fillText(sealedText, padding, currentY);
            currentY += lineHeight;
        }

        // Boss关规则提示（简化版：仅显示图标和名称）
        if (gameState.isBossLevel && gameState.bossRule) {
            this.ctx.fillStyle = '#9b59b6';
            this.ctx.font = `${Math.max(6, Math.floor(8 * this.scale))}px "Press Start 2P", "Microsoft YaHei", "PingFang SC", sans-serif`;

            const bossRuleNames = {
                'perfectionist': '💎 完美主义者',
                'orderGuardian': '🛡️ 秩序守护者',
                'chaosMage': '🎭 混乱法师',
                'pressureTester': '⚡ 压力测试者',
                'sacrificer': '🔥 献祭者'
            };

            const bossText = bossRuleNames[gameState.bossRule] || 'Boss关卡';
            this.ctx.fillText(bossText, padding, currentY);

            // 保存悬停区域（用于鼠标悬停检测）
            const textWidth = this.ctx.measureText(bossText).width;
            const textHeight = Math.max(6, Math.floor(8 * this.scale));
            this.bossRuleHoverArea = {
                x: padding,
                y: currentY,
                width: textWidth,
                height: textHeight,
                rule: gameState.bossRule,
                level: gameState.level
            };
        }
        // 特殊规则提示（简化版）
        else if (gameState.specialRule === 'timeLimit') {
            this.ctx.fillStyle = '#e74c3c';
            this.ctx.font = `${Math.max(6, Math.floor(8 * this.scale))}px "Press Start 2P", "Microsoft YaHei", "PingFang SC", sans-serif`;
            const remaining = gameState.getRemainingTime();
            const timeText = `⏱限时:${remaining}s`;
            this.ctx.fillText(timeText, padding, currentY);
        } else if (gameState.specialRule === 'doubleCost') {
            this.ctx.fillStyle = '#e67e22';
            this.ctx.font = `${Math.max(6, Math.floor(8 * this.scale))}px "Press Start 2P", "Microsoft YaHei", "PingFang SC", sans-serif`;
            const patternNames = {
                'PAIR': '对子', 'TRIPLE': '三张', 'STRAIGHT': '顺子',
                'DOUBLE_STRAIGHT': '连对', 'AIRPLANE': '飞机'
            };
            const patternName = patternNames[gameState.specialRuleData.pattern] || '未知';
            const costText = `⚠${patternName}x2`;
            this.ctx.fillText(costText, padding, currentY);
        }
        // 负面规则提示（简化版）
        else if (gameState.negativeRule) {
            this.ctx.fillStyle = '#c0392b';
            this.ctx.font = `${Math.max(6, Math.floor(8 * this.scale))}px "Press Start 2P", "Microsoft YaHei", "PingFang SC", sans-serif`;
            const negativeRuleNames = {
                'erosion': '⚠侵蚀',
                'costIncrease': '⚠递增',
                'rankTax': '⚠点数税',
                'monotone': '⚠单调'
            };
            const ruleText = negativeRuleNames[gameState.negativeRule] || '负面';
            this.ctx.fillText(ruleText, padding, currentY);
        }
    }

    // 绘制手牌区
    drawHandCards(cards, selectedIndices, level = 1, hoveredIndex = -1, gameState = null) {
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
                const isSelected = selectedIndices.includes(i);
                const isHovered = hoveredIndex === i;
                const isLocked = gameState && gameState.lockedCards && gameState.lockedCards.includes(i);
                let y = topY;

                // 选中状态：向上移动15像素
                if (isSelected) {
                    y = topY - 15 * this.scale;
                }
                // 悬停状态：向上浮动5像素（如果未选中）
                else if (isHovered) {
                    y = topY - 5 * this.scale;
                }

                const x = startX + i * topGap;
                this.drawCard(card, x, y, isSelected, isHovered, gameState, isLocked);
            });

            // 绘制下行
            const bottomY = this.canvas.height - this.cardHeight - 80 * this.scale;
            bottomRowCards.forEach((card, i) => {
                const index = midPoint + i;
                const isSelected = selectedIndices.includes(index);
                const isHovered = hoveredIndex === index;
                const isLocked = gameState && gameState.lockedCards && gameState.lockedCards.includes(index);
                let y = bottomY;

                // 选中状态：向上移动15像素
                if (isSelected) {
                    y = bottomY - 15 * this.scale;
                }
                // 悬停状态：向上浮动5像素（如果未选中）
                else if (isHovered) {
                    y = bottomY - 5 * this.scale;
                }

                const x = startX + i * bottomGap;
                this.drawCard(card, x, y, isSelected, isHovered, gameState, isLocked);
            });
        } else {
            // 单行显示逻辑（保持原有逻辑）
            const startY = this.canvas.height - this.cardHeight - 80 * this.scale;
            const gap = Math.min(60 * this.scale, (this.canvas.width - 100 * this.scale) / cards.length);

            cards.forEach((card, index) => {
                const isSelected = selectedIndices.includes(index);
                const isHovered = hoveredIndex === index;
                const isLocked = gameState && gameState.lockedCards && gameState.lockedCards.includes(index);
                let y = startY;

                // 选中状态：向上移动15像素
                if (isSelected) {
                    y = startY - 15 * this.scale;
                }
                // 悬停状态：向上浮动5像素（如果未选中）
                else if (isHovered) {
                    y = startY - 5 * this.scale;
                }

                const x = startX + index * gap;
                this.drawCard(card, x, y, isSelected, isHovered, gameState, isLocked);
            });
        }

        // 显示手牌数量
        this.ctx.font = `${Math.max(7, Math.floor(10 * this.scale))}px "Press Start 2P", "Microsoft YaHei", "PingFang SC", sans-serif`;
        this.ctx.fillStyle = '#ecf0f1';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'top';
        this.ctx.fillText(`剩余手牌: ${cards.length}`, this.canvas.width / 2, this.canvas.height - 10 * this.scale);
    }

    // 绘制单张扑克牌 (像素风格)
    drawCard(card, x, y, selected, hovered = false, gameState = null, isLocked = false) {
        const w = this.cardWidth;
        const h = this.cardHeight;

        // 已选中卡牌：添加轻微的缩放和摇晃效果
        this.ctx.save();
        if (selected) {
            const time = Date.now() / 1000;
            const wobble = Math.sin(time * 3) * 2; // 左右摇晃2像素
            const scale = 1.05; // 放大5%

            this.ctx.translate(x + w / 2, y + h / 2);
            this.ctx.rotate(wobble * 0.02); // 轻微旋转
            this.ctx.scale(scale, scale);
            this.ctx.translate(-(x + w / 2), -(y + h / 2));
        }

        // 检查卡牌是否可选（行动点是否足够）
        // 这里简化处理：如果没有传入gameState，默认可选
        let isDisabled = false;
        if (gameState && gameState.actionPoints <= 0) {
            // 如果行动点为0，所有牌都不可选
            isDisabled = true;
        }

        // 卡牌背景（升级牌使用金色背景，锁定牌使用红色背景）
        if (isLocked) {
            // 锁定状态：红色背景
            this.ctx.fillStyle = selected ? '#e74c3c' : '#fadbd8';
        } else if (isDisabled) {
            // 不可选状态：降低透明度
            this.ctx.globalAlpha = 0.5;
            this.ctx.fillStyle = '#999';
        } else if (card.isUpgraded) {
            this.ctx.fillStyle = selected ? '#f9e79f' : '#fef5e7';
        } else {
            this.ctx.fillStyle = selected ? '#ecf0f1' : '#fff';
        }
        this.ctx.fillRect(x, y, w, h);

        // 锁定状态：红色边框
        if (isLocked) {
            this.ctx.strokeStyle = '#c0392b';
            this.ctx.lineWidth = Math.max(2, 3 * this.scale);
            this.ctx.strokeRect(x, y, w, h);
        }
        // 悬停状态：发光边框
        else if (hovered && !isDisabled) {
            this.ctx.shadowColor = '#f39c12';
            this.ctx.shadowBlur = 10 * this.scale;
            this.ctx.strokeStyle = '#f39c12';
            this.ctx.lineWidth = Math.max(2, 3 * this.scale);
            this.ctx.strokeRect(x, y, w, h);
            this.ctx.shadowBlur = 0; // 重置阴影
        }

        // 获取花色颜色（高对比度）
        const getSuitColor = (suit) => {
            if (isDisabled) return '#666'; // 不可选状态使用灰色
            switch(suit) {
                case 'hearts': return '#ff1744';      // ♥ 亮红色
                case 'diamonds': return '#ff6f00';    // ♦ 橙红色
                case 'clubs': return '#000000';       // ♣ 纯黑色
                case 'spades': return '#1a237e';      // ♠ 蓝黑色
                default: return '#000000';
            }
        };

        // 绘制牌面中央的花色暗纹（15%透明度）
        if (card.suit !== 'joker') {
            const suitSymbols = {
                'hearts': '♥',
                'spades': '♠',
                'diamonds': '♦',
                'clubs': '♣'
            };
            this.ctx.save();
            this.ctx.globalAlpha = isDisabled ? 0.1 : 0.15;
            this.ctx.fillStyle = getSuitColor(card.suit);
            this.ctx.font = `${Math.max(30, Math.floor(45 * this.scale))}px Arial, sans-serif`;
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText(suitSymbols[card.suit], x + w / 2, y + h / 2);
            this.ctx.restore();
        }

        // 1像素深色轮廓
        this.ctx.strokeStyle = '#2C2C2C';
        this.ctx.lineWidth = 1;
        this.ctx.strokeRect(x, y, w, h);

        // 卡牌边框（升级牌使用金色边框）
        if (!hovered) { // 悬停时已经绘制过边框
            if (card.isUpgraded) {
                this.ctx.strokeStyle = selected ? '#f39c12' : '#f1c40f';
                this.ctx.lineWidth = Math.max(2, 3 * this.scale);
            } else {
                this.ctx.strokeStyle = selected ? '#f39c12' : '#000';
                this.ctx.lineWidth = selected ? Math.max(2, 3 * this.scale) : Math.max(1, 2 * this.scale);
            }
            this.ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);
        }

        // 点数和花色颜色
        const color = card.suit === 'joker' ? (card.rank === 'JOKER' ? '#ff1744' : '#000') : getSuitColor(card.suit);
        this.ctx.fillStyle = color;

        // 绘制左上角点数（放大1-2像素）
        this.ctx.font = `${Math.max(9, Math.floor(14 * this.scale))}px "Press Start 2P", "Microsoft YaHei", "PingFang SC", sans-serif`;
        this.ctx.textAlign = 'left';
        this.ctx.textBaseline = 'top';
        const rankText = card.rank === '10' ? '10' : card.rank;
        this.ctx.fillText(rankText, x + 4 * this.scale, y + 4 * this.scale);

        // 绘制左上角花色符号（放大1-2像素）
        if (card.suit !== 'joker') {
            const suitSymbols = {
                'hearts': '♥',
                'spades': '♠',
                'diamonds': '♦',
                'clubs': '♣'
            };
            this.ctx.font = `${Math.max(14, Math.floor(22 * this.scale))}px Arial, sans-serif`;
            this.ctx.textAlign = 'left';
            this.ctx.textBaseline = 'top';
            this.ctx.fillText(suitSymbols[card.suit], x + 4 * this.scale, y + 18 * this.scale);
        }

        // 升级牌标记
        if (card.isUpgraded) {
            this.ctx.font = `${Math.max(6, Math.floor(8 * this.scale))}px "Press Start 2P", "Microsoft YaHei", "PingFang SC", sans-serif`;
            this.ctx.fillStyle = isDisabled ? '#666' : '#e67e22';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText('+20', x + w / 2, y + h - 12 * this.scale);
        }

        this.ctx.restore();
    }

    // 绘制卡背
    drawCardBack(x, y) {
        const w = this.cardWidth;
        const h = this.cardHeight;

        this.ctx.save();

        // 卡背背景（深蓝色）
        this.ctx.fillStyle = '#2c3e50';
        this.ctx.fillRect(x, y, w, h);

        // 边框
        this.ctx.strokeStyle = '#000';
        this.ctx.lineWidth = Math.max(1, 2 * this.scale);
        this.ctx.strokeRect(x, y, w, h);

        // 中央图案（简单的菱形）
        this.ctx.fillStyle = '#34495e';
        this.ctx.beginPath();
        this.ctx.moveTo(x + w / 2, y + 10 * this.scale);
        this.ctx.lineTo(x + w - 10 * this.scale, y + h / 2);
        this.ctx.lineTo(x + w / 2, y + h - 10 * this.scale);
        this.ctx.lineTo(x + 10 * this.scale, y + h / 2);
        this.ctx.closePath();
        this.ctx.fill();

        this.ctx.restore();
    }

    // 绘制牌库图标
    drawDeckIcon(x, y) {
        const w = this.cardWidth * 0.6;
        const h = this.cardHeight * 0.6;

        this.ctx.save();

        // 绘制3层叠加的卡背，模拟牌堆效果
        for (let i = 0; i < 3; i++) {
            const offsetX = i * 2 * this.scale;
            const offsetY = i * 2 * this.scale;

            // 卡背背景
            this.ctx.fillStyle = '#2c3e50';
            this.ctx.fillRect(x + offsetX, y + offsetY, w, h);

            // 边框
            this.ctx.strokeStyle = '#000';
            this.ctx.lineWidth = 1;
            this.ctx.strokeRect(x + offsetX, y + offsetY, w, h);
        }

        this.ctx.restore();
    }

    // 绘制出牌区域
    drawPlayArea(lastPlayed, lastScore) {
        const centerX = this.canvas.width / 2;
        const isMobile = this.canvas.width < 500;

        // 移动端需要更多顶部空间（因为顶部信息栏更高）
        const topOffset = isMobile ? 80 * this.scale : 50 * this.scale;
        const centerY = this.canvas.height / 2 - topOffset;

        if (lastPlayed && lastPlayed.cards) {
            // 显示牌型名称
            const nameFontSize = isMobile ? Math.max(9, Math.floor(12 * this.scale)) : Math.max(10, Math.floor(16 * this.scale));
            this.ctx.font = `${nameFontSize}px "Press Start 2P", "Microsoft YaHei", "PingFang SC", sans-serif`;
            this.ctx.fillStyle = '#f39c12';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'top';
            this.ctx.fillText(lastPlayed.name, centerX, centerY - 60 * this.scale);

            // 显示得分
            const scoreFontSize = isMobile ? Math.max(10, Math.floor(14 * this.scale)) : Math.max(12, Math.floor(20 * this.scale));
            this.ctx.font = `${scoreFontSize}px "Press Start 2P", "Microsoft YaHei", "PingFang SC", sans-serif`;
            this.ctx.fillStyle = '#2ecc71';
            this.ctx.textBaseline = 'top';
            this.ctx.fillText(`+${lastScore}分`, centerX, centerY - 30 * this.scale);

            // 绘制出的牌
            const cardGap = isMobile ? 40 * this.scale : 60 * this.scale;
            const startX = centerX - (lastPlayed.cards.length * cardGap) / 2;
            lastPlayed.cards.forEach((card, index) => {
                this.drawCard(card, startX + index * cardGap, centerY, false);
            });
        } else {
            // 提示文字
            const hintFontSize = isMobile ? Math.max(7, Math.floor(9 * this.scale)) : Math.max(8, Math.floor(12 * this.scale));
            this.ctx.font = `${hintFontSize}px "Press Start 2P", "Microsoft YaHei", "PingFang SC", sans-serif`;
            this.ctx.fillStyle = '#95a5a6';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'top';
            const hintText = isMobile ? '选牌后点出牌' : '选择手牌后点击"出牌"';
            this.ctx.fillText(hintText, centerX, centerY);
        }
    }

    // 绘制提示信息
    drawHint(message, color = '#fff') {
        this.ctx.font = `${Math.max(7, Math.floor(10 * this.scale))}px "Press Start 2P", "Microsoft YaHei", "PingFang SC", sans-serif`;
        this.ctx.fillStyle = color;
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'top';
        this.ctx.fillText(message, this.canvas.width / 2, 50 * this.scale);
    }

    // 绘制加载动画
    drawLoading() {
        this.clear();
        this.ctx.font = `${Math.max(10, Math.floor(16 * this.scale))}px "Press Start 2P", "Microsoft YaHei", "PingFang SC", sans-serif`;
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
            // Boss关：完美主义者和秩序守护者使用特殊积分要求
            let targetScore = gameState.levelScoreRequirement;
            if (gameState.isBossLevel && gameState.bossRuleData.requiredScore) {
                targetScore = gameState.bossRuleData.requiredScore;
            }

            // 如果积分要求为0（1-3关），显示"无要求"
            let levelScoreInfo;
            if (targetScore === 0) {
                levelScoreInfo = `
                    <div style="color: #2ecc71; margin-bottom: 5px;">
                        当前积分: ${gameState.levelScore}
                    </div>
                    <div style="color: #ecf0f1;">
                        本关无积分要求
                    </div>
                    <div style="color: ${gameState.levelScoreMultiplier >= 1.0 ? '#2ecc71' : '#f39c12'}; margin-top: 10px;">
                        关卡系数: ${gameState.levelScoreMultiplier}x
                    </div>
                `;
            } else {
                const progressPercent = Math.min(100, Math.floor((gameState.levelScore / targetScore) * 100));
                const color = gameState.levelScore >= targetScore ? '#2ecc71' : '#e74c3c';
                levelScoreInfo = `
                    <div style="color: ${color}; margin-bottom: 5px;">
                        当前: ${gameState.levelScore} / ${targetScore}
                    </div>
                    <div style="color: #ecf0f1;">
                        进度: ${progressPercent}%
                    </div>
                    <div style="color: ${gameState.levelScoreMultiplier >= 1.0 ? '#2ecc71' : '#f39c12'}; margin-top: 10px;">
                        关卡系数: ${gameState.levelScoreMultiplier}x
                    </div>
                `;
            }

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

            // 第9关额外胜利条件
            if (gameState.level === 9) {
                const patternCount = gameState.usedPatternTypes.size;
                const extraColor = patternCount >= 4 ? '#2ecc71' : '#f39c12';
                levelScoreInfo += `
                    <div style="color: ${extraColor}; margin-top: 10px; font-size: 10px;">
                        ⭐ 额外要求:<br/>
                        使用≥4种牌型<br/>
                        (已用${patternCount}种)
                    </div>
                `;
            }

            // 第10关额外胜利条件
            if (gameState.level === 10) {
                // 如果不是完美主义者boss，显示回合限制
                if (!gameState.isBossLevel || gameState.bossRule !== 'perfectionist') {
                    const extraColor = gameState.round <= gameState.maxRounds ? '#2ecc71' : '#e74c3c';
                    levelScoreInfo += `
                        <div style="color: ${extraColor}; margin-top: 10px; font-size: 10px;">
                            ⭐ 额外要求:<br/>
                            ${gameState.maxRounds}回合内完成<br/>
                            (当前第${gameState.round}回合)
                        </div>
                    `;
                }
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
                i.id === 'piggy_gold'
            );
            if (piggyItems.length > 0) {
                effectsHtml += `<div style="color: #f1c40f;">✓ 黄金存钱罐: 每局+20分</div>`;
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

    // 渲染大小王/火箭特殊效果选牌界面
    renderSpecialEffectSelection(effectData, onSelect, onCancel) {
        const modal = document.createElement('div');
        modal.id = 'specialEffectModal';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 10000;
        `;

        const content = document.createElement('div');
        content.style.cssText = `
            background: #2c3e50;
            padding: 30px;
            border-radius: 10px;
            border: 3px solid #f39c12;
            max-width: 600px;
            text-align: center;
        `;

        const title = document.createElement('div');
        title.style.cssText = `
            font-size: 20px;
            color: #f39c12;
            margin-bottom: 20px;
            font-family: "Press Start 2P", "Microsoft YaHei", "PingFang SC", sans-serif;
        `;

        const optionsContainer = document.createElement('div');
        optionsContainer.style.cssText = `
            display: flex;
            justify-content: center;
            gap: 15px;
            margin-bottom: 20px;
            flex-wrap: wrap;
        `;

        if (effectData.type === 'joker_single') {
            // 大小王效果：显示牌库顶端3张牌
            title.textContent = '选择一张牌加入手牌';

            effectData.cards.forEach((card, index) => {
                const cardDiv = document.createElement('div');
                cardDiv.style.cssText = `
                    width: 70px;
                    height: 98px;
                    background: white;
                    border: 2px solid #000;
                    border-radius: 5px;
                    cursor: pointer;
                    display: flex;
                    flex-direction: column;
                    justify-content: center;
                    align-items: center;
                    transition: transform 0.2s;
                `;

                const rankText = document.createElement('div');
                rankText.textContent = card.rank;
                rankText.style.cssText = `
                    font-size: 16px;
                    font-weight: bold;
                    color: ${card.isRed() ? '#e74c3c' : '#000'};
                `;

                const suitSymbols = {
                    'hearts': '♥',
                    'spades': '♠',
                    'diamonds': '♦',
                    'clubs': '♣',
                    'joker': ''
                };
                const suitText = document.createElement('div');
                suitText.textContent = suitSymbols[card.suit];
                suitText.style.cssText = `
                    font-size: 24px;
                    color: ${card.isRed() ? '#e74c3c' : '#000'};
                `;

                cardDiv.appendChild(rankText);
                cardDiv.appendChild(suitText);

                cardDiv.addEventListener('mouseenter', () => {
                    cardDiv.style.transform = 'scale(1.1)';
                });
                cardDiv.addEventListener('mouseleave', () => {
                    cardDiv.style.transform = 'scale(1)';
                });
                cardDiv.addEventListener('click', () => {
                    document.body.removeChild(modal);
                    onSelect(index);
                });

                optionsContainer.appendChild(cardDiv);
            });
        } else if (effectData.type === 'rocket') {
            // 火箭效果：显示所有点数
            title.textContent = '选择一个点数获得该牌';

            effectData.ranks.forEach(rank => {
                const rankDiv = document.createElement('div');
                rankDiv.style.cssText = `
                    width: 60px;
                    height: 60px;
                    background: #ecf0f1;
                    border: 2px solid #000;
                    border-radius: 5px;
                    cursor: pointer;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    font-size: 18px;
                    font-weight: bold;
                    transition: transform 0.2s, background 0.2s;
                `;

                rankDiv.textContent = rank;

                rankDiv.addEventListener('mouseenter', () => {
                    rankDiv.style.transform = 'scale(1.1)';
                    rankDiv.style.background = '#f39c12';
                });
                rankDiv.addEventListener('mouseleave', () => {
                    rankDiv.style.transform = 'scale(1)';
                    rankDiv.style.background = '#ecf0f1';
                });
                rankDiv.addEventListener('click', () => {
                    document.body.removeChild(modal);
                    onSelect(rank);
                });

                optionsContainer.appendChild(rankDiv);
            });
        }

        const cancelBtn = document.createElement('button');
        cancelBtn.textContent = '取消';
        cancelBtn.className = 'game-button';
        cancelBtn.style.cssText = `
            padding: 10px 20px;
            font-size: 14px;
            cursor: pointer;
        `;
        cancelBtn.addEventListener('click', () => {
            document.body.removeChild(modal);
            onCancel();
        });

        content.appendChild(title);
        content.appendChild(optionsContainer);
        content.appendChild(cancelBtn);
        modal.appendChild(content);
        document.body.appendChild(modal);
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
        ctx.font = '24px "Press Start 2P", "Microsoft YaHei", "PingFang SC", sans-serif';
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

// 卡牌飞入动画
class CardFlyInAnimation {
    constructor(card, startX, startY, endX, endY, renderer, delay = 0, cardIndex = -1, gameState = null) {
        this.card = card;
        this.startX = startX;
        this.startY = startY;
        this.endX = endX;
        this.endY = endY;
        this.renderer = renderer;
        this.delay = delay; // 延迟时间（毫秒）
        this.time = -delay; // 从负值开始，实现延迟效果
        this.duration = 250; // 0.25秒
        this.finished = false;
        this.cardIndex = cardIndex; // 卡牌在手牌中的索引
        this.gameState = gameState; // 游戏状态引用
    }

    update(deltaTime) {
        this.time += deltaTime;
        if (this.time >= this.duration) {
            this.finished = true;
            // 动画完成时，标记该牌已着陆
            if (this.gameState && this.cardIndex >= 0 && !this.gameState.landedCardIndices.includes(this.cardIndex)) {
                this.gameState.landedCardIndices.push(this.cardIndex);
            }
            return;
        }
    }

    render(ctx) {
        // 延迟期间不渲染
        if (this.time < 0) return;

        const progress = this.time / this.duration;

        // 使用缓动函数（ease-out-quad）
        const easeProgress = 1 - Math.pow(1 - progress, 2);

        // 计算当前位置
        const currentX = this.startX + (this.endX - this.startX) * easeProgress;
        const currentY = this.startY + (this.endY - this.startY) * easeProgress;

        // 添加轻微弧线效果（贝塞尔曲线，控制点略偏上方）
        const arc = Math.sin(progress * Math.PI) * 30;

        // 绘制卡牌（正面朝上）
        ctx.save();
        ctx.globalAlpha = Math.min(1, progress * 2); // 淡入效果
        this.renderer.drawCard(this.card, currentX, currentY - arc, false);
        ctx.restore();
    }
}

// 卡牌飞出动画
class CardFlyOutAnimation {
    constructor(card, startX, startY, endX, endY, renderer, delay = 0) {
        this.card = card;
        this.startX = startX;
        this.startY = startY;
        this.endX = endX;
        this.endY = endY;
        this.renderer = renderer;
        this.delay = delay; // 延迟时间（毫秒）
        this.time = -delay; // 从负值开始，实现延迟效果
        this.duration = 200; // 0.2秒
        this.finished = false;
    }

    update(deltaTime) {
        this.time += deltaTime;
        if (this.time >= this.duration) {
            this.finished = true;
            return;
        }
    }

    render(ctx) {
        // 延迟期间不渲染
        if (this.time < 0) return;

        const progress = this.time / this.duration;

        // 使用缓动函数（ease-in）
        const easeProgress = progress * progress;

        // 计算当前位置
        const currentX = this.startX + (this.endX - this.startX) * easeProgress;
        const currentY = this.startY + (this.endY - this.startY) * easeProgress;

        // 添加轻微上弧线
        const arc = Math.sin(progress * Math.PI) * 20;

        // 缩小效果（1.0 → 0.8）
        const scale = 1.0 - progress * 0.2;

        // 轻微旋转（-5°到+5°随机）
        const rotation = (Math.random() - 0.5) * 0.1 * progress;

        // 绘制卡牌
        ctx.save();
        ctx.globalAlpha = 1.0 - progress * 0.3; // 轻微淡出
        ctx.translate(currentX + this.renderer.cardWidth / 2, currentY - arc + this.renderer.cardHeight / 2);
        ctx.rotate(rotation);
        ctx.scale(scale, scale);
        ctx.translate(-(currentX + this.renderer.cardWidth / 2), -(currentY - arc + this.renderer.cardHeight / 2));
        this.renderer.drawCard(this.card, currentX, currentY - arc, false);
        ctx.restore();
    }
}

// 得分弹跳动画
class ScorePopupAnimation {
    constructor(score, x, y) {
        this.score = score;
        this.x = x;
        this.y = y;
        this.startY = y;
        this.time = 0;
        this.duration = 1200; // 1.2秒
        this.finished = false;
    }

    update(deltaTime) {
        this.time += deltaTime;
        if (this.time >= this.duration) {
            this.finished = true;
            return;
        }
    }

    render(ctx) {
        const progress = this.time / this.duration;

        // 弹跳效果：使用缓动函数
        let scale = 1.0;
        if (progress < 0.3) {
            // 前30%时间：从0放大到1.5
            scale = (progress / 0.3) * 1.5;
        } else if (progress < 0.5) {
            // 30%-50%：从1.5缩小到1.2
            const t = (progress - 0.3) / 0.2;
            scale = 1.5 - t * 0.3;
        } else if (progress < 0.7) {
            // 50%-70%：从1.2放大到1.3
            const t = (progress - 0.5) / 0.2;
            scale = 1.2 + t * 0.1;
        } else {
            // 70%-100%：保持1.3并淡出
            scale = 1.3;
        }

        // 向上移动
        const offsetY = progress * -30;

        // 透明度：最后30%淡出
        let alpha = 1.0;
        if (progress > 0.7) {
            alpha = 1.0 - (progress - 0.7) / 0.3;
        }

        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.translate(this.x, this.y + offsetY);
        ctx.scale(scale, scale);

        // 绘制得分文字
        ctx.font = '20px "Press Start 2P", "Microsoft YaHei", "PingFang SC", sans-serif';
        ctx.fillStyle = '#2ecc71';
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 3;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        const text = `+${this.score}分`;
        ctx.strokeText(text, 0, 0);
        ctx.fillText(text, 0, 0);

        ctx.restore();
    }
}
