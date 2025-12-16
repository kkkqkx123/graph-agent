import { injectable, inject } from 'inversify';
import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { RetryHandler } from './retry-handler';
import { CircuitBreaker } from './circuit-breaker';
import { RateLimiter } from './rate-limiter';

interface ExtendedAxiosRequestConfig extends InternalAxiosRequestConfig {
  metadata?: {
    startTime: number;
  };
}

@injectable()
export class HttpClient {
  private axiosInstance: AxiosInstance;
  private retryHandler: RetryHandler;
  private circuitBreaker: CircuitBreaker;
  private rateLimiter: RateLimiter;

  constructor(
    @inject('ConfigManager') private configManager: any,
    @inject('RetryHandler') retryHandler: RetryHandler,
    @inject('CircuitBreaker') circuitBreaker: CircuitBreaker,
    @inject('RateLimiter') rateLimiter: RateLimiter
  ) {
    this.retryHandler = retryHandler;
    this.circuitBreaker = circuitBreaker;
    this.rateLimiter = rateLimiter;

    this.axiosInstance = axios.create(this.getDefaultConfig());
    this.setupInterceptors();
  }

  async get<T = any>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.request({ ...config, method: 'GET', url });
  }

  async post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.request({ ...config, method: 'POST', url, data });
  }

  async put<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.request({ ...config, method: 'PUT', url, data });
  }

  async patch<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.request({ ...config, method: 'PATCH', url, data });
  }

  async delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.request({ ...config, method: 'DELETE', url });
  }

  async request<T = any>(config: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    // Check rate limit
    await this.rateLimiter.checkLimit();

    // Check circuit breaker
    if (this.circuitBreaker.isOpen()) {
      throw new Error('Circuit breaker is open. Request blocked.');
    }

    try {
      // Execute request with retry
      const response = await this.retryHandler.executeWithRetry(async () => {
        const startTime = Date.now();
        const result = await this.axiosInstance.request<T>(config);
        const duration = Date.now() - startTime;

        // Add duration to response metadata
        (result as any).duration = duration;

        return result;
      });

      // Record success in circuit breaker
      this.circuitBreaker.recordSuccess();

      return response;
    } catch (error) {
      // Record failure in circuit breaker
      this.circuitBreaker.recordFailure();
      throw error;
    }
  }

  private getDefaultConfig(): AxiosRequestConfig {
    return {
      timeout: this.configManager.get('http.timeout', 30000),
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': this.configManager.get('http.userAgent', 'WorkflowAgent/1.0.0')
      },
      validateStatus: (status) => status < 500 // Don't reject on 4xx errors
    };
  }

  private setupInterceptors(): void {
    // Request interceptor
    this.axiosInstance.interceptors.request.use(
      (config: ExtendedAxiosRequestConfig) => {
        // Add request timestamp
        config.metadata = { startTime: Date.now() };

        // Log request if enabled
        if (this.configManager.get('http.logging.enabled', false)) {
          console.log(`HTTP Request: ${config.method?.toUpperCase()} ${config.url}`, {
            headers: config.headers,
            data: config.data
          });
        }

        return config;
      },
      (error) => {
        console.error('HTTP Request Error:', error);
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.axiosInstance.interceptors.response.use(
      (response) => {
        // Calculate request duration
        const duration = Date.now() - ((response.config as ExtendedAxiosRequestConfig).metadata?.startTime || 0);
        (response as any).duration = duration;

        // Log response if enabled
        if (this.configManager.get('http.logging.enabled', false)) {
          console.log(`HTTP Response: ${response.status} ${response.config.url}`, {
            duration: `${duration}ms`,
            headers: response.headers,
            data: response.data
          });
        }

        return response;
      },
      (error) => {
        // Calculate request duration for failed requests
        const duration = Date.now() - ((error.config as ExtendedAxiosRequestConfig)?.metadata?.startTime || 0);

        // Log error if enabled
        if (this.configManager.get('http.logging.enabled', false)) {
          console.error(`HTTP Error: ${error.response?.status || 'Network Error'} ${error.config?.url}`, {
            duration: `${duration}ms`,
            message: error.message,
            response: error.response?.data
          });
        }

        return Promise.reject(error);
      }
    );
  }

  setDefaultHeader(key: string, value: string): void {
    this.axiosInstance.defaults.headers.common[key] = value;
  }

  removeDefaultHeader(key: string): void {
    delete this.axiosInstance.defaults.headers.common[key];
  }

  setBaseURL(baseURL: string): void {
    this.axiosInstance.defaults.baseURL = baseURL;
  }

  setTimeout(timeout: number): void {
    this.axiosInstance.defaults.timeout = timeout;
  }

  createInstance(config?: AxiosRequestConfig): AxiosInstance {
    return axios.create({
      ...this.getDefaultConfig(),
      ...config
    });
  }

  getStats(): {
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    averageResponseTime: number;
    circuitBreakerState: string;
  } {
    return {
      totalRequests: this.retryHandler.getStats().totalAttempts,
      successfulRequests: this.retryHandler.getStats().successfulAttempts,
      failedRequests: this.retryHandler.getStats().failedAttempts,
      averageResponseTime: this.retryHandler.getStats().averageResponseTime,
      circuitBreakerState: this.circuitBreaker.getState()
    };
  }

  resetStats(): void {
    this.retryHandler.resetStats();
    this.circuitBreaker.reset();
  }
}