
"use client";

import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, ArrowRight, RotateCw, Globe, Home, ExternalLink } from "lucide-react";
import Link from "next/link";

export default function NavegadorPage() {
  const [url, setUrl] = useState("https://www.google.com");
  const [inputUrl, setInputUrl] = useState("https://www.google.com");
  const [iframeKey, setIframeKey] = useState(0);

  const normalizeUrl = (value?: string) => {
    const raw = (value || "").trim();
    if (!raw) return "https://www.google.com";
    return /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const queryUrl = params.get("url");

    let savedConfigUrl = "";
    try {
      const savedConfigRaw = localStorage.getItem("scaleConfig");
      if (savedConfigRaw) {
        const parsed = JSON.parse(savedConfigRaw);
        savedConfigUrl = parsed?.browserUrl || "";
      }
    } catch {
      // ignora leitura inválida do localStorage e segue com fallback
    }

    const initialUrl = normalizeUrl(queryUrl || savedConfigUrl);
    setUrl(initialUrl);
    setInputUrl(initialUrl);
    setIframeKey((prev) => prev + 1);
  }, []);

  const handleGo = (e: React.FormEvent) => {
    e.preventDefault();
    let targetUrl = inputUrl;
    if (!targetUrl.startsWith('http')) {
      targetUrl = 'https://' + targetUrl;
    }
    setUrl(targetUrl);
    setIframeKey(prev => prev + 1);
  };

  const reload = () => setIframeKey(prev => prev + 1);

  return (
    <div className="flex flex-col h-screen bg-background text-foreground">
      {/* Barra de Navegação Estilo Browser */}
      <header className="p-2 border-b bg-card flex items-center gap-2">
        <Link href="/">
          <Button variant="ghost" size="icon" title="Voltar para Calculadora">
            <Home className="h-5 w-5" />
          </Button>
        </Link>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" disabled>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" disabled>
            <ArrowRight className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={reload}>
            <RotateCw className="h-4 w-4" />
          </Button>
        </div>
        
        <form onSubmit={handleGo} className="flex-grow flex gap-2">
          <div className="relative flex-grow">
            <Globe className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input 
              value={inputUrl}
              onChange={(e) => setInputUrl(e.target.value)}
              className="pl-9 h-9 bg-muted/50 border-none focus-visible:ring-1"
              placeholder="Digite o endereço ou pesquise..."
            />
          </div>
          <Button type="submit" size="sm" className="h-9">Ir</Button>
        </form>
      </header>

      {/* Área do Conteúdo */}
      <main className="flex-grow relative bg-white">
        {/* Alerta de Limitação Web */}
        <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center z-0 pointer-events-none opacity-20">
          <ExternalLink className="h-24 w-24 mb-4" />
          <h2 className="text-2xl font-bold mb-2">Modo Visualização Web</h2>
          <p className="max-w-md">
            Alguns sites (como Google) bloqueiam a exibição dentro de outros sites por segurança. 
            No modo <b>App Híbrido (Capacitor)</b>, este navegador funcionará sem restrições.
          </p>
        </div>

        <iframe 
          key={iframeKey}
          src={url}
          className="w-full h-full border-none relative z-10"
          title="Navegador Interno"
          sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
        />
      </main>

      {/* Rodapé de Status */}
      <footer className="p-1 px-3 border-t bg-muted text-[10px] flex justify-between text-muted-foreground uppercase tracking-wider">
        <span>Conexão Segura SSL</span>
        <span>Simulação de Navegação Híbrida</span>
      </footer>
    </div>
  );
}
