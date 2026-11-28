#!/usr/bin/env bash
set -euo pipefail

cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.."
if [[ $# -gt 1 || ( $# -eq 1 && "$1" != '--remaining' ) ]]; then
  echo 'Usage: bash scripts/verify-security-audit-local.sh [--remaining]' >&2
  exit 2
fi
command -v docker >/dev/null || { echo 'Docker is required for the disposable database check.' >&2; exit 1; }
test_container_id=''
cleanup_security_fixture() {
  # Remove only the exact container created by this invocation, never another named service.
  if [[ "$test_container_id" =~ ^[a-f0-9]{64}$ ]]; then
    docker rm --force --volumes "$test_container_id" >/dev/null 2>&1 || true
  fi
}
trap cleanup_security_fixture EXIT

echo 'Starting a disposable localhost MongoDB replica set on port 27019 (mongo:8).'
test_container_id=$(docker run --detach --publish 127.0.0.1:27019:27017 mongo:8 --replSet rs0 --bind_ip_all)
fixture_ready='false'
for attempt in {1..45}; do
  if docker exec "$test_container_id" mongosh --quiet --eval 'db.adminCommand({ping:1})' >/dev/null 2>&1; then
    fixture_ready='true'
    break
  fi
  sleep 1
done
[[ "$fixture_ready" == 'true' ]] || { echo 'The disposable MongoDB fixture did not start.' >&2; exit 1; }
docker exec "$test_container_id" mongosh --quiet --eval 'rs.initiate({_id:"rs0",members:[{_id:0,host:"127.0.0.1:27017"}]})' >/dev/null
fixture_ready='false'
for attempt in {1..45}; do
  if docker exec "$test_container_id" mongosh --quiet --eval 'if(!db.hello().isWritablePrimary) quit(1)' >/dev/null 2>&1; then
    fixture_ready='true'
    break
  fi
  sleep 1
done
[[ "$fixture_ready" == 'true' ]] || { echo 'The disposable replica set did not become primary.' >&2; exit 1; }

if [[ "${1:-}" != '--remaining' ]]; then
  echo 'Checking lint.'
  npm run lint
  echo 'Checking the complete security regression suite.'
  npm run test:security
fi
echo 'Checking real MongoDB transactions and the security history query.'
SECURITY_AUDIT_TEST_URI='mongodb://127.0.0.1:27019/?replicaSet=rs0&directConnection=true' npm run test:security:integration
echo 'Checking the production build.'
npm run build
echo 'SECURITY AUDIT VERIFICATION PASSED. No commit, push or deployment was performed.'
