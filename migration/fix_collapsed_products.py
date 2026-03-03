#!/usr/bin/env python3
"""
fix_collapsed_products.py

Fixes "collapsed product families" -- products where multiple distinct
spirit variants (different proofs, flavors, finishes) were merged into
a single product record with many same-size UPCs.

Workflow:
  1. Looks up every UPC for a given product_id via Brave Search + Claude Haiku
  2. Groups UPCs by product title (same title + different sizes = same product)
  3. Writes a SQL migration file you can review before applying
  4. Optionally applies it directly to the database

Usage:
  # Look up UPCs and preview groupings (no DB changes)
  python fix_collapsed_products.py --product-id 64220 --dry-run

  # Generate SQL file only
  python fix_collapsed_products.py --product-id 64220 --sql-only

  # Generate SQL and apply it
  python fix_collapsed_products.py --product-id 64220 --apply

  # Scan for all products with suspicious UPC counts (analysis only)
  python fix_collapsed_products.py --scan

Requirements:
  pip install psycopg2-binary requests python-dotenv
"""

import os
import sys
import json
import time
import re
import argparse
import psycopg2
import psycopg2.extras
import requests
from pathlib import Path
from datetime import datetime
from urllib.parse import quote_plus

# -- Config ------------------------------------------------------------------

CACHE_FILE = Path(__file__).parent / "upc_lookup_cache.json"
OUTPUT_DIR = Path(__file__).parent / "output"

BRAVE_SEARCH_URL = "https://api.search.brave.com/res/v1/web/search"
ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages"
ANTHROPIC_MODEL = "claude-haiku-4-5-20251001"

SYSTEM_PROMPT = """You are a spirits/whiskey product data extraction assistant. Given web search results about a spirit product identified by a UPC barcode, extract structured product information. Return ONLY valid JSON with no additional text.

The JSON must match this schema:
{
  "name": "string or null - official product name",
  "spirit_type": "string or null - one of: whiskey, bourbon, scotch, rye, tequila, rum, gin, vodka, cognac, brandy, mezcal",
  "spirit_subtype": "string or null - e.g. 'Kentucky Straight Bourbon', 'Single Malt', 'Reposado'",
  "company_name": "string or null - parent/brand company name",
  "distiller_name": "string or null - actual distillery name",
  "proof": "number or null",
  "abv": "number or null - as percentage like 45.0",
  "age_statement": "string or null - e.g. '12 Years', 'NAS'",
  "description": "string or null - brief product description",
  "mash_bill": "string or null",
  "barrel_type": "string or null",
  "finish_type": "string or null",
  "msrp_usd": "number or null",
  "volume_ml": "number or null - standard bottle size in ml",
  "country_of_origin": "string or null",
  "region": "string or null",
  "confidence": "number 0-1 - how confident you are in the extracted data"
}

Rules:
- Only include fields you are reasonably confident about
- Set fields to null if not found or uncertain
- For proof/abv: if you have one, calculate the other (proof = abv * 2)
- confidence should reflect how much data was found and how reliable it appears
- The UPC is the primary identifier -- if the results don't clearly match a specific product for that UPC, set confidence low"""


def get_env_keys():
    """Load BRAVE_SEARCH_API_KEY and ANTHROPIC_API_KEY from env or backend/.env."""
    brave_key = os.environ.get("BRAVE_SEARCH_API_KEY", "")
    anthropic_key = os.environ.get("ANTHROPIC_API_KEY", "")

    if not brave_key or not anthropic_key:
        env_path = Path(__file__).parent.parent / "backend" / ".env"
        if env_path.exists():
            for line in env_path.read_text().splitlines():
                if line.startswith("BRAVE_SEARCH_API_KEY=") and not brave_key:
                    brave_key = line.split("=", 1)[1].strip().strip('"').strip("'")
                elif line.startswith("ANTHROPIC_API_KEY=") and not anthropic_key:
                    anthropic_key = line.split("=", 1)[1].strip().strip('"').strip("'")

    if not brave_key:
        print("ERROR: BRAVE_SEARCH_API_KEY not set. Set it as env var or in backend/.env")
        sys.exit(1)
    if not anthropic_key:
        print("ERROR: ANTHROPIC_API_KEY not set. Set it as env var or in backend/.env")
        sys.exit(1)

    return brave_key, anthropic_key


