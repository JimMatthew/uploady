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
    padding: "9px 16px",
    minHeight: "50px",
    cursor: "pointer",
    borderBottom: "1px solid rgba(255,255,255,0.045)",
    background: "transparent",
    transition: "background 0.12s ease",
  }}
>
  <div
    style={{
      display: "flex",
      alignItems: "center",
      gap: "12px",
      minWidth: 0,
    }}
  >
    <div
      className="folder-badge"
      style={{
        width: "32px",
        height: "32px",
        borderRadius: "8px",
        background: "rgba(214,168,95,0.065)",
        border: "1px solid rgba(214,168,95,0.15)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        transition:
          "background 0.12s ease, border-color 0.12s ease",
      }}
    >
      <svg
        width="15"
        height="15"
        viewBox="0 0 24 24"
        fill="none"
      >
        <path
          d="M3 7C3 5.9 3.9 5 5 5H10L12 7H19C20.1 7 21 7.9 21 9V17C21 18.1 20.1 19 19 19H5C3.9 19 3 18.1 3 17V7Z"
          fill="rgba(214,168,95,0.72)"
          stroke="rgba(214,168,95,0.3)"
          strokeWidth="0.5"
        />
      </svg>
    </div>

    <span
      className="folder-name"
      style={{
        minWidth: 0,
        fontSize: "13px",
        fontWeight: 500,
        color: "rgba(255,255,255,0.72)",
        fontFamily: "'JetBrains Mono', monospace",
        letterSpacing: "-0.01em",
        whiteSpace: "nowrap",
        overflow: "hidden",
        textOverflow: "ellipsis",
        transition: "color 0.12s ease",
      }}
    >
      {folder}
    </span>
  </div>

  <svg
    className="folder-chevron"
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    style={{
      flexShrink: 0,
      transition:
        "transform 0.12s ease, opacity 0.12s ease",
      opacity: 0.3,
    }}
  >
    <path
      d="M9 18l6-6-6-6"
      stroke="rgba(255,255,255,0.5)"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
</div>
  );
});

export default FolderItem;
