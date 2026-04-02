import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { MaterialAutocompleteInput } from "@/components/scale/MaterialAutocompleteInput";
import { WeightInput } from "@/components/scale/WeightInput";
import { formatNumber } from "@/components/scale/format-number";
import type { OperationType, WeighingItem, WeighingSet } from "@/components/scale/types";
import { useTheme } from "@/hooks/use-theme";
import { ChevronDown, ChevronUp, CornerDownLeft, Trash2 } from "lucide-react";

type WeighingSetCardProps = {
  set: WeighingSet;
  setIndex: number;
  operationType: OperationType;
  onSetNameChange: (setId: string, value: string) => void;
  onToggleSetCollapse: (setId: string) => void;
  onToggleSetVisibility: (setId: string) => void;
  onSetTitlePointerUp: (setId: string) => void;
  onRemoveSet: (setId: string) => void;
  onAddMaterial: (setId: string) => void;
  onMaterialChange: (setId: string, itemId: string, value: string) => void;
  onInputChange: (setId: string, itemId: string, field: keyof WeighingItem, value: string) => void;
  onFetchLiveWeight: (callback: (weight: string) => void) => boolean;
  onWeightInputFocus: (target: {
    setId?: string;
    itemId?: string;
    field?: 'bruto' | 'tara';
    type: 'initial' | 'item';
  }) => void;
  hasPendingCopiedWeight: boolean;
  onRemoveMaterial: (setId: string, itemId: string) => void;
  onCacambaDiscount: (setId: string, value: string) => void;
};

