(() => {
  "use strict";

  const app = window.KibouKanji = window.KibouKanji || {};

  
app.城背景一覧 = [
  "toyama-castle-01-sakura.jpg",
  "toyama-castle-02-tulip.jpg",
  "toyama-castle-03-green.jpg",
  "toyama-castle-04-blue.jpg",
  "toyama-castle-05-cloud.jpg",
  "toyama-castle-06-detail.jpg",
  "toyama-castle-07-city.jpg",
  "toyama-castle-08-autumn.jpg",
  "toyama-castle-09-night.jpg"
];

app.城背景番号取得 = function (得点) {
  return Math.max(0, Math.min(app.城背景一覧.length - 1, Math.floor(得点 / 100)));
};

app.城背景画像取得 = function (番号) {
  app.画像 = app.画像 || {};
  app.画像.城背景 = app.画像.城背景 || [];
  if (!app.画像.城背景[番号]) {
    const 画像 = new Image();
    画像.src = app.城背景一覧[番号];
    app.画像.城背景[番号] = 画像;
  }
  return app.画像.城背景[番号];
};

app.背景描画 = function () {
  const ctx = app.状態.ctx;
  if (!ctx) return;

  const 番号 = app.城背景番号取得(app.状態.得点);
  const 背景画像 = app.城背景画像取得(番号);

  ctx.fillStyle = "#203040";
  ctx.fillRect(0, 0, 360, 640);

  if (背景画像 && 背景画像.complete) {
    const canvasW = 360;
    const canvasH = 640;
    const imgW = 背景画像.naturalWidth || canvasW;
    const imgH = 背景画像.naturalHeight || canvasH;
    const scale = Math.max(canvasW / imgW, canvasH / imgH);
    const drawW = imgW * scale;
    const drawH = imgH * scale;
    const dx = (canvasW - drawW) / 2;
    const dy = (canvasH - drawH) / 2;
    ctx.drawImage(背景画像, dx, dy, drawW, drawH);
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

    const 選択 = app.状態.選択セル;
    if (app.状態.ボーナス中 === "代" && 選択 && 選択.c === x && 選択.r === y) {
      ctx.strokeStyle = "#FFD700";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(px, py, 22, 0, Math.PI * 2);
      ctx.stroke();
    }

    if (ボーナス漢字.includes(文字)) {
      ctx.strokeStyle = "#FFD700";
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
          ctx.strokeStyle = "#FFD700";
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

  
app.順位描画 = function () {
  const ctx = app.状態.ctx;
  const 順位 = app.得点読込();

  ctx.save();
  ctx.fillStyle = "rgba(0,0,0,.88)";
  ctx.fillRect(8, 36, 344, 594);
  ctx.strokeStyle = "#E5BE55";
  ctx.lineWidth = 2;
  ctx.strokeRect(14, 42, 332, 582);

  ctx.fillStyle = "#fff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = "bold 28px sans-serif";
  ctx.fillText("KIBOUKANJI", 180, 84);

  ctx.fillStyle = "#FFD75A";
  ctx.font = "bold 20px monospace";
  ctx.fillText("TOP 3", 180, 122);

  ctx.textAlign = "left";
  ctx.fillStyle = "#fff";
  ctx.font = "bold 22px monospace";
  for (let i = 0; i < 3; i++) {
    const item = 順位[i];
    const score = item ? String(item.score).padStart(7, "0") : "-------";
    const date = item ? item.date : "--------";
    ctx.fillText(`${i + 1}   ${score}   ${date}`, 38, 168 + i * 44);
  }

  ctx.fillStyle = "rgba(255,255,255,.09)";
  ctx.fillRect(24, 318, 312, 280);
  ctx.strokeStyle = "rgba(255,255,255,.35)";
  ctx.lineWidth = 1;
  ctx.strokeRect(24.5, 318.5, 311, 279);

  ctx.fillStyle = "#FFD75A";
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.font = "bold 17px sans-serif";
  ctx.fillText("ランキングについて", 38, 334);

  ctx.fillStyle = "#fff";
  ctx.font = "bold 14px sans-serif";
  const 案内 = [
    "スコアは、この端末の現在のブラウザに保存されます。",
    "Safari、Chrome、Samsung Internet、Microsoft Edge、",
    "Brave、Firefox、Opera など、別のブラウザとは",
    "ランキングを共有できません。",
    "別のスマートフォン、タブレット、パソコンへ",
    "端末を変えた場合も、記録は引き継がれません。",
    "履歴やサイトデータを削除した場合、または",
    "プライベートブラウズやシークレットモードでは、",
    "記録が保存されない、または消えることがあります。"
  ];
  案内.forEach((行, i) => ctx.fillText(行, 38, 366 + i * 24));
  ctx.restore();
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
      ctx.fillStyle = "rgba(0,0,0,.62)";
      ctx.fillRect(20, 260, 320, 140);
      ctx.fillStyle = "#fff";
      ctx.textAlign = "left";
      ctx.textBaseline = "alphabetic";
      ctx.font = "20px sans-serif";
      ctx.fillText(`ボーナス発動！［${状態.ボーナス中}］`, 40, 295);
      ctx.font = "16px sans-serif";
      if (状態.ボーナス中 === "代") {
        ctx.fillText("入れ替えたい漢字を二つ選んでください", 40, 326);
        ctx.fillText(`のこり ${状態.ボーナス残数} 回`, 80, 352);
      }
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

  app.コンボ表示 = function (連鎖数, 加点) {
    const effect = document.createElement("div");
    effect.textContent = `${連鎖数} コンボ！ +${加点}`;
    Object.assign(effect.style, {
      position: "fixed",
      left: "50%",
      top: "20%",
      transform: "translateX(-50%)",
      padding: "9px 14px",
      background: "rgba(0,0,0,.68)",
      color: "#fff",
      borderRadius: "8px",
      zIndex: "9999",
      fontWeight: "800"
    });
    document.body.appendChild(effect);
    setTimeout(() => effect.remove(), 800);
  };
})();
