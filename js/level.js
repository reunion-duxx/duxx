// 关卡管理和存档系统

class LevelManager {
    // 获取关卡的牌数
    static getCardCount(level) {
        // 第1关13张,之后每关+2张
        return 13 + (level - 1) * 2;
    }

    // 进入下一关
    static nextLevel(gameState) {
        gameState.level++;
        gameState.round = 1;
        gameState.combo = 1.0;
        gameState.maxRounds = 3;
        gameState.lastPlayed = null;
        gameState.lastScore = 0;
        gameState.gameOver = false;

        // 清空封印状态（新关卡重置）
        gameState.sealedPatterns = [];

        // 重置节能模式(防止跨关卡生效)
        gameState.energySaverActive = false;

        // 重置豪赌状态
        gameState.gambleMode = false;
        gameState.gambleLevelActive = false;

        // 重置额外胜利条件追踪
        gameState.usedPatternTypes = new Set();
        gameState.roundsUsedToWin = 0;

        // 重置特质选择状态
        gameState.currentTrait = null;
        gameState.traitSelected = false;
        gameState.discardUsedThisRoundForTrait = false;
        // 抽取3个特质供玩家选择
        gameState.availableTraits = TraitManager.drawThreeTraits();

        // 临时道具保留，不清空（玩家可以跨关卡使用）

        // ===== Boss关系统 =====
        // 第4关和第10关为boss关
        if (gameState.level === 4 || gameState.level === 10) {
            gameState.isBossLevel = true;
            gameState.bossRewardPending = false;

            // 随机选择一个boss规则
            const bossRules = [
                'perfectionist',       // 完美主义者
                'orderGuardian',       // 秩序守护者
                'chaosMage',           // 混乱法师
                'pressureTester',      // 压力测试者
                'sacrificer'           // 献祭者
            ];
            gameState.bossRule = bossRules[Math.floor(Math.random() * bossRules.length)];

            // 保留之前boss关的永久奖励效果
            const permanentDiscardBonus = gameState.bossRuleData?.permanentDiscardBonus || false;
            const permanentScoreBonus = gameState.bossRuleData?.permanentScoreBonus || 0;
            const permanentActionBonus = gameState.bossRuleData?.permanentActionBonus || 0;

            // 初始化boss规则数据
            gameState.bossRuleData = {};

            // 恢复永久效果
            if (permanentDiscardBonus) {
                gameState.bossRuleData.permanentDiscardBonus = permanentDiscardBonus;
            }
            if (permanentScoreBonus > 0) {
                gameState.bossRuleData.permanentScoreBonus = permanentScoreBonus;
            }
            if (permanentActionBonus > 0) {
                gameState.bossRuleData.permanentActionBonus = permanentActionBonus;
            }

            // 根据不同boss规则初始化特定数据
            if (gameState.bossRule === 'perfectionist') {
                // 完美主义者：2回合内完成，积分要求×1.5
                gameState.bossRuleData.requiredScore = Math.floor(gameState.levelScoreRequirements[gameState.level] * 1.5);
                gameState.maxRounds = 2; // 限制为2回合
            } else if (gameState.bossRule === 'orderGuardian') {
                // 秩序守护者：按顺序分组解锁牌型
                // 解锁顺序：单牌 -> 对子 -> [三张,三带一,三带二] -> 顺子 -> 连对 -> [飞机,飞机带单翅膀,飞机带对翅膀] -> 炸弹 -> 四带二
                gameState.bossRuleData.unlockedPatterns = ['SINGLE']; // 初始只能出单牌
                gameState.bossRuleData.patternGroups = [
                    ['SINGLE'],                                                      // 第1组：单牌
                    ['PAIR'],                                                        // 第2组：对子
                    ['TRIPLE', 'TRIPLE_SINGLE', 'TRIPLE_PAIR'],                    // 第3组：三张系列（打出任意一种解锁下一组）
                    ['STRAIGHT'],                                                    // 第4组：顺子
                    ['DOUBLE_STRAIGHT'],                                            // 第5组：连对
                    ['AIRPLANE', 'AIRPLANE_SINGLE_WINGS', 'AIRPLANE_PAIR_WINGS'],  // 第6组：飞机系列（打出任意一种解锁下一组）
                    ['BOMB'],                                                        // 第7组：炸弹
                    ['FOUR_PAIR']                                                    // 第8组：四带二
                ];
                gameState.bossRuleData.currentGroupIndex = 0;  // 当前在第1组（单牌）
                gameState.bossRuleData.currentGroupCompleted = false;  // 当前组是否已完成

                // 秩序守护者特殊积分要求
                if (gameState.level === 4) {
                    gameState.bossRuleData.requiredScore = 400;  // 第4关要求400分
                } else if (gameState.level === 10) {
                    gameState.bossRuleData.requiredScore = 1000;  // 第10关要求1000分
                }
            } else if (gameState.bossRule === 'chaosMage') {
                // 混乱法师：随机交换两种牌型的消耗
                const patterns = ['SINGLE', 'PAIR', 'TRIPLE', 'STRAIGHT', 'BOMB'];
                const idx1 = Math.floor(Math.random() * patterns.length);
                let idx2 = Math.floor(Math.random() * patterns.length);
                while (idx2 === idx1) {
                    idx2 = Math.floor(Math.random() * patterns.length);
                }
                gameState.bossRuleData.swappedPatterns = [patterns[idx1], patterns[idx2]];
            } else if (gameState.bossRule === 'pressureTester') {
                // 压力测试者：无法弃牌，手牌超过15张会惩罚
                gameState.bossRuleData.cannotDiscard = true;
            } else if (gameState.bossRule === 'sacrificer') {
                // 献祭者：每次出牌后必须弃掉一张相同点数的牌，否则随机弃两张
                gameState.bossRuleData.sacrificeRequired = false; // 是否需要献祭
                gameState.bossRuleData.lastPlayedRanks = []; // 上次出牌的点数列表
            }

            // boss关不触发普通特殊规则
            gameState.specialRule = null;
            gameState.specialRuleData = null;
            gameState.turnStartTime = null;

        } else {
            // 非boss关
            gameState.isBossLevel = false;
            gameState.bossRule = null;

            // 保留boss奖励的永久效果（在重置bossRuleData之前）
            const permanentDiscardBonus = gameState.bossRuleData?.permanentDiscardBonus || false;
            const permanentScoreBonus = gameState.bossRuleData?.permanentScoreBonus || 0;
            const permanentActionBonus = gameState.bossRuleData?.permanentActionBonus || 0;

            // 重置boss规则数据
            gameState.bossRuleData = {};

            // 恢复永久效果
            if (permanentDiscardBonus) {
                gameState.bossRuleData.permanentDiscardBonus = permanentDiscardBonus;
            }
            if (permanentScoreBonus > 0) {
                gameState.bossRuleData.permanentScoreBonus = permanentScoreBonus;
            }
            if (permanentActionBonus > 0) {
                gameState.bossRuleData.permanentActionBonus = permanentActionBonus;
            }

            gameState.bossRewardPending = false;

            // ===== 普通特殊规则系统 =====
            // 第5关后,30%概率触发特殊规则
            let hasSpecialRule = false;
            if (gameState.level >= 5 && Math.random() < 0.3) {
                const rules = ['timeLimit', 'doubleCost'];
                const selectedRule = rules[Math.floor(Math.random() * rules.length)];

                if (selectedRule === 'timeLimit') {
                    gameState.specialRule = 'timeLimit';
                    gameState.turnTimeLimit = 30; // 30秒限制
                    gameState.turnStartTime = null; // 重置计时器
                    hasSpecialRule = true;
                } else if (selectedRule === 'doubleCost') {
                    gameState.specialRule = 'doubleCost';
                    // 随机选择一种牌型
                    const patterns = ['PAIR', 'TRIPLE', 'STRAIGHT', 'DOUBLE_STRAIGHT', 'AIRPLANE'];
                    gameState.specialRuleData = {
                        pattern: patterns[Math.floor(Math.random() * patterns.length)]
                    };
                    hasSpecialRule = true;
                }
            } else {
                gameState.specialRule = null;
                gameState.specialRuleData = null;
                gameState.turnStartTime = null;
            }

            // ===== 负面规则系统 =====
            // 第6关后,50%概率触发负面规则（持续整关）
            // 重要：负面规则不能与特殊规则重叠
            if (gameState.level >= 6 && !hasSpecialRule && Math.random() < 0.5) {
                const negativeRules = ['erosion', 'costIncrease', 'rankTax', 'monotone'];
                gameState.negativeRule = negativeRules[Math.floor(Math.random() * negativeRules.length)];
                gameState.negativeRuleData = {};
                gameState.lockedCards = [];
                gameState.patternPlayCount = {};
                gameState.lastPlayedPatternName = null;
            } else {
                gameState.negativeRule = null;
                gameState.negativeRuleData = {};
                gameState.lockedCards = [];
                gameState.patternPlayCount = {};
                gameState.lastPlayedPatternName = null;
            }
        }

        // 关卡奖励 +50分
        // 特质：经济头脑 - 积分奖励减少30%
        let levelReward = 50;
        if (gameState.currentTrait && gameState.currentTrait.id === 'economic_mind') {
            levelReward = Math.floor(50 * 0.7); // 35分
        }
        gameState.score += levelReward;

        // 应用透支未来的分数惩罚
        if (gameState.scorePenaltyNextLevel > 0) {
            gameState.score -= gameState.scorePenaltyNextLevel;
            gameState.scorePenaltyNextLevel = 0;
        }

        // 发新牌
        const cardCount = this.getCardCount(gameState.level);
        gameState.dealCards(cardCount);
    }

