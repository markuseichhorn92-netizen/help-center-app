import Anthropic from "@anthropic-ai/sdk";
import { getDocument, updateOcrStatus } from "./documents";

const anthropic = new Anthropic();

// Supported media types for Claude Vision
type ImageMediaType = 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp';

const SUPPORTED_IMAGE_TYPES: Record<string, ImageMediaType> = {
  'image/jpeg': 'image/jpeg',
  'image/jpg': 'image/jpeg',
  'image/png': 'image/png',
  'image/gif': 'image/gif',
  'image/webp': 'image/webp',
};

/**
 * Extract text from an image using Claude Vision API
 */
export async function extractTextFromImage(imageUrl: string, contentType: string): Promise<string> {
  const mediaType = SUPPORTED_IMAGE_TYPES[contentType.toLowerCase()];

  if (!mediaType) {
    throw new Error(`Unsupported image type: ${contentType}`);
  }

  // Fetch image and convert to base64
  const response = await fetch(imageUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch image: ${response.statusText}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  const base64 = Buffer.from(arrayBuffer).toString('base64');

  // Call Claude Vision API
  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 4096,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: {
              type: "base64",
              media_type: mediaType,
              data: base64,
            },
          },
          {
            type: "text",
            text: `Extrahiere den gesamten Text aus diesem Bild/Dokument.

Gib NUR den extrahierten Text zurück, ohne Erklärungen oder Kommentare.
Behalte die Struktur und Formatierung bei (Absätze, Listen etc.).
Wenn es sich um ein Formular oder eine Rechnung handelt, extrahiere alle Felder und Werte.
Bei Tabellen, gib die Daten zeilenweise wieder.

Wenn kein Text erkennbar ist, antworte mit: [KEIN TEXT ERKANNT]`,
          },
        ],
      },
    ],
  });

  // Extract text from response
  const textContent = message.content.find(block => block.type === 'text');
  if (!textContent || textContent.type !== 'text') {
    throw new Error('No text content in response');
  }

  const extractedText = textContent.text.trim();

  // Check if no text was found
  if (extractedText === '[KEIN TEXT ERKANNT]') {
    return '';
  }

  return extractedText;
}

/**
 * Extract text from a PDF using Claude Vision API
 * Note: For PDFs, we process the first few pages as images
 */
export async function extractTextFromPdf(pdfUrl: string): Promise<string> {
  // For now, we'll use Claude to analyze the PDF directly
  // Claude can handle PDFs through the beta feature

  const response = await fetch(pdfUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch PDF: ${response.statusText}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  const base64 = Buffer.from(arrayBuffer).toString('base64');

  // Use Claude's PDF handling (beta)
  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 8192,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "document",
            source: {
              type: "base64",
              media_type: "application/pdf",
              data: base64,
            },
          },
          {
            type: "text",
            text: `Extrahiere den gesamten Text aus diesem PDF-Dokument.

Gib NUR den extrahierten Text zurück, ohne Erklärungen oder Kommentare.
Behalte die Struktur und Formatierung bei (Absätze, Listen, Überschriften etc.).
Wenn es sich um ein Formular oder eine Rechnung handelt, extrahiere alle Felder und Werte.
Bei Tabellen, gib die Daten strukturiert wieder.

Wenn kein Text erkennbar ist, antworte mit: [KEIN TEXT ERKANNT]`,
          },
        ],
      },
    ],
  });

  const textContent = message.content.find(block => block.type === 'text');
  if (!textContent || textContent.type !== 'text') {
    throw new Error('No text content in response');
  }

  const extractedText = textContent.text.trim();

  if (extractedText === '[KEIN TEXT ERKANNT]') {
    return '';
  }

  return extractedText;
}

/**
 * Process OCR for a document
 */
export async function processDocumentOcr(documentId: string): Promise<{
  success: boolean;
  text?: string;
  error?: string;
}> {
  const document = await getDocument(documentId);

  if (!document) {
    return { success: false, error: 'Document not found' };
  }

  if (document.ocrStatus === 'completed') {
    return { success: true, text: document.ocrText };
  }

  if (document.ocrStatus === 'skipped') {
    return { success: false, error: 'OCR not supported for this file type' };
  }

  // Mark as processing
  await updateOcrStatus(documentId, 'processing');

  try {
    let extractedText: string;

    if (document.contentType === 'application/pdf') {
      extractedText = await extractTextFromPdf(document.url);
    } else if (SUPPORTED_IMAGE_TYPES[document.contentType.toLowerCase()]) {
      extractedText = await extractTextFromImage(document.url, document.contentType);
    } else {
      await updateOcrStatus(documentId, 'skipped');
      return { success: false, error: 'Unsupported file type' };
    }

    // Update document with OCR result
    await updateOcrStatus(documentId, 'completed', extractedText);

    return { success: true, text: extractedText };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    await updateOcrStatus(documentId, 'failed', undefined, errorMessage);
    return { success: false, error: errorMessage };
  }
}

/**
 * Process multiple documents in batch
 */
export async function processOcrBatch(documentIds: string[]): Promise<{
  processed: number;
  failed: number;
  errors: Array<{ documentId: string; error: string }>;
}> {
  let processed = 0;
  let failed = 0;
  const errors: Array<{ documentId: string; error: string }> = [];

  for (const documentId of documentIds) {
    const result = await processDocumentOcr(documentId);

    if (result.success) {
      processed++;
    } else {
      failed++;
      if (result.error) {
        errors.push({ documentId, error: result.error });
      }
    }

    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  return { processed, failed, errors };
}
