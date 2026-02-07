// 输入控制系统

class InputHandler {
    constructor(canvas, gameState, renderer, shop) {
        this.canvas = canvas;
        this.gameState = gameState;
        this.renderer = renderer;
        this.shop = shop;
        this.selectedCards = [];
        this.hoveredCardIndex = -1; // 当前悬停的卡牌索引

        this.bindEvents();
    }

    // 绑定所有事件
    bindEvents() {
        // Canvas点击/触摸事件 - 选牌
        const handleCardSelect = (e) => {
            e.preventDefault(); // 防止默认触摸行为
            const rect = this.canvas.getBoundingClientRect();

            // 支持触摸和鼠标
            const clientX = e.touches ? e.touches[0].clientX : e.clientX;
            const clientY = e.touches ? e.touches[0].clientY : e.clientY;

            const x = clientX - rect.left;
            const y = clientY - rect.top;

            const index = this.renderer.getCardIndexAt(x, y, this.gameState.handCards, this.gameState.level);
            if (index !== -1) {
                this.toggleCardSelection(index);
            }
        };

        // 鼠标移动事件 - 追踪悬停状态
        const handleMouseMove = (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            const index = this.renderer.getCardIndexAt(x, y, this.gameState.handCards, this.gameState.level);
            if (index !== this.hoveredCardIndex) {
                this.hoveredCardIndex = index;
                // 悬停状态改变时，更新光标样式
                this.canvas.style.cursor = index !== -1 ? 'pointer' : 'default';
            }
        };

        // 鼠标离开Canvas时清除悬停状态
        const handleMouseLeave = () => {
            this.hoveredCardIndex = -1;
            this.canvas.style.cursor = 'default';
        };

        // 支持鼠标和触摸
        this.canvas.addEventListener('click', handleCardSelect);
        this.canvas.addEventListener('touchstart', handleCardSelect, { passive: false });
        this.canvas.addEventListener('mousemove', handleMouseMove);
        this.canvas.addEventListener('mouseleave', handleMouseLeave);

        // 出牌按钮
        document.getElementById('playBtn').addEventListener('click', () => {
            this.handlePlay();
        });

        // 结束回合按钮
        document.getElementById('endRoundBtn').addEventListener('click', () => {
            this.handleEndRound();
        });

        // 弃牌按钮
        document.getElementById('discardBtn').addEventListener('click', () => {
            this.handleDiscard();
        });

        // 道具按钮
        document.getElementById('itemsBtn').addEventListener('click', () => {
            this.openItems();
        });

        // 返回菜单按钮
        document.getElementById('backToMenuBtn').addEventListener('click', () => {
            if (confirm('确定返回主菜单?进度将被保存。')) {
                SaveManager.save(this.gameState);
                location.reload();
            }
        });

        // 音效开关按钮
        document.getElementById('audioToggleBtn').addEventListener('click', () => {
            if (window.audioManager) {
                const enabled = window.audioManager.toggle();
                const btn = document.getElementById('audioToggleBtn');
                btn.textContent = enabled ? '🔊 音效' : '🔇 静音';
                if (enabled) {
                    window.audioManager.playButtonClick();
                }
            }
        });

        // 按点数理牌按钮
        document.getElementById('sortByRankBtn').addEventListener('click', () => {
            this.gameState.sortByRank();
            this.selectedCards = []; // 清空选择
            if (window.audioManager) {
                window.audioManager.playButtonClick();
            }
        });

        // 豪赌按钮
        document.getElementById('gambleBtn').addEventListener('click', () => {
            this.handleGamble();
        });

        // 关闭商店按钮
        document.getElementById('closeShopBtn').addEventListener('click', () => {
            this.closeShop();
        });

        // 关闭道具栏按钮
        document.getElementById('closeItemsBtn').addEventListener('click', () => {
            this.closeItems();
        });

        // 关闭提示模态框按钮
        document.getElementById('closeHintBtn').addEventListener('click', () => {
            document.getElementById('hintModal').style.display = 'none';
        });
    }

    // 切换卡牌选中状态
    toggleCardSelection(index) {
        const idx = this.selectedCards.indexOf(index);
        if (idx === -1) {
            this.selectedCards.push(index);
        } else {
            this.selectedCards.splice(idx, 1);
        }
        this.selectedCards.sort((a, b) => a - b);

        // 播放选牌音效
        if (window.audioManager) {
            window.audioManager.playCardSelect();
        }
    }

