"""
Smart Game Strategy and Decision-Making System
Using A* and AO* Algorithms
B.Tech CSE Artificial Intelligence Project
"""

from flask import Flask, render_template, jsonify, request
import json
import heapq
import time
import math
import random

app = Flask(__name__)

# ============================================================
# A* ALGORITHM IMPLEMENTATION
# ============================================================

def heuristic_manhattan(a, b):
    """Manhattan distance heuristic for A*"""
    return abs(a[0] - b[0]) + abs(a[1] - b[1])

def heuristic_euclidean(a, b):
    """Euclidean distance heuristic"""
    return math.sqrt((a[0] - b[0])**2 + (a[1] - b[1])**2)

def a_star_search(grid, start, goal, heuristic_type='manhattan'):
    """
    A* Search Algorithm Implementation
    f(n) = g(n) + h(n)
    g(n) = actual cost from start to n
    h(n) = heuristic estimated cost from n to goal
    """
    rows = len(grid)
    cols = len(grid[0])

    heuristic = heuristic_manhattan if heuristic_type == 'manhattan' else heuristic_euclidean

    # Priority queue: (f_score, count, node)
    open_set = []
    count = 0
    heapq.heappush(open_set, (0, count, start))

    came_from = {}
    g_score = {start: 0}
    f_score = {start: heuristic(start, goal)}

    open_set_hash = {start}
    explored_nodes = []
    step_details = []

    while open_set:
        current_f, _, current = heapq.heappop(open_set)
        open_set_hash.discard(current)
        explored_nodes.append(list(current))

        step_details.append({
            'node': list(current),
            'g': g_score[current],
            'h': round(heuristic(current, goal), 2),
            'f': round(current_f, 2)
        })

        if current == goal:
            # Reconstruct path
            path = []
            while current in came_from:
                path.append(list(current))
                current = came_from[current]
            path.append(list(start))
            path.reverse()
            return {
                'success': True,
                'path': path,
                'explored': explored_nodes,
                'path_cost': round(g_score[goal], 2),
                'nodes_explored': len(explored_nodes),
                'steps': step_details
            }

        # Explore neighbors (4-directional movement)
        neighbors = [
            (current[0] - 1, current[1]),  # Up
            (current[0] + 1, current[1]),  # Down
            (current[0], current[1] - 1),  # Left
            (current[0], current[1] + 1),  # Right
        ]

        for neighbor in neighbors:
            r, c = neighbor
            if 0 <= r < rows and 0 <= c < cols and grid[r][c] != 1:
                tentative_g = g_score[current] + 1

                if neighbor not in g_score or tentative_g < g_score[neighbor]:
                    came_from[neighbor] = current
                    g_score[neighbor] = tentative_g
                    f = tentative_g + heuristic(neighbor, goal)
                    f_score[neighbor] = f
                    if neighbor not in open_set_hash:
                        count += 1
                        heapq.heappush(open_set, (f, count, neighbor))
                        open_set_hash.add(neighbor)

    return {
        'success': False,
        'path': [],
        'explored': explored_nodes,
        'path_cost': 0,
        'nodes_explored': len(explored_nodes),
        'steps': step_details,
        'message': 'No path found!'
    }


# ============================================================
# AO* ALGORITHM IMPLEMENTATION
# ============================================================

class AOStarNode:
    """Node class for AO* algorithm"""
    def __init__(self, name, node_type='OR', heuristic=0):
        self.name = name
        self.node_type = node_type  # 'OR' or 'AND'
        self.heuristic = heuristic
        self.cost = heuristic
        self.children = []   # List of child groups (AND-OR structure)
        self.solved = False
        self.optimal_path = []

