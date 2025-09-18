import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Configuração do axios
const apiClient = axios.create({
  baseURL: API,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para tratamento de erros
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error);
    return Promise.reject(error);
  }
);

// Produtos
export const productsAPI = {
  getAll: async (category = null) => {
    const params = category && category !== 'Todos' ? { category } : {};
    const response = await apiClient.get('/products', { params });
    return response.data;
  },
  
  getById: async (id) => {
    const response = await apiClient.get(`/products/${id}`);
    return response.data;
  }
};

// Contato
export const contactAPI = {
  send: async (contactData) => {
    const response = await apiClient.post('/contact', contactData);
    return response.data;
  },
  
  getAll: async () => {
    const response = await apiClient.get('/contact');
    return response.data;
  }
};

// Informações da empresa
export const companyAPI = {
  getInfo: async () => {
    const response = await apiClient.get('/company-info');
    return response.data;
  }
};

// Health check
export const healthAPI = {
  check: async () => {
    const response = await apiClient.get('/health');
    return response.data;
  }
};

export default apiClient;

// ...mantenha o que já existe (axios apiClient etc.)

export const productsAPI = {
  getAll: async (category = 'Todos') => {
    try {
      const params = category && category !== 'Todos' ? { category } : {};
      const response = await apiClient.get('/products', { params });
      return response.data;
    } catch (e) {
      // Fallback para JSON estático
      const res = await fetch('/data/products.json', { cache: 'no-store' });
      const list = await res.json();
      const filtered =
        category && category !== 'Todos'
          ? list.filter((p) => (p.category || '').toLowerCase() === category.toLowerCase())
          : list;
      return filtered.map((p) => ({ ...p, price: Number(p.price) }));
    }
  },

  getById: async (id) => {
    try {
      const response = await apiClient.get(`/products/${id}`);
      return response.data;
    } catch {
      const res = await fetch('/data/products.json', { cache: 'no-store' });
      const list = await res.json();
      const p = list.find((x) => String(x.id) === String(id));
      if (!p) throw new Error('Produto não encontrado');
      return { ...p, price: Number(p.price) };
    }
  },
};
