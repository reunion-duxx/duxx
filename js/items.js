// 道具系统

class Item {
    constructor(id, name, price, type, description, effect) {
        this.id = id;
        this.name = name;
        this.price = price; // 负数表示负面道具给钱
        this.type = type;   // 'positive', 'negative', 'permanent'
        this.description = description;
        this.effect = effect; // 道具效果函数
    }

    use(gameState, selectedCards = []) {
        if (this.effect) {
            return this.effect(gameState, selectedCards);
        }
        return { success: false, message: '道具无效' };
    }
}

// 道具工厂
class ItemFactory {
    static ITEMS = {
        // ===== 正面道具 =====
        'compass': {
            name: '配对指南针',
            price: 60,
            type: 'positive',
            description: '显示当前手牌的最优出牌组合建议',
            effect: (gameState) => {
                const suggestions = HintAlgorithm.findBestCombinations(gameState);

                if (suggestions.length === 0) {
                    return { success: false, message: '当前手牌无法组成有效牌型!' };
                }

                // 显示提示UI
                if (window.inputHandler) {
                    window.inputHandler.showHintModal(suggestions);
                }

                return { success: true, message: '已显示最优组合建议!' };
            }
        },

        'joker_mask': {
            name: '小丑面具',
            price: 120,
            type: 'positive',
            description: '随机获得1张王牌(大王或小王)',
            effect: (gameState) => {
                const jokerCard = Math.random() < 0.5 ?
                    new Card('小王', 'joker') :
                    new Card('大王', 'joker');
                gameState.handCards.push(jokerCard);
                return { success: true, message: `获得${jokerCard.rank}!` };
            }
        },

        'deck_reforge': {
            name: '牌堆重铸',
            price: 130,
            type: 'positive',
            description: '重新随机当前所有手牌(慎用!)',
            effect: (gameState) => {
                const count = gameState.handCards.length;
                gameState.handCards = gameState.createDeck(count);
                return { success: true, message: '手牌已重新洗牌!' };
            }
        },

        'bomb_factory': {
            name: '炸弹工坊',
            price: 170,
            type: 'positive',
            description: '将选中的4张牌转化为同点数炸弹',
            effect: (gameState, selectedCards) => {
                if (selectedCards.length !== 4) {
                    return { success: false, message: '请选择4张牌!' };
                }

                // 获取第一张牌的点数作为目标点数
                const targetRank = selectedCards[0].rank;

                // 四种花色
                const suits = ['hearts', 'spades', 'diamonds', 'clubs'];

                // 将选中的4张牌替换为同点数的炸弹
                for (let i = 0; i < 4; i++) {
                    const cardToReplace = selectedCards[i];
                    const index = gameState.handCards.indexOf(cardToReplace);

                    if (index > -1) {
                        // 创建新牌（相同点数，不同花色）
                        const newCard = new Card(targetRank, suits[i]);
                        gameState.handCards[index] = newCard;
                    }
                }

                return { success: true, message: `已将4张牌转化为${targetRank}炸弹!` };
            }
        },

        'hourglass': {
            name: '回合沙漏',
            price: 220,
            type: 'positive',
            description: '额外增加1个回合(最多使用2次)',
            effect: (gameState) => {
                gameState.maxRounds++;
                // 如果当前回合已经超过原最大回合，需要回退当前回合数
                // 这样才能真正"增加"一个可用回合
                if (gameState.round > gameState.maxRounds - 1) {
                    gameState.round--;
                }
                return { success: true, message: '回合数+1!' };
            }
        },

        'rocket_booster': {
            name: '火箭助推器',
            price: 240,
            type: 'positive',
            description: '出掉手中最小的5张牌(无需合法牌型)',
            effect: (gameState) => {
                if (gameState.handCards.length < 5) {
                    return { success: false, message: '手牌不足5张!' };
                }

                // 按点数排序，取最小的5张
                const sorted = [...gameState.handCards].sort((a, b) => a.value - b.value);
                const cardsToPlay = sorted.slice(0, 5);

                // 直接从手牌中移除这5张牌，不判断牌型
                cardsToPlay.forEach(playedCard => {
                    const index = gameState.handCards.findIndex(c => c === playedCard);
                    if (index !== -1) {
                        gameState.handCards.splice(index, 1);
                    }
                });

                // 检查是否出完所有手牌（胜利条件）
                const allCardsPlayed = gameState.handCards.length === 0;

                return {
                    success: true,
                    message: '强制出掉了最小的5张牌!',
                    checkWin: allCardsPlayed  // 新增标志位，告知调用者需要检查胜利
                };
            }
        },

        'hand_remover': {
            name: '手牌清理器',
            price: 95,
            type: 'positive',
            description: '从手牌中移除选中的1张牌（永久移除）',
            effect: (gameState, selectedCards) => {
                if (selectedCards.length !== 1) {
                    return { success: false, message: '请选择1张手牌!' };
                }

                const cardToRemove = selectedCards[0];
                const index = gameState.handCards.indexOf(cardToRemove);

                if (index > -1) {
                    gameState.handCards.splice(index, 1);
                    const allCardsPlayed = gameState.handCards.length === 0;
                    return {
                        success: true,
                        message: `已移除${cardToRemove.toString()}!`,
                        checkWin: allCardsPlayed  // 新增标志位，告知调用者需要检查胜利
                    };
                }

                return { success: false, message: '移除失败!' };
            }
        },

        'card_upgrader': {
            name: '牌张升级器',
            price: 140,
            type: 'positive',
            description: '将选中的1张手牌升级为更高点数（3→4, 4→5...K→A）',
            effect: (gameState, selectedCards) => {
                if (selectedCards.length !== 1) {
                    return { success: false, message: '请选择1张手牌!' };
                }

                const card = selectedCards[0];

                // 升级映射表
                const rankUpgrade = {
                    '3': '4', '4': '5', '5': '6', '6': '7', '7': '8',
                    '8': '9', '9': '10', '10': 'J', 'J': 'Q', 'Q': 'K', 'K': 'A'
                };

                if (!rankUpgrade[card.rank]) {
                    return { success: false, message: '该牌无法升级（A、2、王牌无法升级）!' };
                }

                const oldRank = card.rank;
                card.rank = rankUpgrade[card.rank];
                card.value = card.getValue();

                return { success: true, message: `${oldRank}已升级为${card.rank}!` };
            }
        },

        'action_charger': {
            name: '行动点充能器',
            price: 100,
            type: 'positive',
            description: '立即获得2点行动点',
            effect: (gameState) => {
                gameState.actionPoints += 2;
                return { success: true, message: '获得2点行动点!' };
            }
        },

        'action_expander': {
            name: '行动点扩容器',
            price: 160,
            type: 'positive',
            description: '本局每回合最大行动点+1',
            effect: (gameState) => {
                gameState.maxActionPoints += 1;
                gameState.actionPoints += 1;
                return { success: true, message: '每回合最大行动点+1!' };
            }
        },

        'energy_saver': {
            name: '节能模式',
            price: 120,
            type: 'positive',
            description: '本回合所有牌型消耗减半',
            effect: (gameState) => {
                gameState.energySaverActive = true;
                return { success: true, message: '本回合所有牌型消耗减半!' };
            }
        },

        'exchange_card': {
            name: '以旧换新',
            price: 200,
            type: 'positive',
            description: '弃掉一张牌，从牌库中重新挑选一张牌加入到你的手牌中',
            effect: (gameState, selectedCards) => {
                if (selectedCards.length !== 1) {
                    return { success: false, message: '请选择1张牌进行交换!' };
                }
                // 移除选中的牌
                const cardIndex = gameState.handCards.indexOf(selectedCards[0]);
                if (cardIndex > -1) {
                    gameState.handCards.splice(cardIndex, 1);
                }
                // 添加一张新的随机牌
                const newCards = gameState.createDeck(1);
                gameState.handCards.push(...newCards);
                return { success: true, message: '已交换1张牌!' };
            }
        },

        'abandon_weapon_for_literature': {
            name: '弃武从文',
            price: 250,
            type: 'positive',
            description: '消耗2点弃牌点,返还上一手牌消耗的行动点(全额返还,最高不超过5点)',
            effect: (gameState) => {
                if (gameState.discardPoints < 2) {
                    return { success: false, message: '弃牌点不足!需要2点弃牌点' };
                }
                if (!gameState.lastActionCost || gameState.lastActionCost === 0) {
                    return { success: false, message: '本回合尚未出牌!' };
                }

                // 扣除弃牌点
                gameState.discardPoints -= 2;

                // 返还行动点(最高5点)
                const refund = Math.min(5, gameState.lastActionCost);
                gameState.actionPoints += refund;

                return { success: true, message: `消耗2点弃牌点,返还${refund}点行动点!` };
            }
        },

        'offense_defense_swap': {
            name: '攻守易势',
            price: 280,
            type: 'positive',
            description: '将你的当前行动点与弃牌点数量互换',
            effect: (gameState) => {
                const oldAction = gameState.actionPoints;
                const oldDiscard = gameState.discardPoints;

                gameState.actionPoints = oldDiscard;
                gameState.discardPoints = oldAction;

                return { success: true, message: `行动点:${oldAction}→${oldDiscard}, 弃牌点:${oldDiscard}→${oldAction}` };
            }
        },

        'backwater_battle': {
            name: '背水一战',
            price: 290,
            type: 'positive',
            description: '本回合内,若你的手牌数大于20张,则所有牌型消耗的行动点减少1点(最低降至1点)',
            effect: (gameState) => {
                gameState.backwaterBattleActive = true;

                const currentCards = gameState.handCards.length;
                if (currentCards > 20) {
                    return { success: true, message: `背水一战激活!当前手牌${currentCards}张,所有牌型消耗-1点!` };
                } else {
                    return { success: true, message: `背水一战激活!手牌需>20张时生效(当前${currentCards}张)` };
                }
            }
        },

        'desperate_stake': {
            name: '孤注一掷',
            price: 200,
            type: 'positive',
            description: '立即获得3点行动点,但本回合结束时,你每剩余1点行动力,下回合的行动点便减少1点',
            effect: (gameState) => {
                gameState.actionPoints += 3;
                gameState.desperateStakeActive = true;

                return { success: true, message: '获得3点行动点!回合结束时剩余行动点将减少下回合行动点!' };
            }
        },

        'chain_reaction': {
            name: '连锁效应',
            price: 260,
            type: 'positive',
            description: '本回合内,你的连击(combo)倍率额外提升0.2倍(例如1.3倍变为1.5倍)',
            effect: (gameState) => {
                gameState.chainReactionActive = true;

                return { success: true, message: '连锁效应激活!本回合连击倍率额外+0.2倍!' };
            }
        },

        'sacrifice_piece': {
            name: '弃卒保车',
            price: 240,
            type: 'positive',
            description: '消耗2点弃牌点,从本次弃掉的牌中,选择一张放回手牌底部,然后你抽一张牌',
            effect: (gameState, selectedCards) => {
                // 检查弃牌点是否足够
                if (gameState.discardPoints < 2) {
                    return { success: false, message: '弃牌点不足!需要2点弃牌点' };
                }

                // 检查是否有选中的牌
                if (selectedCards.length === 0) {
                    return { success: false, message: '请先选择要弃掉的牌!' };
                }

                // 消耗2点弃牌点
                gameState.discardPoints -= 2;

                // 标记道具已使用,在弃牌时会特殊处理
                gameState.sacrificePieceActive = true;
                gameState.sacrificePieceCards = [...selectedCards];

                return { success: true, message: '弃卒保车激活!现在执行弃牌,将可以选择一张放回手牌!' };
            }
        },

        'score_double': {
            name: '积分翻倍',
            price: 330,
            type: 'positive',
            description: '本回合你打出的第一手牌,其基础积分翻倍(此翻倍效果计算在连击倍率之前)',
            effect: (gameState) => {
                gameState.scoreDoubleActive = true;
                gameState.scoreDoubleUsed = false;

                return { success: true, message: '积分翻倍激活!下次出牌基础积分×2!' };
            }
        },

        'risky_victory': {
            name: '险中求胜',
            price: 220,
            type: 'positive',
            description: '本回合结束时,若你的手牌数小于等于5张,则立即获得2点弃牌点',
            effect: (gameState) => {
                gameState.riskyVictoryActive = true;

                const currentCards = gameState.handCards.length;
                if (currentCards <= 5) {
                    return { success: true, message: `险中求胜激活!当前手牌${currentCards}张,回合结束时将获得2点弃牌点!` };
                } else {
                    return { success: true, message: `险中求胜激活!回合结束时若手牌≤5张,将获得2点弃牌点(当前${currentCards}张)` };
                }
            }
        },

        // ===== 负面道具 =====
        'gambler_dice': {
            name: '赌徒骰子',
            price: 30,
            type: 'negative',
            description: '消耗30分,随机获得20-200分',
            effect: (gameState) => {
                const rand = Math.random();
                let bonus = 0;

                if (rand < 0.5) bonus = 20;
                else if (rand < 0.8) bonus = 80;
                else if (rand < 0.95) bonus = 140;
                else bonus = 200;

                gameState.score += bonus;
                return { success: true, message: `赌博成功!获得${bonus}分!` };
            }
        },

        'chaos_shuffle': {
            name: '混乱洗牌',
            price: 0,
            type: 'instant_negative',
            description: '立即获得80分,但手牌随机打乱且锁定1回合无法出牌',
            effect: (gameState) => {
                gameState.score += 80;
                // 洗牌
                for (let i = gameState.handCards.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [gameState.handCards[i], gameState.handCards[j]] =
                        [gameState.handCards[j], gameState.handCards[i]];
                }
                // 实现锁定机制
                gameState.playLocked = true;
                gameState.lockRoundsRemaining = 1;
                return { success: true, message: '获得80分,但手牌被打乱且下回合无法出牌!' };
            }
        },

        'overdraw': {
            name: '透支未来',
            price: -200,
            type: 'instant_negative',
            description: '立即获得200分,但下一关初始分数-100',
            effect: (gameState) => {
                // 设置下一关分数惩罚
                gameState.scorePenaltyNextLevel = 100;
                return { success: true, message: '获得200分,但下一关将扣除100分!' };
            }
        },

        'pattern_seal': {
            name: '牌型封印',
            price: -100,
            type: 'instant_negative',  // 新类型：立即生效的负面道具
            description: '获得100分,但本局随机封印1种牌型',
            effect: (gameState) => {
                const patterns = ['对子', '三张', '顺子', '连对'];
                const sealed = patterns[Math.floor(Math.random() * patterns.length)];

                // 封印牌型
                if (!gameState.sealedPatterns) {
                    gameState.sealedPatterns = [];
                }
                gameState.sealedPatterns.push(sealed);

                return { success: true, message: `获得100分,但${sealed}被封印!` };
            }
        },

        'time_accel': {
            name: '时间加速',
            price: -150,
            type: 'instant_negative',
            description: '获得150分,但本局回合数-1',
            effect: (gameState) => {
                if (gameState.maxRounds <= 1) {
                    return { success: false, message: '回合数不能再减少了!' };
                }

                gameState.maxRounds--;
                return { success: true, message: '获得150分,但回合数-1!' };
            }
        },

        'action_overdraft': {
            name: '行动点透支',
            price: -50,
            type: 'instant_negative',
            description: '获得50分,但下回合最大行动点-1',
            effect: (gameState) => {
                gameState.actionPenaltyNextRound = (gameState.actionPenaltyNextRound || 0) + 1;
                return { success: true, message: '获得50分,但下回合行动点-1!' };
            }
        },

        // ===== 永久道具 =====
        'piggy_gold': {
            name: '黄金存钱罐',
            price: 300,
            type: 'permanent',
            description: '每局开始时额外获得20分初始分数',
            effect: (gameState) => {
                return { success: true, message: '永久道具已购买!', permanent: true };
            }
        },

        'piggy_diamond': {
            name: '钻石存钱罐',
            price: 700,
            type: 'permanent',
            description: '每局开始时额外获得50分初始分数',
            effect: (gameState) => {
                return { success: true, message: '永久道具已购买!', permanent: true };
            }
        },

        'piggy_king': {
            name: '王者存钱罐',
            price: 1200,
            type: 'permanent',
            description: '每局开始时额外获得100分初始分数',
            effect: (gameState) => {
                return { success: true, message: '永久道具已购买!', permanent: true };
            }
        },

        'lucky_clover': {
            name: '幸运四叶草',
            price: 800,
            type: 'permanent',
            description: '每局开始时有20%概率获得1张随机王牌',
            effect: (gameState) => {
                return { success: true, message: '永久道具已购买!', permanent: true };
            }
        },

        'permanent_action_boost': {
            name: '行动点核心',
            price: 900,
            type: 'permanent',
            description: '永久增加每回合最大行动点+1',
            effect: (gameState) => {
                return { success: true, message: '永久道具已购买!', permanent: true };
            }
        },

        'permanent_discard_draw_extra': {
            name: '弃旧图新',
            price: 700,
            type: 'permanent',
            description: '每次弃牌额外多抽一张牌',
            effect: (gameState) => {
                return { success: true, message: '永久道具已购买!', permanent: true };
            }
        },

        'permanent_discard_score_bonus': {
            name: '去粗取精',
            price: 600,
            type: 'permanent',
            description: '弃牌时，每弃掉一张牌获得3积分',
            effect: (gameState) => {
                gameState.discardScorePerCard = 3;
                return { success: true, message: '永久道具已购买!', permanent: true };
            }
        }
    };

