/**
 * Standard success response
 */
export interface SuccessResponse<T = any> {
  success: true;
  data: T;
  message?: string;
  timestamp: string;
}

/**
 * Standard error response
 */
export interface ErrorResponse {
  success: false;
  error: string;
  message: string;
  statusCode: number;
  details?: Record<string, any>;
  timestamp: string;
}

/**
 * Paginated response
 */
export interface PaginatedResponse<T = any> {
  success: true;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  timestamp: string;
}

export class ResponseUtil {
  /**
   * Format success response
   */
  static success<T>(data: T, message?: string): SuccessResponse<T> {
    return {
      success: true,
      data,
      message,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Format paginated response
   */
  static paginated<T>(
    items: T[],
    page: number,
    limit: number,
    total: number
  ): PaginatedResponse<T> {
    return {
      success: true,
      data: items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Format error response
   */
  static error(
    error: string,
    message: string,
    statusCode: number = 500,
    details?: Record<string, any>
  ): ErrorResponse {
    return {
      success: false,
      error,
      message,
      statusCode,
      details,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Format Lambda response for API Gateway
   */
  static lambdaResponse(statusCode: number, body: any) {
    return {
      statusCode,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': process.env.CORS_ORIGIN || '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
      body: JSON.stringify(body),
    };
  }
}
