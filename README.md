# InsightBoard CRM

A CRM for a web design business, bringing clients, deals, project delivery, payments and expenses into one workspace. Reports show business performance in Bahraini dinars (BHD).

[Live demo](https://insightboard-one.vercel.app) · [Sign in](https://insightboard-one.vercel.app/login) · [Portfolio](https://fadelprofile.vercel.app)

The public demo is view-only, with sign-in details pre-filled.

![InsightBoard dashboard](public/images/Screenshot/Dashboard_img_1.png)

## What it does

- Manage client records, follow deal stages and convert won deals into projects.
- Track delivery, payments, expenses, outstanding balances and overpayments.
- Review filtered reports, export Excel and print / save PDF.
- Control account access and manage archive requests, approvals and restoration.

**Stack:** Next.js · React · TypeScript · MUI · MongoDB · Docker · Vercel

## More screenshots

| Clients | Deals |
| --- | --- |
| ![Client records](public/images/Screenshot/Clients_img.png) | ![Deal pipeline](public/images/Screenshot/Deals_img.png) |
| Company and contact details in one place. | Follow opportunities from lead to outcome. |

| Projects | Revenue |
| --- | --- |
| ![Project delivery](public/images/Screenshot/Projects_img.png) | ![Payment records](public/images/Screenshot/Revenue_img.png) |
| Delivery status, deadlines and linked deals. | Client payments and project balances. |

| Expenses | Reports |
| --- | --- |
| ![Project expenses](public/images/Screenshot/Expenses_img.png) | ![Business reports](public/images/Screenshot/Reports_img_1.png) |
| Categorized costs for each project. | Finance summaries, filters and report outputs. |

| Settings | Dark appearance |
| --- | --- |
| ![Company and appearance settings](public/images/Screenshot/Settings_img.png) | ![Dark dashboard](public/images/Screenshot/Dashboard_img_1_dark.png) |
| Company details and display preferences. | An alternative view of the workspace. |

## User stories

[Read all 22 user stories and their 76 acceptance criteria](USER_STORIES.md).

| Workflow | User goal |
| --- | --- |
| [Access and accounts](USER_STORIES.md#us-01) | Sign in and use the sections assigned to the account. |
| [Clients and deals](USER_STORIES.md#us-04) | Maintain customer records and follow sales opportunities. |
| [Project delivery](USER_STORIES.md#us-06) | Convert a won deal and manage the resulting project. |
| [Finance](USER_STORIES.md#us-09) | Record payments and costs to understand project balances. |
| [Reports](USER_STORIES.md#us-11) | Filter business results and share authorized outputs. |
| [Archives](USER_STORIES.md#us-13) | Request, review and restore eligible archived records. |
| [Team management](USER_STORIES.md#us-17) | Assign permitted roles and manage staff access. |
| [Preferences and sessions](USER_STORIES.md#us-19) | Configure company details, appearance and session access. |

## System design

The browser runs the React/MUI interface. Next.js App Router pages and route handlers perform session checks, authorization, validation and business operations. Mongoose connects those operations to MongoDB. The application and API live in the same Next.js codebase.

![InsightBoard application architecture](design/InsightBoard-Architecture.svg)

### Data model

The complete model contains **16 collections, 156 stored fields and 31 expanded logical relationships**. References are MongoDB/application relationships, not SQL foreign keys. The connected ERD includes authentication, company settings, archives and audit records alongside the five core business entities.

| Area | Models |
| --- | --- |
| Business | `Client`, `Deal`, `Project`, `Revenue`, `Expense` |
| Accounts | `User`, `Session`, `LoginAttempt`, `UserAuditEvent` |
| Archives and history | `ArchiveRequest`, `ArchiveRequestEvent`, `CrmArchiveEvent`, `CrmDeletionEvent`, `FinancialArchiveEvent` |
| Configuration and coordination | `CompanySettings`, `CrmWriteLock` |

`recordId` history links select one target type through `resource`; historical targets may no longer exist. `CompanySettings`, `LoginAttempt` and `CrmWriteLock` have no stored entity-reference links. The optional Project–Deal 1:1 constraint depends on a pre-provisioned unique partial index.

### Wireframes and diagrams

#### Dashboard wireframe

![Dashboard wireframe](design/InsightBoard-Dashboard-Wireframe.png)

#### Complete system wireframe

![Complete system wireframe](design/InsightBoard-Complete-System.png)

#### Architecture

![Architecture](design/InsightBoard-Architecture.png)

#### ERD by area

![ERD by area](design/InsightBoard-ERD.png)

#### Complete connected ERD

![Complete connected ERD](design/InsightBoard-Complete-Connected-ERD.png)

#### 07 — Connected Chen ERD

![07 — Connected Chen ERD](design/07-InsightBoard-Chen-Connected.png)

#### 08 — Connected table ERD

![08 — Connected table ERD](design/08-InsightBoard-Tables-Connected.png)

### CI/CD

[GitHub Actions workflow](.github/workflows/ci.yml) · [Pipeline runs](https://github.com/Fadelm300/insightboard/actions/workflows/ci.yml)

The pipeline runs lint, tests, a production build and a Docker smoke check. Workflow-driven Vercel Preview deployment is optional and manually requested after checks pass.

![Example pull request checks and Preview deployment](public/images/Screenshot/pipeline.jpg)

## Current development and roadmap

- **Next:** refine the public website design and refresh selected images.
- **Near term:** add a visitor assistant to introduce the site and explain its features; this is the likely first new feature after the design update.
- **Near term:** add email notifications for selected system events.
- **Later:** add a personal assistant inside the authenticated workspace.

Self-service password changes and recovery are currently disabled while accounts are provisioned by the project owner. The optional password-management implementation is kept on a separate branch for possible integration later.

---

Built by **Fadel Mohammad Fadel Moussa** · [GitHub](https://github.com/Fadelm300) · [Portfolio](https://fadelprofile.vercel.app/)
