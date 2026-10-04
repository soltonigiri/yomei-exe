# 余命.exe

日本の公的統計をもとに、統計上の残り時間と自由時間を表示するブラウザアプリです。

[余命.exeを開く](https://yomei-exe.pages.dev/)

## 使用データ

- 厚生労働省「令和6年簡易生命表」
- 総務省統計局「令和3年社会生活基本調査」
- 厚生労働省「令和6年人口動態統計（確定数）」

原資料と変換方法は[データの出典](references/README.md)を参照してください。

## 開発

Node.js 24とPython 3を使用します。

```bash
npm ci
npm run dev
```

```bash
npm run check
npx playwright install chromium
npm run test:e2e
```

`npm run check`はデータの一致確認、lint、テスト、ビルドを実行します。原資料からアプリ用JSONを再生成するコマンドは`npm run data:generate`です。

E2Eにはポート4173を使います。使用中なら`PLAYWRIGHT_PORT=4198 npm run test:e2e`で変更してください。

## ライセンス

アプリケーションのソースコードは[MIT License](LICENSE)で公開しています。

`references/source/`の統計原本と、それをもとに生成した`src/data/`のデータには、各提供元の利用条件が適用されます。詳細は[`references/README.md`](references/README.md)を確認してください。

## 注意

表示は統計に基づく娯楽目的の推計です。医療・健康判断には使用しないでください。入力内容は端末内で処理され、外部へ送信・保存されません。
