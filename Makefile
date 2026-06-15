# Conduit on-prem server helpers. Run from the repo root on the server.
.DEFAULT_GOAL := help

.PHONY: help up down logs ps ca

help: ## Show this help
	@grep -hE '^[a-z-]+:.*?## ' $(MAKEFILE_LIST) | awk -F':.*?## ' '{printf "  \033[36m%-8s\033[0m %s\n", $$1, $$2}'

up: ## Build + start the whole stack
	docker compose up -d --build

down: ## Stop the stack
	docker compose down

logs: ## Tail logs (make logs s=cms to filter)
	docker compose logs -f $(s)

ps: ## Show service status
	docker compose ps

ca: ## Extract the Caddy CA root cert (conduit-ca.crt) for device trust
	docker cp conduit-caddy-1:/data/caddy/pki/authorities/local/root.crt ./conduit-ca.crt
	@echo "Wrote conduit-ca.crt — copy it to pi-image/ and import on operator browsers."
