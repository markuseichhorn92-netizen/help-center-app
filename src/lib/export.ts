import { ZipArchive } from 'archiver';
import { getDocument, listInvoices, Document } from './documents';

export interface ExportOptions {
  documentIds?: string[];
  month?: string; // YYYY-MM format
  year?: string;  // YYYY format
  invoicesOnly?: boolean;
}

// Get documents based on export options
export async function getDocumentsForExport(options: ExportOptions): Promise<Document[]> {
  let documents: Document[] = [];

  if (options.documentIds && options.documentIds.length > 0) {
    // Get specific documents
    for (const id of options.documentIds) {
      const doc = await getDocument(id);
      if (doc) {
        documents.push(doc);
      }
    }
  } else if (options.invoicesOnly || options.month || options.year) {
    // Get invoices, optionally filtered by time
    documents = await listInvoices();

    if (options.month) {
      // Filter by specific month (YYYY-MM)
      documents = documents.filter(doc => {
        const date = new Date(doc.invoiceDate || doc.uploadedAt);
        const docMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        return docMonth === options.month;
      });
    } else if (options.year) {
      // Filter by year
      documents = documents.filter(doc => {
        const date = new Date(doc.invoiceDate || doc.uploadedAt);
        return date.getFullYear().toString() === options.year;
      });
    }
  }

  return documents;
}

// Create a ZIP archive from documents
export async function createDocumentZip(documents: Document[]): Promise<Buffer> {
  return new Promise(async (resolve, reject) => {
    const archive = new ZipArchive({
      zlib: { level: 5 } // Medium compression
    });

    const chunks: Buffer[] = [];

    archive.on('data', (chunk: Buffer) => {
      chunks.push(chunk);
    });

    archive.on('end', () => {
      resolve(Buffer.concat(chunks));
    });

    archive.on('error', (err: Error) => {
      reject(err);
    });

    // Add each document to the archive
    for (const doc of documents) {
      try {
        const response = await fetch(doc.url);
        if (!response.ok) {
          console.error(`Failed to fetch document ${doc.id}: ${response.status}`);
          continue;
        }

        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // Create a safe filename
        let filename = doc.filename;

        // For invoices, prepend date and vendor
        if (doc.isInvoice && doc.invoiceDate) {
          const date = new Date(doc.invoiceDate);
          const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
          const vendor = doc.invoiceVendor ? `_${doc.invoiceVendor.replace(/[^a-zA-Z0-9äöüÄÖÜß]/g, '_')}` : '';
          filename = `${dateStr}${vendor}_${doc.filename}`;
        }

        archive.append(buffer, { name: filename });
      } catch (err) {
        console.error(`Error adding document ${doc.id} to archive:`, err);
      }
    }

    archive.finalize();
  });
}

// Generate a filename for the ZIP
export function generateZipFilename(options: ExportOptions): string {
  const now = new Date();
  const timestamp = now.toISOString().slice(0, 10);

  if (options.month) {
    const [year, month] = options.month.split('-');
    const monthName = new Date(parseInt(year), parseInt(month) - 1).toLocaleDateString('de-DE', { month: 'long' });
    return `Rechnungen_${monthName}_${year}.zip`;
  }

  if (options.year) {
    return `Rechnungen_${options.year}.zip`;
  }

  if (options.invoicesOnly) {
    return `Rechnungen_Export_${timestamp}.zip`;
  }

  return `Dokumente_Export_${timestamp}.zip`;
}
