import { useEffect, useState } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { Box } from "@chakra-ui/react";
import { githubDark } from "@uiw/codemirror-theme-github";
import type { Extension } from "@codemirror/state";

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

interface TextViewerProps {
  text: string;
  filename: string;
  readOnly?: boolean;

  onChange: (value: string) => void;
}

type LanguageLoader = () => Promise<Extension>;

type LanguageExtension = keyof typeof LANGUAGE_LOADERS;

// -----------------------------------------------------------------------------
// Language support
// -----------------------------------------------------------------------------

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
} satisfies Record<string, LanguageLoader>;

// -----------------------------------------------------------------------------
// Editor styling
// -----------------------------------------------------------------------------

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

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

const getExt = (filename: string): string => {
  const lastDot = filename.lastIndexOf(".");

  if (lastDot === -1 || lastDot === filename.length - 1) {
    return "";
  }

  return filename.slice(lastDot + 1).toLowerCase();
};

const getLanguageLoader = (extension: string): LanguageLoader | undefined => {
  if (extension in LANGUAGE_LOADERS) {
    return LANGUAGE_LOADERS[extension as LanguageExtension];
  }

  return undefined;
};

// -----------------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------------

export default function TextViewer({
  text,
  onChange,
  filename,
  readOnly = false,
}: TextViewerProps) {
  const [languageExtension, setLanguageExtension] = useState<Extension | null>(
    null,
  );

  useEffect(() => {
    let cancelled = false;

    const loadLanguage = async (): Promise<void> => {
      const extension = getExt(filename);

      const loader = getLanguageLoader(extension);

      if (!loader) {
        setLanguageExtension(null);

        return;
      }

      try {
        const loadedExtension = await loader();

        if (!cancelled) {
          setLanguageExtension(loadedExtension);
        }
      } catch (error: unknown) {
        if (!cancelled) {
          console.error(
            `Failed to load language support for ${filename}:`,
            error,
          );

          setLanguageExtension(null);
        }
      }
    };

    setLanguageExtension(null);

    void loadLanguage();

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
