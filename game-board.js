// KIBOUKANJI Ver.1.0.9
// 急降下距離加点・特の符・代身遷宮・山岳鎮定

(() => {
  "use strict";

  const app = window.KibouKanji = window.KibouKanji || {};

  class ピース {
    constructor() {
      this.blocks = [{ x: 2, y: 0, type: app.漢字抽選() }];
    }
  }

  app.漢字抽選 = function () {
    const 設定 = app.設定;
    const ボーナス = Math.random() < 0.12;
    const 一覧 = ボーナス ? 設定.ボーナス漢字 : 設定.漢字;
    return 一覧[Math.floor(Math.random() * 一覧.length)];
  };

  app.盤面初期化 = function () {
    const { 行数, 列数 } = app.設定;
    app.状態.盤面 = Array.from({ length: 行数 }, () => Array(列数).fill(null));
  };

  app.次ピース準備 = function () {
    app.状態.次ピース1 = new ピース();
    app.状態.次ピース2 = new ピース();
    app.状態.現在ピース = app.状態.次ピース1;
    app.状態.次ピース1 = app.状態.次ピース2;
    app.状態.次ピース2 = new ピース();
  };

  app.新規ピース = function () {
    const 状態 = app.状態;
    状態.現在ピース = 状態.次ピース1 || new ピース();
    状態.次ピース1 = 状態.次ピース2 || new ピース();
    状態.次ピース2 = new ピース();
    状態.高速落下 = false;
    状態.急降下開始行 = null;

    const 衝突 = 状態.現在ピース.blocks.some(block => 状態.盤面[0][block.x]);
    if (衝突) app.ゲーム終了処理();
  };

  app.移動可能 = function (差X, 差Y) {
    const 状態 = app.状態;
    const { 行数, 列数 } = app.設定;
    if (!状態.現在ピース) return false;

    return 状態.現在ピース.blocks.every(block => {
      const x = block.x + 差X;
      const y = block.y + 差Y;
      if (x < 0 || x >= 列数 || y >= 行数) return false;
      if (y >= 0 && 状態.盤面[y][x]) return false;
      return true;
    });
  };

  app.左右移動 = function (方向) {
    const 状態 = app.状態;
    if (
      !状態.開始済み ||
      状態.ゲーム終了 ||
      状態.一時停止 ||
      状態.ボーナス中 ||
      状態.符確認中
    ) return;

    if (app.移動可能(方向, 0)) {
      状態.現在ピース.blocks.forEach(block => block.x += 方向);
      app.描画?.();
    }
  };

  app.高速落下 = function () {
    const 状態 = app.状態;
    if (
      !状態.開始済み ||
      状態.ゲーム終了 ||
      状態.一時停止 ||
      状態.ボーナス中 ||
      状態.符確認中 ||
      !状態.現在ピース
    ) return;

    if (!状態.高速落下) {
      状態.高速落下 = true;
      状態.急降下開始行 = Math.min(...状態.現在ピース.blocks.map(block => block.y));
      app.急降下音再生?.();
    }
    app.一段落下();
  };

  app.急降下得点計算 = function (落下距離) {
    if (落下距離 < 1) return 0;
    const 最大距離 = Math.max(1, app.設定.行数 - 1);
    const 生点 = 10 + ((落下距離 - 1) * 80) / Math.max(1, 最大距離 - 1);
    return Math.min(90, Math.max(10, Math.round(生点 / 10) * 10));
  };

  app.一段落下 = function () {
    const 状態 = app.状態;
    if (状態.一時停止 || 状態.ゲーム終了 || 状態.ボーナス中 || 状態.符確認中) return;

    if (!状態.現在ピース) {
      app.新規ピース();
      return;
    }

    if (app.移動可能(0, 1)) {
      状態.現在ピース.blocks.forEach(block => block.y += 1);
      return;
    }

    const 急降下成功 = 状態.高速落下;
    const 着地行 = Math.max(...状態.現在ピース.blocks.map(block => block.y));

    for (const block of 状態.現在ピース.blocks) {
      if (block.y < 0) {
        app.ゲーム終了処理();
        return;
      }
      状態.盤面[block.y][block.x] = block.type;
    }

    if (急降下成功 && Number.isFinite(状態.急降下開始行)) {
      const 落下距離 = Math.max(0, 着地行 - 状態.急降下開始行);
      const 加点 = app.急降下得点計算(落下距離);
      if (加点 > 0) {
        状態.得点 += 加点;
      }
    }

    状態.高速落下 = false;
    状態.急降下開始行 = null;
    状態.現在ピース = null;

    app.着地後処理();

    if (
      !状態.ゲーム終了 &&
      !状態.ボーナス中 &&
      !状態.符確認中 &&
      状態.ボーナス待ち.length === 0 &&
      !状態.現在ピース
    ) {
      app.新規ピース();
    }
  };

  app.盤面落下整理 = function () {
    const { 行数, 列数 } = app.設定;
    const 盤面 = app.状態.盤面;

    for (let 列 = 0; 列 < 列数; 列++) {
      const 残り = [];
      for (let 行 = 行数 - 1; 行 >= 0; 行--) {
        if (盤面[行][列]) 残り.push(盤面[行][列]);
      }
      for (let 行 = 行数 - 1; 行 >= 0; 行--) {
        盤面[行][列] = 残り.length ? 残り.shift() : null;
      }
    }
  };

  app.一致消去 = function () {
    const { 行数, 列数, ボーナス漢字 } = app.設定;
    const 盤面 = app.状態.盤面;
    const 消去 = Array.from({ length: 行数 }, () => Array(列数).fill(false));

    for (let 列 = 0; 列 < 列数; 列++) {
      let 文字 = null;
      let 開始 = 0;
      let 長さ = 0;

      for (let 行 = 0; 行 <= 行数; 行++) {
        const 値 = 行 < 行数 ? 盤面[行][列] : null;
        if (値 && 値 === 文字) {
          長さ++;
        } else {
          if (文字 && 長さ >= 3) {
            for (let i = 開始; i < 開始 + 長さ; i++) 消去[i][列] = true;
          }
          文字 = 値;
          開始 = 行;
          長さ = 値 ? 1 : 0;
        }
      }
    }

    for (let 行 = 0; 行 < 行数; 行++) {
      let 文字 = null;
      let 開始 = 0;
      let 長さ = 0;

      for (let 列 = 0; 列 <= 列数; 列++) {
        const 値 = 列 < 列数 ? 盤面[行][列] : null;
        if (値 && 値 === 文字) {
          長さ++;
        } else {
          if (文字 && 長さ >= 3) {
            for (let i = 開始; i < 開始 + 長さ; i++) 消去[行][i] = true;
          }
          文字 = 値;
          開始 = 列;
          長さ = 値 ? 1 : 0;
        }
      }
    }

    let 件数 = 0;
    const ボーナス数 = { 代: 0, 岳: 0 };

    for (let 行 = 0; 行 < 行数; 行++) {
      for (let 列 = 0; 列 < 列数; 列++) {
        if (!消去[行][列]) continue;
        const 文字 = 盤面[行][列];
        if (ボーナス漢字.includes(文字)) ボーナス数[文字]++;
        盤面[行][列] = null;
        件数++;
      }
    }

    if (件数 > 0) app.盤面落下整理();

    const 獲得符 = [];
    for (const 文字 of ボーナス漢字) {
      const 枚数 = Math.floor(ボーナス数[文字] / 3);
      for (let i = 0; i < 枚数; i++) 獲得符.push(文字);
    }

    return { cleared: 件数, 獲得符 };
  };

  app.連鎖解決 = function () {
    let 連鎖 = 0;
    const 獲得符 = [];

    while (true) {
      const 結果 = app.一致消去();
      if (結果.cleared <= 0) break;

      連鎖++;
      const 加点 = 結果.cleared * 10 * 連鎖;
      app.状態.得点 += 加点;
      app.消去音再生?.(連鎖);
      app.コンボ表示?.(連鎖, 加点);
      結果.獲得符.forEach(文字 => 獲得符.push(文字));
    }

    app.状態.連鎖数 = 連鎖;
    獲得符.forEach(app.特の符予約);
    return 連鎖;
  };

  app.着地後処理 = function () {
    app.連鎖解決();

    if (app.状態.盤面[0].some(Boolean)) {
      app.ゲーム終了処理();
      return;
    }

    app.次の特の符確認();
  };

  app.特の符予約 = function (文字) {
    if (!app.設定.ボーナス漢字.includes(文字)) return;
    app.状態.ボーナス待ち.push(文字);
  };

  app.次の特の符確認 = function () {
    const 状態 = app.状態;
    if (状態.ボーナス中 || 状態.符確認中) return;

    if (状態.ボーナス待ち.length === 0) {
      app.通常BGM再生?.();
      if (!状態.ゲーム終了 && !状態.現在ピース) app.新規ピース();
      状態.最終落下時刻 = performance.now();
      return;
    }

    const 文字 = 状態.ボーナス待ち.shift();
    状態.符確認中 = 文字;
    状態.符確認モード = "獲得";
    app.ボーナス成立音再生?.();
    app.特の符確認表示?.(文字, "獲得");
  };

  app.ためた特の符を選ぶ = function (文字) {
    const 状態 = app.状態;
    if (
      !app.設定.ボーナス漢字.includes(文字) ||
      状態.特の符[文字] <= 0 ||
      状態.ボーナス中 ||
      状態.符確認中 ||
      状態.一時停止 ||
      状態.ゲーム終了
    ) return;

    状態.符確認中 = 文字;
    状態.符確認モード = "保存分";
    app.特の符確認表示?.(文字, "保存分");
  };

  app.特の符を使う = function () {
    const 状態 = app.状態;
    const 文字 = 状態.符確認中;
    if (!文字 || 状態.ボーナス操作中) return;

    状態.ボーナス操作中 = true;
    const 使用元 = 状態.符確認モード;

    if (使用元 === "保存分" && 状態.特の符[文字] <= 0) {
      状態.ボーナス操作中 = false;
      return;
    }

    状態.特の符使用元 = 使用元;
    状態.特の符消費待ち = 使用元 === "保存分" ? 文字 : null;
    状態.符確認中 = null;
    状態.符確認モード = null;
    app.特の符確認閉じる?.();
    app.特の符表示更新?.();
    app.ボーナス開始(文字);
    状態.ボーナス操作中 = false;
  };

  app.特の符消費確定 = function () {
    const 状態 = app.状態;
    const 文字 = 状態.特の符消費待ち;
    if (!文字) return;

    if ((状態.特の符[文字] || 0) > 0) {
      状態.特の符[文字]--;
    }
    状態.特の符消費待ち = null;
    app.特の符表示更新?.();
  };

  app.特の符をためる = function () {
    const 状態 = app.状態;
    const 文字 = 状態.符確認中;
    if (!文字 || 状態.ボーナス操作中) return;

    状態.ボーナス操作中 = true;
    if (状態.符確認モード === "獲得") {
      状態.特の符[文字]++;
      app.符保存音再生?.();
      app.加点表示?.(`${文字}の「特の符」をためました`);
    }

    状態.符確認中 = null;
    状態.符確認モード = null;
    app.特の符確認閉じる?.();
    app.特の符表示更新?.();
    状態.ボーナス操作中 = false;

    if (状態.ボーナス待ち.length > 0) {
      app.次の特の符確認();
    } else {
      app.通常BGM再生?.();
      if (!状態.ゲーム終了 && !状態.現在ピース) app.新規ピース();
      状態.最終落下時刻 = performance.now();
      app.描画?.();
    }
  };

  app.ボーナス開始 = function (文字) {
    const 状態 = app.状態;
    状態.ボーナス中 = 文字;
    状態.ボーナス残数 = 文字 === "代" ? 3 : 1;
    状態.選択セル = null;
    状態.選択セル2 = null;
    状態.確認待ち = null;
    状態.ボーナス操作中 = false;
    状態.最終ボーナスタップ = 0;

    app.ボーナスBGM再生?.();
    app.技名演出?.(文字);
    app.加点表示?.(
      文字 === "岳"
        ? "山岳鎮定　消したい漢字錠を選ぶ"
        : "代身遷宮　入れ替える漢字錠を二つ選ぶ"
    );
    app.描画?.();
  };

  app.ボーナス終了 = function () {
    const 状態 = app.状態;
    状態.ボーナス中 = null;
    状態.ボーナス残数 = 0;
    状態.選択セル = null;
    状態.選択セル2 = null;
    状態.確認待ち = null;
    状態.ボーナス操作中 = false;
    状態.最終ボーナスタップ = 0;
    状態.特の符消費待ち = null;
    状態.特の符使用元 = null;

    app.ボーナス確認閉じる?.();

    if (状態.ボーナス待ち.length > 0) {
      app.次の特の符確認();
      return;
    }

    app.通常BGM再生?.();
    if (!状態.ゲーム終了 && !状態.現在ピース) app.新規ピース();
    状態.最終落下時刻 = performance.now();
    app.描画?.();
  };

  app.座標からセル取得 = function (clientX, clientY) {
    const canvas = app.状態.canvas;
    if (!canvas) return null;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (clientX - rect.left) * scaleX;
    const y = (clientY - rect.top) * scaleY;
    const 列 = Math.floor((x - app.設定.盤面左) / app.設定.マス寸法);
    const 行 = Math.floor((y - app.設定.盤面上) / app.設定.マス寸法);

    if (列 < 0 || 列 >= app.設定.列数 || 行 < 0 || 行 >= app.設定.行数) return null;
    const 文字 = app.状態.盤面[行][列];
    return 文字 ? { r: 行, c: 列, 文字 } : null;
  };

  app.ボーナスタップ = function (clientX, clientY) {
    const 状態 = app.状態;
    const 今 = performance.now();
    if (
      !状態.ボーナス中 ||
      状態.確認待ち ||
      状態.ボーナス操作中 ||
      今 - (状態.最終ボーナスタップ || 0) < 140
    ) return;

    状態.最終ボーナスタップ = 今;
    const セル = app.座標からセル取得(clientX, clientY);
    if (!セル) return;

    if (状態.ボーナス中 === "岳") {
      状態.選択セル = セル;
      状態.確認待ち = { 種類: "岳", 文字1: セル.文字 };
      app.描画?.();
      requestAnimationFrame(() => app.ボーナス確認表示?.(状態.確認待ち));
      return;
    }

    if (!状態.選択セル) {
      状態.選択セル = セル;
      app.描画?.();
      return;
    }

    if (状態.選択セル.r === セル.r && 状態.選択セル.c === セル.c) {
      app.加点表示?.("別の漢字錠を選んでください");
      return;
    }

    状態.選択セル2 = セル;
    状態.確認待ち = {
      種類: "代",
      文字1: 状態.選択セル.文字,
      文字2: セル.文字
    };
    app.描画?.();
    requestAnimationFrame(() => app.ボーナス確認表示?.(状態.確認待ち));
  };

  app.ボーナス選び直し = function () {
    const 状態 = app.状態;
    if (状態.ボーナス操作中) return;
    状態.選択セル = null;
    状態.選択セル2 = null;
    状態.確認待ち = null;
    app.ボーナス確認閉じる?.();
    app.描画?.();
  };

  app.ボーナス確定 = function () {
    const 状態 = app.状態;
    if (!状態.確認待ち || 状態.ボーナス操作中) return;

    状態.ボーナス操作中 = true;
    if (状態.確認待ち.種類 === "岳") {
      app.岳消去確定();
      return;
    }
    if (状態.確認待ち.種類 === "代") {
      app.代入替確定();
      return;
    }
    状態.ボーナス操作中 = false;
  };

  app.岳消去確定 = function () {
    const 状態 = app.状態;
    const 対象 = 状態.選択セル?.文字;
    if (!対象) {
      状態.ボーナス操作中 = false;
      return;
    }

    状態.確認待ち = null;
    app.ボーナス確認閉じる?.();

    let 消去数 = 0;
    for (let 行 = 0; 行 < app.設定.行数; 行++) {
      for (let 列 = 0; 列 < app.設定.列数; 列++) {
        if (状態.盤面[行][列] === 対象) {
          状態.盤面[行][列] = null;
          消去数++;
        }
      }
    }

    if (消去数 <= 0) {
      状態.選択セル = null;
      状態.ボーナス操作中 = false;
      app.加点表示?.("消去できる漢字錠がありません");
      app.描画?.();
      return;
    }

    app.特の符消費確定();
    app.盤面落下整理();
    const 加点 = 90 + 消去数 * 20;
    状態.得点 += 加点;
    app.消去音再生?.(2);
    app.加点表示?.(`山岳鎮定「${対象}」${消去数}個消去 +${加点}`);

    状態.選択セル = null;
    状態.ボーナス操作中 = false;
    app.連鎖解決();
    app.ボーナス終了();
  };

  app.代入替確定 = function () {
    const 状態 = app.状態;
    const 一つ目 = 状態.選択セル;
    const 二つ目 = 状態.選択セル2;

    const 有効 =
      一つ目 &&
      二つ目 &&
      !(一つ目.r === 二つ目.r && 一つ目.c === 二つ目.c) &&
      状態.盤面[一つ目.r]?.[一つ目.c] &&
      状態.盤面[二つ目.r]?.[二つ目.c];

    if (!有効) {
      状態.選択セル = null;
      状態.選択セル2 = null;
      状態.確認待ち = null;
      状態.ボーナス操作中 = false;
      app.ボーナス確認閉じる?.();
      app.加点表示?.("漢字錠を二つ選び直してください");
      app.描画?.();
      return;
    }

    状態.確認待ち = null;
    app.ボーナス確認閉じる?.();

    const 仮 = 状態.盤面[一つ目.r][一つ目.c];
    状態.盤面[一つ目.r][一つ目.c] = 状態.盤面[二つ目.r][二つ目.c];
    状態.盤面[二つ目.r][二つ目.c] = 仮;

    app.特の符消費確定();
    状態.ボーナス残数 = Math.max(0, 状態.ボーナス残数 - 1);
    状態.選択セル = null;
    状態.選択セル2 = null;
    状態.ボーナス操作中 = false;
    app.連鎖解決();

    if (状態.ボーナス残数 <= 0) {
      app.ボーナス終了();
    } else {
      app.加点表示?.(`代身遷宮　あと${状態.ボーナス残数}回`);
      app.描画?.();
    }
  };
})();