    // 处理出牌
    handlePlay() {
        // 检查游戏是否已经结束
        if (this.gameState.gameOver) {
            return;
        }

        if (this.selectedCards.length === 0) {
            alert('请先选择要出的牌!');
            return;
        }

        // 动态检查回合是否用完
        const maxAllowedRound = (this.gameState.isBossLevel && this.gameState.bossRule === 'perfectionist')
            ? this.gameState.maxRounds
            : this.gameState.maxRounds + 1;
        if (this.gameState.round > maxAllowedRound) {
            alert('回合已用完!');
            return;
        }

        // 获取选中的牌
        const cards = this.selectedCards.map(i => this.gameState.handCards[i]);

        // 检测牌型
        const pattern = PatternDetector.detectPattern(cards);

        if (!pattern.valid) {
            alert('不是合法的牌型!');
            return;
        }

        // 检查牌型是否被封印
        if (this.gameState.sealedPatterns && this.gameState.sealedPatterns.length > 0) {
            if (this.gameState.sealedPatterns.includes(pattern.name)) {
                alert(`${pattern.name}已被封印，无法使用!`);
                return;
            }
        }

        // 检查行动点是否足够
        const patternKey = Object.keys(PatternDetector.PATTERNS).find(
            key => PatternDetector.PATTERNS[key].name === pattern.name
        );
        if (!this.gameState.canPlayPattern(patternKey)) {
            const cost = this.gameState.getPatternCost(patternKey);
            alert(`行动点不足!该牌型需要${cost}点,当前剩余${this.gameState.actionPoints}点`);
            return;
        }

        // 出牌（传入patternKey用于正确扣除行动点）
        const playResult = this.gameState.playCards(cards, pattern, patternKey);

        // 检查出牌是否成功
        if (playResult && !playResult.success) {
            alert(playResult.message);
            return;
        }

        // 限时关卡：出牌后重启计时器（重新开始30秒）
        if (this.gameState.specialRule === 'timeLimit') {
            this.gameState.startTurnTimer();
        }

        // 添加得分弹跳动画
        if (window.game && window.game.animationManager) {
            const centerX = this.canvas.width / 2;
            const centerY = this.canvas.height / 2 - 30;
            window.game.animationManager.add(new ScorePopupAnimation(this.gameState.lastScore, centerX, centerY));
        }

        // 教程模式: 检测步骤1完成 (出牌)
        if (window.game && window.game.tutorialManager && window.game.tutorialManager.isActive) {
            const currentStepId = window.game.tutorialManager.getCurrentStepId();
            if (currentStepId === 'play_cards') {
                window.game.tutorialManager.markStepCompleted('play_cards');
            }
        }

        // 记录统计
        Statistics.recordCardPlayed();

        // 播放出牌音效和得分音效
        if (window.audioManager) {
            // 炸弹和火箭使用特殊音效
            if (pattern.name === '炸弹') {
                window.audioManager.playBomb();
            } else if (pattern.name === '火箭') {
                window.audioManager.playRocket();
            } else if (pattern.name === '顺子') {
                window.audioManager.playStraight();
            } else if (pattern.name === '连对') {
                window.audioManager.playDoubleStraight();
            } else if (pattern.name === '飞机' || pattern.name === '飞机带单翅膀' || pattern.name === '飞机带对翅膀') {
                window.audioManager.playAirplane();
            } else if (pattern.name === '三张' || pattern.name === '三带一' || pattern.name === '三带二') {
                window.audioManager.playTriple();
            } else {
                window.audioManager.playCardPlay();
            }

            setTimeout(() => {
                if (window.audioManager) {
                    window.audioManager.playScore();
                }
            }, 150);

            // 播放Combo音效（增强版，随连击数变化）
            if (this.gameState.combo > 1.0) {
                setTimeout(() => {
                    if (window.audioManager) {
                        window.audioManager.playCombo(this.gameState.combo);
                    }
                }, 300);
            }
        }

        // 3连击及以上触发屏幕震动
        if (this.gameState.combo >= 1.6 && window.game && window.game.animationManager) {
            // 连击越高，震动越强
            const intensity = Math.min(8, 3 + (this.gameState.combo - 1.6) * 2);
            window.game.animationManager.triggerScreenShake(intensity, 400);
        }

        // 添加炸弹和火箭的视觉特效
        if (window.game && window.game.animationManager) {
            const centerX = this.canvas.width / 2;
            const centerY = this.canvas.height / 2 - 50;

            if (pattern.name === '炸弹') {
                window.game.animationManager.add(new BombExplosionAnimation(centerX, centerY));
            } else if (pattern.name === '火箭') {
                window.game.animationManager.add(new RocketLaunchAnimation(centerX, centerY));
            }
        }

        // 清空选择
        this.selectedCards = [];

        // 献祭者Boss：出牌后立即执行献祭
        if (this.gameState.isBossLevel && this.gameState.bossRule === 'sacrificer' &&
            this.gameState.bossRuleData.sacrificeRequired) {
            const sacrificeResult = this.gameState.performSacrifice();
            if (sacrificeResult.success) {
                alert(`🔥 献祭者Boss规则触发！\n\n${sacrificeResult.message}`);
            }
        }

        // 检查是否胜利
        if (this.gameState.checkWinCondition()) {
            this.handleWin();
        }
        // 检查是否失败（积分不足）
        else if (this.gameState.checkLoseCondition()) {
            this.handleLose();
        }
    }

