# MuseWave Deployment Guide

This guide provides step-by-step instructions for deploying MuseWave and getting your deployment link.

## Prerequisites

- Node.js installed (version 18 or higher)
- A GitHub account
- (Optional) A Vercel account for Vercel deployment

## Table of Contents

1. [GitHub Pages Deployment](#github-pages-deployment)
2. [Vercel Deployment](#vercel-deployment)
3. [Troubleshooting](#troubleshooting)

---

## GitHub Pages Deployment

GitHub Pages is a free hosting service provided by GitHub. Your app will be deployed automatically when you push to the `main` branch.

### Step 1: Enable GitHub Pages

1. Go to your GitHub repository: `https://github.com/AT-2803/MuseWave`
2. Click on **Settings** (top navigation bar)
3. In the left sidebar, click on **Pages** (under "Code and automation")
4. Under **Source**, select **Deploy from a branch**
5. Under **Branch**, select `gh-pages` and `/ (root)`, then click **Save**

### Step 2: Trigger a Deployment

The GitHub Actions workflow (`.github/workflows/deploy-gh-pages.yml`) automatically deploys when you push to `main`. You can also trigger it manually:

1. Go to the **Actions** tab in your GitHub repository
2. Click on **Deploy to GitHub Pages** workflow
3. Click **Run workflow** button on the right
4. Select the `main` branch and click **Run workflow**

### Step 3: Get Your Deployment Link

Once the workflow completes (usually takes 2-3 minutes):

1. Go to **Settings** → **Pages** in your repository
2. You'll see a box at the top that says: **"Your site is live at..."**
3. Your deployment link will be: `https://at-2803.github.io/MuseWave/`

**Note:** The first deployment may take up to 10 minutes for the site to become available after the workflow completes.

### Monitoring Deployments

- View deployment status: Go to **Actions** tab → click on the latest workflow run
- View deployment history: **Settings** → **Pages** → scroll down to see recent deployments
- Each push to `main` branch automatically triggers a new deployment

---

## Vercel Deployment

Vercel provides fast, global CDN hosting with automatic deployments and preview links for pull requests.

### Option A: One-Click Deploy (Easiest)

1. Go to [vercel.com](https://vercel.com) and sign up/log in
2. Click **Add New** → **Project**
3. Import your GitHub repository:
   - Connect your GitHub account if not already connected
   - Search for `AT-2803/MuseWave`
   - Click **Import**
4. Configure project:
   - **Framework Preset**: Vite
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - Click **Deploy**

### Option B: Using Vercel CLI

1. Install Vercel CLI:
   ```bash
   npm install -g vercel
   ```

2. Navigate to your project directory:
   ```bash
   cd /path/to/MuseWave
   ```

3. Deploy:
   ```bash
   vercel
   ```
   - Follow the prompts
   - Authenticate with your Vercel account
   - Confirm project settings

4. For production deployment:
   ```bash
   vercel --prod
   ```

### Step 3: Get Your Deployment Link

After deployment completes:

1. **From Vercel Dashboard:**
   - Go to [vercel.com/dashboard](https://vercel.com/dashboard)
   - Click on your `MuseWave` project
   - Your deployment link will be shown at the top (e.g., `https://muse-wave-xyz.vercel.app`)

2. **From CLI:**
   - The deployment URL is displayed in the terminal after successful deployment
   - Run `vercel ls` to list all your deployments and URLs

### Custom Domain (Optional)

To use a custom domain:

1. Go to your project in Vercel dashboard
2. Click **Settings** → **Domains**
3. Add your custom domain
4. Follow the DNS configuration instructions provided by Vercel

### Environment Variables

If you need to set environment variables (e.g., `GEMINI_API_KEY`):

1. Go to project **Settings** → **Environment Variables**
2. Add your variables:
   - Name: `GEMINI_API_KEY` (this project uses `GEMINI_API_KEY`, not `VITE_` prefix)
   - Value: Your API key
   - Environment: Production, Preview, Development (select as needed)
3. Redeploy for changes to take effect

**Note**: This project's `vite.config.ts` is configured to read `GEMINI_API_KEY` directly and expose it as `process.env.API_KEY` and `process.env.GEMINI_API_KEY` in the client bundle.

**⚠️ Security Warning**: API keys are exposed in the client-side bundle with this configuration. For production use, consider implementing a backend proxy to handle API calls and keep keys server-side. This prevents unauthorized access and usage of your API keys.

---

## Deployment Comparison

| Feature | GitHub Pages | Vercel |
|---------|-------------|--------|
| **Cost** | Free | Free tier available (generous limits) |
| **Setup Time** | 5 minutes | 2 minutes |
| **Build Time** | 2-3 minutes | 1-2 minutes |
| **Auto Deploy** | On push to `main` | On every push + PR previews |
| **Custom Domain** | Yes (with DNS setup) | Yes (easy setup) |
| **SSL/HTTPS** | Automatic | Automatic |
| **Deploy URL Format** | `username.github.io/repo` | `project-name.vercel.app` |
| **PR Previews** | No | Yes (automatic) |
| **Rollback** | Manual (via git) | One-click in dashboard |

---

## Troubleshooting

### GitHub Pages Issues

**Problem: Site shows 404**
- Solution: Ensure `gh-pages` branch exists and GitHub Pages source is set correctly
- Check if the workflow completed successfully in Actions tab

**Problem: Blank page after deployment**
- Solution: Check browser console for errors
- For GitHub Pages: The workflow automatically sets `VITE_BASE_PATH=/MuseWave/` during build
- For custom domains or root deployment: Base path is `/` by default
- Verify assets are loading correctly (check Network tab in DevTools)

**Problem: Workflow fails**
- Solution: Check the Actions tab for error logs
- Ensure `package.json` and dependencies are correct
- Verify Node.js version in workflow file matches your development environment

### Vercel Issues

**Problem: Build fails**
- Solution: Check build logs in Vercel dashboard
- Ensure `npm run build` works locally
- Verify all dependencies are listed in `package.json`

**Problem: Environment variables not working**
- Solution: Ensure you use `GEMINI_API_KEY` (without `VITE_` prefix for this project)
- The vite.config.ts is already configured to read this variable
- Redeploy after adding environment variables

**Problem: Old version showing**
- Solution: Clear browser cache or try incognito mode
- Vercel has aggressive caching; wait 1-2 minutes for propagation

---

## Quick Reference

### GitHub Pages URL Pattern
```
https://[username].github.io/[repository-name]/
```
For this repo: `https://at-2803.github.io/MuseWave/`

### Vercel URL Pattern
```
https://[project-name]-[random-hash].vercel.app
```
Example: `https://muse-wave-abc123.vercel.app`

### Check Deployment Status

**GitHub Pages:**
```bash
# View latest deployment
curl -I https://at-2803.github.io/MuseWave/

# Check if site is live (should return 200)
```

**Vercel:**
```bash
# List deployments
vercel ls

# Check specific deployment
vercel inspect [deployment-url]
```

---

## Next Steps

After deploying:

1. ✅ Test your deployment link to ensure the app works
2. ✅ Share the link with your team or users
3. ✅ Set up environment variables if needed (for Gemini API key)
4. ✅ Configure custom domain (optional)
5. ✅ Monitor deployments for any issues

For local development, see the [README.md](README.md) file.

---

**Need Help?**

- Check the [GitHub Pages documentation](https://docs.github.com/en/pages)
- Check the [Vercel documentation](https://vercel.com/docs)
- Open an issue in the repository for MuseWave-specific problems
