"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export function BridgeBackupSettings() {
  const router = useRouter();

  return (
    <div className="space-y-4">
      <DialogHeader>
        <DialogTitle>Backup da Ponte de Comunicacao</DialogTitle>
        <DialogDescription>
          Aqui voce gerencia o arquivo balanca.js e o manual de apoio da ponte.
        </DialogDescription>
      </DialogHeader>

      <div className="rounded-lg border border-border p-4">
        <p className="text-sm text-muted-foreground">
          Abra a pagina da ponte para acessar backup, restauracao e documentacao.
        </p>

        <div className="pt-4">
          <Button type="button" variant="outline" onClick={() => router.push('/servidor-balanca')}>
            Gerenciar balanca.js e manual
          </Button>
        </div>
      </div>
    </div>
  );
}
