# Cultivation Manager

研究室内ネットワーク向けの栽培管理・栽培データ収集システムです。

センサー値と画像記録をバックエンドで保存し、1画面のDashboardで現在値、画像、推移、TRZ取込、CSV出力を扱います。

## 現在できること

- FastAPI + SQLite によるデータ保存
- センサー記録の保存、一覧取得、期間指定取得
- 画像記録の保存、静的配信
- CSV エクスポート
- 1画面Dashboard
  - おんどとり機器別の最新値一覧
  - USBカメラ2台分の最新画像枠
  - 選択した機器・項目の時系列グラフ
  - 6h / 24h / 7d の期間切替
  - TRZファイル取込
  - CSV出力ダイアログ
  - 全画面表示
- おんどとり現在値APIからのセンサー取得
- おんどとりTRZ履歴データの取り込み
- カメラ source
  - dummy
  - directory
  - rpi
  - usb
- 定期実行ランナー
- runtime / センサー保存 / おんどとりAPIレスポンスのログ出力

## ディレクトリ構成

```text
backend/
  app/
    api/routes/        FastAPI routes
    core/              settings
    db/                SQLAlchemy session / metadata
    models/            DB models
    schemas/           Pydantic schemas
    services/          source adapters, persistence helpers, logging
  scripts/             収集・撮影・seed・環境確認スクリプト

frontend/
  app/                 Next.js App Router pages
  components/          画面コンポーネント
  lib/                 API client, datetime, sensor helpers
  types/               API types

deploy/systemd/        Raspberry Pi / Linux 常駐用 service 例
docs/                  設計メモ、実装メモ、ログ
storage/               SQLite DB、画像、runtimeログなど
```

## 初期設定

```bash
cp .env.example .env
```

必要に応じて `.env` を編集します。

主な環境変数:

```text
DATABASE_URL=sqlite:///./storage/cultivation.db
IMAGE_STORAGE_PATH=storage/images
EXPORT_STORAGE_PATH=storage/exports
INCOMING_IMAGE_PATH=storage/incoming
RUNTIME_TEXT_LOG_PATH=storage/runtime/runtime.log
SENSOR_RECORD_LOG_PATH=storage/runtime/sensor_records.jsonl
ONDOTORI_API_LOG_PATH=storage/runtime/ondotori_current.jsonl

BACKEND_BASE_URL=http://localhost:8000
FRONTEND_ALLOWED_ORIGINS=
CAMERA_SOURCE_TYPE=dummy
USB_CAMERA_COMMAND=ffmpeg
USB_CAMERA_DEVICES_CSV=
USB_CAMERA_INPUT_FORMAT=mjpeg
SENSOR_POLL_INTERVAL_SECONDS=300
IMAGE_CAPTURE_INTERVAL_SECONDS=900
CAMERA_IDS_CSV=camera-01,camera-02
```

おんどとり接続設定:

```text
ONDOTORI_API_KEY=
ONDOTORI_LOGIN_ID=
ONDOTORI_LOGIN_PASS=
ONDOTORI_API_URL=https://api.webstorage.jp:443/v1/devices/current
ONDOTORI_REMOTE_SERIALS_CSV=
ONDOTORI_BASE_SERIALS_CSV=
ONDOTORI_TIMEOUT_SECONDS=30
```

`ONDOTORI_LOGIN_ID` は API 仕様上の `login-id` です。WebStorage の利用者IDまたは参照専用IDを設定します。

## 毎回の起動

別々のターミナルで3つ起動します。

### 1. Backend API

```bash
.venv/bin/python -m uvicorn backend.app.main:app --reload
```

### 2. Frontend

```bash
cd frontend
pnpm dev
```

### 3. Runtime

```bash
.venv/bin/python -m backend.scripts.run_runtime
```

### おんどとりTRZデータ取り込み

Dashboardの「TRZ取込」から、ダウンロードした `.trz` を直接選択できます。複数ファイルの一括選択にも対応し、既に保存済みの測定値は重複登録しません。

コマンドで取り込む場合は、`.trz` を取り込み待ちフォルダへ置いてから実行します。

```bash
cp /path/to/*.trz storage/ondotori_imports/
.venv/bin/python -m backend.scripts.import_ondotori_trz
```

成功した `.trz` は取り込み後に削除されます。

## Backend 起動

```bash
mise trust
uv venv
source .venv/bin/activate
uv pip install --python .venv/bin/python -r backend/requirements.txt
.venv/bin/python -m backend.scripts.seed_dummy_data --reset
.venv/bin/python -m uvicorn backend.app.main:app --reload
```

`uv pip install -r ...` だけだと別の仮想環境へ入ることがあるため、このリポジトリでは `--python .venv/bin/python` を付けてインストール先を固定します。

API ドキュメント:

```text
http://127.0.0.1:8000/docs
```

## Frontend 起動

```bash
cd frontend
pnpm install
pnpm dev
```

標準では `http://localhost:3000` で起動します。

`.env.local` を使う場合:

```bash
cp frontend/.env.local.example frontend/.env.local
```

```text
BACKEND_INTERNAL_URL=http://127.0.0.1:8000
```

ブラウザからのAPI通信は同一ホストの `/api` を経由し、Next.jsがPi内部のBackendへ中継します。そのため、PiのIPアドレスが変わっても `.env.local` の変更やFrontendの再ビルドは不要です。別端末からは、その時点のPiのIPを使って `http://<PiのIP>:3000` を開きます。

別ポートで起動する場合:

```bash
pnpm dev -- --port 3001
```

本番相当で起動する場合:

```bash
pnpm build
pnpm start
```

## 画面

```text
Dashboard  http://localhost:3000/
```

### Dashboard

全体状況を見る画面です。

