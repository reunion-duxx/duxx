// 新手教程管理器

class TutorialManager {
    constructor() {
        this.currentStep = 0;
        this.isActive = false;
        this.game = null;
        this.completedSteps = new Set();

        // 定义教程步骤
        this.steps = [
            {
                id: 'play_cards',
                title: '步骤 1/10: 出牌',
                hint: '欢迎来到斗地主 Roguelike! 点击选中一张牌,然后点击"出牌"按钮。符合斗地主牌型即可出牌(单牌、对子、三张、顺子等)。',
                checkCompletion: () => {
                    return this.completedSteps.has('play_cards');
                },
                onEnter: () => {
                    // 步骤1不需要特殊处理
                }
            },
            {
                id: 'discard',
                title: '步骤 2/10: 弃牌',
                hint: '选中1-5张牌,点击"弃牌"按钮可以弃掉这些牌并抽取等量新牌(+奖励)。消耗弃牌点,同一回合内弃牌消耗递增(1点→2点→3点...)。手牌需大于5张才能弃牌。',
                checkCompletion: () => {
                    return this.completedSteps.has('discard');
                },
                onEnter: () => {
                    // 确保有足够的手牌用于弃牌演示
                    if (this.game && this.game.state) {
                        if (this.game.state.handCards.length <= 5) {
                            while (this.game.state.handCards.length < 8 && this.game.state.deckCards.length > 0) {
                                this.game.state.handCards.push(this.game.state.deckCards.pop());
                            }
                        }
                    }
                    if (this.game && this.game.input) {
                        this.game.input.selectedCards = [];
                    }
                }
            },
            {
                id: 'score',
                title: '步骤 3/10: 积分',
                hint: '出牌获得积分。不同牌型分数不同:单牌10分、对子20分、三张40分、顺子100分、炸弹200分、火箭300分等。积分用于商店购买道具。',
                checkCompletion: () => {
                    return this.completedSteps.has('score');
                },
                onEnter: () => {
                    if (this.game && this.game.input) {
                        this.game.input.selectedCards = [];
                    }
                    this.showNextStepButton('score');
                }
            },
            {
                id: 'action_discard_points',
                title: '步骤 4/10: 行动点和弃牌点',
                hint: '行动点:出牌消耗,不同牌型消耗不同(单牌2点、对子2点、炸弹5点等)。每回合结束后恢复满值。\n\n弃牌点:弃牌消耗,每回合获得2点(上限4点)。弃牌点可累积。',
                checkCompletion: () => {
                    return this.completedSteps.has('action_discard_points');
                },
                onEnter: () => {
                    if (this.game && this.game.input) {
                        this.game.input.selectedCards = [];
                    }
                    this.showNextStepButton('action_discard_points');
                }
            },
            {
                id: 'traits',
                title: '步骤 5/10: 特质',
                hint: '每局开始时从3个随机特质中选1个,整局生效。特质提供独特能力,如"精准打击"(单牌固定消耗1点但无法打顺子)、"炸弹专家"(炸弹积分+50%但消耗+2点)等。',
                checkCompletion: () => {
                    return this.completedSteps.has('traits');
                },
                onEnter: () => {
                    if (this.game && this.game.input) {
                        this.game.input.selectedCards = [];
                    }
                    this.showNextStepButton('traits');
                }
            },
            {
                id: 'combo',
                title: '步骤 6/10: Combo连击',
                hint: '连续出牌获得Combo加成! Combo x2:1.3倍、x3:1.6倍、x4:1.9倍、x5+:2.2倍(封顶)。结束回合或无法出牌时Combo重置。保持连击可大幅提升积分!',
                checkCompletion: () => {
                    return this.completedSteps.has('combo');
                },
                onEnter: () => {
                    if (this.game && this.game.input) {
                        this.game.input.selectedCards = [];
                    }
                    this.showNextStepButton('combo');
                }
            },
            {
                id: 'win_condition',
                title: '步骤 7/10: 胜利条件',
                hint: '⭐ 通关需同时满足:\n1. 在回合限制内清空所有手牌\n2. 达到关卡积分要求(第1关100分、第2关140分...)\n\n出完手牌但积分不足也会失败!',
                checkCompletion: () => {
                    return this.completedSteps.has('win_condition');
                },
                onEnter: () => {
                    if (this.game && this.game.input) {
                        this.game.input.selectedCards = [];
                    }
                    this.showNextStepButton('win_condition');
                }
            },
            {
                id: 'end_round',
                title: '步骤 8/10: 结束回合',
                hint: '点击"结束回合"按钮开始新回合。回合结束后:行动点恢复满值、获得2点弃牌点、弃牌消耗递增重置、Combo重置、打开商店。试着点击"结束回合"按钮!',
                checkCompletion: () => {
                    return this.completedSteps.has('end_round');
                },
                onEnter: () => {
                    this.hideNextStepButton();
                    if (this.game && this.game.input) {
                        this.game.input.selectedCards = [];
                    }
                }
            },
            {
                id: 'rating',
                title: '步骤 9/10: 评价',
                hint: '通关评价影响商店金币:\nS评价(2回合内):金币+20%\nA评价(3回合内):金币不变\nB评价(4回合内):金币-50%\n\n追求快速通关获得更多资源!',
                checkCompletion: () => {
                    return this.completedSteps.has('rating');
                },
                onEnter: () => {
                    if (this.game && this.game.input) {
                        this.game.input.selectedCards = [];
                    }
                    this.showNextStepButton('rating');
                }
            },
            {
                id: 'coins_upgrades',
                title: '步骤 10/10: 金币和卡牌升级',
                hint: '通关第10关获得500金币。金币用于主菜单的卡牌商店购买永久升级。升级后该点数卡牌有30%概率变为金色升级版,打出时额外+20积分!',
                checkCompletion: () => {
                    return this.completedSteps.has('coins_upgrades');
                },
                onEnter: () => {
                    if (this.game && this.game.input) {
                        this.game.input.selectedCards = [];
                    }
                    this.showNextStepButton('coins_upgrades');
                }
            }
        ];
    }

