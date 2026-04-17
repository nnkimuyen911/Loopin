(function () {
    const STYLE_ID = 'loopin-pet-buddy-style';

    function ensureStyles() {
        if (document.getElementById(STYLE_ID)) return;

        const style = document.createElement('style');
        style.id = STYLE_ID;
        style.textContent = `
            .lb-pet-buddy {
                --lb-jump-height: -42px;
                position: relative;
                display: block;
                width: 88px;
                height: 104px;
                margin: 0 auto;
                transform-origin: center bottom;
                filter: drop-shadow(0 10px 18px rgba(255, 184, 184, 0.45));
            }

            .lb-size-widget.lb-pet-buddy {
                width: 58px;
                height: 72px;
                filter: drop-shadow(0 7px 12px rgba(255, 184, 184, 0.35));
            }

            .lb-stage-egg {
                animation: lbFloatEgg 2.6s ease-in-out infinite;
            }

            .lb-stage-chick,
            .lb-stage-chicken,
            .lb-stage-rooster {
                animation: lbChickIdle 1.8s ease-in-out infinite, lbLookAround 4.2s ease-in-out infinite;
            }

            .lb-stage-chicken,
            .lb-stage-rooster {
                animation-duration: 1.35s, 3.2s;
            }

            .lb-egg {
                position: absolute;
                inset: 0;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 66px;
                line-height: 1;
                user-select: none;
            }

            .lb-size-widget .lb-egg {
                font-size: 46px;
            }

            .lb-body {
                width: 76px;
                height: 76px;
                border-radius: 50%;
                background: radial-gradient(circle at 30% 30%, #fff3a0, #ffb347, #ff8c42);
                position: absolute;
                top: 10px;
                left: 6px;
            }

            .lb-size-widget .lb-body {
                width: 50px;
                height: 50px;
                top: 8px;
                left: 4px;
            }

            .lb-wing {
                width: 26px;
                height: 20px;
                background: #ffc76a;
                border-radius: 50%;
                position: absolute;
                top: 38px;
                animation: lbWingFlap 0.6s ease-in-out infinite;
            }

            .lb-size-widget .lb-wing {
                width: 18px;
                height: 13px;
                top: 28px;
            }

            .lb-wing.left {
                left: -8px;
                transform-origin: right center;
            }

            .lb-wing.right {
                right: -8px;
                transform-origin: left center;
                animation-delay: 0.08s;
            }

            .lb-stage-chicken .lb-wing,
            .lb-stage-rooster .lb-wing {
                animation-duration: 0.45s;
            }

            .lb-eye {
                width: 6px;
                height: 6px;
                background: #2f2f2f;
                border-radius: 50%;
                position: absolute;
                top: 33px;
                animation: lbBlink 4s infinite;
            }

            .lb-size-widget .lb-eye {
                width: 4px;
                height: 4px;
                top: 24px;
            }

            .lb-eye.left { left: 24px; }
            .lb-eye.right { right: 24px; }

            .lb-size-widget .lb-eye.left { left: 16px; }
            .lb-size-widget .lb-eye.right { right: 16px; }

            .lb-beak {
                width: 12px;
                height: 9px;
                background: #ff8c42;
                border-radius: 999px;
                position: absolute;
                top: 44px;
                left: 50%;
                transform: translateX(-50%);
            }

            .lb-size-widget .lb-beak {
                width: 9px;
                height: 7px;
                top: 32px;
            }

            .lb-feet {
                position: absolute;
                bottom: 2px;
                width: 100%;
            }

            .lb-foot {
                width: 16px;
                height: 4px;
                background: #ff8c42;
                border-radius: 10px;
                position: absolute;
            }

            .lb-size-widget .lb-foot {
                width: 10px;
                height: 3px;
            }

            .lb-foot.left {
                left: 16px;
                animation: lbWalkLeft 0.5s infinite;
            }

            .lb-foot.right {
                right: 16px;
                animation: lbWalkRight 0.5s infinite;
            }

            .lb-size-widget .lb-foot.left { left: 12px; }
            .lb-size-widget .lb-foot.right { right: 12px; }

            .lb-stage-egg .lb-wing,
            .lb-stage-egg .lb-feet,
            .lb-stage-egg .lb-eye,
            .lb-stage-egg .lb-beak,
            .lb-stage-egg .lb-body {
                display: none;
            }

            .lb-has-aura::before {
                content: '';
                position: absolute;
                inset: -10px;
                border-radius: 50%;
                background: radial-gradient(circle, rgba(255, 150, 66, 0.58), transparent 70%);
                filter: blur(9px);
                animation: lbAuraPulse 1.2s ease-in-out infinite;
                z-index: -1;
            }

            .lb-jump {
                animation: lbJumpPhysics 0.62s cubic-bezier(0.3, 0.7, 0.4, 1) !important;
            }

            .lb-jump .lb-wing {
                animation-duration: 0.2s;
            }

            .lb-accessory-layer {
                position: absolute;
                inset: 0;
                pointer-events: none;
                z-index: 4;
            }

            .lb-acc-item {
                position: absolute;
                line-height: 1;
                user-select: none;
            }

            .lb-acc-hat-soft-cap {
                top: -2px;
                left: 50%;
                transform: translateX(-50%);
                font-size: 28px;
            }

            .lb-acc-hat-top-hat {
                top: -7px;
                left: 50%;
                transform: translateX(-50%);
                font-size: 30px;
            }

            .lb-acc-hat-crown {
                top: -9px;
                left: 50%;
                transform: translateX(-50%);
                font-size: 26px;
                filter: drop-shadow(0 2px 4px rgba(255, 210, 80, 0.45));
            }

            .lb-acc-hair-fluffy {
                top: 7px;
                left: 50%;
                transform: translateX(-50%);
                font-size: 23px;
            }

            .lb-acc-hair-curly {
                top: 6px;
                left: 50%;
                transform: translateX(-50%);
                font-size: 20px;
            }

            .lb-acc-glasses-round {
                top: 24px;
                left: 50%;
                transform: translateX(-50%);
                font-size: 20px;
            }

            .lb-acc-glasses-cool {
                top: 24px;
                left: 50%;
                transform: translateX(-50%);
                font-size: 21px;
            }

            .lb-acc-face-blush {
                top: 38px;
                left: 50%;
                transform: translateX(-50%);
                font-size: 16px;
            }

            .lb-acc-face-star {
                top: 38px;
                left: 50%;
                transform: translateX(-50%);
                font-size: 16px;
            }

            .lb-size-widget .lb-acc-hat-soft-cap { font-size: 20px; top: -1px; }
            .lb-size-widget .lb-acc-hat-top-hat { font-size: 21px; top: -5px; }
            .lb-size-widget .lb-acc-hat-crown { font-size: 18px; top: -6px; }
            .lb-size-widget .lb-acc-hair-fluffy { font-size: 16px; top: 7px; }
            .lb-size-widget .lb-acc-hair-curly { font-size: 15px; top: 7px; }
            .lb-size-widget .lb-acc-glasses-round { font-size: 14px; top: 18px; }
            .lb-size-widget .lb-acc-glasses-cool { font-size: 14px; top: 18px; }
            .lb-size-widget .lb-acc-face-blush { font-size: 12px; top: 28px; }
            .lb-size-widget .lb-acc-face-star { font-size: 12px; top: 28px; }

            @keyframes lbFloatEgg {
                0%, 100% { transform: translateY(0); }
                50% { transform: translateY(-5px); }
            }

            @keyframes lbChickIdle {
                0%, 100% { transform: translateY(0); }
                50% { transform: translateY(-7px); }
            }

            @keyframes lbLookAround {
                0%, 100% { transform: translateX(0); }
                25% { transform: translateX(-2px); }
                75% { transform: translateX(2px); }
            }

            @keyframes lbWingFlap {
                0%, 100% { transform: rotate(0deg); }
                50% { transform: rotate(24deg); }
            }

            @keyframes lbWalkLeft {
                0%, 100% { transform: translateY(0); }
                50% { transform: translateY(-4px); }
            }

            @keyframes lbWalkRight {
                0%, 100% { transform: translateY(-4px); }
                50% { transform: translateY(0); }
            }

            @keyframes lbBlink {
                0%, 95%, 100% { transform: scaleY(1); }
                97% { transform: scaleY(0.1); }
            }

            @keyframes lbAuraPulse {
                0%, 100% { transform: scale(1); opacity: 0.65; }
                50% { transform: scale(1.18); opacity: 1; }
            }

            @keyframes lbJumpPhysics {
                0% { transform: translateY(0); }
                30% { transform: translateY(var(--lb-jump-height, -42px)); }
                60% { transform: translateY(calc(var(--lb-jump-height, -42px) * 0.45)); }
                85% { transform: translateY(2px); }
                100% { transform: translateY(0); }
            }
        `;

        document.head.appendChild(style);
    }

    function resolveStage(level) {
        const lv = Number(level) || 1;
        if (lv >= 20) return 'rooster';
        if (lv >= 10) return 'chicken';
        if (lv >= 3) return 'chick';
        return 'egg';
    }

    function stageLabel(stage) {
        if (stage === 'rooster') return 'Golden Rooster';
        if (stage === 'chicken') return 'Chicken';
        if (stage === 'chick') return 'Little Chick';
        return 'Egg';
    }

    function stageEmoji(stage) {
        if (stage === 'rooster') return '🐓';
        if (stage === 'chicken') return '🐔';
        if (stage === 'chick') return '🐥';
        return '🥚';
    }

    function getState(level, xp) {
        const safeLevel = Math.max(1, Number(level) || 1);
        const safeXp = Math.max(0, Number(xp) || 0);
        const xpNeeded = safeLevel * 100;
        const xpPercent = xpNeeded > 0 ? Math.max(0, Math.min((safeXp / xpNeeded) * 100, 100)) : 0;
        const stage = resolveStage(safeLevel);

        return {
            level: safeLevel,
            xp: safeXp,
            xpNeeded,
            xpPercent,
            stage,
            stageLabel: stageLabel(stage),
            emoji: stageEmoji(stage),
            canFlap: stage !== 'egg',
            hasAura: stage === 'chicken' || stage === 'rooster'
        };
    }

    function createDom(state, size) {
        const root = document.createElement('div');
        root.className = `lb-pet-buddy lb-stage-${state.stage} ${size === 'widget' ? 'lb-size-widget' : 'lb-size-profile'} ${state.hasAura ? 'lb-has-aura' : ''}`;
        root.setAttribute('data-stage', state.stage);
        root.setAttribute('aria-label', `Pet Buddy ${state.stageLabel}`);
        root.setAttribute('role', 'img');

        if (state.stage === 'egg') {
            const egg = document.createElement('div');
            egg.className = 'lb-egg';
            egg.textContent = state.emoji;
            root.appendChild(egg);
            return root;
        }

        root.innerHTML = `
            <div class="lb-body"></div>
            <div class="lb-wing left"></div>
            <div class="lb-wing right"></div>
            <div class="lb-eye left"></div>
            <div class="lb-eye right"></div>
            <div class="lb-beak"></div>
            <div class="lb-feet">
                <div class="lb-foot left"></div>
                <div class="lb-foot right"></div>
            </div>
        `;

        return root;
    }

    function normalizeAccessories(accessories) {
        return {
            hat: accessories && accessories.hat ? String(accessories.hat) : 'none',
            hair: accessories && accessories.hair ? String(accessories.hair) : 'none',
            glasses: accessories && accessories.glasses ? String(accessories.glasses) : 'none',
            face: accessories && accessories.face ? String(accessories.face) : 'none'
        };
    }

    function applyAccessories(root, state, accessories) {
        if (!root || !state || state.stage === 'egg') return;

        const acc = normalizeAccessories(accessories);
        const layer = document.createElement('div');
        layer.className = 'lb-accessory-layer';

        const definitions = {
            hat: {
                'soft-cap': '🧢',
                'top-hat': '🎩',
                crown: '👑'
            },
            hair: {
                fluffy: '🪶',
                curly: '〰️'
            },
            glasses: {
                round: '👓',
                cool: '🕶️'
            },
            face: {
                blush: '😊',
                star: '🤩'
            }
        };

        Object.keys(definitions).forEach(function (category) {
            const value = acc[category];
            if (!value || value === 'none' || !definitions[category][value]) return;

            const item = document.createElement('span');
            item.className = `lb-acc-item lb-acc-${category}-${value}`;
            item.textContent = definitions[category][value];
            layer.appendChild(item);
        });

        if (layer.children.length > 0) {
            root.appendChild(layer);
        }
    }

    function apply(container, level, xp, options) {
        if (!container) return null;
        const opts = options || {};
        const size = opts.size === 'widget' ? 'widget' : 'profile';
        const state = getState(level, xp);

        ensureStyles();

        container.innerHTML = '';
        const node = createDom(state, size);
        applyAccessories(node, state, opts.accessories);
        container.appendChild(node);
        return state;
    }

    function jump(container, xpPercent) {
        if (!container) return;
        const buddy = container.querySelector('.lb-pet-buddy');
        if (!buddy) return;

        const percent = Math.max(0, Math.min(Number(xpPercent) || 0, 100));
        const jumpHeight = Math.max(24, Math.min(78, 28 + (percent * 0.5)));

        buddy.style.setProperty('--lb-jump-height', `-${jumpHeight}px`);
        buddy.classList.remove('lb-jump');
        void buddy.offsetWidth;
        buddy.classList.add('lb-jump');

        setTimeout(function () {
            buddy.classList.remove('lb-jump');
        }, 620);
    }

    function PetBuddy(level, xp, options) {
        return {
            state: getState(level, xp),
            node: createDom(getState(level, xp), options && options.size === 'widget' ? 'widget' : 'profile')
        };
    }

    PetBuddy.ensureStyles = ensureStyles;
    PetBuddy.getState = getState;
    PetBuddy.apply = apply;
    PetBuddy.jump = jump;

    window.PetBuddy = PetBuddy;
})();