def get_db_url():
    url = os.environ.get("DATABASE_URL")
    if not url:
        env_path = Path(__file__).parent.parent / "backend" / ".env"
        if env_path.exists():
            for line in env_path.read_text().splitlines():
                if line.startswith("DATABASE_URL="):
                    url = line.split("=", 1)[1].strip()
                    break
    if not url:
        print("ERROR: DATABASE_URL not set. Set it as env var or in backend/.env")
        sys.exit(1)
    return url


# -- Cache -------------------------------------------------------------------

def load_cache():
    if CACHE_FILE.exists():
        return json.loads(CACHE_FILE.read_text())
    return {}

def save_cache(cache):
    CACHE_FILE.write_text(json.dumps(cache, indent=2))


# -- UPC Lookup via Brave Search + Claude ------------------------------------

_BROWSER_UA = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/124.0.0.0 Safari/537.36"
)


def _brave_query(query: str, brave_key: str) -> list[dict]:
    """Single Brave search call. Returns result list or []."""
    url = f"{BRAVE_SEARCH_URL}?q={quote_plus(query)}&count=5"
    resp = requests.get(url, headers={
        "Accept": "application/json",
        "Accept-Encoding": "gzip",
        "X-Subscription-Token": brave_key,
    }, timeout=15)
    if resp.status_code == 200:
        return resp.json().get("web", {}).get("results", [])
    elif resp.status_code == 429:
        print("\n  [!]  Brave rate limited -- waiting 10s...")
        time.sleep(10)
    else:
        print(f"\n  [!]  Brave HTTP {resp.status_code}")
    return []


def search_brave(upc: str, brave_key: str) -> list[dict]:
    """Search Brave for a UPC. Tries quoted then unquoted query."""
    results = _brave_query(f'"{upc}"', brave_key)
    if not results:
        time.sleep(0.3)
        results = _brave_query(upc, brave_key)
    return results


def fetch_barcode_direct(upc: str) -> list[dict]:
    """Fallback: directly fetch barcodelookup.com / go-upc.com and parse the product title."""
    sites = [
        (f"https://www.barcodelookup.com/{upc}", [
            r'<h4[^>]*class="[^"]*product-details[^"]*"[^>]*>([^<]+)<',
            r'<h4[^>]*>([^<]{8,80})</h4>',
            r'<h1[^>]*>([^<]{8,80})</h1>',
        ]),
        (f"https://go-upc.com/barcode/{upc}", [
            r'<h1[^>]*>([^<]{8,80})</h1>',
            r'"name"\s*:\s*"([^"]{8,80})"',
        ]),
    ]
    for url, patterns in sites:
        try:
            resp = requests.get(url, headers={
                "User-Agent": _BROWSER_UA,
                "Accept": "text/html,application/xhtml+xml",
                "Accept-Language": "en-US,en;q=0.9",
            }, timeout=12, allow_redirects=True)
            if not resp.ok or len(resp.text) < 500:
                time.sleep(0.5)
                continue
            html = resp.text
            for pattern in patterns:
                m = re.search(pattern, html, re.IGNORECASE)
                if m:
                    title = re.sub(r"<[^>]+>", "", m.group(1)).strip()
                    # Skip generic/error page titles
                    if (len(title) > 8 and upc not in title
                            and "not found" not in title.lower()
                            and "barcode" not in title.lower()
                            and "lookup" not in title.lower()):
                        return [{"title": title, "description": f"Source: {url}", "url": url}]
            time.sleep(0.5)
        except Exception:
            time.sleep(0.5)
    return []


