# Contributing to Bisik

Thank you for your interest in contributing to Bisik! This document provides guidelines and information for contributors.

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/YOUR_USERNAME/Bisik.git`
3. Create a feature branch: `git checkout -b feature/your-feature-name`
4. Make your changes
5. Test thoroughly
6. Commit with clear messages
7. Push to your fork
8. Submit a pull request

## Development Setup

See [README.md](./README.md) for installation and setup instructions.

## Code Style

- Follow the existing code style
- Use TypeScript for all new code
- Use meaningful variable and function names
- Add comments for complex logic
- Keep functions small and focused

### Formatting

We use Prettier for code formatting. Run before committing:

```bash
npm run lint
```

### Type Checking

Ensure your code passes TypeScript checks:

```bash
npm run typecheck
```

## Testing

- Write tests for new features
- Update tests when modifying existing features
- Ensure all tests pass before submitting PR

```bash
npm test
```

## Commit Messages

Use clear, descriptive commit messages:

- `feat: Add voice note filtering by category`
- `fix: Resolve geofence trigger timing issue`
- `docs: Update README with installation steps`
- `refactor: Simplify AudioPlayer state management`
- `test: Add tests for ScheduleService`

## Pull Request Process

1. **Update documentation**: If you've added features, update README.md
2. **Test thoroughly**: Ensure the app works on both iOS and Android
3. **Keep PRs focused**: One feature or fix per PR
4. **Describe your changes**: Provide a clear description of what and why
5. **Reference issues**: Link related issues in the PR description

## Code Review

- Be open to feedback
- Respond to comments promptly
- Make requested changes or explain your reasoning
- Keep discussions professional and constructive

## Areas for Contribution

### High Priority
- Backend integration for AI voice note generation
- Improved error handling and user feedback
- Performance optimizations
- Accessibility improvements
- Test coverage expansion

### Features
- Cloud sync for voice notes
- Custom geofence creation UI
- Calendar integration
- Voice note categories and filtering
- Social sharing features

### Documentation
- API documentation
- Architecture diagrams
- User guides
- Video tutorials

### Bug Fixes
- Check the Issues page for open bugs
- Reproduce the bug
- Fix and add tests to prevent regression

## Questions?

- Open an issue for bugs or feature requests
- Join discussions in existing issues
- Reach out to maintainers for clarification

## License

By contributing, you agree that your contributions will be licensed under the same license as the project.

Thank you for contributing to Bisik!
