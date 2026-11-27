#!/bin/bash
# Smoke test : verifie que l'application demarre et repond.
# Code retour : 0 = PASSED, 1 = FAILED

BACKEND_URL="${BACKEND_URL:-http://localhost:3000}"
FRONTEND_URL="${FRONTEND_URL:-http://localhost:8090}"
REPORT_DIR="reports"
REPORT="$REPORT_DIR/${REPORT_NAME:-smoke-result.txt}"
FAILED=0

mkdir -p "$REPORT_DIR"
: > "$REPORT"

check() {
  name="$1"; url="$2"; expected="$3"
  code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 "$url")
  if [ "$code" = "$expected" ]; then
    status="PASSED"
  else
    status="FAILED"; FAILED=1
  fi
  echo "[$status] $name -> $url (HTTP $code, attendu $expected)" | tee -a "$REPORT"
}

echo "== Attente du backend ==" | tee -a "$REPORT"
for i in $(seq 1 30); do
  if curl -s -f --max-time 3 "$BACKEND_URL/health" > /dev/null; then break; fi
  echo "Backend pas encore pret ($i/30)" | tee -a "$REPORT"
  sleep 2
done

echo "== Tests ==" | tee -a "$REPORT"
check "Backend /health"            "$BACKEND_URL/health"        200
check "Backend /version"           "$BACKEND_URL/version"       200
check "Backend API formations"     "$BACKEND_URL/api/formations" 200
check "Frontend page d'accueil"    "$FRONTEND_URL/"             200
check "Frontend -> backend (nginx)" "$FRONTEND_URL/health"      200

body=$(curl -s --max-time 5 "$BACKEND_URL/health")
if echo "$body" | grep -q '"database":"UP"'; then
  echo "[PASSED] Base de donnees UP" | tee -a "$REPORT"
else
  echo "[FAILED] Base de donnees DOWN (reponse: $body)" | tee -a "$REPORT"
  FAILED=1
fi

if [ "$FAILED" -eq 0 ]; then
  echo "SMOKE RESULT: PASSED" | tee -a "$REPORT"
  exit 0
else
  echo "SMOKE RESULT: FAILED" | tee -a "$REPORT"
  exit 1
fi