import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("query");

  if (!query) {
    return NextResponse.json(
      { error: "No query provided" },
      { status: 400 }
    );
  }

  const apiKey = process.env.PEXELS_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Pexels API key not configured" },
      { status: 500 }
    );
  }

  try {
    const response = await fetch(
      `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=1`,
      {
        headers: {
          Authorization: apiKey,
        },
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("Pexels API error:", response.status, errorData);
      return NextResponse.json(
        { 
          error: "Failed to fetch image from Pexels",
          details: errorData.message || `HTTP ${response.status}`
        },
        { status: response.status }
      );
    }

    const data = await response.json();
    
    // 檢查是否有圖片結果
    if (!data.photos || data.photos.length === 0) {
      return NextResponse.json(
        { error: "No images found" },
        { status: 404 }
      );
    }

    // 回傳 large 尺寸的圖片 URL（約 24MP，更高清）
    const photo = data.photos[0];
    return NextResponse.json({
      url: photo.src.large,
      alt: photo.alt || query,
    });
  } catch (error) {
    console.error("Pexels API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
