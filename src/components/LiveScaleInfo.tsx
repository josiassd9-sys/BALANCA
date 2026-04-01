'use client';

import { Copy, Check } from "lucide-react";
import { useState, useCallback } from "react";

interface LiveScaleInfoProps {
    weight: number;
    onWeightCopied?: (weightText: string) => void;
}

export function LiveScaleInfo({ weight, onWeightCopied }: LiveScaleInfoProps) {
    const [copied, setCopied] = useState(false);
    const formattedWeight = new Intl.NumberFormat('pt-BR').format(weight);

    // Função para copiar o peso ao tocar
    const handleCopyWeight = useCallback(async () => {
        const weightText = weight.toString();
        onWeightCopied?.(weightText);
        try {
            await navigator.clipboard.writeText(weightText);
        } catch (err) {
            console.error('Erro ao copiar peso:', err);
        }
        setCopied(true);
        // Reset o ícone de check após 1.5 segundos
        setTimeout(() => setCopied(false), 1500);
    }, [weight, onWeightCopied]);

    return (
        <div
            className="real-display flex items-center p-2 rounded-lg w-full cursor-pointer active:scale-[0.99] transition-transform duration-150 select-none"
            onClick={handleCopyWeight}
            title={copied ? "Peso copiado" : "Toque para copiar o peso"}
        >
            <div className="flex w-full items-end gap-1.5">
                <div className="text-right flex-1 min-w-0">
                    <div
                        className="text-2xl font-bold tracking-wider leading-none whitespace-nowrap"
                        style={{
                            fontVariantNumeric: 'tabular-nums',
                            textShadow: 'none',
                            color: 'hsl(var(--display-digits-hsl, var(--primary-hsl)))',
                        }}
                    >
                        {formattedWeight}
                    </div>
                </div>

                <div className="flex flex-col items-center justify-end gap-0.5 shrink-0 w-5 pb-0.5">
                    {copied ? (
                        <Check className="h-3.5 w-3.5 text-emerald-300" />
                    ) : (
                        <Copy className="h-3.5 w-3.5 text-emerald-200/80" />
                    )}
                    <span className="text-[10px] leading-none text-emerald-200/90">kg</span>
                </div>
            </div>
        </div>
    );
}
