import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { makeCounterProvider, InjectMetric } from '@willsoto/nestjs-prometheus';
import { Counter, Histogram } from 'prom-client';

@Injectable()
export class HttpMetricsInterceptor implements NestInterceptor {
  constructor(
    @InjectMetric('http_requests_total')
    private readonly httpRequestsTotal: Counter<string>,
    @InjectMetric('http_request_duration_seconds')
    private readonly httpRequestDuration: Histogram<string>,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url } = request;
    const start = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          const response = context.switchToHttp().getResponse();
          const duration = (Date.now() - start) / 1000;
          
          this.httpRequestsTotal.inc({
            method,
            route: url,
            status: response.statusCode,
          });
          
          this.httpRequestDuration.observe(
            {
              method,
              route: url,
              status: response.statusCode,
            },
            duration,
          );
        },
        error: (err) => {
          const duration = (Date.now() - start) / 1000;
          const status = err.status || 500;
          
          this.httpRequestsTotal.inc({ method, route: url, status });
          this.httpRequestDuration.observe({ method, route: url, status }, duration);
        },
      }),
    );
  }
}