def extract_with_claude(upc: str, search_results: list[dict], anthropic_key: str) -> dict | None:
    """Pass Brave results to Claude Haiku and extract structured product info."""
    if not search_results:
        return None

    search_text = "\n\n".join(
        f"[{i+1}] {r.get('title','')}\n{r.get('description','')}\nURL: {r.get('url','')}"
        for i, r in enumerate(search_results)
    )

    user_prompt = f'Extract product data for UPC: "{upc}"\n\nSearch results:\n{search_text}'

    body = {
        "model": ANTHROPIC_MODEL,
        "max_tokens": 512,
        "system": SYSTEM_PROMPT,
        "messages": [{"role": "user", "content": user_prompt}],
    }

    headers = {
        "Content-Type": "application/json",
        "x-api-key": anthropic_key,
        "anthropic-version": "2023-06-01",
    }

    resp = requests.post(ANTHROPIC_API_URL, json=body, headers=headers, timeout=30)
    if not resp.ok:
        print(f"\n  [!]  Anthropic HTTP {resp.status_code}: {resp.text[:200]}")
        return None

    data = resp.json()
    text_block = next((c for c in data.get("content", []) if c.get("type") == "text"), None)
    if not text_block:
        return None

    raw = text_block["text"].strip()
    if raw.startswith("```"):
        raw = re.sub(r"^```(?:json)?\s*", "", raw).rstrip("`").strip()

    try:
        result = json.loads(raw)
        return result if isinstance(result, dict) else None
    except json.JSONDecodeError:
        print(f"\n  [!]  JSON parse error for UPC {upc}")
        return None


def lookup_upc(upc: str, cache: dict, brave_key: str, anthropic_key: str) -> dict | None:
    """Look up a UPC using Brave Search + Claude Haiku. Caches results."""
    if upc in cache:
        return cache[upc]

    results = search_brave(upc, brave_key)
    time.sleep(0.5)  # be polite to Brave

    if not results:
        # Fallback: fetch barcode lookup sites directly
        results = fetch_barcode_direct(upc)
        if results:
            print("(direct) ", end="", flush=True)

    if not results:
        cache[upc] = None
        save_cache(cache)
        return None

    info = extract_with_claude(upc, results, anthropic_key)
    time.sleep(0.3)  # small pause between Claude calls

    cache[upc] = info
    save_cache(cache)
    return info


# -- Normalisation helpers ----------------------------------------------------

def slugify(name: str) -> str:
    s = name.lower()
    s = re.sub(r"[''']", "", s)
    s = re.sub(r"[^a-z0-9]+", "-", s)
    return s.strip("-")

def extract_proof(text: str) -> float | None:
    patterns = [
        r"(\d+(?:\.\d+)?)\s*(?:proof|pf)\b",
        r"\b(\d+(?:\.\d+)?)\s*proof",
    ]
    for p in patterns:
        m = re.search(p, text, re.IGNORECASE)
        if m:
            return float(m.group(1))
    return None

def extract_abv(text: str) -> float | None:
    m = re.search(r"(\d+(?:\.\d+)?)\s*%\s*(?:ABV|alc)", text, re.IGNORECASE)
    if m:
        return float(m.group(1)) / 100.0
    return None

def normalise_title(title: str) -> str:
    t = title.strip()
    # Remove size indicators
    t = re.sub(r"\b\d+\s*(?:ml|ML|oz|OZ|fl oz|liter|litre|L)\b", "", t, flags=re.IGNORECASE)
    # "Ole Smoky Tennessee X" -> "Ole Smoky X"
    t = re.sub(r"\bOle\s+Smoky\s+Tennessee\b", "Ole Smoky", t, flags=re.IGNORECASE)
    # Strip trailing "Moonshine" (generic label, not a differentiator)
    t = re.sub(r"\s+Moonshine\s*$", "", t, flags=re.IGNORECASE)
    # Strip "Mini Shot" (size indicator)
    t = re.sub(r"\s+Mini\s+Shot\b", "", t, flags=re.IGNORECASE)
    t = re.sub(r"\s+", " ", t).strip()
    return t


# -- Database helpers ---------------------------------------------------------

