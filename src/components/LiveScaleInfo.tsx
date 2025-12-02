
'use client';

import { Wifi, WifiOff, Weight, Signal, ServerCrash } from "lucide-react";
import { ConnectionStatus, ConnectionType } from "@/hooks/use-scale";

interface LiveScaleInfoProps {
    status: ConnectionStatus;
    weight: number;
    connectionType: ConnectionType;
    host: string;
}

export function LiveScaleInfo({ status, weight, connectionType, host }: LiveScaleInfoProps) {
    const getStatusInfo = () => {
        switch (status) {
            case 'connected':
                return { 
                    icon: <Wifi className="h-5 w-5 text-green-500" />,
                    text: 'Conectado',
                    textColor: 'text-green-500'
                };
            case 'connecting':
                return { 
                    icon: <Signal className="h-5 w-5 text-yellow-500 animate-pulse" />,
                    text: 'Conectando...',
                    textColor: 'text-yellow-500'
                };
            case 'disconnected':
                 return { 
                    icon: <WifiOff className="h-5 w-5 text-gray-500" />,
                    text: 'Desconectado',
                    textColor: 'text-gray-500'
                };
            case 'error':
                return { 
                    icon: <ServerCrash className="h-5 w-5 text-red-500" />,
                    text: 'Erro',
                    textColor: 'text-red-500'
                };
        }
    };

    const info = getStatusInfo();
    const formattedWeight = new Intl.NumberFormat('pt-BR').format(weight);

    return (
        <div className="flex items-center gap-4 p-2 rounded-lg border bg-card">
            <div className="flex items-center gap-2">
                {info.icon}
                <div>
                    <div className={`text-xs font-semibold ${info.textColor}`}>{info.text}</div>
                    <div className="text-xs text-muted-foreground">
                        {host} ({connectionType.toUpperCase()})
                    </div>
                </div>
            </div>
            <div className="flex items-center gap-2 pl-4 border-l">
                <Weight className="h-5 w-5 text-primary" />
                <div>
                    <div className="text-xs text-muted-foreground">Peso Ao Vivo</div>
                    <div className="text-2xl font-bold text-primary">{formattedWeight} kg</div>
                </div>
            </div>
        </div>
    );
}
