.PHONY: run-backend run-app test-api clean

# Run backend server
run-backend:
	cd backend && go run .

# Run Flutter app
run-app:
	flutter run

# Test API endpoints
test-api:
	@echo "Testing API endpoints..."
	@curl -s http://localhost:8080/api/health | echo "Health: $$(cat)"
	@echo "\nPark boundaries (first 100 chars):"
	@curl -s http://localhost:8080/api/park-boundaries | head -c 100
	@echo "\n\nAll tests completed!"

# Clean build artifacts
clean:
	cd backend && go clean
	flutter clean