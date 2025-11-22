document.addEventListener('DOMContentLoaded', () => {
    const audio = document.getElementById('bg-music');
    const playBtn = document.getElementById('play-btn');
    const playIcon = playBtn.querySelector('i');
    const progressBar = document.querySelector('.progress');

    let isPlaying = false;

    // Play/Pause functionality
    playBtn.addEventListener('click', () => {
        if (isPlaying) {
            audio.pause();
            playIcon.classList.remove('fa-pause');
            playIcon.classList.add('fa-play');
            playIcon.style.paddingLeft = '4px'; // Visual adjustment for play icon
        } else {
            audio.play().catch(error => {
                console.log("Autoplay prevented:", error);
                alert("Haz clic para reproducir la música 🎵");
            });
            playIcon.classList.remove('fa-play');
            playIcon.classList.add('fa-pause');
            playIcon.style.paddingLeft = '0';
        }
        isPlaying = !isPlaying;
    });

    // Update progress bar
    audio.addEventListener('timeupdate', () => {
        const percent = (audio.currentTime / audio.duration) * 100;
        progressBar.style.width = `${percent}%`;
    });

    // Attempt Autoplay
    const playPromise = audio.play();
    if (playPromise !== undefined) {
        playPromise.then(_ => {
            isPlaying = true;
            updatePlayIcon();
        }).catch(error => {
            console.log("Autoplay prevented. Waiting for interaction.");
            isPlaying = false;
        });
    }

    // Handle Overlay Click
    const overlay = document.getElementById('start-overlay');
    overlay.addEventListener('click', () => {
        audio.play().then(() => {
            isPlaying = true;
            updatePlayIcon();
            overlay.style.opacity = '0';
            setTimeout(() => overlay.style.display = 'none', 500);
        });
    });

    function updatePlayIcon() {
        if (isPlaying) {
            playIcon.classList.remove('fa-play');
            playIcon.classList.add('fa-pause');
            playIcon.style.paddingLeft = '0';
        } else {
            playIcon.classList.remove('fa-pause');
            playIcon.classList.add('fa-play');
            playIcon.style.paddingLeft = '4px';
        }
    }

    // Add some floating particles for extra effect
    createParticles();

    initChessGame();
    initDominoGame();
    initTowerGame();
});

function createParticles() {
    const body = document.querySelector('body');
    const particleCount = 20;

    for (let i = 0; i < particleCount; i++) {
        const particle = document.createElement('div');
        particle.classList.add('particle');

        // Random positioning
        const x = Math.random() * window.innerWidth;
        const y = Math.random() * window.innerHeight;
        const size = Math.random() * 5 + 2;
        const duration = Math.random() * 10 + 5;

        particle.style.left = `${x}px`;
        particle.style.top = `${y}px`;
        particle.style.width = `${size}px`;
        particle.style.height = `${size}px`;
        particle.style.position = 'fixed';
        particle.style.background = 'rgba(255, 255, 255, 0.5)';
        particle.style.borderRadius = '50%';
        particle.style.pointerEvents = 'none';
        particle.style.zIndex = '-1';
        particle.style.animation = `floatParticle ${duration}s linear infinite`;

        body.appendChild(particle);
    }

    // Add keyframes for particles dynamically
    const styleSheet = document.createElement("style");
    styleSheet.innerText = `
        @keyframes floatParticle {
            0% { transform: translateY(0) opacity(0); }
            50% { opacity: 0.8; }
            100% { transform: translateY(-100vh) opacity(0); }
        }
    `;
    document.head.appendChild(styleSheet);
}

