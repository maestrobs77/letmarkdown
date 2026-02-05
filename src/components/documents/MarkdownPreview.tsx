import { useEffect, useRef } from "react";
import { Box } from "@chakra-ui/react";
import MarkdownIt from "markdown-it";
import emoji from "markdown-it-emoji";
import footnote from "markdown-it-footnote";
import sup from "markdown-it-sup";
import sub from "markdown-it-sub";
import hljs from "highlight.js";

// Import highlight.js styles
import "highlight.js/styles/github.css";

interface MarkdownPreviewProps {
  content: string;
  darkMode: boolean;
}

const md = MarkdownIt({
  html: true,
  linkify: true,
  typographer: true,
  highlight: function (str: string, lang: string) {
    if (lang && hljs.getLanguage(lang)) {
      try {
        return hljs.highlight(str, { language: lang }).value;
      } catch (__) {}
    }
    return "";
  },
})
  .use(emoji)
  .use(footnote)
  .use(sup)
  .use(sub);

export default function MarkdownPreview({ content, darkMode }: MarkdownPreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      try {
        containerRef.current.innerHTML = md.render(content);
      } catch (error) {
        console.error("Markdown rendering error:", error);
      }
    }
  }, [content]);

  return (
    <Box
      ref={containerRef}
      p={6}
      className="markdown-preview"
      sx={{
        // Base styles
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
        fontSize: "15px",
        lineHeight: 1.7,
        color: darkMode ? "#e0e0e0" : "#333",
        wordWrap: "break-word",

        // Headings
        "h1, h2, h3, h4, h5, h6": {
          fontWeight: "bold",
          lineHeight: 1.4,
          marginTop: "1.5em",
          marginBottom: "0.5em",
        },
        h1: {
          fontSize: "2.2em",
          borderBottom: "2px solid",
          borderColor: darkMode ? "#444" : "#eee",
          paddingBottom: "0.3em",
        },
        h2: {
          fontSize: "1.8em",
          borderBottom: "1px solid",
          borderColor: darkMode ? "#333" : "#eee",
          paddingBottom: "0.3em",
        },
        h3: { fontSize: "1.4em" },
        h4: { fontSize: "1.2em" },
        h5: { fontSize: "1em" },
        h6: { fontSize: "0.9em", color: darkMode ? "#888" : "#777" },

        // Paragraphs and text
        p: { margin: "1em 0" },
        "a": {
          color: darkMode ? "#6b9fff" : "#4183c4",
          textDecoration: "none",
          "&:hover": { textDecoration: "underline" },
        },
        strong: { fontWeight: "bold" },
        em: { fontStyle: "italic" },

        // Lists
        "ul, ol": {
          paddingLeft: "2em",
          margin: "1em 0",
        },
        li: { margin: "0.3em 0" },
        "li > ul, li > ol": { margin: "0.3em 0" },

        // Code
        code: {
          fontFamily: "'JetBrains Mono', 'Fira Code', Consolas, monospace",
          fontSize: "0.9em",
          backgroundColor: darkMode ? "#2d2d2d" : "#f4f4f4",
          padding: "0.2em 0.4em",
          borderRadius: "4px",
          color: darkMode ? "#e06c75" : "#c7254e",
        },
        pre: {
          backgroundColor: darkMode ? "#1e1e1e" : "#f6f8fa",
          padding: "1em",
          borderRadius: "8px",
          overflow: "auto",
          margin: "1em 0",
          border: "1px solid",
          borderColor: darkMode ? "#333" : "#e1e4e8",
          "& code": {
            backgroundColor: "transparent",
            padding: 0,
            color: "inherit",
          },
        },

        // Blockquotes
        blockquote: {
          borderLeft: "4px solid",
          borderColor: darkMode ? "#555" : "#dfe2e5",
          paddingLeft: "1em",
          margin: "1em 0",
          color: darkMode ? "#aaa" : "#6a737d",
          fontStyle: "italic",
        },

        // Tables
        table: {
          width: "100%",
          borderCollapse: "collapse",
          margin: "1em 0",
        },
        "th, td": {
          border: "1px solid",
          borderColor: darkMode ? "#444" : "#e1e4e8",
          padding: "0.75em 1em",
          textAlign: "left",
        },
        th: {
          backgroundColor: darkMode ? "#2d2d2d" : "#f6f8fa",
          fontWeight: "bold",
        },
        "tr:nth-of-type(even)": {
          backgroundColor: darkMode ? "#252525" : "#f9f9f9",
        },

        // Horizontal rule
        hr: {
          border: "none",
          borderTop: "1px solid",
          borderColor: darkMode ? "#444" : "#e1e4e8",
          margin: "2em 0",
        },

        // Images
        img: {
          maxWidth: "100%",
          height: "auto",
          borderRadius: "8px",
          margin: "1em 0",
        },

        // Checkbox (task list)
        'input[type="checkbox"]': {
          marginRight: "0.5em",
        },

        // Footnotes
        ".footnotes": {
          marginTop: "2em",
          paddingTop: "1em",
          borderTop: "1px solid",
          borderColor: darkMode ? "#444" : "#e1e4e8",
          fontSize: "0.9em",
        },
      }}
    />
  );
}
