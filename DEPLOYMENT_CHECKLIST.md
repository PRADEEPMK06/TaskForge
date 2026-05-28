# TaskForge Deployment Checklist

## ⚠️ Important: What Needs to Be Changed

**Short Answer**: Yes, the code will run, but **you must update configuration values** before deployment. This document shows exactly what to change for each platform.

---

## 📋 Universal Configuration (All Deployments)

These values need to be set regardless of deployment target:

### 1. **Backend Environment Variables**
```env
SECRET_KEY=your-secure-random-key-here
DATABASE_URL=postgres://user:password@host:5432/dbname (for production)
ACCESS_TOKEN_EXPIRE_MINUTES=720
CORS_ORIGINS=https://your-frontend-domain.com,https://your-backend-domain.com
PYTHONUNBUFFERED=1
```

**How to Generate Secure SECRET_KEY**:
```python
import secrets
print(secrets.token_urlsafe(32))
```

### 2. **Frontend Configuration**
File: `app/frontend/config.js`
```javascript
// Already configured to auto-detect backend URL
// For hardcoded URL (if needed):
window.TASKFORGE_API_URL = 'https://your-backend-api.com/api/v1';
```

---

## 🐳 Docker Deployment

### What's Needed ✅
- Docker installed locally
- Docker Compose for local testing

### Files to Check
1. `devops/build/dockerfiles/backend.Dockerfile` ✅ Ready
2. `devops/build/dockerfiles/frontend.Dockerfile` ✅ Ready
3. `devops/containers/docker-compose.yml` ✅ Ready

### Changes Needed

**Option 1: Local Testing (No changes needed)**
```bash
docker compose -f devops/containers/docker-compose.yml up --build
```

**Option 2: Push to Docker Hub/ECR**

1. **Update image names in docker-compose.yml**:
```yaml
services:
  backend:
    image: your-dockerhub-username/taskforge-backend:1.0.0
  frontend:
    image: your-dockerhub-username/taskforge-frontend:1.0.0
```

2. **Build images**:
```bash
docker build -t your-dockerhub-username/taskforge-backend:1.0.0 \
  -f devops/build/dockerfiles/backend.Dockerfile .

docker build -t your-dockerhub-username/taskforge-frontend:1.0.0 \
  -f devops/build/dockerfiles/frontend.Dockerfile .
```

3. **Push to registry**:
```bash
docker push your-dockerhub-username/taskforge-backend:1.0.0
docker push your-dockerhub-username/taskforge-frontend:1.0.0
```

✅ **Dockerfiles are production-ready**

---

## 🔄 Jenkins CI/CD Pipeline

### What's Needed ✅
- Jenkins server running
- GitHub webhook configured
- Docker Hub credentials (if pushing images)
- AWS/Terraform credentials (if using IaC)

### Files to Check
`devops/ci-cd/Jenkinsfile` ✅ Ready

### Changes Needed

1. **Update Jenkinsfile Parameters**:
   - Change `'your-dockerhub-username'` to your actual username
   - Update any hardcoded paths

2. **Add Jenkins Credentials**:
   ```
   Jenkins → Manage Jenkins → Manage Credentials
   
   Add credentials:
   - GitHub token (for webhook)
   - Docker Hub credentials (username/password)
   - AWS credentials (if running Terraform)
   - Ansible vault password (if using Ansible)
   ```

3. **Create Jenkins Pipeline Job**:
   - Name: `TaskForge-CI-CD`
   - Type: Pipeline
   - Pipeline script from SCM: Git
   - Repository URL: `https://github.com/PRADEEPMK06/TaskForge.git`
   - Script path: `devops/ci-cd/Jenkinsfile`

4. **Configure GitHub Webhook**:
   ```
   GitHub Repository → Settings → Webhooks
   
   Add webhook:
   - Payload URL: http://jenkins-server:8080/github-webhook/
   - Content type: application/json
   - Events: Push events
   ```

✅ **Jenkinsfile is production-ready**

---

## ☸️ Kubernetes Deployment

### What's Needed
- Kubernetes cluster (EKS, AKS, GKE, or on-prem)
- `kubectl` configured
- Container images in accessible registry

### Files to Check
```
devops/kubernetes/
├── namespace.yaml ✅
├── configmap.yaml ❌ Needs updates
├── secret.example.yaml ❌ Needs updates
├── backend-deployment.yaml ❌ Needs updates
├── frontend-deployment.yaml ✅
├── backend-service.yaml ✅
├── frontend-service.yaml ✅
├── ingress.yaml ❌ Needs updates
└── backend-pvc.yaml ✅
```

### Changes Needed

**1. Create namespace**:
```bash
kubectl apply -f devops/kubernetes/namespace.yaml
```

**2. Update `configmap.yaml`**:
```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: taskforge-config
  namespace: taskforge
data:
  DATABASE_URL: "sqlite:///./data/taskforge.db"  # OR PostgreSQL
  ACCESS_TOKEN_EXPIRE_MINUTES: "720"
  CORS_ORIGINS: "https://taskforge-backend.onrender.com,https://taskforge-fontend.onrender.com"
  PYTHONUNBUFFERED: "1"
```

