# Flappy Fun

This project is a Vite + React single-page application.

## Run locally

```bash
npm install
npm run dev
```

## Build locally

```bash
npm run build
```

## Run with Docker

```bash
docker build -t flappy-fun:local .
docker run --rm -p 8080:80 flappy-fun:local
```

Then open:

```text
http://localhost:8080
```

Health check:

```text
http://localhost:8080/healthz
```

## Deployment roadmap

See `DEPLOYMENT_PLAN.md` for the AWS, Kubernetes, Jenkins, and ArgoCD rollout plan.

## CI/CD starter

This repository now includes:

1. `Jenkinsfile` for Jenkins-based CI
2. `sonar-project.properties` for SonarQube scanning

Before using the pipeline, update these placeholders in `Jenkinsfile`:

1. Jenkins credential IDs
2. GitOps manifest path if you change the layout

## Kubernetes starter

This repository now also includes:

1. `k8s/base` for direct Kubernetes deployment manifests
2. `gitops-template` as a starter layout for a separate ArgoCD GitOps repository

## Learn Kubernetes With YAML

If you want to learn Kubernetes manifests directly, start with:

1. [k8s/README.md](C:\Users\MAAZ\Downloads\flappy-fun-main\flappy-fun-main\k8s\README.md)
2. `k8s/manifests/dev/00-namespace.yaml`
3. `k8s/manifests/dev/01-deployment.yaml`
4. `k8s/manifests/dev/02-service.yaml`
5. `k8s/manifests/dev/03-ingress.yaml`
6. `k8s/manifests/dev/04-hpa.yaml`

## Learn Kubernetes On EC2

If you want to build Kubernetes yourself on EC2 with `kubeadm`, use:

1. [K8S_ON_EC2_GUIDE.md](C:\Users\MAAZ\Downloads\flappy-fun-main\flappy-fun-main\K8S_ON_EC2_GUIDE.md)
