import mammoth from "mammoth";
import { Document, Packer, Paragraph, TextRun } from 'docx';
import Docxtemplater from 'docxtemplater';
import PizZip from 'pizzip';
import fs from 'fs';
import path from 'path';

export async function extractDocumentContent(buffer: Buffer, filename: string): Promise<string> {
  const extension = filename.toLowerCase().split('.').pop();
  
  switch (extension) {
    case 'docx':
      try {
        const result = await mammoth.extractRawText({ buffer });
        return result.value;
      } catch (error) {
        throw new Error(`Failed to process DOCX file: ${error.message}`);
      }
    
    case 'txt':
      return buffer.toString('utf-8');
    
    default:
      throw new Error(`Unsupported file type: ${extension}`);
  }
}

export function validateFileType(filename: string, allowedTypes: string[]): boolean {
  const extension = filename.toLowerCase().split('.').pop();
  return allowedTypes.includes(extension || '');
}

export function generateFileName(originalName: string, type: string): string {
  const timestamp = Date.now();
  const extension = originalName.split('.').pop();
  return `${type}_${timestamp}.${extension}`;
}

export async function createDocxFromContent(content: any): Promise<Buffer> {
  try {
    console.log("📄 Starting template-based document generation");
    
    // Create a simple template-based approach
    return await createTemplateBasedDocument(content);
    
  } catch (error) {
    console.log("📄 Template generation failed, falling back to basic document");
    // Fallback to basic document generation
    return await createBasicDocument(content);
  }
}

async function createTemplateBasedDocument(content: any): Promise<Buffer> {
  // Extract content data and map to new template structure
  let data: any = {
    HiringManagerOrTeamName: "Hiring Manager",
    OpeningHookParagraph: "",
    AlignmentParagraph: "",
    WhyCompanySentence: "",
    LeadershipParagraph: "",
    ValueProp1Title: "",
    ValueProp1Details: "",
    ValueProp2Title: "",
    ValueProp2Details: "",
    ValueProp3Title: "",
    ValueProp3Details: "",
    ValueProp4Title: "",
    ValueProp4Details: "",
    ValueProp5Title: "",
    ValueProp5Details: "",
    PublicSectorInterestParagraph: "",
    ClosingParagraph: "",
    CandidateFullName: "Collin A. Spears"
  };
  
  if (content && typeof content === 'object') {
    // Handle new template structure directly
    if (content.HiringManagerOrTeamName) {
      // New template format - use directly
      Object.assign(data, content);
    } else if (content.formatted_cover_letter) {
      // Legacy format - map to new template structure
      const formatted = content.formatted_cover_letter;
      
      data.HiringManagerOrTeamName = "Hiring Team";
      data.OpeningHookParagraph = formatted.opening_paragraph || "";
      data.ClosingParagraph = formatted.closing_paragraph || "";
      
      // Parse body paragraphs into template sections
      if (formatted.body_paragraphs && Array.isArray(formatted.body_paragraphs)) {
        data.AlignmentParagraph = formatted.body_paragraphs[0] || "";
        
        // Handle bullet points as value propositions
        if (formatted.body_paragraphs.length > 2 && Array.isArray(formatted.body_paragraphs[2])) {
          const bullets = formatted.body_paragraphs[2];
          if (bullets[0]) {
            const parts = bullets[0].split(': ');
            data.ValueProp1Title = parts[0] || "Strategic Compliance Leadership";
            data.ValueProp1Details = parts[1] || bullets[0];
          }
          if (bullets[1]) {
            const parts = bullets[1].split(': ');
            data.ValueProp2Title = parts[0] || "Risk Management";
            data.ValueProp2Details = parts[1] || bullets[1];
          }
          if (bullets[2]) {
            const parts = bullets[2].split(': ');
            data.ValueProp3Title = parts[0] || "Governance and Policy Development";
            data.ValueProp3Details = parts[1] || bullets[2];
          }
          if (bullets[3]) {
            const parts = bullets[3].split(': ');
            data.ValueProp4Title = parts[0] || "Team Leadership";
            data.ValueProp4Details = parts[1] || bullets[3];
          }
        }
        
        if (formatted.body_paragraphs.length > 3) {
          data.LeadershipParagraph = formatted.body_paragraphs[3] || "";
        }
      }
    }
  }

  // Create document using the new template structure
  const paragraphs: Paragraph[] = [];
  
  // Salutation
  paragraphs.push(new Paragraph({
    children: [new TextRun(`Dear ${data.HiringManagerOrTeamName},`)],
    spacing: { after: 240 }
  }));
  
  // Opening Hook
  if (data.OpeningHookParagraph) {
    paragraphs.push(new Paragraph({
      children: [new TextRun(data.OpeningHookParagraph)],
      spacing: { after: 240 }
    }));
  }
  
  // Alignment Paragraph
  if (data.AlignmentParagraph) {
    paragraphs.push(new Paragraph({
      children: [new TextRun(data.AlignmentParagraph)],
      spacing: { after: 240 }
    }));
  }
  
  // Why Company Sentence
  if (data.WhyCompanySentence) {
    paragraphs.push(new Paragraph({
      children: [new TextRun(data.WhyCompanySentence)],
      spacing: { after: 240 }
    }));
  }
  
  // Leadership Paragraph
  if (data.LeadershipParagraph) {
    paragraphs.push(new Paragraph({
      children: [new TextRun(data.LeadershipParagraph)],
      spacing: { after: 240 }
    }));
  }
  
  // Value Propositions Header
  paragraphs.push(new Paragraph({
    children: [new TextRun("I can immediately add value by:", { bold: true })],
    spacing: { after: 120 }
  }));
  
  // Value Propositions
  const valueProps = [
    { title: data.ValueProp1Title, details: data.ValueProp1Details },
    { title: data.ValueProp2Title, details: data.ValueProp2Details },
    { title: data.ValueProp3Title, details: data.ValueProp3Details },
    { title: data.ValueProp4Title, details: data.ValueProp4Details }
  ];
  
  valueProps.forEach(prop => {
    if (prop.title && prop.details) {
      paragraphs.push(new Paragraph({
        children: [
          new TextRun("• "),
          new TextRun(`${prop.title}: `, { bold: true }),
          new TextRun(prop.details)
        ],
        spacing: { after: 120 }
      }));
    }
  });
  
  // Public Sector Interest (if any)
  if (data.PublicSectorInterestParagraph) {
    paragraphs.push(new Paragraph({
      children: [new TextRun(data.PublicSectorInterestParagraph)],
      spacing: { after: 240 }
    }));
  }
  
  // Closing Paragraph
  if (data.ClosingParagraph) {
    paragraphs.push(new Paragraph({
      children: [new TextRun(data.ClosingParagraph)],
      spacing: { after: 240 }
    }));
  }
  
  // Signature
  paragraphs.push(new Paragraph({
    children: [new TextRun("Sincerely,")],
    spacing: { after: 240 }
  }));
  
  paragraphs.push(new Paragraph({
    children: [new TextRun(data.CandidateFullName)]
  }));

  // Create the document
  const doc = new Document({
    sections: [{
      properties: {
        page: {
          margin: {
            top: 1440, // 1 inch
            right: 1440,
            bottom: 1440,
            left: 1440
          }
        }
      },
      children: paragraphs
    }]
  });

  const buffer = await Packer.toBuffer(doc);
  console.log("📄 Professional template document created:", paragraphs.length, "paragraphs,", buffer.length, "bytes");
  
  return buffer;
}