    static createItem(id) {
        const data = this.ITEMS[id];
        if (!data) return null;

        return new Item(id, data.name, data.price, data.type, data.description, data.effect);
    }

    static getAllItemIds() {
        return Object.keys(this.ITEMS);
    }

    static getRandomItems(count, excludePermanent = false, excludeItemIds = []) {
        let itemIds = this.getAllItemIds();

        if (excludePermanent) {
            itemIds = itemIds.filter(id => this.ITEMS[id].type !== 'permanent');
        }

        // 排除指定的道具ID（已拥有的永久道具）
        if (excludeItemIds.length > 0) {
            itemIds = itemIds.filter(id => !excludeItemIds.includes(id));
        }

        // Fisher-Yates洗牌
        const shuffled = [...itemIds];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }

        return shuffled.slice(0, count).map(id => this.createItem(id));
    }
}

// 商店系统
class Shop {
    constructor() {
        this.currentItems = [];
        this.usedThisRound = false;  // 标记本轮商店是否已使用
    }

    // 刷新商店道具
    refreshItems(gameState) {
        // 根据关卡决定是否显示永久道具
        const showPermanent = gameState.level >= 3;

        // 获取已拥有的永久道具ID列表
        const ownedPermanentIds = gameState.permanentItems.map(item => item.id);

        // 每回合随机刷新4个道具，排除已拥有的永久道具
        this.currentItems = ItemFactory.getRandomItems(4, !showPermanent, ownedPermanentIds);

        // 新商店重置使用标记
        this.usedThisRound = false;
    }

