# Cultivation Manager

研究室内ネットワーク向けの栽培管理・栽培データ収集システムです。

現在の実装範囲:

- FastAPI バックエンド
- SQLite 永続化
- センサ記録・手入力記録・画像記録の初期モデル
- ダミーデータ投入スクリプト
- センサ収集スクリプト
- 画像取り込み / 撮影スクリプト
- 定期実行ランナー
- CSV エクスポート API
- 画像アップロード API
- dashboard summary API
- センサー表示設定 API

## 初期設定

```bash
cp .env.example .env
```

## Backend 起動

```bash
mise trust
uv venv
source .venv/bin/activate
uv pip install --python .venv/bin/python -r backend/requirements.txt
python -m backend.scripts.seed_dummy_data --reset
.venv/bin/python -m uvicorn backend.app.main:app --reload
```

`uv pip install -r ...` だけだと別の仮想環境へ入ることがあるため、このリポジトリでは `--python .venv/bin/python` を付けてインストール先を固定します。

## Backend 実行プログラム

### 1. ダミーデータ初期投入

```bash
python -m backend.scripts.seed_dummy_data --reset
```

### 2. センサ収集を 1 回実行

```bash
python -m backend.scripts.collect_sensor_data --source dummy
```

利用できる source:

- `dummy`
- `json`
- `command`
- `onewire`
- `ondotori`
- カンマ区切りで併用可
  - 例: `dummy,onewire`

補足:

- `SENSOR_SOURCE_TYPE=json` にすると、`SENSOR_INPUT_JSON_PATH` の JSON を読んで取り込めます。
- `SENSOR_SOURCE_TYPE=command` にすると、`SENSOR_COMMAND` の標準出力 JSON を読んで取り込めます。
- `SENSOR_SOURCE_TYPE=onewire` にすると、`DS18B20_DEVICE_GLOB` の one-wire 温度センサを読みます。
- `SENSOR_SOURCE_TYPE=ondotori` にすると、おんどとり WebStorage API の現在値を読みます。
- command source の疎通確認には `backend/scripts/emit_sample_sensor_json.py` を使えます。

おんどとり API の疎通確認:

```bash
cp .env.example .env
# .env に ONDOTORI_API_KEY / ONDOTORI_LOGIN_ID / ONDOTORI_LOGIN_PASS を設定
.venv/bin/python -m backend.scripts.collect_sensor_data --source ondotori
```

`ONDOTORI_LOGIN_ID` は API 仕様上の `login-id` で、おんどとり WebStorage の利用者IDまたは参照専用IDです。
`ONDOTORI_LOGIN_PASS` はそのIDに対するパスワードです。
現在値APIは `api-key`, `login-id`, `login-pass` が必須です。

特定の子機だけ取得する場合は `.env` の `ONDOTORI_REMOTE_SERIALS_CSV` にカンマ区切りで指定します。

ダッシュボードへ継続反映する場合:

```bash
.venv/bin/python -m backend.scripts.collect_sensor_data --source ondotori --loop --interval 60
```

おんどとり現在値APIのレートリミットは 10回/120秒 なので、開発中も 15 秒未満の取得間隔にはしないでください。
画面側は backend の保存済みデータを 60 秒ごとに再取得します。

### 3. 画像取り込みを 1 回実行

```bash
python -m backend.scripts.capture_images --source dummy
```

利用できる source:

- `dummy`
- `directory`
- `rpi`

補足:

- `CAMERA_SOURCE_TYPE=directory` にすると、`INCOMING_IMAGE_PATH` 配下の画像を取り込みます。
- `CAMERA_SOURCE_TYPE=rpi` にすると、`rpicam-still` または `libcamera-still` を使って Raspberry Pi カメラ撮影を行います。

### 4. センサ収集と画像取り込みを定期実行

```bash
python -m backend.scripts.run_runtime
```

主な環境変数:

- `SENSOR_SOURCE_TYPE=dummy|json`
- `CAMERA_SOURCE_TYPE=dummy|directory`
- `SENSOR_POLL_INTERVAL_SECONDS`
- `IMAGE_CAPTURE_INTERVAL_SECONDS`
- `CAMERA_IDS_CSV`
- `SENSOR_INPUT_JSON_PATH`
- `INCOMING_IMAGE_PATH`
- `SENSOR_COMMAND`
- `ONDOTORI_API_KEY`
- `ONDOTORI_LOGIN_ID`
- `ONDOTORI_LOGIN_PASS`
- `ONDOTORI_REMOTE_SERIALS_CSV`
- `ONDOTORI_BASE_SERIALS_CSV`
- `DS18B20_DEVICE_GLOB`
- `CAMERA_COMMAND`
- `CAMERA_CAPTURE_TIMEOUT_MS`
- `CAMERA_CAPTURE_WIDTH`
- `CAMERA_CAPTURE_HEIGHT`
- `CAMERA_EXTRA_ARGS`

