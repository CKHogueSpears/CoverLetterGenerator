import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { Card, CardContent } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Briefcase, Tags } from "lucide-react";

const jobDescriptionSchema = z.object({
  title: z.string().min(1, "Job title is required"),
  company: z.string().min(1, "Company name is required"),
  content: z.string().min(50, "Job description must be at least 50 characters"),
});

type JobDescriptionForm = z.infer<typeof jobDescriptionSchema>;

export default function JobDescriptionForm() {
  const [extractedKeywords, setExtractedKeywords] = useState<string[]>([]);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: jobDescriptions } = useQuery({
    queryKey: ["/api/job-descriptions"],
  });

  const form = useForm<JobDescriptionForm>({
    resolver: zodResolver(jobDescriptionSchema),
    defaultValues: {
      title: "",
      company: "",
      content: "",
    },
  });

  const createJobDescriptionMutation = useMutation({
    mutationFn: async (data: JobDescriptionForm) => {
      const response = await fetch("/api/job-descriptions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message);
      }

      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/job-descriptions"] });
      if (data.atsKeywords) {
        setExtractedKeywords(data.atsKeywords);
      }
      toast({
        title: "Success",
        description: "Job description saved successfully",
      });
      form.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Mock ATS keyword extraction for preview
  useEffect(() => {
    const content = form.watch("content");
    if (content && content.length > 100) {
      // Simple keyword extraction for demo
      const keywords = content
        .toLowerCase()
        .match(/\b(?:react|typescript|javascript|node\.js|python|java|aws|docker|kubernetes|agile|scrum|leadership|team|api|database|sql|nosql|git|ci\/cd)\b/g);
      
      if (keywords) {
        const uniqueKeywords = Array.from(new Set(keywords)).slice(0, 8);
        setExtractedKeywords(uniqueKeywords);
      }
    }
  }, [form.watch("content")]);

  const onSubmit = (data: JobDescriptionForm) => {
    createJobDescriptionMutation.mutate(data);
  };

  const latestJobDescription = jobDescriptions?.[0];

  return (
    <Card className="bg-white rounded-xl shadow-sm border border-gray-200">
      <CardContent className="p-6">
        <div className="flex items-center space-x-3 mb-6">
          <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
            <Briefcase className="text-primary w-4 h-4" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Job Description</h3>
            <p className="text-sm text-secondary">Paste the job posting you're applying for</p>
          </div>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium text-gray-900">Job Title</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Senior Software Engineer"
                      {...field}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="company"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium text-gray-900">Company</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="TechCorp Inc."
                      {...field}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="content"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium text-gray-900">Job Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Paste the complete job description here..."
                      rows={8}
                      {...field}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* ATS Keywords Preview */}
            {extractedKeywords.length > 0 && (
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-3">
                  <Tags className="text-primary w-4 h-4" />
                  <span className="text-sm font-medium text-gray-900">Detected ATS Keywords</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {extractedKeywords.map((keyword, index) => (
                    <Badge key={index} variant="secondary" className="px-2 py-1 bg-primary/10 text-primary text-xs rounded-full">
                      {keyword}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end">
              <Button
                type="submit"
                disabled={createJobDescriptionMutation.isPending}
                className="bg-primary text-white hover:bg-primary/90"
              >
                {createJobDescriptionMutation.isPending ? "Saving..." : "Save Job Description"}
              </Button>
            </div>
          </form>
        </Form>

        {/* Show current job description if exists */}
        {latestJobDescription && (
          <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <h4 className="font-medium text-green-900 mb-2">Current Job Description</h4>
            <p className="text-sm text-green-800">
              <strong>{latestJobDescription.title}</strong> at <strong>{latestJobDescription.company}</strong>
            </p>
            {latestJobDescription.atsKeywords && latestJobDescription.atsKeywords.length > 0 && (
              <div className="mt-2">
                <p className="text-xs text-green-700 mb-1">ATS Keywords:</p>
                <div className="flex flex-wrap gap-1">
                  {latestJobDescription.atsKeywords.map((keyword: string, index: number) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      {keyword}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
