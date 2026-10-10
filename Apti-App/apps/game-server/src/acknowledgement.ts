/**
 * Socket.IO passes no callback when a client emits without one; calling it would throw
 * inside the event handler and crash the process, so a missing callback becomes a no-op.
 */
export function safeAcknowledge<Response>(
  acknowledge: ((response: Response) => void) | undefined,
): (response: Response) => void {
  return typeof acknowledge === "function" ? acknowledge : ignoreAcknowledgement;
}

function ignoreAcknowledgement(): void {}
