// server.js
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(__dirname));

const games = {};

function generateCode() {
    return Math.floor(1000 + Math.random() * 9000).toString();
}

function checkWinner(board) {
    const winCombinations = [
        [0, 1, 2], [3, 4, 5], [6, 7, 8], // horizontal
        [0, 3, 6], [1, 4, 7], [2, 5, 8], // vertical
        [0, 4, 8], [2, 4, 6] // diagonal
    ];

    for (const combo of winCombinations) {
        const [a, b, c] = combo;
        if (board[a] && board[a] === board[b] && board[a] === board[c]) {
            return board[a];
        }
    }
    
    if (board.every(cell => cell)) return 'draw';
    return null;
}

io.on('connection', (socket) => {
    socket.on('createGame', (playerName) => {
        const code = generateCode();
        const symbols = Math.random() < 0.5 ? ['X', 'O'] : ['O', 'X'];
        
        games[code] = {
            code,
            players: [{ id: socket.id, name: playerName, symbol: symbols[0] }],
            board: Array(9).fill(null),
            currentPlayer: symbols[0],
            winner: null
        };
        
        socket.join(code);
        socket.emit('gameCreated', code);
    });

    socket.on('joinGame', ({ code, playerName }) => {
        const game = games[code];
        if (!game) return socket.emit('gameError', 'Spiel nicht gefunden');
        if (game.players.length >= 2) return socket.emit('gameError', 'Spiel ist bereits voll');
        
        game.players.push({ 
            id: socket.id, 
            name: playerName, 
            symbol: game.players[0].symbol === 'X' ? 'O' : 'X'
        });
        
        socket.join(code);
        io.to(code).emit('gameJoined', game);
    });

    socket.on('makeMove', ({ index, code }) => {
        const game = games[code];
        if (!game || game.winner) return;
        
        if (game.board[index]) return;
        game.board[index] = game.currentPlayer;
        
        game.winner = checkWinner(game.board);
        if (!game.winner) {
            game.currentPlayer = game.currentPlayer === 'X' ? 'O' : 'X';
        }
        
        io.to(code).emit('gameUpdate', game);
    });

    socket.on('disconnect', () => {
        // Handle disconnection if needed
    });
});

server.listen(3000, () => {
    console.log('Server läuft auf http://localhost:3000');
});