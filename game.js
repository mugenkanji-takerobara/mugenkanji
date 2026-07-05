// 安全な動的読み込み（重複防止・タイムアウト）
if (typeof window.loadMainGameScript !== "function") {
  window.loadMainGameScript = function(cb){
    if (window.mainGameLoaded) return cb && cb();
    if (window.loadingMainGame) return;
    window.loadingMainGame = true;
    const s = document.createElement('script');
    
    // ★ここを修正：ファイル名だけを指定する
    s.src = 'toyama-kiboukanji-j2.local.js';
    
    s.async = true;
    const to = setTimeout(()=>{ if(!window.mainGameLoaded){ window.loadingMainGame = false; console.error('load timeout', s.src); } }, 10000);
    s.onload = () => { clearTimeout(to); window.mainGameLoaded = true; window.loadingMainGame = false; cb && cb(); };
    s.onerror = () => { clearTimeout(to); window.loadingMainGame = false; console.error('failed to load', s.src); };
    document.head.appendChild(s);
  };
}
console.log("game.js loaded");

const kanjiList = ['三','五','八','九','百','千','万','億','兆'];
const bonusList = ['岳','代'];

// BGM フェード（使っているならこのまま）
function updateStoryBGM(pageIndex) {
  if (pageIndex <= 5) {
    fadeIn(storyBGM);
  } else {
    fadeOut(storyBGM);
  }
}
function fadeIn(audio) {
  if (!audio) return;
  let v = audio.volume;
  audio.play();
  let fade = setInterval(() => {
    if (v < 0.22) { v += 0.01; audio.volume = v; } else { clearInterval(fade); }
  }, 150);
}
function fadeOut(audio) {
  if (!audio) return;
  let v = audio.volume;
  let fade = setInterval(() => {
    if (v > 0) { v -= 0.01; audio.volume = v; } else { audio.pause(); clearInterval(fade); }
  }, 150);
}

// ======== DOM 読み込み後 ========
document.addEventListener("DOMContentLoaded", () => {
  console.log("JS Loaded");

  // 画面管理
  const screens = document.querySelectorAll(".screen");
  function showScreen(id) {
    screens.forEach(s => s.classList.remove("active"));
    const target = document.getElementById(id);
    if (target) target.classList.add("active");
  }

  // 最初の画面
  showScreen("title-screen");

  // BGM
  const bgm = document.getElementById("bgm");
  function playBGM() {
    if (bgm && bgm.paused) {
      bgm.volume = 0.01;
      bgm.play().catch(()=>{});
    }
  }

  // ======== Start ボタン ========
  const startBtn = document.getElementById("start-button");
  if (startBtn) {
    startBtn.addEventListener("click", () => {
      loadMainGameScript(() => {
        playBGM();
        showScreen("game-screen");
        if (typeof startGame === "function") startGame();
      });
    });
  }

  // ======== 説明書ボタン ========
  const manualBtn = document.getElementById("manual-button");
  if (manualBtn) {
    manualBtn.addEventListener("click", () => {
      playBGM();
      const overlay = document.getElementById("manualOverlay");
      if (overlay) overlay.classList.remove("hidden");
      if (typeof loadManualPage === "function") loadManualPage(0);
    });
  }

  // ======== とやまボタン ========
  const toyamaBtn = document.getElementById("toyama-button");
  if (toyamaBtn) {
    toyamaBtn.addEventListener("click", () => {
      console.log("toyama click");
      showScreen("toyamaScreen");
      if (typeof loadStoryPage === "function") loadStoryPage(0);
    });
  }

  // 雨晴海岸 → 物語画面
  const amaBtn = document.getElementById('toyama-amaharashi');
  if (amaBtn) amaBtn.addEventListener('click', () => {
    console.log('雨晴海岸 click');
    showScreen('storyScreen');
    if (typeof loadStoryPage === 'function') loadStoryPage(0);
  });
　// タイトル画面では戻るボタンを隠す
const backBtn = document.getElementById("back-button");
if(backBtn){
  const observer = new MutationObserver(()=>{
    const isTitle = document.getElementById("title-screen")?.classList.contains("active");
    backBtn.style.display = isTitle ? "none" : "block";
  });
  observer.observe(document.body, {attributes:true, subtree:true});
}

  // ======== 三味線（必要なら） ========
  function playShamisenTimed() {
    if (!window.shamisenIntro) return;
    shamisenIntro.currentTime = 0;
    shamisenIntro.volume = 0.001;
    shamisenIntro.play().catch(()=>{});
    setTimeout(()=>{ shamisenIntro.volume = 0.0005; }, 15000);
    setTimeout(()=>{ shamisenIntro.volume = 0.0003; }, 18000);
    setTimeout(()=>{ shamisenIntro.pause(); shamisenIntro.currentTime = 0; }, 20000);
  }

  // ======== キャンバス ========
  const canvas = document.getElementById("game-canvas");
  const ctx = canvas ? canvas.getContext("2d") : null;
  if (canvas) {
    canvas.width = 800;
    canvas.height = 600;
  }

  // ここにクリック処理やゲーム用の追加イベントを書く
  if (canvas) {
    canvas.addEventListener("click", (e) => {
      // 既存のクリック処理があればここに
    });
  }

}); // DOMContentLoaded end
