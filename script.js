const board = document.getElementById('board');
const dice = document.getElementById('dice');
let players = 2;
let positions = [0,0,0,0];
let currentPlayer = 0;

// Build board
for (let i=100; i>=1; i--) {
  const cell = document.createElement('div');
  cell.className = 'cell';
  cell.textContent = i;
  board.appendChild(cell);
}

// Tokens
const tokens = [];
for (let i=0; i<players; i++) {
  const token = document.createElement('div');
  token.className = 'token p'+(i+1);
  board.appendChild(token);
  tokens.push(token);
}

// Snakes & Ladders mapping
const snakes = {97:78, 95:56, 88:24, 62:18, 48:26};
const ladders = {2:38, 7:14, 8:31, 15:26, 21:42, 28:84, 36:44, 51:67, 71:91};

// Dice roll
dice.addEventListener('click', () => {
  let roll = Math.floor(Math.random()*6)+1;
  dice.textContent = roll;
  movePlayer(currentPlayer, roll);
  if (roll !== 6) {
    currentPlayer = (currentPlayer+1) % players;
  }
});

function movePlayer(player, roll) {
  let newPos = positions[player] + roll;
  if (newPos <= 100) {
    positions[player] = newPos;
    placeToken(player);

    if (ladders[newPos]) {
      setTimeout(() => {
        positions[player] = ladders[newPos];
        placeToken(player);
        alert(`Player ${player+1} climbed a ladder!`);
      }, 500);
    } else if (snakes[newPos]) {
      setTimeout(() => {
        positions[player] = snakes[newPos];
        placeToken(player);
        alert(`Player ${player+1} got bitten by a snake!`);
      }, 500);
    }

    if (positions[player] === 100) {
      setTimeout(() => {
        alert(`🎉 Player ${player+1} wins! 🎉`);
      }, 500);
    }
  }
}

function placeToken(player) {
  const cells = board.querySelectorAll('.cell');
  if (positions[player] === 0) {
    tokens[player].style.left = '0px';
    tokens[player].style.top = '0px';
    return;
  }
  const targetCell = cells[100 - positions[player]];
  const rect = targetCell.getBoundingClientRect();
  const boardRect = board.getBoundingClientRect();
  tokens[player].style.left = (rect.left - boardRect.left + 10) + 'px';
  tokens[player].style.top = (rect.top -
