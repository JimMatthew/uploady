import {
  FiAlertTriangle,
  FiArrowRight,
  FiCheck,
  FiClock,
  FiLoader,
  FiX,
} from "react-icons/fi";

export const TRANSFER_STATUS = {
  completed: {
    color: "#6FCF97",
    icon: FiCheck,
  },

  running: {
    color: "#818CF8",
    icon: FiLoader,
  },

  planning: {
    color: "#818CF8",
    icon: FiLoader,
  },

  expanding: {
    color: "#818CF8",
    icon: FiLoader,
  },

  failed: {
    color: "#E57373",
    icon: FiX,
  },

  partial: {
    color: "#D6A85F",
    icon: FiAlertTriangle,
  },

  queued: {
    color: "rgba(255,255,255,0.38)",
    icon: FiClock,
  },

  cancelled: {
    color: "rgba(255,255,255,0.32)",
    icon: FiX,
  },

  pending: {
    color: "rgba(255,255,255,0.34)",
    icon: FiClock,
  },

  in_progress: {
    color: "#818CF8",
    icon: FiLoader,
  },

  skipped: {
    color: "rgba(255,255,255,0.3)",
    icon: FiArrowRight,
  },
};

export const getTransferStatus = (status) =>
  TRANSFER_STATUS[status] ?? {
    color: "rgba(255,255,255,0.32)",
    icon: FiClock,
  };

export const deriveJobStatus = (job) => {
  if (job.status !== "completed") {
    return job.status;
  }

  if (job.failedFiles > 0 && job.completedFiles > 0) {
    return "partial";
  }

  if (job.failedFiles > 0 && job.completedFiles === 0) {
    return "failed";
  }

  return "completed";
};

export const getStatusBackground = (status) => {
  switch (status) {
    case "completed":
      return "rgba(111,207,151,0.06)";

    case "running":
    case "planning":
    case "expanding":
    case "in_progress":
      return "rgba(129,140,248,0.06)";

    case "failed":
      return "rgba(229,115,115,0.06)";

    case "partial":
      return "rgba(214,168,95,0.06)";

    default:
      return "rgba(255,255,255,0.025)";
  }
};

export const getStatusBorder = (status) => {
  switch (status) {
    case "completed":
      return "rgba(111,207,151,0.12)";

    case "running":
    case "planning":
    case "expanding":
    case "in_progress":
      return "rgba(129,140,248,0.12)";

    case "failed":
      return "rgba(229,115,115,0.12)";

    case "partial":
      return "rgba(214,168,95,0.12)";

    default:
      return "rgba(255,255,255,0.08)";
  }
};

export const formatDuration = (ms) => {
  if (ms === null || ms === undefined) {
    return "—";
  }

  if (ms < 1000) {
    return `${ms}ms`;
  }

  if (ms < 60000) {
    return `${(ms / 1000).toFixed(1)}s`;
  }

  return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
};

export const formatSize = (bytes) => {
  if (!bytes) {
    return "—";
  }

  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  if (bytes < 1024 * 1024 * 1024) {
    return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
  }

  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
};

export const formatTime = (dateStr) => {
  if (!dateStr) {
    return "—";
  }

  const date = new Date(dateStr);
  const now = new Date();

  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);

  if (diffMins < 1) {
    return "just now";
  }

  if (diffMins < 60) {
    return `${diffMins}m ago`;
  }

  if (diffHours < 24) {
    return `${diffHours}h ago`;
  }

  return date.toLocaleDateString();
};
