/**
 * aostar.js - AO* Algorithm AND-OR Graph Visualization
 * Smart Game Strategy System
 */

// ── Problem Definitions ──
const PROBLEMS = {
    travel: {
        name: 'Travel Planning Problem',
        description: 'Plan the optimal travel route. OR nodes represent mode choices (bus/train/flight). AND nodes represent mandatory steps (booking + packing).',
        start: 'GoTo City B',
        nodes: [
            { name: 'GoTo City B', type: 'OR', heuristic: 10 },
            { name: 'By Bus', type: 'OR', heuristic: 6 },
            { name: 'By Train', type: 'OR', heuristic: 4 },
            { name: 'By Flight', type: 'AND', heuristic: 2 },
            { name: 'Book Ticket', type: 'OR', heuristic: 1 },
            { name: 'Pack Bags', type: 'OR', heuristic: 1 },
            { name: 'Take Bus Stop', type: 'OR', heuristic: 3 },
            { name: 'Board Train', type: 'OR', heuristic: 2 },
        ],
        edges: [
            { from: 'GoTo City B', to: ['By Bus'], type: 'OR', cost: 1 },
            { from: 'GoTo City B', to: ['By Train'], type: 'OR', cost: 1 },
            { from: 'GoTo City B', to: ['By Flight'], type: 'AND', cost: 1 },
            { from: 'By Flight', to: ['Book Ticket', 'Pack Bags'], type: 'AND', cost: 1 },
            { from: 'By Bus', to: ['Take Bus Stop'], type: 'OR', cost: 1 },
            { from: 'By Train', to: ['Board Train'], type: 'OR', cost: 1 },
        ]
    },
    assembly: {
        name: 'Robot Assembly Problem',
        description: 'A robot must assemble a product. AND nodes require ALL sub-tasks. OR nodes choose from alternative assembly strategies.',
        start: 'Assemble Product',
        nodes: [
            { name: 'Assemble Product', type: 'AND', heuristic: 20 },
            { name: 'Get Parts', type: 'OR', heuristic: 8 },
            { name: 'Join Parts', type: 'AND', heuristic: 10 },
            { name: 'Order Online', type: 'OR', heuristic: 4 },
            { name: 'Buy Locally', type: 'OR', heuristic: 6 },
            { name: 'Weld', type: 'OR', heuristic: 5 },
            { name: 'Screw', type: 'OR', heuristic: 3 },
            { name: 'Inspect', type: 'OR', heuristic: 2 },
        ],
        edges: [
            { from: 'Assemble Product', to: ['Get Parts', 'Join Parts', 'Inspect'], type: 'AND', cost: 1 },
            { from: 'Get Parts', to: ['Order Online'], type: 'OR', cost: 1 },
            { from: 'Get Parts', to: ['Buy Locally'], type: 'OR', cost: 1 },
            { from: 'Join Parts', to: ['Weld', 'Screw'], type: 'AND', cost: 1 },
        ]
    },
    game_strategy: {
        name: 'Game Strategy Problem',
        description: 'AI decides the best move in a game. OR nodes represent choice between strategies. AND nodes require multiple conditions to be met.',
        start: 'Win Game',
        nodes: [
            { name: 'Win Game', type: 'OR', heuristic: 15 },
            { name: 'Attack Strategy', type: 'AND', heuristic: 8 },
            { name: 'Defense Strategy', type: 'AND', heuristic: 10 },
            { name: 'Control Center', type: 'OR', heuristic: 4 },
            { name: 'Flank Enemy', type: 'OR', heuristic: 5 },
            { name: 'Hold Position', type: 'OR', heuristic: 3 },
            { name: 'Build Defenses', type: 'OR', heuristic: 4 },
        ],
        edges: [
            { from: 'Win Game', to: ['Attack Strategy'], type: 'OR', cost: 2 },
            { from: 'Win Game', to: ['Defense Strategy'], type: 'OR', cost: 3 },
            { from: 'Attack Strategy', to: ['Control Center', 'Flank Enemy'], type: 'AND', cost: 1 },
            { from: 'Defense Strategy', to: ['Hold Position', 'Build Defenses'], type: 'AND', cost: 1 },
        ]
    },
    medical: {
        name: 'Medical Diagnosis Problem',
        description: 'Diagnose a patient condition. OR nodes are alternative diagnoses. AND nodes represent combinations of required symptoms.',
        start: 'Diagnose Patient',
        nodes: [
            { name: 'Diagnose Patient', type: 'OR', heuristic: 12 },
            { name: 'Flu', type: 'AND', heuristic: 4 },
            { name: 'Allergy', type: 'AND', heuristic: 6 },
            { name: 'Fever', type: 'OR', heuristic: 2 },
            { name: 'Cough', type: 'OR', heuristic: 2 },
            { name: 'Sneezing', type: 'OR', heuristic: 2 },
            { name: 'Rash', type: 'OR', heuristic: 3 },
        ],
        edges: [
            { from: 'Diagnose Patient', to: ['Flu'], type: 'OR', cost: 1 },
            { from: 'Diagnose Patient', to: ['Allergy'], type: 'OR', cost: 2 },
            { from: 'Flu', to: ['Fever', 'Cough'], type: 'AND', cost: 1 },
            { from: 'Allergy', to: ['Sneezing', 'Rash'], type: 'AND', cost: 1 },
        ]
    }
};

