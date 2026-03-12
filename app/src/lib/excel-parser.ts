import JSZip from 'jszip';
import * as XLSX from 'xlsx';

interface ParsedExcel {
  records: Record<string, string | number | null>[];
  images: Record<number, string>; // rowIndex -> base64 data URL
}

/**
 * Parse an xlsx file and extract both data rows and embedded images.
 * xlsx is a zip archive; images live in xl/media/ and their cell positions
 * are described in xl/drawings/drawing1.xml via twoCellAnchor elements.
 */
export async function parseExcelWithImages(file: File): Promise<ParsedExcel> {
  const arrayBuffer = await file.arrayBuffer();

  // 1. Parse data rows with SheetJS
  const workbook = XLSX.read(arrayBuffer, { type: 'array' });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const records = XLSX.utils.sheet_to_json<Record<string, string | number | null>>(sheet);

  // 2. Extract embedded images by unzipping the xlsx
  const images: Record<number, string> = {};

  try {
    const zip = await JSZip.loadAsync(arrayBuffer);

    // Find drawing rels to map rId -> media file path
    const rIdToMedia: Record<string, string> = {};
    const drawingRelsFiles = Object.keys(zip.files).filter(
      f => f.match(/xl\/drawings\/_rels\/drawing\d+\.xml\.rels/)
    );

    for (const relsFile of drawingRelsFiles) {
      const relsXml = await zip.file(relsFile)!.async('text');
      const parser = new DOMParser();
      const doc = parser.parseFromString(relsXml, 'text/xml');
      const rels = doc.getElementsByTagName('Relationship');
      for (let i = 0; i < rels.length; i++) {
        const rel = rels[i];
        const id = rel.getAttribute('Id') || '';
        const target = rel.getAttribute('Target') || '';
        // Target is relative like "../media/image1.png"
        const mediaPath = target.replace('../', 'xl/');
        rIdToMedia[id] = mediaPath;
      }
    }

    // Parse drawing XML to get row positions of each image
    const drawingFiles = Object.keys(zip.files).filter(
      f => f.match(/xl\/drawings\/drawing\d+\.xml$/)
    );

    for (const drawingFile of drawingFiles) {
      const drawingXml = await zip.file(drawingFile)!.async('text');
      const parser = new DOMParser();
      const doc = parser.parseFromString(drawingXml, 'text/xml');

      // Handle twoCellAnchor elements
      const anchors = doc.getElementsByTagName('xdr:twoCellAnchor');
      for (let i = 0; i < anchors.length; i++) {
        const anchor = anchors[i];

        // Get the row from the "from" element
        const fromEl = anchor.getElementsByTagName('xdr:from')[0];
        if (!fromEl) continue;
        const rowEl = fromEl.getElementsByTagName('xdr:row')[0];
        if (!rowEl) continue;
        const row = parseInt(rowEl.textContent || '0');
        // row is 0-based, row 0 = header, so data row index = row - 1

        // Get the relationship ID from blipFill -> blip
        const blipEls = anchor.getElementsByTagName('a:blip');
        if (blipEls.length === 0) continue;
        const rEmbed = blipEls[0].getAttribute('r:embed');
        if (!rEmbed) continue;

        const mediaPath = rIdToMedia[rEmbed];
        if (!mediaPath) continue;

        // Read the image file as base64
        const mediaFile = zip.file(mediaPath);
        if (!mediaFile) continue;

        const imgData = await mediaFile.async('base64');
        const ext = mediaPath.split('.').pop()?.toLowerCase() || 'png';
        const mimeType = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg'
          : ext === 'gif' ? 'image/gif'
          : ext === 'webp' ? 'image/webp'
          : 'image/png';

        // Map to data row index (row 0 = header, so row 1 = first data row = index 0)
        const dataIndex = row - 1;
        if (dataIndex >= 0 && dataIndex < records.length) {
          images[dataIndex] = `data:${mimeType};base64,${imgData}`;
        }
      }

      // Also handle oneCellAnchor elements (some Excel files use this)
      const oneAnchors = doc.getElementsByTagName('xdr:oneCellAnchor');
      for (let i = 0; i < oneAnchors.length; i++) {
        const anchor = oneAnchors[i];
        const fromEl = anchor.getElementsByTagName('xdr:from')[0];
        if (!fromEl) continue;
        const rowEl = fromEl.getElementsByTagName('xdr:row')[0];
        if (!rowEl) continue;
        const row = parseInt(rowEl.textContent || '0');

        const blipEls = anchor.getElementsByTagName('a:blip');
        if (blipEls.length === 0) continue;
        const rEmbed = blipEls[0].getAttribute('r:embed');
        if (!rEmbed) continue;

        const mediaPath = rIdToMedia[rEmbed];
        if (!mediaPath) continue;

        const mediaFile = zip.file(mediaPath);
        if (!mediaFile) continue;

        const imgData = await mediaFile.async('base64');
        const ext = mediaPath.split('.').pop()?.toLowerCase() || 'png';
        const mimeType = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg'
          : ext === 'gif' ? 'image/gif'
          : ext === 'webp' ? 'image/webp'
          : 'image/png';

        const dataIndex = row - 1;
        if (dataIndex >= 0 && dataIndex < records.length) {
          images[dataIndex] = `data:${mimeType};base64,${imgData}`;
        }
      }
    }
  } catch (e) {
    console.warn('Failed to extract images from xlsx:', e);
  }

  return { records, images };
}
