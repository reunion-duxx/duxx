// 音效管理系统 - 使用Web Audio API生成8bit复古风格音效

class AudioManager {
    constructor() {
        try {
            this.context = new (window.AudioContext || window.webkitAudioContext)();
            this.enabled = true;
        } catch (e) {
            console.warn('Web Audio API 不支持', e);
            this.enabled = false;
        }
    }

    // 播放8bit音效
    playTone(frequency, duration, type = 'square') {
        if (!this.enabled || !this.context) return;

        try {
            const oscillator = this.context.createOscillator();
            const gainNode = this.context.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(this.context.destination);

            oscillator.type = type; // 'square', 'sine', 'triangle', 'sawtooth'
            oscillator.frequency.value = frequency;

            // 音量衰减,避免爆音
            gainNode.gain.setValueAtTime(0.3, this.context.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, this.context.currentTime + duration);

            oscillator.start(this.context.currentTime);
            oscillator.stop(this.context.currentTime + duration);
        } catch (e) {
            console.error('播放音效失败', e);
        }
    }

    // 选牌音效 (短促的哔声)
    playCardSelect() {
        this.playTone(440, 0.05);
    }

    // 出牌音效 (上升音调)
    playCardPlay() {
        this.playTone(523, 0.1);
        setTimeout(() => this.playTone(659, 0.1), 100);
    }

    // 得分音效 (叮铃声)
    playScore() {
        this.playTone(880, 0.15, 'sine');
    }

    // Combo音效 (和弦音,根据连击等级递增，音效加快变强)
    playCombo(comboLevel) {
        const frequencies = [523, 659, 784, 1047]; // C5, E5, G5, C6
        const index = Math.min(Math.floor((comboLevel - 1) / 0.5), 3);
        const freq = frequencies[index];

        // 连击越高，音效越快越强
        const duration = Math.max(0.1, 0.25 - comboLevel * 0.02); // 随连击数减少持续时间
        const volume = Math.min(0.5, 0.3 + comboLevel * 0.05); // 随连击数增加音量

        this.playToneWithVolume(freq, duration, volume);

        // 高连击时播放额外音符
        if (comboLevel >= 1.6) {
            setTimeout(() => this.playToneWithVolume(freq * 1.2, duration * 0.8, volume * 0.8), duration * 500);
        }
    }

    // 播放指定音量的音效
    playToneWithVolume(frequency, duration, volume, type = 'square') {
        if (!this.enabled || !this.context) return;

        try {
            const oscillator = this.context.createOscillator();
            const gainNode = this.context.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(this.context.destination);

            oscillator.type = type;
            oscillator.frequency.value = frequency;

            // 使用指定音量
            gainNode.gain.setValueAtTime(volume, this.context.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, this.context.currentTime + duration);

            oscillator.start(this.context.currentTime);
            oscillator.stop(this.context.currentTime + duration);
        } catch (e) {
            console.error('播放音效失败', e);
        }
    }

    // 顺子音效 (上升音阶)
    playStraight() {
        const notes = [523, 587, 659, 740, 831]; // C5-G5音阶
        notes.forEach((freq, i) => {
            setTimeout(() => this.playTone(freq, 0.08, 'sine'), i * 50);
        });
    }

    // 连对音效 (双音符)
    playDoubleStraight() {
        const notes = [523, 659, 784]; // 和弦音
        notes.forEach((freq, i) => {
            setTimeout(() => {
                this.playTone(freq, 0.12, 'triangle');
                this.playTone(freq * 1.5, 0.12, 'triangle');
            }, i * 80);
        });
    }

    // 飞机音效 (飞行声)
    playAirplane() {
        // 模拟飞机飞过的声音
        this.playTone(400, 0.15, 'sawtooth');
        setTimeout(() => this.playTone(600, 0.15, 'sawtooth'), 100);
        setTimeout(() => this.playTone(800, 0.2, 'sawtooth'), 200);
    }

    // 三张音效 (三连音)
    playTriple() {
        const freq = 659; // E5
        for (let i = 0; i < 3; i++) {
            setTimeout(() => this.playTone(freq, 0.08), i * 60);
        }
    }

    // 回合结束音效 (鼓声)
    playRoundEnd() {
        this.playTone(220, 0.3, 'triangle');
    }

    // 胜利音效 (胜利旋律)
    playWin() {
        this.playTone(523, 0.2);
        setTimeout(() => this.playTone(659, 0.2), 150);
        setTimeout(() => this.playTone(784, 0.2), 300);
        setTimeout(() => this.playTone(1047, 0.4), 450);
    }

    // 失败音效 (下降音调)
    playLose() {
        this.playTone(440, 0.2);
        setTimeout(() => this.playTone(349, 0.2), 150);
        setTimeout(() => this.playTone(294, 0.4), 300);
    }

    // 购买音效 (金币声)
    playPurchase() {
        this.playTone(1047, 0.1, 'sine');
        setTimeout(() => this.playTone(1319, 0.1, 'sine'), 80);
    }

    // 按钮点击音效
    playButtonClick() {
        this.playTone(330, 0.08);
    }

    // 开关音效
    toggle() {
        this.enabled = !this.enabled;
        return this.enabled;
    }

    // 炸弹音效 (爆炸声)
    playBomb() {
        // 低频爆炸声
        this.playTone(80, 0.15, 'sawtooth');
        setTimeout(() => this.playTone(60, 0.2, 'sawtooth'), 50);
        setTimeout(() => this.playTone(40, 0.25, 'sawtooth'), 100);
    }

    // 火箭音效 (发射声)
    playRocket() {
        // 上升音调模拟火箭发射
        this.playTone(200, 0.1, 'sawtooth');
        setTimeout(() => this.playTone(400, 0.1, 'sawtooth'), 80);
        setTimeout(() => this.playTone(800, 0.15, 'sawtooth'), 160);
        setTimeout(() => this.playTone(1200, 0.2, 'sine'), 240);
    }

    // 检查是否启用
    isEnabled() {
        return this.enabled;
    }
}