def ao_star_solve(graph_data):
    """
    AO* Algorithm Implementation
    Solves AND-OR graphs by finding optimal solution graph
    - OR nodes: take the minimum cost child
    - AND nodes: sum costs of all children
    """
    nodes = {}
    # Build nodes
    for node_data in graph_data['nodes']:
        node = AOStarNode(
            name=node_data['name'],
            node_type=node_data['type'],
            heuristic=node_data['heuristic']
        )
        nodes[node_data['name']] = node

    # Build connections
    for edge in graph_data['edges']:
        parent = nodes[edge['from']]
        children_group = [nodes[c] for c in edge['to']]
        parent.children.append({
            'type': edge['type'],  # 'AND' or 'OR'
            'nodes': children_group,
            'cost': edge.get('cost', 1)
        })

    steps = []
    solved_nodes = set()

    def compute_cost(node_name):
        """Recursively compute AO* costs"""
        node = nodes[node_name]

        if not node.children:
            # Leaf node - terminal
            node.solved = True
            solved_nodes.add(node_name)
            steps.append({
                'node': node_name,
                'type': node.node_type,
                'cost': node.heuristic,
                'action': f'Terminal node. Cost = {node.heuristic}',
                'solved': True
            })
            return node.heuristic

        best_cost = float('inf')
        best_group = None

        for group in node.children:
            group_cost = group['cost']
            all_solved = True
            group_details = []

            for child in group['nodes']:
                child_cost = compute_cost(child.name)
                group_cost += child_cost
                group_details.append(f"{child.name}({child_cost})")
                if not child.solved:
                    all_solved = False

            if group['type'] == 'AND':
                # AND node: must solve ALL children
                if group_cost < best_cost:
                    best_cost = group_cost
                    best_group = group

            else:  # OR
                # OR node: solve the BEST (minimum cost) child
                if group_cost < best_cost:
                    best_cost = group_cost
                    best_group = group

        node.cost = best_cost
        if best_group:
            node.solved = True
            solved_nodes.add(node_name)

        steps.append({
            'node': node_name,
            'type': node.node_type,
            'cost': best_cost,
            'action': f'Best cost path selected. Cost = {best_cost}',
            'solved': node.solved
        })
        return best_cost

    start_node = graph_data['start']
    final_cost = compute_cost(start_node)

    return {
        'success': True,
        'steps': steps,
        'final_cost': final_cost,
        'solved_nodes': list(solved_nodes),
        'nodes': [
            {
                'name': n,
                'type': nodes[n].node_type,
                'heuristic': nodes[n].heuristic,
                'cost': nodes[n].cost,
                'solved': nodes[n].solved
            }
            for n in nodes
        ]
    }


# ============================================================
# MINIMAX WITH ALPHA-BETA PRUNING (Tic-Tac-Toe AI)
# ============================================================

def check_winner(board):
    """Check if there's a winner in Tic-Tac-Toe"""
    lines = [
        [0,1,2],[3,4,5],[6,7,8],  # Rows
        [0,3,6],[1,4,7],[2,5,8],  # Cols
        [0,4,8],[2,4,6]           # Diagonals
    ]
    for line in lines:
        if board[line[0]] == board[line[1]] == board[line[2]] != '':
            return board[line[0]], line
    if '' not in board:
        return 'Draw', []
    return None, []

def minimax(board, depth, is_maximizing, alpha, beta, ai_player, human_player):
    """
    Minimax Algorithm with Alpha-Beta Pruning
    - Maximizing player: AI
    - Minimizing player: Human
    - Alpha: best value maximizer can guarantee
    - Beta: best value minimizer can guarantee
    """
    winner, _ = check_winner(board)

    if winner == ai_player:
        return 10 - depth
    if winner == human_player:
        return depth - 10
    if winner == 'Draw':
        return 0

    if is_maximizing:
        best_score = -float('inf')
        for i in range(9):
            if board[i] == '':
                board[i] = ai_player
                score = minimax(board, depth + 1, False, alpha, beta, ai_player, human_player)
                board[i] = ''
                best_score = max(score, best_score)
                alpha = max(alpha, best_score)
                if beta <= alpha:
                    break  # Beta cutoff
        return best_score
    else:
        best_score = float('inf')
        for i in range(9):
            if board[i] == '':
                board[i] = human_player
                score = minimax(board, depth + 1, True, alpha, beta, ai_player, human_player)
                board[i] = ''
                best_score = min(score, best_score)
                beta = min(beta, best_score)
                if beta <= alpha:
                    break  # Alpha cutoff
        return best_score