// ── State ──
let currentProblem = PROBLEMS.travel;
let solveSteps = [];
let currentStep = 0;
let solveResult = null;
let graphLayout = {};

// ── Load Problem ──
function loadProblem(key) {
    currentProblem = PROBLEMS[key];
    solveSteps = [];
    currentStep = 0;
    solveResult = null;

    const descEl = document.getElementById('problem-desc');
    if (descEl) descEl.textContent = currentProblem.description;

    const stepsList = document.getElementById('ao-steps-list');
    if (stepsList) stepsList.innerHTML = '<p class="steps-placeholder">Run AO* to see step-by-step decisions...</p>';

    resetAOStarResults();
    computeGraphLayout();
    drawGraph({});

    showToast('Problem loaded: ' + currentProblem.name, 'info');
}

function resetAOStarResults() {
    ['ao-final-cost','ao-steps','ao-solved','ao-time'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.textContent = '—';
    });
}

// ── Compute Layout ──
function computeGraphLayout() {
    const canvas = document.getElementById('ao-canvas');
    if (!canvas) return;
    const W = canvas.width, H = canvas.height;
    const nodes = currentProblem.nodes;
    const start = currentProblem.start;

    // BFS levels
    const adj = {};
    nodes.forEach(n => { adj[n.name] = []; });
    currentProblem.edges.forEach(e => {
        e.to.forEach(child => adj[e.from].push(child));
    });

    const levels = {};
    const queue = [{ name: start, level: 0 }];
    const visited = new Set([start]);
    levels[start] = 0;

    while (queue.length > 0) {
        const { name, level } = queue.shift();
        (adj[name] || []).forEach(child => {
            if (!visited.has(child)) {
                visited.add(child);
                levels[child] = level + 1;
                queue.push({ name: child, level: level + 1 });
            }
        });
    }

    // Group by level
    const byLevel = {};
    Object.entries(levels).forEach(([n, l]) => {
        if (!byLevel[l]) byLevel[l] = [];
        byLevel[l].push(n);
    });

    const maxLevel = Math.max(...Object.values(levels));
    const padding = 70;

    graphLayout = {};
    Object.entries(byLevel).forEach(([level, names]) => {
        const lv = parseInt(level);
        const x = padding + (lv / Math.max(maxLevel, 1)) * (W - 2 * padding);
        names.forEach((name, i) => {
            const y = padding + (i + 1) * (H - 2 * padding) / (names.length + 1);
            graphLayout[name] = { x, y };
        });
    });
}

