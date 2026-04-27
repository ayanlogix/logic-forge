document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('logicCanvas');
    const ctx = canvas.getContext('2d');
    const ruleList = document.getElementById('ruleList');
    const deductionLog = document.getElementById('deductionLog');
    const confidenceDisplay = document.getElementById('confidenceDisplay');
    const predictionValue = document.getElementById('predictionValue');
    const runInferenceBtn = document.getElementById('runInferenceBtn');
    const resetBtn = document.getElementById('resetBtn');

    // 1. Symbolic State
    let tree = {
        label: "Market_Index",
        type: "input",
        x: 0, y: 0,
        children: [
            {
                label: "Volume > 4k",
                type: "logic",
                rule: "IF Vol > 4000 THEN HIGH_MOMENTUM",
                children: [
                    { label: "BULLISH", type: "leaf", confidence: 94 },
                    { label: "RETRACEMENT", type: "leaf", confidence: 62 }
                ]
            },
            {
                label: "Vol < 4k",
                type: "logic",
                rule: "IF Vol < 4000 THEN STAGNANT",
                children: [
                    { label: "SIDEWAYS", type: "leaf", confidence: 88 },
                    { label: "BEARISH", type: "leaf", confidence: 71 }
                ]
            }
        ]
    };

    let activePath = [];
    let pulses = [];
    let isRunning = false;

    class LogicPulse {
        constructor(path) {
            this.path = path; // Array of points
            this.progress = 0;
            this.speed = 0.02;
            this.history = [];
        }

        update() {
            this.progress += this.speed;
            const index = Math.floor(this.progress * (this.path.length - 1));
            const p1 = this.path[index];
            const p2 = this.path[index + 1];
            
            if (p1 && p2) {
                this.x = p1.x + (p2.x - p1.x) * ((this.progress * (this.path.length - 1)) % 1);
                this.y = p1.y + (p2.y - p1.y) * ((this.progress * (this.path.length - 1)) % 1);
                this.history.unshift({x: this.x, y: this.y});
                if (this.history.length > 20) this.history.pop();
            }
            
            return this.progress < 1;
        }

        draw(ctx) {
            ctx.globalCompositeOperation = 'lighter';
            this.history.forEach((p, i) => {
                const alpha = (1 - i / this.history.length) * 0.8;
                ctx.beginPath();
                ctx.arc(p.x, p.y, 3 * (1 - i/20), 0, Math.PI * 2);
                ctx.fillStyle = `rgba(16, 185, 129, ${alpha})`;
                ctx.fill();
            });
            ctx.globalCompositeOperation = 'source-over';
        }
    }

    // 2. Rendering Engine
    const layoutTree = (node, x, y, level, spacing) => {
        node.x = x;
        node.y = y;
        if (node.children) {
            const childCount = node.children.length;
            node.children.forEach((child, i) => {
                const nx = x + 180;
                const ny = y + (i - (childCount - 1) / 2) * spacing;
                layoutTree(child, nx, ny, level + 1, spacing / 1.5);
            });
        }
    };

    const drawLine = (x1, y1, x2, y2, active = false) => {
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.strokeStyle = active ? '#10b981' : 'rgba(255, 255, 255, 0.15)';
        ctx.lineWidth = active ? 3 : 1;
        ctx.stroke();
    };

    const render = () => {
        const container = canvas.parentElement;
        if (!container) return;
        
        canvas.width = container.clientWidth;
        canvas.height = container.clientHeight;
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        layoutTree(tree, 120, canvas.height / 2, 0, canvas.height * 0.6);

        // Draw In-Between Connections
        const drawConnections = (node) => {
            if (node.children) {
                node.children.forEach(child => {
                    const isActive = activePath.includes(node) && activePath.includes(child);
                    drawLine(node.x, node.y, child.x, child.y, isActive);
                    drawConnections(child);
                });
            }
        };
        drawConnections(tree);

        // Draw Pulses
        pulses = pulses.filter(p => {
            const alive = p.update();
            if (alive) p.draw(ctx);
            return alive;
        });

        // Draw Nodes
        const drawNodes = (node) => {
            ctx.beginPath();
            ctx.arc(node.x, node.y, 8, 0, Math.PI * 2);
            ctx.fillStyle = '#020617';
            ctx.strokeStyle = activePath.includes(node) ? '#10b981' : '#334155';
            ctx.lineWidth = 2;
            ctx.fill();
            ctx.stroke();

            ctx.fillStyle = '#fff';
            ctx.font = '600 10px IBM Plex Mono';
            ctx.textAlign = 'center';
            ctx.fillText(node.label, node.x, node.y - 15);

            if (node.children) node.children.forEach(drawNodes);
        };
        drawNodes(tree);

        requestAnimationFrame(render);
    };

    // 3. Deduction Logic
    const addLog = (text, type = 'process') => {
        const entry = document.createElement('div');
        entry.className = `log-entry ${type}`;
        entry.innerText = `[${new Date().toLocaleTimeString()}] ${text}`;
        deductionLog.appendChild(entry);
        deductionLog.scrollTop = deductionLog.scrollHeight;
    };

    const runInference = () => {
        if (isRunning) return;
        isRunning = true;
        activePath = [tree];
        pulses = [];
        addLog('Inference initialized. Reading Root: Market_Index', 'system');
        
        // Simulating logic path
        let current = tree;
        const path = [tree];
        const step = (node) => {
            if (!node.children) {
                addLog(`Deduction finalized: ${node.label}`, 'system');
                confidenceDisplay.innerText = `Confidence: ${node.confidence}%`;
                predictionValue.innerText = node.label;
                isRunning = false;
                return;
            }
            
            setTimeout(() => {
                const next = node.children[Math.floor(Math.random() * node.children.length)];
                addLog(`Evaluating Rule: ${next.label || next.rule}`, 'process');
                
                // Highlight corresponding rule in sidebar
                const ruleCards = document.querySelectorAll('.rule-card');
                ruleCards.forEach(c => c.classList.remove('active'));
                const randomCard = ruleCards[Math.floor(Math.random() * ruleCards.length)];
                if (randomCard) randomCard.classList.add('active');

                // Spawn Pulse
                pulses.push(new LogicPulse([{x: node.x, y: node.y}, {x: next.x, y: next.y}]));
                
                activePath.push(next);
                step(next);
            }, 800);
        };
        
        step(current);
    };

    // 4. Interface Updates
    const updateRules = () => {
        const rules = [
            "IF Market_Index == HIGH THEN PROCEED",
            "IF Volume > 4000 THEN HIGH_MOMENTUM",
            "IF Momentum == HIGH THEN BULLISH",
            "IF Confidence < 70% THEN AUDIT_REQUIRED"
        ];
        ruleList.innerHTML = rules.map(r => `
            <div class="rule-card">
                <span class="gate">FORGE:</span> ${r}
            </div>
        `).join('');
    };

    // 5. Global Actions
    runInferenceBtn.addEventListener('click', runInference);
    resetBtn.addEventListener('click', () => {
        activePath = [];
        pulses = [];
        predictionValue.innerText = 'PENDING';
        confidenceDisplay.innerText = 'Confidence: --%';
        addLog('Logic space reset.', 'system');
    });

    window.addEventListener('resize', render);
    updateRules();
    requestAnimationFrame(render);
});
