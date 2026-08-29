# AnkiSoft ローカルPC版
更新日: 2026-08-29

## 目的
ローカルPC版は `Electron` ではなく、PC 上の `localhost` で起動するブラウザ版です。
- Web版: `https://archistudy.netlify.app/`
- ローカルPC版: `http://127.0.0.1:4174/`

UI と機能は Web 版と揃えてあり、Google Drive 同期も同じデータを使います。

## 一度だけ必要な準備
1. Node.js 18 以上を入れる
2. このリポジトリを PC に置く
3. ターミナルで `npm install` を実行する
4. Google Cloud で `localhost` 用の OAuth Client ID を作る

OAuth Client ID の作り方は `GOOGLE-OAUTH-CLIENTS.md` を参照してください。

## クリック起動の使い方
`scripts/start-local-app.vbs` をダブルクリックすると、以下を自動で行います。
- 必要なら `npm run build` を実行
- `http://127.0.0.1:4174/` でローカルサーバーを起動
- ブラウザで AnkiSoft を開く

初回だけ数秒かかることがあります。

## デスクトップアイコン化
1. エクスプローラーで `scripts/start-local-app.vbs` を右クリック
2. `送る > デスクトップ (ショートカットを作成)` を選ぶ
3. 作成されたショートカットの名前を `AnkiSoft` に変更する
4. ショートカットを右クリックして `プロパティ > ショートカット > アイコンの変更`
5. アイコン画像は `public/branding/ankisoft-app-icon-flat-a-light.png` を使う

補足: Windows のショートカットアイコンは本来 `.ico` が安定です。必要なら後で `.ico` も追加できます。

## 停止方法
ローカルサーバーを止めたいときは `scripts/stop-local-app.ps1` を実行してください。

## 注意点
- これは `file://` で直接開く HTML 版ではありません
- Node.js は PC に入っている必要があります
- Google OAuth では `Netlify 用` と `localhost 用` を分けて管理してください
- 同期データそのものは Google Drive 上で共通です