    // 重试当前关卡
    static retryLevel(gameState) {
        gameState.round = 1;
        gameState.combo = 1.0;
        gameState.maxRounds = 3;
        gameState.lastPlayed = null;
        gameState.lastScore = 0;
        gameState.gameOver = false;

        // 清空封印状态（重试时重置）
        gameState.sealedPatterns = [];

        // 重置节能模式(防止跨关卡生效)
        gameState.energySaverActive = false;

        // 重置行动点惩罚（重要：防止上次失败的惩罚影响重试）
        gameState.actionPenaltyNextRound = 0;

        // 重置额外胜利条件追踪
        gameState.usedPatternTypes = new Set();
        gameState.roundsUsedToWin = 0;

        // 重置特质选择状态
        gameState.currentTrait = null;
        gameState.traitSelected = false;
        gameState.discardUsedThisRoundForTrait = false;
        // 重新抽取3个特质供玩家选择
        gameState.availableTraits = TraitManager.drawThreeTraits();

        // Boss关重试：重置boss规则数据但保持规则类型
        if (gameState.isBossLevel && gameState.bossRule) {
            if (gameState.bossRule === 'perfectionist') {
                gameState.maxRounds = 2; // 重新设置为2回合
            } else if (gameState.bossRule === 'orderGuardian') {
                // 重置解锁状态
                gameState.bossRuleData.unlockedPatterns = ['SINGLE'];
                gameState.bossRuleData.patternGroups = [
                    ['SINGLE'],
                    ['PAIR'],
                    ['TRIPLE', 'TRIPLE_SINGLE', 'TRIPLE_PAIR'],
                    ['STRAIGHT'],
                    ['DOUBLE_STRAIGHT'],
                    ['AIRPLANE', 'AIRPLANE_SINGLE_WINGS', 'AIRPLANE_PAIR_WINGS'],
                    ['BOMB'],
                    ['FOUR_PAIR']
                ];
                gameState.bossRuleData.currentGroupIndex = 0;
                gameState.bossRuleData.currentGroupCompleted = false;

                // 秩序守护者特殊积分要求
                if (gameState.level === 4) {
                    gameState.bossRuleData.requiredScore = 400;  // 第4关要求400分
                } else if (gameState.level === 10) {
                    gameState.bossRuleData.requiredScore = 1000;  // 第10关要求1000分
                }
            } else if (gameState.bossRule === 'chaosMage') {
                // 重新随机交换牌型
                const patterns = ['SINGLE', 'PAIR', 'TRIPLE', 'STRAIGHT', 'BOMB'];
                const idx1 = Math.floor(Math.random() * patterns.length);
                let idx2 = Math.floor(Math.random() * patterns.length);
                while (idx2 === idx1) {
                    idx2 = Math.floor(Math.random() * patterns.length);
                }
                gameState.bossRuleData.swappedPatterns = [patterns[idx1], patterns[idx2]];
            } else if (gameState.bossRule === 'pressureTester') {
                // 压力测试者：重新设置无法弃牌标志
                gameState.bossRuleData.cannotDiscard = true;
            } else if (gameState.bossRule === 'sacrificer') {
                // 献祭者：重置献祭状态
                gameState.bossRuleData.sacrificeRequired = false;
                gameState.bossRuleData.lastPlayedRanks = [];
            }
        }

        // 重置特殊规则(重试时保持当前关卡的特殊规则,但重置计时器)
        if (gameState.specialRule === 'timeLimit') {
            gameState.turnStartTime = null;
        }

        // 重置负面规则状态（保持规则类型，但重置数据）
        if (gameState.negativeRule) {
            gameState.negativeRuleData = {};
            gameState.lockedCards = [];
            gameState.patternPlayCount = {};
            gameState.lastPlayedPatternName = null;
        }

        // 临时道具保留，不清空（避免玩家损失已购买的道具）

        // 重新发同数量的牌
        const cardCount = this.getCardCount(gameState.level);
        gameState.dealCards(cardCount);
    }