// --- Chess Game Logic ---
function initChessGame() {
    let board = null;
    let game = new Chess();
    const statusEl = document.getElementById('game-status');
    const difficultySelect = document.getElementById('difficulty');

    function onDragStart(source, piece, position, orientation) {
        if (game.game_over()) return false;
        // Only allow user to move white pieces
        if (piece.search(/^b/) !== -1) return false;
    }

    function onDrop(source, target) {
        // see if the move is legal
        let move = game.move({
            from: source,
            to: target,
            promotion: 'q' // NOTE: always promote to a queen for simplicity
        });

        // illegal move
        if (move === null) return 'snapback';

        updateStatus();

        // AI Turn
        window.setTimeout(makeRandomMove, 250);
    }

    function onSnapEnd() {
        board.position(game.fen());
    }

    function updateStatus() {
        let status = '';
        let moveColor = 'Blancas';
        if (game.turn() === 'b') {
            moveColor = 'Negras';
        }

        if (game.in_checkmate()) {
            status = 'Juego terminado, ' + moveColor + ' están en jaque mate.';
        } else if (game.in_draw()) {
            status = 'Juego terminado, tablas.';
        } else {
            status = moveColor + ' mueven';
            if (game.in_check()) {
                status += ', ' + moveColor + ' están en jaque';
            }
        }
        statusEl.innerText = status;
    }

    function makeRandomMove() {
        if (game.game_over()) return;

        const difficulty = difficultySelect.value;
        let move = null;

        if (difficulty === 'easy') {
            const possibleMoves = game.moves();
            if (possibleMoves.length === 0) return;
            const randomIdx = Math.floor(Math.random() * possibleMoves.length);
            game.move(possibleMoves[randomIdx]);
        } else if (difficulty === 'medium') {
            // Simple evaluation: try to capture, otherwise random
            const possibleMoves = game.moves({ verbose: true });
            if (possibleMoves.length === 0) return;

            // Find captures
            const captures = possibleMoves.filter(m => m.flags.includes('c') || m.flags.includes('e'));
            if (captures.length > 0) {
                const randomIdx = Math.floor(Math.random() * captures.length);
                game.move(captures[randomIdx]);
            } else {
                const randomIdx = Math.floor(Math.random() * possibleMoves.length);
                game.move(possibleMoves[randomIdx]);
            }
        } else {
            // Hard: Minimax (Depth 2 for performance in browser without worker)
            const bestMove = getBestMove(game);
            game.move(bestMove);
        }

        board.position(game.fen());
        updateStatus();
    }

    // Basic Minimax for "Hard"
    function getBestMove(game) {
        const possibleMoves = game.moves();
        let bestMove = null;
        let bestValue = -9999;

        // Shuffle moves to add variety if scores are equal
        possibleMoves.sort(() => Math.random() - 0.5);

        for (let i = 0; i < possibleMoves.length; i++) {
            const move = possibleMoves[i];
            game.move(move);
            const boardValue = -minimax(game, 2, -10000, 10000, false);
            game.undo();
            if (boardValue > bestValue) {
                bestValue = boardValue;
                bestMove = move;
            }
        }
        return bestMove || possibleMoves[0];
    }

    function minimax(game, depth, alpha, beta, isMaximizingPlayer) {
        if (depth === 0 || game.game_over()) {
            return evaluateBoard(game.board());
        }

        const possibleMoves = game.moves();

        if (isMaximizingPlayer) {
            let bestVal = -9999;
            for (let i = 0; i < possibleMoves.length; i++) {
                game.move(possibleMoves[i]);
                bestVal = Math.max(bestVal, minimax(game, depth - 1, alpha, beta, !isMaximizingPlayer));
                game.undo();
                alpha = Math.max(alpha, bestVal);
                if (beta <= alpha) return bestVal;
            }
            return bestVal;
        } else {
            let bestVal = 9999;
            for (let i = 0; i < possibleMoves.length; i++) {
                game.move(possibleMoves[i]);
                bestVal = Math.min(bestVal, minimax(game, depth - 1, alpha, beta, !isMaximizingPlayer));
                game.undo();
                beta = Math.min(beta, bestVal);
                if (beta <= alpha) return bestVal;
            }
            return bestVal;
        }
    }

    function evaluateBoard(board) {
        let totalEvaluation = 0;
        for (let i = 0; i < 8; i++) {
            for (let j = 0; j < 8; j++) {
                totalEvaluation += getPieceValue(board[i][j]);
            }
        }
        return totalEvaluation;
    }

    function getPieceValue(piece) {
        if (piece === null) return 0;
        const getAbsoluteValue = function (piece) {
            if (piece.type === 'p') return 10;
            if (piece.type === 'r') return 50;
            if (piece.type === 'n') return 30;
            if (piece.type === 'b') return 30;
            if (piece.type === 'q') return 90;
            if (piece.type === 'k') return 900;
            return 0;
        };
        const absoluteValue = getAbsoluteValue(piece);
        return piece.color === 'w' ? absoluteValue : -absoluteValue;
    }

    const config = {
        draggable: true,
        position: 'start',
        onDragStart: onDragStart,
        onDrop: onDrop,
        onSnapEnd: onSnapEnd,
        pieceTheme: 'https://chessboardjs.com/img/chesspieces/wikipedia/{piece}.png'
    };

    // Initialize board
    board = Chessboard('board', config);

    // Reset button
    document.getElementById('start-game-btn').addEventListener('click', () => {
        game.reset();
        board.start();
        updateStatus();
    });
}

