import { app } from "electron";
import path from "path";
import fs from "fs";

/**
 * @param {import('better-sqlite3').Database} db - Instância do banco
 */
export function seedDefaultDirectories(db) {
  const defaultDirs = [
    path.join(app.getPath("documents"), "Waves", "video"),
    path.join(app.getPath("documents"), "Waves", "audios"),
    path.join(app.getPath("documents"), "Waves", "gravações de radio"),
  ];

  // Criar pastas fisicamente
  for (const dir of defaultDirs) {
    fs.mkdirSync(dir, { recursive: true });
  }

  // Registrar no banco de dados
  const stmt = db.prepare("INSERT OR IGNORE INTO directories (path) VALUES (?)");
  const insertDir = db.transaction((dir) => {
    stmt.run(dir);
  });

  for (const dir of defaultDirs) {
    insertDir(dir);
  }

  console.log("Cadastros de diretórios padrão realizados com sucesso!");
}
