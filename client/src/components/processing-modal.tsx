import { useEffect, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Settings, StopCircle } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface ProcessingModalProps {
  coverLetterId: number;
  onComplete: () => void;
}

interface StatusResponse {
  coverLetter?: {
    status: string;
  };
  pipelineRun?: {
    currentStep: string;
    progress: number;
    status: string;
  };
}

export default function ProcessingModal({ coverLetterId, onComplete }: ProcessingModalProps) {
  const [isOpen, setIsOpen] = useState(true);

  const { data: status, refetch } = useQuery<StatusResponse>({
    queryKey: [`/api/cover-letters/${coverLetterId}/status`],
    refetchInterval: 2000, // Poll every 2 seconds
    enabled: isOpen,
  });

  const stopGenerationMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/cover-letters/${coverLetterId}/stop`, {
        method: "POST",
      });
      if (!response.ok) throw new Error("Failed to stop generation");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [`/api/cover-letters/${coverLetterId}/status`],
      });
      setIsOpen(false);
      onComplete();
    },
  });

  useEffect(() => {
    if (status?.coverLetter?.status === "completed" || status?.coverLetter?.status === "failed") {
      setIsOpen(false);
      onComplete();
    }
  }, [status, onComplete]);

  const currentStep = status?.pipelineRun?.currentStep || "Initializing";
  const progress = status?.pipelineRun?.progress || 0;
  const pipelineStatus = status?.pipelineRun?.status || "running";

  const getEstimatedTime = (progress: number) => {
    if (progress < 25) return "~45 seconds";
    if (progress < 50) return "~30 seconds";
    if (progress < 75) return "~15 seconds";
    return "~5 seconds";
  };

  const getStepDescription = (step: string) => {
    const descriptions: Record<string, string> = {
      "Extracting ATS Keywords": "Analyzing job requirements and extracting key terms",
      "Loading Style Guide": "Reading your style guide and resume",
      "Analyzing Requirements": "Mapping your experience to job requirements", 
      "Generating sections in parallel": "Creating all cover letter sections simultaneously",
      "Validating word count": "Ensuring content meets length requirements",
      "Finalizing Document": "Preparing your professional cover letter",
    };
    return descriptions[step] || "Processing your cover letter";
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent className="max-w-md w-full mx-4">
        <DialogTitle className="text-lg font-semibold text-gray-900 mb-2 text-center">
          {pipelineStatus === "failed" ? "Generation Failed" : "Generating Cover Letter"}
        </DialogTitle>
        
        <DialogDescription className="text-sm text-secondary mb-6 text-center">
          {pipelineStatus === "failed" 
            ? "There was an error generating your cover letter. Please try again."
            : "Our AI agents are working on your personalized cover letter..."
          }
        </DialogDescription>
        
        <div className="text-center">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <div className="animate-spin">
              <Settings className="text-primary w-8 h-8" />
            </div>
          </div>
          
          {pipelineStatus !== "failed" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-900">Current Step:</span>
                <span className="text-primary font-medium">{currentStep}</span>
              </div>
              
              <Progress value={progress} className="h-2" />
              
              <div className="flex items-center justify-between text-xs text-secondary">
                <span>{getStepDescription(currentStep)}</span>
                <span>{getEstimatedTime(progress)} remaining</span>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => stopGenerationMutation.mutate()}
                disabled={stopGenerationMutation.isPending}
                className="w-full mt-4"
              >
                <StopCircle className="w-4 h-4 mr-2" />
                {stopGenerationMutation.isPending ? "Stopping..." : "Stop Generation"}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
