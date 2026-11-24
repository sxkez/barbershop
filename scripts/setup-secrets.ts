/**
 * Interactive helper: asks for the secret values in the terminal (input hidden)
 * and writes them into .env.local. Nothing is printed or sent anywhere.
 *   npm run setup:secrets
 * Press Enter on a question to keep the current value.
 */
import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";

const FILE = process.env.SETUP_ENV_FILE ?? path.join(process.cwd(), ".env.local");

let piped: Promise<string[]> | null = null;
function pipedLines() {
  piped ??= new Promise((resolve) => {
    const lines: string[] = [];
    const rl = readline.createInterface({ input: process.stdin });
    rl.on("line", (l) => lines.push(l));
    rl.on("close", () => resolve(lines));
  });
  return piped;
}

/**
 * Reads one line straight from the keyboard in raw mode (works with typing and
 * pasting in Windows Terminal / PowerShell). Hidden input shows one * per character.
 */
function ask(question: string, hidden: boolean): Promise<string> {
  return new Promise((resolve) => {
    const stdin = process.stdin;
    process.stdout.write(question);
    if (!stdin.isTTY) {
      // Fallback (input piped in, e.g. tests): read all lines once, hand them out in order.
      pipedLines().then((lines) => {
        process.stdout.write("\n");
        resolve((lines.shift() ?? "").trim());
      });
      return;
    }
    let value = "";
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding("utf8");
    const onData = (chunk: string) => {
      for (const ch of chunk) {
        if (ch === "\u0003") {
          // Ctrl+C
          stdin.setRawMode(false);
          process.stdout.write("\nAbgebrochen – nichts gespeichert.\n");
          process.exit(130);
        }
        if (ch === "\r" || ch === "\n") {
          if (value.length === 0 && chunk.length > 1) continue; // ignore stray newline at start of a paste
          stdin.removeListener("data", onData);
          stdin.setRawMode(false);
          stdin.pause();
          process.stdout.write("\n");
          resolve(value.trim());
          return;
        }
        if (ch === "\u0008" || ch === "\u007f") {
          // Backspace
          if (value.length > 0) {
            value = value.slice(0, -1);
            process.stdout.write("\b \b");
          }
          continue;
        }
        if (ch < " ") continue; // ignore other control characters
        value += ch;
        process.stdout.write(hidden ? "*" : ch);
      }
    };
    stdin.on("data", onData);
  });
}

function setVar(lines: string[], key: string, value: string) {
  const re = new RegExp(`^\\s*#?\\s*${key}=`);
  const idx = lines.findIndex((l) => re.test(l));
  const line = `${key}=${value}`;
  if (idx >= 0) lines[idx] = line;
  else lines.push(line);
}

function getVar(lines: string[], key: string) {
  const l = lines.find((x) => new RegExp(`^\\s*#?\\s*${key}=`).test(x));
  return l ? l.replace(/^\s*#?\s*[A-Z_]+=/, "") : "";
}

async function main() {
  const lines = fs.existsSync(FILE) ? fs.readFileSync(FILE, "utf8").split(/\r?\n/) : [];
  console.log("\nHANI – Zugangsdaten eintragen (Eingaben werden nicht angezeigt). Enter = unverändert lassen.\n");

  // Database: take the pooler URL already in the file and insert the password.
  const currentUrl = getVar(lines, "DATABASE_URL");
  const template = currentUrl.includes("pooler.supabase.com")
    ? currentUrl
    : "postgresql://postgres.dbrlrcylhawiiqlqtlev:[YOUR-DATABASE-PASSWORD]@aws-0-eu-west-1.pooler.supabase.com:6543/postgres";
  const pw = await ask("1) Supabase Datenbank-Passwort: ", true);
  if (pw) {
    const url = new URL(template.replace("[YOUR-DATABASE-PASSWORD]", "placeholder"));
    url.password = encodeURIComponent(pw); // special characters are escaped correctly
    setVar(lines, "DATABASE_URL", url.toString());
  }

  const service = await ask("2) Supabase Secret Key (sb_secret_… ): ", true);
  if (service) {
    if (!/^(sb_secret_|eyJ)/.test(service)) console.log("   Hinweis: Der Key beginnt normalerweise mit sb_secret_ – bitte prüfen.");
    setVar(lines, "SUPABASE_SERVICE_ROLE_KEY", service);
  }

  const resend = await ask("3) Resend API Key (re_… ): ", true);
  if (resend) setVar(lines, "RESEND_API_KEY", resend);

  const currentFrom = getVar(lines, "EMAIL_FROM");
  const from = await ask(`4) Absender [${currentFrom || "HANI BARBERSHOP <onboarding@resend.dev>"}]: `, false);
  setVar(lines, "EMAIL_FROM", from || currentFrom || "HANI BARBERSHOP <onboarding@resend.dev>");

  fs.writeFileSync(FILE, lines.join("\n").replace(/\n*$/, "\n"));
  console.log("\nGespeichert in .env.local. Jetzt prüfen mit:  npm run check:connections\n");
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
