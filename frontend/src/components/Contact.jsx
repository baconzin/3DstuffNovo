import React, { useState } from "react";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { MessageCircle, Mail, MapPin, Phone, Loader2 } from "lucide-react";
import { useToast } from "../hooks/use-toast";

export const Contact = () => {
  const { toast } = useToast();
  const [formData, setFormData] = useState({ name: "", email: "", message: "" });
  const [loading, setLoading] = useState(false);

  const whatsappNumber = "5519971636969";
  const companyEmail = "contato@3dstuff.com.br";

  const FORMSUBMIT_ENDPOINT = "https://formsubmit.co/ajax/contato@3dstuff.com.br";

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name || !formData.email || !formData.message) {
      toast({
        title: "Erro",
        description: "Por favor, preencha todos os campos obrigatórios.",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);

      const res = await fetch(FORMSUBMIT_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          message: formData.message,
          _subject: "Nova mensagem pelo site 3D Stuff",
          _captcha: false,
          _template: "table",
          source: "3dstuff.com.br",
        }),
      });

      if (res.ok) {
        toast({
          title: "Mensagem enviada!",
          description: "Recebemos sua mensagem e entraremos em contato em b