    // 购买道具
    buyItem(item, gameState) {
        // 检查本轮是否已使用
        if (this.usedThisRound) {
            return { success: false, message: '本轮商店已使用过一次，下一轮再来!' };
        }

        // 特质：经济头脑 - 商店所有道具价格降低30%
        let finalPrice = item.price;
        if (gameState.currentTrait && gameState.currentTrait.id === 'economic_mind') {
            finalPrice = Math.floor(item.price * 0.7);
        }

        // 负面道具是给钱的
        const cost = Math.max(0, finalPrice);

        if (gameState.score < cost) {
            return { success: false, message: '分数不足!' };
        }

        // 扣除/增加分数
        gameState.score -= finalPrice;

        // 永久道具直接加到永久列表
        if (item.type === 'permanent') {
            if (!gameState.permanentItems.find(i => i.id === item.id)) {
                gameState.permanentItems.push(item);
                // 立即应用永久道具效果
                gameState.applyPermanentBonuses();
                this.usedThisRound = true;  // 标记已使用
                return { success: true, message: `购买成功!${item.name}已加入永久道具!` };
            } else {
                gameState.score += finalPrice; // 退款
                return { success: false, message: '已拥有此永久道具!' };
            }
        }

        // 立即生效的负面道具（如牌型封印）
        if (item.type === 'instant_negative') {
            this.usedThisRound = true;  // 标记已使用
            const result = item.effect(gameState);
            return result;
        }

        // 临时道具加到临时列表
        gameState.addTemporaryItem(item);
        this.usedThisRound = true;  // 标记已使用
        return { success: true, message: `购买成功!${item.name}已加入道具栏!` };
    }
}

