const board = document.getElementById('board');
const diceContainer = document.getElementById('dice-container');
const diceSound = document.getElementById('dice-sound');
const snakeSound = document.getElementById('snake-sound');
const ladderSound = document.getElementById('ladder-sound');
const winSound = document.getElementById('win-sound');

let players = 0;
let positions = [0,0,0,0];
let tokens = [];
let diceElements = [];
let currentPlayer = 0;
let soundOn = true;

// Build board
for (let i=100; i>=1; i--) {
  const cell = document.createElement('div');
  cell.className = 'cell';
  cell.textContent = i;
  board.appendChild(cell);
}

// Snakes & Ladders mapping
const snakes = {97:78, 95:56, 88:24, 62:18, 48:26};
const ladders = {2:38, 7:14, 8:31, 15:26, 21:42, 28:84, 36:44, 51:67, 71:91};

// Start game with chosen players
function startGame(num) {
  players = num;
  positions = [0,0,0,0];
  tokens.forEach(t => t.remove());
  tokens = [];
  diceContainer.innerHTML = "";
  diceElements = [];

  for (let i=0; i<players; i++) {
    const token = document.createElement('div');
    token.className = 'token p'+(i+1);
    board.appendChild(token);
    tokens.push(token);

    const dice = document.createElement('div');
    dice.className = 'dice';
    dice.textContent = "🎲";
    diceContainer.appendChild(dice);
    diceElements.push(dice);

    dice.addEventListener('click', () => {
      if (i !== currentPlayer) return;
      rollDice(i);
    });
  }
  currentPlayer = 0;
}

// Dice roll
function rollDice(player) {
  const dice = diceElements[player];
  dice.classList.add('roll');
  setTimeout(() => dice.classList.remove('roll'), 600);

  let roll = Math.floor(Math.random()*6)+1;
  dice.textContent = roll;
  if (soundOn) diceSound.play();
  movePlayer(player, roll);

  if (roll !== 6) {
    currentPlayer = (currentPlayer+1) % players;
  }
}

// Move player
function movePlayer(player, roll) {
  let newPos = positions[player] + roll;
  if (newPos <= 100) {
    positions[player] = newPos;
    placeToken(player);

    if (ladders[newPos]) {
      animateMove(player, ladders[newPos], "ladder");
    } else if (snakes[newPos]) {
      animateMove(player, snakes[newPos], "snake");
    }

    if (positions[player] === 100) {
      setTimeout(() => {
        if (soundOn) winSound.play();
        alert(`🎉 Player ${player+1} wins! 🎉`);
      }, 500);
    }
  }
}

// Animate snake/ladder move
function animateMove(player, target, type) {
  let step = positions[player] < target ? 1 : -1;
  let interval = setInterval(()
