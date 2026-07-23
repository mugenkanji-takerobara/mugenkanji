(() => {
  "use strict";

  const app = window.KibouKanji = window.KibouKanji || {};

  app.季節取得 = function (得点) {
    return ["spring", "summer", "autumn", "winter"][Math.floor(得点 / 200) % 4];
  };

  app.背景描画 = function () {
    const ctx = app.状態.ctx;
    if (!ctx) return;

    const 季節 = app.季節取得(app.状態.得点);
    const sky = ctx.createLinearGradient(0, 0, 0, 140);
    sky.addColorStop(0, "#87CEEB");
    sky.addColorStop(1, "#E0FFFF");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, 360, 140);

    if (季節 === "spring") {
      ctx.fillStyle = "#F0F8FF";
      ctx.fillRect(0, 120, 360, 40);
      ctx.fillStyle = "#87CEFA";
      ctx.fillRect(0, 140, 360, 30);
      ctx.fillStyle = "#228B22";
      ctx.fillRect(0, 170, 360, 20);
      ctx.fillStyle = "#FFC0CB";
      for (let i = 0; i < 8; i++) {
        ctx.beginPath();
        ctx.arc(20 + i * 40, 130, 8, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (季節 === "summer") {
      ctx.fillStyle = "#2E8B57";
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
      ctx.fillStyle = "#228B22";
      ctx.fillRect(0, 140, 360, 20);
    } else if (季節 === "autumn") {
      ctx.fillStyle = "#8B4513";
      ctx.fillRect(0, 120, 360, 40);
      const 色 = ["#FF8C00", "#FF4500", "#FFD700"];
      for (let i = 0; i < 9; i++) {
        ctx.fillStyle = 色[i % 3];
        ctx.beginPath();
        ctx.arc(20 + i * 40, 120, 10, 0, Math.PI * 2);
        ctx.fill();
      }
    } else {
      ctx.fillStyle = "#F8F8FF";
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
      ctx.fillStyle = "#00BFFF";
      ctx.fillRect(0, 140, 360, 40);
      ctx.fillStyle = "#FFFFFF";
      [[60,160,10,6],[120,162,12,5],[190,162,16,6]].forEach(([x,y,rx,ry]) => {
        ctx.beginPath();
        ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    const { 盤面左, 盤面上, 列数, 行数, マス寸法 } = app.設定;
    ctx.fillStyle = "#F0F8FF";
    ctx.fillRect(盤面左 - 4, 盤面上 - 4, 列数 * マス寸法 + 8, 行数 * マス寸法 + 8);

    const sea = ctx.createLinearGradient(0, 盤面上 + 行数 * マス寸法 + 10, 0, 640);
    sea.addColorStop(0, "#00BFFF");
    sea.addColorStop(1, "#1E90FF");
    ctx.fillStyle = sea;
    ctx.fillRect(0, 盤面上 + 行数 * マス寸法 + 10, 360, 640);
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
    ctx.fillStyle = "rgba(0,0,0,.82)";
    ctx.fillRect(18, 142, 324, 468);
    ctx.strokeStyle = "#E5BE55";
    ctx.lineWidth = 2;
    ctx.strokeRect(26, 150, 308, 452);

    ctx.fillStyle = "#fff";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = "bold 23px sans-serif";
    ctx.fillText("きぼうかんじ", 180, 178);
    ctx.font = "13px sans-serif";
    ctx.fillText("とやまの無限漢字", 180, 204);
    ctx.fillText("立山連峰から富山湾まで、希望の数え唄", 180, 224);

    ctx.fillStyle = "#FFD75A";
    ctx.font = "bold 17px monospace";
    ctx.fillText("TOP 3", 180, 254);

    ctx.textAlign = "left";
    ctx.fillStyle = "#fff";
    ctx.font = "bold 16px monospace";
    for (let i = 0; i < 3; i++) {
      const item = 順位[i];
      const score = item ? String(item.score).padStart(7, "0") : "-------";
      const date = item ? item.date : "--------";
      ctx.fillText(`${i + 1}   ${score}   ${date}`, 72, 286 + i * 28);
    }

    // ランキング直下の保存案内
    ctx.fillStyle = "rgba(255,255,255,.09)";
    ctx.fillRect(38, 374, 284, 210);
    ctx.strokeStyle = "rgba(255,255,255,.35)";
    ctx.lineWidth = 1;
    ctx.strokeRect(38.5, 374.5, 283, 209);

    ctx.fillStyle = "#FFD75A";
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.font = "bold 13px sans-serif";
    ctx.fillText("ランキングについて", 50, 387);

    ctx.fillStyle = "#fff";
    ctx.font = "10px sans-serif";
    const 案内 = [
      "スコアは、この端末で現在使用しているブラウザに",
      "保存されます。",
      "Safari、Chrome、Google、Samsung Internet、",
      "Microsoft Edge、Brave、Firefox、Operaなど、",
      "異なるブラウザ間ではランキングを共有できません。",
      "別のスマートフォン、タブレット、パソコンなどへ",
      "端末を変更した場合も、ランキングは引き継がれません。",
      "履歴やサイトデータを削除した場合、または",
      "プライベートブラウズやシークレットモードでは、",
      "記録が保存されない、または消えることがあります。"
    ];
    案内.forEach((行, i) => ctx.fillText(行, 50, 414 + i * 16));
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
