import { useCallback, useRef, useState } from "react";

export function useTransferJob({ onError } = {}) {
  const [progressMap, setProgressMap] = useState({});
  const [startedTransfers, setStartedTransfers] = useState({});

  const activeJobRef = useRef(null);
  const cleanupTimerRef = useRef(null);

  const clearTransferState = useCallback((jobId) => {
    if (activeJobRef.current !== jobId) {
      return;
    }

    activeJobRef.current = null;

    setProgressMap({});
    setStartedTransfers({});
  }, []);

  const trackJob = useCallback(
    ({ jobId, items = [], onDone }) => {
      if (!jobId) {
        console.warn("Cannot track transfer job without a jobId");
        return;
      }

      if (cleanupTimerRef.current) {
        clearTimeout(cleanupTimerRef.current);
        cleanupTimerRef.current = null;
      }

      activeJobRef.current = jobId;

      // Stable list of top-level items initiated by this client.
      const initialTransfers = Object.fromEntries(
        items.map(({ file }) => [
          `${jobId}-${file}`,
          {
            file,
            progress: 0,
            total: null,
            completed: 0,
            failed: 0,
            error: null,
          },
        ]),
      );

      setStartedTransfers(initialTransfers);
      setProgressMap({ ...initialTransfers });

      const token = localStorage.getItem("token");

      const eventSource = new EventSource(
        `/api/progress/${encodeURIComponent(jobId)}?token=${encodeURIComponent(
          token ?? "",
        )}`,
      );

      const rootToProgress = (root) => ({
        file: root.rootItem,
        progress: Math.round(root.percent ?? 0),
        total: root.totalFiles ?? null,
        completed: root.completedFiles ?? 0,
        failed: root.failedFiles ?? 0,
        error: root.error ?? null,
      });

      const applyRootSnapshot = (roots) => {
        if (
          activeJobRef.current !== jobId ||
          !Array.isArray(roots) ||
          roots.length === 0
        ) {
          return;
        }

        setProgressMap((previous) => {
          const next = { ...previous };

          roots.forEach((root) => {
            if (!root?.rootItem) {
              return;
            }

            next[`${jobId}-${root.rootItem}`] = rootToProgress(root);
          });

          return next;
        });
      };

      const applyRootProgress = (root) => {
        if (activeJobRef.current !== jobId || !root?.rootItem) {
          return;
        }

        const rootKey = `${jobId}-${root.rootItem}`;

        setProgressMap((previous) => ({
          ...previous,
          [rootKey]: rootToProgress(root),
        }));
      };

      eventSource.onmessage = (event) => {
        if (activeJobRef.current !== jobId) {
          eventSource.close();
          return;
        }

        let message;

        try {
          message = JSON.parse(event.data);
        } catch (err) {
          console.error("Invalid transfer progress event:", err, event.data);
          return;
        }

        switch (message.type) {
          case "jobStart":
            applyRootSnapshot(message.roots);
            break;

          case "rootProgress":
            applyRootProgress(message);
            break;

          case "fileStart":
          case "fileDone":
          case "fileFail":
            // File-level events are available from the backend,
            // but this UI only renders root-level progress.
            break;

          case "jobDone":
            eventSource.close();

            onDone?.();

            cleanupTimerRef.current = setTimeout(() => {
              clearTransferState(jobId);
              cleanupTimerRef.current = null;
            }, 1500);

            break;

          default:
            if (!message.ready) {
              console.warn(
                `Unknown transfer progress event: ${message.type}`,
                message,
              );
            }
        }
      };

      eventSource.onerror = (event) => {
        eventSource.close();

        if (activeJobRef.current !== jobId) {
          return;
        }

        clearTransferState(jobId);
        onError?.(event);
      };
    },
    [clearTransferState, onError],
  );

  return {
    progressMap,
    startedTransfers,
    trackJob,
  };
}