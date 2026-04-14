import type { CSSProperties } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { MaterialAutocompleteInput } from "@/components/scale/MaterialAutocompleteInput";
import { WeightInput } from "@/components/scale/WeightInput";
import { formatNumber } from "@/components/scale/format-number";
import { sortWeighingItemsForDisplay } from "@/components/scale/sort-weighing-items";
import type { OperationType, WeighingItem, WeighingSet } from "@/components/scale/types";
import { useTheme } from "@/hooks/use-theme";
import { ChevronDown, ChevronUp, CornerDownLeft, Scale as ScaleIcon, Trash2 } from "lucide-react";

type HslColor = {
  h: number;
  s: number;
  l: number;
};

const SET_COLOR_VARIANTS = [
  { hueShift: 0, saturationShift: 0, lightnessShift: 0 },
  { hueShift: 14, saturationShift: 4, lightnessShift: -4 },
  { hueShift: -12, saturationShift: 2, lightnessShift: 5 },
  { hueShift: 22, saturationShift: 6, lightnessShift: -6 },
  { hueShift: -20, saturationShift: 4, lightnessShift: 4 },
  { hueShift: 30, saturationShift: 8, lightnessShift: -8 },
] as const;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function normalizeHue(value: number): number {
  return ((value % 360) + 360) % 360;
}

function hexToHsl(hex: string): HslColor | null {
  if (!hex.startsWith('#')) return null;

  let r: number;
  let g: number;
  let b: number;

  if (hex.length === 4) {
    r = parseInt(hex[1] + hex[1], 16);
    g = parseInt(hex[2] + hex[2], 16);
    b = parseInt(hex[3] + hex[3], 16);
  } else if (hex.length === 7) {
    r = parseInt(hex.slice(1, 3), 16);
    g = parseInt(hex.slice(3, 5), 16);
    b = parseInt(hex.slice(5, 7), 16);
  } else {
    return null;
  }

  const red = r / 255;
  const green = g / 255;
  const blue = b / 255;
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const delta = max - min;
  let hue = 0;
  const lightness = (max + min) / 2;
  const saturation = delta === 0
    ? 0
    : delta / (1 - Math.abs(2 * lightness - 1));

  if (delta !== 0) {
    switch (max) {
      case red:
        hue = ((green - blue) / delta) % 6;
        break;
      case green:
        hue = (blue - red) / delta + 2;
        break;
      default:
        hue = (red - green) / delta + 4;
        break;
    }
  }

  return {
    h: Math.round(normalizeHue(hue * 60)),
    s: Math.round(saturation * 100),
    l: Math.round(lightness * 100),
  };
}

function toHslString(color: HslColor, alpha?: number): string {
  if (typeof alpha === 'number') {
    return `hsl(${color.h} ${color.s}% ${color.l}% / ${alpha})`;
  }

  return `hsl(${color.h} ${color.s}% ${color.l}%)`;
}

function getSetAccentColor(primaryHex: string, setIndex: number): HslColor {
  const base = hexToHsl(primaryHex) ?? { h: 158, s: 44, l: 55 };
  const variant = SET_COLOR_VARIANTS[setIndex % SET_COLOR_VARIANTS.length];

  return {
    h: normalizeHue(base.h + variant.hueShift),
    s: clamp(base.s + variant.saturationShift, 24, 88),
    l: clamp(base.l + variant.lightnessShift, 36, 68),
  };
}

function getAccentForeground(color: HslColor): string {
  return color.l >= 60 ? 'hsl(var(--card-hsl))' : 'hsl(var(--primary-foreground-hsl))';
}

function hashString(value: string): number {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }

  return hash;
}

