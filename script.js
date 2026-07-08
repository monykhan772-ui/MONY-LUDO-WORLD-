/* ================== AUDIO ENGINE (Web Audio API, no external files) ================== */
const AudioCtx = window.AudioContext || window.webkitAudioContext;
let actx = null;
let soundOn = true;
function ensureCtx(){ if(!actx) actx = new AudioCtx(); if(actx.state==='suspended') actx.resume(); return actx; }

function envGain(ctx, t0, dur, peak=0.3){
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, t0);
  g.gain.linearRampToValueAtTime(peak, t0+0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, t0+dur);
  return g;
}

function tone(freq, t0, dur, type='sine', peak=0.25){
  if(!soundOn) return;
  const ctx = ensureCtx();
  const osc = ctx.createOscillator();
  osc.type = type; osc.frequency.setValueAtTime(freq, t0);
  const g = envGain(ctx, t0, dur, peak);
  osc.connect(g).connect(ctx.destination);
  osc.start(t0); osc.stop(t0+dur+0.05);
}

function playWelcomeChime(){
  if(!soundOn) return;
  const ctx = ensureCtx();
  const now = ctx.currentTime;
  [523.25,659.25,783.99,1046.5].forEach((f,i)=> tone(f, now+i*0.16, 0.9, 'triangle', 0.18));
}

function playDiceSound(){
  if(!soundOn) return;
  const ctx = ensureCtx();
  const now = ctx.currentTime;
  for(let i=0;i<6;i++){
    const t0 = now + i*0.07;
    const bufferSize = ctx.sampleRate*0.03;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for(let j=0;j<bufferSize;j++) data[j] = (Math.random()*2-1) * (1 - j/bufferSize);
    const src = ctx.createBufferSource(); src.buffer = buffer;
    const g = ctx.createGain(); g.gain.value = 0.35 - i*0.03;
    src.connect(g).connect(ctx.destination);
    src.start(t0);
  }
}

function playLadderClimb(){
  if(!soundOn) return;
  const ctx = ensureCtx();
  const now = ctx.currentTime;
  const notes = [392.00,440.00,523.25,587.33,659.25];
  notes.forEach((f,i)=> tone(f, now+i*0.11, 0.35, 'square', 0.14));
}

function playSnakeHiss(){
  if(!soundOn) return;
  const ctx = ensureCtx();
  const now = ctx.currentTime;
  const dur = 0.9;
  const bufferSize = ctx.sampleRate*dur;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for(let j=0;j<bufferSize;j++) data[j] = (Math.random()*2-1);
  const src = ctx.createBufferSource(); src.buffer = buffer;
  const filter = ctx.createBiquadFilter();
  filter.type='bandpass';
  filter.frequency.setValueAtTime(2200, now);
  filter.frequency.exponentialRampToValueAtTime(600, now+dur);
  filter.Q.value = 6;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, now);
  g.gain.linearRampToValueAtTime(0.35, now+0.08);
  g.gain.exponentialRampToValueAtTime(0.0001, now+dur);
  src.connect(filter).connect(g).connect(ctx.destination);
  src.start(now); src.stop(now+dur+0.05);
  tone(110, now, dur, 'sawtooth', 0.06); // low growl underneath
}

function playWinFanfare(){
  if(!soundOn) return;
  const ctx = ensureCtx();
  const now = ctx.currentTime;
  const seq = [523.25,659.25,783.99,1046.5,783.99,1046.5,1318.5];
  seq.forEach((f,i)=> tone(f, now+i*0.13, 0.5, 'triangle', 0.2));
}

/* ================== SCREEN NAV ================== */
const splash = document.getElementById('splash');
const playerSelect = document.getElementById('playerSelect');
const gameBoardScreen = document.getElementById('gameBoard');

// Force-trigger the welcome title animation in case autoplay CSS animation
// gets skipped by the browser (common on some mobile webviews).
window.addEventListener('DOMContentLoaded', ()=>{
  const title = document.querySelector('.welcome-title');
  if(title){
    title.style.animation = 'none';
    void title.offsetWidth; // reflow to restart animation reliably
    title.style.animation = '';
  }
});

