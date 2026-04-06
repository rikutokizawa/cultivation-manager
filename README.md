# Cultivation Manager

研究室内ネットワーク向けの栽培管理・栽培データ収集システムです。

現在の実装範囲:

- FastAPI バックエンド
- SQLite 永続化
- センサ記録・手入力記録・画像記録の初期モデル
- ダミーデータ投入スクリプト
- CSV エクスポート API

## Backend 起動

```bash
uv venv
source .venv/bin/activate
uv pip install -r backend/requirements.txt
python -m backend.scripts.seed_dummy_data --reset
uv run uvicorn backend.app.main:app --reload
```

`mise` を使っていてこのディレクトリが未 trust の場合は、最初に一度 `mise trust` を実行してください。

## Frontend 起動

```bash
cd frontend
/Users/kizawarikuto/.local/share/mise/installs/pnpm/10.22.0/pnpm install
/Users/kizawarikuto/.local/share/mise/installs/pnpm/10.22.0/pnpm dev
```

`.env.local` を使う場合は、`frontend/.env.local.example` を元に `NEXT_PUBLIC_BACKEND_BASE_URL` を設定してください。

## 確認先

- API ドキュメント: `http://localhost:8000/docs`
- Health Check: `http://localhost:8000/health`
- 最新状態 API: `http://localhost:8000/latest-status`
- Frontend Dashboard: `http://localhost:3000`
- Frontend Manual Input: `http://localhost:3000/manual-input`
- Frontend Export: `http://localhost:3000/export`

## 動作確認コマンド

```bash
curl http://127.0.0.1:8000/health
curl 'http://127.0.0.1:8000/sensor-records?limit=3'
curl http://127.0.0.1:8000/latest-status
curl http://127.0.0.1:3000/
```

## Raspberry Pi 移行時に差し替える箇所

- `.env` の `DATABASE_URL`
- `.env` の `IMAGE_STORAGE_PATH`
- `.env` の `EXPORT_STORAGE_PATH`
- `backend/app/services/seed_data.py` のダミーデータ生成部分
- 将来の実機連携コード追加先: `backend/app/services/` と `backend/scripts/`

## Docs

- 仕様と決定事項は [`docs/decisions.md`](/Users/kizawarikuto/workspace/active/college/cultivation-manager/docs/decisions.md)
- 現在の実装メモは [`docs/v0.1-backend-bootstrap.md`](/Users/kizawarikuto/workspace/active/college/cultivation-manager/docs/v0.1-backend-bootstrap.md)
- frontend 実装メモは [`docs/v0.1-frontend-dashboard.md`](/Users/kizawarikuto/workspace/active/college/cultivation-manager/docs/v0.1-frontend-dashboard.md)
- 実行確認ログは [`docs/dev-log.md`](/Users/kizawarikuto/workspace/active/college/cultivation-manager/docs/dev-log.md)
