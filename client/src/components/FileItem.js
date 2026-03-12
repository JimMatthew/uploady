import React from "react";
import { useState } from "react";
import RenameComponent from "./RenameComponent";

const EXT_COLORS = {
  PDF: "#FF6B6B",
  PNG: "#4ECDC4",
  JPG: "#4ECDC4",
  JPEG: "#4ECDC4",
  WEBP: "#4ECDC4",
  GIF: "#FFE66D",
  SVG: "#FFE66D",
  MP4: "#A78BFA",
  MOV: "#A78BFA",
  MKV: "#A78BFA",
  MP3: "#F472B6",
  WAV: "#F472B6",
  ZIP: "#FB923C",
  TAR: "#FB923C",
  GZ: "#FB923C",
  RAR: "#FB923C",
  JS: "#FFD700",
  JSX: "#FFD700",
  TS: "#4FC3F7",
  TSX: "#4FC3F7",
  PY: "#6EE7B7",
  RS: "#FB923C",
  GO: "#4FC3F7",
  SH: "#6EE7B7",
  TXT: "#94A3B8",
  MD: "#94A3B8",
  JSON: "#FCA5A5",
  YAML: "#FCA5A5",
  YML: "#FCA5A5",
  TOML: "#FCA5A5",
  HTML: "#F97316",
  CSS: "#818CF8",
  SCSS: "#818CF8",
  ENV: "#6EE7B7",
  CONF: "#94A3B8",
  INI: "#94A3B8",
  LOG: "#64748B",
  SQL: "#FCA5A5",
};

const formatSize = (kb) => {
  if (kb === undefined || kb === null) return "—";
  const n = parseFloat(kb);
  if (isNaN(n)) return "—";
  if (n < 1) return `${(n * 1024).toFixed(0)} B`;
  if (n < 1024) return `${n.toFixed(1)} KB`;
  return `${(n / 1024).toFixed(1)} MB`;
};

const formatDate = (raw) => {
  if (!raw) return "—";
  try {
    return new Date(raw).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return raw;
  }
};

const FileItem = React.memo(
  function FileItem({
    name,
    size,
    date,
    isSelected,
    onSelect,
    onOpenMenu,
    isRenaming,
    onRename,
    onRenameClose,
  }) {
    const ext = name.includes(".")
      ? name.split(".").pop().toUpperCase()
      : "FILE";
    const accent = EXT_COLORS[ext] || "#64748B";

    return (
      <div
        className={`file-item ${isSelected ? "selected" : ""}`}
        onClick={() => onSelect(name)}
        onContextMenu={(e) => {
          e.preventDefault();
          onOpenMenu(e, name);
        }}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "12px",
          padding: "10px 16px",
          marginBottom: "1px",
          cursor: "pointer",
          borderLeft: `2px solid ${isSelected ? "#6366F1" : "transparent"}`,
          borderBottom: "1px solid rgba(255,255,255,0.04)",
          background: isSelected ? "rgba(99,102,241,0.10)" : "transparent",
          transition: "all 0.12s ease",
        }}
      >
        {/* Ext badge */}
        <div
          className="file-badge"
          style={{
            width: "34px",
            height: "34px",
            borderRadius: "8px",
            background: `${accent}10`,
            border: `1px solid ${accent}22`,
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
              letterSpacing: "0.03em",
              color: accent,
            }}
          >
            {ext.slice(0, 4)}
          </span>
        </div>

        {/* Name + meta */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {isRenaming ? (
            <div
              onClick={(e) => e.stopPropagation()}
              style={{ width: "fit-content" }}
            >
              <RenameComponent
                handleRename={(newName) => onRename(name, newName)}
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
                color: "rgba(255,255,255,0.85)",
                fontFamily: "'JetBrains Mono', monospace",
                letterSpacing: "-0.01em",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
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
                marginTop: "2px",
              }}
            >
              <span
                style={{
                  fontSize: "11px",
                  color: "rgba(255,255,255,0.3)",
                  fontFamily: "'JetBrains Mono', monospace",
                }}
              >
                {formatSize(size)}
              </span>
              <div
                style={{
                  width: "2px",
                  height: "2px",
                  borderRadius: "50%",
                  background: "rgba(255,255,255,0.12)",
                }}
              />
              <span
                style={{
                  fontSize: "11px",
                  color: "rgba(255,255,255,0.3)",
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
            style={{
              width: "18px",
              height: "18px",
              borderRadius: "5px",
              background: "rgba(99,102,241,0.25)",
              border: "1px solid rgba(99,102,241,0.4)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <path
                d="M2 5l2.5 2.5L8 3"
                stroke="#818CF8"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        )}
      </div>
    );
  },
  (prev, next) => {
    return (
      prev.name === next.name &&
      prev.isSelected === next.isSelected &&
      prev.isRenaming === next.isRenaming &&
      prev.size === next.size &&
      prev.date === next.date
    );
  },
);

export default FileItem;