    // 处理结束回合
    handleEndRound() {
        // 检查游戏是否已经结束
        if (this.gameState.gameOver) {
            return;
        }

        // 教程模式: 只允许在步骤5时结束回合
        if (window.game && window.game.tutorialManager && window.game.tutorialManager.isActive) {
            if (window.game.tutorialManager.getCurrentStepId() !== 'end_round') {
                alert('教程模式: 请先完成当前步骤!');
                return;
            }
        }

        // 动态检查回合是否用完
        const maxAllowedRound = (this.gameState.isBossLevel && this.gameState.bossRule === 'perfectionist')
            ? this.gameState.maxRounds
            : this.gameState.maxRounds + 1;
        if (this.gameState.round > maxAllowedRound) {
            alert('回合已用完!');
            return;
        }

        // 停止限时计时器
        if (this.gameState.specialRule === 'timeLimit') {
            this.gameState.stopTurnTimer();
        }

        this.gameState.endRound();
        this.selectedCards = [];

        // 限时关卡：新回合开始时重启计时器
        if (this.gameState.specialRule === 'timeLimit' && !this.gameState.gameOver) {
            this.gameState.startTurnTimer();
        }

        // 教程模式: 检测步骤5完成
        if (window.game && window.game.tutorialManager && window.game.tutorialManager.isActive) {
            if (window.game.tutorialManager.getCurrentStepId() === 'end_round') {
                window.game.tutorialManager.markStepCompleted('end_round');
            }
        }

        // 播放回合结束音效
        if (window.audioManager) {
            window.audioManager.playRoundEnd();
        }

        // 显示抽牌信息
        if (this.gameState.lastDrawnCards && this.gameState.lastDrawnCards.length > 0) {
            const cardNames = this.gameState.lastDrawnCards.map(c => c.toString()).join(', ');
            alert(`新回合开始!\n抽取了${this.gameState.lastDrawnCards.length}张牌: ${cardNames}\n牌库剩余: ${this.gameState.deckCards.length}张`);
        }

        // 检查是否胜利
        if (this.gameState.checkWinCondition()) {
            console.log('[handleEndRound] 检测到通关条件满足，调用 handleWin()');
            this.handleWin();
        }
        // 检查是否失败
        else if (this.gameState.checkLoseCondition()) {
            this.handleLose();
        } else if (window.game && window.game.tutorialManager && window.game.tutorialManager.isActive) {
            // 教程模式: 不打开商店
            return;
        } else {
            // 打开商店
            this.openShop();
        }
    }