export function WeighingSetCard({
  set,
  setIndex,
  operationType,
  onSetNameChange,
  onToggleSetCollapse,
  onToggleSetVisibility,
  onSetTitlePointerUp,
  onRemoveSet,
  onAddMaterial,
  onMaterialChange,
  onInputChange,
  onFetchLiveWeight,
  onWeightInputFocus,
  hasPendingCopiedWeight,
  onRemoveMaterial,
  onCacambaDiscount,
}: WeighingSetCardProps) {
  const { theme } = useTheme();
  const subtotalLiquido = set.items.reduce((acc, item) => acc + item.liquido, 0);
  const totalLiquidoSet = subtotalLiquido - set.descontoCacamba;
  const visibleItems = set.showAll ? set.items : set.items.slice(-1);
  const animationClassesByVariant = {
    none: 'transition-none',
    snappy: 'transition-all duration-150 ease-out',
    smooth: 'transition-all duration-200 ease-out',
    gentle: 'transition-all duration-300 ease-in-out',
  } as const;
  const collapseAnimationClass = animationClassesByVariant[theme.collapseAnimationVariant] || animationClassesByVariant.smooth;

  const focusLatestMaterialInput = (): boolean => {
    const selector = `input[id^="material-${set.id}-"]`;
    const candidates = Array.from(document.querySelectorAll<HTMLInputElement>(selector)).filter((input) => !input.disabled);
    const target = candidates[candidates.length - 1];

    if (!target) {
      return false;
    }

    target.focus();
    target.scrollIntoView({ block: "center", behavior: "smooth" });
    return true;
  };

  const handleSetQuickAdvance = () => {
    if (focusLatestMaterialInput()) {
      return;
    }

    onAddMaterial(set.id);

    window.setTimeout(() => {
      void focusLatestMaterialInput();
    }, 120);
  };

  return (
    <Card className="surface-3d mb-2 print:border-none print:shadow-none print:p-0 print:mb-0.5">
      <CardHeader className="px-2 py-1.5 flex flex-row items-center justify-between print:p-0 print:mb-0.5">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <div className="relative w-full min-w-0 max-w-48">
            <Input
              value={set.name}
              onChange={(e) => onSetNameChange(set.id, e.target.value)}
              onDoubleClick={() => onToggleSetVisibility(set.id)}
              onPointerUp={() => onSetTitlePointerUp(set.id)}
              autoCapitalize="characters"
              className="text-lg sm:text-xl font-semibold tracking-tight border-none focus-visible:ring-0 focus-visible:ring-offset-0 bg-transparent p-0 pr-8 h-auto w-full min-w-0 text-cacamba-foreground"
              title={set.showAll ? "Duplo toque para focar no material atual" : "Duplo toque para expandir historico da caixa"}
            />
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    type="button"
                    onClick={() => onToggleSetCollapse(set.id)}
                    className="absolute right-0 top-1/2 h-7 w-7 -translate-y-1/2 text-muted-foreground hover:text-foreground print:hidden"
                    title={set.isCollapsed ? "Expandir caixa" : "Recolher caixa"}
                  >
                    {set.isCollapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{set.isCollapsed ? "Expandir caixa" : "Recolher caixa"}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          {setIndex > 0 && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" onClick={() => onRemoveSet(set.id)} className="h-7 w-7 text-muted-foreground hover:text-destructive print:hidden">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent><p>Remover Caixa</p></TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>

        <div className="flex items-center gap-1">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  type="button"
                  onClick={handleSetQuickAdvance}
                  className="h-7 w-7 text-muted-foreground hover:text-foreground print:hidden"
                  title="Avancar para material"
                >
                  <CornerDownLeft className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent><p>Avancar para material (ou criar novo)</p></TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="default"
                  onClick={() => onAddMaterial(set.id)}
                  className="button-3d h-9 shrink-0 rounded-xl border border-primary/70 px-3 sm:px-4 text-xs sm:text-sm font-semibold print:hidden bg-primary text-primary-foreground hover:brightness-110 active:scale-[0.98] transition-all duration-200"
                >
                  <span className="tracking-wide">Adicionar material</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent><p>Adicionar Material</p></TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </CardHeader>

      <div
        className={`overflow-hidden motion-reduce:transition-none ${collapseAnimationClass} ${
          set.isCollapsed ? 'max-h-0 opacity-0' : 'max-h-[2500px] opacity-100'
        }`}
      >
      <CardContent className="px-1 pb-1 overflow-x-auto">
        <div className="sm:hidden">
          {visibleItems.map((item) => (
            <div key={item.id} className="border-b p-0.5 space-y-0.5">
              {(() => {
                const brutoId = `bruto-${set.id}-${item.id}`;
                const taraId = `tara-${set.id}-${item.id}`;
                const nextTargetId = operationType === 'loading' ? brutoId : taraId;
                return (
              <div className="flex items-end gap-1">
                <div className="space-y-px flex-grow">
                  <Label className="text-xs text-muted-foreground">Material</Label>
                  <MaterialAutocompleteInput
                    inputId={`material-${set.id}-${item.id}`}
                    placeholder="SUCATA"
                    value={item.material}
                    onChange={(value) => onMaterialChange(set.id, item.id, value)}
                    nextTargetId={nextTargetId}
                    disabled={Boolean(item.locked)}
                    className="w-full justify-between h-8"
                  />
                </div>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon" onClick={() => onRemoveMaterial(set.id, item.id)} disabled={Boolean(item.locked)} className="h-8 w-8 text-muted-foreground hover:text-destructive print:hidden disabled:opacity-40">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent><p>Remover Material</p></TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
                );
              })()}
              <div className="grid grid-cols-4 gap-0.5">
                <div className="space-y-px">
                  <Label className="text-xs text-muted-foreground">Bruto (kg)</Label>
                  <WeightInput
                    inputId={`bruto-${set.id}-${item.id}`}
                    value={item.bruto}
                    onChange={(value) => onInputChange(set.id, item.id, 'bruto', value)}
                    onFetch={() => onFetchLiveWeight((w) => onInputChange(set.id, item.id, 'bruto', w))}
                    onFocusInput={() => onWeightInputFocus({ type: 'item', setId: set.id, itemId: item.id, field: 'bruto' })}
                    hasPendingCopiedWeight={hasPendingCopiedWeight}
                    disabled={Boolean(item.locked)}
                  />
                </div>
                <div className="space-y-px">
                  <Label className="text-xs text-muted-foreground">Tara (kg)</Label>
                  <WeightInput
                    inputId={`tara-${set.id}-${item.id}`}
                    value={item.tara}
                    onChange={(value) => onInputChange(set.id, item.id, 'tara', value)}
                    onFetch={() => onFetchLiveWeight((w) => onInputChange(set.id, item.id, 'tara', w))}
                    onFocusInput={() => onWeightInputFocus({ type: 'item', setId: set.id, itemId: item.id, field: 'tara' })}
                    hasPendingCopiedWeight={hasPendingCopiedWeight}
                    disabled={Boolean(item.locked)}
                  />
                </div>
                <div className="space-y-px">
                  <Label className="text-xs text-muted-foreground">A/L (kg)</Label>
                  <Input
                    type="text"
                    inputMode="decimal"
                    placeholder="0"
                    value={item.descontos === 0 ? '' : formatNumber(item.descontos)}
                    onChange={(e) => onInputChange(set.id, item.id, 'descontos', e.target.value)}
                    disabled={Boolean(item.locked)}
                    className="text-right h-8 print:hidden w-full"
                  />
                  <span className="hidden print:block text-right print:text-black">{formatNumber(item.descontos)}</span>
                </div>
                <div className="space-y-px">
                  <Label className="text-xs text-muted-foreground">Líquido (kg)</Label>
                  <div className="h-8 flex items-center justify-end font-semibold">
                    <span className="print:text-black">{formatNumber(item.liquido)}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <Table className="hidden sm:table table-fixed">
          <TableHeader>
            <TableRow className="print:text-black">
              <TableHead className="w-auto">Material</TableHead>
              <TableHead className="text-right w-[16%]">Bruto (kg)</TableHead>
              <TableHead className="text-right w-[16%]">Tara (kg)</TableHead>
              <TableHead className="text-right w-[16%]">A/L (kg)</TableHead>
              <TableHead className="text-right font-semibold w-[16%]">Líquido (kg)</TableHead>
              <TableHead className="w-[5%] print:hidden"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visibleItems.map((item) => (
              <TableRow key={item.id} className="print:text-black">
                <TableCell className="font-medium p-0 sm:p-px">
                  {(() => {
                    const brutoId = `bruto-${set.id}-${item.id}`;
                    const taraId = `tara-${set.id}-${item.id}`;
                    const nextTargetId = operationType === 'loading' ? brutoId : taraId;
                    return (
                  <MaterialAutocompleteInput
                    inputId={`material-${set.id}-${item.id}`}
                    placeholder="SUCATA"
                    value={item.material}
                    onChange={(value) => onMaterialChange(set.id, item.id, value)}
                    nextTargetId={nextTargetId}
                    disabled={Boolean(item.locked)}
                    className="w-full justify-between h-8"
                  />
                    );
                  })()}
                </TableCell>
                <TableCell className="p-0 sm:p-px">
                  <WeightInput
                    inputId={`bruto-${set.id}-${item.id}`}
                    value={item.bruto}
                    onChange={(value) => onInputChange(set.id, item.id, 'bruto', value)}
                    onFetch={() => onFetchLiveWeight((w) => onInputChange(set.id, item.id, 'bruto', w))}
                    onFocusInput={() => onWeightInputFocus({ type: 'item', setId: set.id, itemId: item.id, field: 'bruto' })}
                    hasPendingCopiedWeight={hasPendingCopiedWeight}
                    disabled={Boolean(item.locked)}
                  />
                </TableCell>
                <TableCell className="p-0 sm:p-px">
                  <WeightInput
                    inputId={`tara-${set.id}-${item.id}`}
                    value={item.tara}
                    onChange={(value) => onInputChange(set.id, item.id, 'tara', value)}
                    onFetch={() => onFetchLiveWeight((w) => onInputChange(set.id, item.id, 'tara', w))}
                    onFocusInput={() => onWeightInputFocus({ type: 'item', setId: set.id, itemId: item.id, field: 'tara' })}
                    hasPendingCopiedWeight={hasPendingCopiedWeight}
                    disabled={Boolean(item.locked)}
                  />
                </TableCell>
                <TableCell className="p-0 sm:p-px">
                  <div className="flex justify-end">
                    <Input
                      type="text"
                      inputMode="decimal"
                      placeholder="0"
                      value={item.descontos === 0 ? '' : formatNumber(item.descontos)}
                      onChange={(e) => onInputChange(set.id, item.id, 'descontos', e.target.value)}
                      disabled={Boolean(item.locked)}
                      className="text-right h-8 print:hidden w-full"
                    />
                  </div>
                  <span className="hidden print:block text-right print:text-black">{formatNumber(item.descontos)}</span>
                </TableCell>
                <TableCell className="text-right font-semibold p-0 sm:p-px">
                  <div className="h-8 sm:h-full flex items-center justify-end">
                    <span className="print:text-black">{formatNumber(item.liquido)}</span>
                  </div>
                </TableCell>
                <TableCell className="p-0 sm:p-px text-center print:hidden">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" onClick={() => onRemoveMaterial(set.id, item.id)} disabled={Boolean(item.locked)} className="h-8 w-8 text-muted-foreground hover:text-destructive disabled:opacity-40">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent><p>Remover Material</p></TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>

      <CardContent className="px-2 py-1.5 border-t border-border/55 print:border-t print:border-border print:p-0 print:pt-0.5">
        <div className="grid grid-cols-[8.5rem_minmax(0,1fr)] items-start gap-x-2 gap-y-1 sm:flex sm:items-center sm:justify-end sm:gap-3">
          <div className="space-y-0.5 sm:space-y-0 sm:flex sm:items-center sm:gap-1">
            <Label htmlFor={`desconto-cacamba-${set.id}`} className="block text-left text-sm md:text-base sm:text-right">Desconto (kg)</Label>
            <Input
              id={`desconto-cacamba-${set.id}`}
              type="text"
              inputMode="decimal"
              placeholder="0"
              value={set.descontoCacamba === 0 ? '' : formatNumber(set.descontoCacamba)}
              onChange={(e) => onCacambaDiscount(set.id, e.target.value)}
              className="h-8 w-[8.5rem] sm:w-28 text-right print:hidden"
            />
            <span className="hidden print:block font-semibold print:text-black">{formatNumber(set.descontoCacamba)}</span>
          </div>

          <div className="min-w-0">
            <div className="grid grid-cols-[5.5rem_minmax(12ch,1fr)] items-baseline justify-end gap-x-2 gap-y-0.5 whitespace-nowrap text-right">
              <p className="text-sm text-muted-foreground text-left">Subtotal</p>
              <p className="text-lg font-bold tabular-nums print:text-black">{formatNumber(subtotalLiquido)} kg</p>
              <p className="text-sm text-muted-foreground text-left">{set.name}</p>
              <p className="text-xl font-bold text-primary tabular-nums print:text-black">{formatNumber(totalLiquidoSet)} kg</p>
            </div>
          </div>
        </div>
      </CardContent>
      </div>
    </Card>
  );
}