// --- Domino Game Logic ---
function initDominoGame() {
    const tiles = [];
    let playerHand = [];
    let robotHand = [];
    let board = [];
    let isPlayerTurn = true;

    const playerHandEl = document.getElementById('player-hand');
    const robotHandEl = document.getElementById('robot-hand');
    const boardEl = document.getElementById('domino-board');
    const statusEl = document.getElementById('domino-status');
    const startBtn = document.getElementById('start-domino-btn');

    startBtn.addEventListener('click', startDominoGame);

    function startDominoGame() {
        // Create tiles (0-0 to 6-6)
        tiles.length = 0;
        for (let i = 0; i <= 6; i++) {
            for (let j = i; j <= 6; j++) {
                tiles.push([i, j]);
            }
        }

        // Shuffle
        for (let i = tiles.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [tiles[i], tiles[j]] = [tiles[j], tiles[i]];
        }

        // Deal
        playerHand = tiles.slice(0, 7);
        robotHand = tiles.slice(7, 14);
        board = []; // Start empty or with a tile? Let's start empty and force player to play first or highest double.

        // Simplified: Place first tile from deck to start board
        const startTile = tiles[14];
        board.push({ val: startTile, rotation: 0 }); // 0: normal, 90: rotated

        isPlayerTurn = true;
        renderDominoGame();
        statusEl.innerText = "Tu turno. Arrastra o haz clic en una ficha.";
    }

    function renderDominoGame() {
        // Render Board
        boardEl.innerHTML = '';
        board.forEach(tileObj => {
            const tileEl = createTileElement(tileObj.val);
            // Simplified rendering: just list them in a flex row for now. 
            // Real domino logic requires complex positioning (snake layout).
            // We will just show them in a line for this "arcade" version.
            boardEl.appendChild(tileEl);
        });

        // Render Player Hand
        playerHandEl.innerHTML = '';
        playerHand.forEach((tile, index) => {
            const tileEl = createTileElement(tile);
            tileEl.addEventListener('click', () => playTile(index));
            playerHandEl.appendChild(tileEl);
        });

        // Render Robot Hand (Hidden backs)
        robotHandEl.innerHTML = '';
        robotHand.forEach(() => {
            const tileEl = document.createElement('div');
            tileEl.className = 'domino-tile';
            tileEl.style.background = '#333'; // Back of tile
            robotHandEl.appendChild(tileEl);
        });
    }

    function createTileElement(tileVal) {
        const el = document.createElement('div');
        el.className = 'domino-tile';
        el.innerHTML = `
            <div class="domino-half"><span class="tile-value">${tileVal[0]}</span></div>
            <div class="domino-half"><span class="tile-value">${tileVal[1]}</span></div>
        `;
        return el;
    }

    function playTile(handIndex) {
        if (!isPlayerTurn) return;

        const tile = playerHand[handIndex];
        const leftEnd = board[0].val[0];
        const rightEnd = board[board.length - 1].val[1]; // Assuming linear matching [a,b][b,c]...

        // Simplified matching logic for linear board:
        // We need to match either the left-most value of the board or the right-most.
        // Since our board array is just a list, let's assume:
        // Board: [a,b], [b,c], [c,d]
        // Left Value: board[0][0] (if oriented correctly)
        // Right Value: board[last][1]

        // For this simple version, we'll just check if the tile has ANY matching number with the ends.
        // And we'll auto-orient it.

        // Actually, let's simplify further: Just match the RIGHTMOST value for a growing line to the right.
        // This is "Snake" style but one direction for simplicity.

        const lastTile = board[board.length - 1];
        const matchVal = lastTile.val[1]; // The open end

        if (tile[0] === matchVal) {
            // Matches normally: [matchVal, other]
            board.push({ val: tile });
            playerHand.splice(handIndex, 1);
            endTurn();
        } else if (tile[1] === matchVal) {
            // Matches flipped: [other, matchVal] -> flip to [matchVal, other] visual? 
            // Actually we need to append [matchVal, other] logically.
            board.push({ val: [tile[1], tile[0]] });
            playerHand.splice(handIndex, 1);
            endTurn();
        } else {
            statusEl.innerText = "Esa ficha no encaja. Intenta otra.";
            // Shake effect?
        }
    }

    function endTurn() {
        renderDominoGame();
        checkWinCondition();
        if (playerHand.length > 0) {
            isPlayerTurn = false;
            statusEl.innerText = "Turno del Robot...";
            setTimeout(robotPlay, 1000);
        }
    }

    function robotPlay() {
        const lastTile = board[board.length - 1];
        const matchVal = lastTile.val[1];

        // Find matching tile
        const matchIndex = robotHand.findIndex(t => t[0] === matchVal || t[1] === matchVal);

        if (matchIndex !== -1) {
            const tile = robotHand[matchIndex];
            if (tile[0] === matchVal) {
                board.push({ val: tile });
            } else {
                board.push({ val: [tile[1], tile[0]] });
            }
            robotHand.splice(matchIndex, 1);
            statusEl.innerText = "El Robot jugó una ficha.";
        } else {
            statusEl.innerText = "El Robot pasa (no tiene fichas).";
            // In real domino, draw from boneyard. Here, just pass.
        }

        renderDominoGame();
        checkWinCondition();
        isPlayerTurn = true;
    }

    function checkWinCondition() {
        if (playerHand.length === 0) {
            statusEl.innerText = "¡Ganaste! 🎉";
            isPlayerTurn = false;
        } else if (robotHand.length === 0) {
            statusEl.innerText = "El Robot gana. 🤖";
            isPlayerTurn = false;
        }
    }
}

