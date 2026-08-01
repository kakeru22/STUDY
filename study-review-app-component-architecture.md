# 一問一答復習アプリ コンポーネント設計

## 1. 方針

おすすめの進め方は、`画面` と `ロジック` を最初から分けること。

- `pages`
  画面を組み立てる
- `components`
  見た目の部品を持つ
- `features`
  問題管理や復習など、機能単位のUIを持つ
- `hooks`
  UIに近い再利用ロジックを持つ
- `services`
  Drive API、IndexedDB、認証のような外部連携を持つ
- `stores`
  全画面で共有する状態を持つ

この分け方にすると、UI変更と同期処理の変更がぶつかりにくい。

## 2. 推奨ディレクトリ構成

```text
src/
  app/
    App.tsx
    router.tsx
    providers/
      AppProviders.tsx
  pages/
    HomePage.tsx
    QuestionCreatePage.tsx
    QuestionListPage.tsx
    QuestionEditPage.tsx
    ReviewSetupPage.tsx
    ReviewSessionPage.tsx
    SettingsPage.tsx
  components/
    layout/
      AppHeader.tsx
      BottomNav.tsx
      PageShell.tsx
      StatusBanner.tsx
    common/
      PrimaryButton.tsx
      SecondaryButton.tsx
      Card.tsx
      EmptyState.tsx
      LoadingOverlay.tsx
      ConfirmDialog.tsx
  features/
    sync/
      SyncStatusBar.tsx
      SyncPanel.tsx
      ConflictDialog.tsx
    question-form/
      QuestionForm.tsx
      QuestionTypeSwitch.tsx
      CategoryField.tsx
      QuestionTextField.tsx
      ChoiceEditor.tsx
      BinaryChoicePreset.tsx
      CorrectAnswerPicker.tsx
      ExplanationField.tsx
      TagInput.tsx
      QuestionMetaSection.tsx
      DraftActions.tsx
    question-list/
      QuestionSearchBar.tsx
      QuestionFilters.tsx
      QuestionList.tsx
      QuestionListItem.tsx
      QuestionStatsBadge.tsx
    review/
      ReviewModeSelector.tsx
      ReviewFilterForm.tsx
      ReviewProgressHeader.tsx
      ReviewCard.tsx
      ChoiceButtonGroup.tsx
      ReviewResultPanel.tsx
    dashboard/
      SummaryCard.tsx
      QuickActionGrid.tsx
      RecentQuestionList.tsx
  hooks/
    useNetworkStatus.ts
    useAuthSession.ts
    useSyncStatus.ts
    useQuestions.ts
    useQuestionForm.ts
    useReviewSession.ts
    useSettings.ts
  stores/
    authStore.ts
    syncStore.ts
    questionStore.ts
    reviewStore.ts
    settingsStore.ts
  services/
    auth/
      googleAuthService.ts
    storage/
      indexedDbClient.ts
      questionRepository.ts
      progressRepository.ts
      settingsRepository.ts
    sync/
      driveClient.ts
      driveSyncService.ts
      conflictResolver.ts
      syncSnapshotBuilder.ts
    review/
      reviewScheduler.ts
  types/
    question.ts
    progress.ts
    settings.ts
    sync.ts
  utils/
    date.ts
    id.ts
    validation.ts
```

## 3. 設計の基本ルール

### 3.1 `pages`

- 画面ルーティング単位
- データ取得と表示組み立てだけ行う
- ビジネスロジックは持たない

### 3.2 `components`

- 再利用性の高い見た目部品
- アプリ固有ロジックはなるべく持たない

### 3.3 `features`

- 機能単位でまとまったUI
- 問題入力や復習のように、部品が複数集まる領域

### 3.4 `hooks`

- Reactに近いロジックを持つ
- 画面やfeatureから使う
- API通信そのものは直接持たず、`services` を呼ぶ

### 3.5 `services`

- Drive API
- Google認証
- IndexedDB
- 復習間隔計算

UIと切り離すことで、後から実装変更しやすくする。

## 4. 画面ごとのコンポーネント分割

## 4.1 HomePage

責務:

- 今日の復習件数を表示
- 苦手件数を表示
- 同期状態を表示
- 主要導線を出す

構成:

