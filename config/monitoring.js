const fs = require('fs');
const path = require('path');

// Security monitoring configuration for Finoo API
const monitoringConfig = {
  // Security event thresholds
  thresholds: {
    failedLoginAttempts: {
      count: 5,
      windowMinutes: 15,
      action: 'ALERT'
    },
    rateLimitExceeded: {
      count: 10,
      windowMinutes: 5,
      action: 'BLOCK_IP'
    },
    suspiciousActivity: {
      count: 3,
      windowMinutes: 10,
      action: 'ALERT_ADMIN'
    },
    databaseErrors: {
      count: 5,
      windowMinutes: 5,
      action: 'ALERT'
    }
  },

  // Alert configuration
  alerts: {
    email: {
      enabled: process.env.NODE_ENV === 'production',
      recipients: [
        process.env.ALERT_EMAIL || 'security@finoo.ir',
        'admin@finoo.ir'
      ],
      smtp: {
        host: process.env.MAIL_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.MAIL_PORT) || 587,
        secure: false,
        auth: {
          user: process.env.MAIL_USER,
          pass: process.env.MAIL_PASS
        }
      }
    },
    webhook: {
      enabled: !!process.env.ALERT_WEBHOOK_URL,
      url: process.env.ALERT_WEBHOOK_URL,
      timeout: 5000,
      retries: 3
    },
    slack: {
      enabled: !!process.env.SLACK_WEBHOOK_URL,
      webhookUrl: process.env.SLACK_WEBHOOK_URL,
      channel: '#security-alerts'
    }
  },

  // Logging configuration
  logging: {
    securityEvents: {
      enabled: process.env.ENABLE_SECURITY_LOGGING === 'true',
      file: process.env.SECURITY_LOG_FILE || 'logs/security.log',
      level: 'warn',
      maxSize: '10m',
      maxFiles: 5
    },
    performance: {
      enabled: true,
      slowRequestThreshold: 2000, // 2 seconds
      file: 'logs/performance.log'
    },
    audit: {
      enabled: process.env.NODE_ENV === 'production',
      file: 'logs/audit.log',
      events: [
        'USER_LOGIN',
        'USER_LOGOUT',
        'PASSWORD_CHANGE',
        'ADMIN_ACTION',
        'DATA_EXPORT',
        'SECURITY_SETTING_CHANGE'
      ]
    }
  },

  // Metrics configuration
  metrics: {
    enabled: process.env.ENABLE_METRICS === 'true',
    port: parseInt(process.env.METRICS_PORT) || 9090,
    path: '/metrics',
    collectDefaultMetrics: true,
    customMetrics: {
      httpRequestDuration: {
        name: 'http_request_duration_seconds',
        help: 'Duration of HTTP requests in seconds',
        labelNames: ['method', 'route', 'status_code']
      },
      authenticationAttempts: {
        name: 'authentication_attempts_total',
        help: 'Total number of authentication attempts',
        labelNames: ['type', 'status']
      },
      rateLimitHits: {
        name: 'rate_limit_hits_total',
        help: 'Total number of rate limit hits',
        labelNames: ['endpoint', 'ip']
      },
      securityEvents: {
        name: 'security_events_total',
        help: 'Total number of security events',
        labelNames: ['event_type', 'severity']
      }
    }
  },

  // Health check configuration
  healthCheck: {
    enabled: true,
    interval: parseInt(process.env.HEALTH_CHECK_INTERVAL) || 30000,
    timeout: 5000,
    checks: {
      database: {
        enabled: true,
        query: 'SELECT 1',
        timeout: 3000
      },
      redis: {
        enabled: !!process.env.REDIS_URL,
        timeout: 2000
      },
      externalAPIs: {
        enabled: true,
        apis: [
          {
            name: 'TGJU',
            url: 'https://call1.tgju.org/ajax.json',
            timeout: 5000
          }
        ]
      }
    }
  },

  // IP blocking configuration
  ipBlocking: {
    enabled: true,
    blockDuration: 24 * 60 * 60 * 1000, // 24 hours
    whitelist: [
      '127.0.0.1',
      '::1',
      // Add your admin IPs here
    ],
    storage: {
      type: 'memory', // or 'redis' for distributed systems
      redis: {
        url: process.env.REDIS_URL,
        keyPrefix: 'blocked_ip:'
      }
    }
  }
};

// Security event types
const SecurityEventTypes = {
  FAILED_LOGIN: 'FAILED_LOGIN',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  SUSPICIOUS_ACTIVITY: 'SUSPICIOUS_ACTIVITY',
  UNAUTHORIZED_ACCESS: 'UNAUTHORIZED_ACCESS',
  SQL_INJECTION_ATTEMPT: 'SQL_INJECTION_ATTEMPT',
  XSS_ATTEMPT: 'XSS_ATTEMPT',
  BRUTE_FORCE_ATTACK: 'BRUTE_FORCE_ATTACK',
  DATA_BREACH_ATTEMPT: 'DATA_BREACH_ATTEMPT',
  SYSTEM_ERROR: 'SYSTEM_ERROR',
  CONFIGURATION_CHANGE: 'CONFIGURATION_CHANGE'
};

// Alert severity levels
const AlertSeverity = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
  CRITICAL: 'CRITICAL'
};

// Security monitoring functions
class SecurityMonitor {
  constructor() {
    this.eventCounts = new Map();
    this.blockedIPs = new Set();
    this.setupLogDirectory();
  }

  setupLogDirectory() {
    const logDir = path.dirname(monitoringConfig.logging.securityEvents.file);
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
  }

