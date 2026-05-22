import { useState, useRef, useCallback } from "react";
import { trpc } from "@/providers/trpc";
import {
  Music,
  Download,
  Loader2,
  Clock,
  User,
  Headphones,
  FileAudio,
  AlertCircle,
  Check,
  ExternalLink,
  Youtube,
  Trash2,
  History,
} from "lucide-react";

interface DownloadRecord {
  id: string;
  title: string;
  thumbnail: string;
  quality: string;
  date: string;
}

export default function Home() {
  const [url, setUrl] = useState("");
  const [selectedItag, setSelectedItag] = useState<number | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState("");
  const [recentDownloads, setRecentDownloads] = useState<DownloadRecord[]>(() => {
    const saved = localStorage.getItem("recentDownloads");
    return saved ? JSON.parse(saved) : [];
  });
  const abortRef = useRef<AbortController | null>(null);

  const { data, isLoading, error, refetch } = trpc.video.info.useQuery(
    { url },
    { enabled: false }
  );

  const handleFetchInfo = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!url.trim()) return;
      setSelectedItag(null);
      refetch();
    },
    [url, refetch]
  );

  const handleDownload = async (type: "audio" | "video") => {
    if (!url) return;
    setDownloading(true);
    setDownloadProgress("Starting download...");

    try {
      const params = new URLSearchParams({ url });
      if (selectedItag) params.append("itag", selectedItag.toString());

      const endpoint =
        type === "audio"
          ? `/api/download/audio?${params}`
          : `/api/download/video?${params}`;

      abortRef.current = new AbortController();

      const response = await fetch(endpoint, {
        signal: abortRef.current.signal,
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || "Download failed");
      }

      setDownloadProgress("Processing file...");

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);

      const contentDisposition = response.headers.get("content-disposition");
      let filename = "download";
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="?([^"]+)"?/);
        if (match) filename = match[1];
      }

      const a = document.createElement("a");
      a.href = downloadUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(downloadUrl);

      setDownloadProgress("Download complete!");

      // Add to recent downloads
      if (data?.success && data.data) {
        const record: DownloadRecord = {
          id: Date.now().toString(),
          title: data.data.title,
          thumbnail: data.data.thumbnail,
          quality:
            type === "audio"
              ? data.data.audioFormats.find((f) => f.itag === selectedItag)
                  ?.quality || "audio"
              : "video",
          date: new Date().toLocaleDateString(),
        };
        const updated = [record, ...recentDownloads.slice(0, 9)];
        setRecentDownloads(updated);
        localStorage.setItem("recentDownloads", JSON.stringify(updated));
      }

      setTimeout(() => setDownloadProgress(""), 3000);
    } catch (err: any) {
      if (err.name === "AbortError") {
        setDownloadProgress("Download cancelled");
      } else {
        setDownloadProgress(err.message || "Download failed");
      }
      setTimeout(() => setDownloadProgress(""), 5000);
    } finally {
      setDownloading(false);
      abortRef.current = null;
    }
  };

  const handleCancel = () => {
    abortRef.current?.abort();
  };

  const clearHistory = () => {
    setRecentDownloads([]);
    localStorage.removeItem("recentDownloads");
  };

  const videoData = data?.success ? data.data : null;
  const hasError = data?.success === false || error;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white">
      {/* Header */}
      <header className="border-b border-white/10 backdrop-blur-md bg-slate-950/50 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center shadow-lg shadow-violet-500/20">
              <Music className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-lg font-bold tracking-tight">
              Music Downloader
            </h1>
          </div>
          <a
            href="https://github.com/yt-dlp/yt-dlp"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-slate-400 hover:text-white transition-colors flex items-center gap-1.5"
          >
            <Youtube className="w-4 h-4" />
            <span className="hidden sm:inline">Powered by yt-dlp</span>
          </a>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-12">
        {/* Hero */}
        <div className="text-center mb-12 animate-fade-in">
          <h2 className="text-4xl md:text-5xl font-black tracking-tight mb-4 bg-gradient-to-r from-white via-violet-200 to-fuchsia-200 bg-clip-text text-transparent">
            Download Any Music
          </h2>
          <p className="text-slate-400 text-sm md:text-base max-w-lg mx-auto">
            Paste a YouTube URL and get your music in seconds. High-quality
            audio, no ads, completely free.
          </p>
        </div>

        {/* URL Input */}
        <form
          onSubmit={handleFetchInfo}
          className="mb-10 animate-slide-up"
          style={{ animationDelay: "0.1s" }}
        >
          <div className="relative flex items-center">
            <div className="absolute left-4 text-slate-500">
              <Youtube className="w-5 h-5" />
            </div>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="Paste YouTube URL here... (e.g., https://youtube.com/watch?v=...)"
              className="w-full pl-12 pr-36 py-4 bg-white/5 border border-white/10 rounded-2xl text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/20 transition-all"
              required
            />
            <button
              type="submit"
              disabled={isLoading}
              className="absolute right-2 px-5 py-2.5 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 rounded-xl text-sm font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-violet-600/20 flex items-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="hidden sm:inline">Fetching...</span>
                </>
              ) : (
                <>
                  <Headphones className="w-4 h-4" />
                  <span className="hidden sm:inline">Get Info</span>
                </>
              )}
            </button>
          </div>
        </form>

        {/* Error */}
        {hasError && (
          <div className="mb-8 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-3 animate-fade-in">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-red-300 text-sm font-medium">
                Failed to fetch video
              </p>
              <p className="text-red-400/70 text-xs mt-1">
                {(data as any)?.error ||
                  error?.message ||
                  "Please check the URL and try again."}
              </p>
            </div>
          </div>
        )}

        {/* Video Info & Download */}
        {videoData && (
          <div className="animate-slide-up space-y-6">
            {/* Video Card */}
            <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden backdrop-blur-sm">
              <div className="flex flex-col md:flex-row">
                {/* Thumbnail */}
                <div className="md:w-72 flex-shrink-0 relative">
                  <img
                    src={videoData.thumbnail}
                    alt={videoData.title}
                    className="w-full h-48 md:h-full object-cover"
                  />
                  <div className="absolute bottom-2 right-2 px-2 py-1 bg-black/70 rounded-md text-xs font-mono">
                    {videoData.durationFormatted}
                  </div>
                </div>

                {/* Info */}
                <div className="flex-1 p-6">
                  <h3 className="text-lg font-bold mb-2 line-clamp-2">
                    {videoData.title}
                  </h3>
                  <div className="flex items-center gap-4 text-xs text-slate-400 mb-4">
                    <span className="flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5" />
                      {videoData.author}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" />
                      {videoData.durationFormatted}
                    </span>
                  </div>

                  {/* Audio Formats */}
                  {videoData.audioFormats.length > 0 && (
                    <div className="mb-5">
                      <p className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                        <FileAudio className="w-3.5 h-3.5" />
                        Audio Quality
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {videoData.audioFormats.map((format) => (
                          <button
                            key={format.itag}
                            onClick={() => setSelectedItag(format.itag)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all ${
                              selectedItag === format.itag
                                ? "bg-violet-600 text-white shadow-lg shadow-violet-600/25"
                                : "bg-white/5 text-slate-300 hover:bg-white/10 border border-white/10"
                            }`}
                          >
                            {format.quality?.replace("AUDIO_QUALITY_", "") || "Default"}
                            {" "}
                            <span className="text-slate-400">
                              ({format.bitrate}kbps)
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Download Buttons */}
                  <div className="flex flex-wrap gap-3">
                    <button
                      onClick={() => handleDownload("audio")}
                      disabled={downloading}
                      className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 rounded-xl text-sm font-semibold transition-all disabled:opacity-50 shadow-lg shadow-violet-600/20"
                    >
                      {downloading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Download className="w-4 h-4" />
                      )}
                      Download Audio
                    </button>
                    <button
                      onClick={() => handleDownload("video")}
                      disabled={downloading}
                      className="flex items-center gap-2 px-5 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-sm font-semibold transition-all disabled:opacity-50"
                    >
                      {downloading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <ExternalLink className="w-4 h-4" />
                      )}
                      Download Video
                    </button>
                    {downloading && (
                      <button
                        onClick={handleCancel}
                        className="px-4 py-2.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 rounded-xl text-sm text-red-300 transition-all"
                      >
                        Cancel
                      </button>
                    )}
                  </div>

                  {/* Progress */}
                  {downloadProgress && (
                    <div className="mt-4 flex items-center gap-2 text-xs">
                      {downloadProgress === "Download complete!" ? (
                        <>
                          <Check className="w-4 h-4 text-emerald-400" />
                          <span className="text-emerald-400">
                            {downloadProgress}
                          </span>
                        </>
                      ) : downloadProgress.includes("failed") ||
                        downloadProgress.includes("cancelled") ? (
                        <>
                          <AlertCircle className="w-4 h-4 text-red-400" />
                          <span className="text-red-400">
                            {downloadProgress}
                          </span>
                        </>
                      ) : (
                        <>
                          <Loader2 className="w-4 h-4 text-violet-400 animate-spin" />
                          <span className="text-violet-300 animate-pulse-soft">
                            {downloadProgress}
                          </span>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Recent Downloads */}
        {recentDownloads.length > 0 && (
          <div className="mt-12 animate-slide-up">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                <History className="w-4 h-4" />
                Recent Downloads
              </h3>
              <button
                onClick={clearHistory}
                className="text-xs text-slate-500 hover:text-red-400 transition-colors flex items-center gap-1"
              >
                <Trash2 className="w-3 h-3" />
                Clear
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {recentDownloads.map((dl) => (
                <div
                  key={dl.id}
                  className="flex items-center gap-3 p-3 bg-white/5 border border-white/10 rounded-xl hover:border-white/20 transition-all"
                >
                  <img
                    src={dl.thumbnail}
                    alt={dl.title}
                    className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">{dl.title}</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {dl.quality} &middot; {dl.date}
                    </p>
                  </div>
                  <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* How It Works */}
        {!videoData && (
          <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6 animate-slide-up" style={{ animationDelay: "0.2s" }}>
            {[
              {
                icon: <Youtube className="w-6 h-6" />,
                title: "Paste URL",
                desc: "Copy any YouTube video link and paste it into the input field above.",
              },
              {
                icon: <Headphones className="w-6 h-6" />,
                title: "Choose Quality",
                desc: "Select your preferred audio bitrate from the available formats.",
              },
              {
                icon: <Download className="w-6 h-6" />,
                title: "Download",
                desc: "Hit the download button and your audio file will save directly to your device.",
              },
            ].map((step, i) => (
              <div
                key={i}
                className="p-6 bg-white/[0.02] border border-white/10 rounded-2xl hover:border-white/20 transition-all group"
              >
                <div className="w-12 h-12 rounded-xl bg-violet-500/10 flex items-center justify-center text-violet-400 mb-4 group-hover:bg-violet-500/20 transition-all">
                  {step.icon}
                </div>
                <h4 className="font-semibold mb-2">{step.title}</h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  {step.desc}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* Supported Sites */}
        <div className="mt-16 text-center animate-slide-up" style={{ animationDelay: "0.3s" }}>
          <p className="text-xs text-slate-500 mb-4 uppercase tracking-wider">
            Also works with
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            {["SoundCloud", "Spotify", "Bandcamp", "Vimeo", "Twitch", "TikTok", "Twitter/X", "Instagram", "Reddit", "1000+ more"].map(
              (site) => (
                <span
                  key={site}
                  className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-xs text-slate-400 hover:text-white hover:border-white/20 transition-all cursor-default"
                >
                  {site}
                </span>
              )
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/10 mt-16">
        <div className="max-w-4xl mx-auto px-4 py-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <p>Free, open-source music downloader</p>
          <a
            href="https://github.com/hassanrotich111-source/music-downloader"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-white transition-colors"
          >
            Star on GitHub
          </a>
        </div>
      </footer>
    </div>
  );
}
