import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const fileUrl = searchParams.get("fileUrl");
    const fileName = searchParams.get("fileName");
    const fileType = searchParams.get("fileType") || "application/octet-stream";

    if (!fileUrl) {
      return NextResponse.json(
        { error: "File URL is required" },
        { status: 400 }
      );
    }

    // Fetch the file from Firebase Storage
    const response = await fetch(fileUrl, {
      headers: {
        'Accept': '*/*',
      },
    });

    if (!response.ok) {
      console.error("Failed to fetch file from storage:", response.status, response.statusText);
      return NextResponse.json(
        { error: "Failed to fetch file from storage" },
        { status: response.status }
      );
    }

    // Get the file as a blob
    const blob = await response.blob();

    // Set appropriate headers for download
    const headers = new Headers();
    headers.set("Content-Type", fileType);
    // Force download with attachment disposition
    headers.set("Content-Disposition", `attachment; filename="${fileName || "download"}"`);
    headers.set("Cache-Control", "no-cache");

    return new NextResponse(blob, {
      status: 200,
      headers,
    });

  } catch (error) {
    console.error("Download API error", error);
    return NextResponse.json(
      { error: "Failed to download file" },
      { status: 500 }
    );
  }
}

