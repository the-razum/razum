#!/usr/bin/env bash
# Reproducible single-node init for razum-testnet-1
# Usage: bash init-testnet.sh   (must run as root)
set -euo pipefail

INF_HOME=${INF_HOME:-/opt/razum-chain/data}
CHAIN_ID=${CHAIN_ID:-razum-testnet-1}
DENOM=nrazum

systemctl stop razumd 2>/dev/null || true
rm -rf "$INF_HOME"

inferenced init razum-genesis --chain-id $CHAIN_ID --default-denom $DENOM --home $INF_HOME
inferenced keys add validator      --keyring-backend test --home $INF_HOME 2>&1 | tail -5
inferenced keys add ml-operational --keyring-backend test --home $INF_HOME 2>&1 | tail -5

ADDR=$(inferenced keys show validator     -a --keyring-backend test --home $INF_HOME)
ML=$(inferenced keys show ml-operational -a --keyring-backend test --home $INF_HOME)
PUB=$(inferenced comet show-validator --home $INF_HOME | python3 -c 'import sys,json;print(json.load(sys.stdin)["key"])')

inferenced genesis add-genesis-account $ADDR  1000000000000000000$DENOM --home $INF_HOME
inferenced genesis add-genesis-account $ML    1000000$DENOM           --home $INF_HOME

inferenced genesis gentx validator 100000000000000$DENOM \
    --pubkey $PUB --ml-operational-address $ML \
    --url 'https://airazum.com' --chain-id $CHAIN_ID \
    --keyring-backend test --home $INF_HOME

inferenced genesis collect-gentxs --home $INF_HOME
inferenced genesis patch-genesis  --home $INF_HOME

# patch denom_metadata so x/inference InitHoldingAccounts finds BaseCoin
python3 - << 'PYEOF'
import json
path='$INF_HOME/config/genesis.json'
g=json.load(open(path))
g['app_state']['bank']['denom_metadata']=[{
    'description':'Razum native token',
    'denom_units':[
        {'denom':'nrazum','exponent':0,'aliases':[]},
        {'denom':'urzm','exponent':3,'aliases':[]},
        {'denom':'mrzm','exponent':6,'aliases':[]},
        {'denom':'rzm','exponent':9,'aliases':['RZM']}
    ],
    'base':'nrazum','display':'rzm','name':'Razum','symbol':'RZM',
    'uri':'https://airazum.com','uri_hash':''
}]
json.dump(g,open(path,'w'),indent=2)
PYEOF

inferenced genesis validate --home $INF_HOME

# config tweaks
sed -i 's|laddr = "tcp://127.0.0.1:26657"|laddr = "tcp://0.0.0.0:26657"|' $INF_HOME/config/config.toml
sed -i '/^\[api\]/,/^\[/ s|^enable = false|enable = true|' $INF_HOME/config/app.toml
sed -i 's|^minimum-gas-prices = ""|minimum-gas-prices = "0$DENOM"|' $INF_HOME/config/app.toml

systemctl start razumd
echo 'razumd started'
