# Contributing to Narrative Vaults

Thank you for your interest in contributing to Narrative Vaults! This document provides guidelines for contributing to the project.

## Table of Contents
- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Pull Request Process](#pull-request-process)
- [Coding Standards](#coding-standards)
- [Testing](#testing)
- [Documentation](#documentation)

## Code of Conduct

We are committed to providing a welcoming and inclusive environment. Please:
- Be respectful and considerate
- Use welcoming and inclusive language
- Be collaborative
- Accept constructive criticism gracefully
- Focus on what's best for the community

## Getting Started

### Prerequisites
- Node.js (v18 or higher)
- npm or yarn
- Git
- Basic knowledge of Next.js, TypeScript, and Solidity

### Setting Up Development Environment

1. **Fork the repository**
   ```bash
   # Fork via GitHub UI, then clone your fork
   git clone https://github.com/YOUR_USERNAME/Narrative-Vaults.git
   cd Narrative-Vaults
   ```

2. **Install dependencies**
   ```bash
   # Backend
   cd backend
   npm install
   
   # Frontend
   cd ../frontend
   npm install
   ```

3. **Set up environment variables**
   ```bash
   # Copy example env files
   cp backend/.env.example backend/.env
   cp frontend/.env.example frontend/.env
   # Edit .env files with your credentials
   ```

4. **Run development servers**
   ```bash
   # Backend (Terminal 1)
   cd backend
   npm run dev
   
   # Frontend (Terminal 2)
   cd frontend
   npm run dev
   ```

## Development Workflow

### Branch Naming Convention
- `feature/description` - New features
- `fix/description` - Bug fixes
- `docs/description` - Documentation updates
- `refactor/description` - Code refactoring
- `test/description` - Testing updates

Example: `feature/add-vault-analytics`

### Commit Messages
Follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
type(scope): subject

[optional body]

[optional footer]
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting)
- `refactor`: Code refactoring
- `test`: Adding/updating tests
- `chore`: Maintenance tasks

**Example:**
```
feat(vault): add leveling system for vault strategies

Implemented XP-based leveling system that unlocks advanced trading strategies
as users gain experience. Includes UI components for level display.

Closes #42
```

## Pull Request Process

### Before Submitting
1. ✅ Update your branch with latest main
   ```bash
   git fetch upstream
   git rebase upstream/main
   ```

2. ✅ Run tests and linting
   ```bash
   npm run test
   npm run lint
   npm run type-check
   ```

3. ✅ Update documentation if needed

4. ✅ Test your changes locally

### Creating a Pull Request
1. Push your branch to your fork
2. Open a PR against the `main` branch
3. Fill out the PR template completely
4. Link related issues using "Closes #issue-number"
5. Request review from maintainers

### PR Requirements
- [ ] Descriptive title following conventional commits
- [ ] Clear description of changes
- [ ] Tests added/updated
- [ ] Documentation updated
- [ ] No merge conflicts
- [ ] All CI checks passing
- [ ] At least one approval from maintainers

## Coding Standards

### TypeScript/JavaScript
- Use TypeScript for all new code
- Follow ESLint configuration
- Use meaningful variable names
- Add JSDoc comments for complex functions
- Prefer functional programming patterns
- Use async/await over promises

### React/Next.js
- Use functional components with hooks
- Keep components small and focused
- Use custom hooks for reusable logic
- Follow Next.js App Router conventions
- Implement proper error boundaries

### Styling
- Use TailwindCSS for styling
- Follow mobile-first approach
- Maintain consistent spacing
- Use CSS variables for theming

### Smart Contracts
- Follow Solidity style guide
- Add comprehensive comments
- Implement thorough testing
- Consider gas optimization
- Add NatSpec documentation

## Testing

### Frontend Tests
```bash
cd frontend
npm run test          # Run all tests
npm run test:watch    # Watch mode
npm run test:coverage # Coverage report
```

### Backend Tests
```bash
cd backend
npm run test          # Run all tests
npm run test:e2e      # End-to-end tests
```

### Test Requirements
- Unit tests for utility functions
- Integration tests for API endpoints
- Component tests for React components
- E2E tests for critical user flows
- Maintain >80% code coverage

## Documentation

### Code Documentation
- Add comments for complex logic
- Use JSDoc/TSDoc for functions
- Update ARCHITECTURE.md for structural changes
- Keep API documentation current

### README Updates
- Update README.md for feature changes
- Add new dependencies to documentation
- Update screenshots if UI changes

### Architecture Documentation
For significant changes, update:
- Component diagrams
- Flow diagrams
- Sequence diagrams
- Data models

## Reporting Issues

### Bug Reports
Include:
- Clear description of the issue
- Steps to reproduce
- Expected vs actual behavior
- Environment details (OS, browser, versions)
- Screenshots/videos if applicable
- Error messages and stack traces

### Feature Requests
Include:
- Clear description of the feature
- Use cases and benefits
- Potential implementation approach
- Any related issues or PRs

## Questions?

- Open a [GitHub Discussion](https://github.com/MasteraSnackin/Narrative-Vaults/discussions)
- Join our community channels (TBD)
- Review existing issues and PRs

## Recognition

Contributors will be:
- Listed in our contributors section
- Credited in release notes
- Eligible for contributor NFTs (coming soon)

---

Thank you for contributing to Narrative Vaults! 🚀
