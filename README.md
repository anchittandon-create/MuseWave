<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally and deploy it online.

View your app in AI Studio: https://ai.studio/apps/drive/1kMZ30k-W6zUog4zKeV86ZgVeqFKMkpPz

## 🚀 Get Your Deployment Link

**Already deployed?** Your app should be live at:
- **GitHub Pages**: https://at-2803.github.io/MuseWave/
- **Vercel**: Check your [Vercel dashboard](https://vercel.com/dashboard)

**Need to deploy?** See **[DEPLOYMENT.md](DEPLOYMENT.md)** for complete instructions.

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Deploying

For detailed deployment instructions and how to get your deployment link, see **[DEPLOYMENT.md](DEPLOYMENT.md)**.

### Quick Start

**GitHub Pages** (Free):
- Automatic deployment on push to `main` branch
- Your link: `https://at-2803.github.io/MuseWave/`
- Enable in: Settings → Pages → Source: `gh-pages` branch

**Vercel** (Recommended):
- One-click deploy: Import repo → Set build command `npm run build` → Output: `dist`
- Get your custom `*.vercel.app` URL instantly
- Includes automatic preview deployments for PRs

See [DEPLOYMENT.md](DEPLOYMENT.md) for step-by-step instructions.
