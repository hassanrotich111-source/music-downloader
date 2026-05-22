import { z } from "zod";
import { createRouter, publicQuery } from "../middleware";
import ytdl from "@distube/ytdl-core";

export const videoRouter = createRouter({
  info: publicQuery
    .input(z.object({ url: z.string().url() }))
    .query(async ({ input }) => {
      try {
        const info = await ytdl.getInfo(input.url);
        
        // Get audio-only formats sorted by quality
        const audioFormats = ytdl.filterFormats(info.formats, "audioonly")
          .filter((f) => f.audioBitrate)
          .sort((a, b) => (b.audioBitrate || 0) - (a.audioBitrate || 0))
          .map((f) => ({
            itag: f.itag,
            quality: f.audioQuality,
            bitrate: f.audioBitrate,
            codec: f.codecs?.split(".")[0] || "unknown",
            size: f.contentLength 
              ? `${(parseInt(f.contentLength) / 1024 / 1024).toFixed(1)} MB`
              : "Unknown",
          }));

        // Also get video+audio formats
        const videoFormats = ytdl.filterFormats(info.formats, "audioandvideo")
          .sort((a, b) => {
            const qA = parseInt(a.qualityLabel) || 0;
            const qB = parseInt(b.qualityLabel) || 0;
            return qB - qA;
          })
          .map((f) => ({
            itag: f.itag,
            quality: f.qualityLabel,
            container: f.container,
            size: f.contentLength
              ? `${(parseInt(f.contentLength) / 1024 / 1024).toFixed(1)} MB`
              : "Unknown",
          }));

        return {
          success: true,
          data: {
            title: info.videoDetails.title,
            author: info.videoDetails.author.name,
            thumbnail: info.videoDetails.thumbnails.pop()?.url || "",
            duration: info.videoDetails.lengthSeconds,
            durationFormatted: formatDuration(parseInt(info.videoDetails.lengthSeconds)),
            audioFormats,
            videoFormats,
          },
        };
      } catch (err: any) {
        return {
          success: false,
          error: err.message || "Failed to fetch video info",
        };
      }
    }),
});

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}
