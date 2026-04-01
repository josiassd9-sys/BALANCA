"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export function MaterialCatalogSettings() {
  const router = useRouter();

  return (
    <div className="space-y-4">
      <DialogHeader>
        <DialogTitle>Catalogo de Materiais</DialogTitle>
        <DialogDescription>
          Aqui voce gerencia materiais e sucatas usados na pesagem.
        </DialogDescription>
      </DialogHeader>

      <div className="rounded-lg border border-border p-4">
        <p className="text-sm text-muted-foreground">
          Abra a pagina dedicada para criar, editar e organizar os materiais e sucatas.
        </p>

        <div className="pt-4">
          <Button type="button" variant="outline" onClick={() => router.push('/materiais')}>
            Gerenciar materiais e sucatas
          </Button>
        </div>
      </div>
    </div>
  );
}
