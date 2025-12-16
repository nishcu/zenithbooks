
"use client";

import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { ArrowLeft, Award, FileSignature } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function CaCertificatesGuidePage() {
  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <Link
        href="/resources/knowledge-base"
        className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Back to Knowledge Base
      </Link>

      <div className="text-center">
        <div className="flex items-center justify-center size-16 rounded-full bg-primary/10 mb-4 mx-auto">
          <Award className="h-8 w-8 text-primary" />
        </div>
        <h1 className="text-3xl font-bold">CA Certificates Guide</h1>
        <p className="text-muted-foreground">Generating professionally certified documents.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award /> CA Certificate Generator
          </CardTitle>
        </CardHeader>

        <CardContent className="prose dark:prose-invert max-w-none">
          <p>
            The "CA Certificates" module empowers professionals (like Chartered
            Accountants) to quickly generate various certificates required by
            clients for banking, visa, or other regulatory purposes. This tool
            streamlines the drafting process, ensuring consistency and accuracy.
          </p>

          <h4>How It Works:</h4>
          <ol>
            <li>
              <strong>Select a Certificate Type:</strong> Choose from a list of
              common certificates, such as Net Worth, Turnover, or Capital
              Contribution.
            </li>
            <li>
              <strong>Input Data:</strong> A step-by-step form will guide you
              through entering all the necessary client and financial data. For
              a Net Worth certificate, for example, you would input details of
              assets and liabilities.
            </li>
            <li>
              <strong>Preview Draft:</strong> After entering the data, the
              system generates a formatted, live preview of the certificate with
              all the standard legal wording. You can review this draft for
              accuracy.
            </li>
            <li>
              <strong>Share & Download:</strong> You can immediately print the
              draft, save it as a PDF, or share it with your client for review
              via WhatsApp and other platforms.
            </li>
            <li>
              <strong>Request Certification (for Professionals):</strong> Once
              the draft is finalized, you can use the "Request Certification"
              feature. This sends the document to the admin panel, creating a
              formal record and allowing a senior partner or authorized person
              to digitally sign (DSC) the document offline and upload the final,
              certified copy for the client.
            </li>
          </ol>

          <h4 className="flex items-center gap-2 mt-6">
            <FileSignature /> Certification Workflow
          </h4>
          <p>
            The "Request Certification" button is a key part of the professional
            workflow. It creates a formal audit trail by logging the request in
            the Admin panel under "Certification Requests". This allows a firm
            to manage the final signing and delivery process securely and
            efficiently.
          </p>
        </CardContent>

        <CardFooter>
          <Link href="/ca-certificates" passHref>
            <Button>Go to CA Certificates</Button>
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}
