# Kubernetes On EC2 Guide

This guide is for learning Kubernetes directly on Amazon EC2 using:

1. Ubuntu
2. `containerd`
3. `kubeadm`
4. Plain YAML manifests from this repository

It is intentionally more hands-on than EKS so you can understand the cluster pieces.

## Target Topology

Use 2 EC2 instances:

1. `control-plane`
2. `worker-1`

Recommended for learning:

1. Ubuntu 24.04 LTS
2. `t3.medium` or larger
3. 30 GB gp3 storage

Why `t3.medium`:

1. Kubernetes needs more headroom than a tiny EC2 instance
2. You will also want room for ingress, metrics, and later ArgoCD or monitoring

## AWS Security Group Rules

Create one security group for both nodes while learning.

Allow inbound:

1. `22` from your IP only for SSH
2. `6443` from the worker node security group or private subnet
3. `2379-2380` between cluster nodes
4. `10250` between cluster nodes
5. `10259` between cluster nodes
6. `10257` between cluster nodes
7. `30000-32767` from your IP or test network if you use NodePort temporarily

Allow all outbound traffic.

Important:

1. Keep Kubernetes control plane ports private where possible
2. Do not open them broadly to the internet

## Node Preparation

Run these steps on both EC2 instances.

### 1. Update the system

```bash
sudo apt-get update
sudo apt-get upgrade -y
```

### 2. Disable swap

Kubernetes requires swap to be disabled unless you are explicitly configuring otherwise.

```bash
sudo swapoff -a
sudo sed -i '/ swap / s/^/#/' /etc/fstab
```

### 3. Load required kernel modules

```bash
cat <<EOF | sudo tee /etc/modules-load.d/k8s.conf
overlay
br_netfilter
EOF

sudo modprobe overlay
sudo modprobe br_netfilter
```

### 4. Set required sysctl values

```bash
cat <<EOF | sudo tee /etc/sysctl.d/k8s.conf
net.bridge.bridge-nf-call-iptables  = 1
net.bridge.bridge-nf-call-ip6tables = 1
net.ipv4.ip_forward                 = 1
EOF

sudo sysctl --system
```

## Install containerd

Run on both nodes.

```bash
sudo apt-get install -y ca-certificates curl
sudo apt-get install -y containerd
sudo mkdir -p /etc/containerd
containerd config default | sudo tee /etc/containerd/config.toml > /dev/null
sudo sed -i 's/SystemdCgroup = false/SystemdCgroup = true/' /etc/containerd/config.toml
sudo systemctl restart containerd
sudo systemctl enable containerd
```

## Install Kubernetes Components

The official Kubernetes docs now use `pkgs.k8s.io` repositories by Kubernetes minor version.

Run on both nodes:

```bash
sudo apt-get update
sudo apt-get install -y apt-transport-https ca-certificates curl gpg
sudo mkdir -p -m 755 /etc/apt/keyrings
curl -fsSL https://pkgs.k8s.io/core:/stable:/v1.35/deb/Release.key | sudo gpg --dearmor -o /etc/apt/keyrings/kubernetes-apt-keyring.gpg
echo 'deb [signed-by=/etc/apt/keyrings/kubernetes-apt-keyring.gpg] https://pkgs.k8s.io/core:/stable:/v1.35/deb/ /' | sudo tee /etc/apt/sources.list.d/kubernetes.list
sudo apt-get update
sudo apt-get install -y kubelet kubeadm kubectl
sudo apt-mark hold kubelet kubeadm kubectl
sudo systemctl enable --now kubelet
```

## Initialize the Control Plane

Run this only on the control-plane node.

Choose a pod CIDR that matches the CNI plugin you plan to use. This guide uses Calico and `192.168.0.0/16`.

```bash
sudo kubeadm init --pod-network-cidr=192.168.0.0/16
```

When it finishes, configure kubectl for your user:

```bash
mkdir -p $HOME/.kube
sudo cp -i /etc/kubernetes/admin.conf $HOME/.kube/config
sudo chown $(id -u):$(id -g) $HOME/.kube/config
```

