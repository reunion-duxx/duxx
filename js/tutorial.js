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
                id: 'select_card',
                title: '步骤 1/7: 选择手牌',
                hint: '欢迎来到斗地主 Roguelike! 这是你的手牌,点击卡牌可以选中它。试着选中任意一张牌!',
                checkCompletion: () => {
                    // 检查是否有选中的牌
                    return this.game && this.game.input && this.game.input.selectedCards.length > 0;
                },
                onEnter: () => {
                    // 步骤1不需要特殊处理
                }
            },
            {
                id: 'play_single',
                title: '步骤 2/7: 出单牌',
                hint: '很好! 现在选中一张牌,然后点击"出牌"按钮。单牌消耗2点行动点。',
                checkCompletion: () => {
                    // 检查是否成功出了单牌
                    return this.completedSteps.has('play_single');
                },
                onEnter: () => {
                    // 清空选择
                    if (this.game && this.game.input) {
                        this.game.input.selectedCards = [];
                    }
                }
            },
            {
                id: 'play_pair',
                title: '步骤 3/7: 出对子',
                hint: '做得好! 现在试着选中两张点数相同的牌 (比如两张3),然后出牌。对子消耗2点行动点。',
                checkCompletion: () => {
                    return this.completedSteps.has('play_pair');
                },
                onEnter: () => {
                    if (this.game && this.game.input) {
                        this.game.input.selectedCards = [];
                    }
                }
            },
            {
                id: 'discard',
                title: '步骤 4/7: 弃牌',
                hint: '当行动点不足时,可以使用弃牌功能!选中1-5张牌,点击"弃牌"按钮,可以弃掉这些牌并抽取新牌。试试看! (注意:手牌需要大于5张才能弃牌)',
                checkCompletion: () => {
                    return this.completedSteps.has('discard');
                },
                onEnter: () => {
                    // 将行动点降至1,模拟行动点不足的情况
                    if (this.game && this.game.state) {
                        this.game.state.actionPoints = 1;
                        // 确保有足够的手牌用于弃牌演示
                        if (this.game.state.handCards.length <= 5) {
                            // 如果手牌不够,从牌库补充
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
                id: 'win_condition',
                title: '步骤 5/7: 通关条件',
                hint: '⭐ 重要! 通关需要同时满足两个条件:\n1. 在回合限制内清空所有手牌\n2. 达到本关的积分要求(第1关需100分,每关递增)\n\n出完手牌但积分不足也会失败!要注意打出高分牌型(如炸弹225分、火箭300分)和保持连击Combo获得分数加成。点击"下一步"继续。',
                checkCompletion: () => {
                    return this.completedSteps.has('win_condition');
                },
                onEnter: () => {
                    // 恢复行动点,清空选择
                    if (this.game && this.game.state) {
                        this.game.state.actionPoints = this.game.state.maxActionPoints;
                    }
                    if (this.game && this.game.input) {
                        this.game.input.selectedCards = [];
                    }
                    // 显示"下一步"按钮来手动确认
                    this.showNextStepButton('win_condition');
                }
            },
            {
                id: 'gamble_mode',
                title: '步骤 6/7: 豪赌模式',
                hint: '🎲 高风险高收益! 豪赌模式可在第一回合出牌前激活:\n\n✅ 成功(S评价,2回合内完成): 积分翻倍(×2.0)\n❌ 失败(A/B评价): 积分减半(×0.5)\n\n适合手牌好的情况下使用,追求高分!豪赌按钮会在正式游戏的第一回合自动显示。点击"下一步"继续。',
                checkCompletion: () => {
                    return this.completedSteps.has('gamble_mode');
                },
                onEnter: () => {
                    if (this.game && this.game.input) {
                        this.game.input.selectedCards = [];
                    }
                    // 显示"下一步"按钮来手动确认
                    this.showNextStepButton('gamble_mode');
                }
            },
            {
                id: 'end_round',
                title: '步骤 7/7: 结束回合',
                hint: '太棒了! 当你想开始新回合时,点击"结束回合"按钮。这会恢复你的行动点并抽取3张新牌。',
                checkCompletion: () => {
                    return this.completedSteps.has('end_round');
                },
                onEnter: () => {
                    // 隐藏"下一步"按钮
                    this.hideNextStepButton();
                    if (this.game && this.game.input) {
                        this.game.input.selectedCards = [];
                    }
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
        alert('🎉 恭喜完成新手教程! 🎉\n\n你已经掌握了基础玩法。\n\n提示: 炸弹(4张相同点数)打出后返还+1行动点,火箭(双王)打出后返还+3行动点!\n\n现在可以开始正式游戏了!');

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