def get_product_info(cur, product_id: int) -> dict:
    cur.execute("""
        SELECT p.id, p.name, p.company_id, p.spirit_type, p.spirit_subtype,
               c.name AS company_name
        FROM products p
        LEFT JOIN companies c ON c.id = p.company_id
        WHERE p.id = %s
    """, (product_id,))
    row = cur.fetchone()
    if not row:
        print(f"ERROR: Product {product_id} not found")
        sys.exit(1)
    return dict(zip(["id","name","company_id","spirit_type","spirit_subtype","company_name"], row))

def get_product_upcs(cur, product_id: int) -> list[dict]:
    cur.execute("""
        SELECT upc, size_ml, container_type, is_canonical
        FROM product_upcs WHERE product_id = %s ORDER BY upc
    """, (product_id,))
    return [dict(zip(["upc","size_ml","container_type","is_canonical"], r)) for r in cur.fetchall()]

def scan_collapsed(cur) -> list[dict]:
    cur.execute("""
        SELECT p.id, p.name, p.spirit_type, p.spirit_subtype,
               count(*) AS upc_count
        FROM product_upcs pu
        JOIN products p ON p.id = pu.product_id
        WHERE pu.size_ml = 750
        GROUP BY p.id, p.name, p.spirit_type, p.spirit_subtype
        HAVING count(*) > 2
        ORDER BY upc_count DESC
        LIMIT 30
    """)
    return [dict(zip(["id","name","spirit_type","spirit_subtype","upc_count"], r)) for r in cur.fetchall()]


# -- SQL generation -----------------------------------------------------------

def generate_sql(product: dict, groups: dict, unidentified: list) -> str:
    lines = []
    ts = datetime.now().strftime("%Y-%m-%d %H:%M")
    lines.append(f"-- Generated by fix_collapsed_products.py at {ts}")
    lines.append(f"-- Source product: {product['name']} (id={product['id']})")
    lines.append(f"-- Groups: {len(groups)} distinct products, {len(unidentified)} unidentified UPCs")
    lines.append("")
    lines.append("BEGIN;")
    lines.append("")

    group_list = sorted(groups.items())

    # The first group keeps the existing product record (we'll rename it)
    first_title, first_upcs = group_list[0]
    canonical_upc = next((u for u in first_upcs if u["size_ml"] == 750), first_upcs[0])["upc"]
    proof = first_upcs[0].get("proof")
    abv = first_upcs[0].get("abv")
    slug = slugify(first_title)

    lines.append(f"-- Update existing product {product['id']} -> {first_title}")
    set_parts = [
        f"name = {pg_str(first_title)}",
        f"slug = {pg_str(slug)}",
        f"upc = {pg_str(canonical_upc)}",
    ]
    if proof:
        set_parts.append(f"proof = {proof}")
    if abv:
        set_parts.append(f"abv = {abv}")
    set_parts.append("updated_at = NOW()")
    lines.append(f"UPDATE products SET {', '.join(set_parts)} WHERE id = {product['id']};")
    lines.append("")

    # Remove UPCs from the existing record that belong to other groups
    all_other_upcs = []
    for title, upcs in group_list[1:]:
        all_other_upcs.extend([u["upc"] for u in upcs])

    if all_other_upcs:
        upc_list = ", ".join(f"'{u}'" for u in all_other_upcs)
        lines.append(f"-- Remove UPCs belonging to other products from {product['id']}")
        lines.append(f"DELETE FROM product_upcs WHERE product_id = {product['id']} AND upc IN ({upc_list});")
        lines.append("")

    # Create new product records for remaining groups
    if len(group_list) > 1:
        lines.append("-- Create new product records for remaining groups")

        cte_parts = []
        upc_selects = []

        for i, (title, upcs) in enumerate(group_list[1:], 1):
            alias = f"p{i}"
            canonical = next((u for u in upcs if u["size_ml"] == 750), upcs[0])
            c_upc = canonical["upc"]
            p = canonical.get("proof")
            a = canonical.get("abv")
            new_slug = slugify(title)

            insert_cols = ["company_id","name","slug","upc","spirit_type","spirit_subtype","approval_status"]
            insert_vals = [
                str(product["company_id"]),
                pg_str(title),
                pg_str(new_slug),
                pg_str(c_upc),
                pg_str(product["spirit_type"]),
                pg_str(product["spirit_subtype"] or ""),
                "'approved'",
            ]
            if p:
                insert_cols.append("proof")
                insert_vals.append(str(p))
            if a:
                insert_cols.append("abv")
                insert_vals.append(str(a))

            cte_parts.append(
                f"{alias} AS (\n"
                f"  INSERT INTO products ({', '.join(insert_cols)})\n"
                f"  VALUES ({', '.join(insert_vals)})\n"
                f"  RETURNING id)"
            )

            for u in upcs:
                upc_selects.append(
                    f"  SELECT id, '{u['upc']}', {u['size_ml'] or 'NULL'}, "
                    f"'Glass Bottle', 'upc-lookup', TRUE FROM {alias}"
                )

        if cte_parts:
            lines.append("WITH " + ",\n".join(cte_parts) + ",")
            lines.append("new_upcs AS (")
            lines.append("  INSERT INTO product_upcs (product_id, upc, size_ml, container_type, source, is_canonical)")
            lines.append("  " + "\n  UNION ALL\n  ".join(upc_selects))
            lines.append("  RETURNING product_id, upc")
            lines.append(")")
            lines.append("SELECT product_id, upc FROM new_upcs ORDER BY upc;")
            lines.append("")

    if unidentified:
        lines.append("-- Unidentified UPCs left on original product (review manually):")
        for u in unidentified:
            lines.append(f"--   {u['upc']} ({u['size_ml']}ml)")
        lines.append("")

    lines.append("COMMIT;")
    return "\n".join(lines)

