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

      // These are the top-level items the user actually started transferring.
      // Keep this list stable for the lifetime of the job.
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

            const rootKey = `${jobId}-${root.rootItem}`;

            next[rootKey] = rootToProgress(root);
          });

          return next;
        });
      };

      const applyJobStart = (message) => {
        if (activeJobRef.current !== jobId) {
          return;
        }

        // Older/current SSE contract: jobStart provides rootCounts.
        if (message.rootCounts) {
          setProgressMap((previous) => {
            const next = { ...previous };

            Object.keys(initialTransfers).forEach((key) => {
              const file = initialTransfers[key].file;

              next[key] = {
                ...next[key],
                total: message.rootCounts[file] ?? next[key]?.total ?? 1,
              };
            });

            return next;
          });
        }

        // Also support the newer root snapshot shape when present.
        if (Array.isArray(message.roots)) {
          applyRootSnapshot(message.roots);
        }
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

      const applyFileProgress = (message) => {
        if (activeJobRef.current !== jobId || !message.rootItem) {
          return;
        }

        const rootKey = `${jobId}-${message.rootItem}`;

        setProgressMap((previous) => ({
          ...previous,
          [rootKey]: {
            ...previous[rootKey],
            progress: Math.round(message.percent ?? 0),
          },
        }));
      };

      const applyFileDone = (message) => {
        if (activeJobRef.current !== jobId || !message.rootItem) {
          return;
        }

        const rootKey = `${jobId}-${message.rootItem}`;
        const isTopLevel = message.file === message.rootItem;

        setProgressMap((previous) => ({
          ...previous,
          [rootKey]: isTopLevel
            ? {
                ...previous[rootKey],
                progress: 100,
              }
            : {
                ...previous[rootKey],
                completed: (previous[rootKey]?.completed ?? 0) + 1,
              },
        }));
      };

      const applyFileFail = (message) => {
        if (activeJobRef.current !== jobId || !message.rootItem) {
          return;
        }

        const rootKey = `${jobId}-${message.rootItem}`;

        setProgressMap((previous) => ({
          ...previous,
          [rootKey]: {
            ...previous[rootKey],
            failed: (previous[rootKey]?.failed ?? 0) + 1,
            error: message.error ?? "Transfer failed",
          },
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
            applyJobStart(message);
            break;

          case "snapshot":
            applyRootSnapshot(message.roots);
            break;

          case "rootProgress":
            applyRootProgress(message);
            break;

          case "fileProgress":
            applyFileProgress(message);
            break;

          case "fileDone":
            applyFileDone(message);
            break;

          case "fileFail":
            applyFileFail(message);
            break;

          case "fileStart":
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
