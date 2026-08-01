// KIBOUKANJI Ver.1.0.9
// ゲーム初期化・ループ・特の符状態管理

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
    ループ開始済み: false
  };

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
    localStorage.setItem(app.設定.得点保存キー, JSON.stringify(配列.slice(0, 3)));
  };

  app.ゲーム開始 = function () {
    if (!app.盤面初期化 || !app.描画) return;

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
      落下間隔: app.設定.初期落下間隔,
      最終落下時刻: performance.now()
    });

    app.ボーナス確認閉じる?.();
    app.特の符確認閉じる?.();
    app.特の符表示更新?.();
    app.次ピース準備();

    app.要素("restartBtn")?.classList.add("hidden");
    app.要素("ranking-actions")?.setAttribute("hidden", "");
    app.要素("ranking-info")?.setAttribute("hidden", "");
    const 一時停止ボタン = app.要素("pause-button");
    if (一時停止ボタン) 一時停止ボタン.textContent = "一時停止";

    app.通常BGM再生?.();
    app.描画();

    if (!app.状態.ループ開始済み) {
      app.状態.ループ開始済み = true;
      requestAnimationFrame(app.主ループ);
    }
  };

  app.ゲーム終了処理 = function () {
    if (app.状態.ゲーム終了) return;
    app.状態.ゲーム終了 = true;
    app.ボーナス確認閉じる?.();
    app.特の符確認閉じる?.();
    app.全BGM停止?.();
    app.得点保存();
    app.要素("restartBtn")?.classList.remove("hidden");
    app.要素("ranking-actions")?.removeAttribute("hidden");
    app.要素("ranking-info")?.removeAttribute("hidden");
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
    } else {
      app.通常BGM再生?.();
      状態.最終落下時刻 = performance.now();
    }
    app.描画?.();
  };

  app.主ループ = function (時刻) {
    const 状態 = app.状態;
    const 操作可能 =
      状態.開始済み &&
      !状態.ゲーム終了 &&
      !状態.一時停止 &&
      !状態.ボーナス中 &&
      !状態.符確認中;

    if (操作可能) {
      const 間隔 = 状態.高速落下
        ? Math.max(42, Math.floor(状態.落下間隔 / 7))
        : 状態.落下間隔;

      if (!状態.最終落下時刻) 状態.最終落下時刻 = 時刻;
      if (時刻 - 状態.最終落下時刻 >= 間隔) {
        状態.最終落下時刻 = 時刻;
        app.一段落下?.();
      }
    }

    app.描画?.();
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
    app.城背景事前読込?.();
    app.盤面初期化?.();
    app.操作登録?.();
    app.画面イベント登録?.();
    app.特の符表示更新?.();
    app.描画?.();
  });
})();
