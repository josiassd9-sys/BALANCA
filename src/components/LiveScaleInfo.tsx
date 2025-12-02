
'use client';

import { Weight } from "lucide-react";
import { ConnectionStatus, ConnectionType } from "@/hooks/use-scale";

interface LiveScaleInfoProps {
    status: ConnectionStatus;
    weight: number;
    connectionType: ConnectionType;
    host: string;
}

export function LiveScaleInfo({ status, weight, connectionType, host }: LiveScaleInfoProps) {
    const formattedWeight = new Intl.NumberFormat('pt-BR').format(weight);

    return (
        <div className="flex items-center gap-4 p-2 rounded-lg border bg-card">
            <div className="flex items-center gap-2">
                <Weight className="h-5 w-5 text-primary" />
                <div>
                    <div className="text-xs text-muted-foreground">Peso Ao Vivo</div>
                    <div className="text-2xl font-bold text-primary">{formattedWeight} kg</div>
                </div>
            </div>
        </div>
    );
}
