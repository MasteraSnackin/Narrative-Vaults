# Security Policy

## 🔒 Reporting Security Vulnerabilities

The Narrative Vaults team takes security seriously. We appreciate your efforts to responsibly disclose your findings.

### How to Report

**Please DO NOT report security vulnerabilities through public GitHub issues.**

Instead, please report security vulnerabilities by:

1. **Email**: Send details to security@narrative-vaults.com
2. **GitHub Security Advisory**: Use the [GitHub Security Advisory](https://github.com/MasteraSnackin/Narrative-Vaults/security/advisories/new) feature

### What to Include

Please provide as much information as possible:

- Type of vulnerability
- Full paths of source file(s) related to the vulnerability
- Location of the affected source code (tag/branch/commit/direct URL)
- Step-by-step instructions to reproduce the issue
- Proof-of-concept or exploit code (if possible)
- Impact of the vulnerability
- Potential mitigations

### Response Timeline

- **Initial Response**: Within 48 hours
- **Status Update**: Within 7 days
- **Fix Timeline**: Varies based on severity, typically within 30-90 days

## 🛡️ Vulnerability Disclosure Policy

### Our Commitment

- We will respond to your report within 48 hours
- We will keep you informed of the progress towards a fix
- We will credit you in our security advisories (unless you prefer to remain anonymous)
- We will not take legal action against researchers who:
  - Act in good faith
  - Follow responsible disclosure practices
  - Don't access or modify user data
  - Don't perform destructive testing

### Coordinated Disclosure

We request that you:
- Give us reasonable time to fix the vulnerability before public disclosure
- Make a good faith effort to avoid privacy violations and data destruction
- Don't exploit the vulnerability beyond what's necessary to demonstrate it

## 🎯 Security Scope

### In Scope

- **Smart Contracts**
  - Vault contracts on supported chains
  - Permission and policy enforcement
  - Fund management and withdrawal logic
  - Integration with Salt Protocol
  - Integration with Pear Protocol

- **Backend Services**
  - API authentication and authorization
  - Database access controls
  - WebSocket connections
  - Server-side validation

- **Frontend Application**
  - XSS vulnerabilities
  - CSRF issues
  - Authentication bypass
  - Injection vulnerabilities

### Out of Scope

- Third-party services (Hyperliquid, Salt Protocol, Pear Protocol)
- Social engineering attacks
- DoS/DDoS attacks
- Issues in dependencies (report to respective projects)
- Issues in browsers or operating systems

## 🚨 Known Issues

### Current Security Considerations

1. **Alpha Stage Software**: This project is in alpha. Use with caution and limited funds.
2. **Smart Contract Risks**: All smart contracts carry inherent risks. Audit in progress.
3. **DEX Integration**: Relies on Hyperliquid and Pear Protocol security.

## 🔐 Security Best Practices

### For Users

- **Wallet Security**
  - Use hardware wallets for significant funds
  - Never share private keys or seed phrases
  - Verify contract addresses before transactions
  - Start with small test amounts

- **Transaction Safety**
  - Always review transaction details
  - Check gas prices and limits
  - Verify vault addresses
  - Monitor your positions regularly

- **Account Security**
  - Use strong, unique passwords
  - Enable 2FA if available
  - Keep software updated
  - Be cautious of phishing attempts

### For Developers

- **Code Security**
  - Follow secure coding practices
  - Never commit secrets or API keys
  - Use environment variables
  - Validate all inputs
  - Implement proper error handling

- **Smart Contract Development**
  - Follow Solidity best practices
  - Use latest stable compiler
  - Implement access controls
  - Add comprehensive tests
  - Consider reentrancy protection
  - Use SafeMath or Solidity 0.8+

## 🛠️ Security Measures

### Implemented Protections

- ✅ Input validation and sanitization
- ✅ Rate limiting on API endpoints
- ✅ HTTPS/TLS encryption
- ✅ Secure WebSocket connections
- ✅ Environment-based configuration
- ✅ SQL injection prevention (parameterized queries)
- ✅ XSS protection (input sanitization)
- ✅ CSRF tokens
- ✅ JWT authentication with short expiry

### Smart Contract Security

- ✅ Access control modifiers
- ✅ Reentrancy guards
- ✅ Overflow/underflow protection
- ✅ Emergency pause functionality
- ✅ Timelock on critical operations
- 🔄 Third-party audit (planned)
- 🔄 Bug bounty program (planned)

## 🎯 Bug Bounty Program

### Coming Soon

We are planning to launch a bug bounty program with rewards based on severity:

- **Critical**: $5,000 - $25,000
- **High**: $2,000 - $5,000
- **Medium**: $500 - $2,000
- **Low**: $100 - $500

*Reward amounts will be finalized upon official program launch.*

### Severity Classification

**Critical**
- Loss of funds
- Unauthorized access to vaults
- Critical smart contract vulnerabilities
- Remote code execution

**High**
- Privilege escalation
- Authentication bypass
- Significant data exposure
- Contract function manipulation

**Medium**
- Information disclosure
- Limited DoS scenarios
- CSRF vulnerabilities
- Business logic flaws

**Low**
- Minor information leaks
- UI inconsistencies with security impact
- Best practice violations

## 📝 Security Updates

Security updates will be published:
- In GitHub Security Advisories
- In release notes with [SECURITY] tag
- On our website (when available)
- Via email to users (for critical issues)

## 📅 Audit History

### Planned Audits

- [ ] Smart Contract Audit (Q2 2026)
- [ ] Backend Security Audit (Q2 2026)
- [ ] Frontend Security Assessment (Q2 2026)

*Audit reports will be published here upon completion.*

## ℹ️ Additional Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Smart Contract Security Best Practices](https://consensys.github.io/smart-contract-best-practices/)
- [Ethereum Security](https://ethereum.org/en/security/)
- [Salt Protocol Security](https://saltprotocol.xyz/security)
- [Pear Protocol Documentation](https://docs.pear.garden/)

## 📞 Contact

For security-related inquiries:
- **Email**: security@narrative-vaults.com
- **GitHub Security**: [Report a vulnerability](https://github.com/MasteraSnackin/Narrative-Vaults/security/advisories/new)

---

*This security policy is subject to updates. Last updated: January 2026*

**Thank you for helping keep Narrative Vaults and our users safe!** 🚀🔒
