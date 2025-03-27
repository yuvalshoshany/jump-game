// Game constants
const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 400;
const PLAYER_SIZE = 30;
const GRAVITY = 0.63;
const JUMP_FORCE = -12;
const PLATFORM_JUMP_FORCE = -15.6; // 30% higher than normal jump
const OBSTACLE_WIDTH = 30;
const OBSTACLE_HEIGHT = 60;
const GAME_SPEED = 8;
const OBSTACLE_SPACING = 300;
const ROTATION_SPEED = 0.2; // Speed of rotation in radians per frame
const PLATFORM_WIDTH = 100; // Width of blue platforms
const PLATFORM_CHANCE = 0.3; // 30% chance for a platform instead of an obstacle
const MIN_SPACING = 200; // Increased minimum space between obstacles
const MAX_SPACING = 350; // Increased maximum space between obstacles
const PLATFORM_MOVE_SPEED = 0.5; // Speed of platform height changes
const PLATFORM_MOVE_RANGE = 50; // How much platforms can move up/down
const GROUND_MOVE_SPEED = 0.3;
const GROUND_MOVE_RANGE = 50; // Reduced range to keep ground visible
const GROUND_SEGMENT_WIDTH = 100;
const GROUND_HEIGHT = 10;
const MIN_GROUND_Y = CANVAS_HEIGHT - GROUND_HEIGHT; // Minimum Y position for ground
const SPIKE_SPACING = 5; // Reduced space between spikes in a group

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
let groundSegments = []; // Array to store ground segments
let score = 0;
let gameSpeed = GAME_SPEED;
let isGameOver = false;
let animationId;
let groundOffset = 0; // Global ground offset for consistent movement
let groundMoveSpeed = GROUND_MOVE_SPEED; // Separate variable for ground movement speed

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
    
    // Initialize ground segments
    initGroundSegments();
    
    // Start game
    generateObstacles();
    gameLoop();
}

// Initialize ground segments
function initGroundSegments() {
    groundSegments = [];
    let x = 0;
    groundOffset = 0;
    
    // Create enough segments to cover the screen and some extra
    while (x < CANVAS_WIDTH * 2) {
        groundSegments.push({
            x: x,
            y: MIN_GROUND_Y,
            width: GROUND_SEGMENT_WIDTH,
            height: GROUND_HEIGHT
        });
        x += GROUND_SEGMENT_WIDTH;
    }
}

