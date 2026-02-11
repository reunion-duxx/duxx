// 游戏核心逻辑 - 扑克牌类和牌型识别

// 特质管理器
class TraitManager {
    static TRAITS = {
        'precision_strike': {
            id: 'precision_strike',
            name: '精准打击',
            description: '单牌消耗固定为1点（无视递增规则）\n负面：你无法打出顺子'
        },
        'economic_mind': {
            id: 'economic_mind',
            name: '经济头脑',
            description: '商店正面道具、永久道具和传奇道具价格降低20%（不影响负面道具）\n负面：每关通过奖励的积分减少30%'
        },
        'combo_master': {
            id: 'combo_master',
            name: '连击达人',
            description: '连击倍率上限提升至2.5倍\n负面：连击中断时，你失去1点行动点'
        },
        'rest_and_wait': {
            id: 'rest_and_wait',
            name: '以逸待劳',
            description: '回合结束时，若未使用弃牌，则下回合行动点+1\n负面：你的弃牌点上限减少1点'
        },
        'bomb_expert': {
            id: 'bomb_expert',
            name: '炸弹专家',
            description: '炸弹积分+50%\n负面：炸弹的消耗增加2点'
        },
        'straight_master': {
            id: 'straight_master',
            name: '顺子大师',
            description: '顺子的消耗减少1点\n负面：对子的消耗增加1点'
        },
        'aggressive_assault': {
            id: 'aggressive_assault',
            name: '高压攻势',
            description: '每回合首次出牌的积分增加50%\n负面：回合结束时，若手牌数大于15，则扣除20积分'
        },
        'resource_recycling': {
            id: 'resource_recycling',
            name: '资源回收',
            description: '弃牌时，每弃1张牌获得2金币\n负面：每次弃牌的默认抽牌数减少1张'
        }
    };

    // 获取所有特质ID列表
    static getAllTraitIds() {
        return Object.keys(this.TRAITS);
    }

    // 随机抽取3个特质
    static drawThreeTraits() {
        const allIds = this.getAllTraitIds();
        const shuffled = [...allIds].sort(() => Math.random() - 0.5);
        return shuffled.slice(0, 3).map(id => this.TRAITS[id]);
    }

    // 根据ID获取特质
    static getTrait(traitId) {
        return this.TRAITS[traitId] || null;
    }
}

// 扑克牌类
class Card {
    constructor(rank, suit, isUpgraded = false) {
        this.rank = rank;  // 点数: 3-10, J, Q, K, A, 2, 小王, 大王
        this.suit = suit;  // 花色: hearts(红桃), spades(黑桃), diamonds(方块), clubs(梅花), joker(王)
        this.value = this.getValue();  // 数值: 3=3, ..., A=14, 2=15, 小王=16, 大王=17
        this.isUpgraded = isUpgraded;  // 是否为升级卡牌
        this.upgradeBonus = 20;  // 升级卡牌的额外积分
    }

    getValue() {
        const rankMap = {
            '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10,
            'J': 11, 'Q': 12, 'K': 13, 'A': 14, '2': 15,
            '小王': 16, '大王': 17
        };
        return rankMap[this.rank] || 0;
    }

    isRed() {
        return this.suit === 'hearts' || this.suit === 'diamonds';
    }

    toString() {
        const suitSymbols = {
            'hearts': '♥',
            'spades': '♠',
            'diamonds': '♦',
            'clubs': '♣',
            'joker': ''
        };
        return this.suit === 'joker' ? this.rank : `${suitSymbols[this.suit]}${this.rank}`;
    }
}

// 牌型识别器
class PatternDetector {
    static PATTERNS = {
        SINGLE: { name: '单牌', score: 10 },
        PAIR: { name: '对子', score: 20 },
        TRIPLE: { name: '三张', score: 40 },
        TRIPLE_SINGLE: { name: '三带一', score: 60 },
        TRIPLE_PAIR: { name: '三带二', score: 80 },
        STRAIGHT: { name: '顺子', score: 100 },
        DOUBLE_STRAIGHT: { name: '连对', score: 120 },
        AIRPLANE: { name: '飞机', score: 160 },
        AIRPLANE_WINGS: { name: '飞机带翅膀', score: 200 },
        AIRPLANE_SINGLE_WINGS: { name: '飞机带单翅膀', score: 200 },
        AIRPLANE_PAIR_WINGS: { name: '飞机带对翅膀', score: 200 },
        BOMB: { name: '炸弹', score: 200 },
        ROCKET: { name: '火箭', score: 300 }
    };

    static detectPattern(cards) {
        if (!cards || cards.length === 0) {
            return { valid: false };
        }

        const sorted = [...cards].sort((a, b) => a.value - b.value);
        const count = sorted.length;

        // 火箭 (大王+小王)
        if (count === 2) {
            if (sorted[0].rank === '小王' && sorted[1].rank === '大王') {
                return { valid: true, ...this.PATTERNS.ROCKET, cards: sorted };
            }
        }

        // 统计每个点数的数量
        const valueCount = this.countValues(sorted);
        const counts = Object.values(valueCount).sort((a, b) => b - a);

        // 炸弹 (4张相同点数)
        if (count === 4 && counts[0] === 4) {
            return { valid: true, ...this.PATTERNS.BOMB, cards: sorted };
        }

        // 单牌
        if (count === 1) {
            return { valid: true, ...this.PATTERNS.SINGLE, cards: sorted };
        }

        // 对子
        if (count === 2 && counts[0] === 2) {
            return { valid: true, ...this.PATTERNS.PAIR, cards: sorted };
        }

        // 三张
        if (count === 3 && counts[0] === 3) {
            return { valid: true, ...this.PATTERNS.TRIPLE, cards: sorted };
        }

        // 三带一
        if (count === 4 && counts[0] === 3 && counts[1] === 1) {
            return { valid: true, ...this.PATTERNS.TRIPLE_SINGLE, cards: sorted };
        }

        // 三带二
        if (count === 5 && counts[0] === 3 && counts[1] === 2) {
            return { valid: true, ...this.PATTERNS.TRIPLE_PAIR, cards: sorted };
        }

        // 顺子 (恰好5张连续单牌,不能含2和王)
        if (count === 5 && this.isStraight(sorted)) {
            return { valid: true, ...this.PATTERNS.STRAIGHT, cards: sorted };
        }

        // 连对 (恰好3对连续对子)
        if (count === 6 && this.isDoubleStraight(sorted)) {
            return { valid: true, ...this.PATTERNS.DOUBLE_STRAIGHT, cards: sorted };
        }

        // 飞机 (连续的三张)
        const airplaneResult = this.detectAirplane(sorted);
        if (airplaneResult.valid) {
            return airplaneResult;
        }

        return { valid: false };
    }

    static countValues(cards) {
        const count = {};
        cards.forEach(card => {
            count[card.value] = (count[card.value] || 0) + 1;
        });
        return count;
    }

    static isStraight(cards) {
        // 检查是否为顺子:连续单牌,不能含2(15)和王(16,17)
        if (cards.some(c => c.value >= 15)) return false;

        const values = cards.map(c => c.value);
        for (let i = 1; i < values.length; i++) {
            if (values[i] !== values[i - 1] + 1) return false;
        }
        return true;
    }

    static isDoubleStraight(cards) {
        // 检查是否为连对:连续的对子,不能含2和王
        if (cards.some(c => c.value >= 15)) return false;

        const valueCount = this.countValues(cards);
        const values = Object.keys(valueCount).map(Number).sort((a, b) => a - b);

        // 每个值都必须是2张
        for (let val of values) {
            if (valueCount[val] !== 2) return false;
        }

        // 必须连续
        for (let i = 1; i < values.length; i++) {
            if (values[i] !== values[i - 1] + 1) return false;
        }

        return true;
    }

