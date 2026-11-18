import type { Place } from "./types";

export function createHinter(send: (view: Place | null) => void, delay = 140) {
  let timer = 0;
  let sent: Place | null = null;
  let wanted: Place | null = null;
  const flush = () => {
    timer = 0;
    if (wanted !== sent) {
      sent = wanted;
      send(wanted);
    }
  };
  return {
    hint(view: Place | null) {
      wanted = view;
      window.clearTimeout(timer);
      timer = window.setTimeout(flush, delay);
    },
    clear() {
      window.clearTimeout(timer);
      timer = 0;
      wanted = null;
      if (sent !== null) {
        sent = null;
        send(null);
      }
    },
  };
}