    // 处理弃牌
    handleDiscard() {
        // 检查游戏是否已经结束
        if (this.gameState.gameOver) {
            return;
        }

        // 检查手牌数量
        if (this.gameState.handCards.length <= 5) {
            alert('手牌数不足，无法弃牌！（需要至少6张手牌）');
            return;
        }

        // 检查是否选牌
        if (this.selectedCards.length === 0) {
            alert('请先选择要弃掉的牌（最多4张）!');
            return;
        }

        // 检查选牌数量
        if (this.selectedCards.length > 5) {
            alert('最多只能弃5张牌!');
            return;
        }

        // 获取选中的牌
        const cards = this.selectedCards.map(i => this.gameState.handCards[i]);

        // 执行弃牌
        const result = this.gameState.discardAndDraw(cards);

        if (result.success) {
            // 清空选择
            this.selectedCards = [];

            // 显示结果
            const cardNames = result.drawnCards.map(c => c.toString()).join(', ');
            alert(`${result.message}\n新牌: ${cardNames}`);

            // 教程模式: 检测步骤4完成 (在alert之后,避免阻塞)
            if (window.game && window.game.tutorialManager && window.game.tutorialManager.isActive) {
                console.log('[Input] 教程模式激活,当前步骤:', window.game.tutorialManager.getCurrentStepId());
                if (window.game.tutorialManager.getCurrentStepId() === 'discard') {
                    console.log('[Input] 调用 markStepCompleted(discard)');
                    window.game.tutorialManager.markStepCompleted('discard');
                }
            }
        } else {
            alert(result.message);
        }
    }

    // 处理豪赌按钮点击
    handleGamble() {
        // 检查激活条件
        if (this.gameState.gambleMode) {
            alert('豪赌已激活！');
            return;
        }

        if (this.gameState.round !== 1 || this.gameState.playCountThisRound > 0) {
            alert('只能在第一回合出牌前激活豪赌！');
            return;
        }

        // 确认对话框
        const confirmed = confirm(
            '⚠️ 启动豪赌模式?\n\n' +
            '✅ S评价: 积分翻倍 (2.0×)\n' +
            '❌ A/B评价: 积分减半 (0.5×)\n\n' +
            '目标: 在2回合内完成关卡！\n' +
            '激活后无法撤销！'
        );

        if (confirmed) {
            this.gameState.gambleMode = true;
            this.gameState.gambleLevelActive = true;

            // 播放音效
            if (window.audioManager) {
                window.audioManager.playButtonClick();
            }

            alert('🔥 豪赌模式已激活！\n争取在2回合内完成，获得S评价！');
        }
    }

