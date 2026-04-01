'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Capacitor } from '@capacitor/core';
import { Share } from '@capacitor/share';
import { ArrowLeft, FileText, FolderOpen, RefreshCw, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { FolderOpener } from '@/plugins/FolderOpenerPlugin';
import {
  FINALIZED_WEIGHINGS_DIR,
  listFinalizedWeighingPdfs,
  type FinalizedWeighingPdf,
} from '@/services/weighing-pdf';

export default function ListaFinPage() {
  const { toast } = useToast();
  const [files, setFiles] = useState<FinalizedWeighingPdf[]>([]);
  const [loading, setLoading] = useState(true);

  const loadFiles = useCallback(async () => {
    if (!Capacitor.isNativePlatform()) {
      setFiles([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const items = await listFinalizedWeighingPdfs();
      setFiles(items);
    } catch (error) {
      console.error('Falha ao listar pesagens finalizadas:', error);
      toast({
        variant: 'destructive',
        title: 'Falha ao abrir lista',
        description: 'Nao foi possivel ler a pasta de pesagens finalizadas.',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void loadFiles();
  }, [loadFiles]);

  const shareFile = async (file: FinalizedWeighingPdf) => {
    try {
      await Share.share({
        title: file.name,
        text: 'Comprovante de pesagem finalizada',
        url: file.uri,
        dialogTitle: 'Compartilhar comprovante',
      });
    } catch (error) {
      console.error('Falha ao compartilhar arquivo finalizado:', error);
      toast({
        variant: 'destructive',
        title: 'Falha ao compartilhar',
        description: 'Nao foi possivel compartilhar o comprovante selecionado.',
      });
    }
  };

  const openSystemFolder = async () => {
    try {
      await FolderOpener.openDocumentsSubfolder({
        folderName: FINALIZED_WEIGHINGS_DIR,
      });
    } catch (error) {
      console.error('Falha ao abrir pasta no gerenciador:', error);
      toast({
        variant: 'destructive',
        title: 'Nao foi possivel abrir pasta externa',
        description: 'Use a lista abaixo para acessar e compartilhar os comprovantes.',
      });
    }
  };

  return (
    <main className="container mx-auto max-w-4xl p-3 md:p-6">
      <div className="mb-4 flex items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold">Lista FIN</h1>
          <p className="text-sm text-muted-foreground">
            Comprovantes salvos automaticamente em Documentos/{FINALIZED_WEIGHINGS_DIR}.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="gap-2" onClick={() => void loadFiles()}>
            <RefreshCw className="h-4 w-4" />
            Atualizar
          </Button>
          {Capacitor.isNativePlatform() && (
            <Button variant="outline" className="gap-2" onClick={() => void openSystemFolder()}>
              <FolderOpen className="h-4 w-4" />
              Abrir pasta
            </Button>
          )}
          <Link href="/">
            <Button variant="outline" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Voltar
            </Button>
          </Link>
        </div>
      </div>

      {!Capacitor.isNativePlatform() && (
        <Card>
          <CardHeader>
            <CardTitle>Disponivel no app Android/iOS</CardTitle>
            <CardDescription>
              Esta lista acessa a pasta nativa de documentos do dispositivo.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              No navegador web, os PDFs sao baixados normalmente pela pasta de downloads do browser.
            </p>
          </CardContent>
        </Card>
      )}

      {Capacitor.isNativePlatform() && (
        <Card>
          <CardHeader>
            <CardTitle>Pesagens Finalizadas</CardTitle>
            <CardDescription>
              {loading
                ? 'Carregando comprovantes...'
                : `${files.length} comprovante(s) encontrado(s).`}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {!loading && files.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Nenhum PDF encontrado na pasta Documentos/{FINALIZED_WEIGHINGS_DIR}.
              </p>
            )}

            {!loading && files.map((file) => (
              <div key={file.path} className="flex items-center justify-between rounded-md border p-2">
                <div className="min-w-0 pr-2">
                  <p className="truncate text-sm font-medium">{file.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{file.path}</p>
                </div>
                <Button size="sm" variant="outline" className="gap-2" onClick={() => void shareFile(file)}>
                  <Share2 className="h-4 w-4" />
                  Compartilhar
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
        <FileText className="h-4 w-4" />
        Dica: use Atualizar apos finalizar uma nova pesagem para recarregar a lista.
      </div>
    </main>
  );
}
