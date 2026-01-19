# Tasks: Issue #8 - Security Audit January 2026

## Overview

This task list implements the security audit defined in requirements.md and design.md. The audit follows a four-phase approach: automated scanning, manual review, dynamic testing, and reporting. Tasks are organized to execute phases sequentially with checkpoints for review.

## Tasks

- [ ] 0. Create Feature Branch
  - Create `issue/8-security-audit`
  - Create findings directory structure: `.claude/plans/issue-8-security-audit/findings/`
  - Create evidence directory: `.claude/plans/issue-8-security-audit/evidence/`

---

### Phase 1: Automated Scanning

- [ ] 1. Dependency Vulnerability Scanning
  - [ ] 1.1 Run npm audit on web-launcher
    - Execute `cd web-launcher && npm audit --json > ../evidence/npm-audit-web-launcher.json`
    - Document all critical and high vulnerabilities
    - _Requirements: 11.1, 11.2_
  - [ ] 1.2 Run npm audit on main application
    - Execute `npm audit --json > evidence/npm-audit-main.json`
    - Document all critical and high vulnerabilities
    - _Requirements: 11.1_
  - [ ] 1.3 Run pip-audit on dispatch-service
    - Execute `cd dispatch-service && pip-audit --format json > ../evidence/pip-audit.json`
    - Document all critical and high vulnerabilities
    - _Requirements: 11.2_
  - [ ] 1.4 Verify lock files are committed
    - Check `package-lock.json` and `requirements.txt` exist
    - _Requirements: 11.5_

- [ ] 2. Checkpoint - Automated Scanning Complete
  - Review dependency vulnerability findings
  - Create findings documents for Critical/High dependency issues
  - Decide whether to proceed or fix blocking issues first

---

### Phase 2: Manual Code Review

- [ ] 3. Authentication Security Review
  - [ ] 3.1 Audit session management in web-launcher
    - Review session secret configuration
    - Verify minimum entropy (32 bytes)
    - Check fail-fast behavior for missing secret
    - _Requirements: 1.1, 1.5_
  - [ ] 3.2 Audit cookie configuration
    - Verify HttpOnly, Secure, SameSite attributes
    - Document any deviations
    - _Requirements: 1.4_
  - [ ] 3.3 Review API key validation
    - Check for constant-time comparison usage
    - Review dispatch-service API key handling
    - _Requirements: 1.6_
  - [ ] 3.4 Audit credential logging
    - Search codebase for password/token logging
    - Verify debug mode doesn't expose credentials
    - _Requirements: 1.3_

- [ ] 4. Authorization Security Review
  - [ ] 4.1 Audit Supabase key usage
    - Document anon key vs service role key usage
    - Verify service role is only used for admin operations
    - _Requirements: 2.1, 2.3_
  - [ ] 4.2 Review RLS policies
    - List all Supabase tables
    - Verify RLS is enabled on each
    - Document policy coverage
    - _Requirements: 2.2_
  - [ ] 4.3 Audit public endpoints
    - Review Telegram webhook security
    - Review health check endpoints
    - Verify no sensitive data exposure
    - _Requirements: 2.6_
  - [ ] 4.4 Review dispatch-service authorization
    - Verify API key validation before request processing
    - _Requirements: 2.4_

- [ ] 5. Input Validation Review
  - [ ] 5.1 Audit API parameter validation
    - Review all API endpoint handlers
    - Check for type/format validation
    - _Requirements: 3.1_
  - [ ] 5.2 Audit file upload handling
    - Review CSV import functionality
    - Check MIME type validation (reject text/plain)
    - Verify magic byte validation exists
    - _Requirements: 3.2, 3.3_
  - [ ] 5.3 Audit UUID validation
    - Search for UUID parameters in routes
    - Verify format validation before DB queries
    - _Requirements: 3.4_
  - [ ] 5.4 Audit database queries
    - Review for parameterized queries
    - Check for any string concatenation
    - _Requirements: 3.5, 8.1_
  - [ ] 5.5 Audit payload size limits
    - Review body parser configuration
    - Document maximum sizes
    - _Requirements: 3.7_

- [ ] 6. Secrets Management Review
  - [ ] 6.1 Audit .gitignore
    - Verify .env files excluded
    - Verify credential files excluded
    - _Requirements: 5.2_
  - [ ] 6.2 Audit startup logging
    - Check for secrets in startup logs
    - Even masked secrets should not be logged
    - _Requirements: 5.1_
  - [ ] 6.3 Audit error responses
    - Review error handlers
    - Verify no secrets/paths in responses
    - _Requirements: 5.4_
  - [ ] 6.4 Audit API key transmission
    - Review external API calls
    - Verify keys in headers, not query params
    - _Requirements: 5.3_
  - [ ] 6.5 Audit Telegram webhook auth
    - Verify X-Telegram-Bot-Api-Secret-Token validation
    - _Requirements: 5.6_

- [ ] 7. Checkpoint - Manual Review Complete
  - Review all findings from manual review phase
  - Create finding documents for each issue
  - Prioritize by severity

---

### Phase 3: Dynamic Testing & Configuration Review

- [ ] 8. SSRF Testing
  - [ ] 8.1 Test /api/chat endpoint
    - Attempt internal IP access
    - Test redirect following behavior
    - Verify domain whitelist enforcement
    - _Requirements: 4.1, 4.3_
  - [ ] 8.2 Review external request timeouts
    - Verify 30-second maximum timeout
    - _Requirements: 4.2_
  - [ ] 8.3 Review request header handling
    - Verify internal tokens not forwarded
    - _Requirements: 4.5_

