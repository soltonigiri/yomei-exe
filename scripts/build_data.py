#!/usr/bin/env python3
"""Build application JSON from the checked-in official statistics."""

from __future__ import annotations

import argparse
import csv
import json
import re
import sys
from pathlib import Path
from xml.etree import ElementTree as ET
from zipfile import ZipFile

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "references" / "source"
OUTPUT = ROOT / "src" / "data"
NS = {"m": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}


def xlsx_rows(path: Path, sheet_number: int = 1) -> list[dict[str, str]]:
    with ZipFile(path) as archive:
        shared: list[str] = []
        if "xl/sharedStrings.xml" in archive.namelist():
            root = ET.fromstring(archive.read("xl/sharedStrings.xml"))
            for item in root.findall("m:si", NS):
                shared.append("".join(node.text or "" for node in item.iterfind(".//m:t", NS)))

        sheet = ET.fromstring(archive.read(f"xl/worksheets/sheet{sheet_number}.xml"))
        result: list[dict[str, str]] = []
        for row in sheet.findall(".//m:row", NS):
            values: dict[str, str] = {}
            for cell in row.findall("m:c", NS):
                reference = cell.attrib.get("r", "")
                column = re.match(r"[A-Z]+", reference)
                value_node = cell.find("m:v", NS)
                value = "" if value_node is None else value_node.text or ""
                if cell.attrib.get("t") == "s" and value:
                    value = shared[int(value)]
                if column:
                    values[column.group()] = value
            result.append(values)
        return result


def build_life_table() -> dict[str, object]:
    path = SOURCE / "life-table-2024.xlsx"
    tables: dict[str, list[dict[str, int | float]]] = {}
    for sheet_number, sex in ((1, "male"), (2, "female")):
        rows = []
        for row in xlsx_rows(path, sheet_number):
            match = re.fullmatch(r"(\d+)年", row.get("B", ""))
            if not match:
                continue
            rows.append(
                {
                    "age": int(match.group(1)),
                    "mortalityRate": float(row["C"]),
                    "survivors": int(float(row["D"])),
                    "deaths": int(float(row["E"])),
                    "lifeExpectancyYears": round(float(row["H"]), 2),
                }
            )
        if [row["age"] for row in rows] != list(range(106)):
            raise ValueError(f"{sex} life table does not contain ages 0 through 105")
        if rows[-1]["mortalityRate"] != 1:
            raise ValueError(f"{sex} terminal mortality rate is not 1")
        tables[sex] = rows
    return {
        "source": "令和6年簡易生命表",
        "publisher": "厚生労働省",
        "referenceYear": 2024,
        "sourceUrl": "https://www.mhlw.go.jp/toukei/saikin/hw/life/life24/",
        "tables": tables,
    }


AGE_COLUMNS = {
    "10-14": "P",
    "15-24": "Q",
    "25-34": "R",
    "35-44": "S",
    "45-54": "T",
    "55-64": "U",
    "65-74": "V",
    "75+": "W",
}


def numeric(value: str | None) -> int:
    if value in (None, "", "-"):
        return 0
    return int(round(float(value)))


def build_time_use() -> dict[str, object]:
    tables: dict[str, list[dict[str, object]]] = {}
    codes = ["2", "3", "13", "21", "21D", "21E", "21F", "21G", "22", "23", "24", "315", "41", "42", "43"]
    for sex in ("male", "female"):
        path = SOURCE / f"time-use-2021-{sex}.xlsx"
        by_code: dict[str, dict[str, str]] = {}
        for row in xlsx_rows(path):
            code = row.get("H", "").strip()
            if code in codes and code not in by_code:
                by_code[code] = row
        missing = set(codes) - set(by_code)
        if missing:
            raise ValueError(f"{sex} time-use table is missing codes: {sorted(missing)}")

        results: list[dict[str, object]] = []
        for age_group, column in AGE_COLUMNS.items():
            value = lambda code: numeric(by_code[code].get(column))
            care_subcategories = sum(value(code) for code in ("21D", "21E", "21F", "21G"))
            minutes = {
                "sleep": value("41"),
                "meals": value("43"),
                "personalCare": value("42"),
                "workSchool": max(0, value("2") + value("3") - value("13") - value("315")),
                "commuting": value("13") + value("315"),
                "housework": max(0, value("21") - care_subcategories),
                "care": value("22") + care_subcategories,
                "shoppingOther": value("23") + value("24"),
            }
            total = sum(minutes.values())
            if total < 0 or total > 1440:
                raise ValueError(f"invalid {sex} {age_group} time-use total: {total}")
            results.append({"ageGroup": age_group, "minutes": minutes})
        tables[sex] = results
    return {
        "source": "令和3年社会生活基本調査 調査票B 第2-2表・第2-3表",
        "publisher": "総務省統計局",
        "referenceYear": 2021,
        "sourceUrl": "https://www.stat.go.jp/data/shakai/2021/kekka.htm",
        "tables": tables,
    }


