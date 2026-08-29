# AnkiSoft

一問一答の復習用アプリです。

公開版:

- `https://archistudy.netlify.app/`

ローカルPC版:

- `http://127.0.0.1:4174` で起動

## 構成

- `公開版`: Netlify で公開。スマホや別PCから利用
- `ローカルPC版`: localhost で起動。PC用に直接利用
- `同期先`: Google Drive

## 主な機能

- オフライン起動
- Google Drive 同期
- 〇× / N択問題
- 画像付き問題
- 競合検知と解決
- 7日保持の自動スナップショット

## コマンド

公開版 / 共通開発:

```bash
npm run dev
npm run build
npm run preview
```

ローカルPC版:

```bash
npm run local:dev
npm run local:start
```

## ドキュメント

- `NETLIFY-DEPLOY.md`
- `GOOGLE-DRIVE-SETUP.md`
- `LOCAL-DESKTOP-SETUP.md`
- `GOOGLE-OAUTH-CLIENTS.md`
