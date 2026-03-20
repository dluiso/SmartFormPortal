import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import prisma from '@/lib/db/prisma';
import { ProcessStatus } from '@prisma/client';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const headersList = await headers();
    const userId = headersList.get('x-user-id') || '';
    const tenantId = headersList.get('x-tenant-id') || '';

    // Validate ownership and status
    const instance = await prisma.processInstance.findFirst({
      where: { id, userId, tenantId, status: ProcessStatus.APPROVED },
      include: {
        processTemplate: true,
      },
    });

    if (!instance) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    // Strategy 2: Generate PDF from portal data using Puppeteer
    // (Laserfiche Repository API integration deferred to Phase 3)
    const pdfBuffer = await generatePortalPdf(instance);
    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${instance.processTemplate.name.replace(/\s+/g, '_')}_${id.slice(0, 8)}.pdf"`,
      },
    });
  } catch (error) {
    console.error('[PDF] Error generating PDF:', error);
    return NextResponse.json({ error: 'Could not generate PDF' }, { status: 500 });
  }
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

async function generatePortalPdf(instance: {
  id: string;
  submissionDate: Date | null;
  completionDate: Date | null;
  applicantName: string | null;
  businessName: string | null;
  lfProcessId: string | null;
  rawData: unknown;
  processTemplate: { name: string; description: string | null };
}): Promise<Buffer> {
  // Build HTML for the PDF
  const formData = (instance.rawData as Record<string, string> | null) ?? {};
  const rows = Object.entries(formData)
    .filter(([k]) => !k.startsWith('_'))
    .map(
      ([key, value]) => `
      <tr>
        <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;font-weight:600;color:#475569;width:40%">${escapeHtml(key)}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;color:#1e293b">${escapeHtml(String(value ?? ''))}</td>
      </tr>`
    )
    .join('');

  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #1e293b; background: #fff; }
  .header { background: #1e40af; color: white; padding: 32px 40px; }
  .header h1 { font-size: 22px; font-weight: 700; }
  .header p { font-size: 13px; opacity: 0.8; margin-top: 4px; }
  .badge { display: inline-block; background: #16a34a; color: white; padding: 3px 10px; border-radius: 9999px; font-size: 12px; font-weight: 600; margin-top: 12px; }
  .content { padding: 32px 40px; }
  .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 32px; }
  .meta-item label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: #94a3b8; font-weight: 600; }
  .meta-item p { font-size: 14px; color: #1e293b; margin-top: 2px; font-weight: 500; }
  table { width: 100%; border-collapse: collapse; margin-top: 8px; }
  th { background: #f8fafc; text-align: left; padding: 10px 12px; font-size: 13px; color: #64748b; border-bottom: 2px solid #e2e8f0; }
  .footer { margin-top: 48px; padding-top: 16px; border-top: 1px solid #e2e8f0; font-size: 11px; color: #94a3b8; text-align: center; }
</style>
</head>
<body>
  <div class="header">
    <h1>${escapeHtml(instance.processTemplate.name)}</h1>
    <p>${escapeHtml(instance.processTemplate.description ?? 'Official Portal Document')}</p>
    <span class="badge">APPROVED</span>
  </div>
  <div class="content">
    <div class="meta-grid">
      <div class="meta-item">
        <label>Reference Number</label>
        <p>${escapeHtml(instance.lfProcessId ?? instance.id.slice(0, 8).toUpperCase())}</p>
      </div>
      <div class="meta-item">
        <label>Applicant</label>
        <p>${escapeHtml(instance.applicantName ?? '—')}</p>
      </div>
      ${instance.businessName ? `<div class="meta-item"><label>Business / Organization</label><p>${escapeHtml(instance.businessName)}</p></div>` : ''}
      <div class="meta-item">
        <label>Submitted</label>
        <p>${instance.submissionDate ? new Date(instance.submissionDate).toLocaleDateString() : '—'}</p>
      </div>
      <div class="meta-item">
        <label>Approved</label>
        <p>${instance.completionDate ? new Date(instance.completionDate).toLocaleDateString() : '—'}</p>
      </div>
    </div>

    ${
      rows
        ? `<h2 style="font-size:15px;font-weight:700;color:#1e293b;margin-bottom:12px">Form Details</h2>
           <table><thead><tr><th>Field</th><th>Value</th></tr></thead><tbody>${rows}</tbody></table>`
        : ''
    }

    <div class="footer">
      Generated by SmartFormPortal &bull; ${new Date().toLocaleString()}
    </div>
  </div>
</body>
</html>`;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let chromium: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let puppeteer: any;

  try {
    const chromiumMod = await import('@sparticuz/chromium');
    chromium = chromiumMod.default ?? chromiumMod;
    puppeteer = await import('puppeteer-core');
  } catch {
    throw new Error('Puppeteer or Chromium not available');
  }

  const browser = await puppeteer.launch({
    args: chromium.args,
    defaultViewport: chromium.defaultViewport,
    executablePath: await chromium.executablePath(),
    headless: true,
  });

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '0', right: '0', bottom: '0', left: '0' },
    });
    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}
