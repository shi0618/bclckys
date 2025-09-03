const canvas = document.getElementById('tetris');
const context = canvas.getContext('2d');
const scoreElement = document.getElementById('score');
const startScreen = document.getElementById('start-screen');
const gameControls = document.getElementById('game-controls');
const scoreDisplay = document.querySelector('.score');
const messageOverlay = document.getElementById('message-overlay');
const backButton = document.getElementById('back-button');
const messageText = document.getElementById('message-text');
const nextCanvas = document.getElementById('next-blocks');
const nextContext = nextCanvas.getContext('2d');
const nextTitle = document.getElementById('next-title');
const pauseMenu = document.getElementById('pause-menu');
const resumeButton = document.getElementById('resume-button');
const homeButton = document.getElementById('home-button');
const pauseButton = document.getElementById('pause-button');

const BLOCK_SIZE = 20;
const COLS = 12;
const ROWS = 24;
const INITIAL_DROP_INTERVAL = 1000;
const DROP_SPEED_INCREMENT = 20;
const MIN_DROP_INTERVAL = 100;

let score = 0;
let isGameOver = false;
let isPaused = false;
let animationFrameId;

const board = Array.from({ length: ROWS }, () => Array(COLS).fill(0));

const tetrominos = [
    // I - シアン
    {
        matrix: [
            [0, 1, 0, 0],
            [0, 1, 0, 0],
            [0, 1, 0, 0],
            [0, 1, 0, 0]
        ],
        color: 'cyan'
    },
    // O - イエロー
    {
        matrix: [
            [1, 1],
            [1, 1]
        ],
        color: 'yellow'
    },
    // T - パープル
    {
        matrix: [
            [0, 1, 0],
            [1, 1, 1],
            [0, 0, 0]
        ],
        color: 'purple'
    },
    // L - オレンジ
    {
        matrix: [
            [0, 0, 1],
            [1, 1, 1],
            [0, 0, 0]
        ],
        color: 'orange'
    },
    // J - ブルー
    {
        matrix: [
            [1, 0, 0],
            [1, 1, 1],
            [0, 0, 0]
        ],
        color: 'blue'
    },
    // Z - レッド
    {
        matrix: [
            [1, 1, 0],
            [0, 1, 1],
            [0, 0, 0]
        ],
        color: 'red'
    },
    // S - グリーン
    {
        matrix: [
            [0, 1, 1],
            [1, 1, 0],
            [0, 0, 0]
        ],
        color: 'green'
    }
];

let nextBlocks = [];
let lastUsedTetrominoIndex = -1;

function getNextBlock() {
    if (nextBlocks.length === 0) {
        nextBlocks.push(createRandomBlock());
        nextBlocks.push(createRandomBlock());
    }
    const nextBlock = nextBlocks.shift();
    nextBlocks.push(createRandomBlock());
    return {
        matrix: nextBlock.matrix,
        color: nextBlock.color,
        x: Math.floor(COLS / 2) - Math.floor(nextBlock.matrix[0].length / 2),
        y: 0
    };
}

function createRandomBlock() {
    let newIndex;
    do {
        newIndex = Math.floor(Math.random() * tetrominos.length);
    } while (newIndex === lastUsedTetrominoIndex);

    lastUsedTetrominoIndex = newIndex;
    const randomTetromino = tetrominos[newIndex];
    return {
        matrix: randomTetromino.matrix,
        color: randomTetromino.color,
    };
}

let currentBlock = null;

let dropCounter = 0;
let dropInterval = INITIAL_DROP_INTERVAL;
let lastTime = 0;

function rotateBlock(matrix) {
    const newMatrix = matrix[0].map((_, colIndex) => matrix.map(row => row[colIndex]).reverse());
    return newMatrix;
}

function collide(board, block) {
    if (!block) return false;
    for (let y = 0; y < block.matrix.length; y++) {
        for (let x = 0; x < block.matrix[y].length; x++) {
            if (block.matrix[y][x] !== 0) {
                const boardX = block.x + x;
                const boardY = block.y + y;
                if (boardX < 0 || boardX >= COLS || boardY >= ROWS || (boardY >= 0 && board[boardY][boardX] !== 0)) {
                    return true;
                }
            }
        }
    }
    return false;
}

function hardDrop() {
    while (!collide(board, currentBlock)) {
        currentBlock.y++;
    }
    currentBlock.y--;
    fixBlockOnBoard();
}

function fixBlockOnBoard() {
    for (let y = 0; y < currentBlock.matrix.length; y++) {
        for (let x = 0; x < currentBlock.matrix[y].length; x++) {
            if (currentBlock.matrix[y][x] !== 0) {
                board[currentBlock.y + y][currentBlock.x + x] = currentBlock.color;
            }
        }
    }

    let linesCleared = 0;
    for (let y = ROWS - 1; y >= 0; ) {
        let rowFilled = true;
        for (let x = 0; x < COLS; x++) {
            if (board[y][x] === 0) {
                rowFilled = false;
                break;
            }
        }
        if (rowFilled) {
            board.splice(y, 1);
            board.unshift(Array(COLS).fill(0));
            linesCleared++;
        } else {
            y--;
        }
    }

    if (linesCleared > 0) {
        score += 100 * linesCleared * linesCleared;
        scoreElement.textContent = score;

        dropInterval = Math.max(dropInterval - DROP_SPEED_INCREMENT, MIN_DROP_INTERVAL);
    }

    currentBlock = getNextBlock();
    if (collide(board, currentBlock)) {
        gameOver();
    }
}