**3. Create `secret.yaml` from example**:
```bash
cp devops/kubernetes/secret.example.yaml devops/kubernetes/secret.yaml
```

Edit and add:
```yaml
apiVersion: v1
kind: Secret
metadata:
  name: taskforge-secret
  namespace: taskforge
type: Opaque
data:
  SECRET_KEY: <base64-encoded-secret-key>
```

Generate base64 secret:
```bash
echo -n "your-secret-key" | base64
```

**4. Update `backend-deployment.yaml`**:

Change from:
```yaml
image: YOUR_DOCKERHUB_USERNAME/taskforge-backend:latest
```

To:
```yaml
image: your-dockerhub-username/taskforge-backend:1.0.0
imagePullPolicy: IfNotPresent
```

**5. Update `ingress.yaml`**:
```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: taskforge-ingress
  namespace: taskforge
spec:
  rules:
    - host: taskforge-backend.your-domain.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: taskforge-backend
                port:
                  number: 8000
    - host: taskforge-frontend.your-domain.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: taskforge-frontend
                port:
                  number: 80
```

**6. Apply all manifests**:
```bash
kubectl apply -f devops/kubernetes/namespace.yaml
kubectl apply -f devops/kubernetes/configmap.yaml
kubectl apply -f devops/kubernetes/secret.yaml
kubectl apply -f devops/kubernetes/backend-deployment.yaml
kubectl apply -f devops/kubernetes/frontend-deployment.yaml
kubectl apply -f devops/kubernetes/backend-service.yaml
kubectl apply -f devops/kubernetes/frontend-service.yaml
kubectl apply -f devops/kubernetes/backend-pvc.yaml
kubectl apply -f devops/kubernetes/ingress.yaml
```

**7. Verify deployment**:
```bash
kubectl get pods -n taskforge
kubectl logs -n taskforge deployment/taskforge-backend
kubectl get ingress -n taskforge
```

---

## 🏗️ Terraform / AWS Deployment

### What's Needed
- AWS account with credentials configured
- Terraform installed
- AWS CLI configured

### Files to Check
```
devops/infra-build/terraform/
├── versions.tf ✅
├── variables.tf ❌ Needs values
├── main.tf ❌ Needs review
├── outputs.tf ✅
└── terraform.tfvars.example ❌ Needs creation
```

### Changes Needed

**1. Create `terraform.tfvars`**:
```bash
cp devops/infra-build/terraform/terraform.tfvars.example \
   devops/infra-build/terraform/terraform.tfvars
```

**2. Edit `terraform.tfvars`**:
```hcl
aws_region          = "ap-south-1"
project_name        = "taskforge"
instance_type       = "t3.micro"
key_name            = "your-existing-ec2-keypair"
allowed_ssh_cidr    = "0.0.0.0/0"  # Restrict this in production!
allowed_app_cidr    = "0.0.0.0/0"

# Database
db_instance_class   = "db.t3.micro"
db_name             = "taskforge"
db_username         = "postgres"
db_password         = "YourSecurePassword123"  # Use random password generator

# Application
docker_image_backend  = "your-dockerhub-username/taskforge-backend:1.0.0"
docker_image_frontend = "your-dockerhub-username/taskforge-frontend:1.0.0"

tags = {
  Environment = "production"
  Project     = "TaskForge"
  Owner       = "your-name"
}
```

**3. Review `main.tf`**:
Check for:
- ✅ VPC configuration
- ✅ RDS database setup
- ✅ EC2 instance configuration
- ✅ Security groups
- ✅ IAM roles

**4. Initialize Terraform**:
```bash
cd devops/infra-build/terraform
terraform init
```

**5. Validate configuration**:
```bash
terraform validate
```

**6. Plan infrastructure**:
```bash
terraform plan -var-file=terraform.tfvars -out=tfplan
```

**7. Apply infrastructure**:
```bash
terraform apply tfplan
```

**8. Get outputs**:
```bash
terraform output
```

---

## 🤖 Ansible Configuration

### What's Needed
- Ansible installed
- SSH access to servers
- Inventory file configured

### Files to Check
`devops/configure-infra/ansible/` ❌ Needs inventory

### Changes Needed

**1. Create inventory file**:
```bash
cat > devops/configure-infra/ansible/inventory.ini << EOF
[backend]
backend1.example.com ansible_user=ec2-user

[frontend]
frontend1.example.com ansible_user=ec2-user

[all:vars]
ansible_python_interpreter=/usr/bin/python3
EOF
```

**2. Test connectivity**:
```bash
ansible all -i devops/configure-infra/ansible/inventory.ini -m ping
```

**3. Run playbook**:
```bash
ansible-playbook -i devops/configure-infra/ansible/inventory.ini \
  devops/configure-infra/ansible/site.yml
```

---

## 📋 Complete Deployment Checklist

### Pre-Deployment
- [ ] Generate secure `SECRET_KEY`
- [ ] Update `CORS_ORIGINS` with actual domain
- [ ] Generate random database password
- [ ] Create Docker Hub account (if needed)
- [ ] Create AWS account (if using AWS)
- [ ] Setup Jenkins server (if using CI/CD)

