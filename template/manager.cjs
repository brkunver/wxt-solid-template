const { spawn } = require("node:child_process")
const { existsSync, readFileSync, realpathSync } = require("node:fs")
const path = require("node:path")

const validManagers = ["bun", "npm", "pnpm"]
const validCommands = ["push", "publish"]

function runCommand(command, args, capture = false) {
  return new Promise((resolve, reject) => {
    if (!capture) {
      console.log(`\n> ${command} ${args.join(" ")}`)
    }
    const child = spawn(command, args, {
      cwd: __dirname,
      shell: process.platform === "win32" && validManagers.includes(command),
      stdio: capture ? ["ignore", "pipe", "pipe"] : "inherit",
      env: { ...process.env, GIT_TERMINAL_PROMPT: "0", GIT_MERGE_AUTOEDIT: "no" },
    })
    let stdout = ""
    let stderr = ""
    child.stdout?.on("data", data => {
      stdout += data
    })
    child.stderr?.on("data", data => {
      stderr += data
    })
    child.on("error", error => reject(new Error(`Could not start ${command}: ${error.message}`)))
    child.on("close", (code, signal) => {
      if (code !== 0) {
        reject(new Error(`${command} ${args.join(" ")} failed (${signal || code}). ${stderr.trim()}`))
        return
      }
      resolve(stdout.trim())
    })
  })
}

function git(args, capture = false) {
  return runCommand("git", args, capture)
}

async function isGitClean() {
  return (await git(["status", "--porcelain"], true)) === ""
}

async function preflight(command) {
  const root = await git(["rev-parse", "--show-toplevel"], true)
  if (realpathSync(root) !== realpathSync(__dirname)) {
    throw new Error("Run the manager from its own project repository, not a parent repository.")
  }
  const branch = await git(["symbolic-ref", "--quiet", "--short", "HEAD"], true)
  if (!(await isGitClean())) {
    throw new Error("Commit or stash your changes before running the manager.")
  }
  for (const name of ["main", "dev"]) {
    await git(["show-ref", "--verify", `refs/heads/${name}`], true)
  }
  await git(["remote", "get-url", "origin"], true)
  if (command === "publish") {
    const pkg = JSON.parse(await git(["show", "dev:package.json"], true))
    if (pkg.private) {
      throw new Error("Cannot publish a private package. Use 'push' for Git or 'zip' for extension archives.")
    }
  }
  return branch
}

async function restoreBranch(branch) {
  const current = await git(["symbolic-ref", "--quiet", "--short", "HEAD"], true)
  if (current === branch) {
    return
  }
  const mergeHead = await git(["rev-parse", "--git-path", "MERGE_HEAD"], true)
  if (existsSync(path.resolve(__dirname, mergeHead)) || !(await isGitClean())) {
    console.error(`Left on '${current}' with unfinished changes. Resolve them before returning to '${branch}'.`)
    return
  }
  await git(["checkout", branch])
}

async function publishAndPush(packageManager, command) {
  const branch = await preflight(command)
  if (command === "publish") {
    await runCommand(packageManager, ["--version"], true)
  }
  let failure
  let pushed = false
  try {
    await git(["checkout", "main"])
    await git(["pull", "--ff-only", "origin", "main"])
    await git(["merge", "dev", "--no-edit"])
    if (command === "publish") {
      const pkg = JSON.parse(readFileSync(path.join(__dirname, "package.json"), "utf8"))
      if (pkg.private) {
        throw new Error("The merged package is private and cannot be published.")
      }
    }
    await git(["push", "origin", "main", "--tags"])
    pushed = true
    if (command === "publish") {
      await runCommand(packageManager, ["publish"])
    }
  } catch (error) {
    failure = error
    if (pushed) {
      console.error("Git changes were already pushed; package publication did not complete.")
    }
  }
  try {
    await restoreBranch(branch)
  } catch (error) {
    console.error(`Could not restore '${branch}': ${error.message}`)
    failure ||= error
  }
  if (failure) {
    throw failure
  }
  console.log(`\n${command === "publish" ? "Push and package publication" : "Push"} completed successfully.`)
}

async function main() {
  const [packageManager, command, ...extra] = process.argv.slice(2)
  if (!validManagers.includes(packageManager) || !validCommands.includes(command) || extra.length) {
    throw new Error("Usage: node (or bun) manager.cjs <bun|npm|pnpm> <push|publish>")
  }
  await publishAndPush(packageManager, command)
}

main().catch(error => {
  console.error(`Error: ${error.message}`)
  process.exitCode = 1
})