    // 打开商店
    openShop() {
        // 暂停限时关卡的倒计时
        this.gameState.pauseTurnTimer();

        // 在打开商店前应用评价倍率
        if (this.gameState.rating) {
            const beforeScore = this.gameState.score;
            this.gameState.applyRatingBonus();
            const afterScore = this.gameState.score;

            // 显示评价信息
            let ratingMessage = '';

            // 豪赌模式的特殊消息
            if (this.gameState.gambleLevelActive) {
                if (this.gameState.rating === 'S') {
                    ratingMessage = `🎰 豪赌成功！S评价达成！\n(${this.gameState.finishRound}回合内完成)\n金币翻倍: ${beforeScore} → ${afterScore}分`;
                } else if (this.gameState.rating === 'A') {
                    ratingMessage = `💔 豪赌失败... A评价\n(${this.gameState.finishRound}回合完成)\n金币减半: ${beforeScore} → ${afterScore}分`;
                } else if (this.gameState.rating === 'B') {
                    ratingMessage = `💔 豪赌失败... B评价\n(${this.gameState.finishRound}回合完成)\n金币减半: ${beforeScore} → ${afterScore}分`;
                }
            } else {
                // 原有的评级消息
                if (this.gameState.rating === 'S') {
                    ratingMessage = `🏆 S评价达成! (${this.gameState.finishRound}回合内完成)\n金币奖励 +20%: ${beforeScore} → ${afterScore}分`;
                } else if (this.gameState.rating === 'A') {
                    ratingMessage = `⭐ A评价达成! (${this.gameState.finishRound}回合内完成)\n金币保持不变: ${afterScore}分`;
                } else if (this.gameState.rating === 'B') {
                    ratingMessage = `📉 B评价 (${this.gameState.finishRound}回合完成)\n金币惩罚 -50%: ${beforeScore} → ${afterScore}分`;
                }
            }

            if (ratingMessage) {
                alert(ratingMessage);
            }

            // 评价只应用一次，应用后清除
            this.gameState.rating = null;
        }

        this.shop.refreshItems(this.gameState);

        const shopModal = document.getElementById('shopModal');
        const shopItems = document.getElementById('shopItems');

        shopItems.innerHTML = '';

        // Boss奖励：混乱法师 - 随机获得2个免费道具
        if (window.game && window.game.pendingFreeItems > 0) {
            const freeItemCount = window.game.pendingFreeItems;
            window.game.pendingFreeItems = 0;

            // 从当前商店道具中随机选择（排除永久道具和负面道具）
            const availableItems = this.shop.currentItems.filter(item => item.type !== 'permanent' && item.type !== 'negative');
            const selectedItems = [];

            for (let i = 0; i < Math.min(freeItemCount, availableItems.length); i++) {
                const randomIndex = Math.floor(Math.random() * availableItems.length);
                const item = availableItems.splice(randomIndex, 1)[0];
                selectedItems.push(item);
            }

            // 自动添加到临时道具
            selectedItems.forEach(item => {
                this.gameState.temporaryItems.push(item);
            });

            if (selectedItems.length > 0) {
                const itemNames = selectedItems.map(i => i.name).join('、');
                alert(`🎭 混乱法师Boss奖励！\n\n免费获得道具：${itemNames}`);
            }
        }

        // 显示商店使用状态
        if (this.shop.usedThisRound) {
            const usedHint = document.createElement('div');
            usedHint.className = 'shop-used-hint';
            usedHint.textContent = '⚠️ 本轮商店已使用，下一轮才能再次购买';
            usedHint.style.color = '#e74c3c';
            usedHint.style.textAlign = 'center';
            usedHint.style.marginBottom = '10px';
            usedHint.style.fontSize = '12px';
            usedHint.style.fontWeight = 'bold';
            shopItems.appendChild(usedHint);
        }

        this.shop.currentItems.forEach(item => {
            const itemDiv = document.createElement('div');
            itemDiv.className = `shop-item ${item.type}`;

            const nameDiv = document.createElement('div');
            nameDiv.className = 'shop-item-name';
            nameDiv.textContent = item.name;

            const descDiv = document.createElement('div');
            descDiv.className = 'shop-item-desc';
            descDiv.textContent = item.description;

            const priceDiv = document.createElement('div');
            priceDiv.className = item.price < 0 ? 'shop-item-price negative-price' : 'shop-item-price';

            // 特质：经济头脑 - 显示折扣价格
            let displayPrice = item.price;
            if (this.gameState.currentTrait && this.gameState.currentTrait.id === 'economic_mind' && item.price > 0) {
                displayPrice = Math.floor(item.price * 0.7);
                priceDiv.textContent = `${displayPrice}分 (原价${item.price})`;
            } else {
                priceDiv.textContent = item.price < 0 ? `获得${-item.price}分` : `${item.price}分`;
            }

            itemDiv.appendChild(nameDiv);
            itemDiv.appendChild(descDiv);
            itemDiv.appendChild(priceDiv);

            itemDiv.addEventListener('click', () => {
                const result = this.shop.buyItem(item, this.gameState);
                if (result.success) {
                    // 播放购买音效
                    if (window.audioManager) {
                        window.audioManager.playPurchase();
                    }
                    alert(result.message);
                    this.closeShop(); // 购买成功后关闭商店
                    SaveManager.save(this.gameState); // 保存进度
                } else {
                    alert(result.message);
                }
            });

            shopItems.appendChild(itemDiv);
        });

        shopModal.style.display = 'flex';
    }

    // 关闭商店
    closeShop() {
        document.getElementById('shopModal').style.display = 'none';

        // 限时关卡：重新启动倒计时（重置为30秒）
        if (this.gameState.specialRule === 'timeLimit') {
            this.gameState.startTurnTimer();
        }

        // 修复：如果在商店中购买了行动点透支道具，立即应用惩罚
        // 这样惩罚会在下回合生效，而不是下下回合
        if (this.gameState.actionPenaltyNextRound > 0) {
            this.gameState.resetActionPoints();
        }
    }

