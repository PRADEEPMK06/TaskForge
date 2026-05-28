variable "aws_region" {
  description = "AWS region for the TaskForge server."
  type        = string
  default     = "ap-south-1"
}

variable "project_name" {
  description = "Name prefix for infrastructure resources."
  type        = string
  default     = "taskforge"
}

variable "instance_type" {
  description = "EC2 instance type."
  type        = string
  default     = "t3.micro"
}

variable "key_name" {
  description = "Existing AWS EC2 key pair name for SSH."
  type        = string
}

variable "allowed_ssh_cidr" {
  description = "CIDR block allowed to SSH into the instance."
  type        = string
  default     = "0.0.0.0/0"
}

variable "allowed_app_cidr" {
  description = "CIDR block allowed to access app ports."
  type        = string
  default     = "0.0.0.0/0"
}