- [ ] 9. Security Headers Analysis
  - [ ] 9.1 Analyze CSP headers
    - Capture CSP from running application
    - Check for unsafe-inline in script-src
    - Save to evidence/
    - _Requirements: 6.1_
  - [ ] 9.2 Analyze CORS configuration
    - Review CORS origin settings
    - Check for wildcard in production config
    - _Requirements: 6.2_
  - [ ] 9.3 Verify standard security headers
    - X-Content-Type-Options: nosniff
    - X-Frame-Options: DENY
    - HSTS (production config)
    - _Requirements: 6.3, 6.4, 6.5_

- [ ] 10. File Upload Security Testing
  - [ ] 10.1 Test magic byte validation
    - Attempt to upload mismatched MIME/content
    - Document results
    - _Requirements: 7.1_
  - [ ] 10.2 Review image handling
    - Check for EXIF stripping / re-encoding
    - _Requirements: 7.2_
  - [ ] 10.3 Review filename handling
    - Verify randomized storage names
    - _Requirements: 7.3_
  - [ ] 10.4 Review Supabase bucket policies
    - Verify no public listing
    - _Requirements: 7.4_

- [ ] 11. Rate Limiting Review
  - [ ] 11.1 Review general API rate limiting
    - Document current configuration
    - Compare to 100 req/min recommendation
    - _Requirements: 10.1_
  - [ ] 11.2 Review auth endpoint rate limiting
    - Document current configuration
    - Compare to 5 req/min recommendation
    - _Requirements: 10.2, 1.2_
  - [ ] 11.3 Review upload rate limiting
    - Check for per-user/per-IP limits
    - _Requirements: 10.3_
  - [ ] 11.4 Review request body size limits
    - Document current limits
    - _Requirements: 10.6_

- [ ] 12. Logging & Monitoring Review
  - [ ] 12.1 Audit authentication logging
    - Verify success/failure logging
    - _Requirements: 9.1_
  - [ ] 12.2 Audit sensitive field redaction
    - Check log sanitization
    - _Requirements: 9.2_
  - [ ] 12.3 Audit error logging
    - Verify no stack traces to client in production
    - _Requirements: 9.3_

- [ ] 13. Checkpoint - Dynamic Testing Complete
  - Compile all findings from Phase 3
  - Update severity classifications
  - Prepare for reporting phase

---

### Phase 4: Reporting & Remediation Tracking

- [ ] 14. Create Individual Finding Documents
  - [ ] 14.1 Create finding documents for Critical issues
    - Use template from design.md
    - Include reproduction steps
    - Include remediation code examples
    - _Requirements: 12.1, 12.2_
  - [ ] 14.2 Create finding documents for High issues
    - Use template from design.md
    - _Requirements: 12.1, 12.2_
  - [ ] 14.3 Create finding documents for Medium/Low issues
    - Use template from design.md
    - _Requirements: 12.1, 12.2_

- [ ] 15. Create GitHub Issues for Findings
  - [ ] 15.1 Create issues for Critical findings
    - Use issue template from design.md
    - Label: security, severity:critical
    - _Requirements: 12.4_
  - [ ] 15.2 Create issues for High findings
    - Use issue template from design.md
    - Label: security, severity:high
    - _Requirements: 12.4_
  - [ ] 15.3 Create issues for Medium/Low findings
    - Use issue template from design.md
    - Appropriate severity labels
    - _Requirements: 12.4_

- [ ] 16. Create Executive Summary Report
  - [ ] 16.1 Compile findings summary table
    - Count by severity
    - Status tracking
    - _Requirements: 12.1_
  - [ ] 16.2 Document key findings
    - Top 5-10 most critical issues
    - _Requirements: 12.1_
  - [ ] 16.3 Document deployment readiness
    - Block/proceed recommendation
    - _Requirements: 12.3_
  - [ ] 16.4 Document risk acceptances (if any)
    - _Requirements: 12.5_

- [ ] 17. Checkpoint - Audit Deliverables Complete
  - All finding documents created
  - All GitHub issues created
  - Executive summary published
  - evidence/ directory populated

---

### Phase 5: Remediation (Post-Audit)

- [ ] 18. Critical Issue Remediation
  - [ ] 18.1 Fix all Critical severity findings
    - Must be resolved before production
    - _Requirements: 12.3_
  - [ ] 18.2 Re-test fixed Critical issues
    - Verify vulnerability resolved
    - Update finding status
    - _Requirements: 12.6_

- [ ] 19. High Issue Remediation
  - [ ] 19.1 Fix all High severity findings
    - Must be resolved before production
    - _Requirements: 12.3_
  - [ ] 19.2 Re-test fixed High issues
    - Verify vulnerability resolved
    - Update finding status
    - _Requirements: 12.6_

- [ ] 20. Final Checkpoint
  - All Critical/High issues resolved or accepted
  - Re-testing confirms fixes
  - Executive summary updated with final status
  - Deployment readiness determination made

## Notes

- **Blocking Issues**: Critical and High severity findings block production deployment per Requirement 12.3
- **Evidence Collection**: All automated scan outputs and test evidence should be saved to the evidence/ directory
- **Finding IDs**: Use format SEC-2026-XXX for all findings
- **Parallel Work**: Phase 1 tasks (1.1-1.4) can run in parallel; Phase 2 tasks can run in parallel after Phase 1 checkpoint
- **AI Agent Security**: The gradient-agents/ directory should be reviewed for prompt injection vulnerabilities as part of Input Validation (Task 5)
