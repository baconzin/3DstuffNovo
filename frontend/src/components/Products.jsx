import React, { useEffect, useState } from "react";
import { Button } from "./ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { ShoppingCart, Eye, Filter, Loader2 } from "lucide-react";
import { productsAPI } from "../services/api";
import { PaymentModal } from "./PaymentModal";

export const Products = () => {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState(["Todos"]);
  const [selectedCategory, setSelectedCategory] = useState("Todos");
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const data = await productsAPI.getAll(selectedCategory);
        setProducts(data);
        if (selectedCategory === "Todos") {
          const unique = [
            "Todos",
            ...Array.from(new Set(data.map((p) => p.category).filter(Boolean))),
          ];
          setCategories(unique);
        }
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [selectedCategory]);

  const formatPrice = (price) =>
    typeof price === "number"
      ? price.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
      : String(price || "");

  const handleBuyClick = (product) => {
    if (product.buyUrl) {
      window.open(product.buyUrl, "_blank");
      return;
    }
    setSelectedProduct(product);
    setIsPaymentModalOpen(true);
  };

  if (loading) {
    return (
      <section id="products" className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center">
            <Loader2 className="mx-auto h-12 w-12 animate-spin text-blue-500" />
            <p className="mt-4 text-gray-600">Carregando produtos...</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section id="products" className="py-20 bg-white">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
            Nossos <span className="text-blue-500">Produtos</span>
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Descubra nossa coleção exclusiva de itens impressos em 3D.
          </p>
        </div>

        {/* Filtro de categorias */}
        <div className="flex flex-wrap justify-center gap-3 mb-12">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="h-5 w-5 text-gray-500" />
            <span className="text-gray-700 font-medium">Filtrar por</span>
          </div>
          {categories.map((c) => (
            <Button
              key={c}
              variant={selectedCategory === c ? "default" : "outline"}
              onClick={() => setSelectedCategory(c)}
              className={`transition-all ${
                selectedCategory === c
                  ? "bg-blue-500 hover:bg-blue-600 text-white"
                  : "hover:border-blue-500 hover:text-blue-500"
              }`}
            >
              {c}
            </Button>
          ))}
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {products.map((p) => (
            <Card
              key={p.id || p._id || p.name}
              className="group hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2 border-0 shadow-md overflow-hidden"
            >
              <CardHeader className="p-0">
                <div className="relative overflow-hidden">
                  <img
                    src={p.image || "/placeholder.jpg"}
                    alt={p.name}
                    className="w-full h-64 object-cover transition-transform duration-300 group-hover:scale-110"
                    loading="lazy"
                  />
                  {p.category && (
                    <div className="absolute top-4 right-4">
                      <Badge variant="secondary" className="bg-white/90 text-gray-700">
                        {p.category}
                      </Badge>
                    </div>
                  )}
                </div>
              </CardHeader>

              <CardContent className="p-6">
                <CardTitle className="text-xl font-bold text-gray-900 mb-3 group-hover:text-blue-500 transition-colors">
                  {p.name}
                </CardTitle>
                <p className="text-gray-600 mb-4 leading-relaxed line-clamp-3">
                  {p.description}
                </p>
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-bold text-blue-500">
                    {formatPrice(p.price)}
                  </span>
                </div>
              </CardContent>

              <CardFooter className="p-6 pt-0 flex gap-3">
                <Button
                  onClick={() => handleBuyClick(p)}
                  className="flex-1 bg-blue-500 hover:bg-blue-600 text-white transition-all duration-200 transform hover:scale-105"
                >
                  <ShoppingCart className="mr-2 h-4 w-4" />
                  Comprar
                </Button>
                <Button
                  variant="outline"
                  onClick={() =>
                    alert(
                      "Página de detalhes em breve. Entre em contato para mais informações!"
                    )
                  }
                  className="hover:border-blue-500 hover:text-blue-500 transition-all duration-200"
                >
                  <Eye className="h-4 w-4" />
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>

        {!products.length && (
          <div className="text-center py-12 text-gray-500">
            Nenhum produto encontrado.
          </div>
        )}

        <PaymentModal
          product={selectedProduct}
          isOpen={isPaymentModalOpen}
          onClose={() => {
            setIsPaymentModalOpen(false);
            setSelectedProduct(null);
          }}
          onSuccess={() => {
            setIsPaymentModalOpen(false);
            setSelectedProduct(null);
            alert("Pagamento confirmado! Obrigado pela compra.");
          }}
        />
      </div>
    </section>
  );
};