  logSecurityEvent(eventType, details = {}) {
    const event = {
      timestamp: new Date().toISOString(),
      type: eventType,
      severity: this.getSeverity(eventType),
      details,
      ip: details.ip || 'unknown',
      userAgent: details.userAgent || 'unknown',
      userId: details.userId || null
    };

    // Log to file
    if (monitoringConfig.logging.securityEvents.enabled) {
      this.writeToSecurityLog(event);
    }

    // Check thresholds and trigger alerts
    this.checkThresholds(eventType, event);

    return event;
  }

  getSeverity(eventType) {
    const severityMap = {
      [SecurityEventTypes.FAILED_LOGIN]: AlertSeverity.LOW,
      [SecurityEventTypes.RATE_LIMIT_EXCEEDED]: AlertSeverity.MEDIUM,
      [SecurityEventTypes.SUSPICIOUS_ACTIVITY]: AlertSeverity.HIGH,
      [SecurityEventTypes.UNAUTHORIZED_ACCESS]: AlertSeverity.HIGH,
      [SecurityEventTypes.SQL_INJECTION_ATTEMPT]: AlertSeverity.CRITICAL,
      [SecurityEventTypes.XSS_ATTEMPT]: AlertSeverity.CRITICAL,
      [SecurityEventTypes.BRUTE_FORCE_ATTACK]: AlertSeverity.CRITICAL,
      [SecurityEventTypes.DATA_BREACH_ATTEMPT]: AlertSeverity.CRITICAL,
      [SecurityEventTypes.SYSTEM_ERROR]: AlertSeverity.MEDIUM,
      [SecurityEventTypes.CONFIGURATION_CHANGE]: AlertSeverity.MEDIUM
    };

    return severityMap[eventType] || AlertSeverity.LOW;
  }

  writeToSecurityLog(event) {
    const logEntry = JSON.stringify(event) + '\n';
    const logFile = monitoringConfig.logging.securityEvents.file;
    
    fs.appendFile(logFile, logEntry, (err) => {
      if (err) {
        console.error('Failed to write security log:', err);
      }
    });
  }

  checkThresholds(eventType, event) {
    const key = `${eventType}_${event.ip}`;
    const now = Date.now();
    
    if (!this.eventCounts.has(key)) {
      this.eventCounts.set(key, []);
    }

    const events = this.eventCounts.get(key);
    events.push(now);

    // Clean old events
    const threshold = monitoringConfig.thresholds[eventType];
    if (threshold) {
      const windowMs = threshold.windowMinutes * 60 * 1000;
      const cutoff = now - windowMs;
      
      const recentEvents = events.filter(timestamp => timestamp > cutoff);
      this.eventCounts.set(key, recentEvents);

      // Check if threshold exceeded
      if (recentEvents.length >= threshold.count) {
        this.handleThresholdExceeded(eventType, event, threshold);
      }
    }
  }

  handleThresholdExceeded(eventType, event, threshold) {
    const alertData = {
      eventType,
      threshold,
      event,
      timestamp: new Date().toISOString()
    };

    switch (threshold.action) {
      case 'ALERT':
        this.sendAlert(alertData);
        break;
      case 'BLOCK_IP':
        this.blockIP(event.ip);
        this.sendAlert({ ...alertData, action: 'IP_BLOCKED' });
        break;
      case 'ALERT_ADMIN':
        this.sendAdminAlert(alertData);
        break;
    }
  }

  blockIP(ip) {
    if (monitoringConfig.ipBlocking.whitelist.includes(ip)) {
      return false; // Don't block whitelisted IPs
    }

    this.blockedIPs.add(ip);
    
    // Set timeout to unblock IP
    setTimeout(() => {
      this.blockedIPs.delete(ip);
    }, monitoringConfig.ipBlocking.blockDuration);

    return true;
  }

  isIPBlocked(ip) {
    return this.blockedIPs.has(ip);
  }

  sendAlert(alertData) {
    // Email alert
    if (monitoringConfig.alerts.email.enabled) {
      this.sendEmailAlert(alertData);
    }

    // Webhook alert
    if (monitoringConfig.alerts.webhook.enabled) {
      this.sendWebhookAlert(alertData);
    }

    // Slack alert
    if (monitoringConfig.alerts.slack.enabled) {
      this.sendSlackAlert(alertData);
    }
  }

  sendEmailAlert(alertData) {
    // Implementation would use nodemailer
    console.log('Email alert sent:', alertData);
  }

  sendWebhookAlert(alertData) {
    // Implementation would use fetch/axios
    console.log('Webhook alert sent:', alertData);
  }

  sendSlackAlert(alertData) {
    // Implementation would use Slack webhook
    console.log('Slack alert sent:', alertData);
  }

  sendAdminAlert(alertData) {
    // Send high-priority alert to administrators
    this.sendAlert({ ...alertData, priority: 'HIGH' });
  }
}

// Create singleton instance
const securityMonitor = new SecurityMonitor();

// Validation function
const validateMonitoringConfig = () => {
  const errors = [];

  // Validate email configuration
  if (monitoringConfig.alerts.email.enabled) {
    if (!process.env.MAIL_USER || !process.env.MAIL_PASS) {
      errors.push('Email alerts enabled but MAIL_USER or MAIL_PASS not configured');
    }
  }

  // Validate webhook configuration
  if (monitoringConfig.alerts.webhook.enabled) {
    if (!process.env.ALERT_WEBHOOK_URL) {
      errors.push('Webhook alerts enabled but ALERT_WEBHOOK_URL not configured');
    }
  }

  // Validate log directory
  const logDir = path.dirname(monitoringConfig.logging.securityEvents.file);
  try {
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
  } catch (error) {
    errors.push(`Cannot create log directory: ${error.message}`);
  }

  return errors;
};

module.exports = {
  monitoringConfig,
  SecurityEventTypes,
  AlertSeverity,
  securityMonitor,
  validateMonitoringConfig
};