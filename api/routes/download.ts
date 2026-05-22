import { Hono } from "hono";
import ytdl from "@distube/ytdl-core";

const downloadApp = new Hono();

downloadApp.get("/download/audio", async (c) => {
  const url = c.req.query("url");
  const itag = c.req.query("itag");

  if (!url) {
    return c.json({ error: "URL is required" }, 400);
  }

  try {
    const info = await ytdl.getInfo(url);
    const title = info.videoDetails.title.replace(/[^a-zA-Z0-9\s_-]/g, "").trim();
    
    let format: ytdl.videoFormat | undefined;
    
    if (itag) {
      format = info.formats.find((f) => f.itag === parseInt(itag));
    }
    
    if (!format) {
      // Pick best audio format
      format = ytdl.chooseFormat(info.formats, { 
        quality: "highestaudio",
        filter: "audioonly",
      });
    }

    const stream = ytdl(url, { format });

    const ext = format.container || "webm";
    const filename = `${title}.${ext}`;

    c.header("Content-Type", `audio/${ext}`);
    c.header("Content-Disposition", `attachment; filename="${filename}"`);
    
    return new Response(stream as any, {
      headers: {
        "Content-Type": `audio/${ext}`,
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (err: any) {
    return c.json({ error: err.message || "Download failed" }, 500);
  }
});

downloadApp.get("/download/video", async (c) => {
  const url = c.req.query("url");
  const itag = c.req.query("itag");

  if (!url) {
    return c.json({ error: "URL is required" }, 400);
  }

  try {
    const info = await ytdl.getInfo(url);
    const title = info.videoDetails.title.replace(/[^a-zA-Z0-9\s_-]/g, "").trim();

    let format: ytdl.videoFormat | undefined;

    if (itag) {
      format = info.formats.find((f) => f.itag === parseInt(itag));
    }

    const stream = ytdl(url, { 
      format,
      quality: format ? undefined : "highest",
    });

    const ext = format?.container || "mp4";
    const filename = `${title}.${ext}`;

    return new Response(stream as any, {
      headers: {
        "Content-Type": `video/${ext}`,
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (err: any) {
    return c.json({ error: err.message || "Download failed" }, 500);
  }
});

export default downloadApp;
