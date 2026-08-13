# 参考資料

`source/`には、アプリ内の数値へ変換する前の公式統計原本を保存しています。

## 公式統計

| ファイル | 出典 | 取得日 | 文字コードまたは形式 | SHA-256 |
| --- | --- | --- | --- | --- |
| `source/life-table-2024.xlsx` | [厚生労働省「令和6年簡易生命表」](https://www.mhlw.go.jp/toukei/saikin/hw/life/life24/) | 2026-08-13 | XLSX | `2949be00479ba37e0c67ace0476778e7b0abb970db3c7b86ce47c2d20664ab6a` |
| `source/time-use-2021-male.xlsx` | [e-Stat 第2-2表](https://www.e-stat.go.jp/stat-search/files?stat_infid=000032261679) | 2026-08-13 | XLSX | `19b07d8b78a0b2c979e03b7c2cda41169085520f617689a6fed2162cee763a60` |
| `source/time-use-2021-female.xlsx` | [e-Stat 第2-3表](https://www.e-stat.go.jp/stat-search/files?stat_infid=000032261680) | 2026-08-13 | XLSX | `012a94bc112814cd8020b03b265d9e2e8722d53cb1ec2849b187369bef3bf7b9` |
| `source/causes-of-death-2024-0-64.csv` | [e-Stat 人口動態統計 保管統計表 第2表](https://www.e-stat.go.jp/stat-search/files?cycle=7&layout=datalist&page=1&tclass1=000001053058&tclass2=000001053061&tclass3=000001053073&tclass4=000001053082&tclass5val=0&toukei=00450011&tstat=000001028897&year=20240) | 2026-08-13 | CSV、CP932 | `6b0b54d9cc8a3fa9ba5034af2fd7f9ed14ab2f87129a53466ef2c90f60279293` |
| `source/causes-of-death-2024-65-plus.csv` | 同上 | 2026-08-13 | CSV、CP932 | `a7da33be2b64f8a326da048b84164e46b54f1f3ecf157f713b93bf445095269b` |

## 変換規則

`python3 scripts/build_data.py`が原本を読み、`src/data/`のJSONを再生成します。`--check`は再生成結果と追跡中のJSONを比較します。

- 生命表: 年齢が「年」の0～105歳について、死亡率、生存数、死亡数、平均余命を抽出します。
- 生活時間: 週全体の1日平均から、睡眠、食事、身の回り、仕事・学業、通勤・通学、家事、育児・介護、買い物等の8区分を作ります。親子分類を同時に足さないよう公表コードで変換します。
- 死因: 死亡場所は「総数」を使います。死因簡単分類の末端項目だけを採用し、親分類との二重計上を防ぎます。`-`は0として扱います。

原本は加工せず保持し、アプリは生成済みJSONだけを読み込みます。ブラウザから統計サイトへデータ取得は行いません。

## 利用条件

統計原本とその加工データを利用する場合は、[e-Stat利用規約](https://www.e-stat.go.jp/terms-of-use)および[厚生労働省ホームページの利用規約](https://www.mhlw.go.jp/chosakuken/)を確認してください。`src/data/`のJSONは、上記原本を本リポジトリの変換規則で加工したものです。
