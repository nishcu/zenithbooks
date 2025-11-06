/**
 * Email utilities for sending reports and documents
 */

export interface EmailOptions {
  to: string | string[];
  subject: string;
  body: string;
  attachments?: Array<{
    filename: string;
    content: Blob | string;
    contentType?: string;
  }>;
}

/**
 * Send email via API endpoint
 */
export async function sendEmail(options: EmailOptions): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    // Process attachments asynchronously
    const processedAttachments = options.attachments
      ? await Promise.all(
          options.attachments.map(async (att) => ({
            filename: att.filename,
            content: att.content instanceof Blob ? await blobToBase64(att.content) : att.content,
            contentType: att.contentType || (att.content instanceof Blob ? att.content.type : "application/octet-stream"),
          }))
        )
      : undefined;

    const response = await fetch("/api/email/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        to: Array.isArray(options.to) ? options.to : [options.to],
        subject: options.subject,
        body: options.body,
        attachments: processedAttachments,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.error || "Failed to send email",
      };
    }

    return {
      success: true,
      message: data.message || "Email sent successfully",
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to send email",
    };
  }
}

/**
 * Convert Blob to base64 string
 */
async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = (reader.result as string).split(",")[1];
      resolve(base64String);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Generate PDF from HTML element and send via email
 */
export async function sendReportViaEmail(
  element: HTMLElement,
  options: {
    to: string | string[];
    subject: string;
    body: string;
    fileName: string;
  }
): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    // Generate PDF
    const pdfBlob = await generatePDFBlob(element, options.fileName);

    // Send email with PDF attachment
    return await sendEmail({
      to: options.to,
      subject: options.subject,
      body: options.body,
      attachments: [
        {
          filename: `${options.fileName}.pdf`,
          content: pdfBlob,
          contentType: "application/pdf",
        },
      ],
    });
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to generate or send email",
    };
  }
}

/**
 * Generate PDF as Blob
 */
async function generatePDFBlob(element: HTMLElement, fileName: string): Promise<Blob> {
  const html2pdf = (await import("html2pdf.js")).default;

  const opt = {
    margin: 0.5,
    filename: `${fileName}.pdf`,
    image: { type: "jpeg", quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true, logging: false },
    jsPDF: { unit: "in", format: "a4", orientation: "portrait" },
  };

  // Generate PDF and return as Blob
  const pdfOutput = await html2pdf().set(opt).from(element).outputPdf("blob");
  return pdfOutput as Blob;
}

/**
 * Validate email address
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Format email addresses (single or multiple)
 */
export function formatEmailAddresses(emails: string | string[]): string[] {
  if (typeof emails === "string") {
    return emails.split(",").map((e) => e.trim()).filter(Boolean);
  }
  return emails;
}