// ── Draw Graph ──
function drawGraph(nodeStates) {
    const canvas = document.getElementById('ao-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;

    ctx.clearRect(0, 0, W, H);

    // Background
    ctx.fillStyle = 'rgba(5,11,26,0.95)';
    ctx.fillRect(0, 0, W, H);

    const nodeRadius = 28;

    // Draw edges
    currentProblem.edges.forEach(edge => {
        const from = graphLayout[edge.from];
        if (!from) return;

        edge.to.forEach((toName, idx) => {
            const to = graphLayout[toName];
            if (!to) return;

            const isOptimal = nodeStates[edge.from]?.optimal && nodeStates[toName]?.solved;

            // Draw line
            ctx.beginPath();
            ctx.strokeStyle = isOptimal ? '#facc15' : 'rgba(148,163,184,0.3)';
            ctx.lineWidth = isOptimal ? 2.5 : 1.5;
            ctx.setLineDash(isOptimal ? [] : [5, 5]);
            ctx.moveTo(from.x, from.y);
            ctx.lineTo(to.x, to.y);
            ctx.stroke();
            ctx.setLineDash([]);

            // AND connector arc for AND edges
            if (edge.type === 'AND' && edge.to.length > 1 && idx === Math.floor(edge.to.length / 2)) {
                const midX = (from.x + to.x) / 2;
                const midY = (from.y + to.y) / 2;
                ctx.beginPath();
                ctx.arc(midX, midY, 8, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(168,85,247,0.6)';
                ctx.fill();
                ctx.strokeStyle = '#a855f7';
                ctx.lineWidth = 1;
                ctx.stroke();
            }

            // Arrow
            const angle = Math.atan2(to.y - from.y, to.x - from.x);
            const arrowX = to.x - Math.cos(angle) * (nodeRadius + 3);
            const arrowY = to.y - Math.sin(angle) * (nodeRadius + 3);
            ctx.beginPath();
            ctx.moveTo(arrowX, arrowY);
            ctx.lineTo(arrowX - 10 * Math.cos(angle - 0.35), arrowY - 10 * Math.sin(angle - 0.35));
            ctx.lineTo(arrowX - 10 * Math.cos(angle + 0.35), arrowY - 10 * Math.sin(angle + 0.35));
            ctx.closePath();
            ctx.fillStyle = isOptimal ? '#facc15' : 'rgba(148,163,184,0.5)';
            ctx.fill();
        });
    });

    // Draw nodes
    currentProblem.nodes.forEach(nodeData => {
        const pos = graphLayout[nodeData.name];
        if (!pos) return;

        const state = nodeStates[nodeData.name] || {};
        const isStart = nodeData.name === currentProblem.start;
        const isSolved = state.solved;
        const isProcessing = state.processing;

        // Glow
        if (isSolved || isProcessing) {
            ctx.beginPath();
            ctx.arc(pos.x, pos.y, nodeRadius + 10, 0, Math.PI * 2);
            const gradient = ctx.createRadialGradient(pos.x, pos.y, 0, pos.x, pos.y, nodeRadius + 10);
            gradient.addColorStop(0, isSolved ? 'rgba(16,185,129,0.3)' : 'rgba(59,130,246,0.3)');
            gradient.addColorStop(1, 'transparent');
            ctx.fillStyle = gradient;
            ctx.fill();
        }

        // Node circle
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, nodeRadius, 0, Math.PI * 2);
        let fillColor;
        if (isSolved) fillColor = 'rgba(16,185,129,0.2)';
        else if (isStart) fillColor = 'rgba(239,68,68,0.2)';
        else if (nodeData.type === 'AND') fillColor = 'rgba(168,85,247,0.2)';
        else fillColor = 'rgba(59,130,246,0.2)';
        ctx.fillStyle = fillColor;
        ctx.fill();

        ctx.strokeStyle = isSolved ? '#10b981' : isStart ? '#ef4444' : nodeData.type === 'AND' ? '#a855f7' : '#3b82f6';
        ctx.lineWidth = isSolved ? 2.5 : 2;
        ctx.stroke();

        // Node type indicator (AND/OR)
        ctx.fillStyle = nodeData.type === 'AND' ? '#c084fc' : '#60a5fa';
        ctx.font = 'bold 10px JetBrains Mono, monospace';
        ctx.textAlign = 'center';
        ctx.fillText(nodeData.type, pos.x, pos.y - 4);

        // Cost display
        const displayCost = state.cost !== undefined ? state.cost : nodeData.heuristic;
        ctx.fillStyle = isSolved ? '#34d399' : '#94a3b8';
        ctx.font = 'bold 11px Outfit, sans-serif';
        ctx.fillText(`h=${displayCost}`, pos.x, pos.y + 10);

        // Node name label (below)
        const shortName = nodeData.name.length > 10 ? nodeData.name.substring(0, 10) + '…' : nodeData.name;
        ctx.fillStyle = '#f1f5f9';
        ctx.font = '11px Outfit, sans-serif';
        ctx.fillText(shortName, pos.x, pos.y + nodeRadius + 15);
    });
}

// ── Run AO* ──
async function runAOStar() {
    try {
        const response = await fetch('/api/aostar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(currentProblem)
        });
        solveResult = await response.json();
        solveSteps = solveResult.steps || [];
        currentStep = 0;

        // Update results
        document.getElementById('ao-final-cost').textContent = solveResult.final_cost;
        document.getElementById('ao-steps').textContent = solveSteps.length;
        document.getElementById('ao-solved').textContent = (solveResult.solved_nodes || []).length;
        document.getElementById('ao-time').textContent = solveResult.execution_time + 'ms';

        // Animate steps
        const stepsList = document.getElementById('ao-steps-list');
        if (stepsList) stepsList.innerHTML = '';

        const nodeStates = {};
        for (let i = 0; i < solveSteps.length; i++) {
            const step = solveSteps[i];
            nodeStates[step.node] = { solved: step.solved, cost: step.cost, processing: true };

            if (i > 0) nodeStates[solveSteps[i-1].node] = { ...nodeStates[solveSteps[i-1].node], processing: false };

            drawGraph(nodeStates);

            if (stepsList) {
                const entry = document.createElement('div');
                entry.className = `ao-step-entry ${step.solved ? 'solved' : 'processing'}`;
                entry.innerHTML = `
                    <span class="ao-step-node">${step.node}</span>
                    <span class="ao-step-detail"> [${step.type}] ${step.action}</span>
                `;
                stepsList.appendChild(entry);
                stepsList.scrollTop = stepsList.scrollHeight;
            }
            await sleep(600);
        }

        // Mark all solved
        if (solveResult.solved_nodes) {
            solveResult.solved_nodes.forEach(n => {
                if (nodeStates[n]) { nodeStates[n].optimal = true; nodeStates[n].processing = false; }
            });
        }
        drawGraph(nodeStates);
        showToast(`AO* solved! Final cost: ${solveResult.final_cost}`, 'success');
    } catch (err) {
        showToast('Error running AO* algorithm: ' + err.message, 'error');
    }
}

