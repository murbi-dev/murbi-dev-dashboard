import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

const password = process.argv[2] ?? readFileSync(0, "utf8").trim();

if (!password) {
  console.error("Informe a senha como argumento ou via stdin.");
  process.exit(1);
}

console.log(createHash("sha256").update(password).digest("hex"));