    // 获取关卡描述
    static getLevelDescription(level) {
        const cardCount = this.getCardCount(level);
        return `第${level}关 - ${cardCount}张牌,3回合`;
    }
}

// 存档管理器
class SaveManager {
    static SAVE_KEY = 'doudizhu_rogue_save';
    static COIN_KEY = 'doudizhu_rogue_coins';  // 金币存档键
    static CARD_SHOP_KEY = 'doudizhu_rogue_card_shop';  // 卡牌商店存档键

    // 保存游戏
    static save(gameState) {
        const saveData = {
            level: gameState.level,
            score: gameState.score,
            permanentItems: gameState.permanentItems.map(item => ({
                id: item.id,
                name: item.name
            })),
            // 保存永久道具产生的状态值
            permanentActionBonus: gameState.permanentActionBonus || 0,
            permanentDiscardDrawBonus: gameState.permanentDiscardDrawBonus || 0,
            discardScorePerCard: gameState.discardScorePerCard || 0,
            actionPenaltyNextRound: gameState.actionPenaltyNextRound || 0,
            scorePenaltyNextLevel: gameState.scorePenaltyNextLevel || 0,
            maxDiscardPoints: gameState.maxDiscardPoints || 4,  // 保存弃牌点上限（献祭者boss奖励）
            // 新增：保存特殊规则状态
            specialRule: gameState.specialRule,
            specialRuleData: gameState.specialRuleData,
            // Boss关系统
            isBossLevel: gameState.isBossLevel || false,
            bossRule: gameState.bossRule || null,
            bossRuleData: gameState.bossRuleData || {},
            bossRewardPending: gameState.bossRewardPending || false,
            // 豪赌系统
            gambleLevelActive: gameState.gambleLevelActive || false,
            // 特质系统
            availableTraits: gameState.availableTraits || [],
            traitSelected: gameState.traitSelected || false,
            currentTrait: gameState.currentTrait || null,
            timestamp: Date.now()
        };

        try {
            localStorage.setItem(this.SAVE_KEY, JSON.stringify(saveData));
            return true;
        } catch (e) {
            console.error('保存失败:', e);
            return false;
        }
    }