document.getElementById('goToPlayerSelect').addEventListener('click', ()=>{
  ensureCtx(); playWelcomeChime();
  splash.classList.add('hidden');
  playerSelect.classList.remove('hidden');
});

/* ================== PLAYER SELECTION ================== */
const PLAYER_DEFS = [
  {id:0, name:'Player 1', hex:'#e63946'},
  {id:1, name:'Player 2', hex:'#3a86ff'},
  {id:2, name:'Player 3', hex:'#2ea043'},
  {id:3, name:'Player 4', hex:'#f4c542'},
];
let selectedCount = 2;
const chipRow = document.getElementById('chipRow');

function renderChips(){
  chipRow.innerHTML = '';
  for(let i=0;i<selectedCount;i++){
    const def = PLAYER_DEFS[i];
    const chip = document.createElement('div');
    chip.className='player-chip';
    chip.innerHTML = `<span class="dot" style="background:${def.hex};color:${def.hex}"></span>${def.name}`;
    chipRow.appendChild(chip);
  }
}
renderChips();

document.querySelectorAll('.count-btn').forEach(btn=>{
  if(btn.dataset.count === '2') btn.classList.add('selected');
  btn.addEventListener('click', ()=>{
    document.querySelectorAll('.count-btn').forEach(b=>b.classList.remove('selected'));
    btn.classList.add('selected');
    selectedCount = parseInt(btn.dataset.count,10);
    renderChips();
  });
});

document.getElementById('beginGameBtn').addEventListener('click', ()=>{
  playerSelect.classList.add('hidden');
  gameBoardScreen.classList.remove('hidden');
  initGame(selectedCount);
});

/* ================== BOARD DATA ================== */
const LADDERS = {4:56, 12:50, 14:55, 22:58, 41:79, 54:88, 63:98, 71:91};
const SNAKES  = {99:41, 92:73, 87:24, 62:19, 64:60, 49:11, 46:25, 16:6};

const boardEl = document.getElementById('board');

function numToRowCol(num){
  const row = Math.floor((num-1)/10);       // 0 = bottom row
  const posInRow = (num-1) % 10;
  const col = (row % 2 === 0) ? posInRow : (9 - posInRow);
  const screenRow = 9 - row; // 0 = top
  return {row: screenRow, col};
}

function buildBoard(){
  boardEl.innerHTML = '';
  for(let num=1; num<=100; num++){
    const {row,col} = numToRowCol(num);
    const cell = document.createElement('div');
    const light = (row+col)%2===0;
    cell.className = 'cell ' + (light?'light':'dark');
    cell.style.gridRowStart = row+1;
    cell.style.gridColumnStart = col+1;
    if(num===1) cell.classList.add('start');
    if(num===100) cell.classList.add('finish');
    const numEl = document.createElement('span');
    numEl.className='num'; numEl.textContent = num;
    cell.appendChild(numEl);
    cell.dataset.num = num;
    boardEl.appendChild(cell);
  }
  drawOverlay();
}

function cellCenterPercent(num){
  const {row,col} = numToRowCol(num);
  return { x:(col+0.5)*10, y:(row+0.5)*10 }; // in percent (0-100)
}