    static detectAirplane(cards) {
        // 飞机:至少2组连续的三张,可以带翅膀(单牌或对子)
        const valueCount = this.countValues(cards);
        const triples = Object.keys(valueCount)
            .filter(val => valueCount[val] >= 3)
            .map(Number)
            .sort((a, b) => a - b);

        if (triples.length < 2) return { valid: false };

        // 检查三张是否连续且不含2和王
        if (triples.some(v => v >= 15)) return { valid: false };
        for (let i = 1; i < triples.length; i++) {
            if (triples[i] !== triples[i - 1] + 1) return { valid: false };
        }

        const tripleCount = triples.length;
        const tripleCards = tripleCount * 3;

        // 飞机不带翅膀
        if (cards.length === tripleCards) {
            return { valid: true, ...this.PATTERNS.AIRPLANE, cards };
        }

        // 飞机带翅膀
        const wingCards = cards.length - tripleCards;
        if (wingCards === tripleCount) {
            // 单翅膀
            return { valid: true, ...this.PATTERNS.AIRPLANE_SINGLE_WINGS, cards };
        }
        if (wingCards === tripleCount * 2) {
            // 双翅膀（对翅膀）
            return { valid: true, ...this.PATTERNS.AIRPLANE_PAIR_WINGS, cards };
        }

        return { valid: false };
    }
}

// 游戏状态管理
class GameState {
    constructor() {
        this.level = 1;              // 当前关卡
        this.round = 1;              // 当前回合(1-3)
        this.maxRounds = 3;          // 最大回合数
        this.handCards = [];         // 手牌
        this.deckCards = [];         // 牌库(用于抽牌)
        this.score = 0;              // 当前分数
        this.combo = 1.0;            // 连击倍数
        this.playCountThisRound = 0; // 本回合出牌次数
        this.permanentItems = [];    // 永久道具
        this.temporaryItems = [];    // 临时道具
        this.lastPlayed = null;      // 上次出的牌型
        this.lastScore = 0;          // 上次得分
        this.gameOver = false;       // 游戏是否结束
        this.drawnCardsThisRound = 0; // 本回合抽取的牌数

        // 关卡积分系统
        this.levelScore = 0;         // 本关获得的总分数
        this.levelScoreRequirement = 0; // 本关需要达到的积分要求
        this.levelScoreRequirements = {  // 各关卡积分要求 (1-3关无要求，4-9关: (300 + 关卡序号 × 100) × 关卡系数，第10关: 1400)
            1: 0,     // 无积分要求
            2: 0,     // 无积分要求
            3: 0,     // 无积分要求
            4: 350,   // 第4关积分要求
            5: 400,   // 第5关积分要求
            6: 450,   // 第6关积分要求
            7: 700,   // 第7关积分要求
            8: 1100,  // 第8关积分要求
            9: 1440,  // (300 + 9 × 100) × 1.2 = 1440
            10: 1400  // 第10关固定1400分
        };

        // 关卡积分系数
        this.levelScoreMultiplier = 1.0;  // 当前关卡的积分系数
        this.levelScoreMultipliers = {    // 各关卡积分系数
            1: 0.6,
            2: 0.6,
            3: 0.8,
            4: 0.8,
            5: 1.0,
            6: 1.0,
            7: 1.0,
            8: 1.2,
            9: 1.2,
            10: 1.5
        };

        // 评价系统
        this.rating = null;          // 当前评价: 'S', 'A', 'B', null
        this.finishRound = null;     // 完成时的回合数

        // 豪赌系统
        this.gambleMode = false;          // UI按钮状态（是否已点击）
        this.gambleLevelActive = false;   // 本关是否激活豪赌（用于倍率计算）

        // 行动点系统
        this.initialCardCount = 0;   // 记录初始手牌数
        this.actionPoints = 0;       // 当前行动点（动态计算）
        this.maxActionPoints = 0;    // 每回合最大行动点（动态计算）
        this.baseActionPoints = 6;   // 基础行动点（第一关基础6点）
        this.permanentActionBonus = 0; // 永久道具加成
        this.actionPointCosts = {    // 牌型消耗配置
            'SINGLE': 2,             // 单牌：首张2点,后续1.5点(通过getPatternCost动态计算)
            'PAIR': 2,               // 对子：2点
            'TRIPLE': 2.5,           // 三张：2.5点
            'TRIPLE_SINGLE': 3.5,    // 三带一：3.5点
            'TRIPLE_PAIR': 4,        // 三带二：4点
            'STRAIGHT': 3,           // 顺子：3点
            'DOUBLE_STRAIGHT': 4.5,  // 连对：4.5点
            'AIRPLANE': 4.5,         // 飞机：4.5点
            'AIRPLANE_SINGLE_WINGS': 5.5,  // 飞机带单翅膀：5.5点
            'AIRPLANE_PAIR_WINGS': 6.5,    // 飞机带对翅膀：6.5点
            'FOUR_PAIR': 5,          // 四带二：5点
            'BOMB': 5,               // 炸弹：5点（出牌后+1行动点）
            'ROCKET': 5              // 火箭：5点（出牌后+3行动点）
        };

        // 单牌/对子使用次数追踪
        this.singlePlayedThisRound = 0;  // 本回合出单牌次数
        this.pairPlayedThisRound = 0;    // 本回合出对子次数

        // 节能模式标志
        this.energySaverActive = false;

        // 行动点惩罚
        this.actionPenaltyNextRound = 0;

        // 封印的牌型列表
        this.sealedPatterns = [];

        // 出牌锁定机制
        this.playLocked = false;         // 是否锁定出牌
        this.lockRoundsRemaining = 0;    // 剩余锁定回合数

        // 弃牌点系统
        this.discardPoints = 0;          // 当前弃牌点（初始0点）
        this.maxDiscardPoints = 4;       // 弃牌点上限（改为4）
        this.discardPointCost = 1;       // 基础弃牌消耗（改为1点）
        this.currentDiscardCost = 1;     // 当前弃牌消耗（动态递增）
        this.discardUsedThisRound = 0;   // 本回合已使用弃牌次数
        this.discardDrawBonus = 0;       // 弃牌额外抽牌数
        this.permanentDiscardDrawBonus = 0; // 永久弃牌额外抽牌数
        this.extraDiscardAvailable = false;  // 是否有额外弃牌机会

        // 商店使用限制
        this.shopUsedItems = new Set();  // 当前商店已使用的道具ID

        // 透支未来道具的分数惩罚
        this.scorePenaltyNextLevel = 0;  // 下一关初始分数惩罚

        // 特殊规则系统
        this.specialRule = null;          // 当前关卡特殊规则: null/'timeLimit'/'doubleCost'/boss规则
        this.specialRuleData = null;      // 特殊规则配置数据
        this.turnTimer = null;            // 计时器ID
        this.turnTimeLimit = 30;          // 限时关卡时间限制(30秒)
        this.turnStartTime = null;        // 本次出牌思考开始时间
        this.turnTimerPaused = false;     // 倒计时是否暂停
        this.turnPauseStartTime = null;   // 暂停开始时间
        this.turnTotalPausedTime = 0;     // 本回合累计暂停时间(毫秒)

        // Boss关系统
        this.isBossLevel = false;         // 是否为boss关
        this.bossRule = null;             // boss规则类型
        this.bossRuleData = {};           // boss规则数据
        this.bossRewardPending = false;   // boss奖励待领取

        // 新道具相关状态标志
        this.lastActionCost = 0;          // 记录上次出牌消耗的行动点

        // 额外胜利条件追踪
        this.usedPatternTypes = new Set(); // 本关使用过的牌型类型（用于第9关）
        this.roundsUsedToWin = 0;          // 完成关卡使用的回合数（用于第10关）
        this.backwaterBattleActive = false;  // 背水一战激活标志
        this.desperateStakeActive = false; // 孤注一掷激活标志

        // 卡牌升级系统
        this.upgradedCardRanks = [];  // 已升级的牌点数列表

        // 金币系统
        this.coins = 0;  // 当前金币数（在主菜单中管理）

        // 特质系统
        this.currentTrait = null;  // 当前生效的特质
        this.availableTraits = [];  // 可选的特质列表（关卡开始时抽取3个）
        this.traitSelected = false;  // 是否已选择特质
        this.discardUsedThisRoundForTrait = false;  // 本回合是否使用过弃牌（用于以逸待劳特质）

        // 天赋系统（永久跨局生效）
        this.purchasedTalents = [];  // 已购买的天赋ID列表
        this.firstDiscardUsedThisLevel = false;  // 本关是否已使用过第一次弃牌（用于二手准备天赋）

        // 负面规则系统（第6关开始，50%概率触发）
        this.negativeRule = null;  // 当前负面规则: null/'erosion'/'costIncrease'/'rankTax'/'monotone'
        this.negativeRuleData = {};  // 负面规则数据
        this.lockedCards = [];  // 被侵蚀规则锁定的卡牌索引
        this.patternPlayCount = {};  // 本回合各牌型出牌次数（用于消耗递增）
        this.lastPlayedPatternName = null;  // 上次出牌的牌型名称（用于单调牌序）

        // 连击衰减系统
        this.patternComboCount = {};  // 本回合各牌型连续使用次数（用于积分衰减）
    }

