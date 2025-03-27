// Game constants
const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 400;
const PLAYER_SIZE = 30;
const GRAVITY = 0.5;
const JUMP_FORCE = -12;
const PLATFORM_JUMP_FORCE = -15.6; // 30% higher than normal jump
const OBSTACLE_WIDTH = 30;
const OBSTACLE_HEIGHT = 60;
const GAME_SPEED = 5;
const OBSTACLE_SPACING = 300;
const ROTATION_SPEED = 0.2; // Speed of rotation in radians per frame
const PLATFORM_WIDTH = 100; // Width of blue platforms
const PLATFORM_CHANCE = 0.3; // 30% chance for a platform instead of an obstacle
const MIN_SPACING = 250; // Minimum space between obstacles
const MAX_SPACING = 450; // Maximum space between obstacles

// Game state
let canvas, ctx;
let player = {
    x: 100,
    y: CANVAS_HEIGHT - PLAYER_SIZE - 10,
    velocityY: 0,
    isJumping: false,
    rotation: 0 // Add rotation property
};
let obstacles = [];
let score = 0;
let gameSpeed = GAME_SPEED;
let isGameOver = false;
let animationId;

// Audio context for sound effects
const audioContext = new (window.AudioContext || window.webkitAudioContext)();

// Initialize game
function init() {
    canvas = document.getElementById('gameCanvas');
    ctx = canvas.getContext('2d');
    
    // Set canvas size
    canvas.width = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;
    
    // Event listeners
    document.addEventListener('keydown', handleInput);
    canvas.addEventListener('click', handleInput);
    document.getElementById('restartButton').addEventListener('click', resetGame);
    
    // Start game
    generateObstacles();
    gameLoop();
}

// Handle user input
function handleInput(event) {
    if (event.type === 'keydown' && event.code !== 'Space') return;
    
    if (!player.isJumping && !isGameOver) {
        // Check if player is on a platform
        let isOnPlatform = false;
        for (const obstacle of obstacles) {
            if (obstacle.isPlatform &&
                player.x < obstacle.x + obstacle.width &&
                player.x + PLAYER_SIZE > obstacle.x &&
                player.y + PLAYER_SIZE > obstacle.y &&
                player.y + PLAYER_SIZE < obstacle.y + obstacle.height + 10) {
                isOnPlatform = true;
                break;
            }
        }
        
        player.velocityY = isOnPlatform ? PLATFORM_JUMP_FORCE : JUMP_FORCE;
        player.isJumping = true;
        player.rotation = 0;
        playJumpSound();
    }
}

// Generate obstacles
function generateObstacles() {
    obstacles = [];
    let x = CANVAS_WIDTH;
    
    while (x < CANVAS_WIDTH * 3) {
        const height = Math.random() * (OBSTACLE_HEIGHT - 30) + 30;
        const isPlatform = Math.random() < PLATFORM_CHANCE;
        const spacing = Math.random() * (MAX_SPACING - MIN_SPACING) + MIN_SPACING;
        
        obstacles.push({
            x: x,
            y: CANVAS_HEIGHT - height - 10,
            width: isPlatform ? PLATFORM_WIDTH : OBSTACLE_WIDTH,
            height: height,
            isPlatform: isPlatform
        });
        x += spacing;
    }
}