```text
HomePage
  PageShell
    AppHeader
    StatusBanner
    SyncStatusBar
    SummaryCard x 4
    QuickActionGrid
    RecentQuestionList
    BottomNav
```

持つ状態:

- ダッシュボード集計値
- 最近追加した問題
- 同期状態

## 4.2 QuestionCreatePage

責務:

- 問題の新規作成
- 連続入力
- 下書き保存

構成:

```text
QuestionCreatePage
  PageShell
    AppHeader
    StatusBanner
    QuestionForm
      QuestionTypeSwitch
      CategoryField
      QuestionTextField
      ChoiceEditor
        BinaryChoicePreset or dynamic choices
      CorrectAnswerPicker
      ExplanationField
      TagInput
      QuestionMetaSection
      DraftActions
    BottomNav
```

持つ状態:

- 現在編集中のフォーム値
- バリデーションエラー
- 連続入力モードON/OFF

## 4.3 QuestionListPage

責務:

- 問題の検索
- フィルタ
- 一覧表示

構成:

```text
QuestionListPage
  PageShell
    AppHeader
    StatusBanner
    QuestionSearchBar
    QuestionFilters
    QuestionList
      QuestionListItem...
    BottomNav
```

持つ状態:

- 検索文字列
- フィルタ条件
- 並び順

## 4.4 QuestionEditPage

責務:

- 既存問題の編集
- アーカイブ
- 学習状況の表示

構成:

```text
QuestionEditPage
  PageShell
    AppHeader
    StatusBanner
    QuestionForm
    QuestionStatsBadge
    ConfirmDialog
    BottomNav
```

持つ状態:

- 対象問題のロード状態
- 編集中フォーム値
- アーカイブ確認ダイアログの開閉

## 4.5 ReviewSetupPage

責務:

- 復習モード選択
- タグ / カテゴリ条件指定
- 出題件数指定

構成:

```text
ReviewSetupPage
  PageShell
    AppHeader
    StatusBanner
    ReviewModeSelector
    ReviewFilterForm
    PrimaryButton
    BottomNav
```

持つ状態:

- 選択中モード
- フィルタ条件
- 出題件数

## 4.6 ReviewSessionPage

責務:

- 出題
- 回答受付
- 正誤処理
- 次回復習日計算

構成:

```text
ReviewSessionPage
  PageShell
    AppHeader
    StatusBanner
    ReviewProgressHeader
    ReviewCard
      ChoiceButtonGroup
    ReviewResultPanel
    BottomNav
```

持つ状態:

- 現在の問題index
- 回答済みか
- 回答結果
- セッション内の進捗

## 4.7 SettingsPage

責務:

- 同期状態表示
- 手動同期
- Drive再読込
- バックアップ
- 自動同期設定

構成:

```text
SettingsPage
  PageShell
    AppHeader
    StatusBanner
    SyncPanel
    ConflictDialog
    BottomNav
```

持つ状態:

- 同期実行中か
- 競合ダイアログ表示
- 自動同期ON/OFF

## 5. 重要コンポーネントの責務

## 5.1 AppHeader

役割:

- 画面タイトル
- 同期状態の簡易表示

持たないもの:

- Drive同期ロジック本体

## 5.2 StatusBanner

役割:

- `オフライン`
- `未同期あり`
- `競合あり`

のような重要状態の通知

ルール:

- 全画面共通
- 条件に応じて出し分ける

## 5.3 QuestionForm

役割:

- 問題作成と編集の共通フォーム

ポイント:

- 新規作成画面と編集画面で共通化する
- `mode: create | edit` を受け取る

props例:

```ts
type QuestionFormProps = {
  mode: "create" | "edit";
  initialValue?: QuestionDraft;
  onSubmit: (draft: QuestionDraft) => Promise<void>;
  onSaveDraft?: (draft: QuestionDraft) => Promise<void>;
};
```

## 5.4 ChoiceEditor

役割:

- 〇×時の固定2択表示
- N択時の可変選択肢編集

分ける理由:

- 問題入力UIの中で最も条件分岐が多い
- 独立させないとフォームが肥大化する

## 5.5 SyncStatusBar / SyncPanel

役割:

- 現在状態の可視化
- 手動同期導線
- 最終同期時刻表示

違い:

- `SyncStatusBar`
  全画面の簡易表示
- `SyncPanel`
  設定画面の詳細操作

