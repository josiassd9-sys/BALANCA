'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Copy, Download, RefreshCw, Save, Share2 } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { Directory, Filesystem } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { BALANCA_SCRIPT_STORAGE_KEY, DEFAULT_BALANCA_JS } from '@/lib/balanca-script-template';

function toBase64Utf8(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

function downloadTextFile(filename: string, content: string): void {
  const blob = new Blob([content], { type: 'text/javascript;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export default function ServidorBalancaPage() {
  const { toast } = useToast();
  const [scriptContent, setScriptContent] = useState(DEFAULT_BALANCA_JS);
  const officialTemplate = DEFAULT_BALANCA_JS;

  useEffect(() => {
    try {
      const saved = localStorage.getItem(BALANCA_SCRIPT_STORAGE_KEY);
      if (saved && saved.trim()) {
        setScriptContent(saved);
      }
    } catch {
      // ignore localStorage errors
    }
  }, []);

  const lineCount = useMemo(() => scriptContent.split('\n').length, [scriptContent]);
  const officialLineCount = useMemo(() => officialTemplate.split('\n').length, [officialTemplate]);

  const handleSaveLocal = () => {
    try {
      localStorage.setItem(BALANCA_SCRIPT_STORAGE_KEY, scriptContent);
      toast({
        title: 'Backup salvo no app',
        description: 'O arquivo balanca.js foi salvo localmente neste dispositivo.',
      });
    } catch {
      toast({
        variant: 'destructive',
        title: 'Falha ao salvar',
        description: 'Nao foi possivel salvar o backup local.',
      });
    }
  };

  const handleRestoreDefault = () => {
    setScriptContent(DEFAULT_BALANCA_JS);
    toast({
      title: 'Modelo restaurado',
      description: 'O conteudo foi restaurado para o modelo padrao comentado.',
    });
  };

  const handleCopyOfficialToEditable = () => {
    setScriptContent(officialTemplate);
    toast({
      title: 'Modelo oficial copiado',
      description: 'A area editavel recebeu o conteudo do modelo oficial.',
    });
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(scriptContent);
      toast({
        title: 'Copiado',
        description: 'Conteudo do balanca.js copiado para a area de transferencia.',
      });
    } catch {
      toast({
        variant: 'destructive',
        title: 'Falha ao copiar',
        description: 'Nao foi possivel copiar o conteudo.',
      });
    }
  };

  const handleDownload = () => {
    downloadTextFile('balanca.js', scriptContent);
    toast({
      title: 'Download iniciado',
      description: 'Arquivo balanca.js gerado para reinstalacao/backup.',
    });
  };

  const handleShare = async () => {
    try {
      if (Capacitor.isNativePlatform()) {
        const base64 = toBase64Utf8(scriptContent);
        const writeResult = await Filesystem.writeFile({
          path: 'balanca.js',
          data: base64,
          directory: Directory.Cache,
          recursive: true,
        });

        await Share.share({
          title: 'balanca.js',
          text: 'Arquivo de referencia da ponte de comunicacao da balanca.',
          url: writeResult.uri,
          dialogTitle: 'Compartilhar balanca.js',
        });

        return;
      }

      if (navigator.share) {
        const file = new File([scriptContent], 'balanca.js', { type: 'text/javascript;charset=utf-8' });
        const canShareFiles = typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] });

        if (canShareFiles) {
          await navigator.share({
            title: 'balanca.js',
            text: 'Arquivo de referencia da ponte de comunicacao da balanca.',
            files: [file],
          });
          return;
        }

        await navigator.share({
          title: 'balanca.js',
          text:
            'Arquivo de referencia da ponte de comunicacao da balanca. Este navegador nao suporta compartilhar arquivo; usando compartilhamento de texto.',
        });
        return;
      }

      handleDownload();
    } catch {
      toast({
        variant: 'destructive',
        title: 'Falha ao compartilhar',
        description: 'Nao foi possivel abrir o compartilhamento.',
      });
    }
  };

  return (
    <main className="container mx-auto max-w-5xl p-3 md:p-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Backup do Servidor da Balanca</h1>
          <p className="text-sm text-muted-foreground">
            Guarde, ajuste e compartilhe o balanca.js para reinstalacao e padronizacao do sistema.
          </p>
        </div>
        <Link href="/">
          <Button variant="outline" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Button>
        </Link>
      </div>

      <Card className="mb-4">
        <CardHeader>
          <CardTitle className="text-base">Manual rapido (resumo)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>1. O script le a serial da balanca e transforma para TCP, WebSocket e HTTP.</p>
          <p>2. Portas de referencia: TCP 8080, WS 3001, HTTP 3000.</p>
          <p>3. Ajuste COM e baud rate no proprio arquivo ou via .env no servidor.</p>
          <p>4. Salve este backup no app para recuperar rapido apos formatacao do PC.</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Arquivo balanca.js ({lineCount} linhas)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <Button className="gap-2" onClick={handleSaveLocal}>
              <Save className="h-4 w-4" />
              Salvar backup no app
            </Button>
            <Button variant="outline" className="gap-2" onClick={handleCopy}>
              <Copy className="h-4 w-4" />
              Copiar codigo
            </Button>
            <Button variant="outline" className="gap-2" onClick={handleDownload}>
              <Download className="h-4 w-4" />
              Baixar balanca.js
            </Button>
            <Button variant="outline" className="gap-2" onClick={handleShare}>
              <Share2 className="h-4 w-4" />
              Compartilhar arquivo
            </Button>
            <Button variant="ghost" className="gap-2" onClick={handleRestoreDefault}>
              <RefreshCw className="h-4 w-4" />
              Restaurar modelo padrao
            </Button>
            <Button variant="outline" className="gap-2" onClick={handleCopyOfficialToEditable}>
              <Copy className="h-4 w-4" />
              Copiar oficial para edicao
            </Button>
          </div>

          <div className="space-y-2 rounded-md border bg-muted/40 p-3">
            <p className="text-sm font-semibold">Modelo oficial (leitura bloqueada) - {officialLineCount} linhas</p>
            <p className="text-xs text-muted-foreground">
              Este bloco e protegido para evitar edicao acidental. Use o botao "Copiar oficial para edicao" quando quiser partir do modelo limpo.
            </p>
            <textarea
              value={officialTemplate}
              readOnly
              spellCheck={false}
              className="min-h-[34vh] w-full rounded-md border border-input bg-background p-3 font-mono text-xs leading-relaxed opacity-95"
            />
          </div>

          <div className="space-y-2 rounded-md border p-3">
            <p className="text-sm font-semibold">Minha versao editavel</p>
            <p className="text-xs text-muted-foreground">
              Esta area aceita alteracoes e e a que sera salva/baixada/compartilhada.
            </p>
          <textarea
            value={scriptContent}
            onChange={(event) => setScriptContent(event.target.value)}
            spellCheck={false}
            className="min-h-[60vh] w-full rounded-md border border-input bg-background p-3 font-mono text-xs leading-relaxed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