// Update game state
function update() {
    if (isGameOver) return;
    
    // Update player
    player.velocityY += GRAVITY;
    player.y += player.velocityY;
    
    // Update rotation when jumping
    if (player.isJumping) {
        player.rotation += ROTATION_SPEED;
    }
    
    // Ground collision
    if (player.y > CANVAS_HEIGHT - PLAYER_SIZE - 10) {
        player.y = CANVAS_HEIGHT - PLAYER_SIZE - 10;
        player.velocityY = 0;
        player.isJumping = false;
        player.rotation = 0;
    }
    
    // Platform collision
    for (const obstacle of obstacles) {
        if (obstacle.isPlatform) {
            if (player.x < obstacle.x + obstacle.width &&
                player.x + PLAYER_SIZE > obstacle.x &&
                player.y + PLAYER_SIZE > obstacle.y &&
                player.y + PLAYER_SIZE < obstacle.y + obstacle.height + 10 &&
                player.velocityY > 0) {
                player.y = obstacle.y - PLAYER_SIZE;
                player.velocityY = 0;
                player.isJumping = false;
                player.rotation = 0;
                break;
            }
        }
    }
    
    // Update obstacles
    obstacles.forEach(obstacle => {
        obstacle.x -= gameSpeed;
    });
    
    // Remove off-screen obstacles
    obstacles = obstacles.filter(obstacle => obstacle.x > -OBSTACLE_WIDTH);
    
    // Generate new obstacles
    if (obstacles[obstacles.length - 1].x < CANVAS_WIDTH) {
        const lastObstacle = obstacles[obstacles.length - 1];
        const height = Math.random() * (OBSTACLE_HEIGHT - 30) + 30;
        const isPlatform = Math.random() < PLATFORM_CHANCE;
        const spacing = Math.random() * (MAX_SPACING - MIN_SPACING) + MIN_SPACING;
        
        obstacles.push({
            x: lastObstacle.x + spacing,
            y: CANVAS_HEIGHT - height - 10,
            width: isPlatform ? PLATFORM_WIDTH : OBSTACLE_WIDTH,
            height: height,
            isPlatform: isPlatform
        });
    }
    
    // Update score
    score++;
    
    // Check collisions
    checkCollisions();
}

// Check for collisions
function checkCollisions() {
    for (const obstacle of obstacles) {
        if (!obstacle.isPlatform) { // Only check collisions with non-platform obstacles
            if (player.x < obstacle.x + obstacle.width &&
                player.x + PLAYER_SIZE > obstacle.x &&
                player.y < obstacle.y + obstacle.height &&
                player.y + PLAYER_SIZE > obstacle.y) {
                gameOver();
                return;
            }
        }
    }
}

// Render game
function render() {
    // Clear canvas
    ctx.fillStyle = '#2a2a2a';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    
    // Draw ground
    ctx.fillStyle = '#3a3a3a';
    ctx.fillRect(0, CANVAS_HEIGHT - 10, CANVAS_WIDTH, 10);
    
    // Draw player with rotation
    ctx.save();
    ctx.translate(player.x + PLAYER_SIZE/2, player.y + PLAYER_SIZE/2);
    ctx.rotate(player.rotation);
    ctx.fillStyle = '#4CAF50';
    ctx.fillRect(-PLAYER_SIZE/2, -PLAYER_SIZE/2, PLAYER_SIZE, PLAYER_SIZE);
    ctx.restore();
    
    // Draw obstacles and platforms
    obstacles.forEach(obstacle => {
        ctx.fillStyle = obstacle.isPlatform ? '#4444ff' : '#ff4444';
        ctx.fillRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
    });
    
    // Update score display
    document.getElementById('score').textContent = `Score: ${Math.floor(score / 10)}`;
}

// Game loop
function gameLoop() {
    update();
    render();
    animationId = requestAnimationFrame(gameLoop);
}

// Game over
function gameOver() {
    isGameOver = true;
    cancelAnimationFrame(animationId);
    document.getElementById('gameOver').classList.remove('hidden');
    document.getElementById('finalScore').textContent = Math.floor(score / 10);
    playCollisionSound();
}

// Reset game
function resetGame() {
    player.y = CANVAS_HEIGHT - PLAYER_SIZE - 10;
    player.velocityY = 0;
    player.isJumping = false;
    player.rotation = 0; // Reset rotation
    obstacles = [];
    score = 0;
    gameSpeed = GAME_SPEED;
    isGameOver = false;
    document.getElementById('gameOver').classList.add('hidden');
    generateObstacles();
    gameLoop();
}

// Sound effects
function playJumpSound() {
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(440, audioContext.currentTime);
    gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
    
    oscillator.start();
    oscillator.stop(audioContext.currentTime + 0.1);
}

function playCollisionSound() {
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.type = 'square';
    oscillator.frequency.setValueAtTime(220, audioContext.currentTime);
    gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
    
    oscillator.start();
    oscillator.stop(audioContext.currentTime + 0.2);
}

// Start the game when the page loads
window.addEventListener('load', init); 