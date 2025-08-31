import json
import uuid

# Path to your races.json file
INPUT_FILE = "races.json"
OUTPUT_FILE = "races_with_ids.json"  # you can overwrite INPUT_FILE if you want

def main():
    with open(INPUT_FILE, "r", encoding="utf-8") as f:
        races = json.load(f)

    for race in races["races_women"]:
        race["id"] = str(uuid.uuid4())

    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(races, f, ensure_ascii=False, indent=2)

    print(f"✅ Added UUIDs to {len(races)} races. Saved to {OUTPUT_FILE}")

if __name__ == "__main__":
    main()
