// ========================================
// Escape the Upside Down - Game Logic
// ========================================

// Game State
const gameState = {
    currentScreen: 'start',
    isPlaying: false,
    isPaused: false,
    score: 0,
    timeRemaining: 10,
    collectedTypes: new Set(),
    nodes: [],
    gameStartTime: 0,
    lastNodeSpawn: 0,
    nodeSpawnInterval: 800, // milliseconds - much faster spawning for 10s game
    penaltySpawnInterval: 1000, // milliseconds - frequent penalty spawns to match node collection rate
    gameTimer: null,
    spawnTimer: null,
    penaltySpawnTimer: null
};

// Node Types Configuration
const nodeTypes = {
    reference: { 
        icon: '📖', 
        color: '#ff0066', 
        name: 'Reference',
        points: 100,
        spawnChance: 1.0
    },
    research: { 
        icon: '📒', 
        color: '#00ff00', 
        name: 'Research',
        points: 120,
        spawnChance: 1.0
    },
    documentation: { 
        icon: '📄', 
        color: '#ff6600', 
        name: 'Documentation',
        points: 110,
        spawnChance: 1.0
    },
    discovery: { 
        icon: '🔍', 
        color: '#9900ff', 
        name: 'Discovery',
        points: 130,
        spawnChance: 1.0
    },
    communication: { 
        icon: '🔔', 
        color: '#ffff00', 
        name: 'Communication',
        points: 115,
        spawnChance: 1.0
    },
    process: { 
        icon: '⚙️', 
        color: '#00ccff', 
        name: 'Process',
        points: 125,
        spawnChance: 1.0
    },
    penalty: {
        icon: '📚',
        color: '#ff0000',
        name: 'Corrupted Reference',
        points: 0,
        spawnChance: 0.01, // Reduced since they have separate spawning
        isPenalty: true,
        timePenalty: 3
    },
    decoy: {
        icon: '📋', // Similar to documentation but different
        color: '#990000',
        name: 'Infected Documentation',
        points: 0,
        spawnChance: 0.01,
        isPenalty: true,
        isDecoy: true,
        timePenalty: 3
    }
};

// DOM Elements
const screens = {
    start: document.getElementById('start-screen'),
    game: document.getElementById('game-screen'),
    end: document.getElementById('end-screen'),
    pause: document.getElementById('pause-screen')
};

const elements = {
    startBtn: document.getElementById('start-btn'),
    pauseBtn: document.getElementById('pause-btn'),
    resumeBtn: document.getElementById('resume-btn'),
    quitBtn: document.getElementById('quit-btn'),
    playAgainBtn: document.getElementById('play-again-btn'),
    homeBtn: document.getElementById('home-btn'),
    score: document.getElementById('score'),
    timer: document.getElementById('timer'),
    gameArena: document.getElementById('game-arena'),
    collectedNodes: document.getElementById('collected-nodes'),
    endTitle: document.getElementById('end-title'),
    endMessage: document.getElementById('end-message'),
    finalScore: document.getElementById('final-score'),
    nodesFound: document.getElementById('nodes-found'),
    timeUsed: document.getElementById('time-used'),
    achievementDisplay: document.getElementById('achievement-display')
};

// ========================================
// Initialization
// ========================================

function initGame() {
    setupEventListeners();
    showScreen('start');
    
    // Add some initial visual flair
    setTimeout(() => {
        elements.startBtn.style.animation = 'neonGlow 2s ease-in-out infinite alternate';
    }, 1000);
}

function setupEventListeners() {
    // Navigation buttons
    elements.startBtn.addEventListener('click', startGame);
    elements.pauseBtn.addEventListener('click', pauseGame);
    elements.resumeBtn.addEventListener('click', resumeGame);
    elements.quitBtn.addEventListener('click', quitToStart);
    elements.playAgainBtn.addEventListener('click', startGame);
    elements.homeBtn.addEventListener('click', quitToStart);
    
    // Keyboard shortcuts
    document.addEventListener('keydown', handleKeyboard);
    
    // Prevent right-click context menu on game arena
    elements.gameArena.addEventListener('contextmenu', (e) => e.preventDefault());
}