    // 打开道具栏
    openItems() {
        const itemsModal = document.getElementById('itemsModal');
        const playerItems = document.getElementById('playerItems');

        playerItems.innerHTML = '';

        if (this.gameState.temporaryItems.length === 0) {
            playerItems.innerHTML = '<div class="empty-items">暂无道具</div>';
        } else {
            this.gameState.temporaryItems.forEach((item, index) => {
                const itemDiv = document.createElement('div');
                itemDiv.className = 'player-item';

                const nameDiv = document.createElement('div');
                nameDiv.className = 'player-item-name';
                nameDiv.textContent = item.name;

                const descDiv = document.createElement('div');
                descDiv.className = 'shop-item-desc';
                descDiv.textContent = item.description;

                itemDiv.appendChild(nameDiv);
                itemDiv.appendChild(descDiv);

                itemDiv.addEventListener('click', () => {
                    if (confirm(`使用道具:${item.name}?`)) {
                        const selectedCards = this.selectedCards.map(i => this.gameState.handCards[i]);
                        const result = item.use(this.gameState, selectedCards);

                        if (result.success) {
                            alert(result.message);

                            // 使用后移除道具
                            this.gameState.temporaryItems.splice(index, 1);

                            this.selectedCards = [];
                            this.closeItems();

                            // 检查是否需要触发胜利（如火箭助推器打出最后5张牌）
                            if (result.checkWin && this.gameState.checkWinCondition()) {
                                this.handleWin();
                            }
                        } else {
                            alert(result.message);
                        }
                    }
                });

                playerItems.appendChild(itemDiv);
            });
        }

        itemsModal.style.display = 'flex';
    }

    // 关闭道具栏
    closeItems() {
        document.getElementById('itemsModal').style.display = 'none';
    }

