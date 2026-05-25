import { execFile } from "node:child_process";

execFile(
  "./bin/yt-dlp.exe",
  [
    "-f",
    "bestaudio",
    "-g",
    "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
  ],
  (err, stdout) => {
    if (err) {
      console.error(err);
      return;
    }

    console.log(stdout.trim());
  }
);