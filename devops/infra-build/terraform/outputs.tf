output "instance_public_ip" {
  description = "Public IP for Ansible inventory."
  value       = aws_instance.taskflow.public_ip
}

output "frontend_url" {
  description = "Frontend URL after Docker Compose deployment."
  value       = "http://${aws_instance.taskflow.public_ip}:3000"
}

output "backend_url" {
  description = "Backend API URL after Docker Compose deployment."
  value       = "http://${aws_instance.taskflow.public_ip}:8000"
}

