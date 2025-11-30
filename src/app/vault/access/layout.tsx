import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Document Vault Access | ZenithBooks",
  description: "Access shared documents securely using a share code. View and download documents shared by document owners.",
  keywords: "document vault, secure document sharing, document access, file sharing",
  openGraph: {
    title: "Document Vault Access | ZenithBooks",
    description: "Access shared documents securely using a share code.",
    type: "website",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function VaultAccessLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

