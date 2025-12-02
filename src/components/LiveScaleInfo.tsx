
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
        <div className="flex items-center justify-center p-2 rounded-lg border bg-card min-w-[140px]">
            <div className="text-center">
                <div className="text-2xl font-bold text-primary">{formattedWeight} kg</div>
            </div>
        </div>
    );
}