// 智能提示算法
class HintAlgorithm {
    // 查找最佳出牌组合
    static findBestCombinations(gameState) {
        const suggestions = [];
        const handCards = gameState.handCards;

        if (!handCards || handCards.length === 0) {
            return [];
        }

        // 1. 检查火箭
        const rocket = this.findRocket(handCards);
        if (rocket) suggestions.push(rocket);

        // 2. 检查炸弹
        const bombs = this.findBombs(handCards);
        suggestions.push(...bombs);

        // 3. 检查飞机系列
        const airplanes = this.findAirplanes(handCards);
        suggestions.push(...airplanes);

        // 4. 检查顺子
        const straights = this.findStraights(handCards);
        suggestions.push(...straights);

        // 5. 检查连对
        const doubleStraights = this.findDoubleStraights(handCards);
        suggestions.push(...doubleStraights);

        // 6. 检查三张系列
        const triples = this.findTriples(handCards);
        suggestions.push(...triples);

        // 7. 检查对子
        const pairs = this.findPairs(handCards);
        suggestions.push(...pairs);

        // 按价值排序，返回前3个
        return suggestions
            .sort((a, b) => this.calculateValue(b, gameState) - this.calculateValue(a, gameState))
            .slice(0, 3);
    }

    // 查找火箭
    static findRocket(handCards) {
        const hasSmallJoker = handCards.find(c => c.rank === '小王');
        const hasBigJoker = handCards.find(c => c.rank === '大王');

        if (hasSmallJoker && hasBigJoker) {
            return {
                type: 'ROCKET',
                name: '火箭',
                cards: [hasSmallJoker, hasBigJoker],
                score: 300,
                actionCost: 7
            };
        }
        return null;
    }

