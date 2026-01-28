import Anthropic from "@anthropic-ai/sdk";
import { getDocument, updateOcrStatus, updateDocument } from "./documents";

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

// ==========================================
// INVOICE DETECTION
// ==========================================

export interface InvoiceData {
  isInvoice: boolean;
  invoiceDate?: string;      // ISO format YYYY-MM-DD
  invoiceNumber?: string;
  invoiceAmount?: number;
  invoiceVendor?: string;
  confidence: number;        // 0-1
}

/**
 * Analyze OCR text to detect if document is an invoice and extract invoice data
 */
export async function detectInvoiceFromText(ocrText: string): Promise<InvoiceData> {
  if (!ocrText || ocrText.length < 50) {
    return { isInvoice: false, confidence: 0 };
  }

  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content: `Analysiere den folgenden Text und bestimme, ob es sich um eine Rechnung handelt.

TEXT:
${ocrText.substring(0, 4000)}

Antworte NUR im folgenden JSON-Format (keine anderen Texte):
{
  "isInvoice": true/false,
  "confidence": 0.0-1.0,
  "invoiceDate": "YYYY-MM-DD" oder null,
  "invoiceNumber": "Rechnungsnummer" oder null,
  "invoiceAmount": Betrag als Zahl oder null,
  "invoiceVendor": "Firmenname" oder null
}

Hinweise:
- Typische Merkmale einer Rechnung: "Rechnung", "Invoice", "Rechnungsnummer", "Betrag", "MwSt", "USt", "Gesamtsumme", "Zahlbar bis"
- Das invoiceDate ist das RECHNUNGSDATUM (nicht Lieferdatum oder Zahlungsziel)
- invoiceAmount ist der Gesamtbetrag inkl. MwSt
- Setze confidence auf 0.9+ wenn sehr sicher, 0.5-0.9 wenn wahrscheinlich, <0.5 wenn unsicher`,
      },
    ],
  });

  const textContent = message.content.find(block => block.type === 'text');
  if (!textContent || textContent.type !== 'text') {
    return { isInvoice: false, confidence: 0 };
  }

  try {
    // Extract JSON from response (handle potential markdown code blocks)
    let jsonStr = textContent.text.trim();
    const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      jsonStr = jsonMatch[0];
    }

    const data = JSON.parse(jsonStr);

    return {
      isInvoice: data.isInvoice === true,
      invoiceDate: data.invoiceDate || undefined,
      invoiceNumber: data.invoiceNumber || undefined,
      invoiceAmount: typeof data.invoiceAmount === 'number' ? data.invoiceAmount : undefined,
      invoiceVendor: data.invoiceVendor || undefined,
      confidence: typeof data.confidence === 'number' ? data.confidence : 0,
    };
  } catch {
    console.error('Failed to parse invoice detection response:', textContent.text);
    return { isInvoice: false, confidence: 0 };
  }
}

/**
 * Process OCR and invoice detection for a document
 */
export async function processDocumentWithInvoiceDetection(documentId: string): Promise<{
  success: boolean;
  text?: string;
  invoiceData?: InvoiceData;
  error?: string;
}> {
  // First, run standard OCR
  const ocrResult = await processDocumentOcr(documentId);

  if (!ocrResult.success || !ocrResult.text) {
    return ocrResult;
  }

  // Then detect if it's an invoice
  try {
    const invoiceData = await detectInvoiceFromText(ocrResult.text);

    // If it's likely an invoice (confidence > 0.6), update document
    if (invoiceData.isInvoice && invoiceData.confidence > 0.6) {
      const updates: Record<string, unknown> = {
        isInvoice: true,
      };

      if (invoiceData.invoiceDate) {
        updates.invoiceDate = invoiceData.invoiceDate;
      }
      if (invoiceData.invoiceNumber) {
        updates.invoiceNumber = invoiceData.invoiceNumber;
      }
      if (invoiceData.invoiceAmount !== undefined) {
        updates.invoiceAmount = invoiceData.invoiceAmount;
      }
      if (invoiceData.invoiceVendor) {
        updates.invoiceVendor = invoiceData.invoiceVendor;
      }

      await updateDocument(documentId, updates);
    }

    return {
      success: true,
      text: ocrResult.text,
      invoiceData,
    };
  } catch (error) {
    // Invoice detection failed, but OCR succeeded
    console.error('Invoice detection failed:', error);
    return {
      success: true,
      text: ocrResult.text,
      invoiceData: { isInvoice: false, confidence: 0 },
    };
  }
}
