import { useState } from "react";
import {
  Box,
  Collapse,
  Flex,
  HStack,
  Icon,
  IconButton,
  Input,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
  Text,
  useToast,
} from "@chakra-ui/react";
import {
  VscChevronDown,
  VscChevronRight,
  VscEdit,
  VscFile,
  VscFolder,
  VscFolderOpened,
  VscGlobe,
  VscKebabVertical,
  VscTrash,
} from "react-icons/vsc";
import { useDocumentStore } from "../../store/documentStore";
import type { DocumentTreeNode } from "../../types/database";

interface DocumentTreeProps {
  projectId: string;
  darkMode: boolean;
  canEdit: boolean;
}

interface TreeItemProps {
  node: DocumentTreeNode;
  depth: number;
  darkMode: boolean;
  canEdit: boolean;
  selectedId: string | null;
  onSelect: (node: DocumentTreeNode) => void;
  onDelete: (id: string) => void;
  onRename: (id: string, title: string) => void;
  onTogglePublish: (id: string) => void;
}

function TreeItem({
  node,
  depth,
  darkMode,
  canEdit,
  selectedId,
  onSelect,
  onDelete,
  onRename,
  onTogglePublish,
}: TreeItemProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(node.title);

  const isSelected = selectedId === node.id;
  const hasChildren = node.children.length > 0;

  const handleRename = () => {
    if (editTitle.trim() && editTitle !== node.title) {
      onRename(node.id, editTitle.trim());
    }
    setIsEditing(false);
  };

  const bgColor = isSelected
    ? darkMode
      ? "rgba(255,255,255,0.1)"
      : "purple.50"
    : "transparent";

  const hoverBg = darkMode ? "rgba(255,255,255,0.05)" : "gray.100";

  return (
    <Box>
      <Flex
        align="center"
        py={1}
        px={2}
        pl={depth * 16 + 8}
        cursor="pointer"
        bg={bgColor}
        _hover={{ bg: isSelected ? bgColor : hoverBg }}
        borderRadius="md"
        onClick={() => onSelect(node)}
        role="group"
      >
        {/* Expand/collapse for folders */}
        {node.is_folder ? (
          <IconButton
            aria-label="Toggle"
            icon={isOpen ? <VscChevronDown /> : <VscChevronRight />}
            size="xs"
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation();
              setIsOpen(!isOpen);
            }}
            minW="20px"
            h="20px"
          />
        ) : (
          <Box w="20px" />
        )}

        {/* Icon */}
        <Icon
          as={
            node.is_folder
              ? isOpen
                ? VscFolderOpened
                : VscFolder
              : VscFile
          }
          color={
            node.is_folder
              ? "yellow.500"
              : node.is_published
              ? "green.500"
              : darkMode
              ? "gray.400"
              : "gray.500"
          }
          mr={2}
        />

        {/* Title */}
        {isEditing ? (
          <Input
            size="xs"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            onBlur={handleRename}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleRename();
              if (e.key === "Escape") {
                setEditTitle(node.title);
                setIsEditing(false);
              }
            }}
            autoFocus
            onClick={(e) => e.stopPropagation()}
            maxW="150px"
          />
        ) : (
          <Text
            fontSize="sm"
            flex={1}
            noOfLines={1}
            fontWeight={isSelected ? "medium" : "normal"}
          >
            {node.title}
          </Text>
        )}

        {/* Published indicator */}
        {!node.is_folder && node.is_published && (
          <Icon as={VscGlobe} color="green.500" boxSize={3} mr={1} />
        )}

        {/* Context menu */}
        {canEdit && (
          <Menu>
            <MenuButton
              as={IconButton}
              icon={<VscKebabVertical />}
              size="xs"
              variant="ghost"
              opacity={0}
              _groupHover={{ opacity: 1 }}
              onClick={(e) => e.stopPropagation()}
            />
            <MenuList fontSize="sm" onClick={(e) => e.stopPropagation()}>
              <MenuItem
                icon={<VscEdit />}
                onClick={() => {
                  setEditTitle(node.title);
                  setIsEditing(true);
                }}
              >
                Rename
              </MenuItem>
              {!node.is_folder && (
                <MenuItem
                  icon={<VscGlobe />}
                  onClick={() => onTogglePublish(node.id)}
                >
                  {node.is_published ? "Unpublish" : "Publish"}
                </MenuItem>
              )}
              <MenuItem
                icon={<VscTrash />}
                color="red.500"
                onClick={() => onDelete(node.id)}
              >
                Delete
              </MenuItem>
            </MenuList>
          </Menu>
        )}
      </Flex>

      {/* Children */}
      {node.is_folder && hasChildren && (
        <Collapse in={isOpen}>
          {node.children.map((child) => (
            <TreeItem
              key={child.id}
              node={child}
              depth={depth + 1}
              darkMode={darkMode}
              canEdit={canEdit}
              selectedId={selectedId}
              onSelect={onSelect}
              onDelete={onDelete}
              onRename={onRename}
              onTogglePublish={onTogglePublish}
            />
          ))}
        </Collapse>
      )}
    </Box>
  );
}

export default function DocumentTree({ projectId, darkMode, canEdit }: DocumentTreeProps) {
  const toast = useToast();
  const {
    documentTree,
    currentDocument,
    setCurrentDocument,
    updateDocument,
    deleteDocument,
    togglePublished,
  } = useDocumentStore();

  const handleSelect = (node: DocumentTreeNode) => {
    setCurrentDocument(node);
  };

  const handleDelete = async (id: string) => {
    const doc = documentTree
      .flatMap(function flatten(n): DocumentTreeNode[] {
        return [n, ...n.children.flatMap(flatten)];
      })
      .find((d) => d.id === id);

    if (doc && window.confirm(`Delete "${doc.title}"?${doc.is_folder ? " All contents will also be deleted." : ""}`)) {
      const success = await deleteDocument(id);
      if (success) {
        toast({ title: "Deleted", status: "info", duration: 2000 });
      }
    }
  };

  const handleRename = async (id: string, title: string) => {
    await updateDocument(id, { title });
  };

  const handleTogglePublish = async (id: string) => {
    await togglePublished(id);
  };

  return (
    <Box p={2}>
      <Text
        fontSize="xs"
        fontWeight="semibold"
        color={darkMode ? "gray.400" : "gray.500"}
        px={2}
        py={1}
        textTransform="uppercase"
        letterSpacing="wider"
      >
        Documents
      </Text>
      
      {documentTree.length === 0 ? (
        <Text
          fontSize="sm"
          color={darkMode ? "gray.500" : "gray.400"}
          textAlign="center"
          py={8}
        >
          No documents yet
        </Text>
      ) : (
        documentTree.map((node) => (
          <TreeItem
            key={node.id}
            node={node}
            depth={0}
            darkMode={darkMode}
            canEdit={canEdit}
            selectedId={currentDocument?.id || null}
            onSelect={handleSelect}
            onDelete={handleDelete}
            onRename={handleRename}
            onTogglePublish={handleTogglePublish}
          />
        ))
      )}
    </Box>
  );
}