def pg_str(s: str) -> str:
    if s is None:
        return "NULL"
    return "'" + s.replace("'", "''") + "'"


# -- Main commands ------------------------------------------------------------

def cmd_scan(cur):
    rows = scan_collapsed(cur)
    print(f"\n{'ID':>6}  {'UPCs':>5}  {'Name'}")
    print("-" * 60)
    for r in rows:
        print(f"{r['id']:>6}  {r['upc_count']:>5}  {r['name']}")
    print(f"\nRun with --product-id <ID> to investigate a specific product.")


def cmd_fix(cur, product_id: int, dry_run: bool, sql_only: bool, apply: bool):
    brave_key, anthropic_key = get_env_keys()

    product = get_product_info(cur, product_id)
    upcs = get_product_upcs(cur, product_id)

    print(f"\nProduct: {product['name']} (id={product['id']}, company: {product['company_name']})")
    print(f"Spirit: {product['spirit_type']} / {product['spirit_subtype']}")
    print(f"UPCs to look up: {len(upcs)}\n")

    cache = load_cache()
    groups = {}      # normalised_title -> list of upc_dicts
    unidentified = []

    for row in upcs:
        upc = row["upc"]
        cached = upc in cache
        print(f"  {upc} ({row['size_ml']}ml) {'[cached]' if cached else ''}  ", end="", flush=True)
        info = lookup_upc(upc, cache, brave_key, anthropic_key)

        if info and info.get("name"):
            raw_title = info["name"]
            norm = normalise_title(raw_title)
            proof = info.get("proof")
            abv_pct = info.get("abv")
            # abv from Claude comes as a percentage (e.g. 45.0), store as fraction
            abv = abv_pct / 100.0 if abv_pct and abv_pct > 1 else abv_pct
            if not proof and abv:
                proof = abv * 200
            if not abv and proof:
                abv = proof / 200
            conf = info.get("confidence", 0)
            print(f"-> {raw_title} (conf={conf:.2f})")

            if norm not in groups:
                groups[norm] = []
            groups[norm].append({**row, "title": raw_title, "proof": proof, "abv": abv})
        else:
            print("-> not found")
            unidentified.append(row)

    print(f"\n{'='*60}")
    print(f"Distinct products identified: {len(groups)}")
    print(f"Unidentified UPCs:            {len(unidentified)}")
    print()

    for title, items in sorted(groups.items()):
        sizes = sorted(set(str(u["size_ml"]) + "ml" for u in items))
        proof_val = items[0].get("proof")
        proof_str = f"  [{proof_val:.0f}pf]" if proof_val else ""
        print(f"  * {title}{proof_str}")
        print(f"    {', '.join(sizes)}  ({len(items)} UPC{'s' if len(items)>1 else ''})")

    if unidentified:
        print(f"\nUnidentified:")
        for u in unidentified:
            print(f"  * {u['upc']} ({u['size_ml']}ml)")

    if len(groups) == 0:
        print("\n[!] No products identified -- all UPCs unrecognised. Nothing to generate.")
        print("    Try clearing upc_lookup_cache.json and re-running, or fix manually.")
        return

    if len(groups) == 1 and not unidentified:
        print("\n[OK] Only one distinct product found -- no fix needed.")
        return

    sql = generate_sql(product, groups, unidentified)

    OUTPUT_DIR.mkdir(exist_ok=True)
    out_file = OUTPUT_DIR / f"fix_product_{product_id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.sql"
    out_file.write_text(sql)
    print(f"\nSQL written to: {out_file}")

    if dry_run or sql_only:
        print("\n-- SQL Preview --")
        print(sql)
        return

    if apply:
        print("\nApplying SQL to database...")
        conn2 = psycopg2.connect(get_db_url())
        try:
            with conn2.cursor() as c2:
                c2.execute(sql)
            conn2.commit()
            print("[OK] Done.")
        except Exception as e:
            conn2.rollback()
            print(f"[FAIL] Error: {e}")
            print(f"  SQL saved to {out_file} -- fix and apply manually.")
        finally:
            conn2.close()
    else:
        print(f"\nReview {out_file} then run with --apply to commit.")


