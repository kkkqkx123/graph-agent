#!/usr/bin/env python3
"""
Batch replace 'stratum' -> 'layertwine' and 'Stratum' -> 'Layertwine' in markdown docs.
"""

import os
import re
import sys

ROOT = r"D:\项目\agent\wf-agent"

# Files to process (relative to ROOT)
MD_FILES = [
    "docs/integration/README.md",
    "docs/integration/01-layertwine-enhancement-specification.md",
    "docs/integration/02-final-architecture-design.md",
    "docs/integration/03-migration-guide.md",
    "docs/analysis/checkpoint-stratum-integration-analysis.md",
    "docs/analysis/checkpoint-stratum-responsibility-division.md",
    "docs/plan/layertwine-integration-plan.md",
]

# Also update the reference in README.md to the old filename
FILENAME_RENAMES = [
    ("01-stratum-enhancement-specification.md", "01-layertwine-enhancement-specification.md"),
]

# Replacement rules: (pattern, replacement)
# Order matters: longer/more specific patterns first
REPLACEMENTS = [
    # File paths and references
    ("crates/strateg", "crates/strateg"),  # skip non-stratum paths just in case
    # Class/type names: Stratum -> Layertwine
    ("StratumExecutor", "LayertwineExecutor"),
    ("StratumProcessManager", "LayertwineProcessManager"),
    ("StratumDeploy", "LayertwineDeploy"),
    ("StratumInit", "LayertwineInit"),
    ("StratumEdit", "LayertwineEdit"),
    ("StratumStatus", "LayertwineStatus"),
    ("StratumPartition", "LayertwinePartition"),
    ("StratumCommit", "LayertwineCommit"),
    ("StratumLog", "LayertwineLog"),
    ("StratumCheckpoint", "LayertwineCheckpoint"),
    ("StratumBranch", "LayertwineBranch"),
    ("StratumAgent", "LayertwineAgent"),
    ("StratumApprove", "LayertwineApprove"),
    ("StratumBackup", "LayertwineBackup"),
    ("StratumBacked", "LayertwineBacked"),
    ("stratum-grpc", "layertwine-grpc"),
    # Service name in gRPC
    ('"stratum.Stratum"', '"layertwine.Layertwine"'),
    # Generic word replacements (lowercase)
    ("mapTsToStratum", "mapTsToLayertwine"),
    ("mapStratumToTs", "mapLayertwineToTs"),
    ("stratum-centric", "layertwine-centric"),
    ("Stratum-Centric", "Layertwine-Centric"),
    # File path references in imports/code
    ('implementations/str"', 'implementations/layertwine'),
    ('from "./stratum/', 'from "./layertwine/'),
    ('stratum-process', 'layertwine-process'),
    # General word replacement (must come after more specific patterns)
    ("stratum", "layertwine"),
    ("Stratum", "Layertwine"),
]


def apply_replacements(text: str) -> tuple[str, int]:
    total_count = 0
    for pattern, replacement in REPLACEMENTS:
        count = text.count(pattern)
        if count > 0:
            text = text.replace(pattern, replacement)
            total_count += count
    return text, total_count


def process_file(filepath: str) -> int:
    with open(filepath, "r", encoding="utf-8") as f:
        original = f.read()

    updated, count = apply_replacements(original)

    if count > 0:
        with open(filepath, "w", encoding="utf-8") as f:
            f.write(updated)
        print(f"  [{count:4d} replacements] {filepath}")
    else:
        print(f"  [  0 replacements] {filepath}")

    return count


def main():
    total = 0
    print("=" * 60)
    print("Batch replacing stratum -> layertwine in markdown docs")
    print("=" * 60)

    for rel_path in MD_FILES:
        abs_path = os.path.join(ROOT, rel_path)
        if os.path.exists(abs_path):
            total += process_file(abs_path)
        else:
            print(f"  [  SKIP (not found) ] {rel_path}")

    print("=" * 60)
    print(f"Total replacements: {total}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
