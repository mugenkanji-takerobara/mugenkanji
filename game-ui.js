// KIBOUKANJI Ver.1.0.8
// 画面切替・特の符・ランキング画像・スマートフォン画面調整
// 更新日: 2026-07-31

(() => {
  "use strict";

  const app = window.KibouKanji = window.KibouKanji || {};
  const 履歴 = [];

  app.ゲーム画面寸法更新 = function () {
    const canvas = app.要素("game-canvas");
    const shell = document.querySelector("#game-screen .game-shell");
    const toolbar = document.querySelector("#game-screen .game-toolbar");
    const panel = app.要素("tokunofu-panel");
    const help = document.querySelector("#game-screen .game-help");
    if (!canvas || !shell) return;

    const viewportHeight = Math.max(
      320,
      Math.floor(window.visualViewport?.height || window.innerHeight || document.documentElement.clientHeight)
    );
    const viewportWidth = Math.max(
      240,
      Math.floor(window.visualViewport?.width || window.innerWidth || document.documentElement.clientWidth)
    );

    document.documentElement.style.setProperty("--game-viewport-height", `${viewportHeight}px`);

    const shellStyle = getComputedStyle(shell);
    const verticalPadding =
      parseFloat(shellStyle.paddingTop || "0") +
      parseFloat(shellStyle.paddingBottom || "0");
    const gap = parseFloat(shellStyle.rowGap || shellStyle.gap || "0");
    const toolbarHeight = toolbar?.offsetHeight || 42;
    const panelHeight = panel?.offsetHeight || 38;
    const helpHeight = help && getComputedStyle(help).display !== "none" ? help.offsetHeight : 0;
    const elementCount = helpHeight > 0 ? 4 : 3;
    const gapHeight = Math.max(0, elementCount - 1) * gap;
    const safety = 4;

    const availableHeight = Math.max(
      180,
      viewportHeight - verticalPadding - toolbarHeight - panelHeight - helpHeight - gapHeight - safety
    );
    const availableWidth = Math.max(180, Math.min(360, viewportWidth - 12));
    const canvasWidth = Math.max(180, Math.floor(Math.min(availableWidth, availableHeight * 360 / 640)));
    const canvasHeight = Math.floor(canvasWidth * 640 / 360);

    canvas.style.width = `${canvasWidth}px`;
    canvas.style.height = `${canvasHeight}px`;
  };

  app.画面表示 = function (id, 履歴追加 = true) {
    const 現在 = document.querySelector(".screen.active");
    if (履歴追加 && 現在 && 現在.id !== id) 履歴.push(現在.id);

    document.querySelectorAll(".screen").forEach(screen => screen.classList.remove("active"));
    const 画面 = app.要素(id);

    if (画面) {
      画面.classList.add("active");
      document.body.classList.toggle("game-open", id === "game-screen");
      document.body.classList.toggle("title-open", id === "title-screen");
      window.scrollTo({ top: 0, behavior: "instant" });
      if (id === "game-screen") requestAnimationFrame(app.ゲーム画面寸法更新);
    }
  };

  app.画像候補初期化 = function () {
    document.querySelectorAll("img[data-src-candidates]").forEach(image => {
      if (image.dataset.imageBound === "1") return;
      image.dataset.imageBound = "1";

      const 候補 = image.dataset.srcCandidates
        .split("|")
        .map(value => value.trim())
        .filter(Boolean);
      let 番号 = 0;

      const 次を試す = () => {
        if (番号 >= 候補.length) {
          image.hidden = true;
          image.closest(".spot")?.classList.remove("has-photo");
          return;
        }
        image.src = 候補[番号++];
      };

      image.addEventListener("load", () => {
        image.hidden = false;
        if (image.id === "title-bg-image") app.要素("title-screen")?.classList.add("image-ready");
      });

      image.addEventListener("error", 次を試す);
      次を試す();
    });
  };

  app.操作登録 = function () {
    const canvas = app.状態.canvas;
    if (!canvas || canvas.dataset.bound === "1") return;
    canvas.dataset.bound = "1";

    let 操作中 = false;
    let 開始X = 0;
    let 開始Y = 0;
    let pointerId = null;

    const 操作開始 = event => {
      if (event.button !== undefined && event.button !== 0) return;
      操作中 = true;
      pointerId = event.pointerId;
      開始X = event.clientX;
      開始Y = event.clientY;

      try { canvas.setPointerCapture(pointerId); } catch {}
      event.preventDefault();
    };

    const 操作終了 = event => {
      if (!操作中 || (pointerId !== null && event.pointerId !== pointerId)) return;

      const 差X = event.clientX - 開始X;
      const 差Y = event.clientY - 開始Y;
      const 横距離 = Math.abs(差X);
      const 縦距離 = Math.abs(差Y);
      操作中 = false;

      try { canvas.releasePointerCapture(event.pointerId); } catch {}

      if (app.状態.ボーナス中) {
        if (横距離 < 15 && 縦距離 < 15) app.ボーナスタップ(event.clientX, event.clientY);
        event.preventDefault();
        return;
      }

      if (横距離 > 縦距離 && 横距離 > 24) {
        app.左右移動(差X > 0 ? 1 : -1);
      } else if (差Y > 28) {
        app.高速落下();
      }

      event.preventDefault();
    };

    canvas.addEventListener("pointerdown", 操作開始);
    canvas.addEventListener("pointerup", 操作終了);
    canvas.addEventListener("pointercancel", event => {
      操作中 = false;
      pointerId = null;
      event.preventDefault();
    });
    canvas.addEventListener("contextmenu", event => event.preventDefault());

    window.addEventListener("keydown", event => {
      if (event.key === "ArrowLeft") { event.preventDefault(); app.左右移動(-1); }
      if (event.key === "ArrowRight") { event.preventDefault(); app.左右移動(1); }
      if (event.key === "ArrowDown") { event.preventDefault(); app.高速落下(); }
      if (event.key === " " || event.key.toLowerCase() === "p") {
        event.preventDefault();
        app.一時停止切替();
      }
    });
  };

  app.特の符表示更新 = function () {
    const 状態 = app.状態;
    const 更新 = (id, 文字) => {
      const button = app.要素(id);
      if (!button) return;
      const 数 = 状態.特の符?.[文字] || 0;
      button.textContent = `${文字} × ${数}`;
      button.disabled = 数 <= 0 || Boolean(状態.ボーナス中 || 状態.符確認中 || 状態.ゲーム終了);
    };

    更新("tokunofu-dai", "代");
    更新("tokunofu-gaku", "岳");
  };

  app.特の符確認表示 = function (文字, モード) {
    const modal = app.要素("tokunofu-modal");
    const symbol = app.要素("tokunofu-symbol");
    const title = app.要素("tokunofu-title");
    const message = app.要素("tokunofu-message");
    const store = app.要素("tokunofu-store");
    if (!modal) return;

    symbol.textContent = 文字;
    title.textContent = 文字 === "代"
      ? "代の特の符"
      : "岳の特の符";

    if (モード === "保存分") {
      message.textContent = `ためてある「${文字}」の「特の符」を使います。`;
      store.textContent = "もどる";
    } else {
      message.textContent = "今使うか、「特の符」をためてあとから使うか選んでください。";
      store.textContent = "ためておく";
    }

    modal.classList.add("open");
    app.特の符表示更新();
  };

  app.特の符確認閉じる = function () {
    app.要素("tokunofu-modal")?.classList.remove("open");
  };

  app.ボーナス確認表示 = function (情報) {
    const modal = app.要素("bonus-confirm-modal");
    const title = app.要素("bonus-confirm-title");
    const message = app.要素("bonus-confirm-message");
    const preview = app.要素("bonus-selection-preview");
    const yes = app.要素("bonus-confirm-yes");
    const no = app.要素("bonus-confirm-no");
    if (!modal || !情報) return;

    preview.replaceChildren();

    const チップ作成 = (番号, 文字) => {
      const chip = document.createElement("span");
      chip.className = "bonus-chip";
      chip.textContent = `${番号}${文字}`;
      preview.appendChild(chip);
    };

    if (情報.種類 === "岳") {
      title.textContent = "サンガクチンテイ（山岳鎮定）";
      message.textContent = `「${情報.文字1}」の漢字錠を盤面からすべて消しますか？`;
      yes.textContent = "消去する";
      no.textContent = "もどる";
      チップ作成("", 情報.文字1);
    } else {
      title.textContent = "タイシンセングウ（代身遷宮）";
      message.textContent = "この二つの漢字錠を入れ替えますか？";
      yes.textContent = "入れ替える";
      no.textContent = "選び直す";
      チップ作成("①", 情報.文字1);
      チップ作成("②", 情報.文字2);
    }

    modal.classList.add("open");
  };

  app.ボーナス確認閉じる = function () {
    app.要素("bonus-confirm-modal")?.classList.remove("open");
  };

  const 写真拡大登録 = function () {
    const modal = app.要素("photo-modal");
    const modalImage = app.要素("photo-modal-image");
    const close = app.要素("photo-close");
    if (!modal || !modalImage) return;

    document.querySelectorAll(".zoomable").forEach(image => {
      image.addEventListener("click", () => {
        if (!image.src || image.hidden) return;
        modalImage.src = image.currentSrc || image.src;
        modalImage.alt = image.alt || "";
        modal.classList.add("open");
      });
    });

    const 閉じる = () => modal.classList.remove("open");
    close?.addEventListener("click", 閉じる);
    modal.addEventListener("click", event => {
      if (event.target === modal) 閉じる();
    });
  };

  const 観光目次登録 = function () {
    document.querySelectorAll(".toyama-jump a").forEach(link => {
      link.addEventListener("click", event => {
        const id = link.getAttribute("href")?.replace("#", "");
        const target = id ? document.getElementById(id) : null;
        if (!target) return;
        event.preventDefault();
        target.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    });
  };

  const 続編予告登録 = function () {
    const modal = app.要素("teaser-modal");
    const open = app.要素("next-era-button");
    const close = app.要素("teaser-close");
    const replay = app.要素("teaser-replay");
    const video = app.要素("teaser-video");
    const status = app.要素("teaser-status");
    if (!modal || !open || !video) return;

    const 状態文 = text => {
      if (status) status.textContent = text;
    };

    const 再生開始 = () => {
      replay?.setAttribute("hidden", "");
      状態文("");
      try { video.currentTime = 0; } catch {}

      const promise = video.play();
      promise?.catch(() => {
        状態文("中央の再生ボタンを指で押してください。");
      });
    };

    const 開く = () => {
      app.音声解放?.();
      app.物語BGM停止?.();
      modal.classList.add("open");
      document.body.classList.add("teaser-open");
      再生開始();
    };

    const 閉じる = () => {
      video.pause();
      try { video.currentTime = 0; } catch {}
      modal.classList.remove("open");
      document.body.classList.remove("teaser-open");
      状態文("");
      app.波音だけ再生?.();
    };

    open.addEventListener("click", 開く);
    close?.addEventListener("click", 閉じる);
    replay?.addEventListener("click", 再生開始);

    video.addEventListener("ended", () => {
      replay?.removeAttribute("hidden");
      状態文("予告動画が終了しました。");
    });

    video.addEventListener("error", () => {
      状態文("動画を読み込めません。future_teaser.mp4を確認してください。");
    });

    modal.addEventListener("click", event => {
      if (event.target === modal) 閉じる();
    });

    window.addEventListener("keydown", event => {
      if (event.key === "Escape" && modal.classList.contains("open")) 閉じる();
    });
  };

  app.画面イベント登録 = function () {
    app.画像候補初期化();
    document.body.classList.toggle("title-open", document.querySelector(".screen.active")?.id === "title-screen");

    app.要素("start-button")?.addEventListener("click", () => {
      app.音声解放?.();
      app.画面表示("game-screen");
      app.ゲーム開始();
    });

    app.要素("manual-button")?.addEventListener("click", () => {
      app.画面表示("manual-screen");
    });

    app.要素("toyama-button")?.addEventListener("click", () => {
      app.画面表示("toyama-screen");
    });

    app.要素("story-button")?.addEventListener("click", () => {
      app.音声解放?.();
      app.画面表示("story-screen");
      app.物語BGM開始?.();
    });

    document.querySelectorAll(".back-button").forEach(button => {
      button.addEventListener("click", () => {
        app.ボーナス確認閉じる?.();
        app.特の符確認閉じる?.();
        app.全BGM停止?.();
        app.画面表示("title-screen", false);
        履歴.length = 0;
      });
    });

    document.querySelectorAll(".story-back-button").forEach(button => {
      button.addEventListener("click", () => {
        app.物語BGM停止?.();
        app.画面表示("toyama-screen", false);
      });
    });

    app.要素("pause-button")?.addEventListener("click", app.一時停止切替);
    app.要素("restartBtn")?.addEventListener("click", app.ゲーム開始);
    app.要素("ranking-copy")?.addEventListener("click", app.順位画像コピー);
    app.要素("ranking-save")?.addEventListener("click", app.順位画像保存);

    app.要素("bonus-confirm-yes")?.addEventListener("click", app.ボーナス確定);
    app.要素("bonus-confirm-no")?.addEventListener("click", app.ボーナス選び直し);

    app.要素("tokunofu-use")?.addEventListener("click", app.特の符を使う);
    app.要素("tokunofu-store")?.addEventListener("click", app.特の符をためる);

    document.querySelectorAll("[data-tokunofu]").forEach(button => {
      button.addEventListener("click", () => {
        app.ためた特の符を選ぶ(button.dataset.tokunofu);
      });
    });

    写真拡大登録();
    観光目次登録();
    続編予告登録();

    app.ゲーム画面寸法更新();
    window.addEventListener("resize", app.ゲーム画面寸法更新, { passive: true });
    window.addEventListener("orientationchange", () => {
      setTimeout(app.ゲーム画面寸法更新, 120);
    }, { passive: true });
    window.visualViewport?.addEventListener("resize", app.ゲーム画面寸法更新, { passive: true });
    window.visualViewport?.addEventListener("scroll", app.ゲーム画面寸法更新, { passive: true });
  };
})();
