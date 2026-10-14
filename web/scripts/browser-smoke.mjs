import { chromium } from "playwright";
import { spawn } from "node:child_process";
import { setTimeout as sleep } from "node:timers/promises";

const port = 4173;
const url = "http://127.0.0.1:" + port + "/gameguard-qa/";
const server = spawn("npm", ["run", "preview", "--", "--host", "127.0.0.1", "--port", String(port), "--strictPort"], {
  stdio: ["ignore","pipe","pipe"]
});
server.stdout.on("data", data => process.stdout.write("[vite] " + data));
server.stderr.on("data", data => process.stderr.write("[vite] " + data));

let browser;
try {
  for (let i = 0; i < 80; i++) {
    try {
      const response = await fetch(url);
      if (response.ok) break;
    } catch {}
    if (i === 79) throw new Error("Preview web server did not start.");
    await sleep(300);
  }
  browser = await chromium.launch({headless:true,args:["--no-sandbox"]});
  const page = await browser.newPage({viewport:{width:1440,height:900}});
  const errors = [];
  page.on("pageerror", err => errors.push(err.message));
  console.log("Opening",url);
  await page.goto(url,{waitUntil:"domcontentloaded"});
  await page.locator(".engine-indicator.ready").waitFor({timeout:180000});
  console.log("Python runtime initialized.");

  await page.getByRole("button",{name:"Negative HP"}).click();
  await page.getByRole("button",{name:/Run validation/}).click();
  await page.locator(".issue-row").filter({hasText:"SAVE-005"}).waitFor({timeout:30000});
  console.log("Save Guardian caught injected invalid health.");

  await page.locator("button.lab-tab").nth(1).click();
  await page.getByRole("button",{name:/Lose the Moonblade/}).click();
  await page.getByRole("button",{name:/Run migration/}).click();
  await page.getByText("MIGRATION REGRESSION").waitFor({timeout:30000});
  console.log("Migration preservation detected the lost item.");

  await page.locator("button.lab-tab").nth(2).click();
  await page.getByRole("button",{name:"Regressed build"}).click();
  await page.getByRole("button",{name:/Check performance/}).click();
  await page.getByText("PERFORMANCE REGRESSION").waitFor({timeout:30000});
  console.log("Performance checker detected the regression.");

  await page.locator("button.lab-tab").nth(3).click();
  await page.getByRole("button",{name:"Bad candidate"}).click();
  await page.getByRole("button",{name:/Evaluate release/}).click();
  await page.locator(".verdict").getByText("BUILD BLOCKED").waitFor({timeout:30000});
  console.log("Quality gate blocked an unsafe release.");
  await page.screenshot({path:"browser-smoke.png",fullPage:true});
  if (errors.length) throw new Error("Browser errors: "+errors.join("\n"));
  console.log("All end-to-end browser smoke checks passed.");
} catch (err) {
  console.error(err);
  process.exitCode=1;
} finally {
  await browser?.close();
  server.kill("SIGTERM");
}
