import React from 'react';
import { WifiOff } from 'lucide-react';
import { useOnlineStatus } from '@/src/hooks/useOnlineStatus';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div
      role="status"
      className="fixed bottom-20 left-4 right-4 z-40 mx-auto flex max-w-md items-center gap-2.5 rounded-xl border border-amber-300 bg-amber-50 px-4 py-2.5 text-xs font-medium text-amber-900 shadow-lg md:bottom-5 md:left-6 md:right-auto dark:border-amber-800 dark:bg-amber-950/95 dark:text-amber-200"
    >
      <WifiOff className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
      <span>
        Mode Offline aktif — panduan visual & perubahan data tersimpan di perangkat dan akan tersinkron saat online.
      </span>
    </div>
  );
};