function handleKeyboard(event) {
    switch(event.code) {
        case 'Space':
        case 'KeyP':
            if (gameState.isPlaying && !gameState.isPaused) {
                pauseGame();
            } else if (gameState.isPaused) {
                resumeGame();
            }
            event.preventDefault();
            break;
        case 'Escape':
            if (gameState.isPlaying) {
                pauseGame();
            }
            break;
        case 'Enter':
            if (gameState.currentScreen === 'start') {
                startGame();
            } else if (gameState.currentScreen === 'end') {
                startGame();
            }
            break;
    }
}

// ========================================
// Screen Management
// ========================================

function showScreen(screenName) {
    // Hide all screens
    Object.values(screens).forEach(screen => {
        screen.classList.remove('active');
    });
    
    // Show target screen
    screens[screenName].classList.add('active');
    gameState.currentScreen = screenName;
}

// ========================================
// Game Flow
// ========================================

function startGame() {
    // Reset game state
    gameState.isPlaying = true;
    gameState.isPaused = false;
    gameState.score = 0;
    gameState.timeRemaining = 10;
    gameState.collectedTypes = new Set();
    gameState.nodes = [];
    gameState.gameStartTime = Date.now();
    gameState.lastNodeSpawn = 0;
    
    // Clear arena
    elements.gameArena.innerHTML = '';
    
    // Reset UI
    updateScore();
    updateTimer();
    updateCollectedNodes();
    
    // Show game screen
    showScreen('game');
    
    // Start game loop
    startGameLoop();
    
    // Spawn initial nodes - guarantee at least 3 different types start
    spawnInitialNodes();
    spawnPenaltyNode(); // Start with a penalty node
}

function pauseGame() {
    if (!gameState.isPlaying || gameState.isPaused) return;
    
    gameState.isPaused = true;
    clearTimers();
    showScreen('pause');
}

function resumeGame() {
    if (!gameState.isPlaying || !gameState.isPaused) return;
    
    gameState.isPaused = false;
    showScreen('game');
    startGameLoop();
}

function quitToStart() {
    endGame(false);
    showScreen('start');
}

function endGame(victory = false) {
    gameState.isPlaying = false;
    gameState.isPaused = false;
    clearTimers();
    
    // Calculate final stats
    const timeUsed = 10 - gameState.timeRemaining;
    const nodesCollected = gameState.collectedTypes.size;
    
    // Update end screen
    elements.finalScore.textContent = gameState.score;
    elements.nodesFound.textContent = `${nodesCollected}/6`;
    elements.timeUsed.textContent = `${timeUsed}s`;
    
    if (victory) {
        elements.endTitle.textContent = 'Knowledge Master!';
        elements.endTitle.className = 'victory';
        elements.endMessage.innerHTML = '<p>🏆 You successfully collected all CAMS content nodes!</p><p>The Knowledge Universe recognizes your mastery.</p>';
    } else {
        elements.endTitle.textContent = 'Mission Incomplete';
        elements.endTitle.className = 'defeat';
        elements.endMessage.innerHTML = '<p>⏰ Time ran out before collecting all node types.</p><p>The Knowledge Universe awaits your return...</p>';
    }
    
    // Generate achievements
    generateAchievements(victory, nodesCollected, timeUsed);
    
    showScreen('end');
}

function generateAchievements(victory, nodesCollected, timeUsed) {
    const achievements = [];
    
    if (victory) {
        achievements.push('🏆 Knowledge Master - Collected all 6 content types!');
        
        if (timeUsed <= 60) {
            achievements.push('⚡ Speed Navigator - Completed in under 60 seconds!');
        }
        
        if (gameState.score >= 1000) {
            achievements.push('💎 High Scorer - Earned over 1000 points!');
        }
    }
    
    if (nodesCollected >= 4) {
        achievements.push('🎯 Node Collector - Found most content types');
    }
    
    if (gameState.score >= 500) {
        achievements.push('📈 Point Accumulator - Solid scoring performance');
    }
    
    // Display achievements
    if (achievements.length > 0) {
        elements.achievementDisplay.innerHTML = `
            <h4>🏅 Achievements Unlocked:</h4>
            ${achievements.map(achievement => `<div class="achievement">${achievement}</div>`).join('')}
        `;
    } else {
        elements.achievementDisplay.innerHTML = '';
    }
}

