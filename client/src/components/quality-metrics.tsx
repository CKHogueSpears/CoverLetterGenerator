import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { TrendingUp } from "lucide-react";

interface QualityMetricsProps {
  metrics?: {
    atsCompliance?: number;
    styleAdherence?: number;
    contentClarity?: number;
    impactScore?: number;
    overallScore?: number;
  };
}

export default function QualityMetrics({ metrics }: QualityMetricsProps) {
  const defaultMetrics = {
    atsCompliance: 0,
    styleAdherence: 0,
    contentClarity: 0,
    impactScore: 0,
    overallScore: 0,
  };

  const currentMetrics = { ...defaultMetrics, ...metrics };

  const getScoreColor = (score: number) => {
    if (score >= 95) return "text-success";
    if (score >= 90) return "text-warning";
    return "text-gray-500";
  };

  const getProgressColor = (score: number) => {
    if (score >= 95) return "bg-success";
    if (score >= 90) return "bg-warning";
    return "bg-gray-400";
  };

  return (
    <Card className="bg-white rounded-xl shadow-sm border border-gray-200">
      <CardContent className="p-6">
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-8 h-8 bg-success/10 rounded-lg flex items-center justify-center">
            <TrendingUp className="text-success w-4 h-4" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900">Quality Metrics</h3>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className={`w-3 h-3 rounded-full ${getProgressColor(currentMetrics.atsCompliance)}`}></div>
              <span className="text-sm font-medium text-gray-900">ATS Compliance</span>
            </div>
            <span className={`text-sm font-semibold ${getScoreColor(currentMetrics.atsCompliance)}`}>
              {currentMetrics.atsCompliance > 0 ? `${currentMetrics.atsCompliance}%` : "--"}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className={`w-3 h-3 rounded-full ${getProgressColor(currentMetrics.styleAdherence)}`}></div>
              <span className="text-sm font-medium text-gray-900">Style Adherence</span>
            </div>
            <span className={`text-sm font-semibold ${getScoreColor(currentMetrics.styleAdherence)}`}>
              {currentMetrics.styleAdherence > 0 ? `${currentMetrics.styleAdherence}%` : "--"}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className={`w-3 h-3 rounded-full ${getProgressColor(currentMetrics.contentClarity)}`}></div>
              <span className="text-sm font-medium text-gray-900">Content Clarity</span>
            </div>
            <span className={`text-sm font-semibold ${getScoreColor(currentMetrics.contentClarity)}`}>
              {currentMetrics.contentClarity > 0 ? `${currentMetrics.contentClarity}%` : "--"}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className={`w-3 h-3 rounded-full ${getProgressColor(currentMetrics.impactScore)}`}></div>
              <span className="text-sm font-medium text-gray-900">Impact Score</span>
            </div>
            <span className={`text-sm font-semibold ${getScoreColor(currentMetrics.impactScore)}`}>
              {currentMetrics.impactScore > 0 ? `${currentMetrics.impactScore}%` : "--"}
            </span>
          </div>
          
          <div className="border-t border-gray-200 pt-4 mt-4">
            <div className="flex items-center justify-between">
              <span className="text-lg font-semibold text-gray-900">Overall Score</span>
              <span className={`text-lg font-bold ${getScoreColor(currentMetrics.overallScore)}`}>
                {currentMetrics.overallScore > 0 ? `${currentMetrics.overallScore}%` : "--"}
              </span>
            </div>
            {currentMetrics.overallScore > 0 && (
              <div className="mt-2">
                <Progress value={currentMetrics.overallScore} className="h-2" />
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
