# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| Main    | :white_check_mark: |
| v1.0.0  | :white_check_mark: |

## Reporting a Vulnerability

**Please do not report security vulnerabilities through public GitHub issues.**

If you have discovered a security vulnerability in SecurePixel (e.g., data leakage, broken encryption, or XSS), please report it privately:

1.  Email **dippan.connectl@gmail.com** with the subject "SECURITY: SecurePixel Vulnerability".
2.  Include details about the vulnerability and steps to reproduce it.

## Privacy & Data Handling

SecurePixel is designed to be **Client-Side First**.

* **Encryption:** All cryptographic operations happen in the browser. No unencrypted data is ever sent to our servers.
* **Analytics:** We use Google Analytics to monitor traffic. This is strictly for performance metrics (page views, load times). 
    * **Vulnerability Note:** Any PR that attempts to send user data (images, passwords, keys) to an analytics endpoint will be rejected and flagged as malicious.