def main():
    parser = argparse.ArgumentParser(description="Fix collapsed product families")
    parser.add_argument("--product-id", type=int, help="Product ID to fix")
    parser.add_argument("--scan", action="store_true", help="Scan for collapsed products")
    parser.add_argument("--dry-run", action="store_true", help="Show groupings + SQL, no DB changes")
    parser.add_argument("--sql-only", action="store_true", help="Write SQL file only, don't apply")
    parser.add_argument("--apply", action="store_true", help="Apply SQL to database after generating it")
    parser.add_argument("--debug-upc", metavar="UPC", help="Debug: show raw Brave + Claude output for one UPC")
    args = parser.parse_args()

    if args.debug_upc:
        brave_key, anthropic_key = get_env_keys()
        upc = args.debug_upc
        print(f"\nBrave key loaded: {'YES (' + brave_key[:6] + '...)' if brave_key else 'NO'}")
        print(f"Anthropic key loaded: {'YES' if anthropic_key else 'NO'}")

        # Raw Brave call so we can see the actual status + body
        query = f'"{upc}"'
        url = f"{BRAVE_SEARCH_URL}?q={quote_plus(query)}&count=5"
        print(f"\nGET {url}")
        raw = requests.get(url, headers={
            "Accept": "application/json",
            "X-Subscription-Token": brave_key,
        }, timeout=15)
        print(f"HTTP {raw.status_code}")
        data = raw.json() if raw.ok else {}
        results = data.get("web", {}).get("results", [])
        print(f"Results: {len(results)}")
        if not raw.ok:
            print(f"Body: {raw.text[:400]}")
        for i, r in enumerate(results):
            print(f"  [{i+1}] {r.get('title','')}")
            print(f"       {r.get('description','')[:120]}")
            print(f"       {r.get('url','')}")

        print(f"\nClaude extraction:")
        info = extract_with_claude(upc, results, anthropic_key)
        print(json.dumps(info, indent=2) if info else "  None returned")
        sys.exit(0)

    if not args.scan and not args.product_id:
        parser.print_help()
        sys.exit(0)

    db_url = get_db_url()
    conn = psycopg2.connect(db_url)
    cur = conn.cursor()

    try:
        if args.scan:
            cmd_scan(cur)
        else:
            cmd_fix(cur, args.product_id, args.dry_run, args.sql_only, args.apply)
    finally:
        cur.close()
        conn.close()


if __name__ == "__main__":
    main()
