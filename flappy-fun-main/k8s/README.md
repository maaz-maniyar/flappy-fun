# Kubernetes YAML Manifests

This folder contains plain Kubernetes YAML manifests so you can learn the core resources directly.

## Learning path

Apply the dev environment manifests in this order:

```bash
kubectl apply -f k8s/manifests/dev/00-namespace.yaml
kubectl apply -f k8s/manifests/dev/01-deployment.yaml
kubectl apply -f k8s/manifests/dev/02-service.yaml
kubectl apply -f k8s/manifests/dev/03-ingress.yaml
kubectl apply -f k8s/manifests/dev/04-hpa.yaml
```

## What each manifest does

1. `00-namespace.yaml`
   - Creates an isolated Kubernetes namespace for the dev environment.
2. `01-deployment.yaml`
   - Runs the Flappy Fun container image and keeps the desired number of pods alive.
3. `02-service.yaml`
   - Gives the pods a stable internal network endpoint inside the cluster.
4. `03-ingress.yaml`
   - Exposes the service through the cluster ingress controller.
5. `04-hpa.yaml`
   - Autoscale the deployment based on CPU usage.

## Useful commands

Check resources:

```bash
kubectl get all -n flappy-fun-dev
```

Describe the deployment:

```bash
kubectl describe deployment flappy-fun -n flappy-fun-dev
```

Watch pod rollout:

```bash
kubectl rollout status deployment/flappy-fun -n flappy-fun-dev
```

Remove everything:

```bash
kubectl delete namespace flappy-fun-dev
```

## Notes

1. The image currently points to `docker.io/maazjazelle/flappy-fun:latest`.
2. The ingress hostname is a placeholder: `dev.flappy-fun.local`.
3. On AWS EKS, the ingress assumes the AWS Load Balancer Controller is installed and the ingress class is `alb`.
4. The HPA requires the Kubernetes Metrics Server in the cluster.
