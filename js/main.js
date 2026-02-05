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
            // 显示特质选择界面
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
        const selectedIndices = this.input ? this.input.getSelectedIndices() : [];
        const hoveredIndex = this.input ? this.input.getHoveredIndex() : -1;
        this.renderer.drawHandCards(this.state.handCards, selectedIndices, this.state.level, hoveredIndex, this.state);

        // 绘制动画
        this.animationManager.render(this.ctx);

        // 恢复上下文
        this.ctx.restore();

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