    // 发牌
    dealCards(count) {
        // 重置豪赌状态
        this.gambleMode = false;
        this.gambleLevelActive = false;

        // 记录初始手牌数
        this.initialCardCount = count;

        // 初始化关卡积分系统
        this.levelScore = 0;
        this.levelScoreRequirement = this.levelScoreRequirements[this.level] || 0;
        this.levelScoreMultiplier = this.levelScoreMultipliers[this.level] || 1.0;

        // 特质：以逸待劳 - 弃牌点上限减少1点
        if (this.currentTrait && this.currentTrait.id === 'rest_and_wait') {
            this.maxDiscardPoints = 3;
        } else {
            this.maxDiscardPoints = 4;
        }

        // 计算最大行动点：基础点数 + 关卡加成 + 永久加成
        // 关卡加成规则：
        // 第1关: 8点 (基础6点 + 2点)
        // 第2关: 8点 (基础6点 + 2点)
        // 第3关: 9点 (基础6点 + 3点)
        // 第4关: 9点 (基础6点 + 3点)
        // 第5关: 10点 (基础6点 + 4点)
        // 第6关: 10点 (基础6点 + 4点)
        // 第7关: 10点 (基础6点 + 4点)
        // 第8关: 11点 (基础6点 + 5点)
        // 第9关: 11点 (基础6点 + 5点)
        // 第10关: 11点 (基础6点 + 5点)
        let levelBonus = 0;
        if (this.level === 1 || this.level === 2) {
            levelBonus = 2;  // 第1-2关: 8点
        } else if (this.level === 3 || this.level === 4) {
            levelBonus = 3;  // 第3-4关: 9点
        } else if (this.level === 5 || this.level === 6 || this.level === 7) {
            levelBonus = 4;  // 第5-7关: 10点
        } else if (this.level >= 8) {
            levelBonus = 5;  // 第8-10关: 11点
        }

        // 计算最大行动点：基础 + 关卡加成 + 永久道具加成 + boss奖励加成
        const bossActionBonus = this.bossRuleData?.permanentActionBonus || 0;
        this.maxActionPoints = this.baseActionPoints + levelBonus + this.permanentActionBonus + bossActionBonus;

        // 传奇道具：完美时刻 - 下一关初始行动点减少3点
        if (this.actionPenaltyNextLevel > 0) {
            this.maxActionPoints -= this.actionPenaltyNextLevel;
            this.actionPenaltyNextLevel = 0;
        }

        // 应用透支惩罚(如果存在)
        if (this.actionPenaltyNextRound > 0) {
            this.actionPoints = this.maxActionPoints - this.actionPenaltyNextRound;
            this.actionPenaltyNextRound = 0;
        } else {
            this.actionPoints = this.maxActionPoints;
        }

        // 天赋：应急储备 - 每局游戏开始时（第一回合），额外获得1点行动点
        if (this.purchasedTalents && this.purchasedTalents.includes('emergency_reserve') && this.round === 1) {
            this.actionPoints += 1;
        }

        // 创建完整的牌库
        const allCards = this.createFullDeck();

        // 从牌库中随机抽取初始手牌
        this.handCards = allCards.splice(0, count);

        // 剩余的牌放入牌库供后续抽取
        this.deckCards = allCards;

        this.round = 1;
        this.combo = 1.0;
        this.playCountThisRound = 0;  // 重置出牌次数
        this.lastPlayed = null;
        this.lastScore = 0;
        this.gameOver = false;
        this.drawnCardsThisRound = 0;

        // 重置单牌/对子计数
        this.singlePlayedThisRound = 0;
        this.pairPlayedThisRound = 0;

        // 关卡开始时获得2点弃牌点（改为2）
        this.discardPoints = 2;
        this.currentDiscardCost = this.discardPointCost;  // 重置弃牌消耗为基础值
        this.discardUsedThisRound = 0;  // 重置使用次数

        // 重置本关第一次弃牌标记（用于二手准备天赋）
        this.firstDiscardUsedThisLevel = false;

        // 应用永久道具的初始分数加成
        this.applyPermanentBonuses();

        // 限时关卡：在关卡开始时自动启动计时器
        if (this.specialRule === 'timeLimit') {
            this.startTurnTimer();
        }
    }

    // 创建完整牌库并洗牌
    createFullDeck() {
        const deck = [];
        const ranks = ['3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A', '2'];
        const suits = ['hearts', 'spades', 'diamonds', 'clubs'];

        // 添加2副普通牌 (104张)
        for (let i = 0; i < 2; i++) {
            for (let rank of ranks) {
                for (let suit of suits) {
                    // 检查是否为升级牌（30%概率）
                    const isUpgraded = this.upgradedCardRanks.includes(rank) && Math.random() < 0.3;
                    deck.push(new Card(rank, suit, isUpgraded));
                }
            }
        }

        // 添加4张王牌
        const smallJokerUpgraded = this.upgradedCardRanks.includes('小王') && Math.random() < 0.3;
        const smallJokerUpgraded2 = this.upgradedCardRanks.includes('小王') && Math.random() < 0.3;
        const bigJokerUpgraded = this.upgradedCardRanks.includes('大王') && Math.random() < 0.3;
        const bigJokerUpgraded2 = this.upgradedCardRanks.includes('大王') && Math.random() < 0.3;

        deck.push(new Card('小王', 'joker', smallJokerUpgraded));
        deck.push(new Card('小王', 'joker', smallJokerUpgraded2));
        deck.push(new Card('大王', 'joker', bigJokerUpgraded));
        deck.push(new Card('大王', 'joker', bigJokerUpgraded2));

        // Fisher-Yates洗牌算法
        for (let i = deck.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [deck[i], deck[j]] = [deck[j], deck[i]];
        }

        return deck;
    }

    // 创建指定数量的随机牌
    createDeck(count) {
        const fullDeck = this.createFullDeck();
        return fullDeck.slice(0, count);
    }

    // 从牌库抽牌
    drawCards(count) {
        const drawnCards = [];
        const actualCount = Math.min(count, this.deckCards.length);

        for (let i = 0; i < actualCount; i++) {
            const card = this.deckCards.shift(); // 从牌库顶部抽牌
            if (card) {
                drawnCards.push(card);
                this.handCards.push(card);
            }
        }

        this.drawnCardsThisRound += actualCount;
        return drawnCards;
    }

