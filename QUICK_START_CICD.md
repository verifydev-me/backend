# Quick Start - CI/CD Deployment

## ✅ Prerequisites Checklist

- [ ] Azure VM is running and accessible
- [ ] Docker & Docker Compose installed on Azure VM
- [ ] SSH key pair generated
- [ ] Public key added to Azure VM (`~/.ssh/authorized_keys`)
- [ ] GitHub repository secrets configured

## 🔐 GitHub Secrets Setup

Go to: **Repository Settings → Secrets and variables → Actions → New repository secret**

Add these 5 secrets:

1. **BACKEND_ENV_FILE**: Your complete .env file content
2. **HOST**: Azure VM IP or hostname (e.g., `20.123.45.67`)
3. **SSH_PRIVATE_KEY**: Your private SSH key (entire content including headers)
4. **USERNAME**: SSH username (e.g., `azureuser` or `ubuntu`)
5. **GITHUB_DEPLOY_KEY**: ✨ **NEW** - Private SSH key for GitHub access (See GITHUB_DEPLOY_KEY_SETUP.md)

## 🚀 How to Deploy

### Automatic Deployment
Just push to the `dev` branch:
```bash
git checkout dev
git add .
git commit -m "Your changes"
git push origin dev
```

The workflow will automatically:
1. ✅ Deploy to Azure
2. ✅ Build all services
3. ✅ Run health checks
4. ✅ Verify deployment

### Manual Deployment
1. Go to **Actions** tab in GitHub
2. Select **Deploy to Azure (Dev)** workflow
3. Click **Run workflow**
4. Select `dev` branch
5. Click **Run workflow** button

## 📊 Monitor Deployment

### On GitHub
- Go to **Actions** tab
- Click on the running workflow
- Watch real-time logs

### On Server
```bash
ssh username@your-host
cd ~/verifydev-backend
docker-compose ps
docker-compose logs -f
```

## 🔍 Quick Health Check

```bash
# Check all services
ssh username@your-host "cd ~/verifydev-backend && docker-compose ps"

# Check specific service logs
ssh username@your-host "cd ~/verifydev-backend && docker-compose logs gateway"
```

## ⚠️ Troubleshooting

### Deployment Failed?

1. **Check GitHub Actions logs** for error messages
2. **SSH into server** and check Docker logs:
   ```bash
   ssh username@your-host
   cd ~/verifydev-backend
   docker-compose logs --tail=100
   ```

3. **Restart services**:
   ```bash
   docker-compose restart
   ```

4. **Full rebuild**:
   ```bash
   docker-compose down
   docker-compose up -d --build
   ```

### Common Fixes

**Port already in use:**
```bash
docker-compose down
docker-compose up -d
```

**Out of disk space:**
```bash
docker system prune -af
```

**Service not starting:**
```bash
docker-compose logs service-name
docker-compose restart service-name
```

## 📝 Workflow File Location

`.github/workflows/deploy-dev.yml`

## 📚 Full Documentation

See `CICD_DEPLOYMENT.md` for complete documentation.

## 🎯 Next Steps

1. ✅ Verify all secrets are set in GitHub
2. ✅ Test SSH connection to Azure VM
3. ✅ Push to dev branch to trigger deployment
4. ✅ Monitor deployment in GitHub Actions
5. ✅ Verify services are running on Azure

## 🆘 Need Help?

- Check workflow logs in GitHub Actions
- Review `CICD_DEPLOYMENT.md` for detailed troubleshooting
- Check server logs: `docker-compose logs`