    // 处理胜利
    handleWin() {
        console.log('[handleWin] 开始执行通关逻辑');
        this.gameState.gameOver = true;

        // 播放胜利音效
        if (window.audioManager) {
            window.audioManager.playWin();
        }

        const resultModal = document.getElementById('resultModal');
        const resultTitle = document.getElementById('resultTitle');
        const resultMessage = document.getElementById('resultMessage');

        console.log('[handleWin] 模态框元素:', resultModal, resultTitle, resultMessage);

        resultTitle.textContent = '通关成功!';
        resultTitle.style.color = '#2ecc71';

        // 获取评价文本
        let ratingText = '';
        if (this.gameState.rating === 'S') {
            ratingText = '🏆 S评价';
        } else if (this.gameState.rating === 'A') {
            ratingText = '⭐ A评价';
        } else if (this.gameState.rating === 'B') {
            ratingText = '📉 B评价';
        }

        // 检查是否完成第10关(游戏通关)
        if (this.gameState.level >= 10) {
            // 通关第10关，奖励500金币
            // 特质：经济头脑 - 金币奖励减少30%
            let coinReward = 500;
            if (this.gameState.currentTrait && this.gameState.currentTrait.id === 'economic_mind') {
                coinReward = Math.floor(500 * 0.7); // 350金币
            }

            if (window.game) {
                window.game.addCoins(coinReward);
            }

            resultMessage.textContent = `🎉 恭喜完成全部关卡! 🎉\n评价: ${ratingText} (${this.gameState.finishRound}回合)\n最终关卡: 第${this.gameState.level}关\n最终得分: ${this.gameState.score + 50}\n\n🎁 通关奖励: ${coinReward}金币\n\n游戏通关!`;

            // 隐藏下一关按钮
            document.getElementById('nextLevelBtn').style.display = 'none';
        } else {
            // 应用Boss奖励
            let bossRewardText = '';
            if (this.gameState.bossRewardPending) {
                const rewardMessage = this.gameState.applyBossReward();
                if (rewardMessage) {
                    bossRewardText = `\n\n🎁 ${rewardMessage}`;

                    // 混乱法师特殊处理：给予免费道具
                    if (this.gameState.bossRuleData.freeItemsReward) {
                        // 这里需要在打开商店时处理
                        window.game.pendingFreeItems = this.gameState.bossRuleData.freeItemsReward;
                    }
                }
            }

            resultMessage.textContent = `恭喜通关第${this.gameState.level}关!\n评价: ${ratingText} (${this.gameState.finishRound}回合)\n获得奖励:50分\n当前总分:${this.gameState.score + 50}${bossRewardText}`;

            // 显示下一关按钮
            document.getElementById('nextLevelBtn').style.display = 'inline-block';
            document.getElementById('nextLevelBtn').onclick = () => {
                LevelManager.nextLevel(this.gameState);
                SaveManager.save(this.gameState);
                this.selectedCards = [];
                resultModal.style.display = 'none';

                // 显示特质选择界面
                setTimeout(() => {
                    this.showTraitSelection();
                }, 100);

                // 显示Boss关规则提示
                if (this.gameState.isBossLevel && this.gameState.bossRule) {
                    setTimeout(() => {
                        const bossMessages = {
                            'perfectionist': '💎 Boss关: 完美主义者\n\n规则：必须在2回合内出完所有手牌\n且总积分必须达到1.5倍要求\n\n奖励：本局游戏剩余关卡积分获取+20%',
                            'orderGuardian': '🛡️ Boss关: 秩序守护者\n\n规则：必须按顺序出牌型\n单牌→对子→[三张/三带一/三带二]→顺子→连对→[飞机/飞机带单翅膀/飞机带对翅膀]→炸弹→四带二\n方括号内的牌型打出任意一种即可解锁下一组\n火箭可随时打出\n\n奖励：永久行动点+2（本局游戏）',
                            'chaosMage': '🎭 Boss关: 混乱法师\n\n规则：每回合开始时随机交换两种牌型的行动点消耗\n牌型积分不变\n\n奖励：随机获得2个商店道具（免费）',
                            'pressureTester': '⚡ Boss关: 压力测试者\n\n规则：无法主动弃牌\n回合结束时若手牌超过15张\n超出部分每张使下回合行动点-1\n\n奖励：本局游戏剩余关卡每回合行动点+1',
                            'sacrificer': '🔥 Boss关: 献祭者\n\n规则：每次打出一手牌后\n必须立即从手牌中弃掉一张与所出牌型中任意一张牌点数相同的牌\n若手牌中没有可匹配点数的牌\n则改为随机弃掉两张手牌\n\n奖励：永久获得弃牌点上限+2'
                        };
                        const message = bossMessages[this.gameState.bossRule];
                        if (message) alert(message);
                    }, 500);
                }
                // 显示普通特殊规则提示
                else if (this.gameState.specialRule) {
                    setTimeout(() => {
                        const patternNames = {
                            'PAIR': '对子', 'TRIPLE': '三张', 'STRAIGHT': '顺子',
                            'DOUBLE_STRAIGHT': '连对', 'AIRPLANE': '飞机'
                        };
                        let message = '';
                        if (this.gameState.specialRule === 'timeLimit') {
                            message = '⏰ 限时关卡!\n每次出牌前有30秒思考时间\n出牌后计时器重置\n超时将自动结束回合并扣除"剩余手牌数×5"的积分!';
                        } else if (this.gameState.specialRule === 'doubleCost') {
                            const patternName = patternNames[this.gameState.specialRuleData.pattern] || '未知';
                            message = `⚠️ 消耗加倍关卡!\n${patternName}的行动点消耗加倍!`;
                        }
                        if (message) alert(message);
                    }, 500);
                }
            };
        }

        // 记录统计
        Statistics.recordGame(this.gameState.level, this.gameState.score, true);

        document.getElementById('retryBtn').style.display = 'none';

        console.log('[handleWin] 准备显示模态框');
        resultModal.style.display = 'flex';
        console.log('[handleWin] 模态框已设置为 display: flex');
    }

    // 处理失败
    handleLose() {
        this.gameState.gameOver = true;

        // 播放失败音效
        if (window.audioManager) {
            window.audioManager.playLose();
        }

        const resultModal = document.getElementById('resultModal');
        const resultTitle = document.getElementById('resultTitle');
        const resultMessage = document.getElementById('resultMessage');

        resultTitle.textContent = '挑战失败!';
        resultTitle.style.color = '#e74c3c';

        // 区分失败原因
        let failReason = '';
        if (this.gameState.handCards.length === 0 && this.gameState.levelScore < this.gameState.levelScoreRequirement) {
            // 手牌出完但积分不足
            failReason = `失败原因: 积分不足\n本关积分: ${this.gameState.levelScore}/${this.gameState.levelScoreRequirement}\n差距: ${this.gameState.levelScoreRequirement - this.gameState.levelScore}分`;
        } else {
            // 回合用完但手牌未出完
            failReason = `失败原因: 回合用完\n剩余手牌: ${this.gameState.handCards.length}张`;
        }

        resultMessage.textContent = `第${this.gameState.level}关失败\n${failReason}\n当前总分: ${this.gameState.score}`;

        // 记录统计
        Statistics.recordGame(this.gameState.level, this.gameState.score, false);

        // 显示重试按钮
        document.getElementById('nextLevelBtn').style.display = 'none';
        document.getElementById('retryBtn').style.display = 'inline-block';

        document.getElementById('retryBtn').onclick = () => {
            LevelManager.retryLevel(this.gameState);
            SaveManager.save(this.gameState);
            this.selectedCards = [];
            resultModal.style.display = 'none';

            // 显示特质选择界面
            setTimeout(() => {
                this.showTraitSelection();
            }, 100);
        };

        resultModal.style.display = 'flex';
    }

