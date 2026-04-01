import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useStorageMonitor } from '@/hooks/use-storage-monitor';

/**
 * Componente que exibe um alerta quando localStorage ultrapassa 80% de uso
 * Inclui informações sobre os dados antigos que serão removidos automaticamente
 */
export function StorageWarningAlert() {
  const storage = useStorageMonitor();

  if (!storage.show) return null;

  const usedMB = (storage.bytesUsed / (1024 * 1024)).toFixed(2);
  const availableMB = (storage.bytesAvailable / (1024 * 1024)).toFixed(1);

  return (
    <Alert variant="destructive" className="mb-4">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>Espaço de Armazenamento em Alerta</AlertTitle>
      <AlertDescription className="space-y-2">
        <p>
          Você está usando <strong>{storage.percentageUsed}%</strong> do espaço disponível ({usedMB} MB de {availableMB} MB).
        </p>
        <p className="text-sm">
          ℹ️ O app mantém automaticamente um histórico rolling de <strong>30 dias</strong>. 
          Pesagens mais antigas são removidas diariamente para liberar espaço.
        </p>
      </AlertDescription>
    </Alert>
  );
}