    // 保存金币
    static saveCoins(coins) {
        try {
            localStorage.setItem(this.COIN_KEY, coins.toString());
            return true;
        } catch (e) {
            console.error('保存金币失败:', e);
            return false;
        }
    }

    // 加载金币
    static loadCoins() {
        try {
            const coins = localStorage.getItem(this.COIN_KEY);
            return coins ? parseInt(coins, 10) : 0;
        } catch (e) {
            console.error('加载金币失败:', e);
            return 0;
        }
    }

    // 保存卡牌升级状态
    static saveCardUpgrades(upgradedCards) {
        try {
            localStorage.setItem(this.CARD_SHOP_KEY, JSON.stringify(upgradedCards));
            return true;
        } catch (e) {
            console.error('保存卡牌升级失败:', e);
            return false;
        }
    }

    // 加载卡牌升级状态
    static loadCardUpgrades() {
        try {
            const data = localStorage.getItem(this.CARD_SHOP_KEY);
            return data ? JSON.parse(data) : [];
        } catch (e) {
            console.error('加载卡牌升级失败:', e);
            return [];
        }
    }

    // 加载游戏
    static load() {
        try {
            const data = localStorage.getItem(this.SAVE_KEY);
            if (!data) return null;

            const saveData = JSON.parse(data);

            // 恢复永久道具
            saveData.permanentItems = saveData.permanentItems.map(item =>
                ItemFactory.createItem(item.id)
            ).filter(item => item !== null);

            // 豪赌状态恢复（向后兼容旧存档）
            saveData.gambleLevelActive = saveData.gambleLevelActive || false;

            // Boss关状态恢复（向后兼容旧存档）
            saveData.isBossLevel = saveData.isBossLevel || false;
            saveData.bossRule = saveData.bossRule || null;
            saveData.bossRuleData = saveData.bossRuleData || {};
            saveData.bossRewardPending = saveData.bossRewardPending || false;

            return saveData;
        } catch (e) {
            console.error('加载失败:', e);
            return null;
        }
    }

