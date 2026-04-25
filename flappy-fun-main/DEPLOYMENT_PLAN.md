# Deployment Plan

## Target Architecture

This rollout uses:

1. Docker for packaging
2. Docker Hub as the initial image registry
3. Amazon EKS for Kubernetes
4. Jenkins for CI orchestration
5. ArgoCD for GitOps-based deployment
6. Prometheus and Grafana for monitoring and dashboards
7. SonarQube for code quality and security gates

The operating model is:

1. Developers push code to the application repository.
2. Jenkins runs quality, security, test, and build stages.
3. Jenkins builds and pushes a Docker image to Docker Hub.
4. Jenkins updates the image tag in the GitOps repository.
5. ArgoCD detects that Git change and syncs the target environment on EKS.
6. Prometheus scrapes metrics from the cluster and workloads.
7. Grafana visualizes platform and application health.
8. SonarQube blocks promotion when the quality gate fails.

## 1. Dockerize the application

This project is a Vite React single-page application, so the recommended production image flow is:

1. Build static assets with Node.js.
2. Serve the generated `dist/` folder with Nginx.
3. Configure Nginx to redirect SPA routes to `index.html`.

Local commands:

```bash
docker build -t flappy-fun:local .
docker run --rm -p 8080:80 flappy-fun:local
```

Health check endpoint:

```text
GET /healthz
```

## 2. Repository Strategy

Use two repositories:

1. Application repository
2. GitOps repository

Application repository contents:

1. React application source
2. Dockerfile
3. Jenkinsfile
4. Test and lint configuration
5. SonarQube project configuration

GitOps repository contents:

1. Kubernetes manifests or Helm chart
2. Environment overlays such as `dev`, `staging`, `prod`
3. ArgoCD `Application` definitions
4. Monitoring stack values if managed alongside the platform

## 3. Registry Strategy

Start with Docker Hub first, then move to Amazon ECR later if needed.

Phase 1:

1. Jenkins pushes versioned images to Docker Hub
2. Kubernetes pulls images from Docker Hub
3. ArgoCD deploys by syncing updated image tags from the GitOps repo

Phase 2:

1. Replace the image registry reference with ECR
2. Update Jenkins push credentials and login step
3. Update Kubernetes image references and pull auth
4. Keep the same GitOps and ArgoCD structure

Recommended image tagging:

```text
docker.io/<dockerhub-username>/flappy-fun:<build-number>-<git-sha>
```

For private Docker Hub repositories, add `imagePullSecrets` in Kubernetes.

## 4. AWS Platform Foundation

Core AWS services:

1. Amazon EKS for Kubernetes
2. Route 53 for DNS
3. ACM for TLS certificates
4. AWS Load Balancer Controller for ingress
5. IAM roles for Jenkins and Kubernetes workloads
6. CloudWatch for baseline logs and audit visibility

Recommended future AWS addition:

1. Amazon ECR when you want AWS-native registry integration

Recommended environment approach:

1. Start with `dev`
2. Add `staging`
3. Add `prod`

Each environment should have:

1. Separate namespace at minimum
2. Separate ingress hostname
3. Separate ArgoCD application
4. Separate alerting thresholds where needed

## 5. Kubernetes Application Layer

Core resources for this application:

1. `Deployment`
2. `Service`
3. `Ingress`
4. `ConfigMap` if runtime configuration is introduced
5. `HorizontalPodAutoscaler` when traffic patterns justify scaling

Recommended health settings:

1. Readiness probe on `/healthz`
2. Liveness probe on `/healthz`
3. Resource requests and limits from day one

Recommended deployment strategy:

1. Rolling updates for `dev` and `staging`
2. Controlled promotion into `prod`

## 6. CI Pipeline with Jenkins

Jenkins should be responsible for build, analysis, security checks, image publishing, and GitOps updates.

Recommended Jenkins stages:

1. Checkout source
2. Install dependencies with `npm ci`
3. Run linting
4. Run unit tests
5. Run SonarQube scan
6. Wait for SonarQube quality gate result
7. Build the production bundle with `npm run build`
8. Build the Docker image
9. Scan the built image for vulnerabilities
10. Push the image to Docker Hub
11. Update the GitOps repository with the new image tag
12. Create or update the pull request for environment promotion if required

Important operating rule:

Jenkins should not apply manifests directly to EKS if ArgoCD is your deployment controller. Jenkins publishes artifacts and updates Git. ArgoCD performs the deployment from Git state.

Jenkins setup requirements:

