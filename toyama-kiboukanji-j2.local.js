// toyama-kiboukanji-j2.js - 統合・構文チェック済み（安全版）

(() => {
  let scoreRanking = [];  // {score, time} の配列にする例

  const $ = id => document.getElementById(id);

  // --- 基本データ ---
  const kanjiList = ['三', '五', '八', '九', '百', '千', '万', '億', '兆'];
  const bonusList = ['岳', '代'];
  const titleChars = ['き', 'ぼ', 'う', 'か', 'ん', 'じ'];
  const SCORE_KEY = 'kibou_scores';

  // --- オーディオ（安全初期化） ---
  let waveBGM = null;
  let storyBGM = null;
  let shamisenIntro = null;
  let bgmNormal = null;
  let bgmBonus = null;
  // ★ オーディオ安全スタブ（IIFE 内・宣言直後に1回だけ置く）
if (typeof window === 'object') {
  const safeAudioStub = {
    play: () => Promise.resolve(),
    pause: () => {},
    currentTime: 0,
    loop: false,
    volume: 0
  };
  // 既に値が入っていなければ安全なオブジェクトを割り当てる
  window.waveBGM = window.waveBGM || waveBGM || safeAudioStub;
  window.storyBGM = window.storyBGM || storyBGM || safeAudioStub;
  window.shamisenIntro = window.shamisenIntro || shamisenIntro || safeAudioStub;
  window.bgmNormal = window.bgmNormal || bgmNormal || safeAudioStub;
  window.bgmBonus = window.bgmBonus || bgmBonus || safeAudioStub;
  // ローカル変数にも反映（既存コードがローカルを参照する場合の保険）
  waveBGM = waveBGM || window.waveBGM;
  storyBGM = storyBGM || window.storyBGM;
  shamisenIntro = shamisenIntro || window.shamisenIntro;
  bgmNormal = bgmNormal || window.bgmNormal;
  bgmBonus = bgmBonus || window.bgmBonus;
}

  // 外部で本物が定義されるまでのプレースホルダ
  function wireTouchHandlers() { return; }

  function initAudio() {
   try {
      waveBGM = new Audio('audio/warayatakashi.mp3');
      waveBGM.loop = true;
      waveBGM.volume = 0.01;
    } catch (e) {
      waveBGM = null;
    }

    try {
      storyBGM = new Audio('audio/shamisen_intro.mp3');
      storyBGM.loop = true;
      storyBGM.volume = 0.02;
    } catch (e) {
      storyBGM = null;
    }

    try {
      shamisenIntro = new Audio('audio/shamisen_intro.mp3');
      shamisenIntro.volume = 0.001;
    } catch (e) {
      shamisenIntro = null;
    }

    try {
      bgmNormal = document.getElementById('bgmNormal');
    } catch (e) {
      bgmNormal = null;
    }

    try {
      bgmBonus = document.getElementById('bgmBonus');
    } catch (e) {
      bgmBonus = null;
    }
     }

  function safePlay(a) {
    try {
      a?.play?.().catch(() => {});
    } catch (e) {}
  }

  function playNormalBGM() {
    try {
      bgmBonus?.pause();
      if (bgmBonus) bgmBonus.currentTime = 0;
      if (bgmNormal) {
        bgmNormal.volume = 0.03;
        bgmNormal.play().catch(() => {});
      }
    } catch (e) {}
  }

  function playBonusBGM() {
    try {
      bgmNormal?.pause();
      if (bgmBonus) {
        bgmBonus.volume = 0.03;
        bgmBonus.play().catch(() => {});
      }
    } catch (e) {}
  }

  function stopAllBGM() {
    try {
      bgmNormal?.pause();
      bgmBonus?.pause();
      waveBGM?.pause();
      storyBGM?.pause();
      shamisenIntro?.pause();
    } catch (e) {}
  }

  // --- 画面スケール調整 ---
  function resizeCanvas() {
    const wrap = document.getElementById('wrap');
    if (!wrap) return;
    const scale = Math.min(window.innerWidth / 360, window.innerHeight / 720);
    wrap.style.transform = `scale(${scale})`;
    wrap.style.transformOrigin = 'top center';
  }

  // --- 画面管理 ---
  function hideAllScreens() {
    document.querySelectorAll('.screen').forEach(s => {
      s.classList.add('hidden');
      s.classList.remove('active');
    });
  }

  function showScreen(id) {
    hideAllScreens();
    const t = $(id) || document.getElementById(id);
    if (t) {
      t.classList.remove('hidden');
      t.classList.add('active');
    }
  }
   // --- transient controls ---
  let transientTimer = null;
  function showTransient(ms = 4000) {
    const transient = $('transientControls');
    if (!transient) return;
    const gameActive = $('game-screen')?.classList.contains('active');
    if (gameActive) return;
    transient.classList.add('visible');
    clearTimeout(transientTimer);
    transientTimer = setTimeout(() => transient.classList.remove('visible'), ms);
  }

  // =========================
  //  落ちる漢字モード（簡易）
  // =========================
  let canvas = null;
  let ctx = null;
  let fallingKanji = [];
  let fkInterval = null;
  let fkTimer = null;
  let fkScore = 0;
  let fkTimeLeft = 60;
  let fkCombo = 0;
  let fkLastHit = 0;

  function createKanji() {
    if (!canvas) return;
    const text = kanjiList[Math.floor(Math.random() * kanjiList.length)];
    const x = Math.random() * Math.max(0, canvas.width - 50);
  const y = -50;
    const speed = 2 + Math.random() * 3;
    fallingKanji.push({ text, x, y, speed });
  }

  function fkLoop() {
    if (!ctx || !canvas) {
      requestAnimationFrame(fkLoop);
      return;
    }
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.font = '48px serif';
    ctx.fillStyle = '#ffffff';
    for (let i = 0; i < fallingKanji.length; i++) {
      const k = fallingKanji[i];
      k.y += k.speed;
      ctx.fillText(k.text, k.x, k.y);
      if (k.y > canvas.height + 50) {
        fallingKanji.splice(i, 1);
        i--;
      }
    }
    requestAnimationFrame(fkLoop);
  }


  function startFkGame() {
    fkScore = 0;
    fkTimeLeft = 60;
    fallingKanji = [];
    fkCombo = 0;
    fkLastHit = 0;
   if (fkInterval) clearInterval(fkInterval);
    if (fkTimer) clearInterval(fkTimer);
    fkInterval = setInterval(createKanji, 800);
    fkTimer = setInterval(() => {
      fkTimeLeft--;
      if (fkTimeLeft <= 0) endFkGame();
    }, 1000);
    requestAnimationFrame(fkLoop);
  }

  function endFkGame() {
    if (fkInterval) clearInterval(fkInterval);
    if (fkTimer) clearInterval(fkTimer);
    const res = $('result-score');
    if (res) res.textContent = fkScore;
    showScreen('result-screen');
  }

  function addFkScore(base) {
    const now = Date.now();
    if (now - fkLastHit < 1000) fkCombo++;
    else fkCombo = 1;
    fkLastHit = now;
    const bonus = base * fkCombo;
    fkScore += bonus;
    showComboEffect(fkCombo, bonus);
  }

  function onFkClick(e) {
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const clientX = e.clientX || (e.touches && e.touches[0].clientX);
    const clientY = e.clientY || (e.touches && e.touches[0].clientY);
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    for (let i = 0; i < fallingKanji.length; i++) {
      const k = fallingKanji[i];
      const dx = x - (k.x + 20);
      const dy = y - (k.y - 20);
      if (Math.abs(dx) < 30 && Math.abs(dy) < 30) {
        fallingKanji.splice(i, 1);
        addFkScore(10);
        break;
      }
    }
  }

  // =========================
  //  きぼうかんじ（盤面）モード
  // =========================
  const ROWS = 12;
  const COLS = 6;
  const SIZE = 40;
  const OFFSET_X = 40;
  const OFFSET_Y = 140;

  let board = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
  let cur = null;
  let gameScore = 0;
  let gameOver = false;
  let started = false;
  let fallInterval = 700;
  let lastFallTime = 0;
  let fastDrop = false;
  let chainCount = 0;
  let bonusMode = null;
  let bonusRemaining = 0;
  let selectedCell = null;
  let next1 = null;
  let next2 = null;
  let level = 'easy';
  let isPaused = false;

window.board = board;
window.cur = cur;
window.gameOver = gameOver;
window.isPaused = isPaused;
window.next1 = next1;
window.next2 = next2;

  class Piece {
    constructor(isPair = false) {
      if (isPair) {
        this.blocks = [
          { x: 2, y: 0, type: randomType() },
          { x: 3, y: 0, type: randomType() }
        ];
      } else {
        this.blocks = [
          { x: 2, y: 0, type: randomType() }
        ];
      }
    }
  }

  function randomType() {
    const isBonus = Math.random() < 0.12;
    return isBonus
      ? bonusList[Math.floor(Math.random() * bonusList.length)]
      : kanjiList[Math.floor(Math.random() * kanjiList.length)];
  }

  function getSeason(score) {
    const idx = Math.floor(score / 200) % 4;
    return ['spring', 'summer', 'autumn', 'winter'][idx];
  }

  function drawBackground() {
    if (!ctx) return;
    const season = getSeason(gameScore);
    const sky = ctx.createLinearGradient(0, 0, 0, 140);
    sky.addColorStop(0, '#87CEEB');
    sky.addColorStop(1, '#E0FFFF');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, 360, 140);

    if (season === 'spring') {
      ctx.fillStyle = '#F0F8FF';
      ctx.fillRect(0, 120, 360, 40);
      ctx.fillStyle = '#87CEFA';
      ctx.fillRect(0, 140, 360, 30);
      ctx.fillStyle = '#228B22';
      ctx.fillRect(0, 170, 360, 20);
      ctx.fillStyle = '#FFC0CB';
      for (let i = 0; i < 8; i++) {
        ctx.beginPath();
        ctx.arc(20 + i * 40, 130, 8, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (season === 'summer') {
      ctx.fillStyle = '#2E8B57';
      ctx.beginPath();
      ctx.moveTo(0, 120);
      ctx.lineTo(40, 80);
      ctx.lineTo(90, 110);
      ctx.lineTo(150, 70);
      ctx.lineTo(210, 105);
      ctx.lineTo(270, 75);
      ctx.lineTo(330, 110);
      ctx.lineTo(360, 90);
      ctx.lineTo(360, 140);
      ctx.lineTo(0, 140);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#228B22';
      ctx.fillRect(0, 140, 360, 20);
       } else if (season === 'autumn') {
      ctx.fillStyle = '#8B4513';
      ctx.fillRect(0, 120, 360, 40);
      const colors = ['#FF8C00', '#FF4500', '#FFD700'];
      for (let i = 0; i < 9; i++) {
        ctx.fillStyle = colors[i % 3];
        ctx.beginPath();
        ctx.arc(20 + i * 40, 120, 10, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (season === 'winter') {
      ctx.fillStyle = '#F8F8FF';
      ctx.beginPath();
      ctx.moveTo(0, 130);
      ctx.lineTo(40, 90);
      ctx.lineTo(90, 120);
      ctx.lineTo(150, 80);
      ctx.lineTo(210, 115);
      ctx.lineTo(270, 85);
      ctx.lineTo(330, 120);
      ctx.lineTo(360, 100);
      ctx.lineTo(360, 140);
      ctx.lineTo(0, 140);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#00BFFF';
      ctx.fillRect(0, 140, 360, 40);
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.ellipse(60, 160, 10, 6, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(120, 162, 12, 5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
          ctx.ellipse(190, 162, 16, 6, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = '#F0F8FF';
    ctx.fillRect(OFFSET_X - 4, OFFSET_Y - 4, COLS * SIZE + 8, ROWS * SIZE + 8);

    const sea = ctx.createLinearGradient(0, OFFSET_Y + ROWS * SIZE + 10, 0, 640);
    sea.addColorStop(0, '#00BFFF');
    sea.addColorStop(1, '#1E90FF');
    ctx.fillStyle = sea;
    ctx.fillRect(0, OFFSET_Y + ROWS * SIZE + 10, 360, 640 - (OFFSET_Y + ROWS * SIZE + 10));
  }

  function drawGrid() {
    if (!ctx) return;
    ctx.strokeStyle = 'rgba(0,0,0,0.15)';
    ctx.lineWidth = 1;
    for (let r = 0; r <= ROWS; r++) {
      const y = OFFSET_Y + r * SIZE;
      ctx.beginPath();
      ctx.moveTo(OFFSET_X, y);
      ctx.lineTo(OFFSET_X + COLS * SIZE, y);
      ctx.stroke();
    }
    for (let j = 0; j <= COLS; j++) {
      const x = OFFSET_X + j * SIZE;
      ctx.beginPath();
      ctx.moveTo(x, OFFSET_Y);
      ctx.lineTo(x, OFFSET_Y + ROWS * SIZE);
      ctx.stroke();
    }
  }

  function drawTitleOverlay() {
    if (!ctx) return;
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const baseX = 40;
    const baseY = 40;
    const lineHeight = 30;
    for (let i = 0; i < titleChars.length; i++) {
      const ch = titleChars[i];
      const y = baseY + i * lineHeight;
      ctx.font = 'bold 24px sans-serif';
      ctx.fillStyle = '#FFFFFF';
      ctx.fillText(ch, baseX, y);
      if (ch === 'ぼ' || ch === 'じ') {
        ctx.font = '16px sans-serif';
        ctx.fillStyle = '#FF69B4';
        ctx.fillText('♥', baseX + 14, y - 10);
      }
    }
    ctx.font = '12px sans-serif';
    ctx.fillStyle = '#FFFFFF';
    const lines = [
      'とやまの無限漢字',
      '～立山連峰から日本海まで、',
      '希望の数え唄～'
    ];
    let sy = baseY + titleChars.length * lineHeight + 10;
    for (const line of lines) {
      ctx.fillText(line, 190, sy);
      sy += 16;
    }
    ctx.font = '10px sans-serif';
    ctx.fillText('Game designed by Team shiob', 190, sy + 10);
    ctx.restore();
  }

  function drawNextPieces() {
    if (!ctx) return;
    if (!next1) return;
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '12px sans-serif';
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText('NEXT', 300, 20);
      ctx.fillText('NEXT2', 300, 80);

    function drawMiniPiece(piece, baseY) {
      piece.blocks.forEach((b, idx) => {
        const x = 300 + (idx - 0.5) * 20;
        const y = baseY + 20;
        ctx.beginPath();
        ctx.fillStyle = 'rgba(255,255,255,0.9)';
        ctx.arc(x, y, 12, 0, Math.PI * 2);
        ctx.fill();
        if (bonusList.includes(b.type)) {
          ctx.strokeStyle = '#FFD700';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(x, y, 13, 0, Math.PI * 2);
          ctx.stroke();
        }
        ctx.fillStyle = '#000';
        ctx.font = 'bold 16px sans-serif';
        ctx.fillText(b.type, x, y + 1);
      });
    }

   drawMiniPiece(next1, 30);
    if (next2) drawMiniPiece(next2, 90);
    ctx.restore();
  }

  function drawKanjiCell(x, y, t, isCurrent) {
    if (!ctx) return;
    const px = OFFSET_X + x * SIZE + SIZE / 2;
    const py = OFFSET_Y + y * SIZE + SIZE / 2;
    ctx.beginPath();
    ctx.fillStyle = isCurrent ? 'rgba(255,255,255,0.98)' : 'rgba(255,255,255,0.9)';
    ctx.arc(px, py, 18, 0, Math.PI * 2);
    ctx.fill();

    if (bonusMode === '代' && selectedCell && selectedCell.x === x && selectedCell.y === y) {
      ctx.strokeStyle = '#FFD700';
      ctx.lineWidth = 4;
      ctx.beginPath();
        ctx.arc(px, py, 22, 0, Math.PI * 2);
      ctx.stroke();
    }

    if (bonusList.includes(t)) {
      ctx.strokeStyle = '#FFD700';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(px, py, 20, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.fillStyle = '#000000';
    ctx.font = isCurrent ? 'bold 24px sans-serif' : 'bold 20px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(t, px, py + 1);
  }

  function drawPauseOverlay() {
    if (!ctx) return;
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(40, 260, 280, 120);
    ctx.fillStyle = 'white';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '20px sans-serif';
    ctx.fillText('一時停止中', 180, 300);
    ctx.font = '14px sans-serif';
    ctx.fillText('「再開 ▶」でつづきから遊べます。', 180, 330);
  }

  function drawGameOverOverlay() {
    if (!ctx) return;
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(30, 230, 300, 200);
    ctx.fillStyle = 'white';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '22px sans-serif';
     ctx.fillText('GAME OVER', 180, 250);
    ctx.font = '18px sans-serif';
    ctx.fillText('SCORE ' + gameScore, 180, 280);
    const arr = loadScores();
    ctx.font = '16px sans-serif';
    ctx.fillText('TOP 3', 180, 310);
    ctx.textAlign = 'left';
    let y = 335;
    for (let i = 0; i < 3; i++) {
      const item = arr[i];
      if (item) {
        const rank = (i + 1).toString();
        const line = `${rank}  ${item.score}  ${item.date}`;
        ctx.fillText(line, 80, y);
        y += 22;
      }
    }
  }

  function draw() {
    if (!ctx) return;
    ctx.clearRect(0, 0, 360, 640);
    drawBackground();
    drawGrid();
    for (let r = 0; r < ROWS; r++) {
      for (let j = 0; j < COLS; j++) {
        const t = board[r][j];
        if (t) drawKanjiCell(j, r, t, false);
      }
    }
    if (cur && !bonusMode && !gameOver) {
      cur.blocks.forEach(b => drawKanjiCell(b.x, b.y, b.type, true));
    }
    ctx.fillStyle = 'white';
    ctx.font = 'bold 18px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText('SCORE ' + gameScore, 10, 10);
    drawNextPieces();
    if (!started) drawTitleOverlay();
     if (gameOver) drawGameOverOverlay();
    if (isPaused && !gameOver && started) drawPauseOverlay();
    if (bonusMode) {
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(20, 260, 320, 140);
      ctx.fillStyle = 'white';
      ctx.font = '20px sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'alphabetic';
      ctx.fillText('ボーナス発動！ [' + bonusMode + ']', 40, 295);
      ctx.font = '16px sans-serif';
      if (bonusMode === '岳') {
        ctx.fillText('消したい漢字をタップ！！！', 40, 325);
        ctx.fillText('のこり ' + bonusRemaining + ' 漢字', 80, 350);
      } else if (bonusMode === '代') {
        ctx.fillText('入れ替えたい漢字をタップ！！！', 40, 325);
        ctx.fillText('のこり ' + bonusRemaining + ' 回', 80, 350);
      }
    }
  }

  // --- スコア保存 ---
  function getTodayString() {
    const d = new Date();
    const y = d.getFullYear();
    const m = (d.getMonth() + 1).toString().padStart(2, '0');
    const day = d.getDate().toString().padStart(2, '0');
    return `${y}${m}${day}`;
  }

  function loadScores() {
    try {
      const s = localStorage.getItem(SCORE_KEY);
      if (!s) return [];
      const arr = JSON.parse(s);
      if (Array.isArray(arr)) return arr;
      return [];
    } catch (e) {
     return [];
    }
  }

  function saveScores(arr) {
    localStorage.setItem(SCORE_KEY, JSON.stringify(arr));
  }

  function updateScores() {
    const arr = loadScores();
    arr.push({ score: gameScore, date: getTodayString() });
    arr.sort((a, b) => b.score - a.score);
    const top3 = arr.slice(0, 3);
    saveScores(top3);
  }

  function resetRecords() {
    if (confirm('記録を全て消しますか？')) {
      localStorage.removeItem(SCORE_KEY);
    }
  }

  // --- ゲーム盤面操作 ---
  function resetBoard() {
    board = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
  }
  function resetGame() {
  resetBoard();
  gameScore = 0;
  chainCount = 0;
  gameOver = false;
  bonusMode = null;
  bonusRemaining = 0;
  selectedCell = null;

  next1 = new Piece(level === 'hard');
  next2 = new Piece(level === 'hard');
  cur = next1;
  next1 = next2;
  next2 = new Piece(level === 'hard');

  lastFallTime = performance.now();
}

  function spawnPiece() {
    cur = next1;
    next1 = next2;
    next2 = new Piece(level === 'hard');
    for (const b of cur.blocks) {
      if (board[0][b.x]) {
        gameOver = true;
        stopAllBGM();
        document.getElementById('restartBtn')?.classList.remove('hidden');
        updateScores();
        return;
      }
    }
  }

  function stepFall() {
    if (isPaused) return;
    if (gameOver || bonusMode) return;
    if (!cur) {
      spawnPiece();
      return;
    }
    cur.blocks.forEach(b => b.y++);
    const collided = cur.blocks.some(b => b.y >= ROWS || board[b.y][b.x]);
    if (collided) {
      cur.blocks.forEach(b => b.y--);
      cur.blocks.forEach(b => {
        board[b.y][b.x] = b.type;
      });
      if (fastDrop) gameScore += 3;
      fastDrop = false;
       handleLanding();
      cur = null;
      if (!gameOver) spawnPiece();
    }
  }

  function handleLanding() {
    const result = clearMatchesAndBonus();
    if (result.cleared > 0) {
      chainCount++;
      gameScore += result.cleared * 10 * chainCount;
    } else {
      chainCount = 0;
    }
    result.bonusHits.forEach(ch => {
      triggerBonus(ch);
    });
    for (let j = 0; j < COLS; j++) {
      if (board[0][j]) {
        gameOver = true;
        stopAllBGM();
        document.getElementById('restartBtn')?.classList.remove('hidden');
        break;
      }
    }
  }

 function clearMatchesAndBonus() {
    let toClear = Array.from({ length: ROWS }, () => Array(COLS).fill(false));
    let count = 0;
    let bonusCount = { '岳': 0, '代': 0 };

    // 縦
    for (let j = 0; j < COLS; j++) {
      let runChar = null;
      let runStart = 0;
      let runLen = 0;
      for (let r = 0; r <= ROWS; r++) {
        const t = (r < ROWS) ? board[r][j] : null;
         if (t && t === runChar) {
          runLen++;
        } else {
          if (runChar && runLen >= 3) {
            for (let rr = runStart; rr < runStart + runLen; rr++) {
              toClear[rr][j] = true;
              if (bonusList.includes(runChar)) bonusCount[runChar]++;
            }
          }
          runChar = t;
          runStart = r;
          runLen = t ? 1 : 0;
        }
      }
    }

    // 横
    for (let r = 0; r < ROWS; r++) {
      let runChar = null;
      let runStart = 0;
      let runLen = 0;
      for (let j = 0; j <= COLS; j++) {
        const t = (j < COLS) ? board[r][j] : null;
        if (t && t === runChar) {
          runLen++;
        } else {
          if (runChar && runLen >= 3) {
            for (let jj = runStart; jj < runStart + runLen; jj++) {
              toClear[r][jj] = true;
              if (bonusList.includes(runChar)) bonusCount[runChar]++;
            }
          }
          runChar = t;
          runStart = j;
         runLen = t ? 1 : 0;
        }
      }
    }

    for (let r = 0; r < ROWS; r++) {
      for (let j = 0; j < COLS; j++) {
        if (toClear[r][j]) {
          board[r][j] = null;
          count++;
        }
      }
    }

    if (count > 0) {
      for (let j = 0; j < COLS; j++) {
        let stack = [];
        for (let r = ROWS - 1; r >= 0; r--) {
          if (board[r][j]) stack.push(board[r][j]);
        }
        for (let r = ROWS - 1; r >= 0; r--) {
          board[r][j] = stack.length ? stack.shift() : null;
        }
      }
    }

    const bonusHits = new Set();
    for (const ch of bonusList) {
      if (bonusCount[ch] >= 3) bonusHits.add(ch);
    }

    return { cleared: count, bonusHits };
  }

  function triggerBonus(ch) {
    bonusMode = ch;
    playBonusBGM();
     if (ch === '代') {
      bonusRemaining = 3;
    } else if (ch === '岳') {
      if (confirm('盤面を替えていいですか？')) {
        shuffleBoard();
      }
      bonusRemaining = 0;
      bonusMode = null;
      playNormalBGM();
    }
  }

  function shuffleBoard() {
    let cells = [];
    for (let r = 0; r < ROWS; r++) {
      for (let j = 0; j < COLS; j++) {
        if (board[r][j]) cells.push(board[r][j]);
        board[r][j] = null;
      }
    }
    for (let r = ROWS - 1; r >= 0; r--) {
      for (let j = 0; j < COLS; j++) {
        if (cells.length === 0) return;
        const idx = Math.floor(Math.random() * cells.length);
        board[r][j] = cells[idx];
        cells.splice(idx, 1);
      }
    }
  }

  function handleBonusTapTouch(touch) {
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;
    const col = Math.floor((x - OFFSET_X) / SIZE);
    const row = Math.floor((y - OFFSET_Y) / SIZE);
    if (col < 0 || col >= COLS || row < 0 || row >= ROWS) return;

    if (bonusMode === '岳') {
    if (board[row][col]) {
        if (confirm('この漢字を消していいですか？')) {
          board[row][col] = null;
          bonusRemaining--;
          const result = clearMatchesAndBonus();
          if (result.cleared > 0) {
            chainCount++;
            gameScore += result.cleared * 10 * chainCount;
          } else {
            chainCount = 0;
          }
          if (bonusRemaining <= 0) {
            bonusMode = null;
            playNormalBGM();
          }
        }
      }
    } else if (bonusMode === '代') {
      if (!selectedCell) {
        if (board[row][col]) selectedCell = { r: row, c: col };
      } else {
        const r1 = selectedCell.r;
        const c1 = selectedCell.c;
        const r2 = row;
        const c2 = col;
        showBonusDialog('この二つを入れ替えます', ok => {
          if (ok) {
            const tmp = board[r1][c1];
            board[r1][c1] = board[r2][c2];
            board[r2][c2] = tmp;
            bonusRemaining--;
            const result = clearMatchesAndBonus();
            if (result.cleared > 0) {
              chainCount++;
              gameScore += result.cleared * 10 * chainCount;
            } else {
              chainCount = 0;
            }
            if (bonusRemaining <= 0) {
              bonusMode = null;
              playNormalBGM();
            }
          }
          selectedCell = null;
          draw();
        });
      }
    }
    draw();
  }

  // 簡易ダイアログ（本物が別にあればそちらを使う想定）
  function showBonusDialog(msg, cb) {
    const ok = confirm(msg);
    cb(!!ok);
  }

  // --- コンボエフェクト ---
  function showComboEffect(cVal, bonus) {
    const effect = document.createElement('div');
    effect.className = 'combo-effect';
    effect.textContent = `${cVal} Combo! +${bonus}`;
    Object.assign(effect.style, {
      position: 'fixed',
      left: '50%',
      top: '20%',
      transform: 'translateX(-50%)',
      padding: '8px 12px',
      background: 'rgba(0,0,0,0.6)',
      color: '#fff',
      borderRadius: '6px',
      zIndex: 9999
    });

 document.body.appendChild(effect);
     setTimeout(() => effect.remove(), 800);
  }

  // --- メイン描画ループ（board mode） ---
  function loop(timestamp) {
    if (typeof lastFallTime === 'undefined') lastFallTime = 0;

    if (started && !gameOver && !isPaused) {
      const interval = fastDrop ? Math.max(50, Math.floor(fallInterval / 5)) : fallInterval;
      if (!lastFallTime) lastFallTime = timestamp || performance.now();
      if ((timestamp || performance.now()) - lastFallTime >= interval) {
        lastFallTime = timestamp || performance.now();
        if (typeof stepFall === 'function') stepFall();
        fastDrop = false;
      }
    }

    if (typeof draw === 'function') draw();

    requestAnimationFrame(loop);
  }

  // --- DOMContentLoaded ---
  document.addEventListener('DOMContentLoaded', () => {
    initAudio();
    try {
      waveBGM?.pause();
      if (waveBGM) waveBGM.currentTime = 0;
    } catch (e) {}
    try {
      storyBGM?.pause();
      if (storyBGM) storyBGM.currentTime = 0;
    } catch (e) {}
    try {
      shamisenIntro?.pause();
      if (shamisenIntro) shamisenIntro.currentTime = 0;
    } catch (e) {}

  // IDをHTML(gameCanvas)に合わせる
    canvas = document.getElementById('gameCanvas') || document.querySelector('canvas');
    if (canvas) {
      ctx = canvas.getContext('2d');
      
      // ★ 最重要修正：非表示状態（clientWidth=0）に引っ張られないよう、内部解像度をゲーム仕様（360x640）に固定！
      canvas.width = 360;
      canvas.height = 640;
      
      // CSS上の見た目のサイズをコンテナに合わせる
      canvas.style.display = 'block';
      canvas.style.width = '100%';
      canvas.style.height = '100%'; 
      canvas.style.maxHeight = '80vh'; // 画面からはみ出さないように調整

      console.log('Canvas ready. Size:', canvas.width, canvas.height);

      // タッチ・クリックイベントの設定
      canvas.addEventListener('click', onFkClick);
      canvas.addEventListener('touchstart', onFkClick, { passive: true });

      canvas.addEventListener('click', e => {
        const rect = canvas.getBoundingClientRect();
        // 実際の表示サイズと内部解像度(360x640)の比率を計算して正確なタップ位置を取得
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        const x = Math.floor(((e.clientX - rect.left) * scaleX - OFFSET_X) / SIZE);
        const y = Math.floor(((e.clientY - rect.top) * scaleY - OFFSET_Y) / SIZE);
        
        if (x >= 0 && x < COLS && y >= 0 && y < ROWS) {
          selectedCell = { x, y };
        }
      });

      canvas.addEventListener('touchstart', e => {
 // --- 1. wireTouchHandlers ---
  if (typeof wireTouchHandlers === 'function') {
    try {
      wireTouchHandlers();
    } catch (e) {
      console.error('wireTouchHandlers error', e);
    }
  }

  // --- 2. ユーティリティ (getElementヘルパー) ---
  const getEl = (id) => document.getElementById(id);

  // --- 3. Startボタンの統合 ---
  const startBtn = getEl('start-button');
  if (startBtn) {
    startBtn.addEventListener('click', () => {
      console.log('Start clicked');
      showScreen('game-screen');
      const gs = getEl('game-screen');
      if (gs) {
        gs.style.display = 'block';
        gs.style.visibility = 'visible';
        gs.style.minHeight = '100vh';
      }
      if (window._gameLoopStarted) return;
      try { safePlay && safePlay(waveBGM); } catch(e){}
      try {
        if (typeof startFkGame === 'function') startFkGame();
        if (typeof resetGame === 'function') resetGame();
      } catch(e){}
      window._gameLoopStarted = true;
      window.started = true;
      if (typeof updateStoryBGM === 'function') updateStoryBGM(1);
    });
  }

  // --- 4. その他のボタンイベント ---
  const storyPrev = getEl('story-prev');
  if (storyPrev) storyPrev.addEventListener('click', () => {
    if (typeof updateStoryBGM === 'function') updateStoryBGM(0);
  });

  const langToggle = getEl('langToggle');
  if (langToggle) langToggle.addEventListener('click', () => {
    if (typeof setLang === 'function' && typeof currentLang !== 'undefined') {
      setLang(currentLang === 'jp' ? 'en' : 'jp');
    }
  });

  // --- 5. Transient UI ---
  setTimeout(() => showTransient(5000), 2000);
  setInterval(() => showTransient(4000 + Math.floor(Math.random() * 3000)), 30000);
  ['click', 'touchstart', 'mousemove'].forEach(ev =>
    window.addEventListener(ev, () => showTransient(5000), { passive: true })
  );

  // --- 6. スコア・時間ディスプレイ ---
  if (!getEl('score-display')) {
    const sd = document.createElement('div');
    sd.id = 'score-display';
    sd.style.display = 'none';
    document.body.appendChild(sd);
  }
  if (!getEl('time-display')) {
    const td = document.createElement('div');
    td.id = 'time-display';
    td.style.display = 'none';
    document.body.appendChild(td);
  }

  // --- 7. スポットボタン (iwase, yao, sci, toyamajo, mirage) ---
  const spotBtns = [
    ['iwaseSpotBtn', 'toyamaScreen', 'iwaseDetailScreen'],
    ['yaoSpotBtn', 'toyamaScreen', 'yaoDetailScreen'],
    ['sciSpotBtn', 'toyamaScreen', 'sciDetailScreen'],
    ['toyamajoSpotBtn', 'toyamaScreen', 'toyamajoDetailScreen'],
    ['mirageSpotBtn', 'toyamaScreen', 'mirageDetailScreen']
  ];
  spotBtns.forEach(s => {
    const btn = getEl(s[0]);
    if (btn) btn.addEventListener('click', () => {
      getEl(s[1])?.classList.add('hidden');
      getEl(s[2])?.classList.remove('hidden');
      showTransient(3500);
    });
  });

  // --- 8. REPLAY ---
  const restartBtn = getEl('restartBtn');
  if (restartBtn) {
    restartBtn.onclick = () => {
      restartBtn.classList.add('hidden');
      const gs = getEl('game-screen');
      if (gs) gs.style.display = 'block';
      if (typeof resetGame === 'function') resetGame();
      if (typeof startFkGame === 'function') startFkGame();
    };
  }

  if (window._startLoopWhenReady && typeof loop === 'function') {
    window._startLoopWhenReady = false;
    window._gameLoopStarted = true;
    requestAnimationFrame(loop);
  }

}); // DOMContentLoadedの閉じカッコ

// --- 画面切替（安全版） ---
function showScreen(id){
  document.querySelectorAll('.screen').forEach(s=>{
    s.classList.add('hidden');
    s.classList.remove('active');
    s.style.display = 'none';
  });
  const el = document.getElementById(id);
  if(!el) return;
  el.classList.remove('hidden');
  el.classList.add('active');
  el.style.display = 'block';
  el.style.visibility = 'visible';
  el.style.opacity = '1';
  el.style.zIndex = '9999';
}
window.showScreen = showScreen;

function showHowto(){ showScreen('manualOverlay'); }
function showToyama(){ showScreen('toyamaScreen'); }
function showAmahara(){ showScreen('storyScreen'); }

(function(){
  try {
    const bindIf = (id, fn) => {
      const el = document.getElementById(id);
      if (!el) return;
      el.addEventListener('click', fn);
    };
    bindIf('manual-button', showHowto);
    bindIf('toyama-button', showToyama);
    bindIf('toyama-amaharashi', showAmahara);
    bindIf('amaharashiStoryBtn', showAmahara);

    window.showHowto = showHowto;
    window.showToyama = showToyama;
    window.showAmahara = showAmahara;
  } catch(e){ console.error(e); }
})();
