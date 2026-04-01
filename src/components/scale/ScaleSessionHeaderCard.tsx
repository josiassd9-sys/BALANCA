import { type KeyboardEvent } from "react";
import { WeightInput } from "@/components/scale/WeightInput";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type HeaderData = {
  client: string;
  plate: string;
  driver: string;
};

type ScaleSessionHeaderCardProps = {
  headerData: HeaderData;
  onHeaderChange: (field: keyof HeaderData, value: string) => void;
  initialLabel: string;
  finalLabel: string;
  initialWeightValue: number;
  onInitialWeightChange: (value: string) => void;
  onInitialWeightFetch: () => boolean;
  onInitialWeightFocus: () => void;
  isInitialWeightLocked: boolean;
  hasPendingCopiedWeight: boolean;
};

export function ScaleSessionHeaderCard({
  headerData,
  onHeaderChange,
  initialLabel,
  finalLabel,
  initialWeightValue,
  onInitialWeightChange,
  onInitialWeightFetch,
  onInitialWeightFocus,
  isInitialWeightLocked,
  hasPendingCopiedWeight,
}: ScaleSessionHeaderCardProps) {
  const focusNextFromField = (field: keyof HeaderData) => {
    if (field === 'client') {
      focusById('motorista');
      return;
    }
    if (field === 'driver') {
      focusById('placa');
      return;
    }
    focusById('peso-inicial');
  };

  const handleFieldNext = (event: KeyboardEvent<HTMLInputElement>, field: keyof HeaderData) => {
    if (event.key !== 'Enter' && event.key !== 'Tab') return;
    event.preventDefault();
    focusNextFromField(field);
  };

  const focusById = (id: string) => {
    const input = document.getElementById(id) as HTMLInputElement | null;
    if (!input) return;
    input.focus();
    input.scrollIntoView({ block: "center", behavior: "smooth" });
  };

  return (
    <Card className="surface-3d mb-2 print:border-none print:shadow-none print:p-0">
      <CardContent className="p-2 sm:p-2.5">
        <div className="w-full space-y-1">
          <div className="flex justify-between items-end pb-1">
            <Label htmlFor="cliente" className="font-semibold text-sm md:text-base">Cliente</Label>
            <div className="flex items-center text-sm text-muted-foreground font-medium">
              <span className="w-28 text-center">{initialLabel}</span>
              <span className="w-28 text-center">{finalLabel}</span>
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <div className="relative">
              <Input
                id="cliente"
                value={headerData.client}
                onKeyDown={(event) => handleFieldNext(event, 'client')}
                onChange={(e) => onHeaderChange('client', e.target.value)}
                autoCapitalize="characters"
                enterKeyHint="next"
                className="h-8 print:hidden"
              />
            </div>
            <span className="hidden print:block print:text-black">{headerData.client || 'N/A'}</span>

            <div className="flex w-full items-end gap-1 text-xs sm:text-sm flex-nowrap">
              <div className="space-y-px flex-1 min-w-0">
                <Label htmlFor="motorista" className="text-xs sm:text-sm">Motorista</Label>
                <div className="relative">
                  <Input
                    id="motorista"
                    value={headerData.driver}
                    onKeyDown={(event) => handleFieldNext(event, 'driver')}
                    onChange={(e) => onHeaderChange('driver', e.target.value)}
                    autoCapitalize="characters"
                    enterKeyHint="next"
                    className="h-8 print:hidden text-sm"
                  />
                </div>
                <span className="hidden print:block print:text-black">{headerData.driver || 'N/A'}</span>
              </div>
              <div className="space-y-px flex-none w-24">
                <Label htmlFor="placa" className="text-xs sm:text-sm">Placa</Label>
                <div className="relative">
                  <Input
                    id="placa"
                    value={headerData.plate}
                    onKeyDown={(event) => handleFieldNext(event, 'plate')}
                    onChange={(e) => onHeaderChange('plate', e.target.value)}
                    autoCapitalize="characters"
                    enterKeyHint="next"
                    className="h-8 pl-2 print:hidden text-sm"
                  />
                </div>
                <span className="hidden print:block print:text-black">{headerData.plate || 'N/A'}</span>
              </div>
              <div className="space-y-px flex-none w-28">
                <Label className="text-xs sm:text-sm text-center block w-full">Peso Inicial</Label>
                <WeightInput
                  inputId="peso-inicial"
                  value={initialWeightValue}
                  onChange={onInitialWeightChange}
                  onFetch={onInitialWeightFetch}
                  onFocusInput={onInitialWeightFocus}
                  hasPendingCopiedWeight={hasPendingCopiedWeight}
                  disabled={isInitialWeightLocked}
                />
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}