import { useEffect, useState } from 'react';
import { getStorageStats } from '@/services/weighing-sessions';

export type StorageWarning = {
  show: boolean;
  percentageUsed: number;
  bytesUsed: number;
  bytesAvailable: number;
};

/**
 * Hook que monitora o uso de localStorage e retorna aviso quando > 80%
 * Verifica a cada 60 segundos ou quando a página volta ao foco
 */
export function useStorageMonitor(): StorageWarning {
  const [warning, setWarning] = useState<StorageWarning>({
    show: false,
    percentageUsed: 0,
    bytesUsed: 0,
    bytesAvailable: 5 * 1024 * 1024,
  });

  useEffect(() => {
    const checkStorage = () => {
      const stats = getStorageStats();
      setWarning({
        show: stats.isWarning,
        percentageUsed: stats.percentageUsed,
        bytesUsed: stats.bytesUsed,
        bytesAvailable: stats.bytesAvailable,
      });
    };

    // Verificação inicial
    checkStorage();

    // Verificar a cada 60 segundos
    const interval = setInterval(checkStorage, 60000);

    // Verificar quando página ganhar foco
    const handleFocus = () => checkStorage();
    window.addEventListener('focus', handleFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  return warning;
}
