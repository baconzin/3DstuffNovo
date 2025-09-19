# Guia de Gestão de Produtos (CLI)

Estes utilitários permitem **cadastrar, listar, atualizar estoque e remover** produtos
usando **a API do backend** (preferencial) ou **diretamente no MongoDB** como fallback.

## Variáveis de ambiente necessárias

### Via API (preferido)
- `BACKEND_URL` **ou** `REACT_APP_BACKEND_URL`
  - Ex.: `https://api.3dstuff.com.br`

Endpoints esperados (ajuste aqui conforme seu backend):
- `POST /api/products` → cria produto
- `GET /api/products` → lista; aceita `?category=...`
- `PATCH /api/products/:id` → atualiza campos (estoque, preço, etc.)
- `DELETE /api/products/:id` → remove

### Via MongoDB (fallback)
- `MONGO_URL` (ex.: `mongodb+srv://user:pass@cluster/...`)
- `DB_NAME` (ex.: `prod`)
- Coleção: `products`

> Se `BACKEND_URL/REACT_APP_BACKEND_URL` não estiver definida, os scripts tentam Mongo automaticamente.

---

## Scripts disponíveis

### 1) `add_product_script.py` (CLI completo)
```bash
# ajuda
python backend/add_product_script.py -h
python backend/add_product_script.py add -h
python backend/add_product_script.py list -h
python backend/add_product_script.py stock -h
python backend/add_product_script.py update -h
python backend/add_product_script.py remove -h
python backend/add_product_script.py import -h
