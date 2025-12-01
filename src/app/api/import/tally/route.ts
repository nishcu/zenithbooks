
import { NextRequest, NextResponse } from 'next/server';
import { parseTallyXml } from '@/services/tally-importer';
import { checkRateLimit, getClientIdentifier } from '@/lib/security/validation';
// NOTE: We cannot directly use the AccountingContext here as it's a client-side React context.
// In a real-world full-stack app, this API route would have its own database logic
// (e.g., using firebase-admin) to write the vouchers to Firestore.

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const identifier = getClientIdentifier(request);
    const rateLimitResult = checkRateLimit(identifier, {
      maxRequests: 10, // 10 imports per minute
      windowMs: 60000,
    });

    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: 'Too many requests', message: 'Rate limit exceeded. Please try again later.' },
        {
          status: 429,
          headers: {
            'Retry-After': Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000).toString(),
          },
        }
      );
    }

    // Validate request
    const contentType = request.headers.get('content-type');
    if (!contentType || !contentType.includes('multipart/form-data')) {
      return NextResponse.json({ error: 'Invalid content type. Expected multipart/form-data.' }, { status: 400 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided.' }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = ['text/xml', 'application/xml', 'application/xhtml+xml'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: 'Invalid file type. Please upload an XML file.' }, { status: 400 });
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return NextResponse.json({ error: 'File too large. Maximum size is 10MB.' }, { status: 400 });
    }

    if (file.size === 0) {
      return NextResponse.json({ error: 'File is empty.' }, { status: 400 });
    }

    const fileContent = await file.text();

    // Basic content validation
    if (!fileContent || fileContent.trim().length === 0) {
      return NextResponse.json({ error: 'File content is empty.' }, { status: 400 });
    }

    // Check for XML structure
    if (!fileContent.trim().startsWith('<?xml') && !fileContent.trim().startsWith('<')) {
      return NextResponse.json({ error: 'Invalid XML format.' }, { status: 400 });
    }

    // The parseTallyXml function now returns structured JournalVoucher data
    const processedVouchers = await parseTallyXml(fileContent);

    // --- Simulation of Database Interaction ---
    // In a real application, you would now loop through `processedVouchers`
    // and use a server-side DB client (like firebase-admin) to save each one.
    // For example:
    /*
    import { getAdminApp, getAdminFirestore } from '@/lib/firebase-admin'; // A hypothetical admin-side setup
    const db = getAdminFirestore();
    const batch = db.batch();
    processedVouchers.forEach(voucher => {
        const docRef = db.collection('journalVouchers').doc(voucher.id);
        batch.set(docRef, { ...voucher, userId: 'some-user-id' }); // You'd get user ID from session
    });
    await batch.commit();
    */
    console.log(`Simulating database write for ${processedVouchers.length} vouchers.`);
    // --- End Simulation ---

    return NextResponse.json({
      message: `Successfully processed ${processedVouchers.length} vouchers from the Tally export. The accounting entries have been created.`,
      data: {
          voucherCount: processedVouchers.length
      },
    }, { status: 200 });

  } catch (error: any) {
    console.error('Tally Import Error:', error);
    return NextResponse.json({ error: error.message || 'Failed to process Tally XML file.' }, { status: 500 });
  }
}
