# Contributing to Vishleshan

Thank you for your interest in contributing to **Vishleshan — Multi-Agent Recruitment Intelligence Platform**! We welcome contributions from developers, recruiters, and AI researchers to help build and scale this platform.

---

## Code of Conduct

By participating in this project, you agree to abide by our Code of Conduct:
- Be respectful, constructive, and inclusive.
- Keep discussions professional and focused on the technical scope of the project.
- Report any inappropriate behavior to the project maintainers.

---

## How Can I Contribute?

### 1. Reporting Bugs
- Search existing [GitHub Issues](https://github.com/DakshBhavsar007/Multi-Agent-Resume-Project/issues) before opening a new one.
- Use the **Bug Report** template if available.
- Include details about your environment (OS, Python/Node versions), reproduction steps, and error logs.

### 2. Reporting Security Vulnerabilities
- **Do NOT open a public GitHub Issue** for security vulnerabilities.
- Follow the responsible disclosure process documented in [SECURITY.md](SECURITY.md).

### 3. Suggesting Enhancements
- Explain the behavior you would like to see and why it would be beneficial.
- Provide mockups or design outlines if the suggestion involves UI changes.

### 4. Submitting Code Changes
- Fork the repository and create a branch from `main`.
- Follow the branching naming conventions:
  - `feature/your-feature-name` for new features
  - `bugfix/issue-description` for bug fixes
  - `docs/update-info` for documentation changes
  - `security/fix-description` for security patches
- Commit your changes with clear, descriptive commit messages.
- Open a Pull Request with a detailed description of what changed and why.

---

## Development Setup

Please refer to the [README.md](README.md) for detailed instructions on setting up the local development environment.

### Pre-requisites
- **Python 3.10+** (Backend)
- **Node.js 18+** (Frontend)
- **Redis** & **PostgreSQL** running locally or remotely
- **ChromaDB** for vector search (optional for non-ML work)

### Quick Start (Windows)
```cmd
run.bat
```
This boots the entire local workspace: Vite Frontend, Django Backend, Redis, and Celery worker.

---

## Backend Guidelines

- Always write clean, self-documenting code following PEP 8.
- Avoid introducing circular imports in Django modules.
- Place new API views in `backend/api/views/` and register them in `backend/api/urls.py`.
- New AI agents go in `backend/agents/` — follow the existing pattern (class-based with `RotateLLMClient`).
- Use `@csrf_exempt` only on API endpoints, never on admin or internal views.
- Always use `.strip().lower()` when comparing email addresses.
- Rate-limited endpoints must return consistent `429` response structure:
  ```json
  {
    "success": false,
    "error": "Too many requests. Please try again later.",
    "data": {
      "action": "endpoint_name",
      "retry_after_seconds": 45,
      "identifier": "da***@example.com"
    }
  }
  ```
- Redis operations in critical paths must have `try/except` fallback to DB queries — never fail-open.
- Write tests for new features in `backend/tests/`. Run with:
  ```bash
  python manage.py test tests
  ```

### Environment Variables
- **Never hardcode secrets** — always read from `os.getenv()` with safe defaults.
- If a `.env` value contains `#`, wrap it in double quotes (e.g., `PASSWORD="Pass#word"`).
- Update `.env.example` when adding new environment variables.

---

## Frontend Guidelines

- Use React hooks and functional components.
- Style with Tailwind CSS utility classes — follow the existing color palette.
- Manage global state using `zustand` stores in `frontend/src/stores/`.
- Use TanStack React Query for all API data fetching.
- New pages go in `frontend/src/pages/` under the appropriate subdirectory:
  - `pages/admin/` — Admin panel pages
  - `pages/developer/` — Developer portal pages
  - `pages/seeker/` — Job seeker specific pages
  - `pages/user/` — General user pages (resume builder, jobs, etc.)
  - `pages/test/` — Assessment round pages (MCQ, Coding, Interview)
  - `pages/public/` — Public pages (About, Terms, Contact, Refund)
- Shared components go in `frontend/src/components/`.
- Verify the build before pushing:
  ```bash
  npm run build
  npm run lint
  ```

---

## Code Style

- **Python**: Follow PEP 8 guidelines. Keep imports organized (standard library → third-party → local).
- **JavaScript/React**: Code should pass ESLint checks without errors. Run `npm run lint` in the `frontend/` directory.
- **Commit Messages**: Use conventional commit format:
  - `feat:` for new features
  - `fix:` for bug fixes
  - `docs:` for documentation changes
  - `security:` for security patches
  - `refactor:` for code restructuring
  - `test:` for test additions/modifications

---

## Pull Request Checklist

Before submitting a PR, verify the following:

- [ ] Code follows the project's style guidelines
- [ ] Self-review of the code has been performed
- [ ] Comments have been added where the code is not self-explanatory
- [ ] New features have corresponding tests
- [ ] All existing tests pass (`python manage.py test tests`)
- [ ] Frontend builds without errors (`npm run build`)
- [ ] ESLint passes without errors (`npm run lint`)
- [ ] `.env.example` updated if new environment variables were added
- [ ] No secrets, API keys, or credentials are committed
- [ ] PR description clearly explains what changed and why

---

## Project Architecture Reference

| Directory | Purpose |
|-----------|---------|
| `backend/agents/` | 12+ AI agents (parsing, matching, fraud, interview, etc.) |
| `backend/api/views/` | REST API endpoints grouped by domain |
| `backend/api/services/` | Email (Brevo), SMS (2Factor), notifications |
| `backend/api/decorators.py` | JWT auth, API key auth, rate limiting, ban checks |
| `backend/workers/` | Celery async task workers |
| `backend/tests/` | Unit and integration tests |
| `frontend/src/pages/` | Page components organized by portal |
| `frontend/src/components/` | 47+ shared UI components |
| `frontend/src/stores/` | Zustand state management |

---

## Getting Help

- Open a [GitHub Discussion](https://github.com/DakshBhavsar007/Multi-Agent-Resume-Project/discussions) for questions.
- Review the [README.md](README.md) for setup and architecture overview.
- Check [SECURITY.md](SECURITY.md) for security-related concerns.

---

*Thank you for contributing to Vishleshan!*
