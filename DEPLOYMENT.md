# Deployment Guide for Jarvis (markx51.me)

## 1. Push to GitHub
I have already initialized the local repository and made the first commit. Now you need to upload it to your GitHub.

1.  **Create a new Repository** on GitHub (call it `jarvis-app`).
2.  **Run these commands** in your terminal (I cannot do this part as it requires your password/SSH key):

```bash
git remote add origin https://github.com/YOUR_USERNAME/jarvis-app.git
git branch -M main
git push -u origin main
```

## 2. Connect to Netlify
1.  Log in to [Netlify](https://app.netlify.com).
2.  Click **"Add new site"** -> **"Import from an existing project"**.
3.  Choose **GitHub** and select your `jarvis-app` repo.
4.  **Build Settings** (Netlify usually detects these automatically):
    *   **Build Command**: `npm run build`
    *   **Publish directory**: `.next`
    *   **Environment Variables**: You MUST add these in Netlify Site Settings > Environment Variables:
        *   `NEXT_PUBLIC_SUPABASE_URL`: (Get this from your Supabase Project Settings)
        *   `NEXT_PUBLIC_SUPABASE_ANON_KEY`: (Get this from your Supabase Project Settings)

## 3. Domain Setup (markx51.me)
Since you are using Cloudflare:
1.  In Netlify, go to **Domain Management** -> Add `markx51.me`.
2.  Netlify will give you a **CNAME** or **A Record**.
3.  Go to your **Cloudflare Dashboard** -> DNS.
4.  Add the records provided by Netlify (usually a CNAME pointing to `your-site.netlify.app`).

## 4. MailOne & Emails
For `mailone`, you will likely need to add their specific DNS records (TXT/MX) in Cloudflare to verify domain ownership. Once verified, we can use their API key in the app to send verification emails.
