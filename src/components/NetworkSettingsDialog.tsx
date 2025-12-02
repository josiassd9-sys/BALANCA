"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface NetworkSettingsDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  config: { ip: string; port: string };
  onConfigChange: (newConfig: { ip: string; port: string }) => void;
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
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="scale-ip" className="text-right">
              Host (IP)
            </Label>
            <Input
              id="scale-ip"
              value={config.ip}
              onChange={(e) =>
                onConfigChange({ ...config, ip: e.target.value })
              }
              className="col-span-3"
              placeholder="Ex: 192.168.18.8"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="scale-port" className="text-right">
              Porta
            </Label>
            <Input
              id="scale-port"
              value={config.port}
              onChange={(e) =>
                onConfigChange({ ...config, port: e.target.value })
              }
              className="col-span-3"
              placeholder="Ex: 3000"
            />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={onSave}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
