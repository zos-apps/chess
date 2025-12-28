import React, { useState, useCallback, useEffect } from 'react';

interface ChessProps {
  onClose: () => void;
}

type PieceType = 'K' | 'Q' | 'R' | 'B' | 'N' | 'P' | 'k' | 'q' | 'r' | 'b' | 'n' | 'p' | null;
type Board = PieceType[][];

const PIECE_SYMBOLS: Record<string, string> = {
  'K': '♔', 'Q': '♕', 'R': '♖', 'B': '♗', 'N': '♘', 'P': '♙',
  'k': '♚', 'q': '♛', 'r': '♜', 'b': '♝', 'n': '♞', 'p': '♟',
};

const PIECE_VALUES: Record<string, number> = {
  'p': 100, 'n': 320, 'b': 330, 'r': 500, 'q': 900, 'k': 20000,
  'P': -100, 'N': -320, 'B': -330, 'R': -500, 'Q': -900, 'K': -20000,
};

const initialBoard = (): Board => [
  ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r'],
  ['p', 'p', 'p', 'p', 'p', 'p', 'p', 'p'],
  [null, null, null, null, null, null, null, null],
  [null, null, null, null, null, null, null, null],
  [null, null, null, null, null, null, null, null],
  [null, null, null, null, null, null, null, null],
  ['P', 'P', 'P', 'P', 'P', 'P', 'P', 'P'],
  ['R', 'N', 'B', 'Q', 'K', 'B', 'N', 'R'],
];

const isWhite = (piece: PieceType): boolean => piece !== null && piece === piece.toUpperCase();
const isBlack = (piece: PieceType): boolean => piece !== null && piece === piece.toLowerCase();