    // 出牌
    playCards(selectedCards, pattern, patternKey) {
        // 检查是否被锁定
        if (this.playLocked) {
            return { success: false, message: '当前回合被锁定，无法出牌!' };
        }

        // 负面规则：单调牌序 - 不能连续出两次相同牌型
        if (this.negativeRule === 'monotone' && this.lastPlayedPatternName === pattern.name) {
            return { success: false, message: '单调牌序规则：不能连续出两次相同牌型!' };
        }

        // 特质：精准打击 - 无法打出顺子
        if (this.currentTrait && this.currentTrait.id === 'precision_strike' && patternKey === 'STRAIGHT') {
            return { success: false, message: '精准打击特质：无法打出顺子!' };
        }

        // ===== Boss规则验证 =====
        if (this.isBossLevel && this.bossRule) {
            // 秩序守护者：必须按顺序出牌型
            if (this.bossRule === 'orderGuardian') {
                if (!this.bossRuleData.unlockedPatterns.includes(patternKey) &&
                    patternKey !== 'ROCKET') {  // 火箭可以随时打
                    return { success: false, message: 'Boss规则：该牌型尚未解锁!' };
                }
            }
        }

        // 传奇道具：完美时刻 - 本回合所有出牌行动点消耗为0
        let cost = 0;
        if (this.perfectMomentActive) {
            cost = 0;  // 完美时刻激活时，行动点消耗为0
        } else {
            // 扣除行动点并记录消耗
            cost = this.deductActionPoints(patternKey);
        }
        this.lastActionCost = cost;  // 记录消耗

        // 炸弹/火箭奖励：打出后获得行动点
        if (patternKey === 'BOMB') {
            this.actionPoints += 1;  // 炸弹+1行动点
        } else if (patternKey === 'ROCKET') {
            this.actionPoints += 3;  // 火箭+3行动点
        }

        // 记录单牌/对子使用次数
        if (patternKey === 'SINGLE') {
            this.singlePlayedThisRound++;
        } else if (patternKey === 'PAIR') {
            this.pairPlayedThisRound++;
        }

        // 追踪使用过的牌型类型（用于第9关额外胜利条件）
        this.usedPatternTypes.add(patternKey);

        // 增加出牌次数
        this.playCountThisRound++;

        // 计算基础分数
        let baseScore = pattern.score;

        // 传奇道具：单牌之王 - 单牌基础积分变为30分
        if (this.singleCardKingActive && patternKey === 'SINGLE') {
            baseScore = 30;
        }

        // 特质：炸弹专家 - 炸弹积分+50%
        if (this.currentTrait && this.currentTrait.id === 'bomb_expert' && patternKey === 'BOMB') {
            baseScore = Math.floor(baseScore * 1.5);
        }

        // 升级牌额外分数：检查打出的牌中是否有升级牌
        let upgradeBonus = 0;
        selectedCards.forEach(card => {
            if (card.isUpgraded) {
                upgradeBonus += card.upgradeBonus;  // 每张升级牌 +20分
            }
        });
        baseScore += upgradeBonus;

        // 积分翻倍:本回合第一手牌基础分×2(在连击倍率之前)
        if (this.scoreDoubleActive && !this.scoreDoubleUsed) {
            baseScore *= 2;
            this.scoreDoubleUsed = true;
        }

        // 特质：高压攻势 - 每回合首次出牌积分+50%
        if (this.currentTrait && this.currentTrait.id === 'aggressive_assault' && this.playCountThisRound === 1) {
            baseScore = Math.floor(baseScore * 1.5);
        }

        // 计算连击倍率
        let comboMultiplier = this.combo;

        // 连锁效应:连击倍率额外+0.2
        if (this.chainReactionActive) {
            comboMultiplier += 0.2;
        }

        // 连击衰减机制：同一回合内连续使用相同牌型时，积分依次递减10%
        let decayMultiplier = 1.0;
        const currentPatternCount = this.patternComboCount[patternKey] || 0;
        if (currentPatternCount > 0) {
            // 第2次使用：90%，第3次：80%，第4次：70%，以此类推
            decayMultiplier = 1.0 - (currentPatternCount * 0.1);
            // 最低保持10%的积分
            decayMultiplier = Math.max(0.1, decayMultiplier);
        }

        let finalScore = Math.floor(baseScore * comboMultiplier * decayMultiplier);

        // Boss奖励：完美主义者 - 积分获取+20%
        if (this.bossRuleData.permanentScoreBonus) {
            finalScore = Math.floor(finalScore * (1 + this.bossRuleData.permanentScoreBonus));
        }

        // 应用关卡积分系数
        finalScore = Math.floor(finalScore * this.levelScoreMultiplier);

        this.score += finalScore;
        this.levelScore += finalScore;  // 累加本关积分

        this.lastPlayed = pattern;
        this.lastScore = finalScore;

        // 从手牌中移除已出的牌
        selectedCards.forEach(playedCard => {
            const index = this.handCards.findIndex(c => c === playedCard);
            if (index !== -1) {
                this.handCards.splice(index, 1);
            }
        });

        // 增加Combo：从第2次出牌开始增加
        // 第1次出牌后combo保持1.0，第2次出牌后变成1.3，第3次变成1.6，以此类推
        if (this.playCountThisRound >= 2) {
            let comboIncrement = 0.3;
            // 连锁效应会提升combo增长量
            if (this.chainReactionActive) {
                comboIncrement += 0.2;  // 连锁效应使每次combo增长从0.3提升到0.5
            }
            // 特质：连击达人 - 连击倍率上限提升至2.5倍
            const comboMax = (this.currentTrait && this.currentTrait.id === 'combo_master') ? 2.5 : 2.2;
            this.combo = Math.min(comboMax, this.combo + comboIncrement);
        }

        // ===== Boss规则状态更新 =====
        if (this.isBossLevel && this.bossRule) {
            // 秩序守护者：分组解锁牌型
            if (this.bossRule === 'orderGuardian') {
                const currentGroupIndex = this.bossRuleData.currentGroupIndex;
                const currentGroup = this.bossRuleData.patternGroups[currentGroupIndex];

                // 如果打出了当前组中的任意牌型，且当前组未完成
                if (currentGroup.includes(patternKey) && !this.bossRuleData.currentGroupCompleted) {
                    // 标记当前组已完成
                    this.bossRuleData.currentGroupCompleted = true;

                    // 如果还有下一组，解锁下一组的所有牌型
                    if (currentGroupIndex < this.bossRuleData.patternGroups.length - 1) {
                        this.bossRuleData.currentGroupIndex++;
                        const nextGroup = this.bossRuleData.patternGroups[this.bossRuleData.currentGroupIndex];

                        // 将下一组的所有牌型添加到已解锁列表
                        nextGroup.forEach(pattern => {
                            if (!this.bossRuleData.unlockedPatterns.includes(pattern)) {
                                this.bossRuleData.unlockedPatterns.push(pattern);
                            }
                        });

                        // 重置完成标志，准备解锁下一组
                        this.bossRuleData.currentGroupCompleted = false;
                    }
                }
            }

            // 献祭者：出牌后必须弃掉一张相同点数的牌
            if (this.bossRule === 'sacrificer') {
                // 记录本次出牌的所有点数
                const playedRanks = selectedCards.map(card => card.rank);
                this.bossRuleData.lastPlayedRanks = [...new Set(playedRanks)]; // 去重
                this.bossRuleData.sacrificeRequired = true;
            }
        }

        // 检查是否出完牌
        if (this.handCards.length === 0) {
            // 先检查是否满足所有胜利条件（包括第7、9、10关的额外要求）
            const winConditionMet = this.checkWinCondition();

            if (!winConditionMet) {
                // 不满足胜利条件，显示失败原因
                let failReason = '';

                if (this.levelScore < this.levelScoreRequirement) {
                    failReason = '积分未达标';
                } else if (this.level === 9 && this.usedPatternTypes.size < 4) {
                    failReason = '第9关要求使用至少4种不同牌型';
                } else if (this.level === 10 && this.round > 2) {
                    failReason = '第10关要求在2回合内出完牌';
                }

                return { success: true, message: '手牌已出完，但' + failReason + '!' };
            }

            // Boss关特殊胜利条件检查
            if (this.isBossLevel && this.bossRule === 'perfectionist') {
                // 完美主义者：必须达到1.5倍积分要求
                if (this.levelScore >= this.bossRuleData.requiredScore) {
                    this.gameOver = true;
                    this.finishRound = this.round;
                    this.bossRewardPending = true;  // 标记boss奖励待领取
                    // 完美主义者评价：限2回合，只有S和A评价
                    if (this.round === 1) {
                        this.rating = 'S';  // 第1回合完成：S评价
                    } else if (this.round === 2) {
                        this.rating = 'A';  // 第2回合完成：A评价
                    } else {
                        this.rating = 'B';  // 第3回合完成：B评价（理论上不应该到达）
                    }
                    return { success: true, message: '通关成功!', checkWin: true };
                } else {
                    // 积分未达标，失败
                    return { success: true, message: '手牌已出完，但积分未达到Boss要求!' };
                }
            } else if (this.isBossLevel && this.bossRule === 'orderGuardian' && this.bossRuleData.requiredScore) {
                // 秩序守护者：检查特殊积分要求
                if (this.levelScore >= this.bossRuleData.requiredScore) {
                    this.gameOver = true;
                    this.finishRound = this.round;
                    this.bossRewardPending = true;  // 标记boss奖励待领取
                    // 计算评价
                    if (this.round <= 2) {
                        this.rating = 'S';
                    } else if (this.round === 3) {
                        this.rating = 'A';
                    } else if (this.round === 4) {
                        this.rating = 'B';
                    }
                    return { success: true, message: '通关成功!', checkWin: true };
                } else {
                    // 积分未达标，失败
                    return { success: true, message: '手牌已出完，但积分未达到Boss要求!' };
                }
            } else {
                // 普通关卡或其他boss关：检查积分是否达标
                if (this.levelScore >= this.levelScoreRequirement) {
                    this.gameOver = true;
                    this.finishRound = this.round;  // 记录完成回合数
                    if (this.isBossLevel) {
                        this.bossRewardPending = true;  // 标记boss奖励待领取
                    }
                    // 计算评价
                    if (this.round <= 2) {
                        this.rating = 'S';
                    } else if (this.round === 3) {
                        this.rating = 'A';
                    } else if (this.round === 4) {
                        this.rating = 'B';
                    }
                    return { success: true, message: '通关成功!', checkWin: true };
                }
            }
            // 如果积分未达标，不设置gameOver，继续抽牌
        }

        // 负面规则：更新牌型计数（用于消耗递增）
        if (this.negativeRule === 'costIncrease') {
            this.patternPlayCount[patternKey] = (this.patternPlayCount[patternKey] || 0) + 1;
        }

        // 负面规则：记录上次出牌的牌型名称（用于单调牌序）
        if (this.negativeRule === 'monotone') {
            this.lastPlayedPatternName = pattern.name;
        }

        // 连击衰减：更新本回合该牌型的使用次数
        this.patternComboCount[patternKey] = (this.patternComboCount[patternKey] || 0) + 1;

        return { success: true };
    }

