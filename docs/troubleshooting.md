# Troubleshooting

## 2026-04-07

### `python -m backend.scripts.seed_dummy_data --reset` で `ModuleNotFoundError: No module named 'sqlalchemy'`

症状:

- `uv pip install -r backend/requirements.txt` は成功したように見える
- しかし `.venv/bin/python` では `fastapi` や `sqlalchemy` を import できない

原因:

- `uv` がこのプロジェクトの `.venv` ではなく、別の Python 環境へインストールしている
- その結果、`python` と `uv run` が別々の環境を見て動くことがある

対処:

```bash
source .venv/bin/activate
uv pip install --python .venv/bin/python -r backend/requirements.txt
.venv/bin/python -c "import fastapi, sqlalchemy; print('ok')"
python -m backend.scripts.seed_dummy_data --reset
```

### `pnpm dev` で `EADDRINUSE: address already in use :::3000`

症状:

- frontend 起動時に `3000` 番ポートが使用中で失敗する

原因:

- 既に別の Next.js 開発サーバや `node` プロセスが `3000` を使っている

対処:

```bash
lsof -nP -iTCP:3000 -sTCP:LISTEN
kill <PID>
```

または:

```bash
pnpm dev -- --port 3001
```

