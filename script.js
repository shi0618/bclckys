// --------------------- DOM ---------------------
const canvas = document.getElementById('tetris');
const context = canvas.getContext('2d');
const nextCanvas = document.getElementById('next-blocks');
const nextContext = nextCanvas.getContext('2d');
const scoreElement = document.getElementById('score');
const pauseMenu = document.getElementById('pause-menu');

// --------------------- 定数 ---------------------
const BLOCK_SIZE = 20;
const COLS = 12;
const ROWS = 24;
const INITIAL_DROP_INTERVAL = 1000;
const DROP_SPEED_INCREMENT = 20;
const MIN_DROP_INTERVAL = 100;

// --------------------- ゲーム状態 ---------------------
let board = Array.from({length: ROWS}, () => Array(COLS).fill(0));
let score = 0;
let isGameOver = false;
let isPaused = false;
let dropCounter = 0;
let dropInterval = INITIAL_DROP_INTERVAL;
let lastTime = 0;
let animationFrameId;

// --------------------- テトリミノ ---------------------
const tetrominos = [
  {matrix:[[0,1,0,0],[0,1,0,0],[0,1,0,0],[0,1,0,0]], color:'cyan'},
  {matrix:[[1,1],[1,1]], color:'yellow'},
  {matrix:[[0,1,0],[1,1,1],[0,0,0]], color:'purple'},
  {matrix:[[0,0,1],[1,1,1],[0,0,0]], color:'orange'},
  {matrix:[[1,0,0],[1,1,1],[0,0,0]], color:'blue'},
  {matrix:[[1,1,0],[0,1,1],[0,0,0]], color:'red'},
  {matrix:[[0,1,1],[1,1,0],[0,0,0]], color:'green'}
];

// --------------------- ブロック管理 ---------------------
let currentBlock = null;
let nextBlocks = [];
let lastUsedIndex = -1;

// --------------------- ヘルパー ---------------------
function createRandomBlock(){
    let index;
    do { index = Math.floor(Math.random()*tetrominos.length); }
    while(index === lastUsedIndex);
    lastUsedIndex = index;
    const t = tetrominos[index];
    return {matrix:t.matrix, color:t.color};
}

function getNextBlock(){
    if(nextBlocks.length === 0){
        nextBlocks.push(createRandomBlock());
        nextBlocks.push(createRandomBlock());
    }
    const block = nextBlocks.shift();
    nextBlocks.push(createRandomBlock());
    return {
        matrix:block.matrix,
        color:block.color,
        x:Math.floor(COLS/2)-Math.floor(block.matrix[0].length/2),
        y:0
    };
}

function rotate(matrix){
    return matrix[0].map((_,i)=>matrix.map(row=>row[i]).reverse());
}

function collide(board, block){
    if(!block) return false;
    for(let y=0;y<block.matrix.length;y++){
        for(let x=0;x<block.matrix[y].length;x++){
            if(block.matrix[y][x] !== 0){
                const boardX = block.x + x;
                const boardY = block.y + y;
                if(boardX<0 || boardX>=COLS || boardY>=ROWS || (boardY>=0 && board[boardY][boardX]!==0)) return true;
            }
        }
    }
    return false;
}

function fixBlock(){
    for(let y=0;y<currentBlock.matrix.length;y++){
        for(let x=0;x<currentBlock.matrix[y].length;x++){
            if(currentBlock.matrix[y][x]!==0){
                board[currentBlock.y+y][currentBlock.x+x] = currentBlock.color;
            }
        }
    }
    let linesCleared = 0;
    for(let y=ROWS-1;y>=0;){
        if(board[y].every(cell=>cell!==0)){
            board.splice(y,1);
            board.unshift(Array(COLS).fill(0));
            linesCleared++;
        } else y--;
    }
    if(linesCleared>0){
        score += 100*linesCleared*linesCleared;
        scoreElement.textContent = score;
        dropInterval = Math.max(dropInterval - DROP_SPEED_INCREMENT, MIN_DROP_INTERVAL);
    }
    currentBlock = getNextBlock();
    if(collide(board,currentBlock)) gameOver();
}

function hardDrop(){
    while(!collide(board,currentBlock)) currentBlock.y++;
    currentBlock.y--;
    fixBlock();
}