    // 献祭者Boss：执行献祭逻辑
    performSacrifice() {
        if (!this.isBossLevel || this.bossRule !== 'sacrificer' || !this.bossRuleData.sacrificeRequired) {
            return { success: false, message: '当前无需献祭' };
        }

        const lastPlayedRanks = this.bossRuleData.lastPlayedRanks;

        // 检查手牌中是否有匹配点数的牌
        const matchingCards = this.handCards.filter(card =>
            lastPlayedRanks.includes(card.rank)
        );

        if (matchingCards.length > 0) {
            // 有匹配的牌，随机弃掉一张
            const cardToSacrifice = matchingCards[Math.floor(Math.random() * matchingCards.length)];
            const index = this.handCards.indexOf(cardToSacrifice);
            this.handCards.splice(index, 1);

            // 重置献祭状态
            this.bossRuleData.sacrificeRequired = false;
            this.bossRuleData.lastPlayedRanks = [];

            return {
                success: true,
                message: `献祭了一张 ${cardToSacrifice.rank}`,
                sacrificedCard: cardToSacrifice
            };
        } else {
            // 没有匹配的牌，随机弃掉两张
            if (this.handCards.length >= 2) {
                const card1Index = Math.floor(Math.random() * this.handCards.length);
                const card1 = this.handCards[card1Index];
                this.handCards.splice(card1Index, 1);

                const card2Index = Math.floor(Math.random() * this.handCards.length);
                const card2 = this.handCards[card2Index];
                this.handCards.splice(card2Index, 1);

                // 重置献祭状态
                this.bossRuleData.sacrificeRequired = false;
                this.bossRuleData.lastPlayedRanks = [];

                return {
                    success: true,
                    message: `无匹配点数的牌，随机献祭了 ${card1.rank} 和 ${card2.rank}`,
                    sacrificedCards: [card1, card2]
                };
            } else if (this.handCards.length === 1) {
                // 只剩一张牌，弃掉这张
                const card = this.handCards[0];
                this.handCards.splice(0, 1);

                // 重置献祭状态
                this.bossRuleData.sacrificeRequired = false;
                this.bossRuleData.lastPlayedRanks = [];

                return {
                    success: true,
                    message: `无匹配点数的牌，献祭了最后一张 ${card.rank}`,
                    sacrificedCard: card
                };
            } else {
                // 没有手牌了
                this.bossRuleData.sacrificeRequired = false;
                this.bossRuleData.lastPlayedRanks = [];
                return { success: true, message: '手牌已空，无需献祭' };
            }
        }
    }

