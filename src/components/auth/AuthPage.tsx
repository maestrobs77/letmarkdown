import { useState } from "react";
import {
  Box,
  Button,
  Container,
  Divider,
  FormControl,
  FormLabel,
  Heading,
  Input,
  Stack,
  Text,
  useToast,
  VStack,
  HStack,
  Icon,
  InputGroup,
  InputRightElement,
  IconButton,
} from "@chakra-ui/react";
import { FcGoogle } from "react-icons/fc";
import { VscEye, VscEyeClosed } from "react-icons/vsc";
import { useAuthStore } from "../../store/authStore";

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  
  const { signInWithEmail, signUpWithEmail, signInWithGoogle, loading } = useAuthStore();
  const toast = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const { error } = isLogin
      ? await signInWithEmail(email, password)
      : await signUpWithEmail(email, password, fullName);

    if (error) {
      toast({
        title: isLogin ? "Sign in failed" : "Sign up failed",
        description: error.message,
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    } else if (!isLogin) {
      toast({
        title: "Check your email",
        description: "We sent you a confirmation link to verify your account.",
        status: "success",
        duration: 10000,
        isClosable: true,
      });
    }
  };

  const handleGoogleSignIn = async () => {
    const { error } = await signInWithGoogle();
    if (error) {
      toast({
        title: "Google sign in failed",
        description: error.message,
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    }
  };

  return (
    <Box
      minH="100vh"
      bgGradient="linear(to-br, #0f0c29, #302b63, #24243e)"
      display="flex"
      alignItems="center"
      justifyContent="center"
      p={4}
    >
      <Container maxW="md">
        <Box
          bg="white"
          borderRadius="2xl"
          boxShadow="2xl"
          p={8}
          position="relative"
          overflow="hidden"
        >
          {/* Decorative element */}
          <Box
            position="absolute"
            top="-50px"
            right="-50px"
            w="150px"
            h="150px"
            bg="purple.100"
            borderRadius="full"
            opacity={0.5}
          />
          <Box
            position="absolute"
            bottom="-30px"
            left="-30px"
            w="100px"
            h="100px"
            bg="blue.100"
            borderRadius="full"
            opacity={0.5}
          />

          <VStack spacing={6} position="relative">
            <VStack spacing={2}>
              <Heading
                size="xl"
                bgGradient="linear(to-r, purple.600, blue.500)"
                bgClip="text"
                fontWeight="extrabold"
              >
                Let's Markdown
              </Heading>
              <Text color="gray.500" fontSize="sm">
                Collaborate. Write. Publish.
              </Text>
            </VStack>

            <Button
              w="full"
              size="lg"
              variant="outline"
              leftIcon={<Icon as={FcGoogle} boxSize={5} />}
              onClick={handleGoogleSignIn}
              isLoading={loading}
              _hover={{ bg: "gray.50" }}
            >
              Continue with Google
            </Button>

            <HStack w="full">
              <Divider />
              <Text fontSize="sm" color="gray.400" whiteSpace="nowrap" px={3}>
                or continue with email
              </Text>
              <Divider />
            </HStack>

            <form onSubmit={handleSubmit} style={{ width: "100%" }}>
              <VStack spacing={4}>
                {!isLogin && (
                  <FormControl isRequired>
                    <FormLabel fontSize="sm" color="gray.600">
                      Full Name
                    </FormLabel>
                    <Input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="John Doe"
                      size="lg"
                      borderRadius="xl"
                      _focus={{
                        borderColor: "purple.500",
                        boxShadow: "0 0 0 1px var(--chakra-colors-purple-500)",
                      }}
                    />
                  </FormControl>
                )}

                <FormControl isRequired>
                  <FormLabel fontSize="sm" color="gray.600">
                    Email
                  </FormLabel>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    size="lg"
                    borderRadius="xl"
                    _focus={{
                      borderColor: "purple.500",
                      boxShadow: "0 0 0 1px var(--chakra-colors-purple-500)",
                    }}
                  />
                </FormControl>

                <FormControl isRequired>
                  <FormLabel fontSize="sm" color="gray.600">
                    Password
                  </FormLabel>
                  <InputGroup>
                    <Input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      size="lg"
                      borderRadius="xl"
                      _focus={{
                        borderColor: "purple.500",
                        boxShadow: "0 0 0 1px var(--chakra-colors-purple-500)",
                      }}
                    />
                    <InputRightElement h="full">
                      <IconButton
                        aria-label={showPassword ? "Hide password" : "Show password"}
                        icon={showPassword ? <VscEyeClosed /> : <VscEye />}
                        variant="ghost"
                        onClick={() => setShowPassword(!showPassword)}
                        size="sm"
                      />
                    </InputRightElement>
                  </InputGroup>
                </FormControl>

                <Button
                  type="submit"
                  w="full"
                  size="lg"
                  bgGradient="linear(to-r, purple.500, blue.500)"
                  color="white"
                  _hover={{
                    bgGradient: "linear(to-r, purple.600, blue.600)",
                    transform: "translateY(-1px)",
                    boxShadow: "lg",
                  }}
                  _active={{
                    transform: "translateY(0)",
                  }}
                  isLoading={loading}
                  borderRadius="xl"
                  transition="all 0.2s"
                >
                  {isLogin ? "Sign In" : "Create Account"}
                </Button>
              </VStack>
            </form>

            <HStack spacing={1}>
              <Text fontSize="sm" color="gray.500">
                {isLogin ? "Don't have an account?" : "Already have an account?"}
              </Text>
              <Button
                variant="link"
                size="sm"
                color="purple.500"
                fontWeight="semibold"
                onClick={() => setIsLogin(!isLogin)}
              >
                {isLogin ? "Sign up" : "Sign in"}
              </Button>
            </HStack>
          </VStack>
        </Box>
      </Container>
    </Box>
  );
}
