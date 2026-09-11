import { memo, type MouseEvent } from "react";
import RenameComponent from "./RenameComponent";

type FileSize = number | string | null | undefined;
type FileDate = string | number | Date | null | undefined;

interface FileItemProps {
  name: string;
  size?: FileSize;
  date?: FileDate;

  isSelected: boolean;
  isRenaming: boolean;

  onSelect?: (name: string) => void;

  onDragSelectStart?: (name: string) => void;

  onDragSelectEnter?: (name: string) => void;

  onOpenMenu: (event: MouseEvent<HTMLDivElement>, name: string) => void;

  onRename: (currentName: string, newName: string) => void | Promise<void>;

  onRenameClose: () => void;
}

const EXT_COLORS: Record<string, string> = {
  PDF: "#E57373",

  PNG: "#67B7C7",
  JPG: "#67B7C7",
  JPEG: "#67B7C7",
  WEBP: "#67B7C7",

  GIF: "#D9B86C",
  SVG: "#D9B86C",

  MP4: "#A78BFA",
  MOV: "#A78BFA",
  MKV: "#A78BFA",

  MP3: "#D98AB3",
  WAV: "#D98AB3",

  ZIP: "#D99A5F",
  TAR: "#D99A5F",
  GZ: "#D99A5F",
  RAR: "#D99A5F",

  JS: "#D9B86C",
  JSX: "#D9B86C",

  TS: "#6FA8DC",
  TSX: "#6FA8DC",

  PY: "#8FCB8F",
  RS: "#D99A5F",
  GO: "#6FA8DC",
  SH: "#8FCB8F",

  TXT: "#94A3B8",
  MD: "#94A3B8",

  JSON: "#D89A9A",
  YAML: "#D89A9A",
  YML: "#D89A9A",
  TOML: "#D89A9A",

  HTML: "#D9825B",

  CSS: "#818CF8",
  SCSS: "#818CF8",

  ENV: "#8FCB8F",

  CONF: "#94A3B8",
  INI: "#94A3B8",
  LOG: "#64748B",

  SQL: "#D89A9A",
};

const DEFAULT_ACCENT = "#64748B";

const formatSize = (kb: FileSize): string => {
  if (kb === undefined || kb === null) {
    return "—";
  }

  const n = typeof kb === "number" ? kb : Number.parseFloat(kb);

  if (Number.isNaN(n)) {
    return "—";
  }

  if (n < 1) {
    return `${(n * 1024).toFixed(0)} B`;
  }

  if (n < 1024) {
    return `${n.toFixed(1)} KB`;
  }

  return `${(n / 1024).toFixed(1)} MB`;
};

const formatDate = (raw: FileDate): string => {
  if (raw === null || raw === undefined) {
    return "—";
  }

  const date = new Date(raw);

  if (Number.isNaN(date.getTime())) {
    return String(raw);
  }

  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const getExtension = (name: string): string => {
  if (!name.includes(".")) {
    return "FILE";
  }

  return name.split(".").pop()?.toUpperCase() ?? "FILE";
};

const FileItem = memo(function FileItem({
  name,
  size,
  date,
  isSelected,
  onSelect,
  onDragSelectStart,
  onDragSelectEnter,
  onOpenMenu,
  isRenaming,
  onRename,
  onRenameClose,
}: FileItemProps) {
  const ext = getExtension(name);

  const accent = EXT_COLORS[ext] ?? DEFAULT_ACCENT;

  return (
    <div
      className={`file-item ${isSelected ? "selected" : ""}`}
      onClick={() => {
        /*
         * Legacy/simple selection mode.
         *
         * Components such as ArchiveViewer use
         * FileItem with onSelect and do not enable
         * drag selection.
         */
        if (!onDragSelectStart && onSelect && !isRenaming) {
          onSelect(name);
        }
      }}
      onPointerDown={(event) => {
        if (!onDragSelectStart) {
          return;
        }

        if (event.button !== 0 || isRenaming) {
          return;
        }

        event.preventDefault();

        onDragSelectStart(name);
      }}
      onPointerEnter={() => {
        if (!onDragSelectEnter || isRenaming) {
          return;
        }

        onDragSelectEnter(name);
      }}
      onContextMenu={(event) => {
        event.preventDefault();

        onOpenMenu(event, name);
      }}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "12px",
        minHeight: "50px",
        padding: "9px 16px",
        marginBottom: "1px",
        cursor: "pointer",
        userSelect: "none",
        borderLeft: `2px solid ${isSelected ? "#818CF8" : "transparent"}`,
        borderBottom: "1px solid rgba(255,255,255,0.045)",
        background: isSelected ? "rgba(99,102,241,0.065)" : "transparent",
        transition: "background 0.12s ease, border-color 0.12s ease",
      }}
    >
      {/* Extension badge */}

      <div
        className="file-badge"
        style={{
          width: "32px",
          height: "32px",
          borderRadius: "8px",
          background: `${accent}12`,
          border: `1px solid ${accent}26`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <span
          style={{
            fontSize: "8px",
            fontWeight: 800,
            lineHeight: 1,
            letterSpacing: "0.03em",
            color: accent,
          }}
        >
          {ext.slice(0, 4)}
        </span>
      </div>

      {/* Name + metadata */}

      <div
        style={{
          flex: 1,
          minWidth: 0,
        }}
      >
        {isRenaming ? (
          <div
            onClick={(event) => event.stopPropagation()}
            onPointerDown={(event) => event.stopPropagation()}
            style={{
              width: "fit-content",
              maxWidth: "100%",
            }}
          >
            <RenameComponent
              handleRename={(newName: string) => onRename(name, newName)}
              onCancel={onRenameClose}
              currentName={name}
            />
          </div>
        ) : (
          <div
            className="file-name"
            style={{
              fontSize: "13px",
              fontWeight: 500,
              lineHeight: 1.35,
              color: "rgba(255,255,255,0.84)",
              fontFamily: "'JetBrains Mono', monospace",
              letterSpacing: "-0.01em",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              transition: "color 0.12s ease",
            }}
          >
            {name}
          </div>
        )}

        {!isRenaming && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              marginTop: "3px",
            }}
          >
            <span
              style={{
                fontSize: "10.5px",
                lineHeight: 1.2,
                color: "rgba(255,255,255,0.32)",
                fontFamily: "'JetBrains Mono', monospace",
              }}
            >
              {formatSize(size)}
            </span>

            <div
              aria-hidden="true"
              style={{
                width: "2px",
                height: "2px",
                borderRadius: "50%",
                background: "rgba(255,255,255,0.14)",
                flexShrink: 0,
              }}
            />

            <span
              style={{
                fontSize: "10.5px",
                lineHeight: 1.2,
                color: "rgba(255,255,255,0.32)",
                fontFamily: "'JetBrains Mono', monospace",
              }}
            >
              {formatDate(date)}
            </span>
          </div>
        )}
      </div>

      {/* Selected indicator */}

      {isSelected && !isRenaming && (
        <div
          aria-hidden="true"
          style={{
            width: "18px",
            height: "18px",
            borderRadius: "5px",
            background: "rgba(129,140,248,0.14)",
            border: "1px solid rgba(129,140,248,0.28)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <path
              d="M2 5l2.5 2.5L8 3"
              stroke="#A5B4FC"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      )}
    </div>
  );
});

export default FileItem;