    // 查找炸弹
    static findBombs(handCards) {
        const bombs = [];
        const valueCount = this.countCardsByValue(handCards);

        for (let value in valueCount) {
            if (valueCount[value].length === 4) {
                bombs.push({
                    type: 'BOMB',
                    name: '炸弹',
                    cards: valueCount[value],
                    score: 200,
                    actionCost: 6
                });
            }
        }
        return bombs;
    }

    // 查找飞机系列
    static findAirplanes(handCards) {
        const airplanes = [];
        const valueCount = this.countCardsByValue(handCards);

        // 找出所有三张
        const triples = [];
        for (let value in valueCount) {
            if (valueCount[value].length >= 3 && parseInt(value) < 15) {
                triples.push(parseInt(value));
            }
        }

        triples.sort((a, b) => a - b);

        // 查找连续的三张
        for (let i = 0; i < triples.length - 1; i++) {
            let consecutive = [triples[i]];
            for (let j = i + 1; j < triples.length; j++) {
                if (triples[j] === consecutive[consecutive.length - 1] + 1) {
                    consecutive.push(triples[j]);
                } else {
                    break;
                }
            }

            if (consecutive.length >= 2) {
                const cards = [];
                consecutive.forEach(val => {
                    cards.push(...valueCount[val].slice(0, 3));
                });

                airplanes.push({
                    type: 'AIRPLANE',
                    name: '飞机',
                    cards: cards,
                    score: 160,
                    actionCost: 5.5
                });
            }
        }

        return airplanes;
    }

