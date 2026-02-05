import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Box, Spinner, Text, VStack } from "@chakra-ui/react";
import { supabase } from "../../lib/supabase";

export default function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    const handleCallback = async () => {
      const { error } = await supabase.auth.getSession();
      
      if (error) {
        console.error("Auth callback error:", error);
        navigate("/auth?error=callback_failed");
      } else {
        navigate("/dashboard");
      }
    };

    handleCallback();
  }, [navigate]);

  return (
    <Box
      minH="100vh"
      display="flex"
      alignItems="center"
      justifyContent="center"
      bgGradient="linear(to-br, #0f0c29, #302b63, #24243e)"
    >
      <VStack spacing={4}>
        <Spinner size="xl" color="white" thickness="4px" />
        <Text color="white" fontSize="lg">
          Completing sign in...
        </Text>
      </VStack>
    </Box>
  );
}
