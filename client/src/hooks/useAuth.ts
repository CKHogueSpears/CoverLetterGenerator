import { useQuery } from "@tanstack/react-query";

export function useAuth() {
  // Check for demo mode in localStorage
  const isDemoMode = localStorage.getItem('demoMode') === 'true';
  
  const { data: user, isLoading, error } = useQuery({
    queryKey: ["/api/auth/user"],
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: !isDemoMode, // Don't query if in demo mode
  });

  // Create demo user object
  const demoUser = {
    id: 1,
    username: "demo_user",
    email: "demo@example.com",
    firstName: "Demo",
    lastName: "User",
    profileImageUrl: null
  };

  return {
    user: isDemoMode ? demoUser : user,
    isLoading: isDemoMode ? false : isLoading,
    isAuthenticated: isDemoMode || (!!user && !error),
    error: isDemoMode ? null : error,
    isDemoMode
  };
}