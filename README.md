# Study Review App

個人用の一問一答復習アプリです。

## 現在実装してあるもの

- `IndexedDB` へのローカル保存
- `オフライン起動`
- `〇× / N択` の問題登録
- 問題一覧の検索と絞り込み
- 問題編集
- 復習と正誤記録
- `Service Worker` によるオフライン用キャッシュ
- `Google Drive` への同期コード
- JSONバックアップの書き出し / 読込
- `Netlify` 公開前提の設定

## 形式

このアプリは `単体HTMLを直接開く形式` ではなく、`PWA形式の静的Webアプリ` です。

実際の使い方:

- 開発中は `http://localhost:4173`
- 公開後は `Netlify の HTTPS URL`
- スマホではそのURLを `ホーム画面に追加`

## ローカルで必要なもの

- `Node.js 18.14.0 以上`
- `npm`

このPCでは `node` / `npm` が未導入だったため、依存インストールとビルド確認は未実施です。

## ローカル起動手順

1. `Node.js` をインストール
2. このフォルダで `npm install`
3. `npm run dev`
4. ブラウザで `http://localhost:4173`

## Netlify 公開

公開手順は [NETLIFY-DEPLOY.md](<C:/Users/PC-G2/STUDY/NETLIFY-DEPLOY.md>) を参照。

## Google Drive 同期

Google Drive の設定手順は [GOOGLE-DRIVE-SETUP.md](<C:/Users/PC-G2/STUDY/GOOGLE-DRIVE-SETUP.md>) を参照。

最低限必要:

- `Googleアカウント`
- `Google Cloud プロジェクト`
- `Google Drive API`
- `OAuth 同意画面`
- `Web application` の `OAuth Client ID`

## 補足

- Google同期を設定しなくても、ローカル保存とオフライン復習は使えます。
- Drive同期は `Settings` 画面から認証して使います。
- Netlify では `netlify.toml` で `dist` を公開し、SPAルーティングを `index.html` にリライトします。
