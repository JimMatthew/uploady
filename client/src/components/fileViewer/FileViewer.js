import { lazy, Suspense } from "react";
import AudioViewer from "./AudioViewer";
import VideoViewer from "./VideoViewer";
import PdfViewer from "./PdfViewer";
import ImageViewer from "../ImageViewer";

const TextViewer = lazy(() => import("./TextViewer"));
const EpubViewer = lazy(() => import("../EpubViewer"));

export default function FileViewer({
  fileType,
  filename,
  text,
  setText,
  objectUrl,
  epubData,
  streamUrl,
  readOnly,
}) {
  let viewer;

  switch (fileType) {
    case "video":
      viewer = <VideoViewer src={streamUrl} />;
      break;

    case "audio":
      viewer = <AudioViewer src={streamUrl} filename={filename} />;
      break;

    case "image":
      viewer = <ImageViewer src={objectUrl} alt={filename} />;
      break;

    case "pdf":
      viewer = <PdfViewer src={objectUrl} />;
      break;

    case "epub":
      viewer = <EpubViewer src={epubData} filename={filename} />;
      break;

    default:
      viewer = (
        <TextViewer
          text={text}
          onChange={setText}
          filename={filename}
          readOnly={readOnly}
        />
      );
  }

  return <Suspense fallback={<div>Loading viewer...</div>}>{viewer}</Suspense>;
}
