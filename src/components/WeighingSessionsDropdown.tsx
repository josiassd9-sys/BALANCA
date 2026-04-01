'use client';

import { useState, useEffect } from 'react';
import { ChevronDown, Plus, Trash2, FileText, CheckCircle2 } from 'lucide-react';
import { Button } from './ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { Badge } from './ui/badge';
import type {
  WeighingSession} from '@/services/weighing-sessions';
import {
  getOpenSessions,
  formatSessionDate,
  deleteSession,
  createBlankSession,
  WEIGHING_SESSIONS_STORAGE_KEY,
} from '@/services/weighing-sessions';
import { toast } from '@/hooks/use-toast';
import type { OperationType } from '@/components/scale/types';

interface WeighingSessionsDropdownProps {
  currentSessionId: string | null;
  onSessionSelect: (session: WeighingSession) => void;
  onNewSession: (session: WeighingSession) => void;
  onSessionsChange: () => void;
  sessionsRevision: number;
}

export function WeighingSessionsDropdown({
  currentSessionId,
  onSessionSelect,
  onNewSession,
  onSessionsChange,
  sessionsRevision,
}: WeighingSessionsDropdownProps) {
  const [sessions, setSessions] = useState<WeighingSession[]>([]);
  const [open, setOpen] = useState(false);
  const [isOperationDialogOpen, setIsOperationDialogOpen] = useState(false);

  const isAutoDraftSession = (session: WeighingSession) => {
    const hasClient = session.headerData.client.trim().length > 0;
    const hasPlate = session.headerData.plate.trim().length > 0;
    const hasDriver = session.headerData.driver.trim().length > 0;
    const hasItems = session.weighingSets.some((set) => set.items.length > 0);

    return !session.operationConfirmed && !hasClient && !hasPlate && !hasDriver && !hasItems;
  };

  const loadSessions = () => {
    const openSessions = getOpenSessions().filter((session) => !isAutoDraftSession(session));
    setSessions(openSessions.sort((a, b) =>
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    ));
  };

  useEffect(() => {
    loadSessions();
  }, []);

  useEffect(() => {
    if (open) loadSessions();
  }, [open]);

  // Recarrega sempre que o pai avisar mudança via contador estável
  useEffect(() => {
    loadSessions();
  }, [sessionsRevision]);

  // Sincroniza alterações de sessões vindas de outras abas
  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key === WEIGHING_SESSIONS_STORAGE_KEY) {
        loadSessions();
      }
    };

    window.addEventListener('storage', onStorage);

    return () => {
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  const handleSelectSession = (session: WeighingSession) => {
    onSessionSelect(session);
    setOpen(false);
  };

  const handleNewSessionRequest = () => {
    setOpen(false);
    setIsOperationDialogOpen(true);
  };

  const handleNewSessionWithOperation = (operationType: OperationType) => {
    try {
      const newSession = createBlankSession(operationType, true);
      onNewSession(newSession);
      loadSessions();
      onSessionsChange(); // avisa pai
      setIsOperationDialogOpen(false);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Erro ao criar',
        description: error instanceof Error ? error.message : 'Limite atingido',
      });
      setIsOperationDialogOpen(false);
    }
  };

  const handleDeleteSession = (e: React.MouseEvent<HTMLButtonElement>, sessionId: string, clientName: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm(`Excluir "${clientName || 'Sem nome'}"?`)) return;

    deleteSession(sessionId);
    loadSessions();
    onSessionsChange(); // avisa pai

    if (sessionId === currentSessionId) {
      const newSession = createBlankSession();
      onNewSession(newSession);
    }

    toast({ title: 'Excluída', description: `${clientName || 'Sem nome'} removido` });
  };

  const getCurrentSessionName = () => {
    const current = sessions.find(s => s.id === currentSessionId);
    return current?.clientName || 'Nova Pesagem';
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className="surface-3d flex items-center gap-2 min-w-[200px] justify-between border-border/70"
          title={`Atual: ${getCurrentSessionName()} • Clique para iniciar/selecionar uma pesagem`}
        >
          <span className="truncate max-w-[150px] font-medium">Abrir lista</span>
          <div className="flex items-center gap-1">
            {sessions.length > 0 && (
              <Badge variant="secondary" className="h-5 min-w-[20px] px-1">
                {sessions.length}
              </Badge>
            )}
            <span
              className="inline-block h-1.5 w-1.5 rounded-full bg-primary/80 animate-pulse"
              aria-hidden="true"
            />
            <ChevronDown className="h-4 w-4" />
          </div>
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start" className="surface-3d w-[320px] border-border/70">
        <DropdownMenuItem onClick={handleNewSessionRequest} className="flex items-center gap-2 cursor-pointer rounded-md focus:bg-accent/70">
          <Plus className="h-4 w-4 text-green-500" />
          <span className="font-medium">Nova Pesagem</span>
        </DropdownMenuItem>

        {sessions.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <div className="px-2 py-1 text-xs text-muted-foreground">
              Pesagens em Aberto ({sessions.length}/50)
            </div>
            {sessions.map(session => (
              <DropdownMenuItem
                key={session.id}
                onClick={() => handleSelectSession(session)}
                className={`flex justify-between cursor-pointer rounded-md ${session.id === currentSessionId ? 'bg-accent/80' : 'hover:bg-accent/45'}`}
              >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <FileText className="h-4 w-4 text-blue-500 flex-shrink-0" />
                  <div className="flex flex-col min-w-0">
                    <span className="truncate font-medium text-sm">
                      {session.clientName || 'Cliente sem nome'}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatSessionDate(session.updatedAt)}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {session.id === currentSessionId && <CheckCircle2 className="h-4 w-4 text-green-500" />}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 hover:text-destructive"
                    onPointerDown={e => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                    onClick={e => handleDeleteSession(e, session.id, session.clientName)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </DropdownMenuItem>
            ))}
          </>
        )}
      </DropdownMenuContent>

      <Dialog open={isOperationDialogOpen} onOpenChange={setIsOperationDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Tipo da Operação</DialogTitle>
            <DialogDescription>
              Essa nova pesagem será de Carregamento ou Descarregamento?
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleNewSessionWithOperation('loading')}
            >
              Carregamento
            </Button>
            <Button
              type="button"
              onClick={() => handleNewSessionWithOperation('unloading')}
            >
              Descarregamento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DropdownMenu>
  );
}