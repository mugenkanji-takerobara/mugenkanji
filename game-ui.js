// KIBOUKANJI Ver.1.0.12 LOCAL TEST
// 画面切替・スマートフォン操作安定化・ランキングページ・途中再開

(() => {
  "use strict";

  const app = window.KibouKanji = window.KibouKanji || {};
  const 履歴 = [];

  const 現在画面ID = () => document.querySelector(".screen.active")?.id || "";

  app.ゲーム画面寸法更新 = function (強制 = false) {
    const canvas = app.要素("game-canvas");
    const shell = document.querySelector("#game-screen .game-shell");
    const toolbar = document.querySelector("#game-screen .game-toolbar");
    const panel = app.要素("tokunofu-panel");
    const help = document.querySelector("#game-screen .game-help");
    if (!canvas || !shell) return;

    const ゲーム表示中 = 現在画面ID() === "game-screen";
    if (
      ゲーム表示中 &&
      app.状態.開始済み &&
      !app.状態.一時停止 &&
      app.状態.画面固定幅 > 0 &&
      app.状態.画面固定高さ > 0 &&
      !強制
    ) return;

    const viewportHeight = Math.max(320, Math.floor(window.innerHeight || document.documentElement.clientHeight || 640));
    const viewportWidth = Math.max(240, Math.floor(document.documentElement.clientWidth || window.innerWidth || 360));

    if (ゲーム表示中) {
      app.状態.画面固定幅 = viewportWidth;
      app.状態.画面固定高さ = viewportHeight;
    }
    document.documentElement.style.setProperty("--game-viewport-height", `${viewportHeight}px`);

    const shellStyle = getComputedStyle(shell);
    const verticalPadding = parseFloat(shellStyle.paddingTop || "0") + parseFloat(shellStyle.paddingBottom || "0");
    const gap = parseFloat(shellStyle.rowGap || shellStyle.gap || "0");
    const toolbarHeight = toolbar?.offsetHeight || 42;
    const panelHeight = panel?.offsetHeight || 38;
    const helpHeight = help && getComputedStyle(help).display !== "none" ? help.offsetHeight : 0;
    const elementCount = helpHeight > 0 ? 4 : 3;
    const gapHeight = Math.max(0, elementCount - 1) * gap;
    const safety = 6;

    const availableHeight = Math.max(180, viewportHeight - verticalPadding - toolbarHeight - panelHeight - helpHeight - gapHeight - safety);
    const availableWidth = Math.max(180, Math.min(360, viewportWidth - 14));
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
    if (!画面) return;

    画面.classList.add("active");
    document.body.classList.toggle("game-open", id === "game-screen");
    document.body.classList.toggle("title-open", id === "title-screen");
    window.scrollTo(0, 0);
    requestAnimationFrame(() => {
      画面.querySelectorAll("img[data-src-candidates]").forEach((img, i) => { if (i < 2) app.画像を読み込む?.(img); });
    });

    if (id === "game-screen") {
      requestAnimationFrame(() => app.ゲーム画面寸法更新(true));
    } else {
      app.状態.画面固定幅 = 0;
      app.状態.画面固定高さ = 0;
    }
  };

  app.画像候補初期化 = function () {
    const 読込 = image => {
      if (!image || image.dataset.imageStarted === "1") return;
      image.dataset.imageStarted = "1";
      const 候補 = (image.dataset.srcCandidates || "").split("|").map(value => value.trim()).filter(Boolean);
      let 番号 = 0;
      let 再試行 = 0;

      const 次を試す = () => {
        if (番号 >= 候補.length) {
          if (再試行 < 2 && 候補.length) {
            再試行++;
            番号 = 0;
            setTimeout(次を試す, 700 * 再試行);
            return;
          }
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
    };

    const observer = "IntersectionObserver" in window ? new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        読込(entry.target);
        observer.unobserve(entry.target);
      });
    }, { root: null, rootMargin: "700px 0px", threshold: 0.01 }) : null;

    document.querySelectorAll("img[data-src-candidates]").forEach(image => {
      if (image.dataset.imageBound === "1") return;
      image.dataset.imageBound = "1";
      const eager = image.id === "title-bg-image" || image.loading === "eager" || image.dataset.eager === "1";
      if (eager || !observer) 読込(image);
      else observer.observe(image);
    });

    app.画像を読み込む = 読込;
  };

  const ゲーム標準操作抑止登録 = () => {
    const gameScreen = app.要素("game-screen");
    if (!gameScreen || gameScreen.dataset.gestureBound === "1") return;
    gameScreen.dataset.gestureBound = "1";

    const 抑止 = event => {
      if (!document.body.classList.contains("game-open")) return;
      if (!gameScreen.contains(event.target)) return;
      if (event.cancelable) event.preventDefault();
    };

    gameScreen.addEventListener("touchmove", 抑止, { passive: false, capture: true });
    gameScreen.addEventListener("gesturestart", 抑止, { passive: false, capture: true });
    gameScreen.addEventListener("gesturechange", 抑止, { passive: false, capture: true });
    gameScreen.addEventListener("dragstart", 抑止, { capture: true });
    gameScreen.addEventListener("selectstart", 抑止, { capture: true });
  };

  app.操作登録 = function () {
    const canvas = app.状態.canvas;
    if (!canvas || canvas.dataset.bound === "1") return;
    canvas.dataset.bound = "1";

    let 操作中 = false;
    let 開始X = 0;
    let 開始Y = 0;
    let 最終X = 0;
    let 最終Y = 0;
    let pointerId = null;

    const 操作開始 = event => {
      if (event.button !== undefined && event.button !== 0) return;
      操作中 = true;
      pointerId = event.pointerId;
      開始X = 最終X = event.clientX;
      開始Y = 最終Y = event.clientY;
      try { canvas.setPointerCapture(pointerId); } catch {}
      if (event.cancelable) event.preventDefault();
    };

    const 操作移動 = event => {
      if (!操作中 || (pointerId !== null && event.pointerId !== pointerId)) return;
      最終X = event.clientX;
      最終Y = event.clientY;
      if (event.cancelable) event.preventDefault();
    };

    const 操作確定 = (clientX, clientY) => {
      const 差X = clientX - 開始X;
      const 差Y = clientY - 開始Y;
      const 横距離 = Math.abs(差X);
      const 縦距離 = Math.abs(差Y);

      if (app.状態.ボーナス中) {
        if (横距離 < 18 && 縦距離 < 18) app.ボーナスタップ(clientX, clientY);
        return;
      }
      if (横距離 > 縦距離 && 横距離 > 22) {
        app.左右移動(差X > 0 ? 1 : -1);
      } else if (差Y > 26) {
        app.高速落下();
      }
    };

    const 操作終了 = event => {
      if (!操作中 || (pointerId !== null && event.pointerId !== pointerId)) return;
      最終X = Number.isFinite(event.clientX) ? event.clientX : 最終X;
      最終Y = Number.isFinite(event.clientY) ? event.clientY : 最終Y;
      操作中 = false;
      try { canvas.releasePointerCapture(event.pointerId); } catch {}
      操作確定(最終X, 最終Y);
      pointerId = null;
      if (event.cancelable) event.preventDefault();
    };

    const 操作中止 = event => {
      if (!操作中) return;
      操作中 = false;
      pointerId = null;
      if (event.cancelable) event.preventDefault();
    };

    canvas.addEventListener("pointerdown", 操作開始, { passive: false });
    canvas.addEventListener("pointermove", 操作移動, { passive: false });
    canvas.addEventListener("pointerup", 操作終了, { passive: false });
    canvas.addEventListener("pointercancel", 操作中止, { passive: false });
    canvas.addEventListener("lostpointercapture", () => { 操作中 = false; pointerId = null; });
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
    title.textContent = "特の符";
    if (モード === "保存分") {
      message.textContent = `ためてある「${文字}」を使います。`;
      store.textContent = "もどる";
    } else {
      message.textContent = "今すぐ使うか、ためてあとから使うか選んでください。";
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

  app.ランキング操作位置更新 = function () {
    if (!app.状態.ゲーム終了) return;
    const canvas = app.要素("game-canvas");
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;

    const scale = rect.height / 640;
    const centerX = rect.left + rect.width / 2;
    const 配置 = (el, y, width) => {
      if (!el) return;
      el.style.left = `${centerX}px`;
      el.style.top = `${rect.top + y * scale}px`;
      el.style.bottom = "auto";
      el.style.width = `${Math.min(rect.width - 28, width * scale)}px`;
      el.style.transform = "translateX(-50%)";
    };

    配置(app.要素("ranking-about"), 442, 178);
    配置(app.要素("ranking-actions"), 472, 312);
    配置(app.要素("ranking-nav"), 531, 312);
    配置(app.要素("restartBtn"), 579, 184);
  };

  app.ランキングUI更新 = function (表示) {
    app.要素("ranking-actions")?.toggleAttribute("hidden", !表示);
    app.要素("ranking-nav")?.toggleAttribute("hidden", !表示);
    app.要素("ranking-about")?.toggleAttribute("hidden", !表示);
    app.要素("restartBtn")?.classList.toggle("hidden", !表示);
    if (表示) requestAnimationFrame(() => app.ランキング操作位置更新?.());
  };

  app.ランキングUIページ更新 = function (page, total) {
    const actions = app.要素("ranking-actions");
    const nav = app.要素("ranking-nav");
    const about = app.要素("ranking-about");
    const prev = app.要素("ranking-prev");
    const next = app.要素("ranking-next");
    if (!app.状態.ゲーム終了) return;
    actions?.toggleAttribute("hidden", false);
    about?.toggleAttribute("hidden", page !== 0);
    nav?.toggleAttribute("hidden", false);
    if (prev) prev.disabled = page <= 0;
    if (next) next.textContent = page >= total - 1 ? "ランキングへ戻る" : "次のページ →";
    if (prev) prev.textContent = "← 前のページ";
    requestAnimationFrame(() => app.ランキング操作位置更新?.());
  };

  const 写真拡大登録 = function () {
    const modal = app.要素("photo-modal");
    const modalImage = app.要素("photo-modal-image");
    const close = app.要素("photo-close");
    if (!modal || !modalImage) return;

    document.querySelectorAll(".spot-img, .castle-gallery img, .zoomable").forEach(image => {
      image.classList.add("zoomable");
      if (image.dataset.zoomBound === "1") return;
      image.dataset.zoomBound = "1";
      image.addEventListener("click", () => {
        app.画像を読み込む?.(image);
        const 開く = () => {
          if (!image.src || image.hidden || !image.complete || image.naturalWidth <= 0) return;
          modalImage.src = image.currentSrc || image.src;
          modalImage.alt = image.alt || "";
          modal.classList.add("open");
        };
        if (image.complete && image.naturalWidth > 0) 開く();
        else image.addEventListener("load", 開く, { once: true });
      });
    });

    const 閉じる = () => {
      modal.classList.remove("open");
      modalImage.removeAttribute("src");
    };
    close?.addEventListener("click", 閉じる);
    modal.addEventListener("click", event => { if (event.target === modal) 閉じる(); });
  };

  const 観光地名コピー登録 = function () {
    const fallbackCopy = text => {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.setAttribute("readonly", "");
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      textarea.style.pointerEvents = "none";
      document.body.appendChild(textarea);
      textarea.select();
      textarea.setSelectionRange(0, textarea.value.length);
      let ok = false;
      try { ok = document.execCommand("copy"); } catch {}
      textarea.remove();
      return ok;
    };

    document.querySelectorAll("#toyama-screen .spot").forEach(spot => {
      if (spot.classList.contains("castle-gallery-spot")) return;
      const heading = spot.querySelector("h2");
      if (!heading || spot.querySelector(".spot-copy-btn")) return;
      const button = document.createElement("button");
      button.type = "button";
      button.className = "spot-copy-btn";
      button.textContent = "検索用にコピー";
      button.addEventListener("click", async () => {
        const address = spot.querySelector(".addr")?.textContent?.trim() || "";
        const text = [heading.textContent.trim(), address].filter(Boolean).join(" ");
        let ok = false;
        try {
          if (navigator.clipboard?.writeText && window.isSecureContext) {
            await navigator.clipboard.writeText(text);
            ok = true;
          }
        } catch {}
        if (!ok) ok = fallbackCopy(text);
        app.加点表示?.(ok ? "観光地名と住所をコピーしました" : "観光地名と住所を長押ししてコピーしてください", ok ? 1800 : 2800);
      });
      spot.appendChild(button);
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
    const landscape = app.要素("teaser-landscape");
    const video = app.要素("teaser-video");
    const status = app.要素("teaser-status");
    if (!modal || !open || !video) return;

    const 初期案内 = "";
    const 状態文 = (text, 表示 = false) => {
      if (!status) return;
      status.textContent = text || "";
      status.toggleAttribute("hidden", !表示 || !text);
    };
    const shell = modal.querySelector(".teaser-video-shell");

    // 公開版1.0.12: translate(-50%,-50%) と rotate の組合せをやめる。
    // iPhone Safariの縦向き表示では、回転後の左上が画面左上に一致するよう
    // 「幅=縦寸法 / 高さ=横寸法 / left=横寸法 / top=0 / 原点=左上」で配置する。
    // これにより、横向き表示が左上へ寄って画面外へはみ出す症状を防ぐ。
    const 横画面サイズ更新 = () => {
      if (!modal.classList.contains("force-landscape") || !shell) return;
      const vw = Math.max(1, window.innerWidth || document.documentElement.clientWidth || 1);
      const vh = Math.max(1, window.innerHeight || document.documentElement.clientHeight || 1);
      const portrait = vh >= vw;
      shell.style.transformOrigin = "0 0";
      if (portrait) {
        shell.style.width = `${vh}px`;
        shell.style.height = `${vw}px`;
        shell.style.left = `${vw}px`;
        shell.style.top = "0px";
        shell.style.transform = "rotate(90deg)";
      } else {
        shell.style.width = `${vw}px`;
        shell.style.height = `${vh}px`;
        shell.style.left = "0px";
        shell.style.top = "0px";
        shell.style.transform = "none";
      }
    };

    const 横画面モード解除 = () => {
      modal.classList.remove("force-landscape");
      if (shell) {
        shell.style.width = "";
        shell.style.height = "";
        shell.style.left = "";
        shell.style.top = "";
        shell.style.transformOrigin = "";
        shell.style.transform = "";
      }
      video.playsInline = true;
      video.setAttribute("playsinline", "");
    };

    const 横画面全画面を試す = () => {
      状態文("");
      replay?.setAttribute("hidden", "");
      try { video.currentTime = 0; } catch {}
      video.playsInline = true;
      video.setAttribute("playsinline", "");
      video.controls = true;
      modal.classList.add("force-landscape");
      横画面サイズ更新();
      requestAnimationFrame(横画面サイズ更新);
      try {
        const playPromise = video.play();
        playPromise?.catch?.(() => 状態文("動画中央の再生ボタンを押してください。", true));
      } catch {
        状態文("動画中央の再生ボタンを押してください。", true);
      }
    };

    window.addEventListener("resize", 横画面サイズ更新, { passive: true });
    window.visualViewport?.addEventListener?.("resize", 横画面サイズ更新, { passive: true });
    window.addEventListener("orientationchange", () => setTimeout(横画面サイズ更新, 120), { passive: true });

    const 再生開始 = () => {
      replay?.setAttribute("hidden", "");
      try { video.currentTime = 0; } catch {}
      状態文(初期案内);
      video.play()?.catch(() => 状態文("中央の再生ボタンを押してください。", true));
    };
    const 開く = () => {
      横画面モード解除();
      app.音声解放?.();
      app.物語BGM停止?.();
      modal.classList.add("open");
      document.body.classList.add("teaser-open");
      try { video.currentTime = 0; } catch {}
      video.pause();
      replay?.setAttribute("hidden", "");
      状態文(初期案内);
    };
    const 閉じる = () => {
      横画面モード解除();
      video.pause();
      try { video.currentTime = 0; } catch {}
      modal.classList.remove("open");
      document.body.classList.remove("teaser-open");
      状態文(初期案内);
      if (document.querySelector(".screen.active")?.id === "story-screen") app.波音だけ再生?.();
    };

    open.addEventListener("click", 開く);
    close?.addEventListener("click", 閉じる);
    replay?.addEventListener("click", 再生開始);
    landscape?.addEventListener("click", 横画面全画面を試す);
    video.addEventListener("ended", () => { replay?.removeAttribute("hidden"); 状態文(""); });
    video.addEventListener("error", () => 状態文("動画を読み込めません。", true));
    modal.addEventListener("click", event => { if (event.target === modal) 閉じる(); });
    window.addEventListener("keydown", event => { if (event.key === "Escape" && modal.classList.contains("open")) 閉じる(); });
  };

  app.画面イベント登録 = function () {
    app.画像候補初期化();
    ゲーム標準操作抑止登録();
    document.body.classList.toggle("title-open", 現在画面ID() === "title-screen");

    app.要素("start-button")?.addEventListener("click", () => {
      app.音声解放?.();
      app.全BGM停止?.();
      app.画面表示("game-screen");
      if (!app.途中保存から再開?.()) app.ゲーム開始();
    });

    app.要素("manual-button")?.addEventListener("click", () => {
      app.全BGM停止?.();
      app.画面表示("manual-screen");
    });
    app.要素("toyama-button")?.addEventListener("click", () => {
      app.全BGM停止?.();
      app.画面表示("toyama-screen");
    });
    app.要素("story-button")?.addEventListener("click", () => {
      app.音声解放?.();
      app.全BGM停止?.();
      app.画面表示("story-screen");
      app.物語BGM開始?.();
    });

    document.querySelectorAll(".back-button").forEach(button => {
      button.addEventListener("click", () => {
        if (現在画面ID() === "game-screen") app.ゲーム安全停止?.();
        app.ボーナス確認閉じる?.();
        app.特の符確認閉じる?.();
        app.全BGM停止?.();
        app.画面表示("title-screen", false);
        app.途中保存案内更新?.();
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
    app.要素("ranking-about")?.addEventListener("click", () => app.ランキングページ設定?.(1));
    app.要素("ranking-prev")?.addEventListener("click", () => {
      const page = Number(app.状態.ランキングページ) || 0;
      app.ランキングページ設定?.(Math.max(0, page - 1));
    });
    app.要素("ranking-next")?.addEventListener("click", () => {
      const page = Number(app.状態.ランキングページ) || 0;
      if (page >= 5) app.ランキングページ設定?.(0);
      else app.ランキングページ設定?.(page + 1);
    });

    app.要素("bonus-confirm-yes")?.addEventListener("click", app.ボーナス確定);
    app.要素("bonus-confirm-no")?.addEventListener("click", app.ボーナス選び直し);
    app.要素("tokunofu-use")?.addEventListener("click", app.特の符を使う);
    app.要素("tokunofu-store")?.addEventListener("click", app.特の符をためる);
    document.querySelectorAll("[data-tokunofu]").forEach(button => {
      button.addEventListener("click", () => app.ためた特の符を選ぶ(button.dataset.tokunofu));
    });

    写真拡大登録();
    観光地名コピー登録();
    観光目次登録();
    続編予告登録();

    app.ゲーム画面寸法更新(true);
    window.addEventListener("resize", () => {
      if (現在画面ID() !== "game-screen" || app.状態.一時停止 || !app.状態.開始済み) app.ゲーム画面寸法更新(true);
      if (app.状態.ゲーム終了) requestAnimationFrame(() => app.ランキング操作位置更新?.());
    }, { passive: true });
    window.addEventListener("orientationchange", () => {
      app.ゲーム安全停止?.();
      setTimeout(() => app.ゲーム画面寸法更新(true), 250);
    }, { passive: true });

    document.addEventListener("visibilitychange", () => {
      if (document.hidden) app.ゲーム安全停止?.();
    });
    window.addEventListener("pagehide", () => app.ゲーム安全停止?.());
  };
})();
