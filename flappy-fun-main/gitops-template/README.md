# GitOps Template

This folder is a starter structure for the separate GitOps repository that ArgoCD should watch.

## Layout

1. `apps/flappy-fun/base`
2. `apps/flappy-fun/overlays/dev`
3. `apps/flappy-fun/overlays/staging`
4. `apps/flappy-fun/overlays/prod`
5. `argocd/flappy-fun-dev-application.yaml`

## How Jenkins should update image tags

Jenkins should update the `newTag` value in:

```text
apps/flappy-fun/overlays/dev/kustomization.yaml
```

Example image block:

```yaml
images:
  - name: docker.io/maazjazelle/flappy-fun
    newTag: 123-abcdef0
```

ArgoCD can then sync the `dev` overlay from Git.
