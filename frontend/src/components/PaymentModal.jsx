import React, { useEffect, useState } from "react";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { X, CreditCard, Smartphone, FileText, Loader2 } from "lucide-react";
import { initMercadoPago, CardPayment } from "@mercadopago/sdk-react";

const PUBLIC_KEY = process.env.REACT_APP_MERCADO_PAGO_PUBLIC_KEY;

export const PaymentModal = ({ product, isOpen, onClose, onSuccess }) => {
  const [selectedMethod, setSelectedMethod] = useState("pix");
  const [isLoading, setIsLoading] = useState(false);
  const [customer, setCustomer] = useState({ name: "", email: "", document: "" });

  const mpEnabled = Boolean(PUBLIC_KEY);

  useEffect(() => {
    if (mpEnabled) {
      initMercadoPago(PUBLIC_KEY, { locale: "pt-BR", advancedFraudPrevention: true });
    }
  }, [mpEnabled]);

  if (!isOpen || !product) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setCustomer((p) => ({ ...p, [name]: value }));
  };

  const priceNumber =
    typeof product.price === "number"
      ? product.price
      : parseFloat(String(product.price).replace(/[^\d,]/g, "").replace(",", ".") || "0");

  const canUseOnline =
    mpEnabled && customer.email && customer.name && priceNumber > 0;

  const payWithPix = async () => {
    setIsLoading(true);
    try {
      // aqui você chamaria seu backend para criar o PIX e retornar qr/codigo
      alert("PIX gerado (mock). Integração direta com backend recomendada.");
    } finally {
      setIsLoading(false);
    }
  };

  const payWithBoleto = async () => {
    setIsLoading(true);
    try {
      // idem: gerar boleto via backend e abrir link
      alert("Boleto gerado (mock). Integração direta com backend recomendada.");
    } finally {
      setIsLoading(false);
    }
  };

  const closeAndReset = () => {
    onClose?.();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* header */}
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Finalizar Compra</h2>
            <Button variant="ghost" size="sm" onClick={closeAndReset} className="p-2">
              <X className="h-6 w-6" />
            </Button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* resumo */}
            <div>
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle>Resumo do pedido</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4">
                    <img
                      src={product.image}
                      alt={product.name}
                      className="w-16 h-16 object-cover rounded-lg"
                    />
                    <div className="flex-1">
                      <h3 className="font-semibold">{product.name}</h3>
                      <p className="text-gray-600 text-sm">{product.description}</p>
                      <p className="text-2xl font-bold text-blue-600 mt-2">
                        {typeof product.price === "number"
                          ? product.price.toLocaleString("pt-BR", {
                              style: "currency",
                              currency: "BRL",
                            })
                          : String(product.price)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* dados do cliente */}
              <Card>
                <CardHeader>
                  <CardTitle>Seus dados</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="name">Nome completo *</Label>
                    <Input
                      id="name"
                      name="name"
                      value={customer.name}
                      onChange={handleChange}
                      placeholder="João Silva"
                      disabled={isLoading}
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">E-mail *</Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      value={customer.email}
                      onChange={handleChange}
                      placeholder="joao@email.com"
                      disabled={isLoading}
                    />
                  </div>
                  <div>
                    <Label htmlFor="document">CPF/CNPJ</Label>
                    <Input
                      id="document"
                      name="document"
                      value={customer.document}
                      onChange={handleChange}
                      placeholder="(opcional)"
                      disabled={isLoading}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* pagamento */}
            <div>
              <Card>
                <CardHeader>
                  <CardTitle>Forma de pagamento</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-2 mb-6">
                    {mpEnabled && (
                      <>
                        <Button
                          variant={selectedMethod === "pix" ? "default" : "outline"}
                          onClick={() => setSelectedMethod("pix")}
                          className="flex-1"
                          disabled={isLoading}
                        >
                          <Smartphone className="mr-2 h-4 w-4" />
                          PIX
                        </Button>
                        <Button
                          variant={
                            selectedMethod === "credit_card" ? "default" : "outline"
                          }
                          onClick={() => setSelectedMethod("credit_card")}
                          className="flex-1"
                          disabled={isLoading}
                        >
                          <CreditCard className="mr-2 h-4 w-4" />
                          Cartão
                        </Button>
                      </>
                    )}
                    <Button
                      variant={selectedMethod === "boleto" ? "default" : "outline"}
                      onClick={() => setSelectedMethod("boleto")}
                      className="flex-1"
                      disabled={isLoading}
                    >
                      <FileText className="mr-2 h-4 w-4" />
                      Boleto
                    </Button>
                  </div>

                  {/* PIX */}
                  {mpEnabled && selectedMethod === "pix" && (
                    <div className="text-center">
                      <p className="text-gray-600 mb-4">
                        Pagamento instantâneo via PIX.
                      </p>
                      <Button
                        onClick={payWithPix}
                        disabled={isLoading || !canUseOnline}
                        className="bg-orange-500 hover:bg-orange-600"
                      >
                        {isLoading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Gerando PIX...
                          </>
                        ) : (
                          "Gerar PIX"
                        )}
                      </Button>
                      {!mpEnabled && (
                        <p className="text-xs text-gray-500 mt-2">
                          (Defina REACT_APP_MERCADO_PAGO_PUBLIC_KEY para ativar)
                        </p>
                      )}
                    </div>
                  )}

                  {/* Cartão */}
                  {mpEnabled && selectedMethod === "credit_card" && (
                    <div>
                      <CardPayment
                        initialization={{
                          amount: priceNumber > 0 ? priceNumber : 1,
                          payer: { email: customer.email || undefined },
                        }}
                        customization={{
                          paymentMethods: { creditCard: "all", debitCard: "all" },
                        }}
                        onSubmit={() => {
                          // normalmente você enviaria os dados ao backend
                          alert("Pagamento com cartão (mock). Integração via backend.");
                          onSuccess?.();
                          closeAndReset();
                        }}
                        onReady={() => {}}
                        onError={(error) => {
                          console.error("Card payment error:", error);
                          alert("Erro no formulário do cartão.");
                        }}
                      />
                    </div>
                  )}

                  {/* Boleto */}
                  {selectedMethod === "boleto" && (
                    <div className="text-center">
                      <p className="text-gray-600 mb-4">
                        Vencimento em 7 dias úteis.
                      </p>
                      <Button
                        onClick={payWithBoleto}
                        disabled={isLoading}
                        className="bg-blue-500 hover:bg-blue-600"
                      >
                        {isLoading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Gerando boleto...
                          </>
                        ) : (
                          "Gerar boleto"
                        )}
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
