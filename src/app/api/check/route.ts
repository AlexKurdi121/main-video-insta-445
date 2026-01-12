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

    if (platform === "instagram") {
      const apiKey = process.env.SKYMANSION_API_KEY;
      if (!apiKey) {
        return NextResponse.json({ error: "Missing API key" }, { status: 500 });
      }

      const apiUrl = `https://api.skymansion.site/ig-dl/download/?url=${encodeURIComponent(link)}&api_key=${apiKey}`;
      const response = await axios.get(apiUrl);
 videoUrl = response.data.video;
      // Adjust based on Skymansion response structure
      
    }

    if (platform === "tiktok") {
      const r = await axios.get(
        `https://www.tikwm.com/api/?url=${encodeURIComponent(link)}`
      );
      videoUrl = r.data.data.play;
    }

    if (!videoUrl) {
      return NextResponse.json(
        { error: "Failed to fetch video. It may be private or restricted." },
        { status: 404 }
      );
    }

    return NextResponse.json({ videoUrl });
  } catch (err: any) {
    console.error("API fetch error:", err.message || err);
    return NextResponse.json(
      { error: "Failed to fetch video. Try again later." },
      { status: 500 }
    );
  }
}
