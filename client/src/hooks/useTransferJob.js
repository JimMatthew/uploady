import { useState, useCallback } from "react";

export function useTransferJob({ onError } = {}) {
  const [progressMap, setProgressMap] = useState({});
  const [startedTransfers, setStartedTransfers] = useState({});

  const trackJob = useCallback(
    ({ jobId, items = [], onDone }) => {
      // Give the user immediate feedback before the backend has finished
      // expanding folders and calculating authoritative root totals.
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
        `/api/progress/${jobId}?token=${token}`,
      );

      const rootToProgress = (root) => ({
        file: root.rootItem,
        progress: Math.round(root.percent ?? 0),
        total: root.totalFiles,
        completed: root.completedFiles,
        failed: root.failedFiles,
        error: root.error ?? null,
      });

      const applyRoots = (roots) => {
        const rootMap = Object.fromEntries(
          roots.map((root) => [
            `${jobId}-${root.rootItem}`,
            rootToProgress(root),
          ]),
        );

        setStartedTransfers(rootMap);
        setProgressMap(rootMap);
      };

      const applyRootProgress = (root) => {
        const rootKey = `${jobId}-${root.rootItem}`;

        setProgressMap((prev) => ({
          ...prev,
          [rootKey]: rootToProgress(root),
        }));
      };

      eventSource.onmessage = (event) => {
        const message = JSON.parse(event.data);
        const { type } = message;

        switch (type) {
          case "jobStart":
            applyRoots(message.roots);
            return;

          case "snapshot":
            applyRoots(message.roots);
            return;

          case "rootProgress":
            applyRootProgress(message);
            return;

          case "fileStart":
          case "fileDone":
          case "fileFail":
            // These are currently forwarded by the SSE endpoint but the
            // root-based progress UI does not need to handle them directly.
            return;

          case "jobDone":
            eventSource.close();

            onDone?.();

            setTimeout(() => {
              setProgressMap({});
              setStartedTransfers({});
            }, 1500);

            return;

          default:
            if (!message.ready) {
              console.warn(`Unknown transfer progress event: ${type}`);
            }
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