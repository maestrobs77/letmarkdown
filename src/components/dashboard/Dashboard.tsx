import { useEffect, useState } from "react";
import {
  Box,
  Button,
  Container,
  Flex,
  Grid,
  Heading,
  HStack,
  Icon,
  IconButton,
  Input,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Skeleton,
  Text,
  useDisclosure,
  useToast,
  VStack,
  Avatar,
  Badge,
} from "@chakra-ui/react";
import {
  VscAdd,
  VscFolder,
  VscGlobe,
  VscKebabVertical,
  VscSignOut,
  VscTrash,
  VscEdit,
} from "react-icons/vsc";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../../store/authStore";
import { useProjectStore } from "../../store/projectStore";

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 50) + "-" + Date.now().toString(36);
}

export default function Dashboard() {
  const navigate = useNavigate();
  const toast = useToast();
  const { user, profile, signOut } = useAuthStore();
  const { projects, loading, fetchProjects, createProject, deleteProject } = useProjectStore();
  
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectDesc, setNewProjectDesc] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const handleCreateProject = async () => {
    if (!newProjectName.trim()) return;
    
    setCreating(true);
    const project = await createProject({
      name: newProjectName.trim(),
      description: newProjectDesc.trim() || null,
      slug: generateSlug(newProjectName.trim()),
    });

    if (project) {
      toast({
        title: "Project created",
        status: "success",
        duration: 2000,
      });
      onClose();
      setNewProjectName("");
      setNewProjectDesc("");
      navigate(`/project/${project.id}`);
    } else {
      toast({
        title: "Failed to create project",
        status: "error",
        duration: 3000,
      });
    }
    setCreating(false);
  };

  const handleDeleteProject = async (projectId: string, projectName: string) => {
    if (window.confirm(`Are you sure you want to delete "${projectName}"? This action cannot be undone.`)) {
      const success = await deleteProject(projectId);
      if (success) {
        toast({
          title: "Project deleted",
          status: "info",
          duration: 2000,
        });
      }
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const getRoleBadge = (role?: string) => {
    const colors: Record<string, string> = {
      owner: "purple",
      editor: "blue",
      viewer: "gray",
    };
    return (
      <Badge colorScheme={colors[role || "viewer"]} fontSize="xs">
        {role}
      </Badge>
    );
  };

  return (
    <Box minH="100vh" bg="gray.50">
      {/* Header */}
      <Box bg="white" borderBottom="1px" borderColor="gray.200" py={4}>
        <Container maxW="6xl">
          <Flex justify="space-between" align="center">
            <HStack spacing={4}>
              <Heading
                size="lg"
                bgGradient="linear(to-r, purple.600, blue.500)"
                bgClip="text"
                fontWeight="extrabold"
              >
                Let's Markdown
              </Heading>
            </HStack>

            <HStack spacing={4}>
              <HStack spacing={2}>
                <Avatar
                  size="sm"
                  name={profile?.full_name || user?.email}
                  src={profile?.avatar_url || undefined}
                />
                <Text fontSize="sm" fontWeight="medium" color="gray.700">
                  {profile?.full_name || user?.email}
                </Text>
              </HStack>
              <IconButton
                aria-label="Sign out"
                icon={<VscSignOut />}
                variant="ghost"
                onClick={handleSignOut}
              />
            </HStack>
          </Flex>
        </Container>
      </Box>

      {/* Content */}
      <Container maxW="6xl" py={8}>
        <VStack spacing={8} align="stretch">
          <Flex justify="space-between" align="center">
            <VStack align="start" spacing={1}>
              <Heading size="lg" color="gray.800">
                Your Projects
              </Heading>
              <Text color="gray.500">
                Create, collaborate, and publish your markdown documents
              </Text>
            </VStack>
            <Button
              leftIcon={<VscAdd />}
              colorScheme="purple"
              onClick={onOpen}
              size="lg"
              borderRadius="xl"
            >
              New Project
            </Button>
          </Flex>

          {loading ? (
            <Grid templateColumns="repeat(auto-fill, minmax(300px, 1fr))" gap={6}>
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} height="180px" borderRadius="xl" />
              ))}
            </Grid>
          ) : projects.length === 0 ? (
            <Box
              bg="white"
              borderRadius="2xl"
              p={12}
              textAlign="center"
              border="2px dashed"
              borderColor="gray.200"
            >
              <Icon as={VscFolder} boxSize={16} color="gray.300" mb={4} />
              <Heading size="md" color="gray.600" mb={2}>
                No projects yet
              </Heading>
              <Text color="gray.500" mb={6}>
                Create your first project to start writing markdown collaboratively
              </Text>
              <Button
                leftIcon={<VscAdd />}
                colorScheme="purple"
                onClick={onOpen}
              >
                Create Project
              </Button>
            </Box>
          ) : (
            <Grid templateColumns="repeat(auto-fill, minmax(300px, 1fr))" gap={6}>
              {projects.map((project) => (
                <Box
                  key={project.id}
                  bg="white"
                  borderRadius="2xl"
                  p={6}
                  boxShadow="sm"
                  border="1px"
                  borderColor="gray.100"
                  cursor="pointer"
                  transition="all 0.2s"
                  _hover={{
                    boxShadow: "md",
                    transform: "translateY(-2px)",
                    borderColor: "purple.200",
                  }}
                  onClick={() => navigate(`/project/${project.id}`)}
                >
                  <Flex justify="space-between" align="start" mb={4}>
                    <HStack spacing={3}>
                      <Box
                        p={2}
                        bg="purple.50"
                        borderRadius="lg"
                      >
                        <Icon as={VscFolder} boxSize={6} color="purple.500" />
                      </Box>
                      <VStack align="start" spacing={0}>
                        <Heading size="md" color="gray.800">
                          {project.name}
                        </Heading>
                        {getRoleBadge(project.userRole)}
                      </VStack>
                    </HStack>
                    <Menu>
                      <MenuButton
                        as={IconButton}
                        icon={<VscKebabVertical />}
                        variant="ghost"
                        size="sm"
                        onClick={(e) => e.stopPropagation()}
                      />
                      <MenuList onClick={(e) => e.stopPropagation()}>
                        <MenuItem
                          icon={<VscEdit />}
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/project/${project.id}`);
                          }}
                        >
                          Open
                        </MenuItem>
                        {project.userRole === "owner" && (
                          <MenuItem
                            icon={<VscTrash />}
                            color="red.500"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteProject(project.id, project.name);
                            }}
                          >
                            Delete
                          </MenuItem>
                        )}
                      </MenuList>
                    </Menu>
                  </Flex>

                  {project.description && (
                    <Text color="gray.500" fontSize="sm" noOfLines={2} mb={4}>
                      {project.description}
                    </Text>
                  )}

                  <HStack spacing={4} fontSize="xs" color="gray.400">
                    <HStack spacing={1}>
                      <Icon as={VscGlobe} />
                      <Text>{project.slug}</Text>
                    </HStack>
                  </HStack>
                </Box>
              ))}
            </Grid>
          )}
        </VStack>
      </Container>

      {/* Create Project Modal */}
      <Modal isOpen={isOpen} onClose={onClose} isCentered>
        <ModalOverlay backdropFilter="blur(4px)" />
        <ModalContent borderRadius="2xl">
          <ModalHeader>Create New Project</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4}>
              <Input
                placeholder="Project name"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                size="lg"
                borderRadius="xl"
                autoFocus
              />
              <Input
                placeholder="Description (optional)"
                value={newProjectDesc}
                onChange={(e) => setNewProjectDesc(e.target.value)}
                size="lg"
                borderRadius="xl"
              />
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onClose}>
              Cancel
            </Button>
            <Button
              colorScheme="purple"
              onClick={handleCreateProject}
              isLoading={creating}
              isDisabled={!newProjectName.trim()}
            >
              Create
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
}
