#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
Atalho rápido para cadastrar um produto.

Exemplo:
  python quick_add_product.py \
    --name "Miniatura Grogu" \
    --price "R$ 59,90" \
    --category "Miniaturas" \
    --image "/products/grogu-mini.jpg" \
    --description "Miniatura 3D de 8cm — PLA premium." \
    --stock 8 \
    --buy-url "https://wa.me/5519971636969?text=Quero%20Grogu"

Usa API se BACKEND_URL/REACT_APP_BACKEND_URL existir; senão, Mongo (MONGO_URL + DB_NAME).
"""

import os
import re
import sys
import argparse
import json

BACKEND_URL = os.getenv("BACKEND_URL") or os.getenv("REACT_APP_BACKEND_URL")

def _to_number(s):
    if isinstance(s, (int, float)): return float(s)
    s = str(s).strip()
    s = re.sub(r"[R$\s]", "", s, flags=re.IGNORECASE)
    s = s.replace(".", "").replace(",", ".")
    return float(s)

def create_via_api(payload):
    import requests
    url = BACKEND_URL.rstrip("/") + "/api/products"
    r = requests.post(url, json=payload, timeout=30)
    r.raise_for_status()
    return r.json()

def create_via_mongo(payload):
    from pymongo import MongoClient  # type: ignore
    MONGO_URL = os.getenv("MONGO_URL")
    DB_NAME = os.getenv("DB_NAME")
    if not MONGO_URL or not DB_NAME:
        print("✗ Defina MONGO_URL e DB_NAME ou use BACKEND_URL/REACT_APP_BACKEND_URL.", file=sys.stderr)
        sys.exit(1)
    client = MongoClient(MONGO_URL)
    db = client[DB_NAME]
    res = db["products"].insert_one(payload)
    return {"ok": True, "inserted_id": str(res.inserted_id)}

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--name", required=True)
    ap.add_argument("--price", required=True)
    ap.add_argument("--category", required=True)
    ap.add_argument("--image", required=True)
    ap.add_argument("--description", default="")
    ap.add_argument("--stock", type=int, default=0)
    ap.add_argument("--buy-url", dest="buy_url", default=None)
    args = ap.parse_args()

    payload = {
        "name": args.name,
        "price": _to_number(args.price),
        "category": args.category,
        "image": args.image,
        "description": args.description,
        "stock": args.stock,
        "buyUrl": args.buy_url,
        "active": True,
    }

    try:
        if BACKEND_URL:
            created = create_via_api(payload)
            print("✓ Criado via API:", json.dumps(created, ensure_ascii=False, indent=2))
        else:
            created = create_via_mongo(payload)
            print("✓ Criado no Mongo:", json.dumps(created, ensure_ascii=False, indent=2))
    except Exception as e:
        print(f"✗ Erro ao criar produto: {e}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()