    // 查找顺子
    static findStraights(handCards) {
        const straights = [];
        const sorted = handCards.filter(c => c.value < 15).sort((a, b) => a.value - b.value);

        // 去重
        const uniqueValues = [...new Set(sorted.map(c => c.value))];

        // 查找5张及以上的连续牌
        for (let i = 0; i < uniqueValues.length; i++) {
            let consecutive = [uniqueValues[i]];
            for (let j = i + 1; j < uniqueValues.length; j++) {
                if (uniqueValues[j] === consecutive[consecutive.length - 1] + 1) {
                    consecutive.push(uniqueValues[j]);
                } else {
                    break;
                }
            }

            if (consecutive.length >= 5) {
                const cards = consecutive.map(val =>
                    sorted.find(c => c.value === val)
                );

                straights.push({
                    type: 'STRAIGHT',
                    name: '顺子',
                    cards: cards,
                    score: 100,
                    actionCost: 4.5
                });
            }
        }

        return straights;
    }

    // 查找连对
    static findDoubleStraights(handCards) {
        const doubleStraights = [];
        const valueCount = this.countCardsByValue(handCards);

        // 找出所有对子
        const pairs = [];
        for (let value in valueCount) {
            if (valueCount[value].length >= 2 && parseInt(value) < 15) {
                pairs.push(parseInt(value));
            }
        }

        pairs.sort((a, b) => a - b);

        // 查找3对及以上的连续对子
        for (let i = 0; i < pairs.length; i++) {
            let consecutive = [pairs[i]];
            for (let j = i + 1; j < pairs.length; j++) {
                if (pairs[j] === consecutive[consecutive.length - 1] + 1) {
                    consecutive.push(pairs[j]);
                } else {
                    break;
                }
            }

            if (consecutive.length >= 3) {
                const cards = [];
                consecutive.forEach(val => {
                    cards.push(...valueCount[val].slice(0, 2));
                });

                doubleStraights.push({
                    type: 'DOUBLE_STRAIGHT',
                    name: '连对',
                    cards: cards,
                    score: 120,
                    actionCost: 5.5
                });
            }
        }

        return doubleStraights;
    }

