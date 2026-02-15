variable "aws_region" {
  type    = string
  default = "eu-west-1"
}

variable "mongodb_url" {
  type      = string
  sensitive = true
}

variable "google_client_id" {
  type = string
}

variable "google_client_secret" {
  type      = string
  sensitive = true
}
