## Rewrap SOPS file with new recipients from .sops.yaml
## Usage: make sops-updatekeys [FILE=env.json]
sops-updatekeys:
        @file="$(FILE)"; if [ -z "$$file" ]; then file=env.json; fi; \
        if ! command -v sops >/dev/null 2>&1; then echo "sops not found; install sops first"; exit 1; fi; \
        if [ ! -f "$$file" ]; then echo "File not found: $$file"; exit 1; fi; \
        sops updatekeys "$$file"

## Decrypt a SOPS file to stdout (or redirect to a file)
## Usage: make sops-decrypt [FILE=env.json]
sops-decrypt:
        @file="$(FILE)"; if [ -z "$$file" ]; then file=env.json; fi; \
        if ! command -v sops >/dev/null 2>&1; then echo "sops not found; install sops first"; exit 1; fi; \
        if [ ! -f "$$file" ]; then echo "File not found: $$file"; exit 1; fi; \
        sops -d "$$file"

## Print export lines for env.json
## Usage: make sops-env-export [FILE=env.json]
sops-env-export:
        @file="$(FILE)"; if [ -z "$$file" ]; then file=env.json; fi; \
        if ! command -v sops >/dev/null 2>&1; then echo "sops not found; install sops first"; exit 1; fi; \
        if ! command -v jq >/dev/null 2>&1; then echo "jq not found; install jq first"; exit 1; fi; \
        if [ ! -f "$$file" ]; then echo "File not found: $$file"; exit 1; fi; \
        sops -d --output-type json "$$file" | sed -e "s|_pt||g;s|_unencrypted||g" | jq -r 'to_entries[] | "export \(.key)=\(.value|@sh)"'