// --------------------- 描画 ---------------------
function drawBoard(){
    context.fillStyle='#111';
    context.fillRect(0,0,canvas.width,canvas.height);
    for(let y=0;y<ROWS;y++){
        for(let x=0;x<COLS;x++){
            context.strokeStyle='#34495e';
            context.strokeRect(x*BLOCK_SIZE,y*BLOCK_SIZE,BLOCK_SIZE,BLOCK_SIZE);
            if(board[y][x]!==0){
                context.fillStyle=board[y][x];
                context.fillRect(x*BLOCK_SIZE,y*BLOCK_SIZE,BLOCK_SIZE,BLOCK_SIZE);
                context.strokeStyle='black';
                context.lineWidth=2;
                context.strokeRect(x*BLOCK_SIZE,y*BLOCK_SIZE,BLOCK_SIZE,BLOCK_SIZE);
            }
        }
    }
    const ghost = {...currentBlock};
    while(!collide(board,ghost)) ghost.y++;
    ghost.y--;
    for(let y=0;y<ghost.matrix.length;y++)
        for(let x=0;x<ghost.matrix[y].length;x++)
            if(ghost.matrix[y][x]!==0){
                context.fillStyle='rgba(255,255,255,0.2)';
                context.fillRect((ghost.x+x)*BLOCK_SIZE,(ghost.y+y)*BLOCK_SIZE,BLOCK_SIZE,BLOCK_SIZE);
            }
    for(let y=0;y<currentBlock.matrix.length;y++)
        for(let x=0;x<currentBlock.matrix[y].length;x++)
            if(currentBlock.matrix[y][x]!==0){
                context.fillStyle=currentBlock.color;
                context.fillRect((currentBlock.x+x)*BLOCK_SIZE,(currentBlock.y+y)*BLOCK_SIZE,BLOCK_SIZE,BLOCK_SIZE);
                context.strokeStyle='black';
                context.lineWidth=2;
                context.strokeRect((currentBlock.x+x)*BLOCK_SIZE,(currentBlock.y+y)*BLOCK_SIZE,BLOCK_SIZE,BLOCK_SIZE);
            }
}

function drawNext(){
    nextContext.fillStyle='#111';
    nextContext.fillRect(0,0,nextCanvas.width,nextCanvas.height);
    const spacing = 20;
    let currentY = spacing;
    for(let block of nextBlocks){
        const matrixSize = block.matrix.length === 4 ? 4 : 3;
        const offsetX = (nextCanvas.width - matrixSize*BLOCK_SIZE)/2;
        const offsetY = currentY;
        for(let y=0;y<block.matrix.length;y++)
            for(let x=0;x<block.matrix[y].length;x++)
                if(block.matrix[y][x]!==0){
                    nextContext.fillStyle=block.color;
                    nextContext.fillRect(offsetX+x*BLOCK_SIZE,offsetY+y*BLOCK_SIZE,BLOCK_SIZE,BLOCK_SIZE);
                    nextContext.strokeStyle='black';
                    nextContext.lineWidth=2;
                    nextContext.strokeRect(offsetX+x*BLOCK_SIZE,offsetY+y*BLOCK_SIZE,BLOCK_SIZE,BLOCK_SIZE);
                }
        currentY += block.matrix.length*BLOCK_SIZE + spacing;
    }
}

// --------------------- 更新 ---------------------
function update(time=0){
    if(isGameOver || isPaused) return;
    const deltaTime = time - lastTime;
    lastTime = time;
    dropCounter += deltaTime;
    if(dropCounter > dropInterval){
        currentBlock.y++;
        if(collide(board,currentBlock)){
            currentBlock.y--;
            fixBlock();
        }
        dropCounter=0;
    }
    drawBoard();
    drawNext();
    animationFrameId = requestAnimationFrame(update);
}

// --------------------- ポーズ・ゲームオーバー ---------------------
function togglePause(){
    isPaused = !isPaused;
    pauseMenu.style.display = isPaused ? 'flex' : 'none';
    if(isPaused) cancelAnimationFrame(animationFrameId);
    else update();
}

function gameOver(){
    isGameOver = true;
    cancelAnimationFrame(animationFrameId);
    context.fillStyle='rgba(0,0,0,0.7)';
    context.fillRect(0,0,canvas.width,canvas.height);
    context.fillStyle='white';
    context.font='30px Arial';
    context.textAlign='center';
    context.fillText('ゲームオーバー',canvas.width/2,canvas.height/2);
    setTimeout(resetGame,3000);
}

// --------------------- リセット ---------------------
function resetGame(){
    isGameOver=false;
    isPaused=false;
    board = Array.from({length: ROWS}, () => Array(COLS).fill(0));
    score = 0;
    scoreElement.textContent = score;
    nextBlocks=[];
    lastUsedIndex=-1;
    dropInterval = INITIAL_DROP_INTERVAL;
    currentBlock = getNextBlock();
    update();
}

// --------------------- キー操作 ---------------------
// canvasをフォーカス可能にしてキー操作を設定
canvas.tabIndex = 0; // canvasにフォーカスを当てられるようにする
canvas.focus(); // 最初にフォーカスを当てておく（任意）

canvas.addEventListener('keydown', e => {
    if (isGameOver || isPaused) return;

    switch (e.key) {
        case 'ArrowLeft':
            currentBlock.x--;
            if (collide(board, currentBlock)) currentBlock.x++;
            break;
        case 'ArrowRight':
            currentBlock.x++;
            if (collide(board, currentBlock)) currentBlock.x--;
            break;
        case 'ArrowDown':
            currentBlock.y++;
            if (collide(board, currentBlock)) {
                currentBlock.y--;
                fixBlockOnBoard();
            }
            dropCounter = 0;
            break;
        case 'ArrowUp':
            const rotated = rotateBlock(currentBlock.matrix);
            const prev = currentBlock.matrix;
            currentBlock.matrix = rotated;
            if (collide(board, currentBlock)) currentBlock.matrix = prev;
            break;
        case ' ':
            hardDrop();
            dropCounter = 0;
            break;
        case 'p':
            togglePause();
            break;
    }
});

// --------------------- ゲーム開始 ---------------------
currentBlock = getNextBlock();
update();
