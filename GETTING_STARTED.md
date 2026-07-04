# Getting Started (no experience needed)

This guide is for anyone installing Gravity Well for the first time — no prior experience with Claude Code plugins required.

**Before you start:** you need Claude Code already open and running — either the VSCode extension, or a terminal window where you typed `claude`. You do **not** need to download anything from GitHub — no "Code" button, no ZIP file.

The steps look slightly different depending on which one you're using. Pick the section below that matches.

## If you're using the VSCode extension

### Step 1

In the chat box, type just:

```
/plugin
```

and press Enter. Don't add anything after it — unlike a normal message, this opens a **Manage Plugins** panel rather than taking typed arguments. (If you type the whole install command as one line instead, you'll get an error like "`/plugin` isn't available in this environment" — that's this exact mismatch.)

### Step 2

In the panel that opens, click the **Marketplaces** tab. Type the following into the box and click **Add**:

```
FlashCosmos/Gravity-Well
```

### Step 3

Switch to the **Plugins** tab. You should see `gravity-well` listed — click it and install/enable it.

If nothing shows up, or you see an error, it's most likely a permissions issue — ask an admin to add you as a collaborator on the `FlashCosmos/Gravity-Well` repo.

## If you're using the terminal (`claude` CLI)

### Step 1

Type this exactly, then press Enter:

```
/plugin marketplace add FlashCosmos/Gravity-Well
```

Claude will confirm it found the marketplace. If you get an error instead, it's most likely the same permissions issue as above.

### Step 2

Type this exactly, then press Enter:

```
/plugin install gravity-well@flashcosmos-plugins
```

You may see a confirmation prompt — approve it.

## Done

That's it — nothing else to configure. Claude now automatically has access to Gravity Well's routing whenever it's useful.

Want to see it in action right away? Type `/gravity-well:orchestrate` followed by a task, e.g.:

```
/gravity-well:orchestrate add a --json flag to the export command
```

**One thing to know:** if you're working in a temporary or remote environment that resets between sessions (for example, a fresh SSH connection each time), the install doesn't carry over. You'll need to repeat these steps the next time you connect to a brand-new environment.

## Want more detail?

See the main [README](README.md) for what Gravity Well actually does and how to customize it.
