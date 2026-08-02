# Google Drive 設定

## 必要なもの

- Google アカウント
- Google Cloud プロジェクト
- Google Drive API
- OAuth 同意画面
- ウェブアプリ用 OAuth Client ID

## 設定手順

1. Google Cloud Console で新しいプロジェクトを作成
2. `Google Drive API` を有効化
3. `OAuth 同意画面` を作成
4. 自分の Google アカウントを `テストユーザー` に追加
5. `認証情報` で `OAuth クライアント ID` を新規作成
6. 種類は `ウェブアプリ` を選択
7. `承認済みの JavaScript 生成元` に `https://archistudy.netlify.app` を追加
8. 発行された `Client ID` を AnkiSoft の設定画面に入力

## このアプリで使うスコープ

- `https://www.googleapis.com/auth/drive.file`

## 注意点

- このアプリはポップアップ認証なので、通常は `リダイレクト URI` は不要
- `Google Drive API` を有効化していないと 403 エラーになる
- `テストユーザー` を追加していないとログインできない
- `JavaScript 生成元` は `https://archistudy.netlify.app` と完全一致させる
