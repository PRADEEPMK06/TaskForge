# Terraform Infrastructure

This module creates a simple AWS EC2 Docker host for TaskFlow.

## Resources

- VPC default network lookup
- Security group for SSH, frontend, backend, HTTP, and Prometheus
- Ubuntu EC2 instance

## Usage

```bash
cd devops/infra-build/terraform
cp terraform.tfvars.example terraform.tfvars
terraform init
terraform plan
terraform apply
```

Keep `terraform.tfvars` private because it can contain IP allowlists and key names.

