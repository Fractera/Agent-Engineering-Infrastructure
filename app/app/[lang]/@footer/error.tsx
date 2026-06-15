'use client';

import { SlotLabel } from '@/components/slot/slot-label.server';

export default function FooterError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <SlotLabel type="error" name="FOOTER" />;
}