### 5. Raspberry Pi 実行前チェック

```bash
python -m backend.scripts.check_runtime_environment
```

Pi 上で `rpicam-still` が見えているか、one-wire のパスが見えているか、必要ディレクトリがあるかを確認できます。

## Frontend 起動

```bash
cd frontend
/Users/kizawarikuto/.local/share/mise/installs/pnpm/10.22.0/pnpm install
/Users/kizawarikuto/.local/share/mise/installs/pnpm/10.22.0/pnpm dev
```

`.env.local` を使う場合は、`frontend/.env.local.example` を元に `NEXT_PUBLIC_BACKEND_BASE_URL` を設定してください。

`3000` 番ポートが使用中で起動できない場合:

```bash
lsof -nP -iTCP:3000 -sTCP:LISTEN
kill <PID>
```

または別ポートで起動します。

```bash
/Users/kizawarikuto/.local/share/mise/installs/pnpm/10.22.0/pnpm dev -- --port 3001
```

## 確認先

- API ドキュメント: `http://localhost:8000/docs`
- Health Check: `http://localhost:8000/health`
- 最新状態 API: `http://localhost:8000/latest-status`
- センサー表示設定 API: `http://localhost:8000/sensor-settings`
- dashboard summary API: `http://localhost:8000/dashboard/summary`
- Frontend Dashboard: `http://localhost:3000`
- Frontend Settings: `http://localhost:3000/settings`
- Frontend Manual Input: `http://localhost:3000/manual-input`
- Frontend Export: `http://localhost:3000/export`

## 動作確認コマンド

```bash
curl http://127.0.0.1:8000/health
curl 'http://127.0.0.1:8000/sensor-records?limit=3'
curl http://127.0.0.1:8000/latest-status
curl http://127.0.0.1:8000/sensor-settings
curl http://127.0.0.1:8000/dashboard/summary
curl -X POST http://127.0.0.1:8000/upload-image \
  -F camera_id=camera-upload-01 \
  -F location=growth-chamber-upload \
  -F file=@storage/images/camera-01-latest.svg
curl http://127.0.0.1:3000/
```

## Raspberry Pi 移行時に差し替える箇所

- `.env` の保存先、ポート、interval、source 種別
- `backend/app/services/sensor_sources.py`
- `backend/app/services/camera_sources.py`
- `backend/scripts/run_runtime.py` を systemd などで常駐起動
- `INCOMING_IMAGE_PATH` を外部カメラ保存先へ向ける、または camera source を実機実装へ差し替える

Pi へ持っていく時点で既に揃っているもの:

- backend API
- DB 保存
- 定期収集 / 定期画像取り込みの実行プログラム
- ダミー source と file/directory source の切替機構
- upload-image API
- Pi カメラ source と DS18B20 one-wire source
- command source による外部スクリプト連携
- systemd テンプレート

Pi で後から差し替えるもの:

- 実センサ読み取り処理
- 実カメラ撮影処理
- systemd / cron の本番設定

systemd テンプレート:

- [`deploy/systemd/cultivation-backend.service`](/Users/kizawarikuto/workspace/active/college/cultivation-manager/deploy/systemd/cultivation-backend.service)
- [`deploy/systemd/cultivation-runtime.service`](/Users/kizawarikuto/workspace/active/college/cultivation-manager/deploy/systemd/cultivation-runtime.service)

## Docs

- 仕様と決定事項は [`docs/decisions.md`](/Users/kizawarikuto/workspace/active/college/cultivation-manager/docs/decisions.md)
- 現在の実装メモは [`docs/v0.1-backend-bootstrap.md`](/Users/kizawarikuto/workspace/active/college/cultivation-manager/docs/v0.1-backend-bootstrap.md)
- frontend 実装メモは [`docs/v0.1-frontend-dashboard.md`](/Users/kizawarikuto/workspace/active/college/cultivation-manager/docs/v0.1-frontend-dashboard.md)
- runtime プログラム一覧は [`docs/v0.2-runtime-programs.md`](/Users/kizawarikuto/workspace/active/college/cultivation-manager/docs/v0.2-runtime-programs.md)
- 実行確認ログは [`docs/dev-log.md`](/Users/kizawarikuto/workspace/active/college/cultivation-manager/docs/dev-log.md)
