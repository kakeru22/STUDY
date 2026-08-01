# Netlify 公開手順

## 1. 何を用意するか

このアプリを公開するために必要なもの:

- `Node.js 18.14.0 以上`
- `npm`
- `GitHubアカウント`
- `Netlifyアカウント`
- `Googleアカウント`
- `Google Cloud プロジェクト`

## 2. こちらで用意済みのもの

このリポジトリ側で準備済み:

- `Vite` のビルド設定
- `netlify.toml`
- SPA用のリライト設定
- `Google Drive` 同期コード
- `Service Worker`

Netlify設定ファイル:

- [netlify.toml](<C:/Users/PC-G2/STUDY/netlify.toml>)

## 3. あなた側でしかできない操作

以下はこの環境からはできないので、手動で実施が必要です。

1. `Node.js` をインストール
2. `npm install` を実行
3. GitHub にリポジトリを作成して push
4. Netlify アカウントを作成
5. Netlify に GitHub リポジトリを接続
6. Google Cloud で `OAuth Client ID` を作成
7. Google Cloud に `Netlify の本番URL` を `Authorized JavaScript origins` として追加
8. 公開後、アプリの `Settings` 画面で `Client ID` を入力

## 4. ローカルで最初にやること

PowerShell:

```powershell
npm install
npm run build
npm run dev
```

確認URL:

- `http://localhost:4173`

ローカル確認項目:

- 問題追加ができる
- 問題一覧に反映される
- 復習で正誤記録できる
- `Settings` 画面でバックアップを書き出せる

## 5. GitHub へ上げる

PowerShell:

```powershell
git init
git add .
git commit -m "Initial study review app"
git branch -M main
git remote add origin <あなたのGitHubリポジトリURL>
git push -u origin main
```

## 6. Netlify で公開する

### 6.1 サイト作成

1. Netlify にログイン
2. `Add new project`
3. `Import an existing project`
4. GitHub を接続
5. このリポジトリを選択

### 6.2 Build 設定

Netlify は Vite を検出しやすいですが、念のため以下を確認:

- Build command: `npm run build`
- Publish directory: `dist`

この内容は [netlify.toml](<C:/Users/PC-G2/STUDY/netlify.toml>) にも書いてあります。

### 6.3 デプロイ

1. `Deploy site`
2. デプロイ完了後、Netlify の公開URLを確認

例:

- `https://your-site-name.netlify.app`

## 7. Google OAuth を本番URLに合わせる

Google Cloud Console で `OAuth Client ID` の設定を開く。

追加するもの:

- 開発用 origin:
  - `http://localhost:4173`
  - 必要なら `http://127.0.0.1:4173`
- 本番用 origin:
  - `https://your-site-name.netlify.app`

独自ドメインを使うなら、それも追加:

- `https://your-domain.com`

## 8. 公開後にアプリ側でやること

1. 公開URLを開く
2. `Settings`
3. `Google OAuth Client ID` を入力
4. `Googleに接続`
5. `今すぐ同期`

## 9. デプロイ後の確認項目

### 基本

- URLを開いてホーム画面が表示される
- 直接 `/questions` や `/review` を開いても 404 にならない
- スマホから開ける

### PWA

- ブラウザでホーム画面追加ができる
- 一度開いたあとオフラインでも再起動できる

### Drive同期

- `Googleに接続` が成功する
- `今すぐ同期` で Drive に JSON が作られる
- `Driveから再読込` が動く

## 10. よくある詰まりどころ

- `npm install` が動かない
  Node.js が入っていない
- Google認証で弾かれる
  `Authorized JavaScript origins` に Netlify URL が入っていない
- 画面更新で 404
  SPA リライト設定が必要
  このアプリは [netlify.toml](<C:/Users/PC-G2/STUDY/netlify.toml>) で対応済み
- Drive同期できない
  `Client ID` 未設定、または Drive API 未有効化

## 11. 公式ドキュメント

- Netlify Vite:
  https://docs.netlify.com/build/frameworks/framework-setup-guides/vite/
- Netlify redirects:
  https://docs.netlify.com/manage/routing/redirects/redirect-options/
- Netlify deploy command:
  https://cli.netlify.com/commands/deploy/
- Google Drive JavaScript quickstart:
  https://developers.google.com/workspace/drive/api/quickstart/js
