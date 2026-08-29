# AnkiSoft ローカルPC版

更新日: 2026-08-29

## 方針

ローカルPC版は `Electron` ではなく、PC 上の `localhost` で起動するブラウザ版として用意する。

- Web版: `https://archistudy.netlify.app/`
- ローカルPC版: `http://127.0.0.1:4174`

UI と同期仕様は同じで、使う OAuth Client ID だけ分ける。

## 起動方法

### 開発用

```bash
npm install
npm run local:dev
```

### ローカル実行

```bash
npm install
npm run local:start
```

起動後はブラウザで次を開く。

- `http://127.0.0.1:4174`

## 使い方

1. ローカルPC版を起動
2. 初期設定画面で `localhost 用の Google OAuth Client ID` を入力
3. `Google Drive とつなぐ` を押す
4. Google 認証後、そのままローカル版で利用する

## この方式のメリット

- 公開サイトを経由せずローカルで動く
- Web版と同じ UI / 同じ同期仕様を流用できる
- スマホ用の公開版と、PC用のローカル版を分けて運用できる
- 同じ Google Drive フォルダに同期できる

## 注意点

- ローカルPC版でもブラウザは使う
- `file://` で HTML を直接開く方式ではない
- `localhost 用` と `公開版用` の Client ID は分ける
