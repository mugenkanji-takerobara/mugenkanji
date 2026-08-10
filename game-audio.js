// KIBOUKANJI Ver.1.0.12 LOCAL TEST
// 通常BGM・特の符BGM・物語音・短い効果音
// パズルBGMはWeb Audio APIで前後を重ね、ループ境界の無音を防ぐ。
// 三味線は終盤を約3.6秒で自然にフェードし、静かな波音へ受け渡す。

(() => {
  "use strict";

  const app = window.KibouKanji = window.KibouKanji || {};
  const 音声版 = "1.0.12";
  const 波音開始音量 = 0.30;
  const 波音継続音量 = 0.70;
  const 波音上昇時間 = 3600;
  const 三味線基本音量 = 0.12;
  const 三味線フェード時間 = 3600;

  const BGM設定 = Object.freeze({
    通常: { src: "retropark.mp3", volume: 0.20, overlap: 0.72 },
    ボーナス: { src: "retroparty.mp3", volume: 0.22, overlap: 0.80 }
  });
  const 波音設定 = Object.freeze({
    src: "warayatakashi_calm_loop.wav",
    overlap: 2.00,
    fadeIn: 1.10
  });

  const 音声 = {
    BGM: {},
    効果音: {},
    現在BGM: null,
    利用者操作済み: false,
    物語再生中: false,
    波音上昇ID: 0,
    三味線フェードID: 0,
    web: {
      context: null,
      buffers: new Map(),
      loading: new Map(),
      nodes: new Set(),
      timer: 0,
      nextStart: 0,
      name: null,
      token: 0,
      available: false,
      recovering: false,
      wave: {
        buffer: null,
        loading: null,
        nodes: new Set(),
        timer: 0,
        nextStart: 0,
        token: 0,
        master: null,
        playing: false
      }
    }
  };

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
    audio.preload = 設定.preload || "auto";
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
    if (!audio || audio.dataset.notFound === "1" || !音声.利用者操作済み || document.hidden) return;
    if (先頭から) {
      try { audio.currentTime = 0; } catch {}
    }
    audio.muted = false;
    audio.play()?.catch(() => {});
  };

  const WebAudio初期化 = () => {
    if (音声.web.context) return 音声.web.context;
    const Context = window.AudioContext || window.webkitAudioContext;
    if (!Context) return null;
    try {
      音声.web.context = new Context();
      音声.web.available = true;
      return 音声.web.context;
    } catch {
      音声.web.available = false;
      return null;
    }
  };

  const 実音区間検出 = buffer => {
    const sampleRate = buffer.sampleRate;
    const threshold = 0.0012;
    const step = Math.max(1, Math.floor(sampleRate / 500));
    let first = 0;
    let last = buffer.length - 1;
    let found = false;

    for (let i = 0; i < buffer.length; i += step) {
      let peak = 0;
      for (let ch = 0; ch < buffer.numberOfChannels; ch++) {
        peak = Math.max(peak, Math.abs(buffer.getChannelData(ch)[i] || 0));
      }
      if (peak > threshold) {
        first = i;
        found = true;
        break;
      }
    }
    if (found) {
      for (let i = buffer.length - 1; i >= 0; i -= step) {
        let peak = 0;
        for (let ch = 0; ch < buffer.numberOfChannels; ch++) {
          peak = Math.max(peak, Math.abs(buffer.getChannelData(ch)[i] || 0));
        }
        if (peak > threshold) {
          last = i;
          break;
        }
      }
    }

    const pad = Math.floor(sampleRate * 0.025);
    first = Math.max(0, first - pad);
    last = Math.min(buffer.length - 1, last + pad);
    const start = first / sampleRate;
    const end = Math.max(start + 1, last / sampleRate);
    return { start, end, duration: end - start };
  };

  const BGM読込 = async name => {
    const cfg = BGM設定[name];
    const ctx = WebAudio初期化();
    if (!cfg || !ctx) throw new Error("Web Audio unavailable");
    if (音声.web.buffers.has(name)) return 音声.web.buffers.get(name);
    if (音声.web.loading.has(name)) return 音声.web.loading.get(name);

    const promise = fetch(版付き(cfg.src), { cache: "force-cache" })
      .then(response => {
        if (!response.ok) throw new Error(`BGM fetch failed: ${response.status}`);
        return response.arrayBuffer();
      })
      .then(data => ctx.decodeAudioData(data.slice(0)))
      .then(buffer => {
        const range = 実音区間検出(buffer);
        const item = { buffer, ...range };
        音声.web.buffers.set(name, item);
        音声.web.loading.delete(name);
        return item;
      })
      .catch(error => {
        音声.web.loading.delete(name);
        throw error;
      });

    音声.web.loading.set(name, promise);
    return promise;
  };

  const 波音読込 = async () => {
    const ctx = WebAudio初期化();
    if (!ctx) throw new Error("Web Audio unavailable");
    if (音声.web.wave.buffer) return 音声.web.wave.buffer;
    if (音声.web.wave.loading) return 音声.web.wave.loading;

    const promise = fetch(版付き(波音設定.src), { cache: "force-cache" })
      .then(response => {
        if (!response.ok) throw new Error(`Wave fetch failed: ${response.status}`);
        return response.arrayBuffer();
      })
      .then(data => ctx.decodeAudioData(data.slice(0)))
      .then(buffer => {
        音声.web.wave.buffer = buffer;
        音声.web.wave.loading = null;
        return buffer;
      })
      .catch(error => {
        音声.web.wave.loading = null;
        throw error;
      });
    音声.web.wave.loading = promise;
    return promise;
  };

  const Web波音停止 = () => {
    const wave = 音声.web.wave;
    wave.token++;
    if (wave.timer) clearInterval(wave.timer);
    wave.timer = 0;
    wave.nextStart = 0;
    wave.playing = false;
    wave.nodes.forEach(node => {
      try { node.source.stop(); } catch {}
      try { node.source.disconnect(); } catch {}
      try { node.gain.disconnect(); } catch {}
    });
    wave.nodes.clear();
    if (wave.master) {
      try { wave.master.disconnect(); } catch {}
      wave.master = null;
    }
  };

  const Web波音音量設定 = (volume, 秒 = 0.08) => {
    const ctx = 音声.web.context;
    const master = 音声.web.wave.master;
    if (!ctx || !master) return false;
    const target = Math.max(0, Math.min(1, Number(volume) || 0));
    try {
      master.gain.cancelScheduledValues(ctx.currentTime);
      master.gain.setValueAtTime(Math.max(0.0001, master.gain.value), ctx.currentTime);
      master.gain.linearRampToValueAtTime(Math.max(0.0001, target), ctx.currentTime + Math.max(0.01, 秒));
      return true;
    } catch {
      return false;
    }
  };

  const 波音一区間予約 = (buffer, startAt, first = false) => {
    const ctx = 音声.web.context;
    const wave = 音声.web.wave;
    if (!ctx || !wave.master) return;
    const duration = Math.max(2, buffer.duration);
    const overlap = Math.min(波音設定.overlap, Math.max(0.8, duration * 0.12));

    const source = ctx.createBufferSource();
    const gain = ctx.createGain();
    source.buffer = buffer;
    source.connect(gain);
    gain.connect(wave.master);

    const fadeIn = first ? Math.min(波音設定.fadeIn, overlap) : overlap;
    gain.gain.setValueAtTime(0.0001, startAt);
    gain.gain.linearRampToValueAtTime(1, startAt + fadeIn);
    const fadeStart = Math.max(startAt + fadeIn, startAt + duration - overlap);
    gain.gain.setValueAtTime(1, fadeStart);
    gain.gain.linearRampToValueAtTime(0.0001, startAt + duration);

    const node = { source, gain };
    wave.nodes.add(node);
    source.addEventListener("ended", () => {
      wave.nodes.delete(node);
      try { source.disconnect(); } catch {}
      try { gain.disconnect(); } catch {}
    });
    source.start(startAt, 0, duration);
  };

  const Web波音再生 = async (volume, 先頭から = true) => {
    const ctx = WebAudio初期化();
    if (!ctx || !音声.利用者操作済み || document.hidden) return false;
    try { await ctx.resume(); } catch {}
    if (ctx.state !== "running") return false;

    const wave = 音声.web.wave;
    if (!先頭から && wave.playing && wave.nodes.size > 0 && wave.master) {
      Web波音音量設定(volume, 0.18);
      return true;
    }

    const token = ++wave.token;
    const buffer = await 波音読込();
    if (token !== wave.token || document.hidden || !音声.物語再生中) return false;

    Web波音停止();
    wave.token = token;
    wave.master = ctx.createGain();
    wave.master.gain.setValueAtTime(Math.max(0.0001, volume), ctx.currentTime);
    wave.master.connect(ctx.destination);
    wave.playing = true;

    const duration = buffer.duration;
    const overlap = Math.min(波音設定.overlap, Math.max(0.8, duration * 0.12));
    const interval = Math.max(1, duration - overlap);
    const now = ctx.currentTime + 0.05;
    波音一区間予約(buffer, now, true);
    wave.nextStart = now + interval;

    const 先読み予約 = () => {
      if (!wave.playing || document.hidden || !音声.物語再生中 || !wave.master) return;
      const horizon = ctx.currentTime + 45;
      while (wave.nextStart < horizon) {
        波音一区間予約(buffer, wave.nextStart, false);
        wave.nextStart += interval;
      }
    };
    先読み予約();
    wave.timer = setInterval(先読み予約, 1200);
    return true;
  };

  const WebBGM停止 = () => {
    音声.web.token++;
    if (音声.web.timer) clearInterval(音声.web.timer);
    音声.web.timer = 0;
    音声.web.name = null;
    音声.web.nextStart = 0;
    音声.web.recovering = false;
    音声.web.nodes.forEach(node => {
      try { node.source.stop(); } catch {}
      try { node.source.disconnect(); } catch {}
      try { node.gain.disconnect(); } catch {}
    });
    音声.web.nodes.clear();
  };

  const 一区間予約 = (name, item, startAt, first = false) => {
    const ctx = 音声.web.context;
    const cfg = BGM設定[name];
    if (!ctx || !cfg) return false;

    const overlap = Math.min(cfg.overlap, Math.max(0.25, item.duration * 0.12));
    const source = ctx.createBufferSource();
    const gain = ctx.createGain();
    source.buffer = item.buffer;
    source.connect(gain);
    gain.connect(ctx.destination);

    const safeStart = Math.max(ctx.currentTime + 0.025, Number(startAt) || 0);
    const startGain = first ? cfg.volume : 0.0001;
    gain.gain.setValueAtTime(startGain, safeStart);
    if (!first) gain.gain.linearRampToValueAtTime(cfg.volume, safeStart + overlap);
    const fadeStart = Math.max(safeStart + overlap, safeStart + item.duration - overlap);
    gain.gain.setValueAtTime(cfg.volume, fadeStart);
    gain.gain.linearRampToValueAtTime(0.0001, safeStart + item.duration);

    const node = {
      source,
      gain,
      startAt: safeStart,
      endAt: safeStart + item.duration
    };
    音声.web.nodes.add(node);
    source.addEventListener("ended", () => {
      音声.web.nodes.delete(node);
      try { source.disconnect(); } catch {}
      try { gain.disconnect(); } catch {}
    });
    try {
      source.start(safeStart, item.start, item.duration);
      return true;
    } catch {
      音声.web.nodes.delete(node);
      try { source.disconnect(); } catch {}
      try { gain.disconnect(); } catch {}
      return false;
    }
  };

  const WebBGM再生 = async (name, 先頭から = false) => {
    const ctx = WebAudio初期化();
    if (!ctx || !音声.利用者操作済み || document.hidden) return false;
    try { await ctx.resume(); } catch {}
    if (ctx.state !== "running") return false;

    if (!先頭から && 音声.web.name === name && 音声.web.nodes.size > 0) return true;
    const token = ++音声.web.token;
    const item = await BGM読込(name);
    if (token !== 音声.web.token || document.hidden || 音声.現在BGM !== name) return false;

    WebBGM停止();
    音声.web.token = token;
    音声.web.name = name;
    const cfg = BGM設定[name];
    const interval = item.duration - Math.min(cfg.overlap, Math.max(0.25, item.duration * 0.12));
    const now = ctx.currentTime + 0.045;
    一区間予約(name, item, now, true);
    音声.web.nextStart = now + interval;

    const 先読み予約 = () => {
      if (音声.web.name !== name || document.hidden || 音声.現在BGM !== name) return;
      const now = ctx.currentTime;
      const coverage = [...音声.web.nodes].some(node =>
        node.startAt <= now + 0.18 && node.endAt > now + 0.08
      );

      // Safariでタイマーが一時的に遅れて nextStart が過去へ落ちた時は、
      // 過去時刻への予約を繰り返さず、今から滑らかに再同期する。
      if (!Number.isFinite(音声.web.nextStart) || 音声.web.nextStart < now + 0.05) {
        音声.web.nextStart = now + 0.055;
      }

      // 現在時刻を覆うノードが無い場合は、将来予約を捨てて即時復旧する。
      if (!coverage) {
        音声.web.nodes.forEach(node => {
          try { node.source.stop(); } catch {}
          try { node.source.disconnect(); } catch {}
          try { node.gain.disconnect(); } catch {}
        });
        音声.web.nodes.clear();
        音声.web.nextStart = now + 0.055;
        一区間予約(name, item, 音声.web.nextStart, true);
        音声.web.nextStart += interval;
      }

      const horizon = now + 35;
      let guard = 0;
      while (音声.web.nextStart < horizon && guard++ < 8) {
        一区間予約(name, item, 音声.web.nextStart, false);
        音声.web.nextStart += interval;
      }
    };
    先読み予約();
    音声.web.timer = setInterval(先読み予約, 850);
    return true;
  };

  const 波音上昇停止 = () => {
    if (音声.波音上昇ID) cancelAnimationFrame(音声.波音上昇ID);
    音声.波音上昇ID = 0;
  };

  const 波音音量反映 = (volume, 秒 = 0.06) => {
    const wave = 音声.BGM.波音;
    if (wave) wave.volume = Math.max(0, Math.min(1, volume));
    Web波音音量設定(volume, 秒);
  };

  const 波音をゆっくり前へ = () => {
    if (!音声.物語再生中 || document.hidden) return;
    波音上昇停止();
    const 開始時刻 = performance.now();
    const 開始音量 = 波音開始音量;

    const 更新 = now => {
      if (!音声.物語再生中 || document.hidden) {
        音声.波音上昇ID = 0;
        return;
      }
      const 進行 = Math.max(0, Math.min(1, (now - 開始時刻) / 波音上昇時間));
      const volume = 開始音量 + (波音継続音量 - 開始音量) * 進行;
      波音音量反映(volume, 0.04);
      if (進行 < 1) 音声.波音上昇ID = requestAnimationFrame(更新);
      else 音声.波音上昇ID = 0;
    };
    音声.波音上昇ID = requestAnimationFrame(更新);
  };

  const 三味線フェード停止 = () => {
    if (音声.三味線フェードID) cancelAnimationFrame(音声.三味線フェードID);
    音声.三味線フェードID = 0;
  };

  const 三味線から波へ = () => {
    const shamisen = 音声.BGM.三味線;
    const wave = 音声.BGM.波音;
    if (!shamisen || !wave) return;
    三味線フェード停止();

    const 更新 = () => {
      if (!音声.物語再生中 || document.hidden || shamisen.paused) {
        音声.三味線フェードID = 0;
        return;
      }
      const duration = Number.isFinite(shamisen.duration) && shamisen.duration > 1 ? shamisen.duration : 12.04;
      const fadeSeconds = 三味線フェード時間 / 1000;
      const startAt = Math.max(0, duration - fadeSeconds);
      const progress = Math.max(0, Math.min(1, (shamisen.currentTime - startAt) / fadeSeconds));
      if (progress > 0) {
        const smooth = progress * progress * (3 - 2 * progress);
        shamisen.volume = Math.max(0, 三味線基本音量 * (1 - smooth));
        波音音量反映(波音開始音量 + (波音継続音量 - 波音開始音量) * smooth, 0.04);
      }
      音声.三味線フェードID = requestAnimationFrame(更新);
    };
    音声.三味線フェードID = requestAnimationFrame(更新);
  };

  const 物語状態解除 = () => {
    音声.物語再生中 = false;
    三味線フェード停止();
    波音上昇停止();
    停止(音声.BGM.三味線, true);
    停止(音声.BGM.波音, false);
    Web波音停止();
  };

  const BGM切替 = (名前, 先頭から = false) => {
    if (!名前 || !BGM設定[名前]) return;
    物語状態解除();
    const webPlaying = 音声.web.name === 名前 && 音声.web.nodes.size > 0;
    Object.entries(音声.BGM).forEach(([key, track]) => {
      if (key !== 名前) 停止(track, false);
    });

    if (音声.現在BGM !== 名前) 先頭から = true;
    音声.現在BGM = 名前;
    const fallback = 音声.BGM[名前];
    if (!webPlaying && fallback) 再生(fallback, 先頭から);

    WebBGM再生(名前, 先頭から).then(ok => {
      if (音声.現在BGM !== 名前 || document.hidden) return;
      if (ok && fallback) 停止(fallback, false);
    }).catch(() => {
      if (音声.現在BGM !== 名前 || document.hidden) return;
      if (fallback?.paused) 再生(fallback, 先頭から);
    });
  };

  const 効果音プール作成 = (候補, volume) => {
    return Array.from({ length: 3 }, () => 音声作成(候補, { volume, loop: false }));
  };

  const 効果音再生 = (名前, 再生速度 = 1) => {
    if (!音声.利用者操作済み || document.hidden) return;
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
    音声.BGM.通常 = 音声作成(["retropark.mp3"], { loop: true, volume: .20 });
    音声.BGM.ボーナス = 音声作成(["retroparty.mp3"], { loop: true, volume: .22 });
    音声.BGM.波音 = 音声作成(["warayatakashi_calm_loop.wav", "warayatakashi_calm.m4a", "warayatakashi_soft.mp3", "warayatakashi.mp3"], { loop: true, volume: 波音開始音量 });
    音声.BGM.三味線 = 音声作成(["shamisen_intro.mp3"], { loop: false, volume: 三味線基本音量 });

    const ctx = WebAudio初期化();
    ctx?.addEventListener?.("statechange", () => {
      if (ctx.state === "running" || document.hidden) return;
      const name = 音声.現在BGM;
      if ((name === "通常" || name === "ボーナス") && document.body.classList.contains("game-open") && !app.状態?.一時停止) {
        const fallback = 音声.BGM[name];
        if (fallback?.paused) 再生(fallback, false);
      }
    });

    音声.BGM.三味線.addEventListener("ended", () => {
      if (!音声.物語再生中) return;
      三味線フェード停止();
      音声.BGM.三味線.volume = 三味線基本音量;
      波音音量反映(波音継続音量, 0.18);
    });

    音声.効果音.match = 効果音プール作成(["se_match.mp3"], .42);
    音声.効果音.drop = 効果音プール作成(["se_drop.mp3"], .34);
    音声.効果音.bonus = 効果音プール作成(["se_bonus.mp3"], .48);
    音声.効果音.scene = 効果音プール作成(["se_scene.mp3"], .18);
    音声.効果音.store = 効果音プール作成(["se_store.mp3"], .38);

    document.addEventListener("visibilitychange", () => {
      if (document.hidden) app.全BGM停止?.();
    });
    window.addEventListener("pagehide", () => app.全BGM停止?.());
  };

  app.音声解放 = function () {
    音声.利用者操作済み = true;
    const ctx = WebAudio初期化();
    if (ctx?.state === "suspended" || ctx?.state === "interrupted") ctx.resume().catch(() => {});
    Object.keys(BGM設定).forEach(name => BGM読込(name).catch(() => {}));
    波音読込().catch(() => {});
  };

  app.BGM健全性確認 = function () {
    const name = 音声.現在BGM;
    if (
      (name !== "通常" && name !== "ボーナス") ||
      !音声.利用者操作済み ||
      document.hidden ||
      !document.body.classList.contains("game-open") ||
      app.状態?.一時停止 ||
      app.状態?.ゲーム終了
    ) return;

    const fallback = 音声.BGM[name];
    const ctx = 音声.web.context;
    if (!ctx || ctx.state !== "running") {
      if (fallback?.paused) 再生(fallback, false);
      return;
    }

    const now = ctx.currentTime;
    const coverage = [...音声.web.nodes].some(node =>
      node.startAt <= now + 0.20 && node.endAt > now + 0.08
    );
    if (coverage) {
      if (fallback && !fallback.paused) 停止(fallback, false);
      return;
    }

    if (音声.web.recovering) return;
    音声.web.recovering = true;

    // Safariで長時間再生後にWeb Audioの予約列が途切れた場合、
    // 効果音だけ残る無音状態を避けるためHTMLAudioを即時フォールバックし、
    // 同時にWeb Audioの予約列を再構築する。
    if (fallback?.paused) 再生(fallback, false);
    WebBGM再生(name, true).then(ok => {
      if (ok && 音声.現在BGM === name && !document.hidden && fallback) {
        setTimeout(() => {
          if (音声.現在BGM === name && 音声.web.nodes.size > 0) 停止(fallback, false);
        }, 180);
      }
    }).catch(() => {}).finally(() => {
      音声.web.recovering = false;
    });
  };

  // Safariでは一時停止後、Web Audioだけが復帰せず効果音だけ残る場合がある。
  // 再開ボタンのユーザー操作中にHTMLAudioを即時再生し、Web Audioはその後に再構築する。
  app.BGMユーザー操作で再開 = function (name = "通常") {
    if (!BGM設定[name] || document.hidden) return;
    音声.利用者操作済み = true;
    物語状態解除();
    音声.現在BGM = name;
    WebBGM停止();

    Object.entries(音声.BGM).forEach(([key, track]) => {
      if (key !== name) 停止(track, false);
    });

    const fallback = 音声.BGM[name];
    const ctx = WebAudio初期化();
    if (ctx && (ctx.state === "suspended" || ctx.state === "interrupted")) {
      try { ctx.resume()?.catch?.(() => {}); } catch {}
    }

    // ここはボタンのclickスタック内。Safariのユーザー操作権限を失う前に再生する。
    if (fallback) {
      fallback.muted = false;
      try { fallback.play()?.catch?.(() => {}); } catch {}
    }

    setTimeout(() => {
      if (document.hidden || app.状態?.一時停止 || app.状態?.ゲーム終了 || 音声.現在BGM !== name) return;
      WebBGM再生(name, true).then(ok => {
        if (!ok || 音声.現在BGM !== name || document.hidden || !fallback) return;
        setTimeout(() => {
          if (音声.現在BGM === name && 音声.web.nodes.size > 0 && !app.状態?.一時停止) {
            停止(fallback, false);
          }
        }, 260);
      }).catch(() => {});
    }, 120);
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
    app.全BGM停止?.();
    音声.物語再生中 = true;
    const wave = 音声.BGM.波音;
    const shamisen = 音声.BGM.三味線;
    if (wave) wave.volume = 波音開始音量;
    if (shamisen) shamisen.volume = 三味線基本音量;
    音声.現在BGM = "波音";

    // 三味線は利用者操作直後に開始。波はWeb Audioのクロスフェードを優先し、
    // 失敗した環境だけHTMLAudioの静音版へフォールバックする。
    再生(shamisen, true);
    Web波音再生(波音開始音量, true).then(ok => {
      if (!ok && 音声.物語再生中 && !document.hidden) 再生(wave, true);
    }).catch(() => {
      if (音声.物語再生中 && !document.hidden) 再生(wave, true);
    });
    三味線から波へ();
  };

  app.波音だけ再生 = function () {
    app.全BGM停止?.();
    音声.物語再生中 = true;
    const wave = 音声.BGM.波音;
    if (wave) wave.volume = 波音継続音量;
    音声.現在BGM = "波音";
    Web波音再生(波音継続音量, true).then(ok => {
      if (!ok && 音声.物語再生中 && !document.hidden) 再生(wave, true);
    }).catch(() => {
      if (音声.物語再生中 && !document.hidden) 再生(wave, true);
    });
  };

  app.物語BGM停止 = function () {
    物語状態解除();
    停止(音声.BGM.波音, true);
    if (音声.BGM.三味線) 音声.BGM.三味線.volume = 三味線基本音量;
    音声.現在BGM = null;
  };

  app.全BGM停止 = function () {
    音声.物語再生中 = false;
    波音上昇停止();
    WebBGM停止();
    Web波音停止();
    Object.values(音声.BGM).forEach(track => 停止(track, false));
    音声.現在BGM = null;
  };

  app.音声試験値 = Object.freeze({
    三味線音量: 三味線基本音量,
    三味線フェード秒: 三味線フェード時間 / 1000,
    三味線長さ秒: 12.04,
    波音音源秒: 17.70,
    三味線中の波音: 波音開始音量,
    三味線終了後の波音: 波音継続音量,
    波音上昇秒: 波音上昇時間 / 1000,
    通常BGM交差秒: BGM設定.通常.overlap,
    ボーナスBGM交差秒: BGM設定.ボーナス.overlap
  });
})();
