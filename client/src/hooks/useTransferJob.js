import { useCallback, useRef, useState } from "react";

export function useTransferJob({ onError } = {}) {
  const [progressMap, setProgressMap] = useState({});
  const [startedTransfers, setStartedTransfers] = useState({});

  const activeJobRef = useRef(null);
  const eventSourceRef = useRef(null);
  const cleanupTimerRef = useRef(null);

  const clearTransferState = useCallback((jobId) => {
    if (activeJobRef.current !== jobId) {
      return;
    }

    activeJobRef.current = null;

    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    if (cleanupTimerRef.current) {
      clearTimeout(cleanupTimerRef.current);
      cleanupTimerRef.current = null;
    }

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

      /*
       * Only one active transfer is supported by the
       * backend right now. If we're switching jobs,
       * close the previous SSE connection.
       */
      if (eventSourceRef.current && activeJobRef.current !== jobId) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }

      activeJobRef.current = jobId;

      /*
       * Stable list of top-level items initiated by
       * this client.
       *
       * attachJob() passes an empty array because it
       * is attaching to an already-running job. The
       * jobStart snapshot from the server will then
       * populate progressMap.
       */
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
      setProgressMap({
        ...initialTransfers,
      });

      const token = localStorage.getItem("token");

      const eventSource = new EventSource(
        `/api/progress/${encodeURIComponent(jobId)}?token=${encodeURIComponent(
          token ?? "",
        )}`,
      );

      eventSourceRef.current = eventSource;

      const rootToProgress = (root) => ({
        file: root.rootItem,
        progress: Math.round(root.percent ?? 0),
        total: root.totalFiles ?? null,
        completed: root.completedFiles ?? 0,
        failed: root.failedFiles ?? 0,
        error: root.error ?? null,
      });

      const applyRootSnapshot = (roots) => {
        if (activeJobRef.current !== jobId || !Array.isArray(roots)) {
          return;
        }

        setProgressMap((previous) => {
          const next = {
            ...previous,
          };

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

          if (eventSourceRef.current === eventSource) {
            eventSourceRef.current = null;
          }

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
            /*
             * File-level events are available from
             * the backend, but this hook currently
             * exposes root-level progress.
             */
            break;

          case "jobDone":
            eventSource.close();

            if (eventSourceRef.current === eventSource) {
              eventSourceRef.current = null;
            }

            onDone?.(message);

            cleanupTimerRef.current = setTimeout(() => {
              clearTransferState(jobId);
            }, 1500);

            break;

          default:
            /*
             * The SSE controller may send a simple
             * ready/connection event without a type.
             */
            if (!message.ready) {
              console.warn(
                `Unknown transfer progress event: ${message.type}`,
                message,
              );
            }
        }
      };

      eventSource.onerror = (event) => {
        /*
         * EventSource automatically reconnects.
         *
         * Do not close or clear progress here for
         * transient network failures. When it
         * reconnects, the backend sends the current
         * job snapshot again.
         */
        if (activeJobRef.current !== jobId) {
          eventSource.close();

          if (eventSourceRef.current === eventSource) {
            eventSourceRef.current = null;
          }

          return;
        }

        console.warn(`Transfer SSE connection interrupted for ${jobId}`, event);

        onError?.(event);
      };
    },
    [clearTransferState, onError],
  );

  const attachJob = useCallback(
    ({ jobId, onDone }) => {
      trackJob({
        jobId,
        items: [],
        onDone,
      });
    },
    [trackJob],
  );

  return {
    progressMap,
    startedTransfers,
    trackJob,
    attachJob,
  };
}
