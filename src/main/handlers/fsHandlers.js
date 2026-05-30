import { ipcMain } from "electron";

export function registerFsHandlers() {
  ipcMain.removeHandler("fs:rename");
  ipcMain.handle("fs:rename", async (_, oldPath, newPath) => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    await require("fs").promises.rename(oldPath, newPath);
  });
}