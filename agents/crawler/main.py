import json
from crawler import run_crawler

if __name__ == "__main__":
    with open("config/targets.json", "r") as f:
        config = json.load(f)
    run_crawler(config)
