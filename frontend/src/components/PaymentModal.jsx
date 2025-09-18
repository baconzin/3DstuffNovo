// frontend/src/components/PaymentModal.jsx
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { X, CreditCard, Smartphone, FileText, Loader2 } from 'lucide-react';
import { initMercadoPago, CardPayment } from '@mercadopago/sdk-react';
import axios from 'axios';
import { useToast } from '../hooks/use-toast';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const PUBLIC_KEY = process.env.REACT_APP_MERCADO_PAGO_PUBLIC_KEY;

export const PaymentModal = ({ product, isOpen, onClose, onSuccess }) => {
  const { toast } = useToast();
  const [selectedMethod, setSelectedMethod] = useState('pix'); // 'pix' | 'credit_card' | 'boleto'
  const [isLoading, setIsLoading] = useState(false);
  const [customerData, setCustomerData] = useState({ name: '', email: '', document: '' });
  const [paymentResult, setPaymentResult] = useState(null);
  const [qrCode, setQrCode] = useState('');
  const [qrImageBase64, setQrImageBase64] = useState('');
  const [installmentOptions, setInstallmentOptions] = useState([]);
  const [selectedInstallments, setSelectedInstallments] = useState(1);

  const pollRef = useRef(null);

  // ===== Helpers =====
  function formatBRL(v) {
    const n = typeof v === 'string'
      ? Number(v.replace(/[^\d,.-]/g, '').replace('.', '').replace(',', '.'))
      : Number(v || 0);
    return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  const unitAmount = useMemo(() => {
    if (!product?.price && product?.price !== 0) return 0;
    if (typeof product.price === 'number') return product.price;
    // tenta parsear strings tipo "R$ 59,90"
    const parsed = Number(String(product.price).replace(/[^\d,.-]/g, '').replace('.', '').replace(',', '.'));
    return isNaN(parsed) ? 0 : parsed;
  }, [product]);

  // ===== Init Mercado Pago (uma vez) =====
  useEffect(() => {
    if (!PUBLIC_KEY) {
      console.warn('REACT_APP_MERCADO_PAGO_PUBLIC_KEY ausente');
      return;
    }
    try {
      initMercadoPago(PUBLIC_KEY, { locale: 'pt-BR', advancedFraudPrevention: true });
    } catch (e) {
      console.error('Falha ao inicializar MP:', e);
    }
  }, []);

  // ===== Carrega parcelamento quando abrir (cartão) =====
  useEffect(() => {
    if (isOpen && product) {
      // tenta carregar parcelamento; se falhar, apenas segue sem travar UI
      loadInstallmentOptions().catch(() => {});
    }
    // cleanup ao fechar: para polling e limpa resultados
    if (!isOpen) {
      stopPolling();
      setPaymentResult(null);
      setQrCode('');
      setQrImageBase64('');
      setSelectedMethod('pix');
      setSelectedInstallments(1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, product?.id]);

  async function loadInstallmentOptions() {
    if (!BACKEND_URL) return;
    try {
      const response = await axios.get(`${BACKEND_URL}/api/payments/installments/${product.id}`);
      if (response.data?.success) {
        setInstallmentOptions(response.data.installment_options || []);
      } else {
        setInstallmentOptions([]);
      }
    } catch (error) {
      console.error('Erro ao carregar parcelamento:', error);
      setInstallmentOptions([]);
    }
  }

  function handleInputChange(e) {
    const { name, value } = e.target;
    setCustomerData((prev) => ({ ...prev, [name]: value }));
  }

  function validateCustomerData() {
    if (!customerData.name || !customerData.email || !customerData.document) {
      toast({ title: 'Erro', description: 'Preencha todos os campos obrigatórios', variant: 'destructive' });
      return false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(customerData.email)) {
      toast({ title: 'Erro', description: 'Email inválido', variant: 'destructive' });
      return false;
    }
    const doc = customerData.document.replace(/\D/g, '');
    if (doc.length !== 11 && doc.length !== 14) {
      toast({ title: 'Erro', description: 'CPF deve ter 11 dígitos ou CNPJ 14 dígitos', variant: 'destructive' });
      return false;
    }
    return true;
  }

  function assertEnvOrWarn() {
    if (!BACKEND_URL) {
      toast({
        title: 'Configuração ausente',
        description: 'REACT_APP_BACKEND_URL não definida no build.',
        variant: 'destructive',
      });
      return false;
    }
    if (!PUBLIC_KEY && selectedMethod === 'credit_card') {
      toast({
        title: 'Configuração ausente',
        description: 'REACT_APP_MERCADO_PAGO_PUBLIC_KEY não definida para pagamento por cartão.',
        variant: 'destructive',
      });
      return false;
    }
    return true;
  }

  // ===== PIX =====
  async function handlePixPayment() {
    if (!validateCustomerData() || !assertEnvOrWarn()) return;

    setIsLoading(true);
    try {
      const payload = {
        product_id: product.id,
        quantity: 1,
        customer_email: customerData.email,
        customer_document: customerData.document.replace(/\D/g, ''),
        customer_name: customerData.name,
        payment_method: 'pix',
        amount: unitAmount,
      };
      const response = await axios.post(`${BACKEND_URL}/api/payments/create`, payload);
      if (response.data?.success) {
        const d = response.data;
        setPaymentResult(d);
        setQrCode(d.qr_code || '');
        setQrImageBase64(d.qr_base64 || ''); // caso seu backend envie a imagem base64
        startPaymentPolling(d.payment_id);
        toast({ title: 'PIX gerado!', description: 'Escaneie o QR Code para pagar.' });
      } else {
        throw new Error(response.data?.detail || 'Falha ao gerar PIX');
      }
    } catch (error) {
      console.error('Erro PIX:', error);
      toast({
        title: 'Erro',
        description: error?.response?.data?.detail || error.message || 'Erro ao gerar PIX',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }

  // ===== Cartão =====
  async function handleCardPayment(formData) {
    if (!validateCustomerData() || !assertEnvOrWarn()) return;

    setIsLoading(true);
    try {
      const payload = {
        product_id: product.id,
        quantity: 1,
        customer_email: customerData.email,
        customer_document: customerData.document.replace(/\D/g, ''),
        customer_name: customerData.name,
        payment_method: 'credit_card',
        installments: selectedInstallments,
        card_token: formData?.token,
        payment_method_id: formData?.payment_method_id,
        issuer_id: formData?.issuer_id,
        amount: unitAmount,
      };

      const response = await axios.post(`${BACKEND_URL}/api/payments/create`, payload);
      const d = response.data;

      if (d?.success) {
        setPaymentResult(d);
        if (d.status === 'approved') {
          toast({ title: 'Pagamento aprovado!', description: 'Seu pagamento foi processado com sucesso.' });
          onSuccess?.(d);
          onClose?.();
        } else if (d.status === 'pending') {
          toast({ title: 'Pagamento pendente', description: 'Aguardando confirmação do pagamento.' });
        } else {
          toast({
            title: 'Pagamento rejeitado',
            description: d?.detail || 'Verifique os dados do cartão e tente novamente.',
            variant: 'destructive',
          });
        }
      } else {
        throw new Error(d?.detail || 'Erro no pagamento');
      }
    } catch (error) {
      console.error('Erro cartão:', error);
      toast({
        title: 'Erro',
        description: error?.response?.data?.detail || error.message || 'Erro no pagamento',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }

  // ===== Boleto =====
  async function handleBoletoPayment() {
    if (!validateCustomerData() || !assertEnvOrWarn()) return;

    setIsLoading(true);
    try {
      const payload = {
        product_id: product.id,
        quantity: 1,
        customer_email: customerData.email,
        customer_document: customerData.document.replace(/\D/g, ''),
        customer_name: customerData.name,
        payment_method: 'boleto',
        amount: unitAmount,
      };
      const response = await axios.post(`${BACKEND_URL}/api/payments/create`, payload);
      const d = response.data;

      if (d?.success) {
        setPaymentResult(d);
        toast({ title: 'Boleto gerado!', description: 'Clique no link para visualizar o boleto.' });
      } else {
        throw new Error(d?.detail || 'Erro ao gerar boleto');
      }
    } catch (error) {
      console.error('Erro boleto:', error);
      toast({
        title: 'Erro',
        description: error?.response?.data?.detail || error.message || 'Erro ao gerar boleto',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }

  // ===== Polling =====
  function startPaymentPolling(paymentId) {
    stopPolling();
    pollRef.current = setInterval(async () => {
      try {
        const response = await axios.get(`${BACKEND_URL}/api/payments/${paymentId}/status`);
        const status = response.data?.status;
        if (status === 'approved') {
          stopPolling();
          toast({ title: 'Pagamento aprovado!', description: 'PIX confirmado com sucesso!' });
          onSuccess?.(response.data);
          onClose?.();
        }
      } catch (error) {
        console.error('Erro no polling:', error);
      }
    }, 3000);
    // safety timeout 10 min
    setTimeout(() => stopPolling(), 600000);
  }

  function stopPolling() {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }

  useEffect(() => {
    return () => stopPolling();
  }, []);

  // ===== Render =====
  if (!isOpen || !product) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Finalizar Compra</h2>
            <Button variant="ghost" size="sm" onClick={onClose} className="p-2">
              <X className="h-6 w-6" />
            </Button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Produto */}
            <div>
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle>Resumo do pedido</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center space-x-4">
                    <img
                      src={product.image}
                      alt={product.name}
                      className="w-16 h-16 object-cover rounded-lg"
                    />
                    <div className="flex-1">
                      <h3 className="font-semibold">{product.name}</h3>
                      <p className="text-gray-600 text-sm">{product.description}</p>
                      <p className="text-2xl font-bold text-blue-600 mt-2">
                        {formatBRL(unitAmount)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Dados do cliente */}
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
                      value={customerData.name}
                      onChange={handleInputChange}
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
                      value={customerData.email}
                      onChange={handleInputChange}
                      placeholder="joao@email.com"
                      disabled={isLoading}
                    />
                  </div>
                  <div>
                    <Label htmlFor="document">CPF/CNPJ *</Label>
                    <Input
                      id="document"
                      name="document"
                      value={customerData.document}
                      onChange={handleInputChange}
                      placeholder="123.456.789-00"
                      disabled={isLoading}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Pagamento */}
            <div>
              <Card>
                <CardHeader>
                  <CardTitle>Forma de pagamento</CardTitle>
                </CardHeader>
                <CardContent>
                  {/* Tabs */}
                  <div className="flex space-x-2 mb-6">
                    <Button
                      variant={selectedMethod === 'pix' ? 'default' : 'outline'}
                      onClick={() => setSelectedMethod('pix')}
                      className="flex-1"
                      disabled={isLoading}
                    >
                      <Smartphone className="mr-2 h-4 w-4" />
                      PIX
                    </Button>
                    <Button
                      variant={selectedMethod === 'credit_card' ? 'default' : 'outline'}
                      onClick={() => setSelectedMethod('credit_card')}
                      className="flex-1"
                      disabled={isLoading}
                    >
                      <CreditCard className="mr-2 h-4 w-4" />
                      Cartão
                    </Button>
                    <Button
                      variant={selectedMethod === 'boleto' ? 'default' : 'outline'}
                      onClick={() => setSelectedMethod('boleto')}
                      className="flex-1"
                      disabled={isLoading}
                    >
                      <FileText className="mr-2 h-4 w-4" />
                      Boleto
                    </Button>
                  </div>

                  {/* PIX */}
                  {selectedMethod === 'pix' && (
                    <div>
                      {!paymentResult ? (
                        <div className="text-center">
                          <p className="text-gray-600 mb-4">Pagamento instantâneo via PIX</p>
                          <Button
                            onClick={handlePixPayment}
                            disabled={isLoading}
                            className="bg-orange-500 hover:bg-orange-600"
                          >
                            {isLoading ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Gerando PIX...
                              </>
                            ) : (
                              'Gerar PIX'
                            )}
                          </Button>
                        </div>
                      ) : (
                        <div className="text-center">
                          <div className="mb-4 p-4 rounded-lg border">
                            <p className="text-lg font-semibold mb-2">PIX QR Code</p>
                            <p className="text-sm text-gray-600">Escaneie com seu app do banco</p>
                            {qrImageBase64 ? (
                              <img
                                src={`data:image/png;base64,${qrImageBase64}`}
                                alt="QR Code PIX"
                                className="mx-auto mt-3 w-52 h-52 object-contain"
                              />
                            ) : null}
                          </div>
                          <p className="text-sm text-gray-600 mb-2">Ou copie o código:</p>
                          <div className="bg-gray-100 p-3 rounded mb-4 text-left">
                            <code className="text-xs break-all">{qrCode}</code>
                          </div>
                          <Button
                            onClick={() => {
                              navigator.clipboard.writeText(qrCode);
                              toast({ title: 'Copiado!', description: 'Código PIX copiado.' });
                            }}
                            variant="outline"
                          >
                            Copiar código PIX
                          </Button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Cartão */}
                  {selectedMethod === 'credit_card' && (
                    <div>
                      {installmentOptions.length > 0 && (
                        <div className="mb-4">
                          <Label>Parcelamento</Label>
                          <select
                            value={selectedInstallments}
                            onChange={(e) => setSelectedInstallments(parseInt(e.target.value, 10))}
                            className="w-full p-2 border rounded"
                            disabled={isLoading}
                          >
                            {installmentOptions.map((option) => (
                              <option key={option.installments} value={option.installments}>
                                {option.recommended_message ||
                                  `${option.installments}x de ${formatBRL(option.installment_amount)}`}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}

                      <CardPayment
                        initialization={{
                          amount: unitAmount,
                          payer: { email: customerData.email || undefined },
                        }}
                        customization={{
                          paymentMethods: { creditCard: 'all', debitCard: 'all' },
                        }}
                        onSubmit={handleCardPayment}
                        onReady={() => console.log('Card payment ready')}
                        onError={(error) => {
                          console.error('Card payment error:', error);
                          toast({
                            title: 'Erro',
                            description: 'Erro no formulário do cartão',
                            variant: 'destructive',
                          });
                        }}
                      />
                    </div>
                  )}

                  {/* Boleto */}
                  {selectedMethod === 'boleto' && (
                    <div>
                      {!paymentResult ? (
                        <div className="text-center">
                          <p className="text-gray-600 mb-4">Vencimento em 7 dias úteis</p>
                          <Button
                            onClick={handleBoletoPayment}
                            disabled={isLoading}
                            className="bg-orange-500 hover:bg-orange-600"
                          >
                            {isLoading ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Gerando boleto...
                              </>
                            ) : (
                              'Gerar Boleto'
                            )}
                          </Button>
                        </div>
                      ) : (
                        <div className="text-center">
                          <p className="text-green-600 font-semibold mb-4">
                            Boleto gerado com sucesso!
                          </p>
                          <Button
                            onClick={() => window.open(paymentResult.ticket_url, '_blank')}
                            className="bg-blue-500 hover:bg-blue-600"
                          >
                            Visualizar Boleto
                          </Button>
                        </div>
                      )}
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
