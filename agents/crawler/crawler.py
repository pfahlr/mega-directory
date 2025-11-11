def run_crawler(config):
    for target in config['targets']:
        print(f"Running crawler for category: {target['category']} in locations: {target.get('locations', [])}")
        # Implement scraping + LLM generation logic
