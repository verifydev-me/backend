# GitHub Deploy Key Setup Guide

## Problem
The CI/CD pipeline needs to clone your private repository on the Azure server, but git clone via HTTPS requires authentication which isn't available in the automated deployment.

## Solution
Use GitHub Deploy Keys with SSH authentication.

## Step-by-Step Setup

### 1. Generate a Deploy Key

On your **local machine** or **Azure VM**, run:

```bash
ssh-keygen -t ed25519 -C "deploy-key-verifydev-backend" -f ~/.ssh/github_deploy_key -N ""
```

This creates two files:
- `~/.ssh/github_deploy_key` (private key) - Keep this SECRET
- `~/.ssh/github_deploy_key.pub` (public key) - Add to GitHub

### 2. Add Public Key to GitHub Repository

1. Copy the **public key**:
   ```bash
   cat ~/.ssh/github_deploy_key.pub
   ```

2. Go to your GitHub repository: `https://github.com/verifydev-me/backend`

3. Navigate to: **Settings** → **Deploy keys** → **Add deploy key**

4. Fill in:
   - **Title**: `Azure Production Server`
   - **Key**: Paste the public key content
   - **Allow write access**: ❌ Leave unchecked (read-only is safer)

5. Click **Add key**

### 3. Add Private Key to GitHub Secrets

1. Copy the **private key**:
   ```bash
   cat ~/.ssh/github_deploy_key
   ```

2. Go to your GitHub repository: `https://github.com/verifydev-me/backend`

3. Navigate to: **Settings** → **Secrets and variables** → **Actions** → **New repository secret**

4. Create secret:
   - **Name**: `GITHUB_DEPLOY_KEY`
   - **Secret**: Paste the entire private key (including `-----BEGIN OPENSSH PRIVATE KEY-----` and `-----END OPENSSH PRIVATE KEY-----`)

5. Click **Add secret**

### 4. Verify GitHub Secrets

You should now have **5 secrets** in total:

| Secret Name | Description |
|------------|-------------|
| `BACKEND_ENV_FILE` | Environment variables |
| `HOST` | Azure VM IP/hostname |
| `SSH_PRIVATE_KEY` | SSH key for Azure VM |
| `USERNAME` | SSH username |
| `GITHUB_DEPLOY_KEY` | ✨ **NEW** - Deploy key for GitHub |

## How It Works

1. **GitHub Actions** connects to your Azure VM via SSH
2. The workflow copies the `GITHUB_DEPLOY_KEY` to the server
3. SSH is configured to use this key for `github.com`
4. Git clone/pull uses SSH authentication automatically
5. No username/password needed! 🎉

## Testing the Setup

### Test on Azure VM

SSH into your Azure VM and test:

```bash
# SSH into server
ssh username@your-azure-host

# Test GitHub connection
ssh -T git@github.com

# Expected output:
# Hi verifydev-me/backend! You've successfully authenticated, but GitHub does not provide shell access.
```

### Test the Workflow

1. Make a small change and push to dev:
   ```bash
   git checkout dev
   git commit --allow-empty -m "test: trigger deployment"
   git push origin dev
   ```

2. Watch the workflow in **GitHub Actions** tab

3. The deployment should now succeed! ✅

## Troubleshooting

### Error: "Permission denied (publickey)"

**Cause**: Deploy key not properly configured

**Fix**:
1. Verify the public key is added to GitHub Deploy Keys
2. Verify the private key is in `GITHUB_DEPLOY_KEY` secret
3. Make sure the key format is correct (includes headers)

### Error: "Host key verification failed"

**Cause**: GitHub not in known_hosts

**Fix**: The workflow now automatically adds GitHub to known_hosts, but you can manually add it:
```bash
ssh-keyscan -H github.com >> ~/.ssh/known_hosts
```

### Error: "Repository not found"

**Cause**: Deploy key doesn't have access to the repository

**Fix**:
1. Go to GitHub → Repository → Settings → Deploy keys
2. Verify your key is listed and enabled
3. Try removing and re-adding the key

## Security Best Practices

✅ **DO:**
- Use deploy keys (read-only when possible)
- Keep private keys in GitHub Secrets
- Use different keys for different servers
- Rotate keys periodically

❌ **DON'T:**
- Commit private keys to repository
- Share deploy keys between projects
- Use personal SSH keys as deploy keys
- Give write access unless absolutely necessary

## Alternative: Using Personal Access Token (Not Recommended)

If you prefer using HTTPS with a token (less secure):

1. Create a GitHub Personal Access Token
2. Add it as `GITHUB_TOKEN` secret
3. Modify the git clone command:
   ```bash
   git clone -b dev https://${{ secrets.GITHUB_TOKEN }}@github.com/${{ github.repository }}.git .
   ```

⚠️ **Note**: Deploy keys are more secure and recommended for production.

## Cleanup

If you need to remove the deploy key:

1. **From GitHub**: Settings → Deploy keys → Delete
2. **From Azure VM**:
   ```bash
   rm ~/.ssh/github_deploy_key
   rm ~/.ssh/config  # If only used for this
   ```
3. **From GitHub Secrets**: Settings → Secrets → Delete `GITHUB_DEPLOY_KEY`

## Next Steps

Once the deploy key is set up:

1. ✅ Push to dev branch
2. ✅ Watch deployment succeed
3. ✅ Verify services are running
4. 🎉 Enjoy automated deployments!