    // 检查是否有存档
    static hasSave() {
        return localStorage.getItem(this.SAVE_KEY) !== null;
    }

    // 删除存档(包括金币和卡牌升级)
    static deleteSave() {
        try {
            localStorage.removeItem(this.SAVE_KEY);
            localStorage.removeItem(this.COIN_KEY);
            localStorage.removeItem(this.CARD_SHOP_KEY);
            return true;
        } catch (e) {
            console.error('删除存档失败:', e);
            return false;
        }
    }

    // 获取存档信息(用于显示)
    static getSaveInfo() {
        const saveData = this.load();
        if (!saveData) return null;

        const date = new Date(saveData.timestamp);
        return {
            level: saveData.level,
            score: saveData.score,
            permanentCount: saveData.permanentItems.length,
            date: date.toLocaleString('zh-CN')
        };
    }

    // 应用存档到游戏状态
    static applyToGameState(gameState, saveData) {
        gameState.level = saveData.level;
        gameState.score = saveData.score;
        gameState.permanentItems = saveData.permanentItems;

        // 恢复永久道具产生的状态值
        gameState.permanentActionBonus = saveData.permanentActionBonus || 0;
        gameState.permanentDiscardDrawBonus = saveData.permanentDiscardDrawBonus || 0;
        gameState.discardScorePerCard = saveData.discardScorePerCard || 0;

        gameState.actionPenaltyNextRound = saveData.actionPenaltyNextRound || 0;
        gameState.scorePenaltyNextLevel = saveData.scorePenaltyNextLevel || 0;

        // 恢复弃牌点上限（献祭者boss奖励）
        gameState.maxDiscardPoints = saveData.maxDiscardPoints || 4;

        // 恢复特殊规则状态
        gameState.specialRule = saveData.specialRule || null;
        gameState.specialRuleData = saveData.specialRuleData || null;
        gameState.turnStartTime = null; // 加载时重置计时器

        // 恢复Boss关状态
        gameState.isBossLevel = saveData.isBossLevel || false;
        gameState.bossRule = saveData.bossRule || null;
        gameState.bossRuleData = saveData.bossRuleData || {};
        gameState.bossRewardPending = saveData.bossRewardPending || false;

        // 恢复豪赌状态（按钮状态不恢复，防止重复点击）
        gameState.gambleLevelActive = saveData.gambleLevelActive || false;
        gameState.gambleMode = false;

        // 恢复特质系统状态
        gameState.availableTraits = saveData.availableTraits || [];
        gameState.traitSelected = saveData.traitSelected || false;
        gameState.currentTrait = saveData.currentTrait || null;

        // 如果没有可选特质且未选择特质，重新抽取
        if (gameState.availableTraits.length === 0 && !gameState.traitSelected) {
            gameState.availableTraits = TraitManager.drawThreeTraits();
        }

        // 恢复卡牌升级状态
        gameState.upgradedCardRanks = SaveManager.loadCardUpgrades();

        // 发牌(此时会应用透支惩罚)
        const cardCount = LevelManager.getCardCount(gameState.level);
        gameState.dealCards(cardCount);
    }
}

