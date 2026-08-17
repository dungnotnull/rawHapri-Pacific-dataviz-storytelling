import json
import pandas as pd
from pathlib import Path

SRC = "data/pacific_data_all.xlsx"
OUT = Path("data")

TARGET_CODES = {"CK", "FM", "FJ", "KI", "NR", "NU", "PW", "MH", "WS", "SB", "TO", "TV", "VU"}

CODE_TO_NAME = {
    "CK": "Cook Islands",
    "FM": "Federated States of Micronesia",
    "FJ": "Fiji",
    "KI": "Kiribati",
    "NR": "Nauru",
    "NU": "Niue",
    "PW": "Palau",
    "MH": "Republic of Marshall Islands",
    "WS": "Samoa",
    "SB": "Solomon Islands",
    "TO": "Tonga",
    "TV": "Tuvalu",
    "VU": "Vanuatu",
}

CENTROIDS = {
    "CK": (-21.2367, -159.7777),
    "FM": (6.9248, 158.1611),
    "FJ": (-17.7134, 178.0650),
    "KI": (1.4518, 172.9717),
    "NR": (-0.5228, 166.9315),
    "NU": (-19.0544, -169.8672),
    "PW": (7.5150, 134.5825),
    "MH": (7.1315, 171.1845),
    "WS": (-13.8506, -171.7513),
    "SB": (-9.4280, 159.9498),
    "TO": (-21.1789, -175.1982),
    "TV": (-8.5211, 179.1983),
    "VU": (-17.7333, 168.3222),
}

print(f"Reading {SRC}...")
df = pd.read_excel(SRC, sheet_name="Sheet1")

ghg_raw = df[
    (df["indicator_id"] == "GHG_EMI_CAPITA") &
    (df["geo_pict"].isin(TARGET_CODES))
].dropna(subset=["value"]).sort_values(["geo_pict", "year"])

# save the unit into a text file
unit_info = df[df["indicator_id"] == "GHG_EMI_CAPITA"].head(1)
unit_info.to_csv("ghg_unit.txt", index=False)

ghg_out = []
for code, g in ghg_raw.groupby("geo_pict"):
    lat, lon = CENTROIDS.get(code, (0, 0))
    name = CODE_TO_NAME[code]
    series = [{"year": int(r.year), "value": round(float(r.value), 1)} for r in g.itertuples()]
    if not series:
        continue
    latest = series[-1]
    ghg_out.append({
        "code": code,
        "name": name,
        "lat": lat,
        "lon": lon,
        "latest_year": latest["year"],
        "latest_value": latest["value"],
        "series": series,
    })

with open(OUT / "ghg_per_capita.json", "w", encoding="utf-8") as f:
    json.dump(ghg_out, f, indent=1)

print(f"Saved {len(ghg_out)} countries to ghg_per_capita.json")