    // 结束回合
    endRound() {
        // 特质：以逸待劳 - 回合结束时若未使用弃牌，则下回合行动点+1
        let restAndWaitBonus = 0;
        if (this.currentTrait && this.currentTrait.id === 'rest_and_wait' && !this.discardUsedThisRoundForTrait) {
            restAndWaitBonus = 1;
        }

        // 特质：连击达人 - 连击中断时失去1点行动点（在重置combo之前检查）
        if (this.currentTrait && this.currentTrait.id === 'combo_master' && this.combo > 1.0) {
            // 连击即将中断，下回合行动点-1
            this.actionPenaltyNextRound += 1;
        }

        // 特质：高压攻势 - 回合结束时若手牌数大于15，扣除20积分
        if (this.currentTrait && this.currentTrait.id === 'aggressive_assault' && this.handCards.length > 15) {
            this.score = Math.max(0, this.score - 20);
            this.levelScore = Math.max(0, this.levelScore - 20);
        }

        this.round++;
        this.combo = 1.0;
        this.playCountThisRound = 0;  // 重置出牌次数
        this.drawnCardsThisRound = 0;

        // 孤注一掷惩罚:剩余行动点减少下回合行动点（必须在重置行动点之前处理）
        if (this.desperateStakeActive) {
            this.actionPenaltyNextRound += this.actionPoints;
            this.desperateStakeActive = false;
        }

        // Boss规则：压力测试者 - 手牌超过15张惩罚（必须在重置行动点之前处理）
        if (this.isBossLevel && this.bossRule === 'pressureTester') {
            if (this.handCards.length > 15) {
                const penalty = this.handCards.length - 15;
                this.actionPenaltyNextRound += penalty;
            }
        }

        // 重置行动点
        this.resetActionPoints();

        // 应用以逸待劳奖励
        if (restAndWaitBonus > 0) {
            this.actionPoints += restAndWaitBonus;
        }

        // 重置弃牌使用标志
        this.discardUsedThisRoundForTrait = false;

        // 重置单牌/对子计数
        this.singlePlayedThisRound = 0;
        this.pairPlayedThisRound = 0;

        // 重置节能模式(本回合效果)
        this.energySaverActive = false;

        // 重置新道具状态标志
        this.backwaterBattleActive = false;
        this.chainReactionActive = false;  // 重置连锁效应
        this.scoreDoubleActive = false;    // 重置积分翻倍
        this.scoreDoubleUsed = false;
        this.perfectMomentActive = false;  // 重置完美时刻

        // 险中求胜:回合结束时若手牌≤5张,获得2点弃牌点
        if (this.riskyVictoryActive) {
            if (this.handCards.length <= 5) {
                this.discardPoints = Math.min(this.discardPoints + 2, this.maxDiscardPoints);
                // 可以添加提示消息
            }
            this.riskyVictoryActive = false;
        }

        // 弃牌点系统：每回合获得2点，上限4点（改为2点和4点上限）
        this.discardPoints = Math.min(this.discardPoints + 2, this.maxDiscardPoints);

        // 永久道具：存钱罐 - 每回合开始时获得分数
        this.permanentItems.forEach(item => {
            if (item.id === 'piggy_gold') {
                this.score += 20;
                this.levelScore += 20;
            }
        });

        // Boss规则：混乱法师 - 每回合重新随机交换牌型消耗
        if (this.isBossLevel && this.bossRule === 'chaosMage') {
            const patterns = ['SINGLE', 'PAIR', 'TRIPLE', 'STRAIGHT', 'BOMB'];
            const idx1 = Math.floor(Math.random() * patterns.length);
            let idx2 = Math.floor(Math.random() * patterns.length);
            while (idx2 === idx1) {
                idx2 = Math.floor(Math.random() * patterns.length);
            }
            this.bossRuleData.swappedPatterns = [patterns[idx1], patterns[idx2]];
        }

        // 重置弃牌消耗递增
        this.currentDiscardCost = this.discardPointCost;  // 重置为基础消耗1点
        this.discardUsedThisRound = 0;  // 重置使用次数

        // 负面规则：侵蚀 - 回合结束时若手牌数>15，随机锁定一张牌
        if (this.negativeRule === 'erosion' && this.handCards.length > 15) {
            // 找出未被锁定的牌
            const unlockedIndices = [];
            for (let i = 0; i < this.handCards.length; i++) {
                if (!this.lockedCards.includes(i)) {
                    unlockedIndices.push(i);
                }
            }
            // 随机锁定一张
            if (unlockedIndices.length > 0) {
                const randomIndex = unlockedIndices[Math.floor(Math.random() * unlockedIndices.length)];
                this.lockedCards.push(randomIndex);
            }
        }

        // 负面规则：重置本回合的牌型计数（用于消耗递增和单调牌序）
        this.patternPlayCount = {};
        this.lastPlayedPatternName = null;

        // 连击衰减：重置本回合的牌型连击计数
        this.patternComboCount = {};

        // 重置商店使用限制
        this.shopUsedItems.clear();

        // 处理锁定倒计时
        if (this.lockRoundsRemaining > 0) {
            this.lockRoundsRemaining--;
            if (this.lockRoundsRemaining === 0) {
                this.playLocked = false;
            }
        }

        // 新回合开始时抽3张牌(如果牌库还有牌)
        // 限制：最多到最大回合数（允许B评价）
        // Boss关：完美主义者严格限制回合数，不允许额外回合
        let maxAllowedRound;
        if (this.isBossLevel && this.bossRule === 'perfectionist') {
            maxAllowedRound = this.maxRounds;  // 完美主义者Boss：严格按maxRounds限制（第4关3回合，第10关2回合）
        } else {
            maxAllowedRound = this.maxRounds + 1;  // 其他情况：允许B评价的额外回合
        }

        // 检查是否超过最大回合数
        if (this.round > maxAllowedRound) {
            // 超过最大回合数，不再抽牌
            // 注意：不在这里设置 gameOver，让 checkLoseCondition() 来判断
            // 清空lastDrawnCards，标记没有抽牌
            this.lastDrawnCards = null;
        } else {
            // 还在允许的回合数内，抽牌
            const drawnCards = this.drawCards(3);
            if (drawnCards.length > 0) {
                // 返回抽到的牌信息,用于UI显示
                this.lastDrawnCards = drawnCards;
            }
        }
    }

    // 应用永久道具加成
    applyPermanentBonuses() {
        // 保存旧的永久加成值，用于计算差值
        const oldPermanentActionBonus = this.permanentActionBonus;

        // 重置永久加成（防止累加）
        this.permanentActionBonus = 0;
        this.permanentDiscardDrawBonus = 0;
        this.discardScorePerCard = 0;

        this.permanentItems.forEach(item => {
            if (item.id === 'permanent_action_boost') {
                this.permanentActionBonus += 1;
            } else if (item.id === 'permanent_discard_draw_extra') {
                this.permanentDiscardDrawBonus += 1;
            } else if (item.id === 'permanent_discard_score_bonus') {
                this.discardScorePerCard = 3;
            }
        });

        // 立即更新最大行动点和当前行动点（如果游戏已开始）
        if (this.level > 0) {
            let levelBonus = 0;
            if (this.level === 1 || this.level === 2) {
                levelBonus = 2;
            } else if (this.level === 3 || this.level === 4) {
                levelBonus = 3;
            } else if (this.level === 5 || this.level === 6 || this.level === 7) {
                levelBonus = 4;
            } else if (this.level >= 8) {
                levelBonus = 5;
            }

            // 计算新的最大行动点（包含boss奖励加成）
            const bossActionBonus = this.bossRuleData?.permanentActionBonus || 0;
            const newMaxActionPoints = this.baseActionPoints + levelBonus + this.permanentActionBonus + bossActionBonus;

            // 如果最大行动点增加了，同时增加当前行动点
            const actionPointIncrease = this.permanentActionBonus - oldPermanentActionBonus;
            if (actionPointIncrease > 0) {
                this.actionPoints += actionPointIncrease;
            }

            this.maxActionPoints = newMaxActionPoints;
        }
    }

    // 检查胜利条件
    checkWinCondition() {
        // 如果游戏已经结束，不再检查胜利条件
        if (this.gameOver) {
            return false;
        }

        // 确定本关的积分要求
        let requiredScore = this.levelScoreRequirement;

        // Boss关特殊积分要求
        if (this.isBossLevel && this.bossRuleData.requiredScore) {
            requiredScore = this.bossRuleData.requiredScore;
        }

        // 基础条件：手牌出完且关卡积分达标
        const basicCondition = this.handCards.length === 0 && this.levelScore >= requiredScore;

        if (!basicCondition) {
            return false;
        }

        // 第9关额外条件：使用至少4种不同牌型
        if (this.level === 9) {
            if (this.usedPatternTypes.size < 4) {
                return false;
            }
        }

        // 第10关额外条件：在2回合内出完牌（如果boss为完美主义者，依然限制2回合）
        if (this.level === 10) {
            // 如果是完美主义者boss，已经有2回合限制，不需要额外检查
            // 如果不是完美主义者，需要检查是否在2回合内完成
            if (!this.isBossLevel || this.bossRule !== 'perfectionist') {
                if (this.round > 2) {
                    return false;
                }
            }
        }

        return true;
    }