Save the `kubeadm join ...` command printed at the end. You will run it on the worker node.

## Join the Worker Node

Run the join command from `kubeadm init` on the worker node.

It looks like this:

```bash
sudo kubeadm join <control-plane-private-ip>:6443 --token <token> --discovery-token-ca-cert-hash sha256:<hash>
```

## Install a CNI Plugin

Without a CNI plugin, pods will not get proper networking.

This guide uses Calico:

```bash
kubectl apply -f https://raw.githubusercontent.com/projectcalico/calico/v3.30.3/manifests/calico.yaml
```

Then verify:

```bash
kubectl get nodes
kubectl get pods -A
```

Wait until nodes are `Ready`.

## Verify the Cluster

Run on the control-plane node:

```bash
kubectl get nodes -o wide
kubectl get pods -A
kubectl cluster-info
```

## Deploy This Application With YAML

This repository already includes learning-friendly Kubernetes YAML files:

1. [k8s/README.md](C:\Users\MAAZ\Downloads\flappy-fun-main\flappy-fun-main\k8s\README.md)
2. [00-namespace.yaml](C:\Users\MAAZ\Downloads\flappy-fun-main\flappy-fun-main\k8s\manifests\dev\00-namespace.yaml)
3. [01-deployment.yaml](C:\Users\MAAZ\Downloads\flappy-fun-main\flappy-fun-main\k8s\manifests\dev\01-deployment.yaml)
4. [02-service.yaml](C:\Users\MAAZ\Downloads\flappy-fun-main\flappy-fun-main\k8s\manifests\dev\02-service.yaml)
5. [03-ingress.yaml](C:\Users\MAAZ\Downloads\flappy-fun-main\flappy-fun-main\k8s\manifests\dev\03-ingress.yaml)
6. [04-hpa.yaml](C:\Users\MAAZ\Downloads\flappy-fun-main\flappy-fun-main\k8s\manifests\dev\04-hpa.yaml)

Apply them in order:

```bash
kubectl apply -f k8s/manifests/dev/00-namespace.yaml
kubectl apply -f k8s/manifests/dev/01-deployment.yaml
kubectl apply -f k8s/manifests/dev/02-service.yaml
kubectl apply -f k8s/manifests/dev/03-ingress.yaml
kubectl apply -f k8s/manifests/dev/04-hpa.yaml
```

## Ingress For Learning

The current ingress manifest is written for an AWS ALB-style ingress class, which is closer to an EKS setup.

For a kubeadm cluster on EC2, the simpler learning path is:

1. Start with `kubectl port-forward` or `NodePort`
2. Then install NGINX Ingress Controller
3. Then update the ingress manifest for that controller

Simple temporary access:

```bash
kubectl port-forward svc/flappy-fun 8080:80 -n flappy-fun-dev
```

Then open:

```text
http://localhost:8080
```

## Metrics And HPA

The HPA requires Metrics Server.

Install it:

```bash
kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml
```

Then verify:

```bash
kubectl top nodes
kubectl top pods -n flappy-fun-dev
```

## Suggested Next Learning Order

1. Create the two EC2 instances
2. Install `containerd`
3. Install `kubeadm`, `kubelet`, and `kubectl`
4. Initialize the control plane
5. Join the worker
6. Install Calico
7. Deploy the app using the YAML manifests
8. Install Metrics Server
9. Test HPA
10. Install NGINX Ingress Controller
11. Later add ArgoCD
12. Later add Prometheus and Grafana

## Notes

This guide is based on current official Kubernetes docs for `kubeadm` installation and cluster creation:

1. [Installing kubeadm](https://kubernetes.io/docs/setup/production-environment/tools/kubeadm/install-kubeadm/)
2. [Creating a cluster with kubeadm](https://kubernetes.io/docs/setup/production-environment/tools/kubeadm/create-cluster-kubeadm/)
3. [Container runtimes](https://kubernetes.io/docs/setup/production-environment/container-runtimes/)
