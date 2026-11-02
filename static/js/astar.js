/**
 * astar.js - A* Grid Pathfinding Visualization
 * Smart Game Strategy System
 */

// ── State ──
let grid = [];
let rows = 15, cols = 20;
let startCell = null, endCell = null;
let currentMode = 'start';
let isRunning = false;
let isMouseDown = false;
let animationSpeed = 50;

// ── Initialize Grid ──
function initGrid(r = 15, c = 20) {
    rows = r; cols = c;
    grid = Array.from({ length: rows }, () => Array(cols).fill(0));
    startCell = null; endCell = null;
    renderGrid();
    clearResults();
}

function renderGrid() {
    const container = document.getElementById('astar-grid');
    if (!container) return;
    container.style.gridTemplateColumns = `repeat(${cols}, 32px)`;
    container.innerHTML = '';

    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            const cell = document.createElement('div');
            cell.className = 'grid-cell';
            cell.id = `cell-${r}-${c}`;
            cell.dataset.r = r;
            cell.dataset.c = c;

            cell.addEventListener('mousedown', (e) => { isMouseDown = true; handleCellClick(r, c); e.preventDefault(); });
            cell.addEventListener('mouseenter', () => { if (isMouseDown && (currentMode === 'wall' || currentMode === 'erase')) handleCellClick(r, c); });
            cell.addEventListener('mouseup', () => { isMouseDown = false; });

            container.appendChild(cell);
        }
    }
    document.addEventListener('mouseup', () => { isMouseDown = false; });

    // Set default start and end
    setCell(0, 0, 'start');
    setCell(rows - 1, cols - 1, 'end');
}

function setCell(r, c, type) {
    const cellEl = document.getElementById(`cell-${r}-${c}`);
    if (!cellEl) return;

    if (type === 'start') {
        if (startCell) {
            const old = document.getElementById(`cell-${startCell[0]}-${startCell[1]}`);
            if (old) old.className = 'grid-cell';
        }
        startCell = [r, c];
        cellEl.className = 'grid-cell start';
        grid[r][c] = 0;
    } else if (type === 'end') {
        if (endCell) {
            const old = document.getElementById(`cell-${endCell[0]}-${endCell[1]}`);
            if (old) old.className = 'grid-cell';
        }
        endCell = [r, c];
        cellEl.className = 'grid-cell end';
        grid[r][c] = 0;
    } else if (type === 'wall') {
        cellEl.className = 'grid-cell wall';
        grid[r][c] = 1;
    } else if (type === 'empty') {
        cellEl.className = 'grid-cell';
        grid[r][c] = 0;
    }
}

function handleCellClick(r, c) {
    if (isRunning) return;

    if (currentMode === 'start') {
        setCell(r, c, 'start');
    } else if (currentMode === 'end') {
        setCell(r, c, 'end');
    } else if (currentMode === 'wall') {
        if (startCell && startCell[0] === r && startCell[1] === c) return;
        if (endCell && endCell[0] === r && endCell[1] === c) return;
        setCell(r, c, 'wall');
    } else if (currentMode === 'erase') {
        if (startCell && startCell[0] === r && startCell[1] === c) return;
        if (endCell && endCell[0] === r && endCell[1] === c) return;
        setCell(r, c, 'empty');
    }
}

// ── Mode Selection ──
function setMode(mode) {
    currentMode = mode;
    document.querySelectorAll('.btn-mode').forEach(b => b.classList.remove('active'));
    const btn = document.getElementById(`mode-${mode}`);
    if (btn) btn.classList.add('active');
}

// ── Clear cells (keep walls) ──
function clearVisualization() {
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            const el = document.getElementById(`cell-${r}-${c}`);
            if (!el) continue;
            if (el.classList.contains('wall')) continue;
            if (startCell && startCell[0] === r && startCell[1] === c) { el.className = 'grid-cell start'; continue; }
            if (endCell && endCell[0] === r && endCell[1] === c) { el.className = 'grid-cell end'; continue; }
            el.className = 'grid-cell';
        }
    }
    clearResults();
}

function clearResults() {
    ['exec-time','path-cost','nodes-explored','path-length'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.textContent = '—';
    });
    ['fn-val','gn-val','hn-val'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.textContent = '—';
    });
    const stepsList = document.getElementById('steps-list');
    if (stepsList) stepsList.innerHTML = '<p class="steps-placeholder">Run A* to see step-by-step exploration...</p>';
}

// ── Run A* Algorithm ──
async function runAstar() {
    if (isRunning) return;
    if (!startCell || !endCell) { showToast('Please set both start and end cells!', 'error'); return; }

    isRunning = true;
    clearVisualization();

    const heuristic = document.getElementById('heuristic-select')?.value || 'manhattan';
    animationSpeed = parseInt(document.getElementById('speed-slider')?.value) || 50;

    try {
        const response = await fetch('/api/astar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                grid: grid,
                start: startCell,
                goal: endCell,
                heuristic: heuristic
            })
        });

        const result = await response.json();
        await animateResult(result);
    } catch (err) {
        showToast('Error running A* algorithm: ' + err.message, 'error');
    } finally {
        isRunning = false;
    }
}

async function animateResult(result) {
    const stepsList = document.getElementById('steps-list');
    if (stepsList) stepsList.innerHTML = '';

    // Animate explored nodes
    for (let i = 0; i < result.explored.length; i++) {
        const [r, c] = result.explored[i];
        if (startCell && r === startCell[0] && c === startCell[1]) continue;
        if (endCell && r === endCell[0] && c === endCell[1]) continue;

        const el = document.getElementById(`cell-${r}-${c}`);
        if (el && !el.classList.contains('wall')) {
            el.classList.add('explored');
        }

        // Update formula display
        if (result.steps[i]) {
            const step = result.steps[i];
            const fnEl = document.getElementById('fn-val');
            const gnEl = document.getElementById('gn-val');
            const hnEl = document.getElementById('hn-val');
            if (fnEl) fnEl.textContent = step.f;
            if (gnEl) gnEl.textContent = step.g;
            if (hnEl) hnEl.textContent = step.h;

            // Add step entry
            if (stepsList && i < 40) {
                const entry = document.createElement('div');
                entry.className = 'step-entry';
                entry.innerHTML = `
                    <span class="step-node">[${step.node[0]},${step.node[1]}]</span>
                    <span></span>
                    <span class="step-g">g=${step.g}</span>
                    <span class="step-h">h=${step.h}</span>
                `;
                stepsList.appendChild(entry);
                stepsList.scrollTop = stepsList.scrollHeight;
            }
        }

        if (i % 3 === 0) await sleep(animationSpeed);
    }

    // Update results
    document.getElementById('exec-time').textContent = result.execution_time + 'ms';
    document.getElementById('nodes-explored').textContent = result.nodes_explored;

    if (result.success) {
        document.getElementById('path-cost').textContent = result.path_cost;
        document.getElementById('path-length').textContent = result.path.length + ' cells';

        // Animate optimal path
        for (let i = 0; i < result.path.length; i++) {
            const [r, c] = result.path[i];
            if (startCell && r === startCell[0] && c === startCell[1]) continue;
            if (endCell && r === endCell[0] && c === endCell[1]) continue;
            const el = document.getElementById(`cell-${r}-${c}`);
            if (el) {
                el.classList.remove('explored');
                el.classList.add('path');
            }
            await sleep(animationSpeed * 1.5);
        }
        showToast(`Path found! Cost: ${result.path_cost}, Nodes explored: ${result.nodes_explored}`, 'success');
    } else {
        document.getElementById('path-cost').textContent = 'No Path!';
        document.getElementById('path-length').textContent = '0';
        showToast(result.message || 'No path found!', 'error');
    }
}

// ── Random Maze ──
async function generateRandomMaze() {
    if (isRunning) return;

    const sizeSelect = document.getElementById('grid-size-select');
    const size = sizeSelect ? parseInt(sizeSelect.value) : 15;
    const mazeRows = size, mazeCols = size + 5;

    try {
        const response = await fetch('/api/generate_maze', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ rows: mazeRows, cols: mazeCols, density: 0.3 })
        });
        const data = await response.json();
        grid = data.grid;
        rows = data.rows;
        cols = data.cols;
        startCell = null;
        endCell = null;

        // Re-render grid with new data
        const container = document.getElementById('astar-grid');
        if (!container) return;
        container.style.gridTemplateColumns = `repeat(${cols}, 32px)`;
        container.innerHTML = '';

        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const cell = document.createElement('div');
                cell.className = 'grid-cell' + (grid[r][c] === 1 ? ' wall' : '');
                cell.id = `cell-${r}-${c}`;
                cell.dataset.r = r;
                cell.dataset.c = c;
                cell.addEventListener('mousedown', (e) => { isMouseDown = true; handleCellClick(r, c); e.preventDefault(); });
                cell.addEventListener('mouseenter', () => { if (isMouseDown && (currentMode === 'wall' || currentMode === 'erase')) handleCellClick(r, c); });
                container.appendChild(cell);
            }
        }
        document.addEventListener('mouseup', () => { isMouseDown = false; });

        setCell(0, 0, 'start');
        setCell(rows - 1, cols - 1, 'end');
        clearResults();
        showToast('Random maze generated!', 'success');
    } catch (err) {
        showToast('Error generating maze: ' + err.message, 'error');
    }
}

// ── Reset Grid ──
function resetGrid() {
    if (isRunning) return;
    const sizeSelect = document.getElementById('grid-size-select');
    const size = sizeSelect ? parseInt(sizeSelect.value) : 15;
    initGrid(size, size + 5);
    showToast('Grid reset!', 'info');
}

// ── Grid size change ──
const gridSizeSelect = document.getElementById('grid-size-select');
if (gridSizeSelect) {
    gridSizeSelect.addEventListener('change', () => {
        const size = parseInt(gridSizeSelect.value);
        initGrid(size, size + 5);
    });
}

// ── Init on load ──
if (document.getElementById('astar-grid')) {
    initGrid(15, 20);
}
