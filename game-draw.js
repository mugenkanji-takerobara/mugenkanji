// きぼうかんじ 公開版 Ver.1.0
// 富山城背景・特の符・連鎖演出
// 更新日: 2026-07-16

(() => {
  "use strict";

  const app = window.KibouKanji = window.KibouKanji || {};


  app.富山城背景 = [
    { file: "toyama-castle-01-sakura.jpg", name: "春　桜の富山城" },
    { file: "toyama-castle-02-tulip.jpg", name: "春　花ひらく城下" },
    { file: "toyama-castle-03-green.jpg", name: "初夏　新緑と水辺" },
    { file: "toyama-castle-04-blue.jpg", name: "夏　青空の富山城" },
    { file: "toyama-castle-05-cloud.jpg", name: "盛夏　雲わたる城" },
    { file: "toyama-castle-06-detail.jpg", name: "城郭　白壁と瓦" },
    { file: "toyama-castle-07-city.jpg", name: "街なかに息づく城" },
    { file: "toyama-castle-08-autumn.jpg", name: "秋　城址の彩り" },
    { file: "toyama-castle-09-night.jpg", name: "夜　水鏡の富山城" }
  ].map(item => {
    const image = new Image();
    image.decoding = "async";
    image.src = item.file;
    return { ...item, image };
  });

  app.背景演出 = {
    現在段階: -1,
    前段階: -1,
    切替時刻: 0
  };

  app.背景段階 = function () {
    return Math.floor(app.状態.得点 / 100) % app.富山城背景.length;
  };

  app.画像全面描画 = function (ctx, image, width, height, alpha = 1) {
    const imageWidth = image.naturalWidth || image.width;
    const imageHeight = image.naturalHeight || image.height;
    if (!imageWidth || !imageHeight) return false;

    const scale = Math.max(width / imageWidth, height / imageHeight);
    const drawWidth = imageWidth * scale;
    const drawHeight = imageHeight * scale;
    const x = (width - drawWidth) / 2;
    const y = (height - drawHeight) / 2;

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.drawImage(image, x, y, drawWidth, drawHeight);
    ctx.restore();
    return true;
  };

  app.背景描画 = function () {
    const ctx = app.状態.ctx;
    if (!ctx) return;

    const 時刻 = performance.now();
    const 新段階 = app.背景段階();
    const 演出 = app.背景演出;

    if (演出.現在段階 !== 新段階) {
      const 初回表示 = 演出.現在段階 < 0;
      演出.前段階 = 演出.現在段階;
      演出.現在段階 = 新段階;
      演出.切替時刻 = 時刻;
      if (!初回表示 && app.状態.開始済み) app.背景変更音再生?.();
    }

    const 現在背景 = app.富山城背景[演出.現在段階];
    const 前背景 = app.富山城背景[演出.前段階];
    const 進行 = Math.min(1, Math.max(0, (時刻 - 演出.切替時刻) / 900));

    const 現在読込済み = 現在背景?.image?.complete && 現在背景.image.naturalWidth > 0;
    const 前読込済み = 前背景?.image?.complete && 前背景.image.naturalWidth > 0;

    if (前読込済み && 進行 < 1) {
      app.画像全面描画(ctx, 前背景.image, 360, 640, 1);
    } else {
      const fallback = ctx.createLinearGradient(0, 0, 0, 640);
      fallback.addColorStop(0, "#87CEEB");
      fallback.addColorStop(0.5, "#DFF3F5");
      fallback.addColorStop(1, "#2578A2");
      ctx.fillStyle = fallback;
      ctx.fillRect(0, 0, 360, 640);
    }

    if (現在読込済み) {
      app.画像全面描画(ctx, 現在背景.image, 360, 640, 前読込済み ? 進行 : 1);
    }

    /* 写真の上でも漢字と得点が読みやすいよう、静かな陰影を重ねます。 */
    const shade = ctx.createLinearGradient(0, 0, 0, 640);
    shade.addColorStop(0, "rgba(8,22,34,.38)");
    shade.addColorStop(0.20, "rgba(255,255,255,.04)");
    shade.addColorStop(0.72, "rgba(18,31,40,.10)");
    shade.addColorStop(1, "rgba(5,18,29,.42)");
    ctx.fillStyle = shade;
    ctx.fillRect(0, 0, 360, 640);

    const { 盤面左, 盤面上, 列数, 行数, マス寸法 } = app.設定;

    /* 盤面には半透明の和紙風パネルを置き、背景写真を感じながら遊べるようにします。 */
    ctx.fillStyle = "rgba(246,250,250,.76)";
    ctx.fillRect(
      盤面左 - 5,
      盤面上 - 5,
      列数 * マス寸法 + 10,
      行数 * マス寸法 + 10
    );

    ctx.strokeStyle = "rgba(255,255,255,.92)";
    ctx.lineWidth = 2;
    ctx.strokeRect(
      盤面左 - 5,
      盤面上 - 5,
      列数 * マス寸法 + 10,
      行数 * マス寸法 + 10
    );

    /* 切替直後だけ風景名を表示し、写真そのものを邪魔しないようにします。 */
    const 経過 = 時刻 - 演出.切替時刻;
    if (経過 < 2600) {
      const 表示率 = 経過 < 350
        ? 経過 / 350
        : 経過 > 2100
          ? (2600 - 経過) / 500
          : 1;

      ctx.save();
      ctx.globalAlpha = Math.max(0, Math.min(1, 表示率));
      ctx.fillStyle = "rgba(0,0,0,.56)";
      ctx.fillRect(64, 61, 232, 38);
      ctx.strokeStyle = "rgba(255,255,255,.48)";
      ctx.strokeRect(66, 63, 228, 34);
      ctx.fillStyle = "#fff";
      ctx.font = "bold 14px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(現在背景?.name || "富山城", 180, 80);
      ctx.restore();
    }
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
    const 一つ目 = app.状態.選択セル;
    const 二つ目 = app.状態.選択セル2;
    const 選択1 = 一つ目 && 一つ目.c === x && 一つ目.r === y;
    const 選択2 = 二つ目 && 二つ目.c === x && 二つ目.r === y;
    const 選択中 = 選択1 || 選択2;

    ctx.beginPath();
    ctx.fillStyle = 選択中
      ? "rgba(75,85,99,.97)"
      : 落下中
        ? "rgba(255,255,255,.98)"
        : "rgba(255,255,255,.90)";
    ctx.arc(px, py, 18, 0, Math.PI * 2);
    ctx.fill();

    if (ボーナス漢字.includes(文字) && !選択中) {
      ctx.strokeStyle = "#FFD700";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(px, py, 20, 0, Math.PI * 2);
      ctx.stroke();
    }

    if (選択中) {
      ctx.strokeStyle = "#D7DDE5";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(px, py, 22, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.fillStyle = 選択中 ? "#FFFFFF" : "#000000";
    ctx.font = 落下中 ? "bold 24px sans-serif" : "bold 20px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(文字, px, py + 1);

    if (選択中 && app.状態.ボーナス中 === "代") {
      const 番号 = 選択1 ? "1" : "2";
      ctx.beginPath();
      ctx.fillStyle = "#D7DDE5";
      ctx.arc(px + 14, py - 14, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#303741";
      ctx.font = "bold 10px sans-serif";
      ctx.fillText(番号, px + 14, py - 13);
    }
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

    /* もう一度あそぶボタンと重ならない、大きなランキング表示 */
    ctx.fillStyle = "rgba(0,0,0,.82)";
    ctx.fillRect(14, 154, 332, 350);
    ctx.strokeStyle = "#E5BE55";
    ctx.lineWidth = 3;
    ctx.strokeRect(22, 162, 316, 334);

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    ctx.fillStyle = "#fff";
    ctx.font = "bold 21px sans-serif";
    ctx.fillText("きぼうかんじ", 180, 193);

    ctx.font = "13px sans-serif";
    ctx.fillText("とやまの無限漢字", 180, 220);
    ctx.fillText("立山連峰から富山湾まで　希望の数え唄", 180, 242);

    ctx.fillStyle = "#FFD75A";
    ctx.font = "bold 28px sans-serif";
    ctx.fillText("スコアランキング", 180, 286);

    ctx.fillStyle = "#fff";
    ctx.font = "bold 17px monospace";
    ctx.fillText("TOP 3", 180, 319);

    ctx.textAlign = "left";
    ctx.font = "bold 19px monospace";

    for (let i = 0; i < 3; i++) {
      const item = 順位[i];
      const score = item ? String(item.score).padStart(7, "0") : "-------";
      const date = item ? item.date : "--------";
      const y = 365 + i * 43;

      ctx.fillStyle = i === 0 ? "#FFE28A" : "#fff";
      ctx.fillText(`${i + 1}位`, 55, y);
      ctx.fillText(score, 119, y);

      ctx.fillStyle = "rgba(255,255,255,.82)";
      ctx.font = "bold 14px monospace";
      ctx.fillText(date, 236, y);
      ctx.font = "bold 19px monospace";
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
      ctx.fillText("上の「再開」で続けられます", 180, 336);
    }

    if (状態.ボーナス中) {
      ctx.save();
      ctx.fillStyle = "rgba(30,38,47,.88)";
      ctx.fillRect(38, 101, 284, 34);
      ctx.strokeStyle = "rgba(215,221,229,.92)";
      ctx.lineWidth = 2;
      ctx.strokeRect(40, 103, 280, 30);
      ctx.fillStyle = "#fff";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.font = "bold 13px sans-serif";

      if (状態.ボーナス中 === "岳") {
        const 選択文字 = 状態.選択セル?.文字;
        ctx.fillText(選択文字 ? `岳：選んだ「${選択文字}」を確認` : "岳：消したい漢字を一つ選ぶ", 180, 118);
      } else {
        const 一つ目 = 状態.選択セル?.文字 || "未選択";
        const 二つ目 = 状態.選択セル2?.文字 || "未選択";
        ctx.fillText(`代：①${一つ目}　②${二つ目}　あと${状態.ボーナス残数}回`, 180, 118);
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
    effect.textContent = 文字;
    Object.assign(effect.style, {
      position: "fixed",
      left: "50%",
      top: "28%",
      transform: "translate(-50%,-50%) scale(.88)",
      padding: "12px 18px",
      background: "linear-gradient(180deg,rgba(255,225,104,.98),rgba(204,137,22,.98))",
      color: "#fff",
      border: "2px solid rgba(255,255,255,.92)",
      borderRadius: "999px",
      boxShadow: "0 10px 26px rgba(0,0,0,.28)",
      zIndex: "9999",
      fontWeight: "900",
      fontSize: "21px",
      letterSpacing: ".05em",
      opacity: "0",
      transition: "opacity .15s ease, transform .15s ease"
    });

    document.body.appendChild(effect);
    requestAnimationFrame(() => {
      effect.style.opacity = "1";
      effect.style.transform = "translate(-50%,-50%) scale(1)";
    });

    setTimeout(() => {
      effect.style.opacity = "0";
      effect.style.transform = "translate(-50%,-58%) scale(1.05)";
    }, 650);

    setTimeout(() => effect.remove(), 900);
  };

  app.コンボ表示 = function (連鎖数, 加点) {
    const effect = document.createElement("div");
    effect.textContent = 連鎖数 <= 1
      ? `消去 +${加点}`
      : `${連鎖数}連鎖${"！".repeat(Math.min(3, 連鎖数 - 1))} +${加点}`;

    const 拡大率 = Math.min(1.35, 1 + Math.max(0, 連鎖数 - 1) * .08);
    Object.assign(effect.style, {
      position: "fixed",
      left: "50%",
      top: 連鎖数 <= 1 ? "22%" : "18%",
      transform: `translate(-50%,-50%) scale(.72)`,
      padding: "11px 17px",
      background: 連鎖数 <= 1
        ? "rgba(25,39,48,.82)"
        : "linear-gradient(180deg,rgba(255,217,83,.98),rgba(197,113,20,.98))",
      color: "#fff",
      border: "2px solid rgba(255,255,255,.86)",
      borderRadius: "999px",
      boxShadow: "0 12px 30px rgba(0,0,0,.28)",
      zIndex: "9999",
      fontWeight: "900",
      fontSize: `${Math.min(30, 18 + 連鎖数 * 2)}px`,
      opacity: "0",
      transition: "opacity .14s ease, transform .18s cubic-bezier(.2,.8,.2,1)"
    });

    document.body.appendChild(effect);
    requestAnimationFrame(() => {
      effect.style.opacity = "1";
      effect.style.transform = `translate(-50%,-50%) scale(${拡大率})`;
    });

    setTimeout(() => {
      effect.style.opacity = "0";
      effect.style.transform = `translate(-50%,-64%) scale(${拡大率 + .08})`;
    }, 720);

    setTimeout(() => effect.remove(), 980);
  };

  app.ボーナス成立演出 = function (文字) {
    const overlay = app.要素("bonus-flash");
    const kanji = app.要素("bonus-flash-kanji");
    if (!overlay || !kanji) return;

    kanji.textContent = 文字;
    overlay.classList.remove("show");
    void overlay.offsetWidth;
    overlay.classList.add("show");
    setTimeout(() => overlay.classList.remove("show"), 920);
  };
})();