// 统计系统
class Statistics {
    static STATS_KEY = 'doudizhu_rogue_stats';

    static getStats() {
        try {
            const data = localStorage.getItem(this.STATS_KEY);
            if (!data) {
                return {
                    totalGames: 0,
                    totalWins: 0,
                    highestLevel: 0,
                    totalCardsPlayed: 0,
                    totalScore: 0
                };
            }
            return JSON.parse(data);
        } catch (e) {
            console.error('读取统计失败:', e);
            return null;
        }
    }

    static saveStats(stats) {
        try {
            localStorage.setItem(this.STATS_KEY, JSON.stringify(stats));
        } catch (e) {
            console.error('保存统计失败:', e);
        }
    }

    static recordGame(level, score, won) {
        const stats = this.getStats();
        stats.totalGames++;
        if (won) stats.totalWins++;
        stats.highestLevel = Math.max(stats.highestLevel, level);
        stats.totalScore += score;

        this.saveStats(stats);
    }

    static recordCardPlayed() {
        const stats = this.getStats();
        stats.totalCardsPlayed++;
        this.saveStats(stats);
    }
}

// 卡牌商店系统
class CardShop {
    // 卡牌价格配置
    static CARD_PRICES = {
        '3': 100, '4': 100, '5': 100, '6': 100, '7': 100, '8': 100, '9': 100, '10': 100,
        'J': 150, 'Q': 150, 'K': 150,
        'A': 200,
        '2': 250,
        '小王': 300,
        '大王': 350
    };

    // 获取所有可升级的牌
    static getAllCards() {
        return ['3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A', '2', '小王', '大王'];
    }

    // 获取卡牌价格
    static getCardPrice(rank) {
        return this.CARD_PRICES[rank] || 100;
    }

    // 渲染商店界面
    static renderShop(coins, upgradedCards, onPurchase) {
        const grid = document.getElementById('cardShopGrid');
        grid.innerHTML = '';

        const allCards = this.getAllCards();

        allCards.forEach(rank => {
            const price = this.getCardPrice(rank);
            const isPurchased = upgradedCards.includes(rank);

            const item = document.createElement('div');
            item.className = 'card-shop-item' + (isPurchased ? ' purchased' : '');

            item.innerHTML = `
                <div class="card-shop-rank">${rank}</div>
                <div class="card-shop-price">${isPurchased ? '✓ 已购买' : `${price} 金币`}</div>
            `;

            if (!isPurchased) {
                item.addEventListener('click', () => {
                    if (coins >= price) {
                        if (confirm(`确定要花费 ${price} 金币升级所有 ${rank} 牌吗？\n\n升级后，游戏中该点数的牌有30%概率出现升级版本，打出时额外获得+20积分。`)) {
                            onPurchase(rank, price);
                        }
                    } else {
                        alert(`金币不足！需要 ${price} 金币，当前仅有 ${coins} 金币。`);
                    }
                });
            }

            grid.appendChild(item);
        });
    }
}