// ========================================
// Game Loop
// ========================================

function startGameLoop() {
    gameState.gameTimer = setInterval(updateGame, 100); // Update every 100ms
    gameState.spawnTimer = setInterval(spawnRandomNode, gameState.nodeSpawnInterval);
    gameState.penaltySpawnTimer = setInterval(spawnPenaltyNode, gameState.penaltySpawnInterval);
}

function clearTimers() {
    if (gameState.gameTimer) {
        clearInterval(gameState.gameTimer);
        gameState.gameTimer = null;
    }
    if (gameState.spawnTimer) {
        clearInterval(gameState.spawnTimer);
        gameState.spawnTimer = null;
    }
    if (gameState.penaltySpawnTimer) {
        clearInterval(gameState.penaltySpawnTimer);
        gameState.penaltySpawnTimer = null;
    }
}

function updateGame() {
    if (!gameState.isPlaying || gameState.isPaused) return;
    
    // Update timer
    gameState.timeRemaining -= 0.1;
    if (gameState.timeRemaining <= 0) {
        gameState.timeRemaining = 0;
        endGame(false);
        return;
    }
    
    updateTimer();
    
    // Check win condition
    if (gameState.collectedTypes.size === 6) {
        // Bonus points for remaining time
        const timeBonus = Math.floor(gameState.timeRemaining * 10);
        gameState.score += timeBonus;
        updateScore();
        
        endGame(true);
        return;
    }
    
    // Update existing nodes
    updateNodes();
}

// ========================================
// Node Management
// ========================================
// Node Spawning
// ========================================

function spawnInitialNodes() {
    if (!gameState.isPlaying || gameState.isPaused) return;
    
    // Get all non-penalty node types
    const typeNames = Object.keys(nodeTypes).filter(type => !nodeTypes[type].isPenalty);
    
    // Spawn 3-4 different node types immediately to give player a good start
    const initialSpawnCount = Math.min(4, typeNames.length);
    const shuffledTypes = [...typeNames].sort(() => Math.random() - 0.5);
    
    for (let i = 0; i < initialSpawnCount; i++) {
        const position = getRandomPosition();
        createNode(shuffledTypes[i], position.x, position.y);
    }
}

function spawnRandomNode() {
    if (!gameState.isPlaying || gameState.isPaused) return;
    
    // Determine node type to spawn (excluding penalty nodes)
    const nodeType = selectNodeType();
    
    // Get random position
    const position = getRandomPosition();
    
    // Create node
    createNode(nodeType, position.x, position.y);
}

function spawnPenaltyNode() {
    if (!gameState.isPlaying || gameState.isPaused) return;
    
    // 80% chance to spawn a penalty node each time (high rate for challenge)
    if (Math.random() < 0.8) {
        // Get random position
        const position = getRandomPosition();
        
        // 50% chance for decoy node, 50% chance for penalty node
        const penaltyType = Math.random() < 0.5 ? 'decoy' : 'penalty';
        
        // Create penalty node
        createNode(penaltyType, position.x, position.y);
    }
}

function selectNodeType() {
    // Only select from non-penalty nodes since penalty nodes spawn separately
    const typeNames = Object.keys(nodeTypes).filter(type => !nodeTypes[type].isPenalty);
    
    // For 10s game, heavily prioritize uncollected types
    const uncollectedTypes = typeNames.filter(type => !gameState.collectedTypes.has(type));
    
    // If we have uncollected types, always spawn them with high priority
    if (uncollectedTypes.length > 0) {
        // 90% chance to spawn an uncollected type
        if (Math.random() < 0.9) {
            return uncollectedTypes[Math.floor(Math.random() * uncollectedTypes.length)];
        }
    }
    
    // Fallback to weighted random selection
    const weights = typeNames.map(type => {
        let baseWeight = nodeTypes[type].spawnChance;
        // Massive boost for uncollected types
        if (!gameState.collectedTypes.has(type)) {
            baseWeight *= 10; // Much higher multiplier for 10s game
        }
        return baseWeight;
    });
    
    // Weighted random selection
    const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
    const random = Math.random() * totalWeight;
    
    let currentWeight = 0;
    for (let i = 0; i < typeNames.length; i++) {
        currentWeight += weights[i];
        if (random <= currentWeight) {
            return typeNames[i];
        }
    }
    
    return typeNames[0]; // Fallback
}

