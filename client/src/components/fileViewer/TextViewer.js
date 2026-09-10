import { useEffect, useState } from "react";

import CodeMirror from "@uiw/react-codemirror";
import { Box } from "@chakra-ui/react";
import { githubDark } from "@uiw/codemirror-theme-github";

const LANGUAGE_LOADERS = {
  js: async () => {
    const { javascript } = await import("@codemirror/lang-javascript");
    return javascript({
      jsx: true,
    });
  },

  jsx: async () => {
    const { javascript } = await import("@codemirror/lang-javascript");
    return javascript({
      jsx: true,
    });
  },

  ts: async () => {
    const { javascript } = await import("@codemirror/lang-javascript");
    return javascript({
      typescript: true,
    });
  },

  tsx: async () => {
    const { javascript } = await import("@codemirror/lang-javascript");
    return javascript({
      jsx: true,
      typescript: true,
    });
  },

  java: async () => {
    const { java } = await import("@codemirror/lang-java");
    return java();
  },

  json: async () => {
    const { json } = await import("@codemirror/lang-json");
    return json();
  },

  rs: async () => {
    const { rust } = await import("@codemirror/lang-rust");

    return rust();
  },

  html: async () => {
    const { html } = await import("@codemirror/lang-html");
    return html();
  },

  cpp: async () => {
    const { cpp } = await import("@codemirror/lang-cpp");
    return cpp();
  },

  c: async () => {
    const { cpp } = await import("@codemirror/lang-cpp");
    return cpp();
  },

  css: async () => {
    const { css } = await import("@codemirror/lang-css");
    return css();
  },

  go: async () => {
    const { go } = await import("@codemirror/lang-go");
    return go();
  },
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

export default function TextViewer({
  text,
  onChange,
  filename,
  readOnly = false,
}) {
  const [languageExtension, setLanguageExtension] = useState(null);

  useEffect(() => {
    let cancelled = false;

    const loadLanguage = async () => {
      const loader = LANGUAGE_LOADERS[getExt(filename)];

      if (!loader) {
        setLanguageExtension(null);
        return;
      }

      try {
        const extension = await loader();

        if (!cancelled) {
          setLanguageExtension(extension);
        }
      } catch (err) {
        if (!cancelled) {
          console.error(
            `Failed to load language support for ${filename}:`,
            err,
          );

          setLanguageExtension(null);
        }
      }
    };

    setLanguageExtension(null);
    loadLanguage();

    return () => {
      cancelled = true;
    };
  }, [filename]);

  return (
    <Box sx={EDITOR_STYLES}>
      <CodeMirror
        value={text}
        onChange={onChange}
        theme={githubDark}
        extensions={languageExtension ? [languageExtension] : []}
        editable={!readOnly}
        style={{
          minHeight: "300px",
        }}
      />
    </Box>
  );
}
