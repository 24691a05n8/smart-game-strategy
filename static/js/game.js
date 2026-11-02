/**
 * game.js - Tic-Tac-Toe with Minimax + Alpha-Beta Pruning AI
 * Smart Game Strategy System
 */

// ── Game State ──
let board = ['','','','','','','','',''];
let humanPlayer = 'X';
let aiPlayer = 'O';
let difficulty = 'hard';
let gameOver = false;
let isAIThinking = false;
let scores = { human: 0, ai: 0, draw: 0 };

// ── Set Difficulty ──
function setDifficulty(level) {
    difficulty = level;
    document.querySelectorAll('.diff-btn').forEach(b => b.classList.remove('active'));
    const btn = document.getElementById(`diff-${level}`);
    if (btn) btn.classList.add('active');

    // Update depth display
    const depths = { easy: 2, medium: 4, hard: 9 };
    const depthEl = document.getElementById('ai-depth');
    if (depthEl) depthEl.textContent = depths[level];

    restartGame();
}

// ── Set Player Symbol ──
function setPlayerSymbol(symbol) {
    humanPlayer = symbol;
    aiPlayer = symbol === 'X' ? 'O' : 'X';

    document.querySelectorAll('.play-btn').forEach(b => b.classList.remove('active'));
    const btn = document.getElementById(`play-${symbol.toLowerCase()}`);
    if (btn) btn.classList.add('active');

    // Update score symbol display
    const humanSymEl = document.querySelector('.score-symbol.human');
    const aiSymEl = document.querySelector('.score-symbol.ai');
    if (humanSymEl) humanSymEl.textContent = humanPlayer;
    if (aiSymEl) aiSymEl.textContent = aiPlayer;

    restartGame();
}

// ── Restart Game ──
function restartGame() {
    board = ['','','','','','','','',''];
    gameOver = false;
    isAIThinking = false;

    // Clear board UI
    for (let i = 0; i < 9; i++) {
        const cell = document.getElementById(`cell-${i}`);
        if (cell) {
            cell.textContent = '';
            cell.className = 'cell';
        }
    }

    // Hide win overlay
    const overlay = document.getElementById('win-overlay');
    if (overlay) overlay.style.display = 'none';

    // Clear AI panel
    const thinkingBox = document.getElementById('ai-thinking-box');
    if (thinkingBox) thinkingBox.innerHTML = '<p class="steps-placeholder">Make a move to see AI decision analysis...</p>';
    const moveAnalysis = document.getElementById('move-analysis');
    if (moveAnalysis) moveAnalysis.innerHTML = '<p class="steps-placeholder">Position scores will appear here...</p>';

    // Reset alpha-beta display
    const alphaEl = document.getElementById('alpha-val');
    const betaEl = document.getElementById('beta-val');
    if (alphaEl) alphaEl.textContent = '-∞';
    if (betaEl) betaEl.textContent = '+∞';

    setStatus('Your turn! Click a cell to play.', 'blue');

    // If AI goes first (human is O)
    if (humanPlayer === 'O') {
        setTimeout(() => makeAIMove(), 500);
    }
}

// ── Status Display ──
function setStatus(text, color) {
    const statusEl = document.getElementById('status-text');
    const indicator = document.getElementById('status-indicator');
    if (statusEl) statusEl.textContent = text;
    if (indicator) {
        indicator.style.background = color === 'green' ? '#10b981' :
                                     color === 'red' ? '#ef4444' :
                                     color === 'yellow' ? '#facc15' : '#3b82f6';
    }
}

// ── Human Move ──
function humanMove(index) {
    if (gameOver || isAIThinking) return;
    if (board[index] !== '') return;

    // Make human move
    board[index] = humanPlayer;
    const cell = document.getElementById(`cell-${index}`);
    if (cell) {
        cell.textContent = humanPlayer;
        cell.className = `cell ${humanPlayer} taken human-move`;
    }

    // Check winner
    const { winner, line } = checkWinner(board);
    if (winner) {
        handleGameEnd(winner, line);
        return;
    }

    setStatus('AI is thinking...', 'yellow');
    isAIThinking = true;

    // AI responds
    setTimeout(() => makeAIMove(), 400);
}

// ── AI Move ──
async function makeAIMove() {
    if (gameOver) return;

    try {
        const response = await fetch('/api/tictactoe/move', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                board: board,
                ai_player: aiPlayer,
                human_player: humanPlayer,
                difficulty: difficulty
            })
        });

        const result = await response.json();

        if (result.move !== -1 && result.move !== undefined) {
            board[result.move] = aiPlayer;
            const cell = document.getElementById(`cell-${result.move}`);
            if (cell) {
                cell.textContent = aiPlayer;
                cell.className = `cell ${aiPlayer} taken ai-move`;
            }

            // Update AI thinking display
            updateAIDisplay(result);
        }

        if (result.winner) {
            handleGameEnd(result.winner, result.winning_line || []);
        } else {
            setStatus('Your turn! Click a cell to play.', 'blue');
        }
    } catch (err) {
        console.error('AI move error:', err);
        setStatus('Your turn!', 'blue');
    } finally {
        isAIThinking = false;
    }
}