const Chess: React.FC<ChessProps> = ({ onClose }) => {
  const [board, setBoard] = useState<Board>(initialBoard);
  const [selected, setSelected] = useState<[number, number] | null>(null);
  const [turn, setTurn] = useState<'white' | 'black'>('white');
  const [validMoves, setValidMoves] = useState<[number, number][]>([]);
  const [gameOver, setGameOver] = useState<string | null>(null);
  const [thinking, setThinking] = useState(false);
  const [moveHistory, setMoveHistory] = useState<string[]>([]);

  const getValidMoves = useCallback((board: Board, row: number, col: number): [number, number][] => {
    const piece = board[row][col];
    if (!piece) return [];
    
    const moves: [number, number][] = [];
    const isWhitePiece = isWhite(piece);
    const pieceType = piece.toLowerCase();
    
    const addMove = (r: number, c: number) => {
      if (r < 0 || r > 7 || c < 0 || c > 7) return false;
      const target = board[r][c];
      if (target === null) {
        moves.push([r, c]);
        return true;
      }
      if (isWhitePiece !== isWhite(target)) {
        moves.push([r, c]);
      }
      return false;
    };

    const addSlide = (dr: number, dc: number) => {
      for (let i = 1; i < 8; i++) {
        if (!addMove(row + dr * i, col + dc * i)) break;
        if (board[row + dr * i]?.[col + dc * i]) break;
      }
    };

    switch (pieceType) {
      case 'p': {
        const dir = isWhitePiece ? -1 : 1;
        const startRow = isWhitePiece ? 6 : 1;
        if (board[row + dir]?.[col] === null) {
          moves.push([row + dir, col]);
          if (row === startRow && board[row + 2 * dir]?.[col] === null) {
            moves.push([row + 2 * dir, col]);
          }
        }
        // Captures
        [-1, 1].forEach(dc => {
          const target = board[row + dir]?.[col + dc];
          if (target && isWhitePiece !== isWhite(target)) {
            moves.push([row + dir, col + dc]);
          }
        });
        break;
      }
      case 'n':
        [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]].forEach(([dr, dc]) => addMove(row + dr, col + dc));
        break;
      case 'b':
        [[-1,-1],[-1,1],[1,-1],[1,1]].forEach(([dr, dc]) => addSlide(dr, dc));
        break;
      case 'r':
        [[-1,0],[1,0],[0,-1],[0,1]].forEach(([dr, dc]) => addSlide(dr, dc));
        break;
      case 'q':
        [[-1,-1],[-1,1],[1,-1],[1,1],[-1,0],[1,0],[0,-1],[0,1]].forEach(([dr, dc]) => addSlide(dr, dc));
        break;
      case 'k':
        [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]].forEach(([dr, dc]) => addMove(row + dr, col + dc));
        break;
    }
    
    return moves;
  }, []);

  const makeMove = useCallback((board: Board, from: [number, number], to: [number, number]): Board => {
    const newBoard = board.map(row => [...row]);
    const piece = newBoard[from[0]][from[1]];
    newBoard[to[0]][to[1]] = piece;
    newBoard[from[0]][from[1]] = null;
    
    // Pawn promotion
    if (piece?.toLowerCase() === 'p' && (to[0] === 0 || to[0] === 7)) {
      newBoard[to[0]][to[1]] = isWhite(piece) ? 'Q' : 'q';
    }
    
    return newBoard;
  }, []);

  const evaluateBoard = useCallback((board: Board): number => {
    let score = 0;
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const piece = board[r][c];
        if (piece) {
          score += PIECE_VALUES[piece] || 0;
          // Position bonus
          const centerBonus = (3.5 - Math.abs(3.5 - c)) * 5 + (3.5 - Math.abs(3.5 - r)) * 5;
          score += isBlack(piece) ? centerBonus : -centerBonus;
        }
      }
    }
    return score;
  }, []);

  const getAllMoves = useCallback((board: Board, forBlack: boolean): [number, number, number, number][] => {
    const moves: [number, number, number, number][] = [];
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const piece = board[r][c];
        if (piece && (forBlack ? isBlack(piece) : isWhite(piece))) {
          const pieceMoves = getValidMoves(board, r, c);
          pieceMoves.forEach(([tr, tc]) => moves.push([r, c, tr, tc]));
        }
      }
    }
    return moves;
  }, [getValidMoves]);

  const minimax = useCallback((board: Board, depth: number, alpha: number, beta: number, maximizing: boolean): number => {
    if (depth === 0) return evaluateBoard(board);
    
    const moves = getAllMoves(board, maximizing);
    if (moves.length === 0) return maximizing ? -Infinity : Infinity;
    
    if (maximizing) {
      let maxEval = -Infinity;
      for (const [fr, fc, tr, tc] of moves) {
        const newBoard = makeMove(board, [fr, fc], [tr, tc]);
        const evalScore = minimax(newBoard, depth - 1, alpha, beta, false);
        maxEval = Math.max(maxEval, evalScore);
        alpha = Math.max(alpha, evalScore);
        if (beta <= alpha) break;
      }
      return maxEval;
    } else {
      let minEval = Infinity;
      for (const [fr, fc, tr, tc] of moves) {
        const newBoard = makeMove(board, [fr, fc], [tr, tc]);
        const evalScore = minimax(newBoard, depth - 1, alpha, beta, true);
        minEval = Math.min(minEval, evalScore);
        beta = Math.min(beta, evalScore);
        if (beta <= alpha) break;
      }
      return minEval;
    }
  }, [evaluateBoard, getAllMoves, makeMove]);

  const aiMove = useCallback((currentBoard: Board) => {
    setThinking(true);
    
    setTimeout(() => {
      const moves = getAllMoves(currentBoard, true);
      if (moves.length === 0) {
        setGameOver('Checkmate! You win!');
        setThinking(false);
        return;
      }
      
      let bestMove = moves[0];
      let bestScore = -Infinity;
      
      for (const [fr, fc, tr, tc] of moves) {
        const newBoard = makeMove(currentBoard, [fr, fc], [tr, tc]);
        const score = minimax(newBoard, 2, -Infinity, Infinity, false);
        if (score > bestScore) {
          bestScore = score;
          bestMove = [fr, fc, tr, tc];
        }
      }
      
      const [fr, fc, tr, tc] = bestMove;
      const piece = currentBoard[fr][fc];
      const captured = currentBoard[tr][tc];
      const notation = `${PIECE_SYMBOLS[piece!]}${String.fromCharCode(97 + fc)}${8 - fr}→${String.fromCharCode(97 + tc)}${8 - tr}${captured ? ' x' + PIECE_SYMBOLS[captured] : ''}`;
      
      const newBoard = makeMove(currentBoard, [fr, fc], [tr, tc]);
      setBoard(newBoard);
      setMoveHistory(prev => [...prev, notation]);
      setTurn('white');
      setThinking(false);
      
      // Check for checkmate
      const whiteMoves = getAllMoves(newBoard, false);
      if (whiteMoves.length === 0) {
        setGameOver('Checkmate! AI wins!');
      }
    }, 500);
  }, [getAllMoves, makeMove, minimax]);

  const handleSquareClick = useCallback((row: number, col: number) => {
    if (gameOver || thinking || turn !== 'white') return;
    
    const piece = board[row][col];
    
    if (selected) {
      const isValidMove = validMoves.some(([r, c]) => r === row && c === col);
      
      if (isValidMove) {
        const fromPiece = board[selected[0]][selected[1]];
        const toPiece = board[row][col];
        const notation = `${PIECE_SYMBOLS[fromPiece!]}${String.fromCharCode(97 + selected[1])}${8 - selected[0]}→${String.fromCharCode(97 + col)}${8 - row}${toPiece ? ' x' + PIECE_SYMBOLS[toPiece] : ''}`;
        
        const newBoard = makeMove(board, selected, [row, col]);
        setBoard(newBoard);
        setMoveHistory(prev => [...prev, notation]);
        setSelected(null);
        setValidMoves([]);
        setTurn('black');
        
        // AI moves
        setTimeout(() => aiMove(newBoard), 100);
      } else if (piece && isWhite(piece)) {
        setSelected([row, col]);
        setValidMoves(getValidMoves(board, row, col));
      } else {
        setSelected(null);
        setValidMoves([]);
      }
    } else if (piece && isWhite(piece)) {
      setSelected([row, col]);
      setValidMoves(getValidMoves(board, row, col));
    }
  }, [board, selected, validMoves, gameOver, thinking, turn, getValidMoves, makeMove, aiMove]);

  const resetGame = () => {
    setBoard(initialBoard());
    setSelected(null);
    setValidMoves([]);
    setTurn('white');
    setGameOver(null);
    setMoveHistory([]);
  };

  return (
    <div className="h-full flex bg-gradient-to-br from-amber-900 to-amber-950">
      {/* Board */}
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="relative">
          <div className="grid grid-cols-8 border-4 border-amber-800 shadow-2xl">
            {board.map((row, r) =>
              row.map((piece, c) => {
                const isLight = (r + c) % 2 === 0;
                const isSelected = selected?.[0] === r && selected?.[1] === c;
                const isValidMove = validMoves.some(([vr, vc]) => vr === r && vc === c);
                
                return (
                  <div
                    key={`${r}-${c}`}
                    onClick={() => handleSquareClick(r, c)}
                    className={`
                      w-14 h-14 flex items-center justify-center cursor-pointer relative
                      ${isLight ? 'bg-amber-200' : 'bg-amber-700'}
                      ${isSelected ? 'ring-4 ring-yellow-400 ring-inset' : ''}
                      hover:brightness-110 transition-all
                    `}
                  >
                    {isValidMove && (
                      <div className={`absolute inset-0 ${piece ? 'ring-4 ring-red-500 ring-inset' : ''}`}>
                        {!piece && <div className="absolute inset-1/3 rounded-full bg-green-500/50" />}
                      </div>
                    )}
                    {piece && (
                      <span className={`text-4xl select-none ${isWhite(piece) ? 'text-white drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]' : 'text-black drop-shadow-[0_2px_2px_rgba(255,255,255,0.3)]'}`}>
                        {PIECE_SYMBOLS[piece]}
                      </span>
                    )}
                  </div>
                );
              })
            )}
          </div>
          
          {/* Coordinates */}
          <div className="absolute -left-6 top-0 h-full flex flex-col justify-around text-amber-300 text-sm font-mono">
            {[8,7,6,5,4,3,2,1].map(n => <span key={n}>{n}</span>)}
          </div>
          <div className="absolute -bottom-6 left-0 w-full flex justify-around text-amber-300 text-sm font-mono">
            {['a','b','c','d','e','f','g','h'].map(l => <span key={l}>{l}</span>)}
          </div>
        </div>
      </div>

      {/* Sidebar */}
      <div className="w-64 bg-amber-950/80 p-4 flex flex-col">
        <h1 className="text-2xl font-bold text-amber-200 mb-4 flex items-center gap-2">
          <span>♟️</span> Chess
        </h1>
        
        <div className={`mb-4 p-2 rounded ${turn === 'white' ? 'bg-white text-black' : 'bg-gray-800 text-white'}`}>
          {thinking ? '🤔 AI thinking...' : turn === 'white' ? '⚪ Your turn' : '⚫ AI turn'}
        </div>
        
        {gameOver && (
          <div className="mb-4 p-3 bg-yellow-600 text-white rounded font-bold text-center">
            {gameOver}
          </div>
        )}
        
        <button
          onClick={resetGame}
          className="mb-4 px-4 py-2 bg-amber-700 hover:bg-amber-600 text-white rounded transition-colors"
        >
          New Game
        </button>
        
        <div className="flex-1 overflow-auto">
          <h3 className="text-amber-300 text-sm mb-2">Move History</h3>
          <div className="space-y-1 text-amber-200/70 text-sm font-mono">
            {moveHistory.map((move, i) => (
              <div key={i} className={i % 2 === 0 ? 'text-white' : 'text-amber-400'}>
                {Math.floor(i / 2) + 1}.{i % 2 === 0 ? '' : '..'} {move}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Chess;
