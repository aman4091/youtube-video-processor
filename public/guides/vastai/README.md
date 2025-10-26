# VastAI Guide Screenshots

This folder contains screenshots for the VastAI Guide page.

## Screenshot Organization

Place your VastAI workflow screenshots here with the following naming convention:

- `step-1-login.png` - VastAI login page
- `step-2-search.png` - Search/Create Instance page
- `step-3-filters.png` - Filter settings (US location, 100+ Mbps)
- `step-4-instances.png` - Instances sidebar view
- `step-5-status.png` - Instance status monitoring
- `step-6-jupyter.png` - Jupyter workspace interface
- `step-7-upload.png` - File upload in Jupyter
- `step-8-terminal.png` - Jupyter terminal with command
- `step-9-completion.png` - Completion messages in terminal
- `step-10-telegram.png` - Telegram bot interaction
- `step-11-download.png` - Audio download from Telegram
- `step-12-destroy.png` - Instance destroy button

## Usage in Code

To use these screenshots in the VastAI Guide page, add them like this:

```tsx
<img
  src="/guides/vastai/step-1-login.png"
  alt="VastAI Login"
  className="rounded-lg border border-slate-700"
/>
```

## User Action Required

The user provided screenshots (images #2-14) need to be:
1. Saved from the conversation
2. Renamed according to the convention above
3. Placed in this folder
4. Referenced in the VastAI Guide page component
