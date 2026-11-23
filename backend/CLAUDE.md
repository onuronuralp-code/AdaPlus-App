# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Ada-Plus Backend is a stateless Spring Boot 3.x REST API (Java 21, Gradle) that serves Istanbul island ferry and bus departure schedules. All schedule data is loaded from YAML files at startup — there is no database.

## Common Commands

```bash
# Run the application
./gradlew bootRun --no-daemon

# Build JAR
./gradlew clean bootJar --no-daemon

# Run all tests
./gradlew test --no-daemon

# Run a single test class
./gradlew test --tests "app.adaplus.backend.SomeTest" --no-daemon

# Docker (build and run)
docker-compose up --build
```

## Architecture

### Data Loading (Startup)
- `ScheduleConfig` scans `classpath:schedules/ferries/*.yml` → populates `Map<String, IslandSchedule>` bean
- `BusScheduleConfig` scans `classpath:schedules/buses/*.yml` → populates `Map<String, BusSchedule>` bean
- Keys are normalized origin/route strings (lowercased, trimmed)

### Request Path
```
HTTP Request
  → RateLimitFilter (per-IP token bucket, Bucket4j, 60 req/min)
  → TravelController / IslandBusController
  → TravelService / IslandBusService
      → resolves schedule from in-memory map
      → filters times by day-of-week calendar + current time
      → computes minutesUntil in Europe/Istanbul timezone
  → CacheConfig (Caffeine, 60s TTL, max 200 entries)
  → DepartureDto / BusDepartureDto (JSON response)
```

### API Endpoints
| Endpoint | Key Params |
|---|---|
| `GET /api/v1/travel/ferries/departures` | `from`, `to` (optional), `date`, `limit`, `includeNextDayUntil` |
| `GET /api/v1/travel/buses/departures` | `route`, `stop` (optional), `date`, `limit` |

### Schedule YAML Structure
- **Ferries** (`schedules/ferries/*.yml`): `origin`, `timezone`, `routes[]` — each route has `destinations`, `provider`, `via` (intermediate stops), `calendar` (day-type → list of HH:mm times)
- **Buses** (`schedules/buses/*.yml`): `routeCode`, `routeName`, `direction`, `provider`, `island`, `stops[]`, `calendar`

### Cross-cutting Concerns
- **CORS** (`WebConfig`): Allows `localhost:3000` and `localhost:5173` (Vue/Vite dev), GET + OPTIONS only
- **Rate Limiting** (`RateLimitFilter`): Actuator paths (`/actuator/**`) are exempt
- **Error Handling** (`GlobalExceptionHandler`): Returns consistent JSON for validation errors, type mismatches, missing params
- **Cache** (`CacheConfig`): 60s TTL matches the minutesUntil granularity; cache names declared in `@Cacheable` annotations on service methods

### Key Types
- `IslandSchedule` — ferry schedule record; `routes` contains the full departure grid per day-type
- `BusSchedule` — bus schedule record; `stops` is an ordered list of stop names
- `DepartureDto` — ferry API response: `from`, `to`, `provider`, `via[]`, `time` (HH:mm), `minutesUntil`
- `BusDepartureDto` — bus API response: `routeCode`, `routeName`, `stop`, `time`, `minutesUntil`

## Adding New Schedules

1. Add a new YAML file under `src/main/resources/schedules/ferries/` or `schedules/buses/`
2. Match the structure of existing files in that directory — the config classes use `@ConfigurationProperties` style loading
3. No code changes needed; the config beans load all `*.yml` files in those directories

## Configuration Reference (`application.yml`)

| Key | Default | Purpose |
|---|---|---|
| `rate-limit.requests-per-minute` | 60 | Token bucket refill rate |
| `rate-limit.burst-capacity` | 20 | Max burst tokens |
| `cors.allowed-origins` | localhost:3000, localhost:5173 | Frontend origins |
| `spring.cache.caffeine.spec` | `maximumSize=200,expireAfterWrite=120s` | Cache policy |