def get_best_move(board, ai_player, human_player, difficulty):
    """Get best move for AI based on difficulty"""
    if difficulty == 'easy':
        # Easy: random move 70% of the time
        empty = [i for i in range(9) if board[i] == '']
        if random.random() < 0.7:
            return random.choice(empty)

    if difficulty == 'medium':
        # Medium: random move 30% of the time
        empty = [i for i in range(9) if board[i] == '']
        if random.random() < 0.3:
            return random.choice(empty)

    # Hard/optimal: full minimax
    best_score = -float('inf')
    best_move = -1
    move_analysis = []

    for i in range(9):
        if board[i] == '':
            board[i] = ai_player
            score = minimax(board, 0, False, -float('inf'), float('inf'), ai_player, human_player)
            board[i] = ''
            move_analysis.append({'position': i, 'score': score})
            if score > best_score:
                best_score = score
                best_move = i

    return best_move, move_analysis


# ============================================================
# FLASK ROUTES
# ============================================================

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/astar')
def astar_page():
    return render_template('astar.html')

@app.route('/aostar')
def aostar_page():
    return render_template('aostar.html')

@app.route('/game')
def game_page():
    return render_template('game.html')

@app.route('/comparison')
def comparison_page():
    return render_template('comparison.html')

@app.route('/documentation')
def documentation_page():
    return render_template('documentation.html')

# API Endpoints
@app.route('/api/astar', methods=['POST'])
def api_astar():
    """A* algorithm API endpoint"""
    data = request.get_json()
    grid = data.get('grid', [])
    start = tuple(data.get('start', [0, 0]))
    goal = tuple(data.get('goal', [9, 9]))
    heuristic = data.get('heuristic', 'manhattan')

    start_time = time.time()
    result = a_star_search(grid, start, goal, heuristic)
    execution_time = round((time.time() - start_time) * 1000, 3)
    result['execution_time'] = execution_time

    return jsonify(result)

@app.route('/api/aostar', methods=['POST'])
def api_aostar():
    """AO* algorithm API endpoint"""
    data = request.get_json()

    start_time = time.time()
    result = ao_star_solve(data)
    execution_time = round((time.time() - start_time) * 1000, 3)
    result['execution_time'] = execution_time

    return jsonify(result)

@app.route('/api/tictactoe/move', methods=['POST'])
def api_tictactoe():
    """Tic-Tac-Toe AI move endpoint"""
    data = request.get_json()
    board = data.get('board', [''] * 9)
    ai_player = data.get('ai_player', 'O')
    human_player = data.get('human_player', 'X')
    difficulty = data.get('difficulty', 'hard')

    winner, winning_line = check_winner(board)
    if winner:
        return jsonify({'winner': winner, 'winning_line': winning_line, 'move': -1})

    result = get_best_move(board, ai_player, human_player, difficulty)
    if isinstance(result, tuple):
        best_move, move_analysis = result
    else:
        best_move = result
        move_analysis = []

    board[best_move] = ai_player
    winner, winning_line = check_winner(board)

    return jsonify({
        'move': best_move,
        'board': board,
        'winner': winner,
        'winning_line': winning_line,
        'move_analysis': move_analysis[:5],  # Top 5 moves analyzed
        'ai_player': ai_player
    })

@app.route('/api/generate_maze', methods=['POST'])
def generate_maze():
    """Generate a random maze for A*"""
    data = request.get_json()
    rows = data.get('rows', 15)
    cols = data.get('cols', 20)
    obstacle_density = data.get('density', 0.3)

    grid = [[0] * cols for _ in range(rows)]

    # Add random obstacles
    for r in range(rows):
        for c in range(cols):
            if random.random() < obstacle_density:
                grid[r][c] = 1

    # Ensure start and end are clear
    grid[0][0] = 0
    grid[rows-1][cols-1] = 0

    return jsonify({'grid': grid, 'rows': rows, 'cols': cols})

if __name__ == '__main__':
    print("=" * 60)
    print("  Smart Game Strategy System - A* & AO* Algorithms")
    print("  B.Tech CSE AI Project")
    print("=" * 60)
    print("  Server running at: http://127.0.0.1:5000")
    print("=" * 60)
    app.run(debug=True, host='0.0.0.0', port=5000)