function getMaterialAccentColor(materialName: string, baseColor: HslColor): HslColor | null {
  const normalizedMaterial = materialName.trim().toUpperCase();
  if (!normalizedMaterial) return null;

  const hash = hashString(normalizedMaterial);
  const hueOffset = (hash % 15) - 7;
  const saturationOffset = (hash % 7) - 3;
  const lightnessOffset = ((hash >> 3) % 9) - 4;

  return {
    h: normalizeHue(baseColor.h + hueOffset),
    s: clamp(baseColor.s + saturationOffset, 24, 86),
    l: clamp(baseColor.l + lightnessOffset, 34, 72),
  };
}

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
  onReclassifyMaterial: (setId: string, itemId: string) => void;
  onReclassWeightChange: (setId: string, itemId: string, value: string) => void;
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
  onReclassifyMaterial,
  onReclassWeightChange,
}: WeighingSetCardProps) {
  const { theme } = useTheme();
  const accentColor = getSetAccentColor(theme.colors.primary, setIndex);
  const accentForeground = getAccentForeground(accentColor);
  const subtotalLiquido = set.items.reduce((acc, item) => acc + item.liquido, 0);
  const totalLiquidoSet = subtotalLiquido - set.descontoCacamba;
  const orderedItems = sortWeighingItemsForDisplay(set.items);
  const visibleItems = set.showAll ? orderedItems : set.items.slice(-1);
  const animationClassesByVariant = {
    none: 'transition-none',
    snappy: 'transition-all duration-150 ease-out',
    smooth: 'transition-all duration-200 ease-out',
    gentle: 'transition-all duration-300 ease-in-out',
  } as const;
  const collapseAnimationClass = animationClassesByVariant[theme.collapseAnimationVariant] || animationClassesByVariant.smooth;
  const setAccentStyle = {
    '--set-accent-color': toHslString(accentColor),
    '--set-accent-glow': toHslString(accentColor, 0.14),
    '--set-accent-surface': toHslString(accentColor, 0.18),
    '--set-accent-border': toHslString(accentColor, 0.34),
    '--set-accent-outline': toHslString(accentColor, 0.12),
    '--set-accent-button-border': toHslString(accentColor, 0.72),
    '--set-accent-button-outline': toHslString(accentColor, 0.18),
    '--set-accent-foreground': accentForeground,
  } as CSSProperties;

  const handleToggleSetHistory = () => {
    onToggleSetVisibility(set.id);
  };

  return (
    <Card className="surface-3d set-accent-card mb-2 print:border-none print:shadow-none print:p-0 print:mb-0.5" style={setAccentStyle}>
      <CardHeader className="px-2 py-1.5 flex flex-row items-center justify-between print:p-0 print:mb-0.5">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <div className="relative w-full min-w-0 max-w-48">
            <Input
              value={set.name}
              onChange={(e) => onSetNameChange(set.id, e.target.value)}
              onDoubleClick={() => onToggleSetVisibility(set.id)}
              onPointerUp={() => onSetTitlePointerUp(set.id)}
              autoCapitalize="characters"
              className="set-accent-title text-lg sm:text-xl font-semibold tracking-tight border-none focus-visible:ring-0 focus-visible:ring-offset-0 bg-transparent p-0 pr-8 h-auto w-full min-w-0 text-cacamba-foreground print:!text-black"
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
                  onClick={handleToggleSetHistory}
                  className="h-7 w-7 text-muted-foreground hover:text-foreground print:hidden"
                  title={set.showAll ? "Ocultar histórico" : "Mostrar histórico"}
                >
                  <CornerDownLeft className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent><p>{set.showAll ? "Ocultar materiais anteriores" : "Mostrar materiais anteriores"}</p></TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="default"
                  onClick={() => onAddMaterial(set.id)}
                  className="button-3d set-accent-button h-9 shrink-0 rounded-xl border px-3 sm:px-4 text-xs sm:text-sm font-semibold print:hidden hover:brightness-110 active:scale-[0.98] transition-all duration-200"
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
          {visibleItems.map((item) => {
            const materialAccentColor = getMaterialAccentColor(item.material, accentColor);
            const materialRowStyle = materialAccentColor
              ? {
                  '--material-accent-border': toHslString(materialAccentColor, 0.54),
                  '--material-accent-surface-strong': toHslString(materialAccentColor, 0.08),
                  '--material-accent-surface-soft': toHslString(materialAccentColor, 0.03),
                }
              : undefined;

            const brutoId = `bruto-${set.id}-${item.id}`;
            const taraId = `tara-${set.id}-${item.id}`;
            const nextTargetId = operationType === 'loading' ? brutoId : taraId;

            return (
              <div key={item.id} className="material-accent-row border-b p-0.5 space-y-0.5" style={materialRowStyle as CSSProperties | undefined}>
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

                <div className="space-y-2">
                  {item.reclassFromItemId && (
                    <div className="flex items-center gap-2">
                      <span className="inline-block px-2 py-1 text-[10px] font-semibold text-white bg-blue-600 rounded">
                        RECLASS
                      </span>
                    </div>
                  )}

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
                        disabled={Boolean(item.locked) || Boolean(item.reclassFromItemId)}
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
                        disabled={Boolean(item.locked) || Boolean(item.reclassFromItemId)}
                      />
                    </div>
                    <div className="space-y-px">
                      {item.reclassFromItemId ? (
                        <>
                          <Label className="text-xs text-muted-foreground">Reclass. (kg)</Label>
                          <Input
                            type="text"
                            inputMode="decimal"
                            placeholder="0"
                            value={item.reclassWeight === 0 || item.reclassWeight === undefined ? '' : formatNumber(item.reclassWeight)}
                            onChange={(e) => onReclassWeightChange(set.id, item.id, e.target.value)}
                            disabled={Boolean(item.locked)}
                            className="text-right h-8 print:hidden w-full"
                          />
                          <span className="hidden print:block text-right print:text-black">{formatNumber(item.reclassWeight || 0)}</span>
                        </>
                      ) : (
                        <>
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
                        </>
                      )}
                    </div>
                    <div className="space-y-px">
                      <Label className="text-xs text-muted-foreground">Líquido (kg)</Label>
                      <div className="h-8 flex items-center justify-end font-semibold">
                        <span className="print:text-black">{formatNumber(item.liquido)}</span>
                      </div>
                      {item.locked && !item.reclassFromItemId && item.liquido > 0 && (
                        <div className="mt-1 flex justify-end print:hidden">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-6 px-2 text-[10px]"
                            onClick={() => onReclassifyMaterial(set.id, item.id)}
                          >
                            Reclass.
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <Table className="hidden sm:table table-fixed">
          <TableHeader>
            <TableRow className="print:text-black">
              <TableHead className="w-auto">Material</TableHead>
              <TableHead className="text-right w-[16%]">Bruto (kg)</TableHead>
              <TableHead className="text-right w-[16%]">Tara (kg)</TableHead>
              <TableHead className="text-right w-[16%]">A/L (kg)</TableHead>
              <TableHead className="text-right font-semibold w-[16%]">Reclass.</TableHead>
              <TableHead className="w-[5%] print:hidden"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visibleItems.map((item) => {
              const materialAccentColor = getMaterialAccentColor(item.material, accentColor);
              const materialRowStyle = materialAccentColor
                ? {
                    '--material-accent-border': toHslString(materialAccentColor, 0.52),
                    '--material-accent-surface-strong': toHslString(materialAccentColor, 0.08),
                    '--material-accent-surface-soft': toHslString(materialAccentColor, 0.025),
                  }
                : undefined;

              return (
              <TableRow key={item.id} className="material-accent-row print:text-black" style={materialRowStyle as CSSProperties | undefined}>
                <TableCell className="font-medium p-0 sm:p-px">
                  <div className="flex items-center gap-2">
                    {item.reclassFromItemId && (
                      <span className="inline-block px-2 py-0.5 text-[10px] font-semibold text-white bg-blue-600 rounded whitespace-nowrap print:hidden">
                        RECLASS
                      </span>
                    )}
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
                  </div>
                </TableCell>
                <TableCell className="p-0 sm:p-px">
                  <WeightInput
                    inputId={`bruto-${set.id}-${item.id}`}
                    value={item.bruto}
                    onChange={(value) => onInputChange(set.id, item.id, 'bruto', value)}
                    onFetch={() => onFetchLiveWeight((w) => onInputChange(set.id, item.id, 'bruto', w))}
                    onFocusInput={() => onWeightInputFocus({ type: 'item', setId: set.id, itemId: item.id, field: 'bruto' })}
                    hasPendingCopiedWeight={hasPendingCopiedWeight}
                    disabled={Boolean(item.locked) || Boolean(item.reclassFromItemId)}
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
                    disabled={Boolean(item.locked) || Boolean(item.reclassFromItemId)}
                  />
                </TableCell>
                <TableCell className="p-0 sm:p-px">
                  {item.reclassFromItemId ? (
                    <>
                      <div className="flex justify-end">
                        <Input
                          type="text"
                          inputMode="decimal"
                          placeholder="0"
                          value={item.reclassWeight === 0 || item.reclassWeight === undefined ? '' : formatNumber(item.reclassWeight)}
                          onChange={(e) => onReclassWeightChange(set.id, item.id, e.target.value)}
                          disabled={Boolean(item.locked)}
                          className="text-right h-8 print:hidden w-full"
                        />
                      </div>
                      <span className="hidden print:block text-right print:text-black">{formatNumber(item.reclassWeight || 0)}</span>
                    </>
                  ) : (
                    <>
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
                    </>
                  )}
                </TableCell>
                <TableCell className="text-right font-semibold p-0 sm:p-px">
                  <div className="h-8 sm:h-full flex items-center justify-end gap-2">
                    <span className="print:text-black">{formatNumber(item.liquido)}</span>
                    {item.locked && !item.reclassFromItemId && item.liquido > 0 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-6 px-2 text-[10px] print:hidden"
                        onClick={() => onReclassifyMaterial(set.id, item.id)}
                      >
                        Reclass.
                      </Button>
                    )}
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
              );
            })}
          </TableBody>
        </Table>
      </CardContent>

      <CardContent className="px-2 py-1.5 border-t border-border/55 print:border-t print:border-border print:p-0 print:pt-0.5">
        <div className="grid grid-cols-[5.2rem_3.8rem_minmax(0,1fr)] items-stretch gap-x-2 gap-y-1 sm:flex sm:items-center sm:justify-end sm:gap-3">
          <div className="space-y-0.5 sm:space-y-0 sm:flex sm:items-center sm:gap-1">
            <Label htmlFor={`desconto-cacamba-${set.id}`} className="block text-left text-sm md:text-base sm:text-right">Desc (kg)</Label>
            <Input
              id={`desconto-cacamba-${set.id}`}
              type="text"
              inputMode="decimal"
              placeholder="0"
              value={set.descontoCacamba === 0 ? '' : formatNumber(set.descontoCacamba)}
              onChange={(e) => onCacambaDiscount(set.id, e.target.value)}
              className="h-8 w-[5.2rem] sm:w-28 text-right print:hidden"
            />
            <span className="hidden print:block font-semibold print:text-black">{formatNumber(set.descontoCacamba)}</span>
          </div>

          <div className="flex w-[3.8rem] self-stretch items-center justify-center rounded-lg border border-border/60 bg-muted/25 text-muted-foreground/90 shadow-sm print:hidden sm:h-8 sm:w-[2.2rem] sm:self-auto sm:rounded-md">
            <ScaleIcon className="h-7 w-7 sm:h-4 sm:w-4" aria-hidden="true" />
          </div>

          <div className="min-w-0">
            <div className="grid w-full grid-cols-[auto_minmax(0,1fr)] items-baseline gap-x-2 gap-y-0.5 whitespace-nowrap sm:grid-cols-[5.5rem_minmax(12ch,1fr)] sm:justify-end sm:gap-x-2 sm:text-right">
              <p className="text-sm text-muted-foreground text-left">Subtotal</p>
              <p className="justify-self-end text-right text-lg font-bold tabular-nums print:text-black">{formatNumber(subtotalLiquido)} kg</p>
              <p className="text-sm text-muted-foreground text-left">{set.name}</p>
              <p className="justify-self-end text-right set-accent-title text-xl font-bold tabular-nums print:!text-black">{formatNumber(totalLiquidoSet)} kg</p>
            </div>
          </div>
        </div>
      </CardContent>
      </div>
    </Card>
  );
}