function drawOverlay(){
  const svgNS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(svgNS,'svg');
  svg.setAttribute('class','overlay');
  svg.setAttribute('viewBox','0 0 100 100');
  svg.setAttribute('preserveAspectRatio','none');

  const defs = document.createElementNS(svgNS,'defs');
  const snakeGrad = document.createElementNS(svgNS,'linearGradient');
  snakeGrad.setAttribute('id','snakeGrad'); snakeGrad.setAttribute('x1','0%'); snakeGrad.setAttribute('y1','0%'); snakeGrad.setAttribute('x2','100%'); snakeGrad.setAttribute('y2','100%');
  snakeGrad.innerHTML = '<stop offset="0%" stop-color="#7fd858"/><stop offset="50%" stop-color="#2ea043"/><stop offset="100%" stop-color="#0f5c26"/>';
  const ladderGrad = document.createElementNS(svgNS,'linearGradient');
  ladderGrad.setAttribute('id','ladderGrad'); ladderGrad.setAttribute('x1','0%'); ladderGrad.setAttribute('y1','0%'); ladderGrad.setAttribute('x2','100%'); ladderGrad.setAttribute('y2','100%');
  ladderGrad.innerHTML = '<stop offset="0%" stop-color="#f4e2a1"/><stop offset="50%" stop-color="#d4af37"/><stop offset="100%" stop-color="#8a6d1f"/>';
  defs.appendChild(snakeGrad); defs.appendChild(ladderGrad);
  svg.appendChild(defs);

  // Ladders: double rail + rungs
  Object.entries(LADDERS).forEach(([from,to])=>{
    const a = cellCenterPercent(parseInt(from));
    const b = cellCenterPercent(parseInt(to));
    const dx = b.x-a.x, dy=b.y-a.y;
    const len = Math.hypot(dx,dy);
    const nx = -dy/len, ny = dx/len; // normal
    const offset = 1.6;
    const rail1 = document.createElementNS(svgNS,'line');
    rail1.setAttribute('x1', a.x+nx*offset); rail1.setAttribute('y1', a.y+ny*offset);
    rail1.setAttribute('x2', b.x+nx*offset); rail1.setAttribute('y2', b.y+ny*offset);
    rail1.setAttribute('stroke','url(#ladderGrad)'); rail1.setAttribute('stroke-width','1.4');
    rail1.setAttribute('stroke-linecap','round');
    const rail2 = rail1.cloneNode();
    rail2.setAttribute('x1', a.x-nx*offset); rail2.setAttribute('y1', a.y-ny*offset);
    rail2.setAttribute('x2', b.x-nx*offset); rail2.setAttribute('y2', b.y-ny*offset);
    svg.appendChild(rail1); svg.appendChild(rail2);
    const rungs = 7;
    for(let i=1;i<rungs;i++){
      const t=i/rungs;
      const cx=a.x+dx*t, cy=a.y+dy*t;
      const rung = document.createElementNS(svgNS,'line');
      rung.setAttribute('x1', cx+nx*offset); rung.setAttribute('y1', cy+ny*offset);
      rung.setAttribute('x2', cx-nx*offset); rung.setAttribute('y2', cy-ny*offset);
      rung.setAttribute('stroke','#8a6d1f'); rung.setAttribute('stroke-width','0.9');
      svg.appendChild(rung);
    }
  });

  // Snakes: wavy thick tube with head circle + eyes
  Object.entries(SNAKES).forEach(([from,to])=>{
    const a = cellCenterPercent(parseInt(from)); // head (higher number)
    const b = cellCenterPercent(parseInt(to));   // tail (lower number)
    const dx=b.x-a.x, dy=b.y-a.y;
    const len=Math.hypot(dx,dy);
    const nx=-dy/len, ny=dx/len;
    const segments = 5;
    let d = `M ${a.x} ${a.y} `;
    for(let i=1;i<=segments;i++){
      const t=i/segments;
      const wob = Math.sin(t*Math.PI*2.4)*3.2;
      const px = a.x+dx*t + nx*wob;
      const py = a.y+dy*t + ny*wob;
      d += `${i===1?'Q':'T'} ${px} ${py} `;
    }
    const path = document.createElementNS(svgNS,'path');
    path.setAttribute('d', d);
    path.setAttribute('fill','none');
    path.setAttribute('stroke','url(#snakeGrad)');
    path.setAttribute('stroke-width','2.6');
    path.setAttribute('stroke-linecap','round');
    path.setAttribute('filter','drop-shadow(0 0.6px 0.6px rgba(0,0,0,0.5))');
    svg.appendChild(path);
    // head
    const head = document.createElementNS(svgNS,'circle');
    head.setAttribute('cx',a.x); head.setAttribute('cy',a.y); head.setAttribute('r','2.4');
    head.setAttribute('fill','#1f7a37'); head.setAttribute('stroke','#0f5c26'); head.setAttribute('stroke-width','0.4');
    svg.appendChild(head);
    const eye1=document.createElementNS(svgNS,'circle');
    eye1.setAttribute('cx',a.x-0.7); eye1.setAttribute('cy',a.y-0.5); eye1.setAttribute('r','0.4'); eye1.setAttribute('fill','#fff');
    const eye2=eye1.cloneNode(); eye2.setAttribute('cx',a.x+0.7);
    svg.appendChild(eye1); svg.appendChild(eye2);
  });

  boardEl.appendChild(svg);
}

