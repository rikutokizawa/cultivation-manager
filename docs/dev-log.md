# Dev Log

## 2026-04-06

### 実施内容

- `backend/` の初期構成を追加
- FastAPI + SQLite + SQLAlchemy の最小 API を実装
- ダミーセンサデータとダミー画像の seed スクリプトを追加
- `uv` 前提の起動手順へ README を修正

### 実行確認

- 依存関係導入
  - `uv pip install --python .venv/bin/python -r backend/requirements.txt`
- ダミーデータ投入
  - `python -m backend.scripts.seed_dummy_data --reset`
- API import 確認
  - `python -c 'from backend.app.main import app; print(app.title)'`
- エンドポイント確認
  - `GET /health`
  - `GET /sensor-records?limit=3`
  - `GET /latest-status`

### 確認結果メモ

- `/health` は `{"status":"ok","app_name":"Cultivation Manager"}` を返した。
- `/sensor-records?limit=3` はダミー温度・湿度レコードを返した。
- `/latest-status` は最新温度 1 件とダミー画像 2 件を返した。
- ローカルポート bind はサンドボックス制限があるため、Codex からの確認では権限付き起動が必要だった。
