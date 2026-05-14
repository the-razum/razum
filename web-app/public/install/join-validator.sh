#!/usr/bin/env bash
# Razum AI — join validator (запуск на новой машине партнёра-валидатора)
# Usage: bash join-validator.sh
# Должно быть установлено: go 1.21+, jq, curl
set -euo pipefail

CHAIN_ID=razum-testnet-1
SEED='65B24A96CBB4A8E84287432FCAC9FEEE19AB2AE8@92.255.76.73:26656'
GENESIS_URL=https://airazum.com/chain-api/cosmos/base/tendermint/v1beta1/genesis/
BINARY=https://airazum.com/install/inferenced  # TODO publish binary release
HOME_DIR=$HOME/.inference
MONIKER=${MONIKER:-validator-$(hostname -s)}
DENOM=nrazum

echo "=== Razum validator join — chain $CHAIN_ID ==="
echo "Moniker: $MONIKER"

# 1. Install binary
if ! command -v inferenced > /dev/null; then
    echo "-> downloading binary"
    sudo curl -fL -o /usr/local/bin/inferenced "$BINARY"
    sudo chmod +x /usr/local/bin/inferenced
fi

# 2. Init
inferenced init "$MONIKER" --chain-id $CHAIN_ID --default-denom $DENOM --home $HOME_DIR

# 3. Get genesis
curl -sL "$GENESIS_URL" | jq '.genesis' > $HOME_DIR/config/genesis.json
inferenced genesis validate --home $HOME_DIR

# 4. Set seeds
sed -i.bak "s|^seeds = \"\"|seeds = \"$SEED\"|" $HOME_DIR/config/config.toml

# 5. Configure minimum gas prices
sed -i.bak "s|^minimum-gas-prices = \"\"|minimum-gas-prices = \"0$DENOM\"|" $HOME_DIR/config/app.toml

# 6. Create validator key
inferenced keys add validator --keyring-backend test --home $HOME_DIR
ADDR=$(inferenced keys show validator -a --keyring-backend test --home $HOME_DIR)
echo "Validator address: $ADDR"
echo "Send some testnet RZM to this address via airazum.com/faucet, then run:"
echo "  inferenced tx staking create-validator ... --from validator"

# 7. Setup systemd unit
sudo tee /etc/systemd/system/razumd.service > /dev/null << UNIT
[Unit]
Description=Razum Chain Node
After=network-online.target

[Service]
Type=simple
User=$USER
ExecStart=/usr/local/bin/inferenced start --home $HOME_DIR --log_level info
Restart=on-failure
RestartSec=5
LimitNOFILE=65535

[Install]
WantedBy=multi-user.target
UNIT
sudo systemctl daemon-reload
sudo systemctl enable razumd
sudo systemctl start razumd

echo "=== validator node started ==="
echo "Check sync: curl -s http://localhost:26657/status | jq .result.sync_info"