buildBoard();

/* ================== GAME STATE ================== */
let players = [];
let currentIdx = 0;
let isAnimating = false;

function initGame(count){
  players = [];
  for(let i=0;i<count;i++){
    players.push({...PLAYER_DEFS[i], pos:1, tokenEl:null});
  }
  currentIdx = 0;
  buildBoard(); // reset overlay (fresh dom refs)
  renderPlayersList();
  createTokens();
  updateTurnBanner();
  document.getElementById('rollBtn').disabled = false;
}

function renderPlayersList(){
  const list = document.getElementById('playersList');
  list.innerHTML='';
  players.forEach((p,i)=>{
    const row = document.createElement('div');
    row.className = 'player-row' + (i===currentIdx?' active':'');
    row.id = 'prow-'+i;
    row.innerHTML = `<span class="p-token" style="background:${p.hex};color:${p.hex}"></span>
      <span class="p-name">${p.name}</span>
      <span class="p-pos" id="ppos-${i}">${p.pos}</span>`;
    list.appendChild(row);
  });
}

function createTokens(){
  document.querySelectorAll('.token').forEach(t=>t.remove());
  players.forEach((p,i)=>{
    const t = document.createElement('div');
    t.className='token';
    t.style.background = p.hex;
    t.id = 'token-'+i;
    boardEl.appendChild(t);
    p.tokenEl = t;
  });
  positionAllTokens();
}

function positionAllTokens(){
  // group by position to offset overlapping tokens
  const groups = {};
  players.forEach((p,i)=>{ (groups[p.pos] = groups[p.pos]||[]).push(i); });
  Object.entries(groups).forEach(([pos, idxs])=>{
    const c = cellCenterPercent(parseInt(pos));
    idxs.forEach((pi, j)=>{
      const offsets = [[-1.6,-1.6],[1.6,-1.6],[-1.6,1.6],[1.6,1.6]];
      const off = offsets[j % offsets.length];
      const el = players[pi].tokenEl;
      el.style.left = (c.x+off[0]) + '%';
      el.style.top = (c.y+off[1]) + '%';
    });
  });
}

function updateTurnBanner(){
  const p = players[currentIdx];
  const banner = document.getElementById('turnBanner');
  banner.textContent = `${p.name}'s turn — Roll the dice!`;
  banner.style.background = p.hex + '33';
  banner.style.color = '#fff';
  banner.style.boxShadow = `0 0 16px ${p.hex}55`;
  document.querySelectorAll('.player-row').forEach(r=>r.classList.remove('active'));
  const row = document.getElementById('prow-'+currentIdx);
  if(row) row.classList.add('active');
}

/* Dice pip layouts */
const DICE_FACES = {
  1:[4], 2:[0,8], 3:[0,4,8], 4:[0,2,6,8], 5:[0,2,4,6,8], 6:[0,2,3,5,6,8]
};
function showDiceFace(n){
  for(let i=0;i<9;i++){
    document.getElementById('p'+(i+1)).style.opacity = DICE_FACES[n].includes(i) ? 1 : 0;
  }
}

document.getElementById('rollBtn').addEventListener('click', rollDice);

function rollDice(){
  if(isAnimating) return;
  isAnimating = true;
  document.getElementById('rollBtn').disabled = true;
  ensureCtx();
  playDiceSound();
  const diceEl = document.getElementById('dice');
  diceEl.classList.add('rolling');
  let ticks = 0;
  const maxTicks = 10;
  const interval = setInterval(()=>{
    showDiceFace(1+Math.floor(Math.random()*6));
    ticks++;
    if(ticks>=maxTicks){
      clearInterval(interval);
      diceEl.classList.remove('rolling');
      const finalRoll = 1+Math.floor(Math.random()*6);
      showDiceFace(finalRoll);
      setTimeout(()=> movePlayer(finalRoll), 250);
    }
  }, 80);
}

function movePlayer(steps){
  const p = players[currentIdx];
  let target = p.pos + steps;
  if(target > 100){
    // no overshoot move: stay in place, lose turn
    target = p.pos;
  }
  animateStep(p, p.pos, target, ()=>{
    p.pos = target;
    document.getElementById('ppos-'+currentIdx).textContent = p.pos;
    positionAllTokens();
    handleLandingAndContinue(p, steps);
  });
}