// Update ground segments
function updateGround() {
    // Update global ground offset
    groundOffset += groundMoveSpeed;
    
    // Constrain ground movement
    if (groundOffset > GROUND_MOVE_RANGE) {
        groundOffset = GROUND_MOVE_RANGE;
        groundMoveSpeed = -GROUND_MOVE_SPEED;
    } else if (groundOffset < 0) {
        groundOffset = 0;
        groundMoveSpeed = GROUND_MOVE_SPEED;
    }
    
    // Move segments left and update their Y position
    groundSegments.forEach(segment => {
        segment.x -= gameSpeed;
        segment.y = MIN_GROUND_Y - groundOffset;
    });
    
    // Remove off-screen segments
    groundSegments = groundSegments.filter(segment => segment.x > -GROUND_SEGMENT_WIDTH);
    
    // Add new segments at the right
    const lastSegment = groundSegments[groundSegments.length - 1];
    if (lastSegment.x < CANVAS_WIDTH) {
        groundSegments.push({
            x: lastSegment.x + GROUND_SEGMENT_WIDTH,
            y: MIN_GROUND_Y - groundOffset,
            width: GROUND_SEGMENT_WIDTH,
            height: GROUND_HEIGHT
        });
    }
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
        const isPlatform = Math.random() < PLATFORM_CHANCE;
        const spacing = Math.random() * (MAX_SPACING - MIN_SPACING) + MIN_SPACING;
        
        if (isPlatform) {
            const height = Math.random() * (OBSTACLE_HEIGHT - 30) + 30;
            obstacles.push({
                x: x,
                y: MIN_GROUND_Y - height,
                width: PLATFORM_WIDTH,
                height: height,
                isPlatform: true
            });
        } else {
            const numSpikes = Math.floor(Math.random() * 3) + 1; // Random number between 1 and 3
            const baseHeight = Math.random() * (OBSTACLE_HEIGHT - 20) + 20;
            const spikeHeights = Array(numSpikes).fill(0).map(() => 
                baseHeight * (0.5 + Math.random() * 0.4) // Heights between 50% and 90% of base height
            );
            obstacles.push({
                x: x,
                y: MIN_GROUND_Y - Math.max(...spikeHeights),
                width: OBSTACLE_WIDTH * numSpikes + SPIKE_SPACING * (numSpikes - 1),
                height: Math.max(...spikeHeights),
                isPlatform: false,
                isSpike: true,
                numSpikes: numSpikes,
                spikeHeights: spikeHeights
            });
        }
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
    
    // Update ground
    updateGround();
    
    // Update obstacle positions
    obstacles.forEach(obstacle => {
        obstacle.x -= gameSpeed;
        obstacle.y = MIN_GROUND_Y - obstacle.height - groundOffset;
    });
    
    // Ground collision
    let isOnGround = false;
    for (const segment of groundSegments) {
        if (player.x < segment.x + segment.width &&
            player.x + PLAYER_SIZE > segment.x &&
            player.y + PLAYER_SIZE > segment.y &&
            player.y + PLAYER_SIZE < segment.y + segment.height + 10 &&
            player.velocityY > 0) {
            player.y = segment.y - PLAYER_SIZE;
            player.velocityY = 0;
            player.isJumping = false;
            player.rotation = 0;
            isOnGround = true;
            break;
        }
    }
    
    // Platform collision (only if not on ground)
    if (!isOnGround) {
        for (const obstacle of obstacles) {
            if (obstacle.isPlatform) {
                // Check for top collision
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
                
                // Check for left side collision
                if (player.x + PLAYER_SIZE > obstacle.x &&
                    player.x + PLAYER_SIZE < obstacle.x + 10 &&
                    player.y < obstacle.y + obstacle.height &&
                    player.y + PLAYER_SIZE > obstacle.y) {
                    player.x = obstacle.x - PLAYER_SIZE;
                    player.velocityY = JUMP_FORCE * 0.5; // Bounce with reduced force
                    player.isJumping = true;
                    player.rotation = 0;
                    playJumpSound();
                    break;
                }
                
                // Check for right side collision
                if (player.x < obstacle.x + obstacle.width &&
                    player.x > obstacle.x + obstacle.width - 10 &&
                    player.y < obstacle.y + obstacle.height &&
                    player.y + PLAYER_SIZE > obstacle.y) {
                    player.x = obstacle.x + obstacle.width;
                    player.velocityY = JUMP_FORCE * 0.5; // Bounce with reduced force
                    player.isJumping = true;
                    player.rotation = 0;
                    playJumpSound();
                    break;
                }
            }
        }
    }
    
    // Remove off-screen obstacles
    obstacles = obstacles.filter(obstacle => obstacle.x > -OBSTACLE_WIDTH);
    
    // Generate new obstacles
    if (obstacles[obstacles.length - 1].x < CANVAS_WIDTH) {
        const lastObstacle = obstacles[obstacles.length - 1];
        const spacing = Math.random() * (MAX_SPACING - MIN_SPACING) + MIN_SPACING;
        const isPlatform = Math.random() < PLATFORM_CHANCE;
        
        if (isPlatform) {
            const height = Math.random() * (OBSTACLE_HEIGHT - 30) + 30;
            obstacles.push({
                x: lastObstacle.x + spacing,
                y: MIN_GROUND_Y - height,
                width: PLATFORM_WIDTH,
                height: height,
                isPlatform: true
            });
        } else {
            const numSpikes = Math.floor(Math.random() * 3) + 1; // Random number between 1 and 3
            const baseHeight = Math.random() * (OBSTACLE_HEIGHT - 20) + 20;
            const spikeHeights = Array(numSpikes).fill(0).map(() => 
                baseHeight * (0.5 + Math.random() * 0.4) // Heights between 50% and 90% of base height
            );
            obstacles.push({
                x: lastObstacle.x + spacing,
                y: MIN_GROUND_Y - Math.max(...spikeHeights),
                width: OBSTACLE_WIDTH * numSpikes + SPIKE_SPACING * (numSpikes - 1),
                height: Math.max(...spikeHeights),
                isPlatform: false,
                isSpike: true,
                numSpikes: numSpikes,
                spikeHeights: spikeHeights
            });
        }
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
    
    // Draw ground segments
    groundSegments.forEach(segment => {
        ctx.fillStyle = '#3a3a3a';
        ctx.fillRect(segment.x, segment.y, segment.width, segment.height);
    });
    
    // Draw player with rotation
    ctx.save();
    ctx.translate(player.x + PLAYER_SIZE/2, player.y + PLAYER_SIZE/2);
    ctx.rotate(player.rotation);
    ctx.fillStyle = '#4CAF50';
    ctx.fillRect(-PLAYER_SIZE/2, -PLAYER_SIZE/2, PLAYER_SIZE, PLAYER_SIZE);
    ctx.restore();
    
    // Draw obstacles and platforms
    obstacles.forEach(obstacle => {
        if (obstacle.isPlatform) {
            // Draw platform
            ctx.fillStyle = '#4444ff';
            ctx.fillRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
        } else {
            // Draw spike group
            ctx.fillStyle = '#ff4444';
            for (let i = 0; i < obstacle.numSpikes; i++) {
                const spikeX = obstacle.x + (OBSTACLE_WIDTH + SPIKE_SPACING) * i;
                const spikeHeight = obstacle.spikeHeights[i];
                const spikeY = obstacle.y + obstacle.height - spikeHeight;
                ctx.beginPath();
                ctx.moveTo(spikeX, spikeY + spikeHeight);
                ctx.lineTo(spikeX + OBSTACLE_WIDTH, spikeY + spikeHeight);
                ctx.lineTo(spikeX + OBSTACLE_WIDTH/2, spikeY);
                ctx.closePath();
                ctx.fill();
            }
        }
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
    animationId = null;
    document.getElementById('gameOver').classList.remove('hidden');
    document.getElementById('finalScore').textContent = Math.floor(score / 10);
    playCollisionSound();
}

// Reset game
function resetGame() {
    // Cancel any existing animation frame
    if (animationId) {
        cancelAnimationFrame(animationId);
        animationId = null;
    }
    
    player.y = CANVAS_HEIGHT - PLAYER_SIZE - 10;
    player.velocityY = 0;
    player.isJumping = false;
    player.rotation = 0;
    obstacles = [];
    groundOffset = 0;
    groundMoveSpeed = GROUND_MOVE_SPEED; // Reset ground movement speed
    initGroundSegments();
    score = 0;
    gameSpeed = GAME_SPEED; // Reset game speed to initial constant
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