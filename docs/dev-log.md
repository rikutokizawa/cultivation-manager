# Dev Log

## 2026-04-06

### 実施内容

- `backend/` の初期構成を追加
- FastAPI + SQLite + SQLAlchemy の最小 API を実装
- ダミーセンサデータとダミー画像の seed スクリプトを追加
- `uv` 前提の起動手順へ README を修正
- `frontend/` に Next.js + TypeScript + Tailwind CSS + Recharts の初期画面を追加
- dashboard / manual input / export の 3 画面を実装

### 実行確認

- 依存関係導入
  - `uv pip install --python .venv/bin/python -r backend/requirements.txt`
  - `pnpm install`
- ダミーデータ投入
  - `python -m backend.scripts.seed_dummy_data --reset`
- API import 確認
  - `python -c 'from backend.app.main import app; print(app.title)'`
- エンドポイント確認
  - `GET /health`
  - `GET /sensor-records?limit=3`
  - `GET /latest-status`
  - `POST /manual-records`
  - `GET /export/sensor-records.csv?sensor_type=temperature`
  - `GET /`
  - `GET /manual-input`
  - `GET /export`

### 確認結果メモ

- `/health` は `{"status":"ok","app_name":"Cultivation Manager"}` を返した。
- `/sensor-records?limit=3` はダミー温度・湿度レコードを返した。
- `/latest-status` は最新温度 1 件とダミー画像 2 件を返した。
- `/manual-records` への POST でテストレコードが追加できた。
- `/export/sensor-records.csv` は temperature の CSV を返した。
- frontend の `/`, `/manual-input`, `/export` は HTML 応答を返した。
- ローカルポート bind はサンドボックス制限があるため、Codex からの確認では権限付き起動が必要だった。

## 2026-04-07

### 実施内容

- `uv` が別環境へ install する場合の回避手順を README に追記
- `frontend` のポート競合時の確認手順を README に追記
- トラブルシュート文書を追加
- dashboard のファーストビューを 1 画面集約レイアウトへ再設計
- `humidity`, `co2`, `tank_level` のダミー時系列を追加
- `latest-status` を温度、湿度、CO2、水位、接続状況、画像 2 枚を返す形に拡張
- dashboard 上部の説明ブロックと `Local Mode` カードを削除
- Figma 案を基準に dashboard をダーク基調の監視盤 UI へ更新
- ナビ、カード、画像パネル、時系列セクションを Figma の情報設計へ寄せた

### 実行確認

- `next build`
- `.venv/bin/python -c 'import fastapi, sqlalchemy'`
- `.venv/bin/python -m backend.scripts.seed_dummy_data --reset`
- Figma ノード `71:10` のデザインとスクリーンショット取得

### 確認結果メモ

- frontend build は成功
- backend import は成功
- seed 再投入により新しいダミーセンサ種別が入る状態に更新