    // 查找三张系列
    static findTriples(handCards) {
        const triples = [];
        const valueCount = this.countCardsByValue(handCards);

        for (let value in valueCount) {
            const cards = valueCount[value];
            if (cards.length >= 3) {
                triples.push({
                    type: 'TRIPLE',
                    name: '三张',
                    cards: cards.slice(0, 3),
                    score: 40,
                    actionCost: 3.5
                });
            }
        }

        return triples;
    }

    // 查找对子
    static findPairs(handCards) {
        const pairs = [];
        const valueCount = this.countCardsByValue(handCards);

        for (let value in valueCount) {
            const cards = valueCount[value];
            if (cards.length >= 2) {
                pairs.push({
                    type: 'PAIR',
                    name: '对子',
                    cards: cards.slice(0, 2),
                    score: 20,
                    actionCost: 3
                });
            }
        }

        return pairs;
    }

    // 按点数统计牌
    static countCardsByValue(handCards) {
        const count = {};
        handCards.forEach(card => {
            if (!count[card.value]) {
                count[card.value] = [];
            }
            count[card.value].push(card);
        });
        return count;
    }

    // 计算组合价值
    static calculateValue(suggestion, gameState) {
        const score = suggestion.score;
        const actionCost = suggestion.actionCost;

        // 价值 = 基础分数 × 1.5 + (分数/行动点消耗) × 10
        const efficiency = actionCost > 0 ? (score / actionCost) : 0;
        return score * 1.5 + efficiency * 10;
    }
}
