'use client';

import { useState, useRef } from "react";
import axios from "axios";

export default function Home() {
  const [platform, setPlatform] = useState("instagram");
  const [link, setLink] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Cooldown timer for Instagram (in seconds)
  const [cooldown, setCooldown] = useState(0);
  const timerRef = useRef<number | null>(null);

  const startCooldown = (seconds: number) => {
    setCooldown(seconds);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = window.setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // Ensure full URL
  const formatLink = (l: string) => {
    let formatted = l.trim();
    if (!formatted.startsWith("http")) formatted = "https://" + formatted;
    return formatted;
  };

  const handleCheck = async () => {
    if (cooldown > 0) return;
    if (!link.trim()) return setError("Please enter a video link");
    setLoading(true);
    setError("");
    setVideoUrl("");

    try {
      const res = await axios.post("/api/check", { link: formatLink(link) });
      setVideoUrl(res.data.videoUrl);
    } catch (err: any) {
      const msg = err.response?.data?.error;
      if (platform === "instagram" && msg?.includes("private or restricted")) {
        setError("Instagram temporarily blocked requests. Try again in a few minutes.");
        startCooldown(4); // 45 seconds cooldown
      } else {
        setError(msg || "Failed to fetch video");
      }
    }

    setLoading(false);
  };

  const handleDownload = async () => {
    if (!videoUrl || cooldown > 0) return;
    setLoading(true);
    setError("");

    try {
      const res = await axios.post(
        "/api/download",
        { link: formatLink(link) },
        { responseType: "blob" }
      );

      const blob = new Blob([res.data], { type: "video/mp4" });
      const url = window.URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = `${platform}-video.mp4`;
      document.body.appendChild(a);
      a.click();
      a.remove();

      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      const msg = err.response?.data?.error;
      if (platform === "instagram" && msg?.includes("private or restricted")) {
        setError("Instagram temporarily blocked requests. Try again in a few minutes.");
        startCooldown(4);
      } else {
        setError(msg || "Failed to download video");
      }
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#0b0f19] text-white p-6">
      <div className="bg-[#141a28] w-full max-w-lg p-8 rounded-2xl shadow-xl border border-gray-700/40">

        <h1 className="text-3xl font-bold text-center mb-8 bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
          Video Downloader
        </h1>

        {/* Platform Buttons */}
        <div className="flex justify-center gap-4 mb-6">
          {["instagram", "tiktok"].map((p) => (
            <button
              key={p}
              onClick={() => {
                setPlatform(p);
                setLink("");
                setError("");
                setVideoUrl("");
                setCooldown(0);
              }}
              className={`px-5 py-2 rounded-xl text-sm font-semibold transition-all ${
                platform === p
                  ? "bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg shadow-purple-500/30 scale-105"
                  : "bg-gray-700 text-gray-300 hover:bg-gray-600"
              }`}
            >
              {p.toUpperCase()}
            </button>
          ))}
        </div>

        {/* Input */}
        <input
          type="text"
          placeholder={`Paste ${platform} video link here...`}
          value={link}
          onChange={(e) => setLink(e.target.value)}
          className="w-full p-3 rounded-xl bg-[#1b2233] border border-gray-700 focus:ring-2 focus:ring-blue-500 outline-none mb-4 text-sm"
        />

        {/* Check Button */}
        <button
          onClick={handleCheck}
          disabled={loading || cooldown > 0}
          className="w-full py-3 rounded-xl bg-gradient-to-r from-yellow-500 to-yellow-600 text-black font-semibold transition hover:brightness-110 disabled:opacity-50"
        >
          {cooldown > 0 ? `Try again in ${cooldown}s` : loading ? "Checking..." : "Check Video"}
        </button>

        {/* Error */}
        {error && <p className="text-red-400 text-center mt-4">{error}</p>}

        {/* Video Actions */}
        {videoUrl && (
          <div className="flex justify-between mt-6">
            <a
              href={videoUrl}
              target="_blank"
              className="px-5 py-2 rounded-xl bg-green-600 hover:bg-green-700 transition"
            >
              Show Video
            </a>
            <button
              onClick={handleDownload}
              disabled={cooldown > 0}
              className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 transition"
            >
              {loading ? "Downloading..." : "Download"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
