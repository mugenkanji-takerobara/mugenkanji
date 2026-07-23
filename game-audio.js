// きぼうかんじ 公開版 Ver.1.0
// 通常BGM・特の符BGM・物語音・短い効果音
// 更新日: 2026-07-17

(() => {
  "use strict";

  const app = window.KibouKanji = window.KibouKanji || {};
  const 音声版 = "1.0.1";

  const 音声 = {
    BGM: {},
    効果音: {},
    現在BGM: null,
    再開予定BGM: null,
    利用者操作済み: false,
    三味線停止: null
  };

  /* 元の音声が長い場合でも、効果音として必要な時間で必ず停止する。 */
  const 効果音最大ミリ秒 = {
    match: 1100,
    drop: 600,
    bonus: 1200,
    scene: 850,
    store: 1100
  };

  const 版付き = path => `${path}${path.includes("?") ? "&" : "?"}v=${音声版}`;

  const 音声作成 = (候補, 設定 = {}) => {
    const audio = new Audio();
    audio.preload = "auto";
    audio.loop = Boolean(設定.loop);
    audio.volume = 設定.volume ?? 0.3;
    audio.playsInline = true;
    audio.setAttribute("playsinline", "");

    let 番号 = 0;
    const 次を試す = () => {
      if (番号 >= 候補.length) {
        audio.dataset.notFound = "1";
        return;
      }
      audio.dataset.notFound = "0";
      audio.src = 版付き(候補[番号++]);
      audio.load();
    };

    audio.addEventListener("error", 次を試す);
    audio.addEventListener("ended", () => {
      if (!audio.loop || document.hidden) return;
      try { audio.currentTime = 0; } catch {}
      audio.play().catch(() => {});
    });
    次を試す();
    return audio;
  };

  const 停止 = (audio, 先頭へ = false) => {
    if (!audio) return;
    audio.pause();
    if (先頭へ) {
      try { audio.currentTime = 0; } catch {}
    }
  };

  const 再生 = (audio, 先頭から = false) => {
    if (!audio || audio.dataset.notFound === "1" || !音声.利用者操作済み) return;
    if (先頭から) {
      try { audio.currentTime = 0; } catch {}
    }
    audio.muted = false;
    const promise = audio.play();
    promise?.catch(() => {
      /* Safari等で止められた場合、次の画面タップで再試行する。 */
    });
  };

  const BGM切替 = (名前, 先頭から = false) => {
    if (!名前 || !音声.BGM[名前]) return;
    音声.再開予定BGM = 名前;

    Object.entries(音声.BGM).forEach(([key, track]) => {
      if (key !== 名前) 停止(track, false);
    });

    const track = 音声.BGM[名前];
    if (音声.現在BGM !== 名前) 先頭から = true;
    音声.現在BGM = 名前;

    if (!document.hidden) 再生(track, 先頭から);
  };

  const 効果音プール作成 = (候補, volume) => {
    return Array.from({ length: 3 }, () => 音声作成(候補, { volume, loop: false }));
  };

  const 効果音再生 = (名前, 再生速度 = 1) => {
    if (!音声.利用者操作済み) return;
    const pool = 音声.効果音[名前];
    if (!pool?.length) return;

    let player = pool.find(item => item.paused || item.ended);
    if (!player) player = pool[0];
    if (!player || player.dataset.notFound === "1") return;

    clearTimeout(player._kibouStopTimer);
    player.pause();
    try { player.currentTime = 0; } catch {}

    player.playbackRate = Math.max(.8, Math.min(1.35, 再生速度));
    player.play().then(() => {
      const 最大時間 = 効果音最大ミリ秒[名前] ?? 2000;
      player._kibouStopTimer = setTimeout(() => {
        player.pause();
        try { player.currentTime = 0; } catch {}
      }, 最大時間);
    }).catch(() => {});
  };

  app.音声初期化 = function () {
    音声.BGM.通常 = 音声作成(
  ["retropark.mp3"],
  { loop: true, volume: .20 }
);
音声.BGM.ボーナス = 音声作成(
  ["retroparty.mp3"],
  { loop: true, volume: .22 }
);
    音声.BGM.波音 = 音声作成(
      ["warayatakashi.mp3"],
      { loop: true, volume: .12 }
    );
    音声.BGM.三味線 = 音声作成(
      ["shamisen_intro.mp3"],
      { loop: false, volume: .16 }
    );

    音声.効果音.match = 効果音プール作成(
      ["se_match.mp3", "audio/se_match.mp3", "se_match.wav", "audio/se_match.wav"], .42
    );
    音声.効果音.drop = 効果音プール作成(
      ["se_drop.mp3", "audio/se_drop.mp3", "se_drop.wav", "audio/se_drop.wav"], .34
    );
    音声.効果音.bonus = 効果音プール作成(
      ["se_bonus.mp3", "audio/se_bonus.mp3", "se_bonus.wav", "audio/se_bonus.wav"], .48
    );
    音声.効果音.scene = 効果音プール作成(
      ["se_scene.mp3", "audio/se_scene.mp3", "se_scene.wav", "audio/se_scene.wav"], .18
    );
    音声.効果音.store = 効果音プール作成(
      ["se_store.mp3", "audio/se_store.mp3", "se_store.wav", "audio/se_store.wav"], .38
    );

    document.addEventListener("visibilitychange", () => {
      if (document.hidden) {
        Object.values(音声.BGM).forEach(track => 停止(track, false));
        return;
      }
      if (音声.再開予定BGM) BGM切替(音声.再開予定BGM, false);
    });

    document.addEventListener("pointerdown", () => {
      if (!音声.利用者操作済み) return;
      if (音声.再開予定BGM && 音声.BGM[音声.再開予定BGM]?.paused) {
        BGM切替(音声.再開予定BGM, false);
      }
    }, { passive: true });
  };

  app.音声解放 = function () {
    音声.利用者操作済み = true;
  };

  app.通常BGM再生 = function () {
    BGM切替("通常", false);
  };

  app.ボーナスBGM再生 = function () {
    BGM切替("ボーナス", true);
  };

  app.消去音再生 = function (連鎖数 = 1) {
    効果音再生("match", 1 + Math.max(0, 連鎖数 - 1) * .07);
  };
  app.急降下音再生 = () => 効果音再生("drop", 1);
  app.ボーナス成立音再生 = () => 効果音再生("bonus", 1);
  app.背景変更音再生 = () => 効果音再生("scene", 1);
  app.符保存音再生 = () => 効果音再生("store", 1);

  app.物語BGM開始 = function () {
    clearTimeout(音声.三味線停止);
    BGM切替("波音", true);
    再生(音声.BGM.三味線, true);
    音声.三味線停止 = setTimeout(() => 停止(音声.BGM.三味線, true), 12000);
  };

  app.波音だけ再生 = function () {
    BGM切替("波音", false);
  };

  app.物語BGM停止 = function () {
    clearTimeout(音声.三味線停止);
    停止(音声.BGM.波音, true);
    停止(音声.BGM.三味線, true);
    音声.現在BGM = null;
    音声.再開予定BGM = null;
  };


  app.全BGM停止 = function () {
    clearTimeout(音声.三味線停止);
    Object.values(音声.BGM).forEach(track => 停止(track, false));
    音声.現在BGM = null;
    音声.再開予定BGM = null;
  };
})();
