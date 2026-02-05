import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Box,
  Button,
  Flex,
  Heading,
  HStack,
  Icon,
  IconButton,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
  Spinner,
  Text,
  useDisclosure,
  useToast,
  VStack,
  Badge,
  Tooltip,
} from "@chakra-ui/react";
import {
  VscAdd,
  VscArrowLeft,
  VscCloud,
  VscFolderOpened,
  VscNewFile,
  VscNewFolder,
  VscOrganization,
  VscRocket,
  VscSettings,
} from "react-icons/vsc";
import Split from "react-split";
import { useProjectStore } from "../../store/projectStore";
import { useDocumentStore } from "../../store/documentStore";
import DocumentTree from "../documents/DocumentTree";
import DocumentEditor from "../documents/DocumentEditor";
import MembersModal from "./MembersModal";
import PublishModal from "./PublishModal";
import "../Split.css";

export default function ProjectPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const toast = useToast();
  
  const { currentProject, fetchProject, loading: projectLoading } = useProjectStore();
  const {
    documents,
    currentDocument,
    fetchDocuments,
    createDocument,
    createFolder,
    loading: docsLoading,
    setCurrentDocument,
  } = useDocumentStore();

  const membersModal = useDisclosure();
  const publishModal = useDisclosure();
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    if (projectId) {
      fetchProject(projectId);
      fetchDocuments(projectId);
    }
  }, [projectId, fetchProject, fetchDocuments]);

  const handleCreateDocument = async () => {
    if (!projectId) return;
    const doc = await createDocument({
      project_id: projectId,
      title: "Untitled Document",
      content: "# New Document\n\nStart writing here...",
      parent_id: currentDocument?.is_folder ? currentDocument.id : currentDocument?.parent_id,
    });
    if (doc) {
      setCurrentDocument(doc);
    }
  };

  const handleCreateFolder = async () => {
    if (!projectId) return;
    await createFolder(
      projectId,
      "New Folder",
      currentDocument?.is_folder ? currentDocument.id : currentDocument?.parent_id
    );
  };

  const canEdit = currentProject?.userRole === "owner" || currentProject?.userRole === "editor";

  if (projectLoading && !currentProject) {
    return (
      <Flex h="100vh" align="center" justify="center">
        <Spinner size="xl" color="purple.500" />
      </Flex>
    );
  }

  if (!currentProject) {
    return (
      <Flex h="100vh" align="center" justify="center" direction="column" gap={4}>
        <Text>Project not found</Text>
        <Button onClick={() => navigate("/dashboard")}>Back to Dashboard</Button>
      </Flex>
    );
  }

  return (
    <Flex
      direction="column"
      h="100vh"
      overflow="hidden"
      bg={darkMode ? "#1e1e1e" : "white"}
      color={darkMode ? "#cbcaca" : "inherit"}
    >
      {/* Header */}
      <Box
        flexShrink={0}
        bg={darkMode ? "#252526" : "white"}
        borderBottom="1px"
        borderColor={darkMode ? "#3c3c3c" : "gray.200"}
        px={4}
        py={2}
      >
        <Flex justify="space-between" align="center">
          <HStack spacing={4}>
            <IconButton
              aria-label="Back"
              icon={<VscArrowLeft />}
              variant="ghost"
              onClick={() => navigate("/dashboard")}
            />
            <HStack spacing={2}>
              <Icon as={VscFolderOpened} color="purple.500" />
              <Heading size="md">{currentProject.name}</Heading>
              <Badge colorScheme="purple" fontSize="xs">
                {currentProject.userRole}
              </Badge>
            </HStack>
          </HStack>

          <HStack spacing={2}>
            {canEdit && (
              <>
                <Menu>
                  <MenuButton
                    as={Button}
                    leftIcon={<VscAdd />}
                    size="sm"
                    colorScheme="purple"
                    variant="outline"
                  >
                    New
                  </MenuButton>
                  <MenuList>
                    <MenuItem icon={<VscNewFile />} onClick={handleCreateDocument}>
                      New Document
                    </MenuItem>
                    <MenuItem icon={<VscNewFolder />} onClick={handleCreateFolder}>
                      New Folder
                    </MenuItem>
                  </MenuList>
                </Menu>

                <Tooltip label="Publish Site">
                  <IconButton
                    aria-label="Publish"
                    icon={<VscRocket />}
                    onClick={publishModal.onOpen}
                    colorScheme="green"
                    variant="outline"
                    size="sm"
                  />
                </Tooltip>
              </>
            )}

            <Tooltip label="Team Members">
              <IconButton
                aria-label="Members"
                icon={<VscOrganization />}
                onClick={membersModal.onOpen}
                variant="ghost"
                size="sm"
              />
            </Tooltip>

            <Tooltip label={darkMode ? "Light Mode" : "Dark Mode"}>
              <IconButton
                aria-label="Toggle dark mode"
                icon={<VscSettings />}
                onClick={() => setDarkMode(!darkMode)}
                variant="ghost"
                size="sm"
              />
            </Tooltip>
          </HStack>
        </Flex>
      </Box>

      {/* Main Content */}
      <Flex flex={1} minH={0}>
        <Split
          className="split"
          sizes={[20, 80]}
          minSize={[200, 400]}
          gutterSize={4}
          style={{ display: "flex", width: "100%", height: "100%" }}
        >
          {/* Sidebar - Document Tree */}
          <Box
            bg={darkMode ? "#252526" : "#f7f7f7"}
            borderRight="1px"
            borderColor={darkMode ? "#3c3c3c" : "gray.200"}
            overflow="auto"
          >
            <DocumentTree
              projectId={projectId!}
              darkMode={darkMode}
              canEdit={canEdit}
            />
          </Box>

          {/* Editor Area */}
          <Box flex={1} overflow="hidden">
            {currentDocument && !currentDocument.is_folder ? (
              <DocumentEditor
                document={currentDocument}
                darkMode={darkMode}
                canEdit={canEdit}
                projectId={projectId!}
              />
            ) : (
              <Flex
                h="100%"
                align="center"
                justify="center"
                direction="column"
                color={darkMode ? "gray.500" : "gray.400"}
              >
                <Icon as={VscNewFile} boxSize={16} mb={4} />
                <Text fontSize="lg" mb={2}>
                  Select a document to edit
                </Text>
                {canEdit && (
                  <Button
                    size="sm"
                    colorScheme="purple"
                    variant="ghost"
                    leftIcon={<VscAdd />}
                    onClick={handleCreateDocument}
                  >
                    Create new document
                  </Button>
                )}
              </Flex>
            )}
          </Box>
        </Split>
      </Flex>

      {/* Modals */}
      <MembersModal
        isOpen={membersModal.isOpen}
        onClose={membersModal.onClose}
        project={currentProject}
      />

      <PublishModal
        isOpen={publishModal.isOpen}
        onClose={publishModal.onClose}
        projectId={projectId!}
      />
    </Flex>
  );
}
