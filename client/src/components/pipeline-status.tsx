import { Card, CardContent } from "@/components/ui/card";
import { 
  CheckCircle, 
  Upload, 
  Edit, 
  Settings, 
  RotateCcw, 
  Search, 
  Download, 
  Brain,
  Circle
} from "lucide-react";

const pipelineSteps = [
  { id: "initialize", name: "Initialize", icon: CheckCircle },
  { id: "load", name: "Load Data", icon: Upload },
  { id: "draft", name: "Draft", icon: Edit },
  { id: "process", name: "Process", icon: Settings },
  { id: "review", name: "Review", icon: RotateCcw },
  { id: "quality", name: "Quality Check", icon: Search },
  { id: "format", name: "Format", icon: Download },
  { id: "learn", name: "Learn", icon: Brain },
];

interface PipelineStatusProps {
  currentStep?: string;
  progress?: number;
  status?: "ready" | "running" | "completed" | "failed";
}

export default function PipelineStatus({ 
  currentStep = "ready", 
  progress = 0, 
  status = "ready" 
}: PipelineStatusProps) {
  const getStepStatus = (stepId: string) => {
    if (status === "ready") return "pending";
    if (status === "failed") return "failed";
    
    const stepIndex = pipelineSteps.findIndex(step => step.id === stepId);
    const currentStepIndex = pipelineSteps.findIndex(step => step.name.toLowerCase().includes(currentStep.toLowerCase()));
    
    if (stepIndex < currentStepIndex) return "completed";
    if (stepIndex === currentStepIndex) return "active";
    return "pending";
  };

  const getStatusColor = () => {
    switch (status) {
      case "running": return "text-warning";
      case "completed": return "text-success";
      case "failed": return "text-error";
      default: return "text-success";
    }
  };

  const getStatusText = () => {
    switch (status) {
      case "running": return "Processing...";
      case "completed": return "Completed";
      case "failed": return "Failed";
      default: return "Ready to Generate";
    }
  };

  return (
    <div className="mb-8">
      <Card className="bg-white rounded-xl shadow-sm border border-gray-200">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Pipeline Status</h2>
            <div className="flex items-center space-x-2">
              <div className={`w-3 h-3 rounded-full ${status === "running" ? "animate-pulse bg-warning" : "bg-success"}`}></div>
              <span className={`text-sm ${getStatusColor()}`}>{getStatusText()}</span>
            </div>
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-4">
            {pipelineSteps.map((step) => {
              const stepStatus = getStepStatus(step.id);
              const Icon = step.icon;
              
              return (
                <div key={step.id} className="flex flex-col items-center space-y-2">
                  <div 
                    className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                      stepStatus === "completed" 
                        ? "bg-success text-white" 
                        : stepStatus === "active"
                        ? "bg-warning text-white animate-pulse"
                        : stepStatus === "failed"
                        ? "bg-error text-white"
                        : "bg-gray-100"
                    }`}
                  >
                    {stepStatus === "completed" ? (
                      <CheckCircle className="w-4 h-4" />
                    ) : stepStatus === "active" ? (
                      <Icon className="w-4 h-4" />
                    ) : stepStatus === "failed" ? (
                      <Circle className="w-4 h-4" />
                    ) : (
                      <Icon className="w-4 h-4 text-gray-400" />
                    )}
                  </div>
                  <span className="text-xs text-secondary text-center">{step.name}</span>
                </div>
              );
            })}
          </div>

          {status === "running" && progress > 0 && (
            <div className="mt-4">
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-primary h-2 rounded-full transition-all duration-500" 
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
              <div className="flex justify-between text-xs text-secondary mt-1">
                <span>{currentStep}</span>
                <span>{progress}%</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
