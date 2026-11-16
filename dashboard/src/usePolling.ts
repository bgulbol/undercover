import { useEffect, useState } from "react";

export const POLL_MS = 2000;

function useApi<T>(load: () => Promise<T>, everyMs: number | null) {
  const [data, setData] = useState<T>();
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    const tick = () => {
      void load()
        .then((value) => {
          if (active) {
            setData(value);
            setFailed(false);
          }
        })
        .catch(() => {
          if (active) setFailed(true);
        });
    };
    tick();
    const timer = everyMs === null ? undefined : setInterval(tick, everyMs);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [load, everyMs]);

  return { data, failed };
}

/** Load now and every two seconds. `load` must keep its identity between renders. */
export function usePolling<T>(load: () => Promise<T>) {
  return useApi(load, POLL_MS);
}

/** Load once. `load` must keep its identity between renders. */
export function useLoad<T>(load: () => Promise<T>) {
  return useApi(load, null);
}
