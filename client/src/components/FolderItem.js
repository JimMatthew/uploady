import React from "react";

const FolderItem = React.memo(function FolderItem({
  folder,
  changeDirectory,
  onOpenMenu,
}) {
  return (
    <div
      className="folder-item"
      onClick={() => changeDirectory(folder)}
      onContextMenu={(e) => {
        e.preventDefault();
        onOpenMenu(e, folder);
      }}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "10px 16px",
        marginBottom: "1px",
        cursor: "pointer",
        borderLeft: "2px solid transparent",
        borderBottom: "1px solid rgba(255,255,255,0.04)",
        background: "transparent",
        transition: "all 0.12s ease",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        {/* Folder icon tile */}
        <div
          className="folder-badge"
          style={{
            width: "34px",
            height: "34px",
            borderRadius: "8px",
            background: "rgba(251,191,36,0.06)",
            border: "1px solid rgba(251,191,36,0.15)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            transition: "all 0.12s",
          }}
        >
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
            <path
              d="M3 7C3 5.9 3.9 5 5 5H10L12 7H19C20.1 7 21 7.9 21 9V17C21 18.1 20.1 19 19 19H5C3.9 19 3 18.1 3 17V7Z"
              fill="rgba(251,191,36,0.7)"
              stroke="rgba(251,191,36,0.25)"
              strokeWidth="0.5"
            />
          </svg>
        </div>

        {/* Folder name */}
        <span
          className="folder-name"
          style={{
            fontSize: "13px",
            fontWeight: 500,
            color: "rgba(255,255,255,0.75)",
            fontFamily: "'JetBrains Mono', monospace",
            letterSpacing: "-0.01em",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            transition: "color 0.12s",
          }}
        >
          {folder}
        </span>
      </div>

      {/* Chevron */}
      <svg
        className="folder-chevron"
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        style={{ flexShrink: 0, transition: "all 0.12s" }}
      >
        <path
          d="M9 18l6-6-6-6"
          stroke="rgba(255,255,255,0.15)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
});

export default FolderItem;
