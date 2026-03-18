import { useState, useCallback } from 'react';

export function usePacketRate() {
  const [attempted, setAttempted] = useState(0);
  const [received,  setReceived]  = useState(0);

  const recordAttempt  = useCallback(() => setAttempted(a => a + 1), []);
  const recordReceived = useCallback(() => setReceived(r => r + 1), []);
  const reset = useCallback(() => { setAttempted(0); setReceived(0); }, []);

  const rate = attempted === 0 ? null : (received / attempted) * 100;
  return { attempted, received, rate, recordAttempt, recordReceived, reset };
}
