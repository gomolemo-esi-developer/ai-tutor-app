#!/usr/bin/env python3
import yaml
import sys

try:
    with open('aitutor-complete.yaml', 'r') as f:
        yaml.safe_load(f)
    print("✓ YAML syntax is valid!")
    sys.exit(0)
except yaml.YAMLError as e:
    print("✗ YAML syntax error:")
    print(e)
    sys.exit(1)
except Exception as e:
    print(f"✗ Error: {e}")
    sys.exit(1)
