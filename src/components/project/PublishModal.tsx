import { useState } from "react";
import {
  Alert,
  AlertDescription,
  AlertIcon,
  Box,
  Button,
  HStack,
  Icon,
  Link,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Progress,
  Text,
  useToast,
  VStack,
} from "@chakra-ui/react";
import { VscCheck, VscCloudUpload, VscLinkExternal, VscRocket } from "react-icons/vsc";
import { supabase } from "../../lib/supabase";
import { useDocumentStore } from "../../store/documentStore";

interface PublishModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
}

interface PublishResult {
  success: boolean;
  version?: string;
  previewUrl?: string;
  documentCount?: number;
  error?: string;
}

export default function PublishModal({ isOpen, onClose, projectId }: PublishModalProps) {
  const toast = useToast();
  const { documents } = useDocumentStore();
  
  const [publishing, setPublishing] = useState(false);
  const [result, setResult] = useState<PublishResult | null>(null);

  const publishedDocs = documents.filter(d => d.is_published && !d.is_folder);

  const handlePublish = async () => {
    setPublishing(true);
    setResult(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error("Not authenticated");
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/publish`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            projectId,
            template: "default",
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Publish failed");
      }

      setResult({
        success: true,
        version: data.version,
        previewUrl: data.previewUrl,
        documentCount: data.documentCount,
      });

      toast({
        title: "Published successfully!",
        description: `${data.documentCount} documents published`,
        status: "success",
        duration: 5000,
      });
    } catch (error: any) {
      console.error("Publish error:", error);
      setResult({
        success: false,
        error: error.message,
      });
      toast({
        title: "Publish failed",
        description: error.message,
        status: "error",
        duration: 5000,
      });
    } finally {
      setPublishing(false);
    }
  };

  const handleClose = () => {
    setResult(null);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size="lg">
      <ModalOverlay backdropFilter="blur(4px)" />
      <ModalContent borderRadius="2xl">
        <ModalHeader>
          <HStack>
            <Icon as={VscRocket} color="green.500" />
            <Text>Publish Site</Text>
          </HStack>
        </ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <VStack spacing={4} align="stretch">
            {/* Info about what will be published */}
            <Box p={4} bg="gray.50" borderRadius="xl">
              <Text fontSize="sm" color="gray.600" mb={2}>
                Documents to publish:
              </Text>
              {publishedDocs.length === 0 ? (
                <Alert status="warning" borderRadius="lg">
                  <AlertIcon />
                  <AlertDescription fontSize="sm">
                    No documents are marked for publishing. Toggle the publish status on documents you want to include.
                  </AlertDescription>
                </Alert>
              ) : (
                <VStack align="stretch" spacing={1}>
                  {publishedDocs.map((doc) => (
                    <HStack key={doc.id} fontSize="sm">
                      <Icon as={VscCheck} color="green.500" />
                      <Text>{doc.title}</Text>
                    </HStack>
                  ))}
                </VStack>
              )}
            </Box>

            {/* Publishing progress */}
            {publishing && (
              <Box>
                <Text fontSize="sm" mb={2}>
                  Building and uploading...
                </Text>
                <Progress size="sm" isIndeterminate colorScheme="green" borderRadius="full" />
              </Box>
            )}

            {/* Result */}
            {result && (
              <Box>
                {result.success ? (
                  <Alert status="success" borderRadius="xl">
                    <AlertIcon />
                    <Box>
                      <Text fontWeight="semibold">
                        Published successfully!
                      </Text>
                      <Text fontSize="sm">
                        Version: {result.version}
                      </Text>
                      {result.previewUrl && (
                        <Link
                          href={result.previewUrl}
                          isExternal
                          color="green.600"
                          fontSize="sm"
                          display="flex"
                          alignItems="center"
                          gap={1}
                          mt={1}
                        >
                          Download ZIP <Icon as={VscLinkExternal} />
                        </Link>
                      )}
                    </Box>
                  </Alert>
                ) : (
                  <Alert status="error" borderRadius="xl">
                    <AlertIcon />
                    <AlertDescription>{result.error}</AlertDescription>
                  </Alert>
                )}
              </Box>
            )}
          </VStack>
        </ModalBody>
        <ModalFooter>
          <Button variant="ghost" mr={3} onClick={handleClose}>
            Close
          </Button>
          <Button
            leftIcon={<VscCloudUpload />}
            colorScheme="green"
            onClick={handlePublish}
            isLoading={publishing}
            isDisabled={publishedDocs.length === 0}
          >
            Publish
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
