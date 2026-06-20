# Hosting — Azure Linux VM

Source: https://docs.openclaw.ai/hosting/azure
Applies to: OpenClaw (Fractera is lighter — same steps work with less RAM/disk)

---

## What You Will Do

- Create Azure networking (VNet, subnets, NSG) via Azure CLI
- Apply NSG rules — VM SSH allowed only from Azure Bastion
- Use Azure Bastion for SSH (no public IP on VM)
- Install OpenClaw / Fractera
- Verify the Gateway

---

## Prerequisites

- Azure subscription with permission to create compute + network resources
- Azure CLI installed
- SSH key pair
- ~20–30 minutes

---

## Step 1 — Sign In

```bash
az login
az extension add -n ssh   # required for Bastion native SSH tunneling
```

---

## Step 2 — Register Resource Providers (one-time)

```bash
az provider register --namespace Microsoft.Compute
az provider register --namespace Microsoft.Network

# Verify (wait until both show "Registered")
az provider show --namespace Microsoft.Compute --query registrationState -o tsv
az provider show --namespace Microsoft.Network --query registrationState -o tsv
```

---

## Step 3 — Set Variables

```bash
RG="rg-openclaw"
LOCATION="westus2"
VNET_NAME="vnet-openclaw"
VNET_PREFIX="10.40.0.0/16"
VM_SUBNET_NAME="snet-openclaw-vm"
VM_SUBNET_PREFIX="10.40.2.0/24"
BASTION_SUBNET_PREFIX="10.40.1.0/26"
NSG_NAME="nsg-openclaw-vm"
VM_NAME="vm-openclaw"
ADMIN_USERNAME="openclaw"
BASTION_NAME="bas-openclaw"
BASTION_PIP_NAME="pip-openclaw-bastion"
```

Note: Bastion subnet must be at least /26.

---

## Step 4 — SSH Key

```bash
# Use existing key
SSH_PUB_KEY="$(cat ~/.ssh/id_ed25519.pub)"

# Or generate new key
ssh-keygen -t ed25519 -a 100 -f ~/.ssh/id_ed25519 -C "you@example.com"
SSH_PUB_KEY="$(cat ~/.ssh/id_ed25519.pub)"
```

---

## Step 5 — VM Size

```bash
VM_SIZE="Standard_B2as_v2"
OS_DISK_SIZE_GB=64

# List available sizes in your region
az vm list-skus --location "${LOCATION}" --resource-type virtualMachines -o table

# Check quota
az vm list-usage --location "${LOCATION}" -o table
```

---

## Deploy Resources

### Resource Group

```bash
az group create -n "${RG}" -l "${LOCATION}"
```

### NSG (SSH only from Bastion)

```bash
az network nsg create -g "${RG}" -n "${NSG_NAME}" -l "${LOCATION}"

# Allow SSH from Bastion subnet only
az network nsg rule create -g "${RG}" --nsg-name "${NSG_NAME}" \
  -n AllowSshFromBastionSubnet --priority 100 \
  --access Allow --direction Inbound --protocol Tcp \
  --source-address-prefixes "${BASTION_SUBNET_PREFIX}" \
  --destination-port-ranges 22

# Deny SSH from internet
az network nsg rule create -g "${RG}" --nsg-name "${NSG_NAME}" \
  -n DenyInternetSsh --priority 110 \
  --access Deny --direction Inbound --protocol Tcp \
  --source-address-prefixes Internet --destination-port-ranges 22

# Deny SSH from VNet
az network nsg rule create -g "${RG}" --nsg-name "${NSG_NAME}" \
  -n DenyVnetSsh --priority 120 \
  --access Deny --direction Inbound --protocol Tcp \
  --source-address-prefixes VirtualNetwork --destination-port-ranges 22
```

### VNet + Subnets

```bash
az network vnet create -g "${RG}" -n "${VNET_NAME}" -l "${LOCATION}" \
  --address-prefixes "${VNET_PREFIX}" \
  --subnet-name "${VM_SUBNET_NAME}" \
  --subnet-prefixes "${VM_SUBNET_PREFIX}"

az network vnet subnet update -g "${RG}" --vnet-name "${VNET_NAME}" \
  -n "${VM_SUBNET_NAME}" --nsg "${NSG_NAME}"

az network vnet subnet create -g "${RG}" --vnet-name "${VNET_NAME}" \
  -n AzureBastionSubnet --address-prefixes "${BASTION_SUBNET_PREFIX}"
```

### VM (no public IP)

```bash
az vm create -g "${RG}" -n "${VM_NAME}" -l "${LOCATION}" \
  --image "Canonical:ubuntu-24_04-lts:server:latest" \
  --size "${VM_SIZE}" \
  --os-disk-size-gb "${OS_DISK_SIZE_GB}" \
  --storage-sku StandardSSD_LRS \
  --admin-username "${ADMIN_USERNAME}" \
  --ssh-key-values "${SSH_PUB_KEY}" \
  --vnet-name "${VNET_NAME}" \
  --subnet "${VM_SUBNET_NAME}" \
  --public-ip-address "" \
  --nsg ""
```

### Azure Bastion (Standard SKU, tunneling enabled)

```bash
az network public-ip create -g "${RG}" -n "${BASTION_PIP_NAME}" -l "${LOCATION}" \
  --sku Standard --allocation-method Static

az network bastion create -g "${RG}" -n "${BASTION_NAME}" -l "${LOCATION}" \
  --vnet-name "${VNET_NAME}" \
  --public-ip-address "${BASTION_PIP_NAME}" \
  --sku Standard --enable-tunneling true
```

Bastion provisioning: 5–30 minutes depending on region.

---

## Install (in VM shell)

### SSH via Bastion

```bash
VM_ID="$(az vm show -g "${RG}" -n "${VM_NAME}" --query id -o tsv)"

az network bastion ssh \
  --name "${BASTION_NAME}" --resource-group "${RG}" \
  --target-resource-id "${VM_ID}" \
  --auth-type ssh-key --username "${ADMIN_USERNAME}" \
  --ssh-key ~/.ssh/id_ed25519
```

### Install OpenClaw (or Fractera)

```bash
# OpenClaw
curl -fsSL https://openclaw.ai/install.sh -o /tmp/install.sh
bash /tmp/install.sh
rm -f /tmp/install.sh

# Fractera (same pattern — replace with Fractera install.sh when ready)
curl -fsSL https://raw.githubusercontent.com/Fractera/Agent-Engineering-Infrastructure/main/install.sh | bash
```

### Verify

```bash
openclaw gateway status
# or for Fractera:
pm2 status
```

---

## Cost

| Resource | Approx cost/month |
|---|---|
| Azure Bastion Standard | ~$140 |
| VM Standard_B2as_v2 | ~$55 |
| **Total** | **~$195** |

### Cost Reduction

```bash
# Deallocate VM when not in use (stops compute billing)
az vm deallocate -g "${RG}" -n "${VM_NAME}"
az vm start -g "${RG}" -n "${VM_NAME}"   # restart later
```

- Delete Bastion when not needed, recreate when you need SSH
- Use Basic Bastion SKU (~$38/month) if you only need Portal SSH (no CLI tunneling)

---

## Cleanup

```bash
az group delete -n "${RG}" --yes --no-wait
```

---

## Fractera Notes

- Fractera needs less RAM than OpenClaw — `Standard_B1ms` (1 vCPU, 2 GB) likely enough
- Same Nginx + PM2 setup as documented in Fractera README
- Port 3000 (app) + 3300 (media) need to be opened in NSG if exposing publicly
- HTTPS via Let's Encrypt works the same as standard Linux VPS
