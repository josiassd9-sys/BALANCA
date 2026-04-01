import { LiveScaleInfo } from "@/components/LiveScaleInfo";
import { WeighingSessionsDropdown } from "@/components/WeighingSessionsDropdown";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { WeighingSession } from "@/services/weighing-sessions";
import type { OperationType } from "@/components/scale/types";
import { ArrowDownToLine, ArrowUpFromLine, Globe, Settings } from "lucide-react";

type ScaleCalculatorTopBarProps = {
  appTitle: string;
  titleFontSize: number;
  titleFontFamily: string;
  settingsButtonBg: string;
  currentSessionId: string | null;
  onSessionSelect: (session: WeighingSession) => void;
  onNewSession: (session: WeighingSession) => void;
  onSessionsChange: () => void;
  sessionsRevision: number;
  liveWeight: number;
  onWeightCopied: (weightText: string) => void;
  onOpenWeb: () => void | Promise<void>;
  onOpenSettings: () => void;
  status: 'connected' | 'connecting' | 'error' | 'disconnected' | string;
  operationType: OperationType;
  onOperationTypeChange: (type: OperationType) => void;
  compactMode?: boolean;
};

const getStatusColor = (status: ScaleCalculatorTopBarProps['status']) => {
  switch (status) {
    case 'connected':
      return 'bg-green-500';
    case 'connecting':
      return 'bg-yellow-500';
    case 'error':
    case 'disconnected':
      return 'bg-red-500';
    default:
      return 'bg-muted-foreground';
  }
};

export function ScaleCalculatorTopBar({
  appTitle,
  titleFontSize,
  titleFontFamily,
  settingsButtonBg,
  currentSessionId,
  onSessionSelect,
  onNewSession,
  onSessionsChange,
  sessionsRevision,
  liveWeight,
  onWeightCopied,
  onOpenWeb,
  onOpenSettings,
  status,
  operationType,
  onOperationTypeChange,
  compactMode = false,
}: ScaleCalculatorTopBarProps) {
  return (
    <div className="flex-shrink-0 bg-background/95 border-b border-border/60 print:hidden">
      {compactMode && (
        <div className="fixed right-2 top-2 z-50 sm:hidden">
          <LiveScaleInfo weight={liveWeight} onWeightCopied={onWeightCopied} />
        </div>
      )}

      <div className={cn("pt-0.5 pb-1 text-center", compactMode && "max-sm:hidden")}>
        <h2
          className="font-semibold tracking-tight text-foreground/95"
          style={{
            fontSize: `${Math.max(18, Math.round(titleFontSize * 0.9))}px`,
            fontFamily: `'${titleFontFamily}', sans-serif`,
          }}
        >
          {appTitle}
        </h2>
      </div>

      <div className={cn("flex flex-row flex-nowrap items-center justify-between gap-2.5 mb-2.5 px-2.5", compactMode && "max-sm:hidden")}>
        <div className="flex-1 min-w-0 overflow-hidden">
          <WeighingSessionsDropdown
            currentSessionId={currentSessionId}
            onSessionSelect={onSessionSelect}
            onNewSession={onNewSession}
            onSessionsChange={onSessionsChange}
            sessionsRevision={sessionsRevision}
          />
        </div>

        <div className="flex-1 flex justify-end min-w-[120px]">
          <LiveScaleInfo weight={liveWeight} onWeightCopied={onWeightCopied} />
        </div>
      </div>

      <div className={cn("grid grid-cols-[auto_1fr_auto] items-center gap-2.5 mb-2.5 px-2.5", compactMode && "max-sm:hidden")}>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="icon-chip h-8 w-10 sm:h-10 sm:w-14 border-border/55"
                style={{ backgroundColor: settingsButtonBg }}
                onClick={onOpenWeb}
              >
                <Globe className="h-4 w-4 sm:h-5 sm:w-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent><p>Internet / Pesquisa</p></TooltipContent>
          </Tooltip>
        </TooltipProvider>

          <div className="flex justify-center">
          <div className="surface-3d flex items-center gap-1 rounded-xl border border-border/60 p-1">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={operationType === 'loading' ? 'default' : 'ghost'}
                    className="button-3d h-9 w-28 rounded-lg px-3 text-xs font-semibold sm:h-10 sm:w-36 sm:text-sm"
                    onClick={() => onOperationTypeChange('loading')}
                  >
                    <ArrowUpFromLine className="h-4 w-4 sm:h-5 sm:w-5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent><p>Carregamento</p></TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={operationType === 'unloading' ? 'default' : 'ghost'}
                    className="button-3d h-9 w-28 rounded-lg px-3 text-xs font-semibold sm:h-10 sm:w-36 sm:text-sm"
                    onClick={() => onOperationTypeChange('unloading')}
                  >
                    <ArrowDownToLine className="h-4 w-4 sm:h-5 sm:w-5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent><p>Descarregamento</p></TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="icon-chip h-8 w-10 sm:h-10 sm:w-14 relative border-border/55"
                onClick={onOpenSettings}
                style={{ backgroundColor: settingsButtonBg }}
              >
                <span className={cn("absolute top-0.5 right-0.5 block h-2 w-2 rounded-full", getStatusColor(status))} />
                <Settings className="h-4 w-4 sm:h-5 sm:w-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent><p>Configurações</p></TooltipContent>
          </Tooltip>
        </TooltipProvider>

      </div>
    </div>
  );
}