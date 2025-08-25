// download.ts
import fs from "fs";
import fetch from "node-fetch"; // if Node <18
import cliProgress from "cli-progress";

export async function downloadFile(url: string, outputPath: string): Promise<void> {
    const res = await fetch(url);

    if (!res.ok || !res.body) {
        throw new Error(`Failed to download: ${res.status} ${res.statusText}`);
    }

    const totalBytes = Number(res.headers.get("content-length")) || 0;

    // Create progress bar
    const bar = new cliProgress.SingleBar(
        {
            format: "Downloading [{bar}] {percentage}% | {value}/{total} MB",
            hideCursor: true,
        },
        cliProgress.Presets.shades_classic
    );

    if (totalBytes > 0) {
        bar.start(Math.ceil(totalBytes / (1024 * 1024)), 0);
    }

    let downloadedBytes = 0;
    const fileStream = fs.createWriteStream(outputPath);

    res.body.on("data", (chunk: Buffer) => {
        downloadedBytes += chunk.length;
        if (totalBytes > 0) {
            bar.update(Math.ceil(downloadedBytes / (1024 * 1024)));
        }
    });

    await new Promise<void>((resolve, reject) => {
        res.body.pipe(fileStream);
        res.body.on("error", reject);
        fileStream.on("finish", resolve);
    });

    if (totalBytes > 0) {
        bar.stop();
    }
    console.log(`✅ Downloaded ${url} -> ${outputPath}`);
}
