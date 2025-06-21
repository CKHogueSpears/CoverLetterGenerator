import { Card, CardContent } from "@/components/ui/card";
import { Bot } from "lucide-react";

const agents = [
  { name: "ATS Keywords", model: "GPT-4o", status: "ready" },
  { name: "Requirements", model: "GPT-4o", status: "ready" },
  { name: "Style Guide", model: "Cache", status: "ready" },
  { name: "Resume", model: "Cache", status: "ready" },
  { name: "Opening Hook", model: "GPT-4o", status: "ready" },
  { name: "Alignment", model: "GPT-4o", status: "ready" },
  { name: "Why Company", model: "GPT-4o", status: "ready" },
  { name: "Leadership", model: "GPT-4o", status: "ready" },
  { name: "Value Props", model: "GPT-4o", status: "ready" },
  { name: "Public Sector", model: "GPT-4o", status: "ready" },
  { name: "Closing", model: "GPT-4o", status: "ready" },
  { name: "Resume Validation", model: "Semantic", status: "ready" },
  { name: "Coherence", model: "Claude", status: "ready" },
  { name: "Word Count", model: "Validator", status: "ready" },
];

interface AgentStatusProps {
  activeAgents?: string[];
}

export default function AgentStatus({ activeAgents = [] }: AgentStatusProps) {
  const getAgentStatus = (agentName: string) => {
    if (activeAgents.includes(agentName.toLowerCase().replace(" ", "_"))) {
      return "active";
    }
    return "ready";
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active": return "bg-warning";
      case "ready": return "bg-success";
      default: return "bg-gray-400";
    }
  };

  return (
    <Card className="bg-white rounded-xl shadow-sm border border-gray-200">
      <CardContent className="p-6">
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
            <Bot className="text-primary w-4 h-4" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900">Agent Status</h3>
        </div>

        <div className="space-y-3">
          {agents.map((agent) => {
            const status = getAgentStatus(agent.name);
            return (
              <div key={agent.name} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className={`w-2 h-2 rounded-full ${getStatusColor(status)} ${status === "active" ? "animate-pulse" : ""}`}></div>
                  <span className="text-sm font-medium text-gray-900">{agent.name}</span>
                </div>
                <span className="text-xs text-gray-500">{agent.model}</span>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
