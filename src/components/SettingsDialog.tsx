
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { useTheme } from "@/hooks/use-theme";
import type { ThemeHex } from "@/hooks/use-theme";
import { Slider } from "./ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";


interface SettingsDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  scaleConfig: ScaleConfig;
  onScaleConfigChange: (newConfig: ScaleConfig) => void;
  onSave: () => void;
}

type TestStatus = 'idle' | 'testing' | 'success' | 'error';


// --- Network Settings Tab ---
const NetworkTab = ({ scaleConfig, onScaleConfigChange }: { scaleConfig: ScaleConfig, onScaleConfigChange: (newConfig: ScaleConfig) => void }) => {
  const [testStatus, setTestStatus] = useState<TestStatus>('idle');
  const [logs, setLogs] = useState<string[]>([]);
  
  const handleTestConnection = async () => {
    const { host, httpPort } = scaleConfig;
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

  return (
    <div className="space-y-4">
        <DialogDescription>
            Defina o endereço de rede (IP) e as portas do computador onde o servidor da balança (ponte) está rodando.
        </DialogDescription>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="scale-ip" className="text-right">
              Host (IP)
            </Label>
            <Input
              id="scale-ip"
              value={scaleConfig.host}
              onChange={(e) =>
                onScaleConfigChange({ ...scaleConfig, host: e.target.value })
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
              value={scaleConfig.wsPort}
              onChange={(e) =>
                onScaleConfigChange({ ...scaleConfig, wsPort: parseInt(e.target.value, 10) || 0 })
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
              value={scaleConfig.httpPort}
              onChange={(e) =>
                onScaleConfigChange({ ...scaleConfig, httpPort: parseInt(e.target.value, 10) || 0 })
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
    </div>
  );
};


// --- Appearance Settings Tab ---
const AppearanceTab = () => {
    const { theme, setTheme, resetTheme } = useTheme();

    const handleColorChange = (key: keyof ThemeHex, value: string) => {
        setTheme({ colors: { ...theme.colors, [key]: value } });
    };

    const handleRadiusChange = (value: number[]) => {
      setTheme({ radius: value[0] });
    }
    
    const handleFontChange = (value: string) => {
        setTheme({ fontFamily: value });
    }

    const colorSettings: { key: keyof ThemeHex; label: string }[] = [
        { key: 'background', label: 'Fundo Principal' },
        { key: 'foreground', label: 'Texto Principal' },
        { key: 'card', label: 'Fundo dos Cards' },
        { key: 'cardForeground', label: 'Texto dos Cards' },
        { key: 'primary', label: 'Cor Primária (Destaques)' },
        { key: 'primaryForeground', label: 'Texto Cor Primária' },
        { key: 'secondary', label: 'Cor Secundária' },
        { key: 'secondaryForeground', label: 'Texto Cor Secundária' },
        { key: 'muted', label: 'Fundo Muted' },
        { key: 'mutedForeground', label: 'Texto Muted' },
        { key: 'accent', label: 'Cor de Ênfase (Hover)' },
        { key: 'accentForeground', label: 'Texto Cor de Ênfase' },
        { key: 'destructive', label: 'Cor Destrutiva (Erros)' },
        { key: 'destructiveForeground', label: 'Texto Cor Destrutiva' },
        { key: 'border', label: 'Cor das Bordas' },
        { key: 'input', label: 'Fundo dos Inputs' },
        { key: 'ring', label: 'Cor do Anel de Foco' },
        { key: 'cacambaForeground', label: 'Texto Título Caçamba' },
    ];
    
    const fontOptions = [
        { value: 'Inter', label: 'Inter' },
        { value: 'Roboto', label: 'Roboto' },
        { value: 'Lato', label: 'Lato' },
    ];

    return (
      <div className="space-y-4">
          <DialogDescription>
              Personalize a aparência do aplicativo. As alterações são salvas automaticamente no seu navegador.
          </DialogDescription>
          <ScrollArea className="h-96 w-full pr-4">
            <div className="grid grid-cols-1 gap-x-6 gap-y-4 pt-4">
                
                {/* Font Family */}
                <div className="space-y-2">
                    <Label>Tipografia</Label>
                    <Select value={theme.fontFamily} onValueChange={handleFontChange}>
                        <SelectTrigger>
                            <SelectValue placeholder="Selecione uma fonte" />
                        </SelectTrigger>
                        <SelectContent>
                            {fontOptions.map(font => (
                                <SelectItem key={font.value} value={font.value}>{font.label}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                
                {/* Border Radius */}
                <div className="space-y-2">
                    <Label>Raio da Borda ({theme.radius}rem)</Label>
                    <Slider
                        min={0}
                        max={2}
                        step={0.1}
                        value={[theme.radius]}
                        onValueChange={handleRadiusChange}
                    />
                </div>

                {/* Color Settings */}
                {colorSettings.map(({ key, label }) => (
                     <div key={key} className="flex items-center justify-between">
                         <Label htmlFor={`color-${key}`}>{label}</Label>
                         <div className="flex items-center gap-2">
                             <span className="text-sm font-mono text-muted-foreground">{theme.colors[key]}</span>
                             <Input
                                 id={`color-${key}`}
                                 type="color"
                                 value={theme.colors[key] || '#000000'}
                                 onChange={(e) => handleColorChange(key, e.target.value)}
                                 className="w-10 h-10 p-1"
                             />
                         </div>
                     </div>
                ))}
            </div>
          </ScrollArea>
          <div className="pt-4 border-t">
              <Button variant="ghost" onClick={resetTheme}>Restaurar Padrões</Button>
          </div>
      </div>
    );
};


export function SettingsDialog({
  isOpen,
  onOpenChange,
  scaleConfig,
  onScaleConfigChange,
  onSave,
}: SettingsDialogProps) {

  const handleSaveAndClose = () => {
    onSave(); // This will save network settings and trigger reconnect
    onOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Configurações</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="network" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="network">Rede</TabsTrigger>
                <TabsTrigger value="appearance">Aparência</TabsTrigger>
            </TabsList>
            <TabsContent value="network" className="py-4">
                <NetworkTab scaleConfig={scaleConfig} onScaleConfigChange={onScaleConfigChange} />
            </TabsContent>
            <TabsContent value="appearance" className="py-4">
                <AppearanceTab />
            </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button onClick={handleSaveAndClose}>Salvar e Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

    
