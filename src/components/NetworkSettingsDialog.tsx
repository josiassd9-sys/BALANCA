"use client";

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

interface NetworkSettingsDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  config: ScaleConfig;
  onConfigChange: (newConfig: ScaleConfig) => void;
  onSave: () => void;
}

export function NetworkSettingsDialog({
  isOpen,
  onOpenChange,
  config,
  onConfigChange,
  onSave,
}: NetworkSettingsDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
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
        <DialogFooter>
          <Button onClick={onSave}>Salvar e Reconectar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
