# goodname

A full-screen black galaxy with a centered wordmark. Move the pointer to bend nearby stars into a constellation and leave a brief spark trail; click or tap to send a ripple through the starfield. The **motion on/off** control pauses or resumes the animation. The wordmark responds to clicks, and the controls are keyboard accessible.

## Run with Pangolin

This Compose file joins the existing external Docker network named `pangolin_frontend`. Make sure that network exists on the Docker host, then run:

```sh
docker compose up -d --build
```

In Pangolin, configure the resource target as `pangolin_frontend` on port `80` (HTTP). No host port is published; Pangolin reaches the container through the shared Docker network.

If your Pangolin installation uses a different Docker network name, change the `name` under `networks.pangolin_frontend` to the exact network name shown by `docker network ls`.