function getRandomPosition() {
    const arena = elements.gameArena.getBoundingClientRect();
    const nodeSize = 60;
    
    return {
        x: Math.random() * (arena.width - nodeSize * 2) + nodeSize,
        y: Math.random() * (arena.height - nodeSize * 2) + nodeSize
    };
}

function createNode(type, x, y) {
    const nodeConfig = nodeTypes[type];
    
    const node = document.createElement('div');
    node.className = `content-node ${type}`;
    node.textContent = nodeConfig.icon;
    node.style.left = x + 'px';
    node.style.top = y + 'px';
    
    // Add unique ID
    const nodeId = Date.now() + Math.random();
    node.dataset.nodeId = nodeId;
    node.dataset.type = type;
    
    // Add to DOM and tracking
    elements.gameArena.appendChild(node);
    gameState.nodes.push({
        id: nodeId,
        type: type,
        element: node,
        spawnTime: Date.now()
    });
    
    // Add click handler
    node.addEventListener('click', () => collectNode(nodeId));
    
    // Auto-remove after timeout - faster disappearing for competitive play
    const nodeLifetime = nodeConfig.isPenalty ? 4000 : 5000; // Penalty nodes last 4s, others 5s
    setTimeout(() => {
        removeNode(nodeId);
    }, nodeLifetime);
}

function collectNode(nodeId) {
    const nodeIndex = gameState.nodes.findIndex(node => node.id === nodeId);
    if (nodeIndex === -1) return;
    
    const node = gameState.nodes[nodeIndex];
    const nodeConfig = nodeTypes[node.type];
    
    // Handle penalty nodes
    if (nodeConfig.isPenalty) {
        // Reduce time by penalty amount
        gameState.timeRemaining -= nodeConfig.timePenalty;
        if (gameState.timeRemaining < 0) gameState.timeRemaining = 0;
        
        // Visual feedback for penalty
        createPenaltyEffect(node.element);
        
        // Remove node immediately
        removeNode(nodeId);
        updateTimer();
        return;
    }
    
    // Add points for good nodes
    let points = nodeConfig.points;
    
    // Speed bonus
    const nodeAge = Date.now() - node.spawnTime;
    if (nodeAge < 1500) { // Reduced from 2000ms for faster gameplay
        points += 50; // Quick collection bonus
    }
    
    // First collection bonus
    if (!gameState.collectedTypes.has(node.type)) {
        points += 100;
        gameState.collectedTypes.add(node.type);
        updateCollectedNodes();
    }
    
    gameState.score += points;
    updateScore();
    
    // Visual feedback
    node.element.classList.add('collected');
    
    // Remove node
    setTimeout(() => {
        removeNode(nodeId);
    }, 500);
    
    // Spawn effect (optional enhancement point)
    createCollectionEffect(node.element);
}

function removeNode(nodeId) {
    const nodeIndex = gameState.nodes.findIndex(node => node.id === nodeId);
    if (nodeIndex === -1) return;
    
    const node = gameState.nodes[nodeIndex];
    if (node.element.parentNode) {
        node.element.parentNode.removeChild(node.element);
    }
    
    gameState.nodes.splice(nodeIndex, 1);
}

function updateNodes() {
    // Remove old uncollected nodes - faster cleanup for competitive play
    const now = Date.now();
    gameState.nodes.forEach(node => {
        const nodeConfig = nodeTypes[node.type];
        const maxAge = nodeConfig.isPenalty ? 4000 : 5000;
        if (now - node.spawnTime > maxAge) {
            removeNode(node.id);
        }
    });
}

