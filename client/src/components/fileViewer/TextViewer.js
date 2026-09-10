import CodeMirror from "@uiw/react-codemirror";
import { Box } from "@chakra-ui/react";
import { githubDark } from "@uiw/codemirror-theme-github";
import { javascript } from "@codemirror/lang-javascript";
import { java } from "@codemirror/lang-java";
import { json } from "@codemirror/lang-json";
import { rust } from "@codemirror/lang-rust";
import { html } from "@codemirror/lang-html";
import { cpp } from "@codemirror/lang-cpp";
import { css } from "@codemirror/lang-css";
import { go } from "@codemirror/lang-go"
const EXT_LANG = {
  js: () =>
    javascript({
      jsx: true,
    }),

  ts: () =>
    javascript({
      jsx: true,
      typescript: true,
    }),

  java: () => java(),
  json: () => json(),
  rs: () => rust(),
  html: () => html(),
  cpp: () => cpp(),
  c: () => cpp(),
  css: () => css(),
  go: () => go(),
};

const EDITOR_STYLES = {
  ".cm-editor": {
    fontSize: "13px",
    fontFamily: "'JetBrains Mono', monospace",
    bg: "transparent",
  },

  ".cm-editor.cm-focused": {
    outline: "none",
  },

  ".cm-scroller": {
    fontFamily: "'JetBrains Mono', monospace",
  },

  ".cm-gutters": {
    bg: "rgba(255,255,255,0.02)",
    borderRight: "1px solid rgba(255,255,255,0.07)",
  },
};

const getExt = (filename) =>
  filename.includes(".") ? filename.split(".").pop().toLowerCase() : "";

const getLanguageExtension = (filename) =>
  EXT_LANG[getExt(filename)]?.() ?? null;

export default function TextViewer({
  text,
  onChange,
  filename,
  readOnly = false,
}) {
  return (
    <Box sx={EDITOR_STYLES}>
      <CodeMirror
        value={text}
        onChange={onChange}
        theme={githubDark}
        extensions={[getLanguageExtension(filename)].filter(Boolean)}
        editable={!readOnly}
        style={{
          minHeight: "300px",
        }}
      />
    </Box>
  );
}
