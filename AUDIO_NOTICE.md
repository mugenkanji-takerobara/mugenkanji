# AUDIO NOTICE

Team Shiob 制作記録として保管する音声。

- `retropark.mp3` — 通常パズルBGM
- `retroparty.mp3` — 特の符BGM
- `shamisen_intro.mp3` — 雨晴海岸伝説 三味線イントロ
- `warayatakashi_calm_loop.wav` — 雨晴海岸伝説 静音・クリック抑制PCM版（優先）
- `warayatakashi_calm.m4a` — 静音版フォールバック
- `warayatakashi_soft.mp3` — 波音フォールバック
- `warayatakashi.mp3` — 元波音（最終フォールバック）
- `se_*.mp3` — 効果音

## 雨晴海岸伝説の公開版設計

- 三味線音源は約12秒。基本再生ゲイン0.12、終盤約3.6秒を自然にフェードアウト。
- 優先波音 `warayatakashi_calm_loop.wav` は音源側を約+11dB調整済み。
- 波音再生ゲインは三味線中0.30。三味線終盤約3.6秒に合わせて0.70まで徐々に上げ、その後0.70を維持。
- 優先波音は先頭・末尾をフェード処理したPCM WAV。
- Web Audioで約2.0秒クロスフェードし、ループ境界のクリック音を抑える。
- 低域の荒い「ゴゴゴ」感を抑えるEQを適用。
- HTMLAudioはWeb Audioが利用できない環境のフォールバック。
- iPhone / PC実機で、音量、荒々しさ、ブツッ音、ループ境目、三味線終端を確認済み。
