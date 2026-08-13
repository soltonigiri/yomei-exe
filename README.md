# 余命.exe

日本の公的統計をもとに、統計上の残り時間と自由時間を表示するブラウザアプリです。

## 使用データ

- 厚生労働省「令和6年簡易生命表」
- 総務省統計局「令和3年社会生活基本調査」
- 厚生労働省「令和6年人口動態統計（確定数）」

原資料、取得元、ハッシュ値、変換方法は [`references/README.md`](references/README.md) に記録しています。

## 開発

Node.js 24とPython 3を使用します。

```bash
npm ci
npm run dev
```

検証コマンドは次のとおりです。

```bash
npm run check
npx playwright install chromium
npm run test:e2e
```

原資料からアプリ用JSONを再生成する場合は `npm run data:generate`、生成済みJSONとの一致を確認する場合は `npm run data:check` を実行します。

## ライセンス

アプリケーションのソースコードは[MIT License](LICENSE)で公開しています。

`references/source/`の統計原本と、それをもとに生成した`src/data/`のデータには、各提供元の利用条件が適用されます。詳細は[`references/README.md`](references/README.md)を確認してください。

## 注意

表示は統計に基づく娯楽目的の推計です。医療・健康判断には使用しないでください。入力内容は端末内で処理され、外部へ送信・保存されません。
