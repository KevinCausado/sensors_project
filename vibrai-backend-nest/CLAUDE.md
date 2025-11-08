# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Node.js IoT backend system for monitoring vibration and temperature sensors using MQTT and Supabase. The system processes real-time sensor data, performs analysis, and manages alerts for industrial monitoring applications.

## Development Commands

### Starting the Application
```bash
npm start          # Production mode (uses start.js launcher with auto-restart)
npm run dev        # Development mode (same as npm start)
```

The application uses a launcher script (`start.js`) that automatically restarts the main service (`src/app.js`) if it crashes.

### Testing Commands
```bash
# Core functionality tests
npm run test:complete     # Complete processing pipeline test
npm run test:temperature  # Temperature conversion and processing tests
npm run test:timestamps   # Timestamp consistency verification
npm run test:batch        # Batch insertion performance tests
npm run test:all          # Run main test suite

# Performance and monitoring
npm run test:performance  # Compare individual vs batch insertion performance
npm run test:monitor      # Monitor real-time database timestamps

# MQTT testing tools
npm run test:mqtt-simulator  # MQTT payload simulation
npm run test:mqtt-analyzer   # Real-time MQTT data analysis
npm run test:mqtt-auth       # MQTT authentication testing
npm run simulator            # MQTT data simulator (mqtt-simulator.js)
npm run analyzer             # Real-time data analyzer

# Sensor utilities
npm run test:sensor       # Get real sensor information from database
```

### Docker Commands
```bash
# Development
docker-compose -f docker-compose.dev.yml up

# Production
docker-compose up -d
```

## Architecture Overview

### Core Service Architecture
The application follows a service-oriented architecture with dependency injection:

- **MainService** (`src/main.service.js`) - Main orchestrator that coordinates all services
- **Application** (`src/app.js`) - Entry point with signal handling and lifecycle management
- **Launcher** (`start.js`) - Process manager with auto-restart capability

### Service Layer (`src/services/`)
- **DatabaseService** - Supabase database operations with optimized batch insertions
- **MqttService** - MQTT broker connection and message handling
- **PayloadService** - Sensor data parsing and validation
- **AnalysisService** - Real-time data analysis and anomaly detection
- **AlertService** - Alert management and notifications
- **ConnectivityService** - Device connectivity monitoring
- **DeviceService** - Device status and battery management

### Data Flow
1. MQTT messages received from `Advantech/#` topics
2. Sensor codes extracted from MQTT topics
3. Payloads processed and validated by PayloadService
4. Sensor data grouped by type (vibration uses optimized batch insertion)
5. Real-time analysis performed for anomaly detection
6. Alerts generated based on analysis results
7. Device connectivity and battery status monitored

### Key Optimizations
- **Batch Insertion**: Vibration data (X,Y,Z axes) inserted as single batch operation (3.1x performance improvement)
- **Timestamp Consistency**: All vibration axes share the same MQTT timestamp
- **Service Isolation**: Each service has clear responsibilities and dependencies
- **Connection Resilience**: Auto-reconnection for MQTT and database connections

## Environment Configuration

Required environment variables (defined in `.env`):
- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key
- `MQTT_BROKER_URL` - MQTT broker URL (defaults to mqtt://direct.miobox.io)
- `MQTT_USERNAME` - MQTT broker username (optional, for authenticated connections)
- `MQTT_PASSWORD` - MQTT broker password (optional, for authenticated connections)
- `NODE_ENV` - Environment mode (development/production)
- `TZ` - Timezone (defaults to America/Santiago)

## Database Schema

### Key Tables
- `vibration_readings` - Stores vibration sensor data with multiple metrics per record
- `temperature_readings` - Stores temperature sensor data
- `sensors` - Sensor metadata and configuration
- `alerts` - Alert history and status
- `device_status` - Device connectivity and battery information

### Data Types
- **Vibration**: Multi-axis data (X,Y,Z) with metrics like OAVelocity, displacement, acceleration
- **Temperature**: Single value readings in Celsius
- **Device Info**: Battery level, connectivity status, last communication

## Testing Strategy

The project includes extensive testing in the `tests/` directory:

### Functional Tests
- Complete processing pipeline validation
- Temperature conversion accuracy
- Timestamp consistency verification
- Database insertion integrity

### Performance Tests
- Batch vs individual insertion comparisons
- Real-time processing benchmarks
- Memory and CPU usage monitoring

### Integration Tests
- MQTT message processing end-to-end
- Database connectivity and operations
- Service interaction validation

## Code Patterns

### Service Dependencies
Services use constructor injection for dependencies. Example pattern:
```javascript
constructor() {
  this.databaseService = new DatabaseService();
  this.alertService = new AlertService(this.databaseService);
  // ... other services with dependencies
}
```

### Error Handling
- All async operations wrapped in try-catch blocks
- Graceful degradation with fallback mechanisms
- Comprehensive logging with service prefixes ([MQTT], [READINGS], etc.)

### Data Processing
- Vibration data processed in batches for performance
- Temperature data processed individually
- Validation at payload and service levels
- Type-specific analysis and alerting

## Key Files to Understand

- `src/main.service.js` - Central orchestration logic
- `src/services/payload.service.js` - Data parsing and validation
- `src/services/database.service.js` - Database operations and batch processing
- `tests/test-complete-processing.js` - End-to-end processing validation
- `docs/DOCUMENTACION_ARQUITECTURA.md` - Detailed architecture documentation