async function createBasicDocument(content: any): Promise<Buffer> {
  // Simple fallback document
  const text = formatContentAsText(content);
  const paragraphs = text.split('\n\n').filter(p => p.trim()).map(section => 
    new Paragraph({
      children: [new TextRun(section.trim())],
      spacing: { after: 240 }
    })
  );

  const doc = new Document({
    sections: [{
      children: paragraphs.length > 0 ? paragraphs : [
        new Paragraph({
          children: [new TextRun("Cover letter content could not be processed.")]
        })
      ]
    }]
  });

  const buffer = await Packer.toBuffer(doc);
  console.log("📄 Basic document created:", paragraphs.length, "paragraphs,", buffer.length, "bytes");
  
  return buffer;
}

function formatContentAsText(content: any): string {
  if (typeof content === 'string') {
    return content;
  }
  
  if (typeof content === 'object' && content !== null) {
    let text = '';
    
    if (content.salutation) {
      text += `${content.salutation}\n\n`;
    }
    
    if (content.opening) {
      text += `${content.opening}\n\n`;
    }
    
    if (content.body_paragraphs && Array.isArray(content.body_paragraphs)) {
      content.body_paragraphs.forEach((paragraph: string) => {
        text += `${paragraph}\n\n`;
      });
    }
    
    if (content.closing) {
      text += `${content.closing}\n\n`;
    }
    
    if (content.signature) {
      text += `${content.signature}`;
    }
    
    return text;
  }
  
  return JSON.stringify(content, null, 2);
}
