import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { CloudUpload, FileText, File, CheckCircle, Trash2 } from "lucide-react";

export default function DocumentUpload() {
  const [isDragging, setIsDragging] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: documents = [] } = useQuery({
    queryKey: ["/api/documents"],
  });

  const uploadMutation = useMutation({
    mutationFn: async ({ file, type }: { file: File; type: string }) => {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", type);

      const response = await fetch("/api/documents/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message);
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
      toast({
        title: "Success",
        description: "Document uploaded successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Upload Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (documentId: number) => {
      const response = await fetch(`/api/documents/${documentId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to delete document");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
      toast({
        title: "Success",
        description: "Document deleted successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Delete Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleFileUpload = (files: File[], type: string) => {
    files.forEach(file => {
      uploadMutation.mutate({ file, type });
    });
  };

  const handleDrop = (e: React.DragEvent, type: string) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileUpload(files, type);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, type: string) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      handleFileUpload(files, type);
    }
  };

  const styleGuides = Array.isArray(documents) ? documents.filter((doc: any) => doc.type === "style_guide") : [];
  const resumes = Array.isArray(documents) ? documents.filter((doc: any) => doc.type === "resume") : [];

  return (
    <Card className="bg-white rounded-xl shadow-sm border border-gray-200">
      <CardContent className="p-6">
        <div className="flex items-center space-x-3 mb-6">
          <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
            <CloudUpload className="text-primary w-4 h-4" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Document Upload</h3>
            <p className="text-sm text-secondary">Upload your style guide and resume</p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4 mb-6">
          {/* Style Guide Upload */}
          <div 
            className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer ${
              isDragging ? "border-primary/50 bg-primary/5" : "border-gray-300 hover:border-primary/50"
            }`}
            onDrop={(e) => handleDrop(e, "style_guide")}
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
          >
            <div className="flex flex-col items-center space-y-3">
              <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                <FileText className="text-primary w-6 h-6" />
              </div>
              <div>
                <p className="font-medium text-gray-900">Style Guide</p>
                <p className="text-sm text-secondary">Upload .docx file</p>
              </div>
              <input
                type="file"
                accept=".docx,.txt"
                multiple
                onChange={(e) => handleFileSelect(e, "style_guide")}
                className="hidden"
                id="style-guide-upload"
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => document.getElementById("style-guide-upload")?.click()}
                disabled={uploadMutation.isPending}
              >
                {uploadMutation.isPending ? "Uploading..." : "Choose File"}
              </Button>
            </div>
          </div>

          {/* Resume Upload */}
          <div 
            className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer ${
              isDragging ? "border-primary/50 bg-primary/5" : "border-gray-300 hover:border-primary/50"
            }`}
            onDrop={(e) => handleDrop(e, "resume")}
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
          >
            <div className="flex flex-col items-center space-y-3">
              <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                <File className="text-red-500 w-6 h-6" />
              </div>
              <div>
                <p className="font-medium text-gray-900">Resume</p>
                <p className="text-sm text-secondary">Upload .docx or .pdf</p>
              </div>
              <input
                type="file"
                accept=".docx,.pdf,.txt"
                multiple
                onChange={(e) => handleFileSelect(e, "resume")}
                className="hidden"
                id="resume-upload"
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => document.getElementById("resume-upload")?.click()}
                disabled={uploadMutation.isPending}
              >
                {uploadMutation.isPending ? "Uploading..." : "Choose File"}
              </Button>
            </div>
          </div>
        </div>

        {/* Upload Status */}
        <div className="space-y-2">
          {styleGuides.length > 0 && (
            <div className="space-y-1">
              <h4 className="text-sm font-medium text-gray-700">Style Guides ({styleGuides.length})</h4>
              {styleGuides.map((doc: any) => (
                <div key={doc.id} className="flex items-center justify-between p-3 bg-success/5 border border-success/20 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <CheckCircle className="text-success w-4 h-4" />
                    <span className="text-sm font-medium text-gray-900">{doc.filename}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs text-success font-medium">Uploaded</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteMutation.mutate(doc.id)}
                      disabled={deleteMutation.isPending}
                      className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
          {resumes.length > 0 && (
            <div className="space-y-1">
              <h4 className="text-sm font-medium text-gray-700">Resumes ({resumes.length})</h4>
              {resumes.map((doc: any) => (
                <div key={doc.id} className="flex items-center justify-between p-3 bg-success/5 border border-success/20 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <CheckCircle className="text-success w-4 h-4" />
                    <span className="text-sm font-medium text-gray-900">{doc.filename}</span>
                  </div>
                  <span className="text-xs text-success font-medium">Uploaded</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
