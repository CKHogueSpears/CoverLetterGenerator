import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, AlertTriangle, Eye, EyeOff } from "lucide-react";

interface ValidationDetailsProps {
  coverLetterId: number;
}

export default function ValidationDetails({ coverLetterId }: ValidationDetailsProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const { data: validation } = useQuery({
    queryKey: [`/api/cover-letters/${coverLetterId}/validation`],
    enabled: isExpanded,
  });

  if (!validation) {
    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsExpanded(!isExpanded)}
        className="text-xs"
      >
        {isExpanded ? <EyeOff className="w-3 h-3 mr-1" /> : <Eye className="w-3 h-3 mr-1" />}
        View Details
      </Button>
    );
  }

  const { validationScore, validationResult } = validation;

  const getScoreColor = (score: number) => {
    if (score >= 90) return "text-green-600";
    if (score >= 70) return "text-yellow-600";
    return "text-red-600";
  };

  return (
    <div className="space-y-2">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsExpanded(!isExpanded)}
        className="text-xs"
      >
        {isExpanded ? <EyeOff className="w-3 h-3 mr-1" /> : <Eye className="w-3 h-3 mr-1" />}
        Validation Details
      </Button>

      {isExpanded && validationResult && (
        <Card className="mt-2">
          <CardContent className="p-3 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium">Resume Accuracy</span>
              <span className={`text-xs font-bold ${getScoreColor(validationScore)}`}>
                {validationScore}%
              </span>
            </div>

            {validationResult.corrections?.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center text-xs text-yellow-700">
                  <AlertTriangle className="w-3 h-3 mr-1" />
                  {validationResult.corrections.length} corrections made
                </div>
                {validationResult.corrections.slice(0, 2).map((correction: any, idx: number) => (
                  <div key={idx} className="text-xs bg-yellow-50 p-2 rounded border-l-2 border-yellow-300">
                    <div className="font-medium text-yellow-800">Corrected:</div>
                    <div className="text-yellow-700 mt-1">{correction.reason}</div>
                  </div>
                ))}
              </div>
            )}

            {validationResult.flaggedClaims?.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center text-xs text-red-700">
                  <XCircle className="w-3 h-3 mr-1" />
                  {validationResult.flaggedClaims.length} issues flagged
                </div>
                {validationResult.flaggedClaims.slice(0, 2).map((claim: string, idx: number) => (
                  <div key={idx} className="text-xs bg-red-50 p-2 rounded border-l-2 border-red-300">
                    <div className="text-red-700">{claim}</div>
                  </div>
                ))}
              </div>
            )}

            {validationResult.supportedClaims?.length > 0 && (
              <div className="flex items-center text-xs text-green-700">
                <CheckCircle className="w-3 h-3 mr-1" />
                {validationResult.supportedClaims.length} claims verified
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}