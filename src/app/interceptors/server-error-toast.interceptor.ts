import { Injectable, NgZone } from '@angular/core';
import {
  HttpErrorResponse,
  HttpEvent,
  HttpHandler,
  HttpInterceptor,
  HttpRequest
} from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { ToastrService } from 'ngx-toastr';

@Injectable()
export class ServerErrorToastInterceptor implements HttpInterceptor {
  constructor(
    private readonly toastr: ToastrService,
    private readonly ngZone: NgZone
  ) {}

  intercept(req: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    return next.handle(req).pipe(
      catchError((error) => {
        if (
          error instanceof HttpErrorResponse &&
          req.method &&
          ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method.toUpperCase())
        ) {
          const serverMessage = this.extractMessage(error);
          this.ngZone.run(() => {
            this.toastr.error(serverMessage, 'Error');
          });
        }
        return throwError(() => error);
      })
    );
  }

  private extractMessage(error: HttpErrorResponse): string {
    if (error.error?.message) {
      return error.error.message;
    }
    if (error.message) {
      return error.message;
    }
    return 'Something went wrong';
  }
}
