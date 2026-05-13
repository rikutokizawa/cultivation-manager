# Cultivation Manager

研究室内ネットワーク向けの栽培管理・栽培データ収集システムです。

センサー値、手入力記録、画像記録をバックエンドで保存し、Next.js の画面でダッシュボード、常時モニター、設定、手入力、エクスポートを扱います。

## 現在できること

- FastAPI + SQLite によるデータ保存
- センサー記録の保存、一覧取得、期間指定取得
- 手入力記録の登録、一覧表示
- 画像記録の保存、アップロード、静的配信
- CSV エクスポート
- ダッシュボード表示
  - センサー別最新値
  - ラベル別最新平均
  - 時系列グラフ
  - カメラ画像
- 常時モニター表示
  - モニター1: ラベル別平均値 + グラフ
  - モニター2: グラフなしのラベル別最新平均
  - 1h / 6h / 24h / 7d の期間切替
- 設定画面
  - センサーの表示/非表示
  - 表示名
  - ラベル割り当て
  - 表示順
  - ラベルの追加/削除
  - ラベルごとの warning / critical 閾値
  - モニターグラフのY軸下限/上限
- 複数センサー取得 source
  - dummy
  - json
  - command
  - onewire
  - ondotori
- カメラ source
  - dummy
  - directory
  - rpi
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
SENSOR_INPUT_JSON_PATH=storage/runtime/sensor_readings.json
RUNTIME_TEXT_LOG_PATH=storage/runtime/runtime.log
SENSOR_RECORD_LOG_PATH=storage/runtime/sensor_records.jsonl
ONDOTORI_API_LOG_PATH=storage/runtime/ondotori_current.jsonl

SENSOR_SOURCE_TYPE=dummy
CAMERA_SOURCE_TYPE=dummy
SENSOR_POLL_INTERVAL_SECONDS=300
IMAGE_CAPTURE_INTERVAL_SECONDS=900
CAMERA_IDS_CSV=camera-01,camera-02
```

おんどとりを使う場合:

```text
SENSOR_SOURCE_TYPE=ondotori
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
NEXT_PUBLIC_BACKEND_BASE_URL=http://127.0.0.1:8000
```

別ポートで起動する場合:

```bash
pnpm dev -- --port 3001
```

## 画面

```text
Dashboard     http://localhost:3000/
Monitor       http://localhost:3000/monitor
Settings      http://localhost:3000/settings
Manual Input  http://localhost:3000/manual-input
Export        http://localhost:3000/export
```

### Dashboard

全体状況を見る画面です。

- 表示中センサーの最新値
- ラベル別最新平均
- センサー別最新値
- 時系列グラフ
- カメラ画像
- 接続状況

### Monitor

常時表示向けの画面です。

- モニター1
  - 左側にラベル別平均値
  - 右側にグラフ
  - 期間は `1h / 6h / 24h / 7d`
- モニター2
  - グラフなし
  - ラベルごとの最新平均カードを一覧表示

### Settings

運用上の表示設定を管理します。

- センサー設定
  - 表示/非表示
  - 表示名
  - ラベル割り当て
  - 表示順
- ラベル管理
  - ラベル追加/削除
  - 色
  - 表示順
  - warning / critical 閾値
- グラフ範囲
  - センサー種別ごとのY軸下限/上限
  - 空欄の場合は自動調整

warning / critical 閾値:

```text
warning_min   この値より低いと注意
warning_max   この値より高いと注意
critical_min  この値より低いと異常
critical_max  この値より高いと異常
```

不要な条件は空欄にできます。

## Backend スクリプト

### ダミーデータ投入

```bash
.venv/bin/python -m backend.scripts.seed_dummy_data --reset
```

### センサー収集を1回実行

```bash
.venv/bin/python -m backend.scripts.collect_sensor_data --source dummy
```

利用できる source:

```text
dummy
json
command
onewire
ondotori
```

カンマ区切りで併用できます。

```bash
.venv/bin/python -m backend.scripts.collect_sensor_data --source dummy,onewire
```

### センサー収集を継続実行

```bash
.venv/bin/python -m backend.scripts.collect_sensor_data --source ondotori --loop --interval 60
```

おんどとり現在値APIのレートリミットは 10回/120秒 です。開発中も短すぎる interval は避けてください。

### JSON source

`.env` の `SENSOR_INPUT_JSON_PATH` にある JSON を読みます。

```bash
.venv/bin/python -m backend.scripts.collect_sensor_data --source json
```

### command source

`SENSOR_COMMAND` の標準出力 JSON を読みます。

疎通確認用:

```bash
.venv/bin/python -m backend.scripts.emit_sample_sensor_json
```

### one-wire source

`DS18B20_DEVICE_GLOB` に一致する one-wire 温度センサーを読みます。

```bash
.venv/bin/python -m backend.scripts.collect_sensor_data --source onewire
```

### 画像取り込みを1回実行

```bash
.venv/bin/python -m backend.scripts.capture_images --source dummy
```

利用できる source:

```text
dummy
directory
rpi
```

`directory` は `INCOMING_IMAGE_PATH` 配下の画像を取り込みます。
`rpi` は `rpicam-still` または `libcamera-still` を使います。

### センサー収集と画像取り込みを定期実行

```bash
.venv/bin/python -m backend.scripts.run_runtime
```

### Raspberry Pi 実行前チェック

```bash
.venv/bin/python -m backend.scripts.check_runtime_environment
```

Pi 上で one-wire パス、カメラコマンド、必要ディレクトリなどを確認します。

## API

主なエンドポイント:

```text
GET  /health
GET  /latest-status
GET  /dashboard/summary

GET  /sensor-records
POST /sensor-records

GET  /sensor-settings
PUT  /sensor-settings/{sensor_key}

GET  /sensor-labels
POST /sensor-labels
PUT  /sensor-labels/{label_id}
DELETE /sensor-labels/{label_id}

GET  /sensor-chart-settings
PUT  /sensor-chart-settings/{sensor_type}

GET  /manual-records
POST /manual-records

GET  /image-records
POST /upload-image

GET  /export/sensor-records.csv
```

確認例:

```bash
curl http://127.0.0.1:8000/health
curl 'http://127.0.0.1:8000/sensor-records?limit=3'
curl 'http://127.0.0.1:8000/sensor-records?sensor_type=temperature&limit=20'
curl http://127.0.0.1:8000/sensor-settings
curl http://127.0.0.1:8000/sensor-labels
curl http://127.0.0.1:8000/sensor-chart-settings
curl http://127.0.0.1:8000/latest-status
```

画像アップロード例:

```bash
curl -X POST http://127.0.0.1:8000/upload-image \
  -F camera_id=camera-upload-01 \
  -F location=growth-chamber-upload \
  -F file=@storage/images/camera-01-latest.svg
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
- dummy / json / command / onewire / ondotori source
- dummy / directory / rpi camera source
- upload-image API
- CSV export
- systemd テンプレート

systemd テンプレート:

- [`deploy/systemd/cultivation-backend.service`](/Users/kizawarikuto/workspace/active/college/cultivation-manager/deploy/systemd/cultivation-backend.service)
- [`deploy/systemd/cultivation-runtime.service`](/Users/kizawarikuto/workspace/active/college/cultivation-manager/deploy/systemd/cultivation-runtime.service)

Pi 側で調整するもの:

- `.env` の保存先、ポート、interval、source種別
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