function update(time = 0) {
    if (isGameOver || isPaused) {
        return;
    }

    const deltaTime = time - lastTime;
    lastTime = time;
    dropCounter += deltaTime;

    if (dropCounter > dropInterval) {
        currentBlock.y++;
        if (collide(board, currentBlock)) {
            currentBlock.y--;
            fixBlockOnBoard();
        }
        dropCounter = 0;
    }

    draw();
    drawNextBlocks();
    animationFrameId = requestAnimationFrame(update);
}

function draw() {
    context.fillStyle = '#111';
    context.fillRect(0, 0, canvas.width, canvas.height);

    for (let y = 0; y < ROWS; y++) {
        for (let x = 0; x < COLS; x++) {
            context.strokeStyle = '#34495e';
            context.strokeRect(x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);

            if (board[y][x] !== 0) {
                context.fillStyle = board[y][x];
                context.fillRect(x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
                context.strokeStyle = 'black';
                context.lineWidth = 2;
                context.strokeRect(x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
            }
        }
    }

    const ghostBlock = { ...currentBlock };
    while (!collide(board, ghostBlock)) {
        ghostBlock.y++;
    }
    ghostBlock.y--;
    for (let y = 0; y < ghostBlock.matrix.length; y++) {
        for (let x = 0; x < ghostBlock.matrix[y].length; x++) {
            if (ghostBlock.matrix[y][x] !== 0) {
                context.fillStyle = 'rgba(255, 255, 255, 0.2)';
                context.fillRect((ghostBlock.x + x) * BLOCK_SIZE, (ghostBlock.y + y) * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
            }
        }
    }

    for (let y = 0; y < currentBlock.matrix.length; y++) {
        for (let x = 0; x < currentBlock.matrix[y].length; x++) {
            if (currentBlock.matrix[y][x] !== 0) {
                context.fillStyle = currentBlock.color;
                context.fillRect((currentBlock.x + x) * BLOCK_SIZE, (currentBlock.y + y) * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
                context.strokeStyle = 'black';
                context.lineWidth = 2;
                context.strokeRect((currentBlock.x + x) * BLOCK_SIZE, (currentBlock.y + y) * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
            }
        }
    }
}

function drawNextBlocks() {
    nextContext.fillStyle = '#111';
    nextContext.fillRect(0, 0, nextCanvas.width, nextCanvas.height);

    const blockSpacing = 20;
    let currentY = blockSpacing;

    for (let i = 0; i < nextBlocks.length; i++) {
        const block = nextBlocks[i];
        
        const isIBlock = block.matrix.length === 4;
        const matrixSize = isIBlock ? 4 : 3;

        const offsetX = (nextCanvas.width - matrixSize * BLOCK_SIZE) / 2;
        const offsetY = currentY;

        for (let y = 0; y < block.matrix.length; y++) {
            for (let x = 0; x < block.matrix[y].length; x++) {
                if (block.matrix[y][x] !== 0) {
                    nextContext.fillStyle = block.color;
                    nextContext.fillRect(offsetX + x * BLOCK_SIZE, offsetY + y * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
                    nextContext.strokeStyle = 'black';
                    nextContext.lineWidth = 2;
                    nextContext.strokeRect(offsetX + x * BLOCK_SIZE, offsetY + y * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
                }
            }
        }
        currentY += (block.matrix.length * BLOCK_SIZE) + blockSpacing;
    }
}

function togglePause() {
    isPaused = !isPaused;
    if (isPaused) {
        pauseMenu.style.display = 'flex';
        cancelAnimationFrame(animationFrameId);
    } else {
        pauseMenu.style.display = 'none';
        update();
    }
}

function gameOver() {
    isGameOver = true;
    cancelAnimationFrame(animationFrameId);

    context.fillStyle = 'rgba(0, 0, 0, 0.7)';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = 'white';
    context.font = '30px Arial';
    context.textAlign = 'center';
    context.fillText('ゲームオーバー', canvas.width / 2, canvas.height / 2);

    setTimeout(() => {
        resetGame();
    }, 3000);
}

function resetGame() {
    isGameOver = false;
    isPaused = false;
    board.forEach(row => row.fill(0));
    score = 0;
    scoreElement.textContent = score;
    nextBlocks = [];
    lastUsedTetrominoIndex = -1;
    dropInterval = INITIAL_DROP_INTERVAL;
    currentBlock = getNextBlock();
    
    // コントローラーの状態をリセット
    lastDirection = null;
    keys.ArrowLeft = false;
    keys.ArrowRight = false;
    for (const key in activeButtons) {
        delete activeButtons[key];
    }
    clearTimeout(repeatTimer);
    clearInterval(repeatInterval);
    repeatTimer = null;
    repeatInterval = null;

    update();
}

function showGame() {
    startScreen.style.display = 'none';
    messageOverlay.style.display = 'none';
    scoreDisplay.style.display = 'block';
    document.querySelector('.game-container').style.display = 'flex';
    canvas.style.display = 'block';
    nextTitle.style.display = 'block';
    nextCanvas.style.display = 'block';
    gameControls.style.display = 'flex';
    resetGame();
}

function showStartScreen() {
    startScreen.style.display = 'flex';
    messageOverlay.style.display = 'none';
    scoreDisplay.style.display = 'none';
    document.querySelector('.game-container').style.display = 'none';
    canvas.style.display = 'none';
    nextTitle.style.display = 'none';
    nextCanvas.style.display = 'none';
    gameControls.style.display = 'none';
    pauseMenu.style.display = 'none';
    isPaused = false;
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
    }
}

function showMessage(message) {
    messageText.textContent = message;
    messageOverlay.style.display = 'flex';
}

// --------------------- コントローラー操作の最終修正 ---------------------
let repeatTimer = null;
let repeatInterval = null;
const REPEAT_DELAY = 150;
const REPEAT_START = 500;
const activeButtons = {};

function handleButtonAction(key) {
    if (isGameOver || isPaused) {
        return;
    }

    let nextBlock = { ...currentBlock };
    let moved = false;

    if (key === 'ArrowLeft') {
        nextBlock.x--;
        moved = true;
    } else if (key === 'ArrowRight') {
        nextBlock.x++;
        moved = true;
    } else if (key === 'ArrowDown') {
        nextBlock.y++;
        moved = true;
    } else if (key === 'Space') {
        nextBlock.matrix = rotateBlock(currentBlock.matrix);
        moved = true;
    }

    if (moved && !collide(board, nextBlock)) {
        currentBlock = nextBlock;
    } else if (key === 'ArrowDown' && moved) {
        fixBlockOnBoard();
    }
}

function startRepeating(key) {
    if (activeButtons[key]) return;
    activeButtons[key] = true;

    if (key === 'ArrowLeft' || key === 'ArrowRight' || key === 'ArrowDown') {
        handleButtonAction(key);

        repeatTimer = setTimeout(() => {
            repeatInterval = setInterval(() => {
                handleButtonAction(key);
            }, REPEAT_DELAY);
        }, REPEAT_START);

    } else {
        handleButtonAction(key);
    }
}

function stopRepeating(key) {
    delete activeButtons[key];

    clearTimeout(repeatTimer);
    clearInterval(repeatInterval);
    repeatTimer = null;
    repeatInterval = null;
}


// --------------------- ボタン操作（長押し・タッチなし版） ---------------------
document.querySelectorAll('.mode-button').forEach(button => {
    button.addEventListener('click', event => {
        const mode = event.target.dataset.mode;
        if (mode === 'solo') {
            showGame();
        } else if (mode === 'multi') {
            showMessage('開発中です');
        }
    });
});

backButton.addEventListener('click', showStartScreen);
resumeButton.addEventListener('click', togglePause);
homeButton.addEventListener('click', showStartScreen);
pauseButton.addEventListener('click', togglePause);

document.querySelectorAll('.control-button').forEach(button => {
    const key = button.dataset.key;
    
    // Enter, Reset, Pauseなど特別ボタン
    if (key === 'Enter') {
        button.addEventListener('click', () => hardDrop());
        return;
    }
    if (key === 'Reset') {
        button.addEventListener('click', () => resetGame());
        return;
    }
    if (key === 'Pause') {
        button.addEventListener('click', () => togglePause());
        return;
    }

    // 通常の方向キーやスペースはクリック1回だけで反応
    button.addEventListener('click', () => handleButtonAction(key));
});


// --------------------- キーボードイベントの最終修正 ---------------------
let lastDirection = null;

const keys = {
    'ArrowLeft': false,
    'ArrowRight': false
};

document.addEventListener('keydown', event => {
    if (isPaused || isGameOver) {
        return;
    }

    if (event.code === 'Escape') {
        if (!isGameOver) {
            togglePause();
        }
        return;
    }

    if (event.code === 'ArrowLeft' || event.code === 'ArrowRight') {
        if (!keys[event.code]) {
            keys[event.code] = true;
            lastDirection = event.code;
            if (!event.repeat) {
                handleButtonAction(event.code);
            }
        }
    } else if (event.code === 'ArrowDown') {
        handleButtonAction(event.code);
    } else if (event.code === 'Space') {
        handleButtonAction(event.code);
    } else if (event.code === 'Enter') {
        hardDrop();
    }
});

document.addEventListener('keyup', event => {
    if (event.code === 'ArrowLeft' || event.code === 'ArrowRight') {
        keys[event.code] = false;
        if (lastDirection === event.code) {
            if (keys['ArrowLeft']) {
                lastDirection = 'ArrowLeft';
                handleButtonAction('ArrowLeft');
            } else if (keys['ArrowRight']) {
                lastDirection = 'ArrowRight';
                handleButtonAction('ArrowRight');
            } else {
                lastDirection = null;
            }
        }
    }
});