// --- Tower Stacking Game Logic ---
function initTowerGame() {
    const canvas = document.getElementById('tower-canvas');
    const ctx = canvas.getContext('2d');
    const scoreEl = document.getElementById('tower-score');
    const startBtn = document.getElementById('start-tower-btn');

    let score = 0;
    let gameRunning = false;
    let blockWidth = 100;
    let blockHeight = 20;
    let currentX = 0;
    let speed = 2;
    let direction = 1;
    let stack = []; // Array of {x, width}

    // Initial base
    const base = { x: 100, width: 100, y: 380 };

    startBtn.addEventListener('click', startGame);
    canvas.addEventListener('click', placeBlock);

    function startGame() {
        score = 0;
        scoreEl.innerText = `Puntaje: ${score}`;
        stack = [base];
        blockWidth = 100;
        currentX = 0;
        speed = 2;
        gameRunning = true;
        requestAnimationFrame(gameLoop);
    }

    function placeBlock() {
        if (!gameRunning) return;

        const prevBlock = stack[stack.length - 1];
        const currentY = 380 - (stack.length * blockHeight);

        // Check overlap
        const overlapStart = Math.max(currentX, prevBlock.x);
        const overlapEnd = Math.min(currentX + blockWidth, prevBlock.x + prevBlock.width);
        const overlapWidth = overlapEnd - overlapStart;

        if (overlapWidth <= 0) {
            gameOver();
            return;
        }

        // Success - add new block (trimmed)
        stack.push({ x: overlapStart, width: overlapWidth, y: currentY });
        blockWidth = overlapWidth; // Next block is smaller
        score++;
        scoreEl.innerText = `Puntaje: ${score}`;
        speed += 0.2; // Increase difficulty

        // Reset position for next block
        currentX = 0;
    }

    function gameOver() {
        gameRunning = false;
        scoreEl.innerText = `Game Over! Puntaje Final: ${score}`;
    }

    function gameLoop() {
        if (!gameRunning) return;

        // Update
        currentX += speed * direction;
        if (currentX < 0 || currentX + blockWidth > canvas.width) {
            direction *= -1;
        }

        // Draw
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Draw Stack with Neon Glow
        stack.forEach((block, index) => {
            // Alternate colors
            const hue = (index * 20) % 360;
            ctx.fillStyle = `hsl(${hue}, 100%, 60%)`;
            ctx.shadowBlur = 15;
            ctx.shadowColor = `hsl(${hue}, 100%, 60%)`;
            ctx.fillRect(block.x, block.y, block.width, blockHeight);
        });

        // Draw Current Moving Block
        const currentHue = (stack.length * 20) % 360;
        ctx.fillStyle = `hsl(${currentHue}, 100%, 60%)`;
        ctx.shadowBlur = 15;
        ctx.shadowColor = `hsl(${currentHue}, 100%, 60%)`;
        const currentY = 380 - (stack.length * blockHeight);
        ctx.fillRect(currentX, currentY, blockWidth, blockHeight);

        // Reset shadow for other elements if any
        ctx.shadowBlur = 0;

        requestAnimationFrame(gameLoop);
    }
}