- おんどとり機器別の現在値
- カメラ1・カメラ2の最新画像
- 選択した1項目の時系列グラフ
- 最終取得時刻と更新状態
- TRZ取込、CSV出力、全画面表示

## Backend スクリプト

### ダミーデータ投入

```bash
.venv/bin/python -m backend.scripts.seed_dummy_data --reset
```

### センサー収集を1回実行

```bash
.venv/bin/python -m backend.scripts.collect_sensor_data
```

### センサー収集を継続実行

```bash
.venv/bin/python -m backend.scripts.collect_sensor_data --loop --interval 60
```

おんどとり現在値APIのレートリミットは 10回/120秒 です。開発中も短すぎる interval は避けてください。

通常取得はおんどとり現在値APIに固定されています。取得できなかった期間の履歴は、ダウンロードしたTRZファイルを `backend.scripts.import_ondotori_trz` で取り込みます。

### 画像取り込みを1回実行

```bash
.venv/bin/python -m backend.scripts.capture_images --source dummy
```

利用できる source:

```text
dummy
directory
rpi
usb
```

`directory` は `INCOMING_IMAGE_PATH` 配下の画像を取り込みます。
`rpi` は `rpicam-still` または `libcamera-still` を使います。
`usb` は `ffmpeg` とV4L2を使って、`USB_CAMERA_DEVICES_CSV` に指定したUSBカメラから静止画を撮影します。`CAMERA_IDS_CSV` と同じ順序・同じ台数で指定してください。同型カメラを複数使う場合は、再起動後もUSBポートごとに安定する `/dev/v4l/by-path/...-video-index0` を推奨します。

### センサー収集と画像取り込みを定期実行

```bash
.venv/bin/python -m backend.scripts.run_runtime
```

### Raspberry Pi 実行前チェック

```bash
.venv/bin/python -m backend.scripts.check_runtime_environment
```

Pi 上でカメラコマンドや必要ディレクトリなどを確認します。

## API

主なエンドポイント:

```text
GET  /health
GET  /overview
GET  /sensor-records
POST /import-trz
GET  /image-records
GET  /export/sensor-records.csv
```

確認例:

```bash
curl http://127.0.0.1:8000/health
curl http://127.0.0.1:8000/overview
curl 'http://127.0.0.1:8000/sensor-records?limit=3'
curl 'http://127.0.0.1:8000/sensor-records?sensor_type=temperature&limit=20'
```

## ログ

runtime 実行時には以下へログを出します。

```text
storage/runtime/runtime.log
storage/runtime/sensor_records.jsonl
storage/runtime/ondotori_current.jsonl
```

### runtime.log

通常ログです。

```text
stored 18 sensor records
sensor detail log: ...
ondotori api log: ...
```

### sensor_records.jsonl

DBへ保存したセンサー値を1行JSONで記録します。

主なフィールド:

```text
saved_at       UTCの保存時刻
saved_at_jst   JSTの保存時刻
record_id
measurement_timestamp
sensor_type
sensor_id
location
value
unit
source
note
```

### ondotori_current.jsonl

おんどとりAPIレスポンスの概要を1行JSONで記録します。

主なフィールド:

```text
requested_at_jst
responded_at_jst
duration_ms
status_code
device_count
reading_count
skipped_channel_count
devices[].raw_unixtime
devices[].measurement_timestamp_jst
devices[].channels
```

確認例:

```bash
tail -f storage/runtime/runtime.log
tail -f storage/runtime/sensor_records.jsonl
tail -f storage/runtime/ondotori_current.jsonl
```

## 動作確認

Backend:

```bash
python -m compileall backend
```

Frontend:

```bash
cd frontend
pnpm build
```

整形・差分チェック:

```bash
git diff --check
```

## Raspberry Pi / 常駐運用

Pi へ持っていく時点で揃っているもの:

- backend API
- SQLite 保存
- 定期センサー収集
- 定期画像取り込み
- おんどとり現在値APIからの定期取得
- おんどとりTRZ履歴データの取り込み
- dummy / directory / rpi / usb camera source
- カメラ2台分の最新画像表示
- CSV export
- systemd テンプレート

systemd テンプレート:

- [`deploy/systemd/cultivation-backend.service`](/Users/kizawarikuto/workspace/active/college/cultivation-manager/deploy/systemd/cultivation-backend.service)
- [`deploy/systemd/cultivation-runtime.service`](/Users/kizawarikuto/workspace/active/college/cultivation-manager/deploy/systemd/cultivation-runtime.service)

Pi 側で調整するもの:

- `.env` の保存先、ポート、取得間隔、カメラ設定
- 実センサーの接続・読み取り設定
- 実カメラの接続・撮影設定
- systemd の `WorkingDirectory` / `EnvironmentFile` / 実行ユーザー

## Docs

- 仕様と決定事項: [`docs/decisions.md`](/Users/kizawarikuto/workspace/active/college/cultivation-manager/docs/decisions.md)
- backend bootstrap: [`docs/v0.1-backend-bootstrap.md`](/Users/kizawarikuto/workspace/active/college/cultivation-manager/docs/v0.1-backend-bootstrap.md)
- frontend dashboard: [`docs/v0.1-frontend-dashboard.md`](/Users/kizawarikuto/workspace/active/college/cultivation-manager/docs/v0.1-frontend-dashboard.md)
- runtime programs: [`docs/v0.2-runtime-programs.md`](/Users/kizawarikuto/workspace/active/college/cultivation-manager/docs/v0.2-runtime-programs.md)
- troubleshooting: [`docs/troubleshooting.md`](/Users/kizawarikuto/workspace/active/college/cultivation-manager/docs/troubleshooting.md)
- dev log: [`docs/dev-log.md`](/Users/kizawarikuto/workspace/active/college/cultivation-manager/docs/dev-log.md)
