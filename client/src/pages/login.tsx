import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Chrome } from "lucide-react";

export default function Login() {
  const handleGoogleLogin = () => {
    window.location.href = "/auth/google";
  };

  const handleDemoLogin = () => {
    localStorage.setItem('demoMode', 'true');
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-gray-900">
            Welcome Back
          </CardTitle>
          <CardDescription className="text-gray-600">
            Sign in to access your cover letter generator
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button 
            onClick={handleGoogleLogin}
            className="w-full flex items-center justify-center gap-3 bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
            variant="outline"
          >
            <Chrome className="w-5 h-5 text-blue-500" />
            Sign in with Google
          </Button>
          
          <div className="text-center text-sm text-gray-400">
            OAuth settings propagating... 
          </div>
          
          <Button 
            onClick={handleDemoLogin}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white"
          >
            Continue as Demo User
          </Button>
          
          <div className="text-center text-xs text-gray-500">
            Use demo mode while Google OAuth settings update
          </div>
        </CardContent>
      </Card>
    </div>
  );
}