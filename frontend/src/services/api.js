// frontend/src/services/api.js
import axios from "axios";

const BASE_URL = process.env.REACT_APP_BACKEND_URL || "";

// Cliente axios só é útil se houver BASE_URL
export const apiClient = axios.create({
  baseURL: BASE_URL || "/api",
  timeout: 20000,
  headers: { "Content-Type": "application/json" },
});

// ========= Produtos =========
export const productsAPI = {
  async getAll(category = "Todos") {
    // 1) Tenta backend, se houver URL
    if (BASE_URL) {
      try {
        const params =
          category && category !== "Todos" ? { category } : undefined;
        const { data } = await apiClient.get("/products", { params });
        const list = Array.isArray(data) ? data : data?.items || [];
        if (list.length) return list;
      } catch (e) {
        console.warn("productsAPI: backend falhou; usando JSON estático.", e?.message || e);
      }
    }

    // 2) Fallback: JSON estático em /public/data/products.json
    const res = await fetch("/data/products.json", { cache: "no-store" });
    const list = await res.json();
    const filtered =
      category && category !== "Todos"
        ? list.filter(
            (p) =>
              (p.category || "").toLowerCase() === category.toLowerCase()
          )
        : list;
    // normaliza preço para número quando possível
    return filtered.map((p) =>
      typeof p.price === "string"
        ? { ...p, price: Number(String(p.price).replace(/[^\d,]/g, "").replace(",", ".")) }
        : p
    );
  },

  async getById(id) {
    if (BASE_URL) {
      try {
        const { data } = await apiClient.get(`/products/${id}`);
        return data;
      } catch (e) {
        console.warn("productsAPI.getById: backend falhou; usando JSON.", e?.message || e);
      }
    }
    const res = await fetch("/data/products.json", { cache: "no-store" });
    const list = await res.json();
    const p = list.find((x) => String(x.id) === String(id));
    if (!p) throw new Error("Produto não encontrado");
    return p;
  },
};

// ========= Contato =========
export const contactAPI = {
  async send(payload) {
    // Preferência: backend, se existir
    if (BASE_URL) {
      try {
        const { data } = await apiClient.post("/contact", payload);
        return data;
      } catch (e) {
        console.warn("contactAPI: backend falhou; usando FormSubmit.", e?.message || e);
      }
    }

    // Fallback com FormSubmit
    const endpoint = "https://formsubmit.co/ajax/contato@3dstuff.com.br";
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        name: payload.name,
        email: payload.email,
        message: payload.message,
        _subject: "Nova mensagem pelo site 3D Stuff",
        _captcha: false,
        _template: "table",
        source: "3dstuff.com.br",
      }),
    });
    if (!res.ok) throw new Error("Falha no FormSubmit");
    return res.json();
  },
};

// ========= Empresa (fallback simples) =========
export const companyAPI = {
  async getInfo() {
    if (BASE_URL) {
      try {
        const { data } = await apiClient.get("/company/info");
        return data;
      } catch (e) {
        console.warn("companyAPI: backend falhou; usando defaults.", e?.message || e);
      }
    }
    return {
      name: "3D Stuff",
      email: "contato@3dstuff.com.br",
      social_media: {
        instagram: "@3dstuff",
        facebook: "3DStuff",
        tiktok: "@3dstuff",
      },
    };
  },
};
