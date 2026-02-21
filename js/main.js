// 主游戏循环

class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');

        // 先创建渲染器（此时还没有设置尺寸）
        this.renderer = new UIRenderer(this.ctx);

        // 初始化Canvas自适应尺寸
        this.initResponsiveCanvas();

        this.state = new GameState();
        this.shop = new Shop();
        this.input = null;
        this.animationManager = new AnimationManager();
        this.audioManager = new AudioManager();
        this.tutorialManager = new TutorialManager(); // 新增教程管理器

        // 金币系统
        this.coins = SaveManager.loadCoins();

        // 全局访问音效管理器
        window.audioManager = this.audioManager;

        this.lastTime = 0;
        this.running = false;

        this.setupMainMenu();

        // 监听窗口大小变化
        window.addEventListener('resize', () => this.handleResize());
    }

    // 初始化响应式Canvas
    initResponsiveCanvas() {
        const updateCanvasSize = () => {
            const isMobile = window.innerWidth <= 768;

            if (isMobile) {
                // 移动端：使用视口宽度,保持4:3比例
                const width = Math.min(window.innerWidth - 20, 600);
                const height = width * 0.75; // 4:3比例

                // 设置Canvas实际分辨率
                this.canvas.width = width;
                this.canvas.height = height;

                // 更新渲染器的卡牌尺寸（根据Canvas宽度缩放）
                const scale = width / 800;
                if (this.renderer) {
                    this.renderer.cardWidth = Math.floor(50 * scale);
                    this.renderer.cardHeight = Math.floor(70 * scale);
                    this.renderer.scale = scale; // 保存缩放比例供渲染器使用
                }
            } else {
                // 桌面端：固定尺寸
                this.canvas.width = 800;
                this.canvas.height = 600;
                if (this.renderer) {
                    this.renderer.cardWidth = 50;
                    this.renderer.cardHeight = 70;
                    this.renderer.scale = 1.0;
                }
            }

            // 重新初始化Canvas上下文
            if (this.renderer) {
                this.renderer.initCanvasContext();
            }
        };

        updateCanvasSize();
    }

    // 处理窗口大小变化
    handleResize() {
        this.initResponsiveCanvas();
        // 如果游戏正在运行,强制重绘
        if (this.running) {
            this.render();
        }
    }

    // 设置主菜单
    setupMainMenu() {
        const mainMenu = document.getElementById('mainMenu');
        const gameScreen = document.getElementById('gameScreen');
        const leftSidebar = document.getElementById('leftSidebar');

        // 更新金币显示
        this.updateCoinDisplay();

        // 检查是否有存档
        const hasSave = SaveManager.hasSave();
        document.getElementById('continueGameBtn').disabled = !hasSave;

        // 开始游戏
        document.getElementById('startGameBtn').addEventListener('click', async () => {
            mainMenu.style.display = 'none';
            gameScreen.style.display = 'block';
            leftSidebar.style.display = 'block';

            // 确保字体已加载
            if (document.fonts && document.fonts.ready) {
                await document.fonts.ready;
            }

            // 等待DOM更新后再开始游戏
            setTimeout(async () => {
                await this.startNewGame();
            }, 100);
        });

        // 新手教程
        document.getElementById('tutorialBtn').addEventListener('click', async () => {
            mainMenu.style.display = 'none';
            gameScreen.style.display = 'block';
            leftSidebar.style.display = 'block';

            // 确保字体已加载
            if (document.fonts && document.fonts.ready) {
                await document.fonts.ready;
            }

            // 等待DOM更新后再开始教程
            setTimeout(async () => {
                await this.startTutorial();
            }, 100);
        });

        // 继续游戏
        document.getElementById('continueGameBtn').addEventListener('click', () => {
            if (hasSave) {
                mainMenu.style.display = 'none';
                gameScreen.style.display = 'block';
                leftSidebar.style.display = 'block';
                this.continueGame();
            }
        });

        // 卡牌商店按钮
        document.getElementById('cardShopBtn').addEventListener('click', () => {
            this.openCardShop();
        });

        // 天赋商店按钮
        document.getElementById('talentShopBtn').addEventListener('click', () => {
            this.openTalentShop();
        });

        // 重置存档
        document.getElementById('resetGameBtn').addEventListener('click', () => {
            if (confirm('【警告】确定要删除存档吗？\n\n此操作将同时删除：\n- 游戏进度\n- 所有金币\n- 所有卡牌升级\n\n此操作不可恢复！')) {
                if (confirm('再次确认：真的要删除所有数据吗？')) {
                    SaveManager.deleteSave();
                    alert('所有数据已删除！');
                    location.reload();
                }
            }
        });

        // 关闭卡牌商店按钮
        document.getElementById('closeCardShopBtn').addEventListener('click', () => {
            this.closeCardShop();
        });

        // 关闭天赋商店按钮
        document.getElementById('closeTalentShopBtn').addEventListener('click', () => {
            this.closeTalentShop();
        });
    }

    // 开始教程
    async startTutorial() {
        // 再次确保字体已加载
        if (document.fonts && document.fonts.ready) {
            await document.fonts.ready;
            console.log('字体加载状态:', document.fonts.check('12px "Press Start 2P"'));
        }

        // 重新初始化Canvas上下文
        this.renderer.initCanvasContext();

        // 创建新的GameState
        this.state = new GameState();

        // 初始化输入处理器
        this.input = new InputHandler(this.canvas, this.state, this.renderer, this.shop);
        window.inputHandler = this.input;

        // 启动教程管理器
        this.tutorialManager.start(this);

        // 绑定跳过教程按钮
        document.getElementById('skipTutorialBtn').addEventListener('click', () => {
            this.tutorialManager.skip();
        });

        // 启动游戏循环
        this.running = true;
        this.lastTime = performance.now();

        // 等待一帧,确保Canvas上下文完全准备好
        requestAnimationFrame(() => {
            this.gameLoop(performance.now());
        });
    }

    // 开始新游戏
    async startNewGame() {
        // 再次确保字体已加载
        if (document.fonts && document.fonts.ready) {
            await document.fonts.ready;
            console.log('字体加载状态:', document.fonts.check('12px "Press Start 2P"'));
        }

        // 重新初始化Canvas上下文（确保字体设置生效）
        this.renderer.initCanvasContext();

        // 创建全新GameState（不保留永久道具）
        this.state = new GameState();
        this.state.level = 1;
        this.state.score = 0;

        // 加载卡牌升级状态
        this.state.upgradedCardRanks = SaveManager.loadCardUpgrades();

        // 加载天赋数据
        this.state.purchasedTalents = SaveManager.loadTalents();

        // 初始化特质选择
        this.state.availableTraits = TraitManager.drawThreeTraits();
        this.state.traitSelected = false;

        const cardCount = LevelManager.getCardCount(this.state.level);
        this.state.dealCards(cardCount);

        this.input = new InputHandler(this.canvas, this.state, this.renderer, this.shop);
        window.inputHandler = this.input; // 全局访问输入处理器
        this.running = true;
        this.lastTime = performance.now();

        SaveManager.save(this.state);

        // 等待一帧,确保Canvas上下文完全准备好
        requestAnimationFrame(() => {
            this.gameLoop(performance.now());

            // 显示特质选择界面（不触发发牌动画）
            setTimeout(() => {
                this.input.showTraitSelection();
            }, 100);
        });
    }

    // 继续游戏
    continueGame() {
        const saveData = SaveManager.load();
        if (!saveData) {
            alert('加载存档失败!');
            this.startNewGame();
            return;
        }

        SaveManager.applyToGameState(this.state, saveData);
        this.input = new InputHandler(this.canvas, this.state, this.renderer, this.shop);
        window.inputHandler = this.input; // 全局访问输入处理器
        this.running = true;
        this.lastTime = performance.now();

        this.gameLoop(performance.now());

        // 显示特质选择界面（如果还未选择）
        if (!this.state.traitSelected) {
            setTimeout(() => {
                this.input.showTraitSelection();
            }, 100);
        }
    }

    // 主游戏循环
    gameLoop(currentTime) {
        if (!this.running) return;

        const deltaTime = currentTime - this.lastTime;
        this.lastTime = currentTime;

        // 检查限时关卡超时
        if (this.state.specialRule === 'timeLimit' && this.state.checkTurnTimeout()) {
            const penalty = this.state.handleTimeout();
            alert(`⏰ 超时!\n自动结束回合\n扣除积分: ${penalty}分 (剩余手牌${this.state.handCards.length + this.state.round * 3}张 × 5)`);

            // 检查是否失败
            if (this.state.checkLoseCondition()) {
                this.input.handleLose();
            } else if (this.state.round <= this.state.maxRounds) {
                // 打开商店
                this.input.openShop();
            }
        }

        // 更新动画
        this.animationManager.update(deltaTime);

        // 更新豪赌按钮显示状态
        this.updateGambleButton();

        // 渲染
        this.render();

        // 继续循环
        requestAnimationFrame((time) => this.gameLoop(time));
    }

    // 渲染
    render() {
        // 清空画布
        this.renderer.clear();

        // 绘制牌库图标（左上角）
        this.renderer.drawDeckIcon(20 * this.renderer.scale, 80 * this.renderer.scale);

        // 获取屏幕震动偏移
        const shakeOffset = this.animationManager.getShakeOffset();

        // 应用屏幕震动
        this.ctx.save();
        this.ctx.translate(shakeOffset.x, shakeOffset.y);

        // 绘制顶部信息栏
        this.renderer.drawTopBar(this.state);

        // 更新左侧状态栏
        this.renderer.updateLeftSidebar(this.state);

        // 绘制出牌区域
        this.renderer.drawPlayArea(this.state.lastPlayed, this.state.lastScore);

        // 绘制手牌（传递悬停索引和游戏状态）
        // 如果正在播放发牌动画，只绘制已着陆的牌
        if (!this.state.hideHandCards) {
            const selectedIndices = this.input ? this.input.getSelectedIndices() : [];
            const hoveredIndex = this.input ? this.input.getHoveredIndex() : -1;

            // 如果有已着陆的牌列表且不为空，只渲染已着陆的牌
            if (this.state.landedCardIndices && this.state.landedCardIndices.length > 0 && this.state.landedCardIndices.length < this.state.handCards.length) {
                // 过滤出已着陆的牌
                const landedCards = this.state.handCards.filter((card, index) => this.state.landedCardIndices.includes(index));
                const landedSelectedIndices = selectedIndices.filter(index => this.state.landedCardIndices.includes(index));
                const landedHoveredIndex = this.state.landedCardIndices.includes(hoveredIndex) ? hoveredIndex : -1;

                this.renderer.drawHandCards(landedCards, landedSelectedIndices, this.state.level, landedHoveredIndex, this.state);
            } else {
                // 正常渲染所有手牌
                this.renderer.drawHandCards(this.state.handCards, selectedIndices, this.state.level, hoveredIndex, this.state);
            }
        }

        // 绘制动画
        this.animationManager.render(this.ctx);

        // 恢复上下文
        this.ctx.restore();

        // 绘制Boss规则提示框（点击后显示，在所有内容之上，不受震动影响）
        if (this.input && this.renderer.bossRuleTooltipVisible) {
            const mousePos = this.input.getMousePosition();
            this.renderer.drawBossRuleTooltip(mousePos.x, mousePos.y);
        }

        // 绘制提示信息（不受震动影响）
        if (this.state.gameOver) {
            if (this.state.checkWinCondition()) {
                this.renderer.drawHint('恭喜通关!', '#2ecc71');
            } else {
                this.renderer.drawHint('挑战失败!', '#e74c3c');
            }
        } else {
            // 动态检查回合是否用完
            const maxAllowedRound = (this.state.isBossLevel && this.state.bossRule === 'perfectionist')
                ? this.state.maxRounds
                : this.state.maxRounds + 1;
            if (this.state.round > maxAllowedRound) {
                this.renderer.drawHint('回合已用完!请结束回合', '#e74c3c');
            }
        }
    }

    // 触发发牌动画
    triggerDealCardsAnimation(cards) {
        // 清空已着陆的卡牌索引
        this.state.landedCardIndices = [];

        // 牌库位置（左上角）
        const deckX = 20 * this.renderer.scale;
        const deckY = 80 * this.renderer.scale;

        // 计算手牌区位置
        const startX = 50 * this.renderer.scale;
        const level = this.state.level;

        if (level >= 5) {
            // 两行显示
            const midPoint = Math.ceil(cards.length / 2);
            const topRowCards = cards.slice(0, midPoint);
            const bottomRowCards = cards.slice(midPoint);

            const topGap = Math.min(60 * this.renderer.scale, (this.canvas.width - 100 * this.renderer.scale) / topRowCards.length);
            const bottomGap = Math.min(60 * this.renderer.scale, (this.canvas.width - 100 * this.renderer.scale) / bottomRowCards.length);

            const rowSpacing = 90 * this.renderer.scale;
            const topY = this.canvas.height - this.renderer.cardHeight - 80 * this.renderer.scale - rowSpacing;
            const bottomY = this.canvas.height - this.renderer.cardHeight - 80 * this.renderer.scale;

            // 上行动画
            topRowCards.forEach((card, i) => {
                const endX = startX + i * topGap;
                const endY = topY;
                const delay = i * 100; // 每张牌间隔0.1秒
                const anim = new CardFlyInAnimation(card, deckX, deckY, endX, endY, this.renderer, delay, i, this.state);
                this.animationManager.add(anim);
            });

            // 下行动画
            bottomRowCards.forEach((card, i) => {
                const endX = startX + i * bottomGap;
                const endY = bottomY;
                const delay = (midPoint + i) * 100; // 继续延迟
                const anim = new CardFlyInAnimation(card, deckX, deckY, endX, endY, this.renderer, delay, midPoint + i, this.state);
                this.animationManager.add(anim);
            });
        } else {
            // 单行显示
            const startY = this.canvas.height - this.renderer.cardHeight - 80 * this.renderer.scale;
            const gap = Math.min(60 * this.renderer.scale, (this.canvas.width - 100 * this.renderer.scale) / cards.length);

            cards.forEach((card, i) => {
                const endX = startX + i * gap;
                const endY = startY;
                const delay = i * 100; // 每张牌间隔0.1秒
                const anim = new CardFlyInAnimation(card, deckX, deckY, endX, endY, this.renderer, delay, i, this.state);
                this.animationManager.add(anim);
            });
        }
    }

    // 触发弃牌动画
    triggerDiscardAnimation(discardedCards, drawnCards) {
        // 标记所有现有手牌为已着陆（除了新抽的牌）
        this.state.landedCardIndices = [];
        const newCardStartIndex = this.state.handCards.length - drawnCards.length;
        for (let i = 0; i < newCardStartIndex; i++) {
            this.state.landedCardIndices.push(i);
        }

        // 弃牌堆位置（右下角）
        const discardPileX = this.canvas.width - 100 * this.renderer.scale;
        const discardPileY = this.canvas.height - 100 * this.renderer.scale;

        // 牌库位置（左上角）
        const deckX = 20 * this.renderer.scale;
        const deckY = 80 * this.renderer.scale;

        // 计算手牌区位置
        const startX = 50 * this.renderer.scale;
        const level = this.state.level;

        // 1. 弃牌飞出动画
        discardedCards.forEach((cardInfo, i) => {
            const delay = i * 50; // 每张牌间隔0.05秒
            const anim = new CardFlyOutAnimation(
                cardInfo.card,
                cardInfo.x,
                cardInfo.y,
                discardPileX,
                discardPileY,
                this.renderer,
                delay
            );
            this.animationManager.add(anim);
        });

        // 2. 短暂停顿后，抽牌补入动画
        const discardDuration = 200 + (discardedCards.length - 1) * 50; // 弃牌总时长

        if (level >= 5) {
            // 两行显示 - 需要计算新牌的位置
            const midPoint = Math.ceil(this.state.handCards.length / 2);
            const topRowCount = midPoint;
            const bottomRowCount = this.state.handCards.length - midPoint;

            const topGap = Math.min(60 * this.renderer.scale, (this.canvas.width - 100 * this.renderer.scale) / topRowCount);
            const bottomGap = Math.min(60 * this.renderer.scale, (this.canvas.width - 100 * this.renderer.scale) / bottomRowCount);

            const rowSpacing = 90 * this.renderer.scale;
            const topY = this.canvas.height - this.renderer.cardHeight - 80 * this.renderer.scale - rowSpacing;
            const bottomY = this.canvas.height - this.renderer.cardHeight - 80 * this.renderer.scale;

            // 简化处理：新牌飞入到手牌区末尾
            drawnCards.forEach((card, i) => {
                const cardIndex = this.state.handCards.length - drawnCards.length + i;
                let endX, endY;

                if (cardIndex < midPoint) {
                    // 上行
                    endX = startX + cardIndex * topGap;
                    endY = topY;
                } else {
                    // 下行
                    endX = startX + (cardIndex - midPoint) * bottomGap;
                    endY = bottomY;
                }

                const delay = discardDuration + 100 + i * 50; // 弃牌完成后延迟0.1秒，然后每张间隔0.05秒
                const anim = new CardFlyInAnimation(card, deckX, deckY, endX, endY, this.renderer, delay, cardIndex, this.state);
                this.animationManager.add(anim);
            });
        } else {
            // 单行显示
            const startY = this.canvas.height - this.renderer.cardHeight - 80 * this.renderer.scale;
            const gap = Math.min(60 * this.renderer.scale, (this.canvas.width - 100 * this.renderer.scale) / this.state.handCards.length);

            drawnCards.forEach((card, i) => {
                const cardIndex = this.state.handCards.length - drawnCards.length + i;
                const endX = startX + cardIndex * gap;
                const endY = startY;
                const delay = discardDuration + 100 + i * 50; // 弃牌完成后延迟0.1秒，然后每张间隔0.05秒
                const anim = new CardFlyInAnimation(card, deckX, deckY, endX, endY, this.renderer, delay, cardIndex, this.state);
                this.animationManager.add(anim);
            });
        }
    }

    // 更新豪赌按钮显示状态
    updateGambleButton() {
        const gambleBtn = document.getElementById('gambleBtn');
        if (!gambleBtn) return;

        // 教程模式下不显示
        if (this.tutorialManager && this.tutorialManager.isActive) {
            gambleBtn.style.display = 'none';
            return;
        }

        // 显示条件：第一回合且未出牌
        if (this.state.round === 1 && this.state.playCountThisRound === 0) {
            gambleBtn.style.display = 'inline-block';

            // 按钮状态
            if (this.state.gambleMode) {
                gambleBtn.textContent = '🔥 豪赌中';
                gambleBtn.disabled = true;
                gambleBtn.classList.add('active');
            } else {
                gambleBtn.textContent = '🎲 豪赌';
                gambleBtn.disabled = false;
                gambleBtn.classList.remove('active');
            }
        } else {
            gambleBtn.style.display = 'none';
        }
    }

    // 停止游戏
    stop() {
        this.running = false;
    }

    // 更新金币显示
    updateCoinDisplay() {
        const coinDisplay = document.getElementById('coinDisplay');
        if (coinDisplay) {
            coinDisplay.textContent = `💰 金币: ${this.coins}`;
        }
        const cardShopCoins = document.getElementById('cardShopCoins');
        if (cardShopCoins) {
            cardShopCoins.textContent = `💰 金币: ${this.coins}`;
        }
    }

    // 打开卡牌商店
    openCardShop() {
        const modal = document.getElementById('cardShopModal');
        modal.style.display = 'flex';

        // 加载已升级的卡牌
        const upgradedCards = SaveManager.loadCardUpgrades();

        // 渲染商店
        CardShop.renderShop(this.coins, upgradedCards, (rank, price) => {
            // 购买卡牌升级
            this.coins -= price;
            SaveManager.saveCoins(this.coins);

            // 添加到升级列表
            upgradedCards.push(rank);
            SaveManager.saveCardUpgrades(upgradedCards);

            // 更新显示
            this.updateCoinDisplay();
            CardShop.renderShop(this.coins, upgradedCards, (r, p) => this.openCardShop());

            // 播放音效
            if (window.audioManager) {
                window.audioManager.playButtonClick();
            }

            alert(`成功升级 ${rank} 牌！\n\n游戏中该点数的牌有30%概率出现升级版本，打出时额外获得+20积分。`);
        });

        this.updateCoinDisplay();
    }

    // 关闭卡牌商店
    closeCardShop() {
        const modal = document.getElementById('cardShopModal');
        modal.style.display = 'none';
    }

    // 打开天赋商店
    openTalentShop() {
        const modal = document.getElementById('talentShopModal');
        modal.style.display = 'flex';

        // 加载已购买的天赋
        const purchasedTalents = SaveManager.loadTalents();

        // 天赋定义
        const talents = [
            {
                id: 'emergency_reserve',
                name: '应急储备',
                price: 1000,
                description: '每局游戏开始时，额外获得1点行动点（仅第一回合生效）'
            },
            {
                id: 'long_term_coop',
                name: '长期合作',
                price: 2000,
                description: '全局商店所有道具价格永久降低10%'
            },
            {
                id: 'secondhand_prep',
                name: '二手准备',
                price: 1500,
                description: '每关第一次弃牌不消耗弃牌点'
            }
        ];

        // 渲染天赋商店
        this.renderTalentShop(talents, purchasedTalents);
        this.updateCoinDisplay();

        // 更新天赋商店的金币显示
        const talentShopCoins = document.getElementById('talentShopCoins');
        if (talentShopCoins) {
            talentShopCoins.textContent = `💰 金币: ${this.coins}`;
        }
    }

    // 渲染天赋商店
    renderTalentShop(talents, purchasedTalents) {
        const grid = document.getElementById('talentShopGrid');
        grid.innerHTML = '';

        talents.forEach(talent => {
            const isPurchased = purchasedTalents.includes(talent.id);

            const item = document.createElement('div');
            item.className = 'talent-shop-item' + (isPurchased ? ' purchased' : '');

            item.innerHTML = `
                <div class="talent-shop-name">${talent.name}</div>
                <div class="talent-shop-desc">${talent.description}</div>
                <div class="talent-shop-price">${isPurchased ? '✓ 已购买' : `${talent.price} 金币`}</div>
            `;

            if (!isPurchased) {
                item.addEventListener('click', () => {
                    if (this.coins >= talent.price) {
                        if (confirm(`确定要花费 ${talent.price} 金币购买天赋"${talent.name}"吗？\n\n${talent.description}\n\n天赋效果永久跨局生效！`)) {
                            // 扣除金币
                            this.coins -= talent.price;
                            SaveManager.saveCoins(this.coins);

                            // 添加到已购买列表
                            purchasedTalents.push(talent.id);
                            SaveManager.saveTalents(purchasedTalents);

                            // 更新显示
                            this.updateCoinDisplay();
                            this.renderTalentShop(talents, purchasedTalents);

                            // 播放音效
                            if (window.audioManager) {
                                window.audioManager.playButtonClick();
                            }

                            alert(`成功购买天赋"${talent.name}"！\n\n天赋效果将在下次游戏中生效。`);
                        }
                    } else {
                        alert(`金币不足！需要 ${talent.price} 金币，当前仅有 ${this.coins} 金币。`);
                    }
                });
            }

            grid.appendChild(item);
        });
    }

    // 关闭天赋商店
    closeTalentShop() {
        const modal = document.getElementById('talentShopModal');
        modal.style.display = 'none';
    }

    // 添加金币（通关10关时调用）
    addCoins(amount) {
        this.coins += amount;
        SaveManager.saveCoins(this.coins);
        this.updateCoinDisplay();
    }
}

// 启动游戏
window.addEventListener('load', async () => {
    // 等待字体加载完成
    if (document.fonts && document.fonts.ready) {
        await document.fonts.ready;
    }

    const game = new Game();
    window.game = game; // 调试用
});
