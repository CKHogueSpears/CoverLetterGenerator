import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { CoverLetterPipeline } from "./pipeline";
import { extractDocumentContent, validateFileType, createDocxFromContent } from "./documentProcessor";
import { insertDocumentSchema, insertJobDescriptionSchema, insertCoverLetterSchema, insertPipelineRunSchema } from "@shared/schema";
import { invalidateUserCaches, prewarmCaches } from "./cache";
import { setupGoogleAuth, isAuthenticated } from "./googleAuth";
import multer from "multer";
import { z } from "zod";

const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Set up Google OAuth authentication
  await setupGoogleAuth(app);

  // Authentication routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  const httpServer = createServer(app);

  // Mock user for demo purposes (in production, use proper authentication)
  const DEFAULT_USER_ID = 1;

  // Ensure default user exists
  app.use(async (req, res, next) => {
    try {
      let user = await storage.getUser(DEFAULT_USER_ID);
      if (!user) {
        user = await storage.createUser({
          username: "demo_user",
          password: "password123"
        });
      }
      next();
    } catch (error) {
      next(error);
    }
  });

  // Upload documents (style guide or resume)
  app.post("/api/documents/upload", upload.single("file"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const { type } = req.body;
      if (!type || !["style_guide", "resume"].includes(type)) {
        return res.status(400).json({ message: "Invalid document type" });
      }

      // Validate file type
      const allowedTypes = type === "style_guide" ? ["docx", "txt"] : ["docx", "pdf", "txt"];
      if (!validateFileType(req.file.originalname, allowedTypes)) {
        return res.status(400).json({ message: `Invalid file type for ${type}` });
      }

      // Extract content
      const content = await extractDocumentContent(req.file.buffer, req.file.originalname);

      // Save to database
      const document = await storage.createDocument({
        userId: DEFAULT_USER_ID,
        type,
        filename: req.file.originalname,
        content,
      });

      // Invalidate caches when new documents are uploaded
      invalidateUserCaches(DEFAULT_USER_ID);

      res.json(document);
    } catch (error) {
      console.error("Upload error:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Get uploaded documents
  app.get("/api/documents", async (req, res) => {
    try {
      const documents = await storage.getDocumentsByUserId(DEFAULT_USER_ID);
      res.json(documents);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });

  // Delete document
  app.delete("/api/documents/:id", async (req, res) => {
    try {
      const documentId = parseInt(req.params.id);
      await storage.deleteDocument(documentId);
      res.json({ message: "Document deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });

  // Create job description with ATS analysis
  app.post("/api/job-descriptions", async (req, res) => {
    try {
      const validatedData = insertJobDescriptionSchema.parse({
        ...req.body,
        userId: DEFAULT_USER_ID,
      });

      const jobDescription = await storage.createJobDescription(validatedData);
      res.json(jobDescription);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: error.message });
    }
  });

  // Get job descriptions
  app.get("/api/job-descriptions", async (req, res) => {
    try {
      const jobDescriptions = await storage.getJobDescriptionsByUserId(DEFAULT_USER_ID);
      res.json(jobDescriptions);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });

  // Generate cover letter
  app.post("/api/cover-letters/generate", async (req, res) => {
    try {
      const { jobDescriptionId } = req.body;

      if (!jobDescriptionId) {
        return res.status(400).json({ message: "Job description ID is required" });
      }

      // Create cover letter record
      const coverLetter = await storage.createCoverLetter({
        userId: DEFAULT_USER_ID,
        jobDescriptionId,
        content: null,
        qualityScore: 0,
        atsScore: 0,
        styleScore: 0,
        clarityScore: 0,
        impactScore: 0,
        status: "draft",
        iterations: 0,
      });

      // Create pipeline run
      const pipelineRun = await storage.createPipelineRun({
        coverLetterId: coverLetter.id,
        currentStep: "Initializing",
        progress: 0,
        status: "running",
        agentLogs: {},
      });

      // Start pipeline in background
      const pipeline = new CoverLetterPipeline(coverLetter.id);
      pipeline.execute().catch(console.error);

      res.json({ 
        coverLetterId: coverLetter.id,
        pipelineRunId: pipelineRun.id,
        message: "Cover letter generation started"
      });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });

  // Get cover letter status
  app.get("/api/cover-letters/:id/status", async (req, res) => {
    try {
      const coverLetterId = parseInt(req.params.id);
      const coverLetter = await storage.getCoverLetter(coverLetterId);
      const pipelineRun = await storage.getPipelineRunByCoverLetterId(coverLetterId);

      if (!coverLetter) {
        return res.status(404).json({ message: "Cover letter not found" });
      }

      res.json({
        coverLetter,
        pipelineRun,
      });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });

  // Get cover letters
  app.get("/api/cover-letters", async (req, res) => {
    try {
      const coverLetters = await storage.getCoverLettersByUserId(DEFAULT_USER_ID);
      res.json(coverLetters);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });

  // Download cover letter
  app.get("/api/cover-letters/:id/download", async (req, res) => {
    try {
      const coverLetterId = parseInt(req.params.id);
      const coverLetter = await storage.getCoverLetter(coverLetterId);

      if (!coverLetter || !coverLetter.content) {
        return res.status(404).json({ message: "Cover letter not found or not generated" });
      }

      // Debug: Log the content being passed to document creation
      console.log("🖋️ Cover Letter content type:", typeof coverLetter.content);
      console.log("🖋️ Cover Letter content preview:", JSON.stringify(coverLetter.content).slice(0, 200), "...");
      
      // Handle content whether it's string or object
      let parsedContent = coverLetter.content;
      if (typeof coverLetter.content === 'string') {
        try {
          parsedContent = JSON.parse(coverLetter.content);
          console.log("🖋️ Successfully parsed JSON content. Keys:", Object.keys(parsedContent));
        } catch (e) {
          console.log("🖋️ Content is not JSON, using as-is");
          parsedContent = coverLetter.content;
        }
      } else {
        console.log("🖋️ Content is already an object. Keys:", Object.keys(parsedContent || {}));
      }

      console.log("🔍 About to generate document with content keys:", Object.keys(parsedContent || {}));
      
      const docxBuffer = await createDocxFromContent(parsedContent);
      
      console.log("✅ Document generated, buffer size:", docxBuffer?.length || 0, "bytes");
      
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      res.setHeader('Content-Disposition', `attachment; filename="cover_letter_${coverLetterId}.docx"`);
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.send(docxBuffer);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });

  // Stop cover letter generation route
  app.post("/api/cover-letters/:id/stop", async (req, res) => {
    try {
      const coverLetterId = parseInt(req.params.id);
      const coverLetter = await storage.getCoverLetter(coverLetterId);
      
      if (!coverLetter) {
        return res.status(404).json({ error: "Cover letter not found" });
      }

      if (coverLetter.status === "completed" || coverLetter.status === "failed") {
        return res.status(400).json({ error: "Cover letter generation already finished" });
      }

      // Update cover letter status to failed/stopped
      await storage.updateCoverLetter(coverLetterId, {
        status: "failed"
      });

      // Update pipeline run status if exists
      const pipelineRun = await storage.getPipelineRunByCoverLetterId(coverLetterId);
      if (pipelineRun) {
        await storage.updatePipelineRun(pipelineRun.id, {
          status: "stopped",
          completedAt: new Date()
        });
      }

      res.json({ success: true, message: "Cover letter generation stopped" });
    } catch (error: any) {
      console.error("Stop generation error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Debug endpoint to inspect raw content
  app.get("/debug/coverletter/:id/raw", async (req, res) => {
    try {
      const coverLetterId = parseInt(req.params.id);
      const coverLetter = await storage.getCoverLetter(coverLetterId);

      console.log(`🕵️‍♂️ Debug CoverLetter #${coverLetterId} Raw Content:`, coverLetter?.content);
      console.log(`🕵️‍♂️ Content type:`, typeof coverLetter?.content);
      console.log(`🕵️‍♂️ Content length:`, coverLetter?.content?.length || 0);

      if (!coverLetter) {
        return res.status(404).json({ error: 'Cover letter not found' });
      }

      return res.json({ 
        id: coverLetterId, 
        raw: coverLetter.content,
        type: typeof coverLetter.content,
        length: coverLetter.content?.length || 0,
        status: coverLetter.status,
        qualityScore: coverLetter.qualityScore
      });
    } catch (error: any) {
      console.error("Debug endpoint error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  return httpServer;
}
