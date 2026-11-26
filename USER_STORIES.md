# User stories

These stories describe behavior implemented in InsightBoard CRM and reviewed against the source on 26 November 2026. Acceptance criteria are reviewable requirements, not a claim that every path has been retested in a live deployment.

Resource actions require the account's effective grants. A role name alone does not grant every action in these stories. Business writes also require a writable deployment (`DEMO_MODE=false`). The application serves one company; `managedBy` scopes account management and archive approval, not ownership of CRM records.

[Back to the project README](README.md#user-stories)

<a id="us-01"></a>

## US-01 : Sign in

As an enabled account holder, I want to sign in with my assigned credentials so that I can access the workspace securely.

Acceptance criteria:

- Given an active account with an enabled role and valid credentials, signing in opens an allowed workspace page.
- Invalid credentials or an unavailable account do not create an authenticated session.
- Public registration remains closed; new accounts are provisioned through an authorized workflow.

Implementation: [app/api/auth/login/route.ts](app/api/auth/login/route.ts) · [app/api/auth/register/route.ts](app/api/auth/register/route.ts) · [lib/auth.ts](lib/auth.ts)

<a id="us-02"></a>

## US-02 : Access the right workspace

As a staff member, I want to see the sections and actions assigned to me so that I can work within my responsibilities.

Acceptance criteria:

- Navigation and action controls reflect the effective grants on the current user record.
- Opening a restricted dashboard URL is denied by the server; directly calling its API is independently denied.
- Role ceilings and permission dependencies apply even when a client submits a broader permission set.

Implementation: [lib/permissions.ts](lib/permissions.ts) · [lib/authorization.ts](lib/authorization.ts) · [components/access/PermissionProvider.tsx](components/access/PermissionProvider.tsx)

<a id="us-03"></a>

## US-03 : Review the business overview

As a manager with dashboard access, I want to review clients, deals, projects and financial summaries together so that I can identify work and revenue that need attention.

Acceptance criteria:

- The overview requires dashboard.read and its dependent read grants.
- Summary values are read from the dashboard and finance services rather than fixed presentation values.
- Archived revenue and expenses are excluded from active finance aggregates.

Implementation: [app/dashboard/page.tsx](app/dashboard/page.tsx) · [app/api/dashboard/overview/route.ts](app/api/dashboard/overview/route.ts) · [lib/dashboardFinance.ts](lib/dashboardFinance.ts)

<a id="us-04"></a>

## US-04 : Maintain client records

As an authorized CRM employee, I want to create, find and update client details so that I can keep contact and business information in one place.

Acceptance criteria:

- The user needs the separate clients.read, clients.create or clients.update capability for the requested action.
- A client record holds company, contact and business details and can be used by related deals and projects.
- Archive actions follow the direct permission or approval workflow; editing access alone does not allow deletion.

Implementation: [app/dashboard/clients/clients.client.tsx](app/dashboard/clients/clients.client.tsx) · [app/api/clients/route.ts](app/api/clients/route.ts) · [app/api/clients/[id]/route.ts](app/api/clients/[id]/route.ts)

<a id="us-05"></a>

## US-05 : Manage the deal pipeline

As an authorized sales employee, I want to track deal stages, expected value and close dates so that I can follow opportunities through to an outcome.

Acceptance criteria:

- Deal creation and updates require their own resource grants.
- Deals retain their client relationship, status, estimated budget and optional final price.
- Closed Won and Closed Lost outcomes are available to the reporting workflow.

Implementation: [models/Deal.ts](models/Deal.ts) · [app/api/deals/route.ts](app/api/deals/route.ts) · [app/dashboard/deals/deals.client.tsx](app/dashboard/deals/deals.client.tsx)

<a id="us-06"></a>

## US-06 : Convert a won deal

As a user with deal conversion access, I want to turn a won deal into a linked project so that I can start delivery without entering the same business context again.

Acceptance criteria:

- Only an active Closed Won deal with an active client and a valid positive price can be converted.
- The new project retains the client and deal links; finalPrice is used unless absent or zero, when estimatedBudget is used.
- A second linked project is rejected, including when the first project is archived.
- Conversion fails closed when the required unique_project_deal_link partial index is unavailable.

Implementation: [app/api/deals/[id]/convert-to-project/route.ts](app/api/deals/[id]/convert-to-project/route.ts) · [lib/projectDealLink.ts](lib/projectDealLink.ts) · [models/Project.ts](models/Project.ts)

<a id="us-07"></a>

## US-07 : Track project delivery

As an authorized project employee, I want to maintain project scope, status and deadline so that I can keep delivery progress visible.

Acceptance criteria:

- Project read, create and update capabilities are checked separately.
- A project can be created directly or linked to a won deal, subject to relationship validation.
- Delivery updates do not grant permission to read or change restricted financial fields.

Implementation: [app/dashboard/projects/projects.client.tsx](app/dashboard/projects/projects.client.tsx) · [app/api/projects/route.ts](app/api/projects/route.ts) · [app/api/projects/[id]/route.ts](app/api/projects/[id]/route.ts)

<a id="us-08"></a>

## US-08 : Separate delivery and financial access

As an administrator assigning project access, I want to grant project work separately from project financial controls so that I can share delivery information without granting financial editing.

Acceptance criteria:

- Project financial fields are included in responses only when the user has finance.read or projects.financial.read.
- Writing project financial fields requires projects.financial.manage in addition to the operation permissions.
- Relationship lookups provide the permitted labels needed by forms without returning unrestricted source documents.

Implementation: [lib/crmData.ts](lib/crmData.ts) · [lib/permissions.ts](lib/permissions.ts) · [app/api/lookups/[resource]/route.ts](app/api/lookups/[resource]/route.ts)

<a id="us-09"></a>

## US-09 : Record client payments

As an authorized finance employee, I want to record and maintain revenue against a client and project so that I can track money received and outstanding project balances.

Acceptance criteria:

- Revenue reads and mutations require their corresponding revenue capabilities.
- Amounts, dates and related records are validated before a payment is saved.
- Finance views distinguish remaining balance from overpayment; payment completion is capped at 100 percent.
- Archived payments are excluded from active finance summaries.

Implementation: [app/api/revenue/route.ts](app/api/revenue/route.ts) · [app/api/revenue/[id]/route.ts](app/api/revenue/[id]/route.ts) · [lib/paymentProgress.ts](lib/paymentProgress.ts) · [lib/dashboardFinance.ts](lib/dashboardFinance.ts)

<a id="us-10"></a>

## US-10 : Record project expenses

As an authorized finance employee, I want to record project costs by category and date so that I can understand the cost of delivering each project.

Acceptance criteria:

- Expense reads and mutations require their corresponding expenses capabilities.
- An expense references its project and records its amount, category and date.
- Active expense values feed finance totals; archived expenses do not contribute to active summaries.

Implementation: [models/Expense.ts](models/Expense.ts) · [app/api/expenses/route.ts](app/api/expenses/route.ts) · [app/api/expenses/[id]/route.ts](app/api/expenses/[id]/route.ts) · [lib/dashboardFinance.ts](lib/dashboardFinance.ts)

<a id="us-11"></a>

## US-11 : Filter business reports

As a user with report access, I want to filter reports by day, month and client so that I can review the business activity relevant to a question.

Acceptance criteria:

- reports.read requires the underlying client, deal, project, revenue, expense and finance read grants.
- The report interface supports day, month and client filters and displays the resulting report data.
- Reports include monthly, project, client and project-type financial views.

Implementation: [app/dashboard/reports/reports.client.tsx](app/dashboard/reports/reports.client.tsx) · [lib/permissions.ts](lib/permissions.ts) · [lib/dashboardFinance.ts](lib/dashboardFinance.ts)

<a id="us-12"></a>

## US-12 : Share report outputs

As a user with report output permissions, I want to export Excel or print a report to PDF so that I can share results outside the workspace.

Acceptance criteria:

- Application print and export actions make a server authorization request for reports.print or reports.export.
- Excel output contains Summary, Monthly, Projects, Clients and Project Types worksheets.
- Print / PDF uses the browser print dialog; filtered printing requires at least one active filter.
- Report generation uses the configured company name and time zone. These controls do not prevent screenshots or browser copying of readable data.

Implementation: [app/dashboard/reports/reports.client.tsx](app/dashboard/reports/reports.client.tsx) · [app/api/reports/authorize/route.ts](app/api/reports/authorize/route.ts) · [lib/companySettingsService.ts](lib/companySettingsService.ts)

<a id="us-13"></a>

## US-13 : Request an archive

As a staff member without direct delete access, I want to request that an active record be archived with a reason so that I can remove outdated information through review.

Acceptance criteria:

- The requester needs archiveRequests.create and read access to the target resource.
- A request stores the record version, reason, requester and assigned manager, plus an initial event.
- A duplicate pending request by the same requester for the same record is rejected.
- The requester can cancel their pending request; review decisions cannot be made on their own request.

Implementation: [lib/archiveApproval.ts](lib/archiveApproval.ts) · [lib/archiveApprovalPolicy.ts](lib/archiveApprovalPolicy.ts) · [app/dashboard/archive-requests/archive-requests.client.tsx](app/dashboard/archive-requests/archive-requests.client.tsx)

<a id="us-14"></a>

## US-14 : Review archive requests

As an assigned manager or administrator, I want to approve or reject eligible archive requests so that I can keep removal decisions accountable.

Acceptance criteria:

- The reviewer needs archiveRequests.review and delete permission for the target resource and cannot review their own request.
- A manager may review only requests assigned to them from their own managed staff; an admin may review within their grants.
- Approval rechecks account permissions, record version, expiry and dependent records before archiving.
- Expired requests cannot archive a record; repeated decisions and stale record versions are rejected. The decision and event are recorded transactionally.

Implementation: [lib/archiveApprovalPolicy.ts](lib/archiveApprovalPolicy.ts) · [lib/archiveApproval.ts](lib/archiveApproval.ts) · [app/api/archive-requests/[id]/decision/route.ts](app/api/archive-requests/[id]/decision/route.ts)

<a id="us-15"></a>

## US-15 : Restore archived records

As an administrator with archive access, I want to restore eligible CRM or financial records so that I can recover information removed from active views.

Acceptance criteria:

- CRM and financial archives have separate read and restore capabilities.
- Restoring a record checks its required live parent relationships.
- An unavailable parent blocks restoration and a successful restore appends the corresponding archive event.

Implementation: [lib/crmArchive.ts](lib/crmArchive.ts) · [lib/financialArchive.ts](lib/financialArchive.ts) · [app/api/financial-archive/[resource]/[id]/restore/route.ts](app/api/financial-archive/[resource]/[id]/restore/route.ts)

<a id="us-16"></a>

## US-16 : Permanently remove an archived CRM record

As an administrator with purge access, I want to remove an archived record after explicit confirmation so that I can complete a deliberate cleanup without leaving dependent records unlinked.

Acceptance criteria:

- The operation requires crmArchive.purge and applies to archived clients, deals or projects.
- The typed confirmation must exactly match the expected record label or identifier.
- Any dependent record, including an archived dependent, blocks permanent deletion.
- The deletion and CrmDeletionEvent are saved in one transaction. This flow does not expose financial-record purge.

Implementation: [lib/crmPermanentDelete.ts](lib/crmPermanentDelete.ts) · [app/api/crm-archive/[resource]/[id]/route.ts](app/api/crm-archive/[resource]/[id]/route.ts) · [models/CrmDeletionEvent.ts](models/CrmDeletionEvent.ts)

<a id="us-17"></a>

## US-17 : Manage team accounts

As an authorized manager or administrator, I want to create and update permitted staff accounts with explicit grants so that I can give colleagues the access needed for their work.

Acceptance criteria:

- A manager can manage only their assigned senior, employee and viewer accounts and cannot create another manager.
- An admin can manage the ordinary permitted roles, including manager; peer admin and reserved roles cannot be assigned here.
- Delegated grants must fit both the target role ceiling and the actor's effective grants, including dependencies.
- Account changes use version checks; a stale account form is rejected rather than silently overwriting a newer update.

Implementation: [lib/permissions.ts](lib/permissions.ts) · [lib/userManagement.ts](lib/userManagement.ts) · [app/api/users/route.ts](app/api/users/route.ts) · [app/api/users/[id]/route.ts](app/api/users/[id]/route.ts)

<a id="us-18"></a>

## US-18 : Revoke access when an account changes

As an authorized account manager, I want to disable access or reset a managed account password so that I can apply an account change to existing sessions immediately.

Acceptance criteria:

- Managed-account updates increment authVersion and revoke the target's server sessions in the account transaction.
- Passwords supplied for creation or reset are hashed with bcrypt and are not returned in user API responses.
- An audit event records actor, target, action and changed field names, without password values.
- An inactive account cannot authenticate; an enabled account must sign in again after its sessions are revoked.

Implementation: [lib/userManagement.ts](lib/userManagement.ts) · [lib/auth.ts](lib/auth.ts) · [models/UserAuditEvent.ts](models/UserAuditEvent.ts)

<a id="us-19"></a>

## US-19 : Configure the company

As an administrator, I want to save the company name and time zone so that I can keep company details consistent in reports.

Acceptance criteria:

- Reading company settings requires settings.read.
- Saving requires an admin account, a trusted request and a writable deployment.
- The name and IANA time zone are validated and stored in the CompanySettings singleton.

Implementation: [app/api/company-settings/route.ts](app/api/company-settings/route.ts) · [lib/companySettings.ts](lib/companySettings.ts) · [lib/companySettingsService.ts](lib/companySettingsService.ts) · [models/CompanySettings.ts](models/CompanySettings.ts)

<a id="us-20"></a>

## US-20 : Choose an appearance

As a user with settings access, I want to choose Light, Dark or System appearance so that I can use the workspace in my preferred display mode.

Acceptance criteria:

- The selected appearance is persisted as a preference cookie and applied through the theme change flow.
- Resetting preferences removes the saved choice and returns to the default appearance.
- Appearance preferences do not contain authentication session identifiers.

Implementation: [app/dashboard/settings/settings.client.tsx](app/dashboard/settings/settings.client.tsx) · [lib/preferences.ts](lib/preferences.ts)

<a id="us-21"></a>

## US-21 : Continue or end a session

As a signed-in user, I want to receive an expiry warning, continue an eligible session or sign out so that I can control access to an unattended workspace.

Acceptance criteria:

- The final 30 seconds of the idle lifetime display a session warning; explicit continuation is required in that window.
- Idle limits are 10 minutes in development and 20 minutes in production; the absolute maximum is eight hours.
- Expiry is checked on the server independently of MongoDB TTL cleanup.
- Signing out revokes the server session and the client synchronizes session changes across tabs.

Implementation: [lib/sessionPolicy.ts](lib/sessionPolicy.ts) · [lib/auth.ts](lib/auth.ts) · [app/api/auth/renew/route.ts](app/api/auth/renew/route.ts) · [app/api/auth/logout/route.ts](app/api/auth/logout/route.ts) · [components/auth/AuthGuard.tsx](components/auth/AuthGuard.tsx)

<a id="us-22"></a>

## US-22 : Explore the public site and demo

As a visitor, I want to read the public site in English or Arabic and explore a view-only demo so that I can understand the product before using a business workspace.

Acceptance criteria:

- Public pages support English and Arabic language preferences and expose privacy, terms and cookie settings.
- The server DEMO_MODE flag blocks protected business mutations; it is separate from the disabled reserved demo role.
- Optional public-homepage analytics are enabled only after consent; withdrawing the choice disables that collection.
- The public demo is not a registration or account-provisioning workflow.

Implementation: [components/landing/Landing.tsx](components/landing/Landing.tsx) · [components/landing/CookieConsent.tsx](components/landing/CookieConsent.tsx) · [components/landing/analyticsConsent.ts](components/landing/analyticsConsent.ts) · [lib/demoMode.ts](lib/demoMode.ts) · [lib/permissions.ts](lib/permissions.ts)

## Validation

Run `npm run test:security` for the repository test suite. Relevant test groups include permissions, user management, sessions, archive approval, CRM archive/deletion, project–deal constraints, dashboard totals, report/UI regressions and analytics consent. Review successful account, transaction and reporting workflows against a separate development database as well; source-level and mocked tests do not replace live acceptance checks.
