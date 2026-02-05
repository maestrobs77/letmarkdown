import { useCallback, useEffect, useRef, useState } from "react";
import {
  Box,
  Flex,
  HStack,
  Icon,
  IconButton,
  Input,
  Text,
  Tooltip,
  useToast,
} from "@chakra-ui/react";
import { VscCloudUpload, VscFile, VscGlobe, VscSave } from "react-icons/vsc";
import Editor from "@monaco-editor/react";
import type { editor } from "monaco-editor";
import { useDebounce } from "use-debounce";
import Split from "react-split";
import { useDocumentStore } from "../../store/documentStore";
import MarkdownPreview from "./MarkdownPreview";
import ImageUploader from "./ImageUploader";
import type { Document } from "../../types/database";
import "../Split.css";

interface DocumentEditorProps {
  document: Document;
  darkMode: boolean;
  canEdit: boolean;
  projectId: string;
}

export default function DocumentEditor({
  document,
  darkMode,
  canEdit,
  projectId,
}: DocumentEditorProps) {
  const toast = useToast();
  const { updateDocument, togglePublished, saving } = useDocumentStore();
  
  const [content, setContent] = useState(document.content);
  const [title, setTitle] = useState(document.title);
  const [debouncedContent] = useDebounce(content, 1000);
  const [debouncedTitle] = useDebounce(title, 1000);
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const lastSavedContent = useRef(document.content);
  const lastSavedTitle = useRef(document.title);

  // Update local state when document changes
  useEffect(() => {
    setContent(document.content);
    setTitle(document.title);
    lastSavedContent.current = document.content;
    lastSavedTitle.current = document.title;
  }, [document.id, document.content, document.title]);

  // Auto-save content
  useEffect(() => {
    if (canEdit && debouncedContent !== lastSavedContent.current) {
      updateDocument(document.id, { content: debouncedContent });
      lastSavedContent.current = debouncedContent;
    }
  }, [debouncedContent, document.id, canEdit, updateDocument]);

  // Auto-save title
  useEffect(() => {
    if (canEdit && debouncedTitle !== lastSavedTitle.current && debouncedTitle.trim()) {
      updateDocument(document.id, { title: debouncedTitle.trim() });
      lastSavedTitle.current = debouncedTitle.trim();
    }
  }, [debouncedTitle, document.id, canEdit, updateDocument]);

  const handleEditorMount = useCallback((editor: editor.IStandaloneCodeEditor) => {
    editorRef.current = editor;
  }, []);

  const handleContentChange = useCallback((value: string | undefined) => {
    if (value !== undefined) {
      setContent(value);
    }
  }, []);

  const handleManualSave = async () => {
    if (!canEdit) return;
    
    const updates: { content?: string; title?: string } = {};
    if (content !== lastSavedContent.current) {
      updates.content = content;
      lastSavedContent.current = content;
    }
    if (title !== lastSavedTitle.current && title.trim()) {
      updates.title = title.trim();
      lastSavedTitle.current = title.trim();
    }
    
    if (Object.keys(updates).length > 0) {
      await updateDocument(document.id, updates);
      toast({
        title: "Saved",
        status: "success",
        duration: 1000,
        isClosable: true,
      });
    }
  };

  const handleTogglePublish = async () => {
    await togglePublished(document.id);
    toast({
      title: document.is_published ? "Unpublished" : "Published",
      status: "info",
      duration: 2000,
    });
  };

  const handleImageInsert = (url: string, filename: string) => {
    const editor = editorRef.current;
    if (!editor) return;

    const position = editor.getPosition();
    const markdownImage = `![${filename}](${url})\n`;

    editor.executeEdits("", [
      {
        range: {
          startLineNumber: position?.lineNumber || 1,
          startColumn: position?.column || 1,
          endLineNumber: position?.lineNumber || 1,
          endColumn: position?.column || 1,
        },
        text: markdownImage,
      },
    ]);

    // Update content state
    const newContent = editor.getValue();
    setContent(newContent);
  };

  return (
    <Flex direction="column" h="100%" overflow="hidden">
      {/* Header */}
      <Flex
        px={4}
        py={2}
        borderBottom="1px"
        borderColor={darkMode ? "#3c3c3c" : "gray.200"}
        align="center"
        justify="space-between"
        bg={darkMode ? "#252526" : "white"}
      >
        <HStack spacing={3} flex={1}>
          <Icon as={VscFile} color={document.is_published ? "green.500" : "gray.400"} />
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            variant="unstyled"
            fontWeight="medium"
            isReadOnly={!canEdit}
            _focus={{ boxShadow: "none" }}
          />
          {document.is_published && (
            <Tooltip label="Published">
              <Box>
                <Icon as={VscGlobe} color="green.500" />
              </Box>
            </Tooltip>
          )}
        </HStack>

        <HStack spacing={2}>
          {saving && (
            <Text fontSize="xs" color="gray.500">
              Saving...
            </Text>
          )}
          
          {canEdit && (
            <>
              <ImageUploader
                projectId={projectId}
                onUpload={handleImageInsert}
                darkMode={darkMode}
              />

              <Tooltip label={document.is_published ? "Unpublish" : "Publish"}>
                <IconButton
                  aria-label="Toggle publish"
                  icon={<VscGlobe />}
                  size="sm"
                  variant={document.is_published ? "solid" : "ghost"}
                  colorScheme={document.is_published ? "green" : "gray"}
                  onClick={handleTogglePublish}
                />
              </Tooltip>

              <Tooltip label="Save (Ctrl+S)">
                <IconButton
                  aria-label="Save"
                  icon={<VscSave />}
                  size="sm"
                  variant="ghost"
                  onClick={handleManualSave}
                />
              </Tooltip>
            </>
          )}
        </HStack>
      </Flex>

      {/* Editor + Preview */}
      <Box flex={1} overflow="hidden">
        <Split
          className="split"
          sizes={[50, 50]}
          minSize={[300, 300]}
          gutterSize={4}
          style={{ display: "flex", width: "100%", height: "100%" }}
        >
          {/* Editor */}
          <Box h="100%">
            <Editor
              theme={darkMode ? "vs-dark" : "vs"}
              language="markdown"
              value={content}
              onChange={handleContentChange}
              onMount={handleEditorMount}
              options={{
                automaticLayout: true,
                fontSize: 14,
                fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                wordWrap: "on",
                minimap: { enabled: false },
                lineNumbers: "on",
                renderWhitespace: "selection",
                scrollBeyondLastLine: false,
                readOnly: !canEdit,
                tabSize: 2,
              }}
            />
          </Box>

          {/* Preview */}
          <Box h="100%" overflow="auto" bg={darkMode ? "#1e1e1e" : "white"}>
            <MarkdownPreview content={content} darkMode={darkMode} />
          </Box>
        </Split>
      </Box>
    </Flex>
  );
}