    // 启动教程
    start(game) {
        this.game = game;
        this.isActive = true;
        this.currentStep = 0;
        this.completedSteps.clear();

        // 初始化教程专用的游戏状态
        this.initTutorialGameState();

        // 显示教程提示框
        this.showHintBox();

        // 禁用某些按钮
        this.disableButtons();

        // 进入第一步
        this.enterStep(0);
    }

    // 初始化教程游戏状态
    initTutorialGameState() {
        const state = this.game.state;

        // 重置游戏状态
        state.level = 1; // 教程关卡设为1,避免双排显示
        state.round = 1;
        state.score = 0;
        state.combo = 1.0;
        state.maxActionPoints = 10;
        state.actionPoints = 10;
        state.maxDiscardPoints = 3;
        state.discardPoints = 3;
        state.currentDiscardCost = 1;
        state.gameOver = false;
        state.maxRounds = 10; // 设置足够的回合数

        // 创建固定的教程手牌: 3, 3, 4, 4, 5, 6, 7, 8 (8张牌,满足弃牌要求>5)
        state.handCards = [
            new Card('3', 'hearts'),
            new Card('3', 'spades'),
            new Card('4', 'diamonds'),
            new Card('4', 'clubs'),
            new Card('5', 'hearts'),
            new Card('6', 'spades'),
            new Card('7', 'diamonds'),
            new Card('8', 'clubs')
        ];

        // 准备牌库 (用于弃牌)
        state.deckCards = [
            new Card('8', 'hearts'),
            new Card('9', 'spades'),
            new Card('9', 'diamonds'),
            new Card('9', 'clubs'),
            new Card('10', 'hearts'),
            new Card('10', 'spades'),
            new Card('J', 'diamonds'),
            new Card('J', 'clubs')
        ];

        // 清空已打出的牌
        state.lastPlayed = null;
        state.lastScore = 0;
    }

    // 进入某个步骤
    enterStep(stepIndex) {
        console.log('[Tutorial] 进入步骤:', stepIndex);
        if (stepIndex >= this.steps.length) {
            console.log('[Tutorial] 所有步骤完成,调用 complete()');
            this.complete();
            return;
        }

        this.currentStep = stepIndex;
        const step = this.steps[stepIndex];
        console.log('[Tutorial] 当前步骤ID:', step.id, '标题:', step.title);

        // 执行步骤的进入逻辑
        if (step.onEnter) {
            step.onEnter();
        }

        // 更新提示文本
        this.updateHint();
    }

    // 更新提示文本
    updateHint() {
        const step = this.steps[this.currentStep];
        document.getElementById('tutorialStepTitle').textContent = step.title;
        document.getElementById('tutorialHintText').textContent = step.hint;
    }

