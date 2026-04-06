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
