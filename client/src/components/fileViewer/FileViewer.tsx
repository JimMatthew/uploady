import { lazy, Suspense } from "react";
import AudioViewer from "./AudioViewer";
import VideoViewer from "./VideoViewer";
import PdfViewer from "./PdfViewer";
import ImageViewer from "../ImageViewer";

const TextViewer = lazy(() => import("./TextViewer"));

const EpubViewer = lazy(() => import("../EpubViewer"));

export type FileViewerType =
  "video" | "audio" | "image" | "pdf" | "epub" | "text";

interface FileViewerProps {
  fileType: FileViewerType;
  filename: string;

  text: string;
  setText: (text: string) => void;

  objectUrl?: string;
  epubData?: ArrayBuffer;
  streamUrl?: string;

  readOnly?: boolean;
}

export default function FileViewer({
  fileType,
  filename,
  text,
  setText,
  objectUrl,
  epubData,
  streamUrl,
  readOnly = false,
}: FileViewerProps) {
  let viewer: React.ReactNode;

  switch (fileType) {
    case "video":
      viewer = streamUrl ? <VideoViewer src={streamUrl} /> : null;
      break;

    case "audio":
      viewer = streamUrl ? (
        <AudioViewer src={streamUrl} filename={filename} />
      ) : null;
      break;

    case "image":
      viewer = objectUrl ? (
        <ImageViewer src={objectUrl} alt={filename} onSave={() => {}} />
      ) : null;
      break;

    case "pdf":
      viewer = objectUrl ? <PdfViewer src={objectUrl} /> : null;
      break;

    case "epub":
      viewer = epubData ? (
        <EpubViewer src={epubData} filename={filename} />
      ) : null;
      break;

    case "text":
    default:
      viewer = (
        <TextViewer
          text={text}
          onChange={setText}
          filename={filename}
          readOnly={readOnly}
        />
      );
      break;
  }

  return <Suspense fallback={<div>Loading viewer...</div>}>{viewer}</Suspense>;
}
