# Netlify 公開手順

## 前提

- GitHub リポジトリ: `https://github.com/kakeru22/STUDY`
- 公開URL: `https://archistudy.netlify.app/`

## Netlify 側

1. Netlify にログイン
2. GitHub リポジトリ `STUDY` を接続
3. Build command を `npm run build`
4. Publish directory を `dist`
5. デプロイを実行

## Google Cloud 側

1. `Google Drive API` を有効化
2. `OAuth 同意画面` を作成
3. 自分の Google アカウントを `テストユーザー` に追加
4. `OAuth クライアント ID` を `ウェブアプリ` で作成
5. `承認済みの JavaScript 生成元` に `https://archistudy.netlify.app` を追加

## アプリ側

1. `https://archistudy.netlify.app/` を開く
2. `初期設定` で `Google OAuth Client ID` を入力
3. Google に接続
4. Drive 同期を実行