    // 获取选中的牌索引
    getSelectedIndices() {
        return this.selectedCards;
    }

    // 获取悬停的牌索引
    getHoveredIndex() {
        return this.hoveredCardIndex;
    }

    // 显示特质选择界面
    showTraitSelection() {
        if (!this.gameState.availableTraits || this.gameState.availableTraits.length === 0) {
            console.error('没有可选的特质');
            return;
        }

        if (this.gameState.traitSelected) {
            console.log('特质已选择，跳过');
            return;
        }

        // 暂停限时关卡的倒计时
        this.gameState.pauseTurnTimer();

        this.renderer.renderTraitSelection(this.gameState.availableTraits, (selectedTrait) => {
            this.handleTraitSelection(selectedTrait);
        });
    }

    // 处理特质选择
    handleTraitSelection(trait) {
        this.gameState.currentTrait = trait;
        this.gameState.traitSelected = true;

        // 特质：以逸待劳 - 立即应用弃牌点上限减少
        if (trait.id === 'rest_and_wait') {
            this.gameState.maxDiscardPoints = 3;
            // 如果当前弃牌点超过新上限，调整为上限值
            if (this.gameState.discardPoints > 3) {
                this.gameState.discardPoints = 3;
            }
        }

        // 恢复限时关卡的倒计时
        this.gameState.resumeTurnTimer();

        // 播放音效
        if (window.audioManager) {
            window.audioManager.playButtonClick();
        }

        alert(`已选择特质: ${trait.name}\n${trait.description}`);
    }

    // 显示提示模态框
    showHintModal(suggestions) {
        const hintModal = document.getElementById('hintModal');
        const hintSuggestions = document.getElementById('hintSuggestions');

        // 清空之前的建议
        hintSuggestions.innerHTML = '';

        if (suggestions.length === 0) {
            hintSuggestions.innerHTML = '<p style="color: #95a5a6;">当前手牌无法组成有效牌型!</p>';
        } else {
            suggestions.forEach((suggestion, index) => {
                const card = document.createElement('div');
                card.className = 'hint-card';

                const title = document.createElement('div');
                title.className = 'hint-card-title';
                title.textContent = `建议${index + 1}: ${suggestion.name}`;

                const cards = document.createElement('div');
                cards.className = 'hint-card-cards';
                cards.textContent = `牌张: ${suggestion.cards.map(c => c.toString()).join(' ')}`;

                const info = document.createElement('div');
                info.className = 'hint-card-info';
                info.innerHTML = `<span>得分: ${suggestion.score}</span><span>消耗: ${suggestion.actionCost}点</span>`;

                card.appendChild(title);
                card.appendChild(cards);
                card.appendChild(info);

                // 点击建议自动选中对应手牌
                card.addEventListener('click', () => {
                    this.selectCardsFromSuggestion(suggestion);
                    hintModal.style.display = 'none';
                });

                hintSuggestions.appendChild(card);
            });
        }

        hintModal.style.display = 'flex';
    }

    // 根据建议选中手牌
    selectCardsFromSuggestion(suggestion) {
        // 清空当前选择
        this.selectedCards = [];

        // 找到建议中的牌在手牌中的索引
        suggestion.cards.forEach(suggestedCard => {
            const index = this.gameState.handCards.findIndex(card =>
                card === suggestedCard
            );
            if (index !== -1 && !this.selectedCards.includes(index)) {
                this.selectedCards.push(index);
            }
        });

        // 游戏会自动重新渲染,不需要手动调用render
    }
}
