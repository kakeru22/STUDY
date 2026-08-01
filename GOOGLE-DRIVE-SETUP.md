# Google Drive 同期セットアップ

## 用意するもの

- `Googleアカウント` 1つ
- `Google Cloud` の利用権限
- `Google Drive API` を有効化した `Google Cloud プロジェクト`
- `OAuth 同意画面`
- `Web application` タイプの `OAuth Client ID`

## 作業手順

1. `Google Cloud Console` で新しいプロジェクトを作成する
2. `API とサービス` から `Google Drive API` を有効化する
3. `OAuth 同意画面` を作成する
4. `認証情報` から `OAuth クライアント ID` を作成する
5. タイプは `Web application` を選ぶ
6. `Authorized JavaScript origins` に開発URLを追加する
7. 配布するなら本番URLも追加する
8. 発行された `Client ID` をアプリの `同期 / 設定` 画面へ入れる

## 開発時に追加するURL

ローカル開発の想定:

- `http://localhost:4173`
- 必要なら `http://127.0.0.1:4173`

## このアプリが使う権限

- `https://www.googleapis.com/auth/drive.file`

意味:

- このアプリが作成・選択したファイルに対して読み書きする
- ユーザーのDrive全体を無制限に読む構成にはしていない

## 保存されるファイル

Driveフォルダ名の初期値:

- `StudyReviewApp`

保存されるJSON:

- `questions.json`
- `progress.json`
- `settings.json`

## 注意点

- `Google認証` はブラウザ上で行う
- `Client Secret` は不要
- `Client ID` だけをアプリに入れる
- Drive同期を使わない場合でも、ローカル保存とオフライン復習は使える

## 公式ドキュメント

- Google Drive API quickstart for JavaScript:
  https://developers.google.com/workspace/drive/api/quickstart/js
- Google Identity Services for web:
  https://developers.google.com/identity/oauth2/web/guides/overview
- Drive files and folders:
  https://developers.google.com/workspace/drive/api/guides/folder