    // 显示教程提示框
    showHintBox() {
        document.getElementById('tutorialHintBox').style.display = 'block';
    }

    // 隐藏教程提示框
    hideHintBox() {
        document.getElementById('tutorialHintBox').style.display = 'none';
    }

    // 禁用某些按钮
    disableButtons() {
        const buttonsToDisable = ['shopBtn', 'itemsBtn', 'backToMenuBtn'];
        buttonsToDisable.forEach(btnId => {
            const btn = document.getElementById(btnId);
            if (btn) {
                btn.disabled = true;
                btn.style.opacity = '0.5';
            }
        });
    }

    // 恢复按钮
    enableButtons() {
        const buttonsToEnable = ['shopBtn', 'itemsBtn', 'backToMenuBtn'];
        buttonsToEnable.forEach(btnId => {
            const btn = document.getElementById(btnId);
            if (btn) {
                btn.disabled = false;
                btn.style.opacity = '1';
            }
        });
    }

    // 检查当前步骤是否完成
    checkStepCompletion() {
        if (!this.isActive) return;

        const step = this.steps[this.currentStep];
        if (step.checkCompletion()) {
            // 延迟进入下一步,让玩家看到效果
            setTimeout(() => {
                this.nextStep();
            }, 500);
        }
    }

    // 进入下一步
    nextStep() {
        console.log('[Tutorial] nextStep() 调用, isActive:', this.isActive);
        if (!this.isActive) return;

        this.currentStep++;
        console.log('[Tutorial] 进入步骤编号:', this.currentStep);
        if (this.currentStep >= this.steps.length) {
            this.complete();
        } else {
            this.enterStep(this.currentStep);
        }
    }

    // 标记步骤完成
    markStepCompleted(stepId) {
        console.log('[Tutorial] 标记步骤完成:', stepId);
        this.completedSteps.add(stepId);

        // 直接进入下一步,不使用setTimeout避免被alert阻塞
        if (this.isActive) {
            const step = this.steps[this.currentStep];
            if (step.checkCompletion()) {
                console.log('[Tutorial] 步骤已完成,进入下一步');
                this.nextStep();
            }
        }
    }

    // 完成教程
    complete() {
        this.isActive = false;
        this.hideHintBox();
        this.enableButtons();

        // 显示完成消息
        alert('🎉 恭喜完成新手教程! 🎉\n\n你已经掌握了基础玩法。\n\n💡 小贴士:\n• 炸弹打出后返还+1行动点\n• 火箭打出后返还+3行动点\n• 保持连击可大幅提升积分\n• 合理使用弃牌优化手牌\n\n现在可以开始正式游戏了!');

        // 返回主菜单
        this.returnToMenu();
    }

    // 跳过教程
    skip() {
        if (!confirm('确定要跳过教程吗?')) {
            return;
        }

        this.isActive = false;
        this.hideHintBox();
        this.enableButtons();
        this.returnToMenu();
    }

    // 返回主菜单
    returnToMenu() {
        if (this.game) {
            this.game.stop();
        }
        location.reload();
    }

    // 获取当前步骤ID
    getCurrentStepId() {
        if (this.currentStep >= this.steps.length) return null;
        return this.steps[this.currentStep].id;
    }

    // 显示"下一步"按钮
    showNextStepButton(stepId) {
        const hintBox = document.getElementById('tutorialHintBox');
        if (!hintBox) return;

        // 检查是否已经存在按钮
        let nextBtn = document.getElementById('tutorialNextBtn');
        if (!nextBtn) {
            // 创建"下一步"按钮
            nextBtn = document.createElement('button');
            nextBtn.id = 'tutorialNextBtn';
            nextBtn.textContent = '下一步 →';
            nextBtn.style.cssText = 'margin-top: 10px; padding: 8px 16px; background: #4CAF50; color: white; border: none; border-radius: 4px; cursor: pointer; font-family: "Press Start 2P", monospace; font-size: 10px;';
            hintBox.appendChild(nextBtn);
        }

        // 更新点击处理器
        nextBtn.onclick = () => {
            this.markStepCompleted(stepId);
        };

        nextBtn.style.display = 'block';
    }

    // 隐藏"下一步"按钮
    hideNextStepButton() {
        const nextBtn = document.getElementById('tutorialNextBtn');
        if (nextBtn) {
            nextBtn.style.display = 'none';
        }
    }
}
