const { execSync } = require("child_process");
const path = require("path");

const data = {
  "pc.makevideoclip.com":
    "http://192.168.6.246:8300/web_dev/pc.makevideoclip.com.git",
  "ar.makevideoclip.com":
    "http://192.168.6.246:8300/web_dev/ar.makevideoclip.com.git",
  "de.makevideoclip.com":
    "http://192.168.6.246:8300/web_dev/de.makevideoclip.com.git",
  "es.makevideoclip.com":
    "http://192.168.6.246:8300/web_dev/es.makevideoclip.com.git",
  "fr.makevideoclip.com":
    "http://192.168.6.246:8300/web_dev/fr.makevideoclip.com.git",
  "it.makevideoclip.com":
    "http://192.168.6.246:8300/web_dev/it.makevideoclip.com.git",
  "jp.makevideoclip.com":
    "http://192.168.6.246:8300/web_dev/jp.makevideoclip.com.git",
  "kr.makevideoclip.com":
    "http://192.168.6.246:8300/web_dev/kr.makevideoclip.com.git",
  "nl.makevideoclip.com":
    "http://192.168.6.246:8300/web_dev/nl.makevideoclip.com.git",
  "pt.makevideoclip.com":
    "http://192.168.6.246:8300/web_dev/pt.makevideoclip.com.git",
  "tr.makevideoclip.com":
    "http://192.168.6.246:8300/web_dev/tr.makevideoclip.com.git",
  "tw.makevideoclip.com": "http://192.168.6.246:8300/web_dev/tw.makevideoclip.com.git",
};

const results = {
  success: [],
  failure: [],
};

const originalDir = process.cwd();

for (const [projectDir, newRemoteUrl] of Object.entries(data)) {
  if (!newRemoteUrl) {
    console.log(`Skipping ${projectDir} as no remote URL is specified`);
    continue;
  }

  try {
    // Change to project directory
    process.chdir(path.join(originalDir, projectDir));

    // Change git remote URL
    execSync(`git remote set-url origin "${newRemoteUrl}"`, {
      stdio: "inherit",
    });

    // Verify the change
    const newRemote = execSync("git remote -v").toString();
    if (newRemote.includes(newRemoteUrl)) {
      results.success.push(projectDir);
      console.log(`✅ Successfully updated remote for ${projectDir}`);
    } else {
      throw new Error("Remote URL verification failed");
    }
  } catch (error) {
    results.failure.push(projectDir);
    console.error(
      `❌ Failed to update remote for ${projectDir}:`,
      error.message
    );
  } finally {
    // Return to original directory after each iteration
    process.chdir(originalDir);
  }
}

console.log("\nFinal Results:");
console.log("Successful updates:", results.success);
console.log("Failed updates:", results.failure);
