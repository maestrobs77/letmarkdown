import { useCallback, useState } from "react";
import {
  Box,
  Button,
  Icon,
  IconButton,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  ModalOverlay,
  Progress,
  Text,
  Tooltip,
  useDisclosure,
  useToast,
  VStack,
} from "@chakra-ui/react";
import { useDropzone } from "react-dropzone";
import { VscCloudUpload, VscFileMedia } from "react-icons/vsc";
import { uploadFile } from "../../lib/supabase";
import { nanoid } from "nanoid";

interface ImageUploaderProps {
  projectId: string;
  onUpload: (url: string, filename: string) => void;
  darkMode: boolean;
}

export default function ImageUploader({
  projectId,
  onUpload,
  darkMode,
}: ImageUploaderProps) {
  const toast = useToast();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const handleUpload = async (file: File) => {
    setUploading(true);
    setUploadProgress(0);

    try {
      // Generate unique filename
      const ext = file.name.split(".").pop() || "png";
      const filename = `${nanoid()}.${ext}`;
      const path = `${projectId}/${filename}`;

      // Simulate progress (actual progress would need a custom upload)
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => Math.min(prev + 10, 90));
      }, 100);

      const result = await uploadFile("project-assets", path, file);

      clearInterval(progressInterval);
      setUploadProgress(100);

      if (result) {
        toast({
          title: "Image uploaded",
          status: "success",
          duration: 2000,
        });
        onUpload(result.url, file.name);
        onClose();
      } else {
        throw new Error("Upload failed");
      }
    } catch (error: any) {
      toast({
        title: "Upload failed",
        description: error.message,
        status: "error",
        duration: 3000,
      });
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      if (file) {
        handleUpload(file);
      }
    },
    [projectId]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/*": [".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg"],
    },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024, // 10MB
  });

  return (
    <>
      <Tooltip label="Upload Image">
        <IconButton
          aria-label="Upload image"
          icon={<VscFileMedia />}
          size="sm"
          variant="ghost"
          onClick={onOpen}
        />
      </Tooltip>

      <Modal isOpen={isOpen} onClose={onClose} isCentered>
        <ModalOverlay backdropFilter="blur(4px)" />
        <ModalContent borderRadius="2xl">
          <ModalHeader>Upload Image</ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
            <Box
              {...getRootProps()}
              p={8}
              border="2px dashed"
              borderColor={isDragActive ? "purple.400" : "gray.300"}
              borderRadius="xl"
              bg={isDragActive ? "purple.50" : "gray.50"}
              textAlign="center"
              cursor="pointer"
              transition="all 0.2s"
              _hover={{
                borderColor: "purple.400",
                bg: "purple.50",
              }}
            >
              <input {...getInputProps()} />
              <VStack spacing={3}>
                <Icon
                  as={VscCloudUpload}
                  boxSize={12}
                  color={isDragActive ? "purple.500" : "gray.400"}
                />
                {isDragActive ? (
                  <Text color="purple.600" fontWeight="medium">
                    Drop the image here
                  </Text>
                ) : (
                  <>
                    <Text fontWeight="medium">
                      Drag & drop an image here
                    </Text>
                    <Text fontSize="sm" color="gray.500">
                      or click to select
                    </Text>
                    <Text fontSize="xs" color="gray.400">
                      PNG, JPG, GIF, WebP, SVG (max 10MB)
                    </Text>
                  </>
                )}
              </VStack>
            </Box>

            {uploading && (
              <Box mt={4}>
                <Text fontSize="sm" mb={2}>
                  Uploading...
                </Text>
                <Progress
                  value={uploadProgress}
                  size="sm"
                  colorScheme="purple"
                  borderRadius="full"
                />
              </Box>
            )}
          </ModalBody>
        </ModalContent>
      </Modal>
    </>
  );
}
