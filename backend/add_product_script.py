#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
Gerenciador de Produtos (CLI)
- Usa a API REST do backend se BACKEND_URL/REACT_APP_BACKEND_URL estiver definida
- Caso contrário, usa MongoDB (MONGO_URL + DB_NAME), coleção 'products'

Comandos:
  add       -> Cadastra um produto
  list      -> Lista produtos (opcionalmente por categoria)
  stock     -> Ajusta/define estoque (abs ou relativo)
  remove    -> Remove produto por ID
  update    -> Atualiza campos arbitrários de um produto por ID
  import    -> Importa produtos a partir de um arquivo JSON

Exemplos:
  python add_product_script.py add --name "Vaso Espiral" --price 49 --category "Decoração" --image "/products/vaso.jpg" --stock 12
  python add_product_script.py list --category "Miniaturas"
  python add_product_script.py stock --id 66f3... --set 20
  python add_product_script.py remove --id 66f3...
  python add_product_script.py update --id 66f3... --set-fields name="Vaso Top",price=59.9
  python add_product_script.py import --file products.json
"""

import os
import sys
import json
import argparse
import re
from typing import Any, Dict, List, Optional

# Preferimos API REST se disponível
BACKEND_URL = os.getenv("BACKEND_URL") or os.getenv("REACT_APP_BACKEND_URL")

def _to_number(maybe_str: Any) -> Optional[float]:
    if isinstance(maybe_str, (int, float)):
        return float(maybe_str)
    if isinstance(maybe_str, str):
        # tenta "R$ 59,90" ou "59,90"
        s = maybe_str.strip()
        s = re.sub(r"[R$\s]", "", s, flags=re.IGNORECASE)
        s = s.replace(".", "").replace(",", ".")
        try:
            return float(s)
        except Exception:
            return None
    return None

# ---------- Camada REST ----------
def _api_available() -> bool:
    return bool(BACKEND_URL)

def _api_get(path: str, params: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    import requests
    url = BACKEND_URL.rstrip("/") + path
    r = requests.get(url, params=params, timeout=30)
    r.raise_for_status()
    return r.json()

def _api_post(path: str, payload: Dict[str, Any]) -> Dict[str, Any]:
    import requests
    url = BACKEND_URL.rstrip("/") + path
    r = requests.post(url, json=payload, timeout=30)
    r.raise_for_status()
    return r.json()

def _api_patch(path: str, payload: Dict[str, Any]) -> Dict[str, Any]:
    import requests
    url = BACKEND_URL.rstrip("/") + path
    r = requests.patch(url, json=payload, timeout=30)
    r.raise_for_status()
    return r.json()

def _api_delete(path: str) -> Dict[str, Any]:
    import requests
    url = BACKEND_URL.rstrip("/") + path
    r = requests.delete(url, timeout=30)
    r.raise_for_status()
    try:
        return r.json()
    except Exception:
        return {"ok": True}

# ---------- Camada Mongo ----------
def _mongo_get_collection():
    try:
        from pymongo import MongoClient  # type: ignore
    except Exception:
        print("✗ pymongo não está instalado. Instale com: pip install pymongo", file=sys.stderr)
        sys.exit(1)
    MONGO_URL = os.getenv("MONGO_URL")
    DB_NAME = os.getenv("DB_NAME")
    if not MONGO_URL or not DB_NAME:
        print("✗ Defina MONGO_URL e DB_NAME para usar fallback Mongo.", file=sys.stderr)
        sys.exit(1)
    client = MongoClient(MONGO_URL)
    db = client[DB_NAME]
    return db["products"]

# ---------- Operações ----------
def add_product(args: argparse.Namespace) -> None:
    product = {
        "name": args.name,
        "price": _to_number(args.price) if args.price is not None else None,
        "image": args.image,
        "description": args.description,
        "category": args.category,
        "stock": int(args.stock) if args.stock is not None else 0,
        "buyUrl": args.buy_url,
        "active": True if args.active is None else bool(args.active),
    }
    # Remove None
    product = {k: v for k, v in product.items() if v is not None}

    if _api_available():
        created = _api_post("/api/products", product)
        print("✓ Criado via API:", json.dumps(created, ensure_ascii=False, indent=2))
    else:
        col = _mongo_get_collection()
        res = col.insert_one(product)
        print(f"✓ Criado no Mongo com _id={res.inserted_id}")

def list_products(args: argparse.Namespace) -> None:
    category = args.category
    if _api_available():
        params = {"category": category} if category and category.lower() != "todos" else None
        data = _api_get("/api/products", params=params)
        items = data if isinstance(data, list) else data.get("items", data)
    else:
        col = _mongo_get_collection()
        query = {}
        if category and category.lower() != "todos":
            query["category"] = category
        items = list(col.find(query))

    if not items:
        print("∅ Nenhum produto encontrado.")
        return

    for p in items:
        pid = str(p.get("_id") or p.get("id"))
        print(f"- id={pid} | {p.get('name')} | preço={p.get('price')} | cat={p.get('category')} | estoque={p.get('stock', 0)} | ativo={p.get('active', True)}")

def remove_product(args: argparse.Namespace) -> None:
    pid = args.id
    if not pid:
        print("✗ Passe --id", file=sys.stderr)
        sys.exit(1)

    if _api_available():
        _api_delete(f"/api/products/{pid}")
        print(f"✓ Removido via API id={pid}")
    else:
        from bson import ObjectId  # type: ignore
        col = _mongo_get_collection()
        res = col.delete_one({"_id": ObjectId(pid)}) if re.fullmatch(r"[a-f0-9]{24}", pid) else col.delete_one({"id": pid})
        if res.deleted_count:
            print(f"✓ Removido no Mongo id={pid}")
        else:
            print("∅ Nada removido (id não encontrado).")

def stock_adjust(args: argparse.Namespace) -> None:
    pid = args.id
    if args.set is None and args.add is None and args.sub is None:
        print("✗ Use um dos argumentos: --set, --add, --sub", file=sys.stderr)
        sys.exit(1)

    if _api_available():
        payload: Dict[str, Any] = {}
        if args.set is not None:
            payload["stock"] = int(args.set)
        if args.add is not None:
            payload["stock_delta"] = int(args.add)
        if args.sub is not None:
            payload["stock_delta"] = -int(args.sub)
        updated = _api_patch(f"/api/products/{pid}", payload)
        print("✓ Estoque via API:", json.dumps(updated, ensure_ascii=False, indent=2))
    else:
        from bson import ObjectId  # type: ignore
        col = _mongo_get_collection()
        if args.set is not None:
            q = {"_id": ObjectId(pid)} if re.fullmatch(r"[a-f0-9]{24}", pid) else {"id": pid}
            col.update_one(q, {"$set": {"stock": int(args.set)}})
            print(f"✓ Definido estoque={args.set}")
        else:
            delta = int(args.add or 0) - int(args.sub or 0)
            q = {"_id": ObjectId(pid)} if re.fullmatch(r"[a-f0-9]{24}", pid) else {"id": pid}
            col.update_one(q, {"$inc": {"stock": delta}})
            print(f"✓ Ajuste de estoque delta={delta}")

def update_fields(args: argparse.Namespace) -> None:
    pid = args.id
    if not args.set_fields:
        print("✗ Passe --set-fields name=\"Novo nome\",price=59.9,active=true ...", file=sys.stderr)
        sys.exit(1)

    # Parse simples: chave=valor separados por vírgula
    to_set: Dict[str, Any] = {}
    for chunk in args.set_fields.split(","):
        if "=" not in chunk:
            continue
        k, v = chunk.split("=", 1)
        k = k.strip()
        v = v.strip()
        if k == "price":
            v_parsed = _to_number(v)
            if v_parsed is None:
                print("✗ price inválido", file=sys.stderr)
                sys.exit(1)
            to_set[k] = v_parsed
        elif k in {"stock"}:
            to_set[k] = int(v)
        elif v.lower() in {"true", "false"}:
            to_set[k] = v.lower() == "true"
        else:
            to_set[k] = v

    if _api_available():
        updated = _api_patch(f"/api/products/{pid}", to_set)
        print("✓ Atualizado via API:", json.dumps(updated, ensure_ascii=False, indent=2))
    else:
        from bson import ObjectId  # type: ignore
        col = _mongo_get_collection()
        q = {"_id": ObjectId(pid)} if re.fullmatch(r"[a-f0-9]{24}", pid) else {"id": pid}
        col.update_one(q, {"$set": to_set})
        print(f"✓ Atualizado no Mongo: {to_set}")

def import_products(args: argparse.Namespace) -> None:
    path = args.file
    if not os.path.isfile(path):
        print(f"✗ Arquivo não encontrado: {path}", file=sys.stderr)
        sys.exit(1)

    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)
    if not isinstance(data, list):
        print("✗ JSON deve ser uma lista de produtos.", file=sys.stderr)
        sys.exit(1)

    def normalize(p: Dict[str, Any]) -> Dict[str, Any]:
        p = dict(p)
        if "price" in p:
            p["price"] = _to_number(p["price"])
        if "stock" in p:
            p["stock"] = int(p["stock"])
        return p

    items = [normalize(p) for p in data]

    if _api_available():
        # tenta um endpoint bulk se existir; senão, cria item a item
        try:
            created = _api_post("/api/products/bulk", {"items": items})
            print("✓ Import via API /bulk:", json.dumps(created, ensure_ascii=False, indent=2))
        except Exception:
            for p in items:
                _api_post("/api/products", p)
            print(f"✓ Import via API: {len(items)} itens criados.")
    else:
        col = _mongo_get_collection()
        res = col.insert_many(items)
        print(f"✓ Import no Mongo: {len(res.inserted_ids)} itens inseridos.")

# ---------- main ----------
def main():
    parser = argparse.ArgumentParser(description="Gerenciar produtos (API ou Mongo)")
    sub = parser.add_subparsers(dest="cmd", required=True)

    p_add = sub.add_parser("add", help="Cadastrar produto")
    p_add.add_argument("--name", required=True)
    p_add.add_argument("--price", required=True, help='Ex.: 59.9 ou "R$ 59,90"')
    p_add.add_argument("--category", required=True)
    p_add.add_argument("--image", required=True, help="URL/caminho público ex.: /products/arquivo.jpg")
    p_add.add_argument("--description", default="")
    p_add.add_argument("--stock", type=int, default=0)
    p_add.add_argument("--buy-url", dest="buy_url", default=None)
    p_add.add_argument("--active", type=int, choices=[0, 1], help="1=ativo, 0=inativo")
    p_add.set_defaults(func=add_product)

    p_list = sub.add_parser("list", help="Listar produtos")
    p_list.add_argument("--category", default=None)
    p_list.set_defaults(func=list_products)

    p_rm = sub.add_parser("remove", help="Remover produto por ID")
    p_rm.add_argument("--id", required=True)
    p_rm.set_defaults(func=remove_product)

    p_stock = sub.add_parser("stock", help="Ajustar estoque")
    g = p_stock.add_mutually_exclusive_group(required=True)
    p_stock.add_argument("--id", required=True)
    g.add_argument("--set", type=int, help="Define estoque absoluto")
    g.add_argument("--add", type=int, help="Incrementa estoque")
    g.add_argument("--sub", type=int, help="Decrementa estoque")
    p_stock.set_defaults(func=stock_adjust)

    p_upd = sub.add_parser("update", help="Atualiza campos do produto por ID")
    p_upd.add_argument("--id", required=True)
    p_upd.add_argument("--set-fields", required=True, help='Ex.: name="Vaso",price=59.9,active=true')
    p_upd.set_defaults(func=update_fields)

    p_imp = sub.add_parser("import", help="Importar produtos de um JSON")
    p_imp.add_argument("--file", required=True)
    p_imp.set_defaults(func=import_products)

    args = parser.parse_args()
    args.func(args)

if __name__ == "__main__":
    main()
