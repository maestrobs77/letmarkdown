import { useState } from "react";
import {
  Avatar,
  Badge,
  Box,
  Button,
  Flex,
  FormControl,
  FormLabel,
  HStack,
  IconButton,
  Input,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Select,
  Text,
  useToast,
  VStack,
} from "@chakra-ui/react";
import { VscClose, VscPersonAdd } from "react-icons/vsc";
import { useProjectStore } from "../../store/projectStore";
import { useAuthStore } from "../../store/authStore";
import type { MemberRole, ProjectWithMembers } from "../../types/database";

interface MembersModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: ProjectWithMembers;
}

export default function MembersModal({ isOpen, onClose, project }: MembersModalProps) {
  const toast = useToast();
  const { user } = useAuthStore();
  const { addMember, updateMemberRole, removeMember, leaveProject } = useProjectStore();
  
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<MemberRole>("editor");
  const [adding, setAdding] = useState(false);

  const isOwner = project.userRole === "owner";

  const handleAddMember = async () => {
    if (!email.trim()) return;
    
    setAdding(true);
    const { error } = await addMember(project.id, email.trim(), role);
    
    if (error) {
      toast({
        title: "Failed to add member",
        description: error,
        status: "error",
        duration: 3000,
      });
    } else {
      toast({
        title: "Member added",
        status: "success",
        duration: 2000,
      });
      setEmail("");
    }
    setAdding(false);
  };

  const handleRoleChange = async (memberId: string, newRole: MemberRole) => {
    const success = await updateMemberRole(memberId, newRole);
    if (!success) {
      toast({
        title: "Failed to update role",
        status: "error",
        duration: 3000,
      });
    }
  };

  const handleRemoveMember = async (memberId: string, memberName: string) => {
    if (window.confirm(`Remove ${memberName} from this project?`)) {
      const success = await removeMember(memberId);
      if (success) {
        toast({
          title: "Member removed",
          status: "info",
          duration: 2000,
        });
      }
    }
  };

  const handleLeaveProject = async () => {
    if (window.confirm("Are you sure you want to leave this project?")) {
      const success = await leaveProject(project.id);
      if (success) {
        onClose();
      }
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "owner":
        return "purple";
      case "editor":
        return "blue";
      default:
        return "gray";
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <ModalOverlay backdropFilter="blur(4px)" />
      <ModalContent borderRadius="2xl">
        <ModalHeader>Team Members</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <VStack spacing={6} align="stretch">
            {/* Add member form (only for owners) */}
            {isOwner && (
              <Box p={4} bg="gray.50" borderRadius="xl">
                <FormControl>
                  <FormLabel fontSize="sm" fontWeight="semibold">
                    Invite Member
                  </FormLabel>
                  <HStack>
                    <Input
                      placeholder="Email address"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      bg="white"
                      size="sm"
                      borderRadius="lg"
                    />
                    <Select
                      value={role}
                      onChange={(e) => setRole(e.target.value as MemberRole)}
                      w="150px"
                      size="sm"
                      borderRadius="lg"
                      bg="white"
                    >
                      <option value="editor">Editor</option>
                      <option value="viewer">Viewer</option>
                    </Select>
                    <Button
                      leftIcon={<VscPersonAdd />}
                      colorScheme="purple"
                      size="sm"
                      onClick={handleAddMember}
                      isLoading={adding}
                      isDisabled={!email.trim()}
                    >
                      Add
                    </Button>
                  </HStack>
                </FormControl>
              </Box>
            )}

            {/* Members list */}
            <VStack spacing={3} align="stretch">
              <Text fontSize="sm" fontWeight="semibold" color="gray.600">
                Members ({project.members?.length || 0})
              </Text>
              
              {project.members?.map((member) => (
                <Flex
                  key={member.id}
                  p={3}
                  bg="white"
                  borderRadius="lg"
                  border="1px"
                  borderColor="gray.200"
                  align="center"
                  justify="space-between"
                >
                  <HStack spacing={3}>
                    <Avatar
                      size="sm"
                      name={member.profile?.full_name || member.profile?.email}
                      src={member.profile?.avatar_url || undefined}
                    />
                    <Box>
                      <Text fontSize="sm" fontWeight="medium">
                        {member.profile?.full_name || "No name"}
                        {member.user_id === user?.id && (
                          <Text as="span" color="gray.400" ml={2}>
                            (you)
                          </Text>
                        )}
                      </Text>
                      <Text fontSize="xs" color="gray.500">
                        {member.profile?.email}
                      </Text>
                    </Box>
                  </HStack>

                  <HStack spacing={2}>
                    {isOwner && member.role !== "owner" ? (
                      <>
                        <Select
                          value={member.role}
                          onChange={(e) => handleRoleChange(member.id, e.target.value as MemberRole)}
                          size="xs"
                          w="100px"
                          borderRadius="md"
                        >
                          <option value="editor">Editor</option>
                          <option value="viewer">Viewer</option>
                        </Select>
                        <IconButton
                          aria-label="Remove member"
                          icon={<VscClose />}
                          size="xs"
                          variant="ghost"
                          colorScheme="red"
                          onClick={() => handleRemoveMember(
                            member.id,
                            member.profile?.full_name || member.profile?.email || "this member"
                          )}
                        />
                      </>
                    ) : (
                      <Badge colorScheme={getRoleBadgeColor(member.role)}>
                        {member.role}
                      </Badge>
                    )}
                  </HStack>
                </Flex>
              ))}
            </VStack>
          </VStack>
        </ModalBody>
        <ModalFooter>
          {!isOwner && (
            <Button
              colorScheme="red"
              variant="ghost"
              mr="auto"
              onClick={handleLeaveProject}
            >
              Leave Project
            </Button>
          )}
          <Button onClick={onClose}>Close</Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
