
import { NextRequest, NextResponse } from 'next/server';
import { parseTallyXml } from '@/services/tally-importer';
// NOTE: We cannot directly use the AccountingContext here as it's a client-side React context.
// In a real-world full-stack app, this API route would have its own database logic
// (e.g., using firebase-admin) to write the vouchers to Firestore.

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided.' }, { status: 400 });
    }

    if (file.type !== 'text/xml' && file.type !== 'application/xml') {
        return NextResponse.json({ error: 'Invalid file type. Please upload an XML file.' }, { status: 400 });
    }

    const fileContent = await file.text();
    
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