function createCollectionEffect(nodeElement) {
    // Simple particle-like effect
    const rect = nodeElement.getBoundingClientRect();
    const arenaRect = elements.gameArena.getBoundingClientRect();
    
    for (let i = 0; i < 5; i++) {
        const particle = document.createElement('div');
        particle.style.position = 'absolute';
        particle.style.left = (rect.left - arenaRect.left + rect.width/2) + 'px';
        particle.style.top = (rect.top - arenaRect.top + rect.height/2) + 'px';
        particle.style.width = '4px';
        particle.style.height = '4px';
        particle.style.background = nodeElement.style.borderColor || '#00ffff';
        particle.style.borderRadius = '50%';
        particle.style.pointerEvents = 'none';
        particle.style.zIndex = '1000';
        
        elements.gameArena.appendChild(particle);
        
        // Animate particle
        const angle = (Math.PI * 2 * i) / 5;
        const distance = 50;
        const newX = Math.cos(angle) * distance;
        const newY = Math.sin(angle) * distance;
        
        particle.animate([
            { transform: 'translate(0, 0) scale(1)', opacity: 1 },
            { transform: `translate(${newX}px, ${newY}px) scale(0)`, opacity: 0 }
        ], {
            duration: 600,
            easing: 'ease-out'
        }).onfinish = () => {
            if (particle.parentNode) {
                particle.parentNode.removeChild(particle);
            }
        };
    }
}

function createPenaltyEffect(nodeElement) {
    // Red warning effect for penalty nodes
    const rect = nodeElement.getBoundingClientRect();
    const arenaRect = elements.gameArena.getBoundingClientRect();
    
    // Create warning text
    const warning = document.createElement('div');
    warning.textContent = '-3s!';
    warning.style.position = 'absolute';
    warning.style.left = (rect.left - arenaRect.left + rect.width/2) + 'px';
    warning.style.top = (rect.top - arenaRect.top) + 'px';
    warning.style.color = '#ff0000';
    warning.style.fontSize = '1.5rem';
    warning.style.fontWeight = 'bold';
    warning.style.pointerEvents = 'none';
    warning.style.zIndex = '1000';
    warning.style.textShadow = '0 0 10px #ff0000';
    
    elements.gameArena.appendChild(warning);
    
    // Animate warning text
    warning.animate([
        { transform: 'translate(-50%, 0) scale(1)', opacity: 1 },
        { transform: 'translate(-50%, -50px) scale(1.5)', opacity: 0 }
    ], {
        duration: 1000,
        easing: 'ease-out'
    }).onfinish = () => {
        if (warning.parentNode) {
            warning.parentNode.removeChild(warning);
        }
    };
    
    // Screen flash effect
    document.body.style.background = '#330000';
    setTimeout(() => {
        document.body.style.background = '';
    }, 200);
}

function updateScore() {
    elements.score.textContent = gameState.score;
}

function updateTimer() {
    const timeDisplay = Math.ceil(gameState.timeRemaining);
    elements.timer.textContent = timeDisplay;
    
    // Change color based on time remaining
    elements.timer.className = '';
    if (timeDisplay <= 10) {
        elements.timer.classList.add('danger');
    } else if (timeDisplay <= 30) {
        elements.timer.classList.add('warning');
    }
}

function updateCollectedNodes() {
    const slots = elements.collectedNodes.querySelectorAll('.node-slot');
    
    slots.forEach(slot => {
        const type = slot.dataset.type;
        if (gameState.collectedTypes.has(type)) {
            slot.classList.add('collected');
        } else {
            slot.classList.remove('collected');
        }
    });
}

// ========================================
// Start the Game
// ========================================

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', initGame);

// Handle window resize
window.addEventListener('resize', () => {
    if (gameState.isPlaying) {
        // Reposition nodes if they're outside the new viewport
        gameState.nodes.forEach(node => {
            const rect = node.element.getBoundingClientRect();
            const arenaRect = elements.gameArena.getBoundingClientRect();
            
            if (rect.right > arenaRect.right || rect.bottom > arenaRect.bottom) {
                const newPos = getRandomPosition();
                node.element.style.left = newPos.x + 'px';
                node.element.style.top = newPos.y + 'px';
            }
        });
    }
});

// ========================================
// Debug (can be removed in production)
// ========================================

// Expose game state for debugging (remove in production)
window.gameDebug = {
    gameState,
    nodeTypes,
    spawnNode: (type) => {
        const pos = getRandomPosition();
        createNode(type, pos.x, pos.y);
    },
    collectAll: () => {
        Object.keys(nodeTypes).forEach(type => {
            if (!gameState.collectedTypes.has(type)) {
                gameState.collectedTypes.add(type);
            }
        });
        updateCollectedNodes();
    }
};