function animateStep(p, from, to, cb){
  if(from === to){ cb(); return; }
  let cur = from;
  const step = ()=>{
    cur++;
    p.pos = cur;
    positionAllTokens();
    if(cur < to){
      setTimeout(step, 90);
    } else {
      cb();
    }
  };
  setTimeout(step, 90);
}

function handleLandingAndContinue(p, rolledSix){
  const posNum = p.pos;
  if(LADDERS[posNum]){
    setTimeout(()=>{
      playLadderClimb();
      const dest = LADDERS[posNum];
      animateStep(p, posNum, dest, ()=>{
        p.pos = dest;
        document.getElementById('ppos-'+currentIdx).textContent = p.pos;
        positionAllTokens();
        finishTurn(rolledSix);
      });
    }, 200);
  } else if(SNAKES[posNum]){
    setTimeout(()=>{
      playSnakeHiss();
      const dest = SNAKES[posNum];
      const tokenEl = p.tokenEl;
      tokenEl.style.transition='left .6s ease, top .6s ease';
      p.pos = dest;
      document.getElementById('ppos-'+currentIdx).textContent = p.pos;
      positionAllTokens();
      setTimeout(()=>{
        tokenEl.style.transition='left .35s ease, top .35s ease';
        finishTurn(rolledSix);
      }, 650);
    }, 200);
  } else {
    finishTurn(rolledSix);
  }
}

function finishTurn(rolledSix){
  isAnimating = false;
  const p = players[currentIdx];
  if(p.pos === 100){
    setTimeout(()=> declareWin(p), 300);
    return;
  }
  if(rolledSix === 6){
    // bonus turn for rolling a six
    updateTurnBanner();
    document.getElementById('rollBtn').disabled = false;
    return;
  }
  currentIdx = (currentIdx+1) % players.length;
  updateTurnBanner();
  document.getElementById('rollBtn').disabled = false;
}

function declareWin(p){
  playWinFanfare();
  document.getElementById('winText').textContent = `🏆 ${p.name} Wins!`;
  document.getElementById('winOverlay').classList.remove('hidden');
  launchConfetti();
}

document.getElementById('playAgainBtn').addEventListener('click', ()=>{
  document.getElementById('winOverlay').classList.add('hidden');
  gameBoardScreen.classList.add('hidden');
  playerSelect.classList.remove('hidden');
});

/* ================== SOUND TOGGLE ================== */
document.getElementById('soundToggle').addEventListener('click', function(){
  soundOn = !soundOn;
  this.textContent = soundOn ? '🔊 Sound: On' : '🔇 Sound: Off';
});

/* ================== CONFETTI ================== */
function launchConfetti(){
  const canvas = document.getElementById('confettiCanvas');
  canvas.classList.remove('hidden');
  canvas.width = window.innerWidth; canvas.height = window.innerHeight;
  const ctx = canvas.getContext('2d');
  const colors = ['#e63946','#3a86ff','#2ea043','#f4c542','#d4af37'];
  const pieces = Array.from({length:140}, ()=>({
    x: Math.random()*canvas.width,
    y: -20 - Math.random()*canvas.height*0.5,
    r: 4+Math.random()*5,
    c: colors[Math.floor(Math.random()*colors.length)],
    vy: 2+Math.random()*3,
    vx: -2+Math.random()*4,
    rot: Math.random()*360,
    vr: -6+Math.random()*12
  }));
  let frames=0;
  function draw(){
    ctx.clearRect(0,0,canvas.width,canvas.height);
    pieces.forEach(p=>{
      p.x+=p.vx; p.y+=p.vy; p.rot+=p.vr;
      ctx.save();
      ctx.translate(p.x,p.y); ctx.rotate(p.rot*Math.PI/180);
      ctx.fillStyle=p.c;
      ctx.fillRect(-p.r/2,-p.r/2,p.r,p.r*1.6);
      ctx.restore();
    });
    frames++;
    if(frames<220) requestAnimationFrame(draw);
    else canvas.classList.add('hidden');
  }
  draw();
}
