import { NextRequest, NextResponse } from "next/server";
import { validateAndSanitize, sanitizeString } from "@/lib/security/validation";
import { z } from "zod";
import { Resend } from "resend";

/**
 * Email sending API route using Resend
 * 
 * Environment Variables Required:
 * - RESEND_API_KEY: Your Resend API key
 * - EMAIL_FROM: Sender email address (must be verified in Resend)
 */

const emailSchema = z.object({
  to: z.array(z.string().email()).min(1, "At least one recipient email is required"),
  subject: z.string().min(1, "Subject is required").max(200, "Subject too long"),
  body: z.string().min(1, "Body is required").max(10000, "Body too long"),
  attachments: z
    .array(
      z.object({
        filename: z.string().min(1),
        content: z.string(), // Base64 encoded
        contentType: z.string().default("application/octet-stream"),
      })
    )
    .optional(),
});

export async function POST(request: NextRequest) {
  try {
    // Parse and validate request body
    const body = await request.json();
    const validationResult = validateAndSanitize(emailSchema, body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: validationResult.errors.errors.map((e) => ({
            path: e.path.join("."),
            message: e.message,
          })),
        },
        { status: 400 }
      );
    }

    const { to, subject, body: emailBody, attachments } = validationResult.data;

    // Sanitize inputs
    const sanitizedSubject = sanitizeString(subject);
    const sanitizedBody = sanitizeString(emailBody);

    // Get Resend API key and sender email from environment
    const resendApiKey = process.env.RESEND_API_KEY;
    const emailFrom = process.env.EMAIL_FROM || "noreply@zenithbooks.in";

    // Check if Resend is configured
    if (!resendApiKey) {
      console.warn("RESEND_API_KEY not configured. Email sending disabled.");
      return NextResponse.json(
        {
          error: "Email service not configured",
          message: "Email service is not configured. Please contact support or configure RESEND_API_KEY.",
        },
        { status: 503 }
      );
    }

    // Initialize Resend
    const resend = new Resend(resendApiKey);

    // Convert body to HTML (preserve line breaks)
    const htmlBody = sanitizedBody
      .replace(/\n/g, "<br>")
      .replace(/\r\n/g, "<br>");

    // Prepare email data
    const emailData: any = {
      from: emailFrom,
      to: to,
      subject: sanitizedSubject,
      html: htmlBody,
    };

    // Add attachments if provided
    if (attachments && attachments.length > 0) {
      emailData.attachments = attachments.map((att) => {
        // Decode base64 content
        const content = Buffer.from(att.content, "base64");
        return {
          filename: att.filename,
          content: content,
          contentType: att.contentType || "application/octet-stream",
        };
      });
    }

    // Send email via Resend
    try {
      const result = await resend.emails.send(emailData);

      if (result.error) {
        console.error("Resend API error:", result.error);
        return NextResponse.json(
          {
            error: "Failed to send email",
            message: result.error.message || "Email service error. Please try again later.",
          },
          { status: 500 }
        );
      }

      return NextResponse.json(
        {
          message: "Email sent successfully",
          emailId: result.data?.id,
        },
        { status: 200 }
      );
    } catch (error) {
      console.error("Resend error:", error);
      return NextResponse.json(
        {
          error: "Failed to send email",
          message: error instanceof Error ? error.message : "Unknown error occurred",
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Email sending error:", error);
    return NextResponse.json(
      {
        error: "Failed to send email",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

