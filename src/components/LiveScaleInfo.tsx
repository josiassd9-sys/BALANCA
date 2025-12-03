
'use client';

import { Weight } from "lucide-react";
import { ConnectionStatus } from "@/hooks/use-scale";

interface LiveScaleInfoProps {
    status: ConnectionStatus;
    weight: number;
}

export function LiveScaleInfo({ status, weight }: LiveScaleInfoProps) {
    const formattedWeight = new Intl.NumberFormat('pt-BR').format(weight);

    const getStatusColor = () => {
        switch(status) {
            case 'connected':
                return 'text-primary';
            case 'connecting':
                return 'text-ring'; // Use ring color for connecting
            case 'error':
            case 'disconnected':
                return 'text-destructive';
            default:
                return 'text-muted-foreground';
        }
    }

    return (
        <div className="flex items-center justify-end p-2 rounded-lg border bg-card w-full">
            <div className="text-right">
                <div className={`text-2xl font-bold ${getStatusColor()}`}>{formattedWeight} kg</div>
            </div>
        </div>
    );
}