    // 检查失败条件
    checkLoseCondition() {
        // 如果游戏已经结束（通关或失败），不再检查失败条件
        if (this.gameOver) {
            return false;
        }

        // 计算最大允许回合数
        // Boss关：完美主义者严格限制回合数，不允许B评价的额外回合
        let maxAllowedRound;
        if (this.isBossLevel && this.bossRule === 'perfectionist') {
            maxAllowedRound = this.maxRounds;  // 完美主义者Boss：严格按maxRounds限制（第4关3回合，第10关2回合）
        } else {
            maxAllowedRound = this.maxRounds + 1;  // 其他情况：允许B评价的额外回合
        }

        // 确定本关的积分要求
        let requiredScore = this.levelScoreRequirement;

        // Boss关特殊积分要求
        if (this.isBossLevel && this.bossRuleData.requiredScore) {
            requiredScore = this.bossRuleData.requiredScore;
        }

        // 失败条件：
        // 1. 超过最大允许回合且手牌仍有剩余
        // 2. 或者手牌已出完但积分未达标
        return (this.round > maxAllowedRound && this.handCards.length > 0) ||
               (this.handCards.length === 0 && this.levelScore < requiredScore);
    }

    // 获取评价对应的金币倍率
    getRatingScoreMultiplier() {
        let baseMultiplier = 1.0;

        // 基础评级倍率
        if (this.rating === 'S') {
            baseMultiplier = 1.2;  // S评价：120%金币（+20%奖励）
        } else if (this.rating === 'A') {
            baseMultiplier = 1.0;  // A评价：100%金币（标准）
        } else if (this.rating === 'B') {
            baseMultiplier = 0.5;  // B评价：50%金币（-50%惩罚）
        }

        // 豪赌倍率修正
        if (this.gambleLevelActive) {
            if (this.rating === 'S') {
                baseMultiplier = 2.0;  // S评级：翻倍
            } else {
                baseMultiplier = 0.5;  // A/B评级：减半
            }
        }

        return baseMultiplier;
    }

    // 应用评价金币倍率
    applyRatingBonus() {
        const multiplier = this.getRatingScoreMultiplier();
        this.score = Math.floor(this.score * multiplier);
    }

    // 添加临时道具
    addTemporaryItem(item) {
        this.temporaryItems.push(item);
    }

    // 使用临时道具
    useTemporaryItem(itemId) {
        const index = this.temporaryItems.findIndex(item => item.id === itemId);
        if (index !== -1) {
            const item = this.temporaryItems[index];
            this.temporaryItems.splice(index, 1);
            return item;
        }
        return null;
    }

    // 按点数排序手牌（从右到左从小到大，即大牌在左，小牌在右）
    sortByRank() {
        this.handCards.sort((a, b) => {
            // 先按点数排序（降序，大牌在前）
            if (a.value !== b.value) {
                return b.value - a.value;
            }
            // 点数相同时按花色排序（降序）
            const suitOrder = { 'hearts': 1, 'diamonds': 2, 'clubs': 3, 'spades': 4, 'joker': 5 };
            return (suitOrder[b.suit] || 0) - (suitOrder[a.suit] || 0);
        });
    }

    // 按花色排序手牌
    sortBySuit() {
        this.handCards.sort((a, b) => {
            // 先按花色排序
            const suitOrder = { 'hearts': 1, 'diamonds': 2, 'clubs': 3, 'spades': 4, 'joker': 5 };
            const suitCompare = (suitOrder[a.suit] || 0) - (suitOrder[b.suit] || 0);
            if (suitCompare !== 0) {
                return suitCompare;
            }
            // 花色相同时按点数排序
            return a.value - b.value;
        });
    }

    // 行动点系统方法
    canPlayPattern(patternName) {
        const cost = this.getPatternCost(patternName);
        return this.actionPoints >= cost;
    }

    getPatternCost(patternName) {
        let cost = this.actionPointCosts[patternName] || 1;

        // Boss规则：混乱法师 - 交换两种牌型的消耗
        if (this.isBossLevel && this.bossRule === 'chaosMage') {
            const swapped = this.bossRuleData.swappedPatterns;
            if (swapped && swapped.length === 2) {
                if (patternName === swapped[0]) {
                    cost = this.actionPointCosts[swapped[1]] || 1;
                } else if (patternName === swapped[1]) {
                    cost = this.actionPointCosts[swapped[0]] || 1;
                }
            }
        }

        // 特质：精准打击 - 单牌消耗固定为1点
        if (this.currentTrait && this.currentTrait.id === 'precision_strike' && patternName === 'SINGLE') {
            cost = 1;
        }
        // 单牌差异化消耗：首张2点,后续1.5点（精准打击特质会覆盖此规则）
        else if (patternName === 'SINGLE') {
            cost = this.singlePlayedThisRound === 0 ? 2 : 1.5;
        }

        // 特质：炸弹专家 - 炸弹消耗+2
        if (this.currentTrait && this.currentTrait.id === 'bomb_expert' && patternName === 'BOMB') {
            cost += 2;
        }

        // 特质：顺子大师 - 顺子消耗-1，对子消耗+1
        if (this.currentTrait && this.currentTrait.id === 'straight_master') {
            if (patternName === 'STRAIGHT') {
                cost = Math.max(1, cost - 1);
            } else if (patternName === 'PAIR') {
                cost += 1;
            }
        }

        // 节能模式：所有牌型消耗减半(向上取整)
        if (this.energySaverActive) {
            cost = Math.ceil(cost / 2);
        }

        // 背水一战:手牌>20张时所有牌型消耗-1(最低1点)
        if (this.backwaterBattleActive && this.handCards.length > 20) {
            cost = Math.max(1, cost - 1);
        }

        // 消耗加倍特殊规则
        if (this.specialRule === 'doubleCost' &&
            this.specialRuleData &&
            this.specialRuleData.pattern === patternName) {
            cost *= 2;
        }

        // 负面规则：消耗递增 - 同一回合内每多出一手该牌型，消耗+1
        if (this.negativeRule === 'costIncrease') {
            const playCount = this.patternPlayCount[patternName] || 0;
            cost += playCount;
        }

        return cost;
    }

    deductActionPoints(patternName) {
        const cost = this.getPatternCost(patternName);
        this.actionPoints -= cost;
        return cost;
    }

    resetActionPoints() {
        // 应用行动点惩罚
        if (this.actionPenaltyNextRound > 0) {
            // 如果有惩罚,设置为最大值减去惩罚（最低不能低于1点）
            this.actionPoints = Math.max(1, this.maxActionPoints - this.actionPenaltyNextRound);
            this.actionPenaltyNextRound = 0;
        } else {
            // 如果没有惩罚,重置为最大行动点
            this.actionPoints = this.maxActionPoints;
        }
    }

