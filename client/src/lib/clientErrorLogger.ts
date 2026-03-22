export type ClientErrorType =
  | 'websocket' | 'network' | 'api' | 'client'
  | 'form_upload' | 'uncategorized';

export type ClientErrorSeverity = 'critical' | 'error' | 'warning' | 'info';

export interface ClientErrorData {
  errorType: ClientErrorType;
  severity: ClientErrorSeverity;
  message: string;
  error?: Error | any;
  context?: Record<string, any>;
  wasShownToUser?: boolean;
}

export async function logClientError(
  errorData: ClientErrorData,
  user?: { uid?: string; firstName?: string; lastName?: string; email?: string }
): Promise<void> {
  try {
    const userName = user?.firstName && user?.lastName
      ? `${user.firstName} ${user.lastName}` : undefined;
    const stackTrace = errorData.error?.stack || undefined;

    const context = {
      ...errorData.context,
      appVersion: '1.0.0',
      errorName: errorData.error?.name,
      errorMessage: errorData.error?.message,
      url: window.location.href,
      userAgent: navigator.userAgent.substring(0, 250),
      timestamp: new Date().toISOString(),
    };

    await fetch('/api/error/log-client-error', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        errorType: errorData.errorType,
        severity: errorData.severity,
        message: errorData.message,
        stackTrace,
        userUid: user?.uid,
        userName,
        userEmail: user?.email,
        endpoint: window.location.pathname,
        context,
        wasShownToUser: errorData.wasShownToUser ?? true,
      }),
    });
  } catch (err) {
    console.error('CLIENT ERROR LOGGER: Failed to log client error:', err);
  }
}
