import React, { useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { MessageCircle, Mail, MapPin, Phone, Loader2 } from 'lucide-react';
// REMOVIDO: import { contactAPI } from '../services/api';
import { useToast } from '../hooks/use-toast';

export const Contact = () => {
  const { toast } = useToast();
  const [formData, setFormData] = useState({ name: '', email: '', message: '' });
  const [loading, setLoading] = useState(false);

  const whatsappNumber = "5519971636969";
  const companyEmail = "contato@3dstuff.com.br";

  // Endpoint do FormSubmit (não exige cadastro)
  const FORMSUBMIT_ENDPOINT = "https://formsubmit.co/ajax/contato@3dstuff.com.br";

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name || !formData.email || !formData.message) {
      toast({
        title: "Erro",
        description: "Por favor, preencha todos os campos obrigatórios.",
        variant: "destructive"
      });
      return;
    }

    try {
      setLoading(true);

      // FormSubmit (AJAX) aceita JSON
      const res = await fetch(FORMSUBMIT_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Accept": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          message: formData.message,
          _subject: "Nova mensagem pelo site 3D Stuff",
          _captcha: false,           // evita captcha
          _template: "table",        // e-mail bonitinho
          source: "3dstuff.com.br"
        })
      });

      if (res.ok) {
        toast({
          title: "Mensagem enviada!",
          description: "Recebemos sua mensagem e entraremos em contato em breve."
        });
        setFormData({ name: '', email: '', message: '' });
      } else {
        let detail = "Não foi possível enviar sua mensagem.";
        try {
          const j = await res.json();
          if (j?.message) detail = j.message;
        } catch (_) {}
        toast({
          title: "Erro",
          description: `${detail} Tente novamente ou fale no WhatsApp.`,
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
      toast({
        title: "Erro de conexão",
        description: "Tente novamente ou entre em contato pelo WhatsApp.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleWhatsAppClick = () => {
    const message = encodeURIComponent("Olá! Gostaria de saber mais sobre os produtos da 3D Stuff.");
    const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${message}`;
    window.open(whatsappUrl, '_blank');
  };

  return (
    <section id="contact" className="py-20 bg-white">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
            Entre em <span className="text-blue-500">Contato</span>
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Tem alguma dúvida ou quer fazer um pedido personalizado? 
            Estamos aqui para ajudar você!
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 max-w-6xl mx-auto">
          {/* Contact Form */}
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="text-2xl font-bold text-gray-900">
                Envie sua mensagem
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-gray-700 font-medium">
                    Nome <span className="text-blue-500">*</span>
                  </Label>
                  <Input
                    id="name"
                    name="name"
                    type="text"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                    disabled={loading}
                    className="focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Seu nome"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email" className="text-gray-700 font-medium">
                    E-mail <span className="text-blue-500">*</span>
                  </Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                    disabled={loading}
                    className="focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="seu@email.com"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="message" className="text-gray-700 font-medium">
                    Mensagem <span className="text-blue-500">*</span>
                  </Label>
                  <Textarea
                    id="message"
                    name="message"
                    value={formData.message}
                    onChange={handleInputChange}
                    required
                    disabled={loading}
                    rows={4}
                    className="resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Digite sua mensagem..."
                  />
                </div>
                
                <Button 
                  type="submit" 
                  disabled={loading}
                  className="w-full bg-blue-500 hover:bg-blue-600 text-white py-3 transition-all duration-200 transform hover:scale-105"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    <>
                      <Mail className="mr-2 h-5 w-5" />
                      Enviar Mensagem
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Contact Info */}
          <div className="space-y-8">
            <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300">
              <CardContent className="p-8">
                <div className="flex items-center mb-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mr-4">
                    <MessageCircle className="h-6 w-6 text-blue-500" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900">WhatsApp</h3>
                </div>
                <p className="text-gray-600 mb-4">
                  Fale conosco diretamente pelo WhatsApp para atendimento rápido e personalizado.
                </p>
                <p className="text-gray-600 mb-4 font-medium">
                  📱 (19) 97163-6969
                </p>
                <Button 
                  onClick={handleWhatsAppClick}
                  className="bg-green-500 hover:bg-green-600 text-white w-full transition-all duration-200 transform hover:scale-105"
                >
                  <MessageCircle className="mr-2 h-5 w-5" />
                  Chamar no WhatsApp
                </Button>
              </CardContent>
            </Card>
