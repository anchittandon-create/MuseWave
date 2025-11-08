# 🔒 Security Guidelines for MuseWave

## ✅ Security Audit Summary (Completed)

**Status**: All secrets are properly secured ✓

### Audit Results:
1. **.gitignore** properly configured with `.env` and `.env.*` patterns ✓
2. **No .env files** in git history (verified with full history scan) ✓
3. **All API key references** are environment variables, not hardcoded values ✓
4. **Pre-commit hooks** installed to prevent future secret commits ✓
5. **.env.example** templates provided for all environments ✓

---

## 🔐 Environment Variables

### Required Variables

All sensitive credentials MUST be stored in `.env` files (never committed to git):

#### Frontend (root `.env`)
```bash
GEMINI_API_KEY=your-actual-key-here
VITE_GEMINI_API_KEY=your-actual-key-here
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json
```

#### Backend (`backend/.env`)
```bash
DATABASE_URL=postgresql://username:password@localhost:5432/musewave
GEMINI_API_KEY=your-actual-key-here
OPENAI_API_KEY=your-actual-key-here
JWT_SECRET=your-jwt-secret-here
```

### How to Set Up

1. **Copy example files**:
   ```bash
   cp .env.example .env
   cp backend/.env.example backend/.env
   cp backend-complete/.env.example backend-complete/.env
   ```

2. **Fill in actual values** in each `.env` file
3. **Never commit** `.env` files (they're already in `.gitignore`)

---

## 🛡️ Pre-Commit Protection

A pre-commit hook has been installed that will:
- Block commits containing `.env` files
- Detect potential hardcoded API keys or secrets
- Show warnings before allowing suspicious commits

### Bypass (use carefully!)
Only bypass if you're certain the detection is a false positive:
```bash
git commit --no-verify
```

---

## 📋 Vercel Deployment (Production)

### Setting Environment Variables

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project → **Settings** → **Environment Variables**
3. Add each variable individually:
   - **GEMINI_API_KEY** = `your-actual-key`
   - **DATABASE_URL** = `your-production-db-url`
   - etc.

4. Choose environments:
   - ✓ Production
   - ✓ Preview
   - ✓ Development

5. Click **Save**

### Important Notes

- Vercel environment variables are encrypted at rest
- They're injected at build time and runtime
- API routes automatically have access to `process.env.VARIABLE_NAME`
- Frontend variables must be prefixed with `VITE_` (e.g., `VITE_API_URL`)

---

## 🔍 Security Best Practices

### Do's ✅
- Store all secrets in `.env` files
- Use `.env.example` templates for onboarding
- Rotate API keys regularly
- Use separate keys for dev/staging/production
- Enable Vercel's automatic HTTPS
- Validate all user inputs server-side
- Use environment-specific configurations

### Don'ts ❌
- Never commit `.env` files
- Never hardcode API keys in source code
- Never log sensitive information
- Never expose API keys in client-side code (unless prefixed with `VITE_`)
- Never share API keys in chat, email, or Slack
- Never use production keys in development

---

## 🚨 If You Accidentally Commit a Secret

1. **Immediately revoke/rotate** the exposed key:
   - Gemini API: https://makersuite.google.com/app/apikey
   - OpenAI: https://platform.openai.com/account/api-keys

2. **Remove from git history**:
   ```bash
   # Use BFG Repo Cleaner or git filter-branch
   git filter-branch --force --index-filter \
     'git rm --cached --ignore-unmatch path/to/file' \
     --prune-empty --tag-name-filter cat -- --all
   ```

3. **Force push** (this rewrites history):
   ```bash
   git push origin --force --all
   ```

4. **Notify your team** about the key rotation

---

## 📊 Monitoring & Alerts

### GitHub Secret Scanning
GitHub automatically scans for known secret patterns. Enable:
- **Settings** → **Security & Analysis** → **Secret Scanning** (ON)
- **Push Protection** (ON) - blocks pushes containing secrets

### Vercel Logs
Monitor for suspicious activity:
```bash
vercel logs --follow
```

### API Usage Monitoring
Check Gemini API usage:
- https://makersuite.google.com/app/apikey
- Set up budget alerts to prevent unexpected charges

---

## 🔑 Key Rotation Schedule

Rotate secrets regularly:
- **API Keys**: Every 90 days
- **JWT Secrets**: Every 180 days
- **Database Passwords**: Every 180 days
- **After team member departure**: Immediately

---

## 📞 Security Contact

If you discover a security vulnerability:
1. **DO NOT** open a public GitHub issue
2. Email security concerns privately
3. Include steps to reproduce
4. Allow time for patching before disclosure

---

## ✅ Checklist for New Developers

- [ ] Clone the repository
- [ ] Copy `.env.example` to `.env` in root and backend folders
- [ ] Get API keys from team lead (via secure channel)
- [ ] Verify pre-commit hook is working: `ls -la .git/hooks/pre-commit`
- [ ] Test local development environment
- [ ] Never commit `.env` files
- [ ] Read this document completely

---

**Last Audit**: January 2025  
**Status**: ✅ All systems secure  
**Pre-commit Hook**: ✅ Installed  
**Git History**: ✅ Clean
