# Decisions

## 2026-04-06

### 開発環境

- 当面は Docker を使わず、Mac ローカルで動く構成を優先する。
- Python 側の仮想環境・依存操作は `uv` を前提にする。
- 将来の Raspberry Pi 5 移行を見据え、環境依存値は `.env` と `backend/app/core/config.py` に集約する。

### v0.1 backend 方針

- backend は FastAPI + SQLAlchemy + SQLite で構成する。
- DB ファイルは `storage/` 配下に置き、画像と CSV も `storage/` 配下で管理する。
- 実機センサ接続前は `backend/app/services/seed_data.py` のダミーデータでシステム全体を先に完成させる。
- 画像はローカル開発で扱いやすいように SVG のダミー画像を生成する。

### 運用メモ

- 研究室内ネットワーク向けを前提とし、現時点では認証なしで進める。
- 将来の認証追加やセンサ統合に備えて、API・モデル・サービスを分離する。
- 以後の仕様・議論・実装方針は `docs/` に継続記録する。