### Docker
- [ ] Test locally: `docker compose up --build`
- [ ] Build images: `docker build ...`
- [ ] Push to registry: `docker push ...`

### Kubernetes
- [ ] Create namespace
- [ ] Update ConfigMap with environment variables
- [ ] Create Secret with sensitive data
- [ ] Update image references in deployments
- [ ] Apply all manifests
- [ ] Verify pods are running: `kubectl get pods`
- [ ] Check logs: `kubectl logs`
- [ ] Test API: `curl http://backend-service:8000/health`

### AWS/Terraform
- [ ] Configure AWS credentials: `aws configure`
- [ ] Create terraform.tfvars
- [ ] Run `terraform init`
- [ ] Run `terraform plan`
- [ ] Run `terraform apply`
- [ ] Update security groups if needed
- [ ] Setup RDS connection
- [ ] Deploy application

### Jenkins
- [ ] Install Jenkins
- [ ] Install required plugins
- [ ] Add credentials
- [ ] Create pipeline job
- [ ] Setup GitHub webhook
- [ ] Test pipeline: Push code → Jenkins triggers

### Post-Deployment
- [ ] Test API endpoints: `/health`, `/docs`, `/api/v1/auth/register`
- [ ] Test frontend access
- [ ] Verify database connectivity
- [ ] Check logs for errors
- [ ] Monitor metrics at `/metrics`

---

## 🔧 Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| **`YOUR_DOCKERHUB_USERNAME` in manifests** | Update with your actual username |
| **`SECRET_KEY` not set** | Generate with: `python -c "import secrets; print(secrets.token_urlsafe(32))"` |
| **Database connection fails** | Check `DATABASE_URL` format: `postgresql://user:pass@host:5432/db` |
| **CORS errors** | Update `CORS_ORIGINS` to include frontend domain |
| **Kubernetes image pull fails** | Verify image exists in registry and credentials are correct |
| **Terraform state lock** | Run: `terraform force-unlock <lock-id>` |
| **Jenkins webhook not triggering** | Verify GitHub webhook URL is accessible and secret matches |
| **Pods stuck in pending** | Check resource requests: `kubectl describe pod <pod-name>` |

---

## ✅ Verification Commands

After deployment, run these to verify everything works:

```bash
# Check health
curl https://your-backend-domain.com/health

# Check API docs
curl https://your-backend-domain.com/docs

# Test registration
curl -X POST https://your-backend-domain.com/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"test","password":"password123"}'

# Check metrics
curl https://your-backend-domain.com/metrics

# Kubernetes status
kubectl get all -n taskforge

# Terraform state
terraform show
```

---

## 🚀 Summary: What Will Break Without Changes

| Component | Will It Work? | What Breaks | Fix |
|-----------|---------------|-----------|----|
| Docker (local) | ✅ Yes | Nothing | Use defaults |
| Docker (push) | ❌ No | Image name | Update to your username |
| Kubernetes | ❌ No | Image reference, secrets | Update manifests |
| Jenkins | ❌ No | Credentials, Docker Hub access | Configure Jenkins |
| Terraform | ❌ No | AWS region, SSH key, DB password | Create tfvars file |
| AWS | ❌ No | All above + networking | Complete setup |

---

## 📖 Example: Full AWS Deployment

```bash
# 1. Configure AWS
aws configure

# 2. Build and push Docker images
docker build -t yourname/taskforge-backend:1.0.0 -f devops/build/dockerfiles/backend.Dockerfile .
docker build -t yourname/taskforge-frontend:1.0.0 -f devops/build/dockerfiles/frontend.Dockerfile .
docker push yourname/taskforge-backend:1.0.0
docker push yourname/taskforge-frontend:1.0.0

# 3. Setup Terraform
cd devops/infra-build/terraform
terraform init
# Edit terraform.tfvars with your values
terraform plan -var-file=terraform.tfvars
terraform apply -var-file=terraform.tfvars

# 4. Get outputs and update Kubernetes manifests
terraform output

# 5. Deploy to Kubernetes (if using EKS)
kubectl apply -f devops/kubernetes/namespace.yaml
kubectl apply -f devops/kubernetes/configmap.yaml
kubectl apply -f devops/kubernetes/secret.yaml
kubectl apply -f devops/kubernetes/backend-deployment.yaml
kubectl apply -f devops/kubernetes/frontend-deployment.yaml
kubectl apply -f devops/kubernetes/ingress.yaml

# 6. Verify
kubectl get all -n taskforge
curl https://your-domain/health
```

---

## 🎓 Key Takeaway

**The code is production-ready**, but you need to:
1. ✅ Update configuration values (no code changes)
2. ✅ Update placeholder values like `YOUR_DOCKERHUB_USERNAME`
3. ✅ Create environment-specific files (terraform.tfvars, secrets.yaml)
4. ✅ Configure external services (Jenkins, AWS, Docker Hub)

**All changes are configuration, not code. The infrastructure code itself is correct.**

