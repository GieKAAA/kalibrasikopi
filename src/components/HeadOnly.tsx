import { Lock } from 'lucide-react';
import type { ReactNode } from 'react';
import { useIsHead } from '../store/useApp';
import { EmptyState } from './ui';

export function HeadOnly({ children }: { children: ReactNode }) {
  const isHead = useIsHead();
  if (isHead) return <>{children}</>;
  return (
    <EmptyState icon={<Lock className="size-7" />} title="Khusus Head Barista">
      Halaman ini hanya dapat diubah oleh akun Head Barista.
    </EmptyState>
  );
}
