import { NextResponse } from "next/server";
import axios from "axios";

function getPlatform(link: string) {
  if (link.includes("instagram.com")) return "instagram";
  if (link.includes("tiktok.com")) return "tiktok";
  return null;
}

export async function POST(req: Request) {
  const body = await req.json();
  let { link } = body;

  if (!link) return NextResponse.json({ error: "No link provided" }, { status: 400 });

  if (!link.startsWith("http")) link = "https://" + link;

  const platform = getPlatform(link);
  if (!platform) return NextResponse.json({ error: "Unsupported platform" }, { status: 400 });

  try {
    let videoUrl: string | undefined;

    // ------------------- Instagram -------------------
    if (platform === "instagram") {
      const apiKey = process.env.SKYMANSION_API_KEY;

      if (!apiKey) {
        console.warn("⚠️ Warning: SKYMANSION_API_KEY not found. Instagram may fail.");
        // fallback: try instagram-url-direct (local scraper)
        try {
          const { instagramGetUrl } = await import("instagram-url-direct");
          const data = await instagramGetUrl(link);
          videoUrl = data.url_list?.[0];
        } catch {
          return NextResponse.json({ error: "Missing API key and fallback failed" }, { status: 500 });
        }
      } else {
        const apiUrl = `https://api.skymansion.site/ig-dl/download/?url=${encodeURIComponent(link)}&api_key=${apiKey}`;
        const response = await axios.get(apiUrl);
        videoUrl = response.data.video;
        
      }
    }

    // ------------------- TikTok -------------------
    if (platform === "tiktok") {
      const r = await axios.get(`https://www.tikwm.com/api/?url=${encodeURIComponent(link)}`);
      videoUrl = r.data.data.play;
    }

    if (!videoUrl) return NextResponse.json({ error: "Failed to fetch video. It may be private or restricted." }, { status: 404 });

    // ------------------- Fetch video -------------------
    const response = await axios.get(videoUrl, { responseType: "arraybuffer" });

    return new Response(response.data, {
      headers: {
        "Content-Type": "video/mp4",
        "Content-Disposition": `attachment; filename=${platform}-video.mp4`,
      },
    });

  } catch (err: any) {
    console.error("Download error:", err.message || err);
    return NextResponse.json({ error: "Failed to download video. Try again later." }, { status: 500 });
  }
}