    // 弃牌并抽牌
    discardAndDraw(selectedCards) {
        // Boss规则：压力测试者 - 无法弃牌
        if (this.isBossLevel && this.bossRule === 'pressureTester') {
            return { success: false, message: 'Boss规则：压力测试者禁止弃牌!' };
        }

        // 验证：手牌数量限制
        if (this.handCards.length <= 5) {
            return { success: false, message: '手牌数不足，无法弃牌！（需要至少6张手牌）' };
        }

        // 验证：选择的牌数量（改为1-5张）
        if (selectedCards.length === 0 || selectedCards.length > 5) {
            return { success: false, message: '请选择1-5张牌进行弃牌!' };
        }

        // 天赋：二手准备 - 每关第一次弃牌不消耗弃牌点
        let actualDiscardCost = this.currentDiscardCost;
        if (this.purchasedTalents && this.purchasedTalents.includes('secondhand_prep') && !this.firstDiscardUsedThisLevel) {
            actualDiscardCost = 0;
        }

        // 验证：弃牌点是否足够（使用当前动态消耗）
        if (this.discardPoints < actualDiscardCost) {
            return { success: false, message: `弃牌点不足!本次弃牌需要${actualDiscardCost}点` };
        }

        // 计算实际抽牌数（包括额外抽牌奖励）
        let drawCount = selectedCards.length + this.discardDrawBonus + (this.permanentDiscardDrawBonus || 0);

        // 特质：资源回收 - 每次弃牌的默认抽牌数减少1张
        if (this.currentTrait && this.currentTrait.id === 'resource_recycling') {
            drawCount = Math.max(0, drawCount - 1);
        }

        // 验证：牌堆剩余牌数
        if (this.deckCards.length < drawCount) {
            return { success: false, message: '牌堆剩余牌数不足!' };
        }

        // 扣除弃牌点（使用实际消耗，考虑二手准备天赋）
        this.discardPoints -= actualDiscardCost;

        // 标记本关已使用过第一次弃牌（用于二手准备天赋）
        if (!this.firstDiscardUsedThisLevel) {
            this.firstDiscardUsedThisLevel = true;
        }

        // 标记本回合已使用弃牌（用于以逸待劳特质）
        this.discardUsedThisRoundForTrait = true;

        // 负面规则：点数税 - 弃牌时需额外弃掉一张相同点数的牌，否则扣20分
        if (this.negativeRule === 'rankTax') {
            const discardedRanks = selectedCards.map(card => card.rank);
            const uniqueRanks = [...new Set(discardedRanks)];

            // 检查手牌中是否有与弃牌相同点数的牌（排除已选中的牌）
            let taxPaid = false;
            for (const rank of uniqueRanks) {
                const matchingCard = this.handCards.find(card =>
                    card.rank === rank && !selectedCards.includes(card)
                );
                if (matchingCard) {
                    // 找到匹配的牌，额外弃掉
                    const index = this.handCards.indexOf(matchingCard);
                    if (index !== -1) {
                        this.handCards.splice(index, 1);
                        taxPaid = true;
                        break; // 只需要弃掉一张
                    }
                }
            }

            // 如果没有找到匹配的牌，扣除20积分
            if (!taxPaid) {
                this.score = Math.max(0, this.score - 20);
                this.levelScore = Math.max(0, this.levelScore - 20);
            }
        }

        // 移除选中的牌
        selectedCards.forEach(card => {
            const index = this.handCards.indexOf(card);
            if (index !== -1) {
                this.handCards.splice(index, 1);
            }
        });

        // 抽取新牌
        const drawnCards = this.drawCards(drawCount);

        // 如果有额外机会则消耗额外机会
        if (this.extraDiscardAvailable) {
            this.extraDiscardAvailable = false;
        }

        // 去粗取精道具：每弃一张牌获得积分
        if (this.discardScorePerCard && this.discardScorePerCard > 0) {
            this.score += selectedCards.length * this.discardScorePerCard;
        }

        // 特质：资源回收 - 弃牌时每弃1张牌获得2金币
        let coinsGained = 0;
        if (this.currentTrait && this.currentTrait.id === 'resource_recycling') {
            coinsGained = selectedCards.length * 2;
            this.coins += coinsGained;
        }

        // 重置弃牌抽奖奖励
        this.discardDrawBonus = 0;

        // 递增下次弃牌消耗
        this.discardUsedThisRound++;
        this.currentDiscardCost = this.discardPointCost + this.discardUsedThisRound;

        let message = `弃掉${selectedCards.length}张牌，抽取${drawnCards.length}张新牌! 下次弃牌需${this.currentDiscardCost}点`;
        if (coinsGained > 0) {
            message += `\n资源回收: 获得${coinsGained}金币!`;
        }

        return {
            success: true,
            message: message,
            drawnCards
        };
    }

    // ===== 特殊规则系统方法 =====

    // 开始限时计时
    startTurnTimer() {
        this.turnStartTime = Date.now();
        // 重置暂停相关状态
        this.turnTimerPaused = false;
        this.turnPauseStartTime = null;
        this.turnTotalPausedTime = 0;
    }

    // 停止计时器
    stopTurnTimer() {
        this.turnStartTime = null;
        this.turnTimerPaused = false;
        this.turnPauseStartTime = null;
        this.turnTotalPausedTime = 0;
    }

    // 暂停倒计时（打开商店或特质选择界面时调用）
    pauseTurnTimer() {
        if (this.specialRule !== 'timeLimit' || !this.turnStartTime || this.turnTimerPaused) {
            return;
        }
        this.turnTimerPaused = true;
        this.turnPauseStartTime = Date.now();
    }

    // 恢复倒计时（关闭商店或特质选择界面时调用）
    resumeTurnTimer() {
        if (this.specialRule !== 'timeLimit' || !this.turnStartTime || !this.turnTimerPaused) {
            return;
        }
        // 累计本次暂停的时间
        if (this.turnPauseStartTime) {
            this.turnTotalPausedTime += (Date.now() - this.turnPauseStartTime);
        }
        this.turnTimerPaused = false;
        this.turnPauseStartTime = null;
    }

    // 获取剩余时间(秒)
    getRemainingTime() {
        if (!this.turnStartTime) return this.turnTimeLimit;

        // 计算实际经过的时间，需要减去暂停时间
        let totalElapsed = Date.now() - this.turnStartTime;

        // 如果当前正在暂停，计算当前暂停时长
        if (this.turnTimerPaused && this.turnPauseStartTime) {
            const currentPauseDuration = Date.now() - this.turnPauseStartTime;
            totalElapsed -= (this.turnTotalPausedTime + currentPauseDuration);
        } else {
            // 如果没有暂停，减去之前累计的暂停时间
            totalElapsed -= this.turnTotalPausedTime;
        }

        const elapsed = Math.floor(totalElapsed / 1000);
        return Math.max(0, this.turnTimeLimit - elapsed);
    }

    // 检查是否超时
    checkTurnTimeout() {
        if (this.specialRule !== 'timeLimit' || !this.turnStartTime) {
            return false;
        }
        return this.getRemainingTime() <= 0;
    }

    // 处理超时
    handleTimeout() {
        // 扣除积分: 剩余手牌数 × 5
        const penalty = this.handCards.length * 5;
        this.score = Math.max(0, this.score - penalty);

        // 停止计时器
        this.stopTurnTimer();

        // 自动结束回合
        this.endRound();

        return penalty;
    }

    // 应用Boss关奖励
    applyBossReward() {
        if (!this.bossRewardPending || !this.bossRule) {
            return null;
        }

        let rewardMessage = '';

        switch (this.bossRule) {
            case 'perfectionist':
                // 完美主义者：本局游戏剩余所有关卡，积分获取永久+20%
                this.bossRuleData.permanentScoreBonus = 0.2;
                rewardMessage = 'Boss奖励：本局游戏积分获取+20%！';
                break;

            case 'orderGuardian':
                // 秩序守护者：立即获得2点永久额外行动点（仅本局游戏生效）
                this.permanentActionBonus += 2;
                rewardMessage = 'Boss奖励：永久行动点+2（本局游戏）！';
                break;

            case 'chaosMage':
                // 混乱法师：随机获得两个商店道具（免费）
                rewardMessage = 'Boss奖励：随机获得2个商店道具！';
                // 这个奖励需要在UI层面处理，返回特殊标记
                this.bossRuleData.freeItemsReward = 2;
                break;

            case 'pressureTester':
                // 压力测试者：本局游戏剩余所有关卡，每回合行动点+1
                this.bossRuleData.permanentActionBonus = 1;
                rewardMessage = 'Boss奖励：本局游戏每回合行动点+1！';
                break;

            case 'sacrificer':
                // 献祭者：永久获得弃牌点上限+2
                this.maxDiscardPoints += 2;
                rewardMessage = 'Boss奖励：弃牌点上限永久+2！';
                break;
        }

        this.bossRewardPending = false;
        return rewardMessage;
    }
}
