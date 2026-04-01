import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { CheckCircle, FolderOpen, Printer, Save, Trash2 } from "lucide-react";

type ScaleCalculatorFooterProps = {
  grandTotalLiquido: number;
  onClear: () => void;
  onSave: () => void;
  onFinalize: () => void;
  onOpenFinalizedList: () => void;
  onPrint: () => void;
  sessionStatus: 'open' | 'closed';
  currentSessionId: string | null;
  compactMode?: boolean;
};

export function ScaleCalculatorFooter({
  grandTotalLiquido,
  onClear,
  onSave,
  onFinalize,
  onOpenFinalizedList,
  onPrint,
  sessionStatus,
  currentSessionId,
  compactMode = false,
}: ScaleCalculatorFooterProps) {
  const totalIsNegative = grandTotalLiquido < 0;

  return (
    <div className="flex-shrink-0 bg-background border-t border-border/60 print:hidden">
      <Card className="surface-3d bg-card/90 border-border/60 print:border print:border-border print:shadow-none print:p-0.5 text-foreground">
        <CardContent className={compactMode ? "p-2.5 flex items-center justify-between" : "p-3.5 flex items-center justify-between"}>
          <div className={compactMode ? "flex flex-col text-xs font-semibold leading-tight text-muted-foreground" : "flex flex-col text-sm font-semibold leading-tight text-muted-foreground"}>
            <span>PESO</span>
            <span>LÍQUIDO</span>
            <span>TOTAL</span>
          </div>

          <p
            className={compactMode
              ? `text-2xl font-extrabold print:text-black text-right ${totalIsNegative ? 'text-destructive' : 'text-foreground'}`
              : `text-4xl font-extrabold print:text-black text-right ${totalIsNegative ? 'text-destructive' : 'text-foreground'}`}
          >
            {new Intl.NumberFormat('pt-BR').format(grandTotalLiquido)} kg
          </p>
        </CardContent>
      </Card>

      <div className={compactMode ? "print:hidden px-3 pt-1.5 pb-1.5 border-t border-border/50 bg-background" : "print:hidden px-4 pt-2.5 pb-2.5 border-t border-border/50 bg-background"}>
        <div className="flex items-center justify-between max-w-md mx-auto gap-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={onClear}
                  variant="outline"
                  size="icon"
                  className={compactMode ? "button-3d h-10 w-10 flex-1 rounded-xl border border-border/60 flex flex-col items-center justify-center gap-0.5 text-xs active:scale-95 transition-transform" : "button-3d h-12 w-12 flex-1 rounded-xl border border-border/60 flex flex-col items-center justify-center gap-0.5 text-xs active:scale-95 transition-transform"}
                >
                  <Trash2 className="h-5 w-5" />
                  <span className={compactMode ? "hidden" : "text-[10px] opacity-75"}>Limpar</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent><p>Limpar Tudo (nova sessão)</p></TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={onSave}
                  variant="outline"
                  size="icon"
                  className={compactMode ? "button-3d h-10 w-10 flex-1 rounded-xl border border-border/60 flex flex-col items-center justify-center gap-0.5 text-xs active:scale-95 transition-transform" : "button-3d h-12 w-12 flex-1 rounded-xl border border-border/60 flex flex-col items-center justify-center gap-0.5 text-xs active:scale-95 transition-transform"}
                >
                  <Save className="h-5 w-5" />
                  <span className={compactMode ? "hidden" : "text-[10px] opacity-75"}>Salvar</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent><p>Salvar Pesagem</p></TooltipContent>
            </Tooltip>

            {sessionStatus === 'open' && currentSessionId && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    onClick={onFinalize}
                    variant="default"
                    size="icon"
                    className={compactMode ? "button-3d h-10 w-10 flex-1 rounded-xl border border-green-500/70 flex flex-col items-center justify-center gap-0.5 text-xs bg-green-600 hover:bg-green-700 active:scale-95 transition-transform" : "button-3d h-12 w-12 flex-1 rounded-xl border border-green-500/70 flex flex-col items-center justify-center gap-0.5 text-xs bg-green-600 hover:bg-green-700 active:scale-95 transition-transform"}
                  >
                    <CheckCircle className="h-5 w-5" />
                    <span className={compactMode ? "hidden" : "text-[10px] opacity-75"}>Finalizar</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent><p>Finalizar, salvar PDF e sugerir compartilhamento</p></TooltipContent>
              </Tooltip>
            )}

            {sessionStatus === 'closed' && currentSessionId && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    onClick={onOpenFinalizedList}
                    variant="default"
                    size="icon"
                    className={compactMode ? "button-3d h-10 w-10 flex-1 rounded-xl border border-blue-500/70 flex flex-col items-center justify-center gap-0.5 text-xs bg-blue-600 hover:bg-blue-700 active:scale-95 transition-transform" : "button-3d h-12 w-12 flex-1 rounded-xl border border-blue-500/70 flex flex-col items-center justify-center gap-0.5 text-xs bg-blue-600 hover:bg-blue-700 active:scale-95 transition-transform"}
                  >
                    <FolderOpen className="h-5 w-5" />
                    <span className={compactMode ? "hidden" : "text-[10px] opacity-75"}>Lista FIN</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent><p>Lista de pesagens finalizadas</p></TooltipContent>
              </Tooltip>
            )}

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={onPrint}
                  variant="outline"
                  size="icon"
                  className={compactMode ? "button-3d h-10 w-10 flex-1 rounded-xl border border-border/60 flex flex-col items-center justify-center gap-0.5 text-xs active:scale-95 transition-transform" : "button-3d h-12 w-12 flex-1 rounded-xl border border-border/60 flex flex-col items-center justify-center gap-0.5 text-xs active:scale-95 transition-transform"}
                >
                  <Printer className="h-5 w-5" />
                  <span className={compactMode ? "hidden" : "text-[10px] opacity-75"}>Imprimir</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent><p>Imprimir / Salvar PDF</p></TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      {currentSessionId && !compactMode && (
        <div className="text-center text-sm text-muted-foreground pb-2 print:hidden">
          Status: {sessionStatus === 'open' ? '🟢 Em Aberto' : '🔵 Finalizada'}
        </div>
      )}
    </div>
  );
}