// ── Update AI Display ──
function updateAIDisplay(result) {
    const thinkingBox = document.getElementById('ai-thinking-box');
    if (thinkingBox) {
        const entry = document.createElement('div');
        entry.className = 'think-item';
        entry.innerHTML = `AI chose position <strong>${result.move + 1}</strong> as <strong>${aiPlayer}</strong>`;
        if (thinkingBox.querySelector('.steps-placeholder')) thinkingBox.innerHTML = '';
        thinkingBox.appendChild(entry);
        thinkingBox.scrollTop = thinkingBox.scrollHeight;
    }

    // Move analysis
    const moveAnalysis = document.getElementById('move-analysis');
    if (moveAnalysis && result.move_analysis && result.move_analysis.length > 0) {
        if (moveAnalysis.querySelector('.steps-placeholder')) moveAnalysis.innerHTML = '';
        const maxScore = Math.max(...result.move_analysis.map(m => m.score));
        const minScore = Math.min(...result.move_analysis.map(m => m.score));

        result.move_analysis.forEach(m => {
            const entry = document.createElement('div');
            entry.className = 'move-score-item';
            const scoreClass = m.score === maxScore ? 'best' : m.score === minScore ? 'worst' : '';
            entry.innerHTML = `
                <span class="move-pos">Pos ${m.position + 1}</span>
                <span class="move-score-val ${scoreClass}">${m.score > 0 ? '+' : ''}${m.score}</span>
            `;
            moveAnalysis.appendChild(entry);
        });

        // Show AI's best score
        const bestScoreEl = document.getElementById('ai-best-score');
        if (bestScoreEl) bestScoreEl.textContent = maxScore;

        // Update alpha/beta visual
        const alphaEl = document.getElementById('alpha-val');
        const betaEl = document.getElementById('beta-val');
        if (alphaEl) alphaEl.textContent = maxScore;
        if (betaEl) betaEl.textContent = '+∞';
    }
}

// ── Check Winner (frontend) ──
function checkWinner(b) {
    const lines = [
        [0,1,2],[3,4,5],[6,7,8],
        [0,3,6],[1,4,7],[2,5,8],
        [0,4,8],[2,4,6]
    ];
    for (const line of lines) {
        if (b[line[0]] && b[line[0]] === b[line[1]] && b[line[1]] === b[line[2]]) {
            return { winner: b[line[0]], line };
        }
    }
    if (!b.includes('')) return { winner: 'Draw', line: [] };
    return { winner: null, line: [] };
}

// ── Handle Game End ──
function handleGameEnd(winner, line) {
    gameOver = true;

    if (winner !== 'Draw' && line.length > 0) {
        line.forEach(i => {
            const cell = document.getElementById(`cell-${i}`);
            if (cell) cell.classList.add('winning');
        });
    }

    let winIcon, winTitle, winMessage;
    if (winner === humanPlayer) {
        winIcon = '🎉';
        winTitle = 'You Win!';
        winMessage = `Congratulations! You beat the AI on ${difficulty} difficulty!`;
        scores.human++;
        setStatus('You win! 🎉', 'green');
    } else if (winner === aiPlayer) {
        winIcon = '🤖';
        winTitle = 'AI Wins!';
        winMessage = `The AI (Minimax + Alpha-Beta) found the optimal move!`;
        scores.ai++;
        setStatus('AI wins! Try again.', 'red');
    } else {
        winIcon = '🤝';
        winTitle = "It's a Draw!";
        winMessage = 'Perfect play from both sides — no winner!';
        scores.draw++;
        setStatus("Draw! Well played.", 'yellow');
    }

    // Update scoreboard
    const humanScoreEl = document.getElementById('human-score');
    const aiScoreEl = document.getElementById('ai-score');
    const drawScoreEl = document.getElementById('draw-score');
    if (humanScoreEl) humanScoreEl.textContent = scores.human;
    if (aiScoreEl) aiScoreEl.textContent = scores.ai;
    if (drawScoreEl) drawScoreEl.textContent = scores.draw;

    // Show win overlay
    const overlay = document.getElementById('win-overlay');
    const winIconEl = document.getElementById('win-icon');
    const winTitleEl = document.getElementById('win-title');
    const winMessageEl = document.getElementById('win-message');

    if (overlay) {
        if (winIconEl) winIconEl.textContent = winIcon;
        if (winTitleEl) winTitleEl.textContent = winTitle;
        if (winMessageEl) winMessageEl.textContent = winMessage;
        overlay.style.display = 'flex';
    }
}

// ── Init ──
if (document.getElementById('board-grid')) {
    restartGame();
}
