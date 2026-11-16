import { useEffect, useState } from "react";

export const POLL_MS = 2000;

/** Load now and every two seconds. `load` must keep its identity between renders. */
export function usePolling<T>(load: () => Promise<T>) {
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
    const timer = setInterval(tick, POLL_MS);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [load]);

  return { data, failed };
}
