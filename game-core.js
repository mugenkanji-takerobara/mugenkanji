// KIBOUKANJI Ver.1.0.12 LOCAL TEST
// ゲーム初期化・途中保存・安全停止・特の符状態管理
// GitHub公開前ローカル検証用

(() => {
  "use strict";

  const app = window.KibouKanji = window.KibouKanji || {};

  app.設定 = {
    行数: 12,
    列数: 6,
    マス寸法: 40,
    盤面左: 40,
    盤面上: 140,
    初期落下間隔: 700,
    得点保存キー: "kibou_scores",
    途中保存キー: "kibou_resume_v112",
    途中保存版: 112,
    漢字: ["三", "五", "八", "九", "百", "千", "万", "億", "兆"],
    ボーナス漢字: ["岳", "代"],
    タイトル文字: ["き", "ぼ", "う", "か", "ん", "じ"]
  };

  app.状態 = {
    canvas: null,
    ctx: null,
    盤面: [],
    現在ピース: null,
    次ピース1: null,
    次ピース2: null,
    得点: 0,
    ゲーム終了: false,
    開始済み: false,
    一時停止: false,
    高速落下: false,
    急降下開始行: null,
    連鎖数: 0,
    ボーナス中: null,
    ボーナス残数: 0,
    ボーナス待ち: [],
    符確認中: null,
    符確認モード: null,
    特の符: { 代: 0, 岳: 0 },
    選択セル: null,
    選択セル2: null,
    確認待ち: null,
    ボーナス操作中: false,
    最終ボーナスタップ: 0,
    特の符消費待ち: null,
    特の符使用元: null,
    城背景開始季節: null,
    城背景表示番号: -1,
    城背景表示画像: null,
    城背景前画像: null,
    城背景切替開始: 0,
    落下間隔: 700,
    最終落下時刻: 0,
    最終描画時刻: 0,
    最終BGM監視時刻: 0,
    ループ開始済み: false,
    ランキングページ: 0,
    画面固定幅: 0,
    画面固定高さ: 0
  };

  let 保存予約タイマー = null;

  app.要素 = id => document.getElementById(id);

  app.今日文字列 = function () {
    const 日付 = new Date();
    const 年 = 日付.getFullYear();
    const 月 = String(日付.getMonth() + 1).padStart(2, "0");
    const 日 = String(日付.getDate()).padStart(2, "0");
    return `${年}${月}${日}`;
  };

  app.得点読込 = function () {
    try {
      const 保存値 = localStorage.getItem(app.設定.得点保存キー);
      if (!保存値) return [];
      const 配列 = JSON.parse(保存値);
      return Array.isArray(配列) ? 配列 : [];
    } catch {
      return [];
    }
  };

  app.得点保存 = function () {
    const 配列 = app.得点読込();
    配列.push({ score: app.状態.得点, date: app.今日文字列() });
    配列.sort((a, b) => b.score - a.score);
    try {
      localStorage.setItem(app.設定.得点保存キー, JSON.stringify(配列.slice(0, 3)));
    } catch {}
  };

  const ピース複製 = ピース => {
    if (!ピース?.blocks) return null;
    return {
      blocks: ピース.blocks.map(block => ({
        x: Number(block.x) || 0,
        y: Number(block.y) || 0,
        type: String(block.type || "")
      }))
    };
  };

  const セル複製 = セル => セル ? {
    r: Number(セル.r),
    c: Number(セル.c),
    文字: String(セル.文字 || "")
  } : null;

  app.ゲーム状態保存 = function () {
    const 状態 = app.状態;
    if (!状態.開始済み || 状態.ゲーム終了 || !Array.isArray(状態.盤面)) return false;

    const 保存内容 = {
      version: app.設定.途中保存版,
      savedAt: Date.now(),
      盤面: 状態.盤面.map(row => Array.isArray(row) ? row.slice() : []),
      現在ピース: ピース複製(状態.現在ピース),
      次ピース1: ピース複製(状態.次ピース1),
      次ピース2: ピース複製(状態.次ピース2),
      得点: Number(状態.得点) || 0,
      急降下開始行: Number.isFinite(状態.急降下開始行) ? 状態.急降下開始行 : null,
      連鎖数: Number(状態.連鎖数) || 0,
      ボーナス中: 状態.ボーナス中 || null,
      ボーナス残数: Number(状態.ボーナス残数) || 0,
      ボーナス待ち: Array.isArray(状態.ボーナス待ち) ? 状態.ボーナス待ち.slice() : [],
      符確認中: 状態.符確認中 || null,
      符確認モード: 状態.符確認モード || null,
      特の符: {
        代: Number(状態.特の符?.代) || 0,
        岳: Number(状態.特の符?.岳) || 0
      },
      選択セル: セル複製(状態.選択セル),
      選択セル2: セル複製(状態.選択セル2),
      確認待ち: 状態.確認待ち ? { ...状態.確認待ち } : null,
      特の符消費待ち: 状態.特の符消費待ち || null,
      特の符使用元: 状態.特の符使用元 || null,
      城背景開始季節: 状態.城背景開始季節 || null,
      城背景一覧: Array.isArray(app.城背景一覧) ? app.城背景一覧.slice() : [],
      落下間隔: Number(状態.落下間隔) || app.設定.初期落下間隔
    };

    try {
      localStorage.setItem(app.設定.途中保存キー, JSON.stringify(保存内容));
      app.途中保存案内更新?.();
      return true;
    } catch {
      return false;
    }
  };

  app.途中保存予約 = function () {
    clearTimeout(保存予約タイマー);
    保存予約タイマー = setTimeout(() => app.ゲーム状態保存(), 120);
  };

  app.途中保存読込 = function () {
    try {
      const raw = localStorage.getItem(app.設定.途中保存キー);
      if (!raw) return null;
      const data = JSON.parse(raw);
      if (!data || data.version !== app.設定.途中保存版 || !Array.isArray(data.盤面)) return null;
      return data;
    } catch {
      return null;
    }
  };

  app.途中保存削除 = function () {
    clearTimeout(保存予約タイマー);
    try { localStorage.removeItem(app.設定.途中保存キー); } catch {}
    app.途中保存案内更新?.();
  };

  app.途中保存案内更新 = function () {
    const data = app.途中保存読込();
    const button = app.要素("start-button");
    if (!button) return;
    button.textContent = "パズル";
    if (data) {
      button.setAttribute("aria-label", `パズル　前回の得点${Number(data.得点 || 0)}から再開`);
      button.title = "保存されたゲームを再開します";
    } else {
      button.setAttribute("aria-label", "パズル");
      button.removeAttribute("title");
    }
  };

  app.ゲーム開始 = function () {
    if (!app.盤面初期化 || !app.描画) return;

    app.途中保存削除();
    app.盤面初期化();
    app.城背景順序準備?.();
    Object.assign(app.状態, {
      得点: 0,
      連鎖数: 0,
      ゲーム終了: false,
      開始済み: true,
      一時停止: false,
      高速落下: false,
      急降下開始行: null,
      ボーナス中: null,
      ボーナス残数: 0,
      ボーナス待ち: [],
      符確認中: null,
      符確認モード: null,
      特の符: { 代: 0, 岳: 0 },
      選択セル: null,
      選択セル2: null,
      確認待ち: null,
      ボーナス操作中: false,
      最終ボーナスタップ: 0,
      特の符消費待ち: null,
      特の符使用元: null,
      ランキングページ: 0,
      落下間隔: app.設定.初期落下間隔,
      最終落下時刻: performance.now()
    });

    app.ボーナス確認閉じる?.();
    app.特の符確認閉じる?.();
    app.特の符表示更新?.();
    app.次ピース準備();

    app.要素("restartBtn")?.classList.add("hidden");
    app.ランキングUI更新?.(false);
    const 一時停止ボタン = app.要素("pause-button");
    if (一時停止ボタン) 一時停止ボタン.textContent = "一時停止";

    app.通常BGM再生?.();
    app.描画();
    app.ゲーム状態保存();

    if (!app.状態.ループ開始済み) {
      app.状態.ループ開始済み = true;
      requestAnimationFrame(app.主ループ);
    }
  };

  app.途中保存から再開 = function () {
    const data = app.途中保存読込();
    if (!data) {
      app.途中保存案内更新?.();
      return false;
    }

    const 状態 = app.状態;
    app.城背景順序復元?.(data.城背景一覧, data.城背景開始季節);
    Object.assign(状態, {
      盤面: data.盤面.map(row => row.slice(0, app.設定.列数)),
      現在ピース: ピース複製(data.現在ピース),
      次ピース1: ピース複製(data.次ピース1),
      次ピース2: ピース複製(data.次ピース2),
      得点: Number(data.得点) || 0,
      ゲーム終了: false,
      開始済み: true,
      一時停止: true,
      高速落下: false,
      急降下開始行: Number.isFinite(data.急降下開始行) ? data.急降下開始行 : null,
      連鎖数: Number(data.連鎖数) || 0,
      ボーナス中: data.ボーナス中 || null,
      ボーナス残数: Number(data.ボーナス残数) || 0,
      ボーナス待ち: Array.isArray(data.ボーナス待ち) ? data.ボーナス待ち.slice() : [],
      符確認中: data.符確認中 || null,
      符確認モード: data.符確認モード || null,
      特の符: {
        代: Number(data.特の符?.代) || 0,
        岳: Number(data.特の符?.岳) || 0
      },
      選択セル: セル複製(data.選択セル),
      選択セル2: セル複製(data.選択セル2),
      確認待ち: data.確認待ち ? { ...data.確認待ち } : null,
      ボーナス操作中: false,
      最終ボーナスタップ: 0,
      特の符消費待ち: data.特の符消費待ち || null,
      特の符使用元: data.特の符使用元 || null,
      ランキングページ: 0,
      落下間隔: Number(data.落下間隔) || app.設定.初期落下間隔,
      最終落下時刻: performance.now()
    });

    const 一時停止ボタン = app.要素("pause-button");
    if (一時停止ボタン) {
      一時停止ボタン.textContent = "再開";
      一時停止ボタン.setAttribute("aria-label", "再開");
    }

    app.要素("restartBtn")?.classList.add("hidden");
    app.ランキングUI更新?.(false);
    app.特の符表示更新?.();
    app.全BGM停止?.();
    app.描画?.();

    if (状態.符確認中) {
      requestAnimationFrame(() => app.特の符確認表示?.(状態.符確認中, 状態.符確認モード || "獲得"));
    } else if (状態.確認待ち) {
      requestAnimationFrame(() => app.ボーナス確認表示?.(状態.確認待ち));
    }

    if (!状態.ループ開始済み) {
      状態.ループ開始済み = true;
      requestAnimationFrame(app.主ループ);
    }
    return true;
  };

  app.ゲーム終了処理 = function () {
    if (app.状態.ゲーム終了) return;
    app.状態.ゲーム終了 = true;
    app.状態.ランキングページ = 0;
    app.ボーナス確認閉じる?.();
    app.特の符確認閉じる?.();
    app.全BGM停止?.();
    app.途中保存削除();
    app.得点保存();
    app.要素("restartBtn")?.classList.remove("hidden");
    app.ランキングUI更新?.(true);
    app.ランキングページ設定?.(0);
  };

  app.一時停止切替 = function () {
    const 状態 = app.状態;
    if (!状態.開始済み || 状態.ゲーム終了 || 状態.ボーナス中 || 状態.符確認中) return;

    状態.一時停止 = !状態.一時停止;
    const ボタン = app.要素("pause-button");

    if (ボタン) {
      ボタン.textContent = 状態.一時停止 ? "再開" : "一時停止";
      ボタン.setAttribute("aria-label", 状態.一時停止 ? "再開" : "一時停止");
    }

    if (状態.一時停止) {
      app.全BGM停止?.();
      app.ゲーム状態保存();
    } else {
      if (typeof app.BGMユーザー操作で再開 === "function") app.BGMユーザー操作で再開("通常");
      else app.通常BGM再生?.();
      状態.最終落下時刻 = performance.now();
    }
    app.描画?.();
  };

  app.ゲーム安全停止 = function () {
    const 状態 = app.状態;
    if (!状態.開始済み || 状態.ゲーム終了) {
      app.全BGM停止?.();
      return;
    }
    状態.一時停止 = true;
    状態.高速落下 = false;
    const ボタン = app.要素("pause-button");
    if (ボタン) {
      ボタン.textContent = "再開";
      ボタン.setAttribute("aria-label", "再開");
    }
    app.ゲーム状態保存();
    app.全BGM停止?.();
    app.描画?.();
  };

  app.主ループ = function (時刻) {
    const 状態 = app.状態;

    // ゲーム画面を離れた時は描画ループ自体を止め、CPU/GPU負荷を残さない。
    if (document.hidden || !document.body.classList.contains("game-open")) {
      状態.ループ開始済み = false;
      return;
    }

    const 操作可能 =
      状態.開始済み &&
      !状態.ゲーム終了 &&
      !状態.一時停止 &&
      !状態.ボーナス中 &&
      !状態.符確認中;

    // 通常BGMだけでなく、時間制限のない特の符BGM中も監視を続ける。
    if (!状態.最終BGM監視時刻 || 時刻 - 状態.最終BGM監視時刻 >= 1000) {
      状態.最終BGM監視時刻 = 時刻;
      app.BGM健全性確認?.();
    }

    if (!操作可能) {
      // 一時停止・特の符・ゲームオーバー中は高頻度描画をしない。
      setTimeout(() => requestAnimationFrame(app.主ループ), 160);
      return;
    }

    const 間隔 = 状態.高速落下
      ? Math.max(42, Math.floor(状態.落下間隔 / 7))
      : 状態.落下間隔;

    if (!状態.最終落下時刻) 状態.最終落下時刻 = 時刻;
    if (時刻 - 状態.最終落下時刻 >= 間隔) {
      状態.最終落下時刻 = 時刻;
      app.一段落下?.();
    }

    // 60fps固定ではなく最大約30fps。操作時の描画は各イベント側ですぐ行う。
    if (!状態.最終描画時刻 || 時刻 - 状態.最終描画時刻 >= 32) {
      状態.最終描画時刻 = 時刻;
      app.描画?.();
    }
    requestAnimationFrame(app.主ループ);
  };

  document.addEventListener("DOMContentLoaded", () => {
    const canvas = app.要素("game-canvas");
    if (!canvas) return;

    app.状態.canvas = canvas;
    app.状態.ctx = canvas.getContext("2d");
    canvas.width = 360;
    canvas.height = 640;

    app.音声初期化?.();
    app.盤面初期化?.();
    app.操作登録?.();
    app.画面イベント登録?.();
    app.特の符表示更新?.();
    app.途中保存案内更新?.();
    app.描画?.();
  });
})();