## 5.6 ConflictDialog

役割:

- Driveとローカルの競合時の意思決定

持つボタン:

- `Driveを優先`
- `ローカルで上書き`
- `バックアップして上書き`
- `キャンセル`

## 6. 状態の持ち場所

ここを最初に決めるのが重要。

## 6.1 ページ内ローカル状態

ページやフォームだけで完結するもの。

例:

- 入力中の問題文
- 開閉中のダイアログ
- 一時的な検索条件
- 回答結果パネルの表示状態

置き場所:

- `useState`
- `useReducer`

## 6.2 グローバル状態

複数画面で使うもの。

例:

- ログイン状態
- 同期状態
- 設定情報
- 現在のオフライン / オンライン状態

置き場所:

- `stores/`

## 6.3 永続データ

アプリを閉じても残すもの。

例:

- 問題一覧
- 学習進捗
- 設定
- 最終同期メタ情報

置き場所:

- `IndexedDB`

## 6.4 Drive上の永続データ

端末をまたいで共有するもの。

例:

- `questions.json`
- `progress.json`
- `settings.json`

置き場所:

- `Google Drive`

## 7. hooks と services の分け方

## 7.1 hooks

### useNetworkStatus

役割:

- ブラウザの `online/offline` 監視
- 実効的オンライン状態は別途 `Drive疎通` と合わせて判定

### useSyncStatus

役割:

- 未同期件数
- 最終同期時刻
- 同期中フラグ
- 競合有無

### useQuestionForm

役割:

- 問題フォーム初期化
- バリデーション
- 〇×とN択の切替処理

### useReviewSession

役割:

- 出題対象のロード
- 回答処理
- 次回復習日の計算依頼
- セッション進行管理

## 7.2 services

### googleAuthService

役割:

- Googleログイン
- アクセストークン取得
- サインアウト

### indexedDbClient

役割:

- DB接続
- object store 初期化
- トランザクション実行

### questionRepository / progressRepository / settingsRepository

役割:

- 永続データのCRUD

### driveClient

役割:

- Drive API呼び出しの薄いラッパー

### driveSyncService

役割:

- ローカルから同期用スナップショット作成
- Driveとの比較
- 保存
- 再読込

### conflictResolver

役割:

- 競合判定
- 競合時の選択肢ごとの処理

### reviewScheduler

役割:

- 次回復習日の計算
- 連続正解数に応じた間隔更新

## 8. props で渡すもの、storeから取るもの

ルール:

- 1画面専用の情報は `props`
- 全画面で使う状態は `store`
- 永続化が必要なら `repository`

例:

- `QuestionListItem`
  propsで `question`, `stats`, `onEdit`
- `SyncStatusBar`
  storeから `syncStatus` を読む
- `QuestionForm`
  propsで `initialValue`, `mode`, `onSubmit`

## 9. MVPで先に作るべきコンポーネント

優先度順:

1. `PageShell`
2. `AppHeader`
3. `BottomNav`
4. `StatusBanner`
5. `QuestionForm`
6. `ChoiceEditor`
7. `QuestionList`
8. `ReviewCard`
9. `ReviewResultPanel`
10. `SyncPanel`
11. `ConflictDialog`

理由:

- 共通レイアウトが先にないと各画面がばらける
- 問題入力と復習がアプリの中核
- 同期は最後にUIを被せても成立する

## 10. 最初の実装単位

おすすめの実装順:

1. `PageShell`, `AppHeader`, `BottomNav`
2. `HomePage`
3. `QuestionForm` と `QuestionCreatePage`
4. `QuestionListPage`
5. `ReviewSetupPage` と `ReviewSessionPage`
6. `SettingsPage`
7. `IndexedDB`
8. `Google認証`
9. `Drive同期`

この順にする理由:

- 先に画面を触れる状態にする
- 次にローカル完結で使えるようにする
- 最後に同期を足す

## 11. 結論

今回のアプリでは、`巨大な1ファイル画面` を作るのは避けるべき。

おすすめ構成は以下。

- 画面は `pages`
- 問題管理や復習は `features`
- 共通見た目は `components`
- 認証、Drive、IndexedDBは `services`
- オフラインや同期状態は `stores + hooks`

この設計なら、次の段階でそのまま `React実装` に入れる。
