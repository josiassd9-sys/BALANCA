
"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type { ScaleConfig } from "@/hooks/use-scale";
import { AppearanceSettings } from "@/components/settings/AppearanceSettings";
import { NetworkSettings } from "@/components/settings/NetworkSettings";
import { MaterialCatalogSettings } from "@/components/settings/MaterialCatalogSettings";
import { BridgeBackupSettings } from "@/components/settings/BridgeBackupSettings";
import { PrintingSettings } from "@/components/settings/PrintingSettings";
import { UsageInstructionsSettings } from "@/components/settings/UsageInstructionsSettings";

interface SettingsDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  scaleConfig: ScaleConfig;
  onScaleConfigChange: (newConfig: ScaleConfig) => void;
  onSave: () => void;
}

export function SettingsDialog({ isOpen, onOpenChange, scaleConfig, onScaleConfigChange, onSave }: SettingsDialogProps) {
  const [activeCategory, setActiveCategory] = useState<
    "appearance" | "network" | "catalog" | "backup" | "printing" | "instructions"
  >("appearance");

  useEffect(() => {
    if (isOpen) {
      setActiveCategory("appearance");
    }
  }, [isOpen]);

  const categories = useMemo(
    () => [
      { id: "appearance" as const, label: "Aparencia" },
      { id: "network" as const, label: "Rede" },
      { id: "catalog" as const, label: "Catalogo de Materiais" },
      { id: "backup" as const, label: "Backup da Ponte" },
      { id: "printing" as const, label: "Impressao" },
      { id: "instructions" as const, label: "Instrucoes de Uso" },
    ],
    [],
  );

  const handleSaveAndClose = () => {
    onSave();
    onOpenChange(false);
  };

  const renderActiveCategory = () => {
    switch (activeCategory) {
      case "appearance":
        return <AppearanceSettings />;
      case "network":
        return <NetworkSettings scaleConfig={scaleConfig} onScaleConfigChange={onScaleConfigChange} />;
      case "catalog":
        return <MaterialCatalogSettings />;
      case "backup":
        return <BridgeBackupSettings />;
      case "printing":
        return <PrintingSettings />;
      case "instructions":
        return <UsageInstructionsSettings />;
      default:
        return <AppearanceSettings />;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="left-0 top-0 z-50 h-screen h-[100svh] w-screen max-w-none translate-x-0 translate-y-0 overflow-hidden rounded-none border-0 p-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pt-[calc(env(safe-area-inset-top)+0.75rem)] sm:left-[50%] sm:top-[50%] sm:h-[90vh] sm:w-[min(95vw,80rem)] sm:translate-x-[-50%] sm:translate-y-[-50%] sm:rounded-lg sm:border sm:p-6">
        <div className="grid h-full min-h-0 grid-cols-1 gap-3 md:grid-cols-[240px_minmax(0,1fr)] md:gap-4">
          <aside className="rounded-lg border border-border p-2">
            <nav className="flex gap-1 overflow-x-auto pb-1 md:grid md:grid-cols-1 md:gap-1 md:overflow-visible md:pb-0">
              {categories.map((category) => (
                <Button
                  key={category.id}
                  type="button"
                  variant="ghost"
                  className={cn(
                    "shrink-0 justify-start whitespace-nowrap md:w-full",
                    activeCategory === category.id && "bg-muted font-semibold text-foreground",
                  )}
                  onClick={() => setActiveCategory(category.id)}
                >
                  {category.label}
                </Button>
              ))}
            </nav>
          </aside>

          <div className="min-h-0 overflow-y-auto pr-1 pb-4 touch-pan-y md:pr-2">
            {renderActiveCategory()}
          </div>
        </div>

        <div className="border-t border-border/60 bg-background/95 pt-2">
          <Button
            onClick={handleSaveAndClose}
            className="w-full shadow-lg md:ml-auto md:w-auto"
          >
            Salvar e Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

    
    