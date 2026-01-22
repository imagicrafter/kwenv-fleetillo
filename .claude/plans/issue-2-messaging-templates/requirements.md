# Requirements: Issue #2 - Messaging Templates

## Introduction

The dispatch system currently uses file-based templates for Telegram and email messages. Fleet managers need the ability to customize message content without code changes. This feature introduces database-backed templates with a UI for editing and per-channel customization.

## Glossary

- **Template**: A reusable message format with variable placeholders
- **Variable**: A placeholder (e.g., `{{driver_name}}`) that gets replaced with actual values at send time
- **Channel**: The delivery method (Telegram, Email, SMS)
- **Template Engine**: The service responsible for loading templates and substituting variables

## Requirements

### Requirement 1: Template Storage

**User Story:** As a fleet manager, I want templates stored in the database, so that I can customize them without code deployments.

#### Acceptance Criteria
1. THE system SHALL store message templates in a `message_templates` database table
2. EACH template SHALL have: name, channel (telegram/email/sms), subject (for email), body, variables list
3. THE system SHALL support multiple templates per channel (e.g., dispatch_request, dispatch_confirmed)
4. THE system SHALL seed default templates on initial deployment
5. Templates SHALL be unique by (name, channel) combination

### Requirement 2: Template Variables

**User Story:** As a fleet manager, I want to use placeholders in templates, so that messages include dynamic content.

#### Acceptance Criteria
1. THE system SHALL use Handlebars-style syntax: `{{variable_name}}`
2. THE system SHALL support standard variables: driver_name, customer_name, pickup_time, pickup_address, dropoff_address, booking_reference
3. THE system SHALL validate that all required variables are provided at render time
4. IF a variable is missing, THEN THE system SHALL log a warning and use empty string
5. THE template record SHALL store a list of available variables for UI display

### Requirement 3: Template CRUD API

**User Story:** As an admin, I want API endpoints to manage templates, so that the UI can create/edit/delete them.

#### Acceptance Criteria
1. THE system SHALL provide endpoints for: list, get, create, update, delete templates
2. THE create/update endpoints SHALL validate template syntax
3. THE system SHALL prevent deletion of templates that are currently in use
4. THE API SHALL support filtering by channel

### Requirement 4: Template Editing UI

**User Story:** As a fleet manager, I want a UI to edit templates, so that I can customize messages easily.

#### Acceptance Criteria
1. THE UI SHALL display a list of templates grouped by channel
2. THE UI SHALL provide a rich text editor for template body
3. THE UI SHALL display available variables with click-to-insert functionality
4. THE UI SHALL show a live preview with sample data
5. THE UI SHALL validate template syntax before saving

### Requirement 5: Template Engine Integration

**User Story:** As a system, I want the dispatch service to use database templates, so that customizations take effect immediately.

#### Acceptance Criteria
1. THE dispatch service SHALL load templates from database instead of files
2. THE system SHALL cache templates with a configurable TTL
3. THE system SHALL fall back to file-based templates if database is unavailable
4. WHEN a template is updated, THE cache SHALL be invalidated

### Requirement 6: Template History

**User Story:** As a fleet manager, I want to see template change history, so that I can track who changed what.

#### Acceptance Criteria
1. THE system SHALL log template changes in an activity log
2. THE log SHALL include: timestamp, user, action (create/update/delete), template name
3. THE system SHALL store previous template version on update (for rollback)

## Non-Functional Requirements

- **Performance**: Template rendering should complete within 50ms
- **Availability**: Template loading should not block dispatch if database is slow
- **Compatibility**: Existing file-based templates should continue to work as defaults