// ── Step AO* ──
async function stepAOStar() {
    if (!solveResult) {
        // Run first to get steps
        await runAOStar();
        return;
    }
    if (currentStep >= solveSteps.length) {
        showToast('All steps completed!', 'info');
        return;
    }
    const step = solveSteps[currentStep];
    const nodeStates = {};
    for (let i = 0; i <= currentStep; i++) {
        nodeStates[solveSteps[i].node] = { solved: solveSteps[i].solved, cost: solveSteps[i].cost };
    }
    nodeStates[step.node].processing = true;
    drawGraph(nodeStates);
    currentStep++;
}

// ── Reset AO* ──
function resetAOStar() {
    solveSteps = [];
    currentStep = 0;
    solveResult = null;
    resetAOStarResults();
    computeGraphLayout();
    drawGraph({});
    const stepsList = document.getElementById('ao-steps-list');
    if (stepsList) stepsList.innerHTML = '<p class="steps-placeholder">Run AO* to see step-by-step decisions...</p>';
    showToast('AO* reset!', 'info');
}

// ── Init ──
if (document.getElementById('ao-canvas')) {
    const firstProblem = document.getElementById('problem-select')?.value || 'travel';
    currentProblem = PROBLEMS[firstProblem];
    const descEl = document.getElementById('problem-desc');
    if (descEl) descEl.textContent = currentProblem.description;

    // Make canvas responsive
    const canvas = document.getElementById('ao-canvas');
    if (canvas) {
        const container = canvas.parentElement;
        const resize = () => {
            canvas.width = Math.min(700, container.clientWidth - 30);
            canvas.height = 480;
            computeGraphLayout();
            drawGraph({});
        };
        resize();
        window.addEventListener('resize', resize);
    } else {
        computeGraphLayout();
        drawGraph({});
    }
}
