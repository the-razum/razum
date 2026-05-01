# razum-testnet-1 — single-node testnet

Live RPC:  https://airazum.com/chain-rpc/status
Live REST: https://airazum.com/chain-api/cosmos/base/tendermint/v1beta1/blocks/latest

## Components on VPS

- Binary:  /usr/local/bin/inferenced  (== /usr/local/bin/razumd)
- Home:    /opt/razum-chain/data
- Service: systemd razumd.service (auto-restart)
- Logs:    /var/log/razumd.log /var/log/razumd.err.log
- Secrets: /opt/razum-chain/SECRETS.md (mode 600)
- Reinit:  bash /opt/razum-chain/scripts/init-testnet.sh

## chain_id
razum-testnet-1

## denoms
- nrazum  (base)        1 nrazum = 10^-9 RZM
- urzm    (10^3 nrazum)
- mrzm    (10^6 nrazum)
- rzm     (10^9 nrazum) — display

## Public endpoints
RPC:  https://airazum.com/chain-rpc/
REST: https://airazum.com/chain-api/

## Local endpoints
RPC:  127.0.0.1:26657
P2P:  0.0.0.0:26656
REST: 127.0.0.1:1317
gRPC: 127.0.0.1:9090
