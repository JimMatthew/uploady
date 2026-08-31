import { useState, useCallback } from "react";

export function useTransferJob({ onError } = {}) {
  const [progressMap, setProgressMap] = useState({});
  const [startedTransfers, setStartedTransfers] =
    useState({});

  const trackJob = useCallback(
    ({ jobId, items, onDone }) => {
      const initialTransfers = Object.fromEntries(
        items.map(({ file }) => [
          `${jobId}-${file}`,
          {
            file,
            progress: 0,
          },
        ]),
      );

      setStartedTransfers(initialTransfers);
      setProgressMap({ ...initialTransfers });

      const token = localStorage.getItem("token");

      const eventSource = new EventSource(
        `/api/progress/${jobId}?token=${token}`,
      );

      eventSource.onmessage = (event) => {
        const data = JSON.parse(event.data);

        if (data.ready) return;

        if (data.type === "jobStart") {
          setProgressMap((prev) => {
            const next = { ...prev };

            Object.keys(initialTransfers).forEach((key) => {
              const itemName =
                initialTransfers[key].file;

              next[key] = {
                ...next[key],
                total:
                  data.rootCounts?.[itemName] ?? 1,
              };
            });

            return next;
          });
        }

        if (data.type === "fileProgress") {
          const rootKey =
            `${jobId}-${data.rootItem}`;

          setProgressMap((prev) => ({
            ...prev,
            [rootKey]: {
              ...prev[rootKey],
              progress: Math.round(data.percent),
            },
          }));
        }

        if (data.type === "fileDone") {
          const rootKey =
            `${jobId}-${data.rootItem}`;

          const isTopLevel =
            data.file === data.rootItem;

          setProgressMap((prev) => ({
            ...prev,
            [rootKey]: isTopLevel
              ? {
                  ...prev[rootKey],
                  progress: 100,
                }
              : {
                  ...prev[rootKey],
                  completed:
                    (prev[rootKey]?.completed || 0) + 1,
                },
          }));
        }

        if (data.type === "fileFail") {
          const rootKey =
            `${jobId}-${data.rootItem}`;

          setProgressMap((prev) => ({
            ...prev,
            [rootKey]: {
              ...prev[rootKey],
              error: data.error,
            },
          }));
        }

        if (data.type === "jobDone") {
          eventSource.close();

          onDone?.();

          setTimeout(() => {
            setProgressMap({});
            setStartedTransfers({});
          }, 1500);
        }
      };

      eventSource.onerror = () => {
        eventSource.close();

        setProgressMap({});
        setStartedTransfers({});

        onError?.();
      };
    },
    [onError],
  );

  return {
    progressMap,
    startedTransfers,
    trackJob,
  };
}