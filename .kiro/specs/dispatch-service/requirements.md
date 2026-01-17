# Requirements Document

## Introduction

The OptiRoute Dispatch Service is a standalone microservice that sends route assignments to drivers via multiple communication channels. It integrates with the existing OptiRoute route optimization platform by sharing the same Supabase database and provides a REST API for dispatch operations. The MVP scope includes Telegram and Email channels with an extensible adapter architecture for future channels (SMS, Push notifications).

## Glossary

- **Dispatch_Service**: The standalone microservice responsible for sending route assignments to drivers
- **Channel_Adapter**: A pluggable component that handles communication with a specific messaging channel (Telegram, Email, SMS, etc.)
- **Dispatch_Request**: A request to send route assignment information to one or more drivers
- **Channel_Dispatch**: An individual attempt to send a dispatch message through a specific channel
- **Dispatch_Orchestrator**: The core component that coordinates channel selection, message formatting, and delivery
- **Channel_Router**: The component that determines which channel(s) to use for a dispatch based on configuration and driver preferences
- **Template_Engine**: The component that renders message templates with route/driver/booking data
- **OptiRoute**: The main route optimization application that calls the Dispatch Service
- **Driver**: A person who receives route assignments and performs deliveries/services
- **Route**: A planned sequence of stops/bookings assigned to a vehicle and driver

## Requirements

### Requirement 1: Single Dispatch Operation

**User Story:** As an OptiRoute operator, I want to dispatch a single route assignment to a driver, so that the driver receives their route details through their preferred communication channel.

#### Acceptance Criteria

1. WHEN a POST request is made to /api/v1/dispatch with a valid route_id and driver_id, THE Dispatch_Service SHALL create a dispatch record and initiate message delivery
2. WHEN a dispatch request includes a channel override, THE Dispatch_Service SHALL use the specified channel instead of the driver's preference
3. WHEN a dispatch request does not specify a channel, THE Dispatch_Service SHALL use the driver's preferred_channel if set, otherwise use the default channel (telegram)
4. WHEN a dispatch is created, THE Dispatch_Service SHALL return a dispatch_id and initial status immediately without waiting for delivery completion
5. IF the route_id or driver_id does not exist, THEN THE Dispatch_Service SHALL return a 404 error with a descriptive message
6. IF the request body is malformed or missing required fields, THEN THE Dispatch_Service SHALL return a 400 error with validation details

### Requirement 2: Batch Dispatch Operation

**User Story:** As an OptiRoute operator, I want to dispatch multiple route assignments in a single request, so that I can efficiently notify all drivers for a day's routes.

#### Acceptance Criteria

1. WHEN a POST request is made to /api/v1/dispatch/batch with an array of dispatch items, THE Dispatch_Service SHALL process each item and return results for all dispatches
2. WHEN processing a batch, THE Dispatch_Service SHALL process items concurrently for efficiency
3. WHEN one item in a batch fails validation, THE Dispatch_Service SHALL continue processing other items and include the failure in the response
4. WHEN a batch dispatch completes, THE Dispatch_Service SHALL return an array of results with dispatch_id and status for each item
5. IF the batch array is empty, THEN THE Dispatch_Service SHALL return a 400 error indicating no items to process
6. THE Dispatch_Service SHALL limit batch size to a maximum of 100 items per request

### Requirement 3: Dispatch Status Retrieval

**User Story:** As an OptiRoute operator, I want to check the status of a dispatch, so that I can verify whether the driver received their route assignment.

#### Acceptance Criteria

1. WHEN a GET request is made to /api/v1/dispatch/:id, THE Dispatch_Service SHALL return the dispatch record with current status and channel delivery details
2. WHEN a dispatch has multiple channel attempts, THE Dispatch_Service SHALL include status for each channel_dispatch in the response
3. IF the dispatch_id does not exist, THEN THE Dispatch_Service SHALL return a 404 error

### Requirement 4: Telegram Channel Adapter

**User Story:** As a driver, I want to receive route assignments via Telegram, so that I get instant notifications on my mobile device.

#### Acceptance Criteria

1. WHEN the Telegram_Adapter sends a message, THE Telegram_Adapter SHALL use the Telegram Bot API to deliver the message to the driver's telegram_chat_id
2. WHEN a message is sent successfully, THE Telegram_Adapter SHALL update the channel_dispatch status to 'delivered' and record the message_id
3. IF the driver does not have a telegram_chat_id configured, THEN THE Telegram_Adapter SHALL return a failure result indicating missing configuration
4. IF the Telegram API returns an error, THEN THE Telegram_Adapter SHALL update the channel_dispatch status to 'failed' and record the error message
5. WHEN formatting a Telegram message, THE Telegram_Adapter SHALL use Markdown formatting for readability
6. THE Telegram_Adapter SHALL include route date, start time, total stops, and a summary of bookings in the message

### Requirement 5: Email Channel Adapter

**User Story:** As a driver, I want to receive route assignments via email, so that I have a detailed record of my route with full booking information.

#### Acceptance Criteria

1. WHEN the Email_Adapter sends a message, THE Email_Adapter SHALL use the configured email provider (SendGrid or Resend) to deliver the email to the driver's email address
2. WHEN an email is sent successfully, THE Email_Adapter SHALL update the channel_dispatch status to 'delivered' and record the provider message_id
3. IF the driver does not have an email address configured, THEN THE Email_Adapter SHALL return a failure result indicating missing configuration
4. IF the email provider returns an error, THEN THE Email_Adapter SHALL update the channel_dispatch status to 'failed' and record the error message
5. WHEN formatting an email, THE Email_Adapter SHALL use HTML formatting with a professional template
6. THE Email_Adapter SHALL include complete route details: route name, date, vehicle info, and full list of bookings with addresses and times

### Requirement 6: Channel Selection Logic

**User Story:** As a system administrator, I want the dispatch service to intelligently select communication channels, so that drivers receive messages through their preferred method with fallback options.

#### Acceptance Criteria

1. WHEN determining which channel to use, THE Channel_Router SHALL apply priority: request override > driver preference > system default
2. WHEN a dispatch request specifies multi_channel: true, THE Channel_Router SHALL send to all available channels for the driver concurrently
3. WHEN the primary channel fails and fallback_enabled is true for the driver, THE Channel_Router SHALL attempt delivery through the next available channel
4. THE Channel_Router SHALL only attempt channels for which the driver has valid configuration (telegram_chat_id for Telegram, email for Email)

### Requirement 7: Message Template System

**User Story:** As a system administrator, I want customizable message templates, so that dispatch messages can be tailored for different channels and use cases.

#### Acceptance Criteria

1. THE Template_Engine SHALL support variable substitution using {{variable}} syntax
2. THE Template_Engine SHALL provide access to route, driver, vehicle, and bookings data in templates
3. WHEN a template variable is missing or null, THE Template_Engine SHALL replace it with an empty string or configurable default
4. THE Template_Engine SHALL support channel-specific templates (telegram.md, email.html)
5. WHEN rendering a template, THE Template_Engine SHALL parse the template and substitute all variables with actual values

### Requirement 8: Database Schema for Dispatch Tracking

**User Story:** As a system administrator, I want dispatch operations tracked in the database, so that I can audit delivery history and troubleshoot issues.

#### Acceptance Criteria

1. THE Dispatch_Service SHALL store dispatch records in a 'dispatches' table with: id, route_id, driver_id, status, requested_channels, created_at, updated_at
2. THE Dispatch_Service SHALL store individual channel attempts in a 'channel_dispatches' table with: id, dispatch_id, channel, status, provider_message_id, error_message, sent_at, delivered_at
3. WHEN a dispatch status changes, THE Dispatch_Service SHALL update the dispatches table status and updated_at timestamp
4. WHEN a channel delivery completes or fails, THE Dispatch_Service SHALL update the corresponding channel_dispatches record

### Requirement 9: API Authentication

**User Story:** As a system administrator, I want the dispatch API secured with API key authentication, so that only authorized services can send dispatches.

#### Acceptance Criteria

1. WHEN a request is made without an API key header, THE Dispatch_Service SHALL return a 401 Unauthorized error
2. WHEN a request includes an invalid API key, THE Dispatch_Service SHALL return a 401 Unauthorized error
3. WHEN a request includes a valid API key in the X-API-Key header, THE Dispatch_Service SHALL process the request
4. THE Dispatch_Service SHALL support multiple API keys for different client applications

### Requirement 10: Health Check Endpoint

**User Story:** As a DevOps engineer, I want a health check endpoint, so that I can monitor the dispatch service availability and dependencies.

#### Acceptance Criteria

1. WHEN a GET request is made to /api/v1/health, THE Dispatch_Service SHALL return service health status
2. THE health response SHALL include: status (healthy/degraded/unhealthy), database connectivity, and channel adapter availability
3. WHEN all dependencies are available, THE Dispatch_Service SHALL return status 'healthy' with HTTP 200
4. WHEN any critical dependency is unavailable, THE Dispatch_Service SHALL return status 'unhealthy' with HTTP 503

### Requirement 11: Driver Dispatch Preferences

**User Story:** As a driver, I want to configure my dispatch notification preferences, so that I receive route assignments through my preferred channel.

#### Acceptance Criteria

1. THE Dispatch_Service SHALL read driver preferences from the existing drivers table: telegram_chat_id, email, preferred_channel, fallback_enabled
2. WHEN preferred_channel is not set for a driver, THE Dispatch_Service SHALL default to 'telegram'
3. WHEN fallback_enabled is true and the primary channel fails, THE Dispatch_Service SHALL attempt the next available channel

### Requirement 12: Error Handling and Logging

**User Story:** As a DevOps engineer, I want comprehensive error handling and logging, so that I can diagnose and resolve issues quickly.

#### Acceptance Criteria

1. WHEN an error occurs during dispatch processing, THE Dispatch_Service SHALL log the error with context (dispatch_id, channel, error details)
2. THE Dispatch_Service SHALL use structured JSON logging for all log entries
3. WHEN a channel adapter fails, THE Dispatch_Service SHALL not crash but record the failure and continue processing
4. THE Dispatch_Service SHALL include correlation IDs in logs for request tracing
