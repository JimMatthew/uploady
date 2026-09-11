interface PdfViewerProps {
  src: string;
}

export default function PdfViewer({
  src,
}: PdfViewerProps) {
  return (
    <iframe
      src={src}
      title="PDF viewer"
      style={{
        width: "100%",
        height: "100vh",
        border: "none",
        display: "block",
      }}
    />
  );
}