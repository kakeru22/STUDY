# Google OAuth Client の分け方

更新日: 2026-08-29

## 方針

AnkiSoft では Google Drive の同期先は同じでも、起動元ごとに Client ID を分ける。

- 公開版: `https://archistudy.netlify.app/`
- ローカルPC版: `http://127.0.0.1:4174`

今回のローカルPC版は `localhost` で動くため、種類は `Desktop app` ではなく `Web application` を使う。

## 用意するもの

- Google Cloud プロジェクト 1 つ
- Google Drive API を有効化
- OAuth 同意画面の設定
- OAuth Client を 2 つ

## 1. 公開版用 Client

種類:

- `Web application`

Authorized JavaScript origins:

- `https://archistudy.netlify.app`

用途:

- Netlify 公開版
- スマホ、別PC、通常ブラウザ利用

## 2. ローカルPC版用 Client

種類:

- `Web application`

Authorized JavaScript origins:

- `http://127.0.0.1:4174`
- `http://localhost:4174`

用途:

- PC のローカル起動版
- 自分の PC からの直接同期

## 入力先

### 公開版

- `https://archistudy.netlify.app/` の初期設定画面に `公開版用 Client ID` を入力

### ローカルPC版

- `http://127.0.0.1:4174` の初期設定画面に `ローカルPC版用 Client ID` を入力

## 運用ルール

- 同じ Google アカウントでログインしてよい
- 同じ Drive フォルダ名を使ってよい
- ただし Client ID は混ぜない

## よくあるミス

- 公開版に localhost 用 Client ID を入れる
- ローカルPC版に公開版用 Client ID を入れる
- Drive API を有効化していない
- OAuth 同意画面のテストユーザーに自分を入れていない
