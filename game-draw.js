// KIBOUKANJI Ver.1.0.8
// 富山城四季背景・ランキング画像保存・漢字演出

(() => {
  "use strict";

  const app = window.KibouKanji = window.KibouKanji || {};
  const 背景切替時間 = 650;
  const 背景開始季節保存キー = "kibou_last_castle_start_season";

  app.城背景季節別 = {
    spring: [
      "toyama-castle-spring-01.jpg",
      "toyama-castle-spring-02.jpg",
      "toyama-castle-spring-03.jpg",
      "toyama-castle-spring-04.jpg"
    ],
    summer: [
      "toyama-castle-summer-01.jpg",
      "toyama-castle-summer-02.jpg",
      "toyama-castle-summer-03.jpg",
      "toyama-castle-summer-04.jpg",
      "toyama-castle-summer-05.jpg",
      "toyama-castle-summer-06.jpg",
      "toyama-castle-summer-07.jpg",
      "toyama-castle-summer-08.jpg"
    ],
    autumn: [
      "toyama-castle-autumn-01.jpg",
      "toyama-castle-autumn-02.jpg",
      "toyama-castle-autumn-03.jpg",
      "toyama-castle-autumn-04.jpg",
      "toyama-castle-autumn-05.jpg"
    ],
    winter: [
      "toyama-castle-winter-01.jpg",
      "toyama-castle-winter-02.jpg",
      "toyama-castle-winter-03.jpg"
    ]
  };

  app.季節順 = ["spring", "summer", "autumn", "winter"];
  app.城背景一覧 = app.季節順.flatMap(季節 => app.城背景季節別[季節]);
  app.城背景画像キャッシュ = new Map();

  const シャッフル = 配列 => {
    const 結果 = [...配列];
    for (let i = 結果.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [結果[i], 結果[j]] = [結果[j], 結果[i]];
    }
    return 結果;
  };

  app.城背景事前読込 = function (一覧 = app.城背景一覧) {
    一覧.forEach(src => {
      if (app.城背景画像キャッシュ.has(src)) return;
      const 画像 = new Image();
      画像.decoding = "async";
      画像.dataset.loaded = "0";
      画像.addEventListener("load", () => {
        画像.dataset.loaded = "1";
        app.描画?.();
      }, { once: true });
      画像.addEventListener("error", () => {
        画像.dataset.loaded = "-1";
      }, { once: true });
      画像.src = src;
      app.城背景画像キャッシュ.set(src, 画像);
    });
  };

  app.城背景順序準備 = function () {
    let 前回 = app.前回城背景開始季節 || null;
    try {
      前回 = localStorage.getItem(背景開始季節保存キー) || 前回;
    } catch {}

    const 候補 = app.季節順.filter(季節 => 季節 !== 前回);
    const 開始季節 = 候補[Math.floor(Math.random() * 候補.length)] || "spring";
    const 開始番号 = app.季節順.indexOf(開始季節);
    const 今回の季節順 = Array.from({ length: 4 }, (_, i) => app.季節順[(開始番号 + i) % 4]);

    app.城背景一覧 = 今回の季節順.flatMap(季節 => シャッフル(app.城背景季節別[季節]));
    app.城背景事前読込(app.城背景一覧);

    app.前回城背景開始季節 = 開始季節;
    try {
      localStorage.setItem(背景開始季節保存キー, 開始季節);
    } catch {}

    Object.assign(app.状態, {
      城背景開始季節: 開始季節,
      城背景表示番号: -1,
      城背景表示画像: null,
      城背景前画像: null,
      城背景切替開始: 0
    });
  };

  app.城背景番号取得 = function (得点) {
    return Math.max(0, Math.min(app.城背景一覧.length - 1, Math.floor(得点 / 100)));
  };

  app.城背景画像取得 = function (番号) {
    const src = app.城背景一覧[番号];
    if (!src) return null;
    app.城背景事前読込([src]);
    return app.城背景画像キャッシュ.get(src) || null;
  };

  const 画像準備済み = 画像 => Boolean(
    画像 &&
    画像.dataset.loaded === "1" &&
    画像.complete &&
    画像.naturalWidth > 0
  );

  const 画面いっぱいに描く = (ctx, 画像, 透明度 = 1) => {
    if (!画像準備済み(画像)) return false;
    const canvasW = 360;
    const canvasH = 640;
    const scale = Math.max(canvasW / 画像.naturalWidth, canvasH / 画像.naturalHeight);
    const drawW = 画像.naturalWidth * scale;
    const drawH = 画像.naturalHeight * scale;
    const dx = (canvasW - drawW) / 2;
    const dy = (canvasH - drawH) / 2;

    ctx.save();
    ctx.globalAlpha = Math.max(0, Math.min(1, 透明度));
    ctx.drawImage(画像, dx, dy, drawW, drawH);
    ctx.restore();
    return true;
  };

  app.背景描画 = function () {
    const ctx = app.状態.ctx;
    if (!ctx) return;

    const 番号 = app.城背景番号取得(app.状態.得点);
    const 次画像 = app.城背景画像取得(番号);
    const 時刻 = performance.now();

    ctx.fillStyle = "#d8eaf0";
    ctx.fillRect(0, 0, 360, 640);

    if (番号 !== app.状態.城背景表示番号 && 画像準備済み(次画像)) {
      const 前画像 = app.状態.城背景表示画像;
      app.状態.城背景前画像 = 画像準備済み(前画像) ? 前画像 : null;
      app.状態.城背景表示画像 = 次画像;
      app.状態.城背景表示番号 = 番号;
      app.状態.城背景切替開始 = 時刻;
      if (app.状態.城背景前画像) app.背景変更音再生?.();
    }

    const 現在画像 = app.状態.城背景表示画像;
    const 前画像 = app.状態.城背景前画像;
    const 経過 = 時刻 - (app.状態.城背景切替開始 || 0);
    const 進行 = Math.max(0, Math.min(1, 経過 / 背景切替時間));

    if (前画像 && 進行 < 1) {
      画面いっぱいに描く(ctx, 前画像, 1);
      画面いっぱいに描く(ctx, 現在画像, 進行);
    } else {
      画面いっぱいに描く(ctx, 現在画像, 1);
      app.状態.城背景前画像 = null;
    }

    ctx.fillStyle = "rgba(255,255,255,.18)";
    ctx.fillRect(0, 0, 360, 640);
    ctx.fillStyle = "rgba(20,32,42,.18)";
    ctx.fillRect(0, 0, 360, 110);

    const { 盤面左, 盤面上, 列数, 行数, マス寸法 } = app.設定;
    ctx.fillStyle = "rgba(250,252,255,.78)";
    ctx.fillRect(盤面左 - 5, 盤面上 - 5, 列数 * マス寸法 + 10, 行数 * マス寸法 + 10);
    ctx.fillStyle = "rgba(255,255,255,.42)";
    ctx.fillRect(盤面左, 盤面上, 列数 * マス寸法, 行数 * マス寸法);
  };

  app.格子描画 = function () {
    const ctx = app.状態.ctx;
    const { 盤面左, 盤面上, 列数, 行数, マス寸法 } = app.設定;
    ctx.strokeStyle = "rgba(0,0,0,.15)";
    ctx.lineWidth = 1;

    for (let 行 = 0; 行 <= 行数; 行++) {
      const y = 盤面上 + 行 * マス寸法;
      ctx.beginPath();
      ctx.moveTo(盤面左, y);
      ctx.lineTo(盤面左 + 列数 * マス寸法, y);
      ctx.stroke();
    }

    for (let 列 = 0; 列 <= 列数; 列++) {
      const x = 盤面左 + 列 * マス寸法;
      ctx.beginPath();
      ctx.moveTo(x, 盤面上);
      ctx.lineTo(x, 盤面上 + 行数 * マス寸法);
      ctx.stroke();
    }
  };

  app.漢字描画 = function (x, y, 文字, 落下中) {
    const ctx = app.状態.ctx;
    const { 盤面左, 盤面上, マス寸法, ボーナス漢字 } = app.設定;
    const px = 盤面左 + x * マス寸法 + マス寸法 / 2;
    const py = 盤面上 + y * マス寸法 + マス寸法 / 2;

    ctx.beginPath();
    ctx.fillStyle = 落下中 ? "rgba(255,255,255,.98)" : "rgba(255,255,255,.90)";
    ctx.arc(px, py, 18, 0, Math.PI * 2);
    ctx.fill();

    const 選択1 = app.状態.選択セル;
    const 選択2 = app.状態.選択セル2;
    const 選択中 = [選択1, 選択2].some(選択 => 選択 && 選択.c === x && 選択.r === y);
    if (選択中) {
      ctx.strokeStyle = "#FFD75A";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(px, py, 22, 0, Math.PI * 2);
      ctx.stroke();
    }

    if (ボーナス漢字.includes(文字)) {
      ctx.strokeStyle = "#D6A93E";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(px, py, 20, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.fillStyle = "#000";
    ctx.font = 落下中 ? "bold 24px sans-serif" : "bold 20px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(文字, px, py + 1);
  };

  app.次表示描画 = function () {
    const ctx = app.状態.ctx;
    const 状態 = app.状態;
    if (!状態.次ピース1) return;

    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = "12px sans-serif";
    ctx.fillStyle = "#fff";
    ctx.fillText("NEXT", 300, 20);
    ctx.fillText("NEXT2", 300, 80);

    const 小型描画 = (ピース, 基準Y) => {
      if (!ピース) return;
      ピース.blocks.forEach((block, i) => {
        const x = 300 + (i - .5) * 20;
        const y = 基準Y + 20;
        ctx.beginPath();
        ctx.fillStyle = "rgba(255,255,255,.92)";
        ctx.arc(x, y, 12, 0, Math.PI * 2);
        ctx.fill();
        if (app.設定.ボーナス漢字.includes(block.type)) {
          ctx.strokeStyle = "#D6A93E";
          ctx.lineWidth = 2;
          ctx.stroke();
        }
        ctx.fillStyle = "#000";
        ctx.font = "bold 16px sans-serif";
        ctx.fillText(block.type, x, y + 1);
      });
    };

    小型描画(状態.次ピース1, 30);
    小型描画(状態.次ピース2, 90);
    ctx.restore();
  };

  app.タイトル描画 = function () {
    const ctx = app.状態.ctx;
    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    const baseX = 40;
    const baseY = 40;
    const lineHeight = 30;

    app.設定.タイトル文字.forEach((文字, i) => {
      const y = baseY + i * lineHeight;
      ctx.font = "bold 24px sans-serif";
      ctx.fillStyle = "#fff";
      ctx.fillText(文字, baseX, y);

      if (文字 === "ぼ" || 文字 === "じ") {
        ctx.font = "16px sans-serif";
        ctx.fillStyle = "#FF69B4";
        ctx.fillText("♥", baseX + 14, y - 10);
      }
    });

    ctx.font = "12px sans-serif";
    ctx.fillStyle = "#fff";
    const 文 = ["とやまの無限漢字", "立山連峰から富山湾まで、", "希望の数え唄"];
    let y = baseY + app.設定.タイトル文字.length * lineHeight + 10;
    文.forEach(行 => {
      ctx.fillText(行, 190, y);
      y += 16;
    });
    ctx.restore();
  };

  const 表示日付 = 値 => {
    const 数字 = String(値 || "").replace(/\D/g, "");
    return 数字 ? 数字.slice(-6).padStart(6, "0") : "------";
  };

  app.順位トップパネル描画 = function (ctx, x, y, w, h) {
    const 順位 = app.得点読込();
    const s = Math.min(w / 312, h / 210);

    ctx.save();
    ctx.fillStyle = "#071526";
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = "#E2C16B";
    ctx.lineWidth = Math.max(2, 2 * s);
    ctx.strokeRect(x + 3 * s, y + 3 * s, w - 6 * s, h - 6 * s);

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#fff";
    ctx.font = `800 ${23 * s}px system-ui, sans-serif`;
    ctx.fillText("KIBOUKANJI", x + w / 2, y + h * .18);

    ctx.font = `700 ${12.5 * s}px ui-monospace, SFMono-Regular, Consolas, monospace`;
    ctx.fillStyle = "#E2C16B";
    ctx.textAlign = "left";
    ctx.fillText("RANK", x + w * .075, y + h * .38);
    ctx.fillText("SCORE", x + w * .31, y + h * .38);
    ctx.fillText("DATE", x + w * .73, y + h * .38);

    const rowY = [.55, .70, .85];
    ctx.fillStyle = "#fff";
    ctx.font = `700 ${16 * s}px ui-monospace, SFMono-Regular, Consolas, monospace`;
    for (let i = 0; i < 3; i++) {
      const item = 順位[i];
      const score = item ? String(item.score).padStart(7, "0") : "-------";
      const date = item ? 表示日付(item.date) : "------";
      ctx.textAlign = "center";
      ctx.fillText(String(i + 1), x + w * .13, y + h * rowY[i]);
      ctx.textAlign = "right";
      ctx.fillText(score, x + w * .62, y + h * rowY[i]);
      ctx.fillText(date, x + w * .94, y + h * rowY[i]);
    }
    ctx.restore();
  };

  const 折返し = (ctx, text, maxWidth) => {
    const 行 = [];
    let 現在 = "";
    for (const 文字 of text) {
      const 候補 = 現在 + 文字;
      if (現在 && ctx.measureText(候補).width > maxWidth) {
        行.push(現在);
        現在 = 文字;
      } else {
        現在 = 候補;
      }
    }
    if (現在) 行.push(現在);
    return 行;
  };

  app.順位描画 = function () {
    const ctx = app.状態.ctx;
    ctx.save();
    ctx.fillStyle = "rgba(3,11,21,.96)";
    ctx.fillRect(8, 34, 344, 594);
    ctx.strokeStyle = "#E2C16B";
    ctx.lineWidth = 2;
    ctx.strokeRect(14, 40, 332, 582);

    app.順位トップパネル描画(ctx, 24, 50, 312, 205);

    ctx.fillStyle = "rgba(255,255,255,.055)";
    ctx.fillRect(24, 270, 312, 338);
    ctx.strokeStyle = "rgba(226,193,107,.45)";
    ctx.lineWidth = 1;
    ctx.strokeRect(24.5, 270.5, 311, 337);

    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillStyle = "#E2C16B";
    ctx.font = '700 16px system-ui,"Yu Gothic UI",Meiryo,sans-serif';
    ctx.fillText("ランキングについて", 36, 284);

    ctx.fillStyle = "#fff";
    ctx.font = '600 15px system-ui,"Yu Gothic UI",Meiryo,"Hiragino Sans",sans-serif';
    const blocks = [
      ["このランキングは、", "このページを開いているブラウザに", "保存されます。"],
      ["Safari、Chrome、Google、", "Samsung Internet、", "Microsoft Edge、Brave、", "Firefox、Operaなどです。"],
      ["別のブラウザや、", "別のスマホ・タブレット・", "パソコンでは、", "同じ記録は表示されません。"],
      ["アプリの記録を消すと、", "ランキングも消えます。"],
      ["記録を残さないモード", "（プライベート／シークレット）では、", "ランキングは保存されません。"]
    ];

    let y = 313;
    const lineHeight = 17.2;
    blocks.forEach((block, blockIndex) => {
      block.forEach(line => {
        折返し(ctx, line, 286).forEach(wrapped => {
          ctx.fillText(wrapped, 36, y);
          y += lineHeight;
        });
      });
      if (blockIndex < blocks.length - 1) y += 5;
    });
    ctx.restore();
  };

  app.順位画像Canvas作成 = function () {
    const canvas = document.createElement("canvas");
    canvas.width = 1200;
    canvas.height = 675;
    const ctx = canvas.getContext("2d");
    app.順位トップパネル描画(ctx, 0, 0, canvas.width, canvas.height);
    return canvas;
  };

  const PNG作成 = canvas => new Promise((resolve, reject) => {
    canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error("PNGを作成できませんでした。")), "image/png");
  });

  app.順位画像保存 = async function () {
    try {
      const canvas = app.順位画像Canvas作成();
      const blob = await PNG作成(canvas);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `KIBOUKANJI_RANKING_${app.今日文字列()}.png`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      app.加点表示?.("ランキング画像を保存しました");
      return true;
    } catch {
      app.加点表示?.("画像を保存できませんでした");
      return false;
    }
  };

  app.順位画像コピー = async function () {
    try {
      const canvas = app.順位画像Canvas作成();
      const blob = await PNG作成(canvas);
      if (!navigator.clipboard?.write || typeof ClipboardItem === "undefined") {
        await app.順位画像保存();
        app.加点表示?.("コピー非対応のため画像を保存しました");
        return;
      }
      await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
      app.加点表示?.("ランキング画像をコピーしました");
    } catch {
      await app.順位画像保存();
      app.加点表示?.("コピーできなかったため画像を保存しました");
    }
  };

  app.重ね表示描画 = function () {
    const ctx = app.状態.ctx;
    const 状態 = app.状態;

    if (状態.一時停止 && !状態.ゲーム終了) {
      ctx.fillStyle = "rgba(0,0,0,.62)";
      ctx.fillRect(40, 260, 280, 120);
      ctx.fillStyle = "#fff";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.font = "20px sans-serif";
      ctx.fillText("一時停止中", 180, 304);
      ctx.font = "14px sans-serif";
      ctx.fillText("▶で再開できます", 180, 336);
    }

    if (状態.ボーナス中) {
      ctx.save();
      ctx.fillStyle = "rgba(5,18,31,.84)";
      ctx.fillRect(18, 103, 324, 34);
      ctx.strokeStyle = "rgba(226,193,107,.72)";
      ctx.strokeRect(18.5, 103.5, 323, 33);
      ctx.fillStyle = "#fff";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.font = "700 13px system-ui,sans-serif";
      if (状態.ボーナス中 === "岳") {
        const 選択文字 = 状態.選択セル?.文字;
        ctx.fillText(選択文字 ? `山岳鎮定：「${選択文字}」を確認` : "山岳鎮定：消したい漢字錠を一つ選ぶ", 180, 120);
      } else {
        const 一つ目 = 状態.選択セル?.文字 || "未選択";
        const 二つ目 = 状態.選択セル2?.文字 || "未選択";
        ctx.fillText(`代身遷宮：①${一つ目}　②${二つ目}　あと${状態.ボーナス残数}回`, 180, 120);
      }
      ctx.restore();
    }

    if (状態.ゲーム終了) app.順位描画();
  };

  app.描画 = function () {
    const ctx = app.状態.ctx;
    if (!ctx) return;

    ctx.clearRect(0, 0, 360, 640);
    app.背景描画();
    app.格子描画();

    for (let 行 = 0; 行 < app.設定.行数; 行++) {
      for (let 列 = 0; 列 < app.設定.列数; 列++) {
        const 文字 = app.状態.盤面[行]?.[列];
        if (文字) app.漢字描画(列, 行, 文字, false);
      }
    }

    if (app.状態.現在ピース && !app.状態.ボーナス中 && !app.状態.ゲーム終了) {
      app.状態.現在ピース.blocks.forEach(block => {
        app.漢字描画(block.x, block.y, block.type, true);
      });
    }

    ctx.fillStyle = "#fff";
    ctx.font = "bold 18px sans-serif";
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillText(`SCORE ${app.状態.得点}`, 10, 10);

    app.次表示描画();
    if (!app.状態.開始済み) app.タイトル描画();
    app.重ね表示描画();
  };

  app.加点表示 = function (文字) {
    const effect = document.createElement("div");
    effect.className = "score-toast";
    effect.textContent = 文字;
    document.body.appendChild(effect);
    requestAnimationFrame(() => effect.classList.add("show"));
    setTimeout(() => effect.classList.remove("show"), 700);
    setTimeout(() => effect.remove(), 980);
  };

  app.コンボ表示 = function (連鎖数, 加点) {
    if (連鎖数 <= 1) {
      app.加点表示?.(`シュワッ！ +${加点}`);
      return;
    }

    const 名称 = 連鎖数 === 2
      ? { 読み: "レンゾクカイカ", 漢字: "連続開花" }
      : 連鎖数 === 3
        ? { 読み: "レンメンタルチョウワ", 漢字: "連綿たる調和" }
        : { 読み: "ジュウジュウムジンノハモン", 漢字: "重々無尽の波紋" };

    const effect = document.createElement("div");
    effect.className = `combo-effect combo-${Math.min(4, 連鎖数)}`;
    effect.innerHTML = `
      <span class="combo-count">${連鎖数} COMBO</span>
      <span class="combo-reading">${名称.読み}</span>
      <strong class="combo-kanji">${名称.漢字}</strong>
      <span class="combo-score">+${加点}</span>
    `;
    document.body.appendChild(effect);
    requestAnimationFrame(() => effect.classList.add("show"));
    setTimeout(() => effect.classList.remove("show"), 1050);
    setTimeout(() => effect.remove(), 1420);
  };

  app.技名演出 = function (文字) {
    const overlay = app.要素("bonus-flash");
    const reading = app.要素("bonus-flash-reading");
    const kanji = app.要素("bonus-flash-kanji");
    const subtitle = app.要素("bonus-flash-subtitle");
    if (!overlay || !reading || !kanji || !subtitle) return;

    const 情報 = 文字 === "岳"
      ? { className: "gaku", reading: "サンガクチンテイ", kanji: "山岳鎮定", subtitle: "ゆらぎ、しずまる。" }
      : { className: "dai", reading: "タイシンセングウ", kanji: "代身遷宮", subtitle: "うつり、めぐる。" };

    overlay.dataset.technique = 情報.className;
    reading.textContent = 情報.reading;
    kanji.textContent = 情報.kanji;
    subtitle.textContent = 情報.subtitle;
    overlay.classList.remove("show");
    void overlay.offsetWidth;
    overlay.classList.add("show");
    setTimeout(() => overlay.classList.remove("show"), 1380);
  };

  app.ボーナス成立演出 = app.技名演出;
})();