def parse_count(value: str) -> int:
    value = value.strip()
    return 0 if value in ("", "-", "・") else int(value)


def read_cause_file(path: Path) -> tuple[list[str], dict[str, dict[str, int]], list[dict[str, object]]]:
    with path.open(encoding="cp932", newline="") as handle:
        rows = list(csv.reader(handle))
    age_positions = [(index, value.strip()) for index, value in enumerate(rows[2]) if index >= 2 and value.strip()]
    excluded = {"総数", "0～4歳", "不詳"}
    age_positions = [(index, label) for index, label in age_positions if label not in excluded]
    ages = [label for _, label in age_positions]

    totals: dict[str, dict[str, int]] = {"male": {}, "female": {}}
    for row, sex in ((rows[5], "male"), (rows[6], "female")):
        totals[sex] = {label: parse_count(row[index]) for index, label in age_positions}

    causes: list[dict[str, object]] = []
    index = 0
    while index < len(rows):
        first = rows[index][0] if rows[index] else ""
        match = re.match(r"^(\d{5})(.*)$", first)
        if not match or index + 2 >= len(rows):
            index += 1
            continue
        code, remainder = match.groups()
        indent = len(remainder) - len(remainder.lstrip())
        label = remainder.strip()
        sex_rows = {"male": rows[index + 1], "female": rows[index + 2]}
        causes.append(
            {
                "code": code,
                "label": label,
                "indent": indent,
                "weights": {
                    sex: {age: parse_count(row[position]) for position, age in age_positions}
                    for sex, row in sex_rows.items()
                },
            }
        )
        index += 3
    return ages, totals, causes


def build_causes() -> dict[str, object]:
    all_age_groups: list[str] = []
    source_totals: dict[str, dict[str, int]] = {"male": {}, "female": {}}
    all_causes: list[dict[str, object]] = []
    for filename in ("causes-of-death-2024-0-64.csv", "causes-of-death-2024-65-plus.csv"):
        ages, totals, causes = read_cause_file(SOURCE / filename)
        all_age_groups.extend(ages)
        for sex in ("male", "female"):
            source_totals[sex].update(totals[sex])
        all_causes.extend(causes)

    leaf_codes: set[str] = set()
    for position, cause in enumerate(all_causes):
        next_cause = all_causes[position + 1] if position + 1 < len(all_causes) else None
        if next_cause is None or int(next_cause["indent"]) <= int(cause["indent"]):
            leaf_codes.add(str(cause["code"]))

    tables: dict[str, dict[str, list[dict[str, object]]]] = {"male": {}, "female": {}}
    for sex in ("male", "female"):
        for age_group in all_age_groups:
            entries = []
            for cause in all_causes:
                if cause["code"] not in leaf_codes:
                    continue
                weight = int(cause["weights"][sex].get(age_group, 0))
                if weight > 0:
                    entries.append({"code": cause["code"], "label": cause["label"], "weight": weight})
            actual = sum(int(entry["weight"]) for entry in entries)
            expected = source_totals[sex][age_group]
            if actual != expected:
                raise ValueError(f"cause total mismatch for {sex} {age_group}: {actual} != {expected}")
            tables[sex][age_group] = entries

    return {
        "source": "令和6年人口動態統計（確定数） 保管統計表 死因 死亡 第2表",
        "publisher": "厚生労働省",
        "referenceYear": 2024,
        "sourceUrl": "https://www.e-stat.go.jp/stat-search/files?cycle=7&layout=datalist&toukei=00450011&year=20240",
        "tables": tables,
    }


def serialized(value: object) -> str:
    return json.dumps(value, ensure_ascii=False, indent=2, sort_keys=False) + "\n"


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    outputs = {
        "life-table-2024.json": serialized(build_life_table()),
        "time-use-2021.json": serialized(build_time_use()),
        "causes-of-death-2024.json": serialized(build_causes()),
    }
    if args.check:
        mismatches = [name for name, content in outputs.items() if not (OUTPUT / name).exists() or (OUTPUT / name).read_text() != content]
        if mismatches:
            print("Generated data differs: " + ", ".join(mismatches), file=sys.stderr)
            return 1
        print("Generated data matches checked-in JSON.")
        return 0
    OUTPUT.mkdir(parents=True, exist_ok=True)
    for name, content in outputs.items():
        (OUTPUT / name).write_text(content)
        print(f"wrote {OUTPUT / name}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
