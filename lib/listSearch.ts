export const LIST_SEARCH_DELAY_MS = 800;

/** Only the latest list request may update the screen. */
export function createListRequestGuard() {
  let controller: AbortController | undefined;
  let revision = 0;

  function cancel() {
    revision += 1;
    controller?.abort();
  }

  return {
    cancel,
    start() {
      cancel();
      const current = revision;
      const request = new AbortController();
      controller = request;

      return {
        signal: request.signal,
        isCurrent: () => current === revision && !request.signal.aborted,
      };
    },
  };
}
