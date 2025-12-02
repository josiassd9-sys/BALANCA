
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { type ScaleConfig } from "@/hooks/use-scale";
import { ScrollArea } from "./ui/scroll-area";
import { cn } from "@/lib/utils";

interface NetworkSettingsDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  config: ScaleConfig;
  onConfigChange: (newConfig: ScaleConfig) => void;
  onSave: () => void;
}

type TestStatus = 'idle' | 'testing' | 'success' | 'error';

export function NetworkSettingsDialog({
  isOpen,
  onOpenChange,
  config,
  onConfigChange,
  onSave,
}: NetworkSettingsDialogProps) {
  const [testStatus, setTestStatus] = useState<TestStatus>('idle');
  const [logs, setLogs] = useState<string[]>([]);
  
  const handleTestConnection = async () => {
    const { host, httpPort } = config;
    const target = `http://${host}:${httpPort}/weight`;
    
    setTestStatus('testing');
    setLogs(prev => [`[${new Date().toLocaleTimeString()}] Testando ${target}...`, ...prev]);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

    try {
      const response = await fetch(target, { cache: "no-store", signal: controller.signal });
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setTestStatus('success');
      setLogs(prev => [`[${new Date().toLocaleTimeString()}] SUCESSO: ${JSON.stringify(data)}`, ...prev]);
    } catch (error: any) {
      clearTimeout(timeoutId);
      setTestStatus('error');
      if (error.name === 'AbortError') {
         setLogs(prev => [`[${new Date().toLocaleTimeString()}] ERRO: Timeout! A conexão demorou mais de 5 segundos.`, ...prev]);
      } else {
         setLogs(prev => [`[${new Date().toLocaleTimeString()}] ERRO: ${error.message}`, ...prev]);
      }
    }
  };

  const getStatusClasses = (): string => {
    switch (testStatus) {
      case 'testing': return "text-yellow-500";
      case 'success': return "text-green-500";
      case 'error': return "text-red-500";
      default: return "text-muted-foreground";
    }
  };
   const getStatusMessage = (): string => {
    switch (testStatus) {
      case 'idle': return "Aguardando teste...";
      case 'testing': return "Testando conexão...";
      case 'success': return "Conexão bem-sucedida!";
      case 'error': return "Falha na conexão.";
      default: return "";
    }
  };

  const handleSaveAndClose = () => {
    onSave();
    onOpenChange(false);
  };


  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Configuração de Rede da Balança</DialogTitle>
          <DialogDescription>
            Defina o endereço de rede (IP) e as portas do computador onde o servidor da balança (ponte) está rodando.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="scale-ip" className="text-right">
              Host (IP)
            </Label>
            <Input
              id="scale-ip"
              value={config.host}
              onChange={(e) =>
                onConfigChange({ ...config, host: e.target.value })
              }
              className="col-span-3"
              placeholder="Ex: 192.168.18.8"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="ws-port" className="text-right">
              Porta WebSocket
            </Label>
            <Input
              id="ws-port"
              type="number"
              value={config.wsPort}
              onChange={(e) =>
                onConfigChange({ ...config, wsPort: parseInt(e.target.value, 10) || 0 })
              }
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="http-port" className="text-right">
              Porta HTTP
            </Label>
            <Input
              id="http-port"
              type="number"
              value={config.httpPort}
              onChange={(e) =>
                onConfigChange({ ...config, httpPort: parseInt(e.target.value, 10) || 0 })
              }
              className="col-span-3"
            />
          </div>
        </div>
        
        {/* Painel de Teste */}
        <div className="space-y-2 pt-4 border-t">
            <div className="flex justify-between items-center">
                 <h4 className="text-sm font-medium">Painel de Teste HTTP</h4>
                 <Button variant="outline" size="sm" onClick={handleTestConnection} disabled={testStatus === 'testing'}>
                    Testar Conexão
                 </Button>
            </div>
            <div className={cn("text-sm font-semibold p-2 rounded-md bg-muted/50", getStatusClasses())}>
                Status: {getStatusMessage()}
            </div>
            <ScrollArea className="h-24 w-full rounded-md border p-2 bg-muted/50">
                <div className="text-xs font-mono">
                    {logs.map((log, index) => (
                        <p key={index} className="whitespace-pre-wrap">{log}</p>
                    ))}
                </div>
            </ScrollArea>
        </div>


        <DialogFooter>
          <Button onClick={handleSaveAndClose}>Salvar e Reconectar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
