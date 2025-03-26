# 1) Use an official Node 18 base image
FROM node:18

# 2) Install packages needed for Tailscale
RUN apt-get update && apt-get install -y ca-certificates iptables curl --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# 3) Download and install Tailscale (for amd64)
RUN curl -fsSL https://pkgs.tailscale.com/stable/tailscale_1.38.4_amd64.tgz -o /tmp/tailscale.tgz \
    && tar xzf /tmp/tailscale.tgz -C /tmp \
    && mv /tmp/tailscale_1.38.4_amd64/tailscale /usr/local/bin/tailscale \
    && mv /tmp/tailscale_1.38.4_amd64/tailscaled /usr/local/bin/tailscaled \
    && rm -rf /tmp/tailscale*

# 4) Create and use the /app directory for your Node.js code
WORKDIR /app

# 5) Copy package.json and package-lock.json (if present)
COPY package*.json ./

# 6) Install production dependencies
RUN npm install --production

# 7) Copy the rest of your application code
COPY . .

# 8) Expose the port your Node.js app uses (e.g. 8080)
EXPOSE 8080

# 9) Force Node to route all outgoing connections through the local SOCKS5 proxy on port 1055
ENV ALL_PROXY=socks5h://127.0.0.1:1055

# 10) Run Tailscale in userspace-networking mode, start a SOCKS5 proxy, then run your Node.js server
CMD ["/bin/bash", "-c", "\
  /usr/local/bin/tailscaled \
    --tun=userspace-networking \
    --socks5-server=127.0.0.1:1055 \
    --state=/tmp/tailscaled.state \
    --socket=/tmp/tailscaled.sock & \
  sleep 2 && \
  /usr/local/bin/tailscale up \
    --auth-key=${TAILSCALE_AUTH_KEY} \
    --hostname=railway-app && \
  node server.js \
"]