1. Docker Hub credentials in Jenkins
2. SonarQube server integration in Jenkins
3. Trivy installed on the Jenkins agent
4. Git credentials for the GitOps repository
5. Docker CLI available on the Jenkins agent

## 7. SecOps Pipeline with SonarQube

SonarQube should run before image publication to catch issues before promotion.

Recommended SonarQube responsibilities:

1. Static code analysis
2. Code smells and maintainability checks
3. Security hotspot detection
4. Quality gate enforcement
5. Coverage reporting when tests and coverage are available

Recommended policy:

1. Fail the pipeline if the SonarQube quality gate fails
2. Require a passing quality gate before updating the GitOps repository
3. Use stricter gates for `main` and release branches than for feature branches if needed

Suggested complementary security controls:

1. Add an image scanner stage such as Trivy
2. Add dependency audit reporting
3. Add secrets scanning in CI
4. Add Kubernetes manifest scanning for the GitOps repository

A practical pre-production gate is:

1. Lint passes
2. Tests pass
3. SonarQube quality gate passes
4. Container vulnerability scan passes
5. ArgoCD deploys successfully into `staging`
6. Manual approval is granted for `prod`

## 8. CD with ArgoCD

Recommended flow:

1. Install ArgoCD into the EKS cluster
2. Connect ArgoCD to the GitOps repository
3. Create one ArgoCD `Application` per environment
4. Enable auto-sync for `dev`
5. Use controlled sync or pull-request-based promotion for `staging` and `prod`

Promotion pattern:

1. `dev` auto-sync after Jenkins updates the GitOps repo
2. `staging` pull request or approval-based promotion
3. `prod` manual promotion with approvals and change tracking

## 9. Observability with Prometheus and Grafana

Recommended monitoring stack:

1. Prometheus for metrics collection
2. Grafana for dashboards and alert visualization
3. Alertmanager for notifications
4. kube-state-metrics for Kubernetes object metrics
5. node-exporter if worker-node metrics are needed

Recommended installation approach:

1. Deploy the Prometheus stack into EKS using Helm
2. Prefer the `kube-prometheus-stack` chart for a faster, integrated setup
3. Manage the Helm values in the GitOps repository so ArgoCD owns the monitoring stack too

Metrics you should monitor first:

1. Pod restarts
2. CPU and memory usage
3. Ingress and HTTP response trends
4. Replica availability
5. Node pressure and cluster health
6. ArgoCD sync status
7. Jenkins pipeline success and failure trend if exported

Grafana dashboards to create early:

1. Cluster health dashboard
2. Namespace and workload dashboard for this app
3. Ingress and latency dashboard
4. Deployment and release dashboard
5. Security and quality gate summary dashboard if data sources are integrated

Recommended alerts:

1. Pod crash looping
2. Deployment unavailable replicas
3. High memory or CPU saturation
4. Ingress errors
5. ArgoCD sync failures
6. Repeated Jenkins pipeline failures

## 10. End-to-End Delivery Flow

The final path should work like this:

1. Code is pushed to the application repository
2. Jenkins runs lint, test, SonarQube, build, and image scanning
3. Jenkins tags and pushes the container image to Docker Hub
4. Jenkins updates the GitOps repo with the new image tag
5. ArgoCD syncs the `dev` environment on EKS
6. Prometheus observes the deployment and Grafana surfaces health
7. A promotion process moves the approved release to `staging`
8. Production release happens only after security and operational checks pass

## 11. Suggested Implementation Order

1. Keep the Docker baseline as the packaging standard
2. Create the Docker Hub repository
3. Provision the EKS cluster and ingress foundation
4. Create Kubernetes manifests or a Helm chart for the app
5. Create the GitOps repository structure
6. Install ArgoCD and connect it to the GitOps repository
7. Build the Jenkins pipeline for lint, test, SonarQube, image build, vulnerability scan, and Docker Hub push
8. Add secrets scanning to Jenkins
9. Install Prometheus, Alertmanager, and Grafana into EKS
10. Create `dev` dashboards and alerts
11. Promote to `staging` with approval controls
12. Add production guardrails, alerts, and release approvals
13. Migrate the registry from Docker Hub to ECR when needed

## 12. What We Should Build Next

The next practical deliverables for this repository are:

1. A `Jenkinsfile`
2. Kubernetes manifests or a Helm chart
3. A GitOps folder structure or separate GitOps repo template
4. SonarQube integration instructions and project settings
5. Prometheus and Grafana deployment